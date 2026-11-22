const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateProductionEnv } = require('../config/validateProductionEnv');
const { rateLimit } = require('../middleware/rateLimit');
const AuditLog = require('../models/AuditLog');
const app = require('../app');
const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken');
const Employee = require('../models/Employee');
const { sanitizePayload } = require('../controllers/resourceController');
const { errorHandler, notFound } = require('../middleware/errorHandler');

test('production configuration fails closed for unsafe secret, Mongo, origins and proxy policy', () => {
  assert.throws(() => validateProductionEnv({ NODE_ENV: 'production' }), /JWT_SECRET/);
  assert.doesNotThrow(() => validateProductionEnv({
    NODE_ENV: 'production', JWT_SECRET: 'unique-random-secret-material-123456',
    JWT_EXPIRES_IN: '15m', MONGO_URI: 'mongodb+srv://user:pass@cluster.example/db',
    CLIENT_URL: 'https://staff.example.org', PUBLIC_APP_URL: 'https://staff.example.org', TRUST_PROXY_HOPS: '1',
    CERTIFICATE_STORAGE_DIR: path.resolve('secure-certificates'),
  }));
  assert.throws(() => validateProductionEnv({
    NODE_ENV: 'production', JWT_SECRET: 'unique-random-secret-material-123456',
    JWT_EXPIRES_IN: '7d', MONGO_URI: 'mongodb://db.example/db',
    CLIENT_URL: 'http://staff.example.org', PUBLIC_APP_URL: 'http://staff.example.org', TRUST_PROXY_HOPS: '1',
    CERTIFICATE_STORAGE_DIR: path.resolve('secure-certificates'),
  }), /TLS|HTTPS|24 hours/);
});

test('JWT uses fixed algorithm, issuer, audience and configured expiration', () => {
  process.env.JWT_SECRET = 'test-secret-with-sufficient-random-length-123456';
  process.env.JWT_EXPIRES_IN = '15m';
  const token = generateToken({ _id: 'abc123', role: 'manager' });
  const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'kimu-api', audience: 'kimu-client' });
  assert.equal(claims.id, 'abc123');
  assert.equal(claims.role, 'manager');
  assert.throws(() => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'wrong', audience: 'kimu-client' }));
});

test('rate limiter returns 429 with retry guidance after configured quota', async () => {
  const middleware = rateLimit({ name: 'test', windowMs: 60_000, max: 1, key: () => 'security-config-test' });
  const request = () => new Promise((resolve) => {
    const headers = {};
    const response = {
      set(name, value) { headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body, headers }); },
    };
    middleware({ ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' }, requestId: 'test-id' }, response, () => resolve({ status: 200, headers }));
  });
  assert.equal((await request()).status, 200);
  const limited = await request();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers['Retry-After']) > 0);
});

test('audit records reject Mongoose update and delete operations', async () => {
  await assert.rejects(AuditLog.updateOne({ action: 'x' }, { action: 'changed' }), /append-only/);
  await assert.rejects(AuditLog.deleteMany({}), /append-only/);
  const existingEntry = new AuditLog({ user: '507f1f77bcf86cd799439011', action: 'test', entity: 'test' });
  existingEntry.isNew = false;
  await assert.rejects(existingEntry.save(), /append-only/);
});

test('private metrics endpoint reports process and database readiness without exposing configuration', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/internal/metrics`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /kimu_api_up 1/);
  assert.match(body, /kimu_mongodb_ready [01]/);
  assert.match(body, /kimu_process_resident_memory_bytes \d+/);
  assert.equal(body.includes('JWT_SECRET'), false);
  assert.equal(body.includes('MONGO_URI'), false);
});

test('generic resource payload rejects operator and protected timestamp fields', () => {
  assert.deepEqual(sanitizePayload(Employee, { fullName: 'Sam', department: 'Operations' }), { data: { fullName: 'Sam', department: 'Operations' } });
  assert.match(sanitizePayload(Employee, { $set: { isActive: false } }).error, /unsupported/);
  assert.match(sanitizePayload(Employee, { createdAt: new Date(0) }).error, /unsupported/);
  assert.match(sanitizePayload(Employee, { profile: { $ne: null } }).error, /unsupported/);
});

test('internal errors and not-found responses do not disclose exception text or query values', () => {
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  errorHandler(Object.assign(new Error('mongodb://admin:secret@host/private-db'), { status: 500 }), { requestId: 'safe-id', method: 'GET' }, response);
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, 'An unexpected server error occurred.');
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
  const missingResponse = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  notFound({ requestId: 'safe-id', originalUrl: '/missing?token=secret' }, missingResponse);
  assert.equal(missingResponse.body.message, 'Route not found.');
  assert.equal(JSON.stringify(missingResponse.body).includes('secret'), false);
});
