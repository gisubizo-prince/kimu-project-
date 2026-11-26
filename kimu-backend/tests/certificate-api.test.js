const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const jwt = require('jsonwebtoken');
const jsQR = require('jsqr');
const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');

const requestedNodeEnv = process.env.NODE_ENV;
const requestedMongoUri = process.env.MONGO_URI;
const isolatedTestUri = process.env.KIMU_TEST_MONGO_URI;
let parsedTestUri;
try { parsedTestUri = new URL(isolatedTestUri); } catch { parsedTestUri = null; }
if (requestedNodeEnv === 'production' || requestedMongoUri !== undefined || process.env.KIMU_TEST_DB_DISPOSABLE !== 'YES' || !parsedTestUri || parsedTestUri.protocol !== 'mongodb:' || !['127.0.0.1', 'localhost'].includes(parsedTestUri.hostname) || !/^\/certverify_verify_\d+_\d+$/.test(parsedTestUri.pathname) || parsedTestUri.search) {
  throw new Error('Certificate tests require KIMU_TEST_DB_DISPOSABLE=YES and a loopback KIMU_TEST_MONGO_URI named certverify_verify_<pid>_<timestamp>; they refuse production mode and inherited MONGO_URI.');
}
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = `certverify-test-${crypto.randomBytes(24).toString('hex')}`;
process.env.MONGO_URI = isolatedTestUri;
process.env.CERTIFICATE_STORAGE_DIR = path.join(os.tmpdir(), `certverify-storage-${process.pid}-${Date.now()}`);
process.env.ALLOW_PUBLIC_PDF_WHEN_REVOKED = 'false';
process.env.ALLOW_PUBLIC_DOWNLOAD = 'true';

const mongoose = require('mongoose');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const AuditLog = require('../models/AuditLog');
const storage = require('../services/certificateStorage');
const app = require('../app');
const publicAppOrigin = require('../config/publicAppOrigin');

async function createPdf(label) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText(`Certificate test fixture: ${label}`, { x: 54, y: 720, size: 16 });
  return Buffer.from(await doc.save());
}

function decodePng(pngBytes) {
  const bytes = Buffer.from(pngBytes);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let offset = 8; let width; let height; let colorType; let bitDepth; const dataChunks = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset); offset += 4;
    const kind = bytes.toString('ascii', offset, offset + 4); offset += 4;
    const data = bytes.subarray(offset, offset + length); offset += length + 4;
    if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    if (kind === 'IDAT') dataChunks.push(data);
    if (kind === 'IEND') break;
  }
  assert.equal(bitDepth, 8, 'QR PNG uses 8-bit channels');
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 })[colorType];
  assert.ok(channels, `supported QR PNG color type ${colorType}`);
  const stride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(dataChunks));
  const pixels = Buffer.alloc(stride * height);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src++];
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[src++];
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y > 0 ? pixels[row + x - stride] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[row + x - stride - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upperLeft; const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upperLeft);
        predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upperLeft);
      } else assert.equal(filter, 0, 'PNG filter type is valid');
      pixels[row + x] = (raw + predictor) & 255;
    }
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let srcPixel = 0, dst = 0; srcPixel < pixels.length; srcPixel += channels, dst += 4) {
    if (colorType === 6) { rgba[dst] = pixels[srcPixel]; rgba[dst + 1] = pixels[srcPixel + 1]; rgba[dst + 2] = pixels[srcPixel + 2]; rgba[dst + 3] = pixels[srcPixel + 3]; }
    else if (colorType === 2) { rgba[dst] = pixels[srcPixel]; rgba[dst + 1] = pixels[srcPixel + 1]; rgba[dst + 2] = pixels[srcPixel + 2]; rgba[dst + 3] = 255; }
    else if (colorType === 4) { rgba[dst] = pixels[srcPixel]; rgba[dst + 1] = pixels[srcPixel]; rgba[dst + 2] = pixels[srcPixel]; rgba[dst + 3] = pixels[srcPixel + 1]; }
    else { rgba[dst] = pixels[srcPixel]; rgba[dst + 1] = pixels[srcPixel]; rgba[dst + 2] = pixels[srcPixel]; rgba[dst + 3] = 255; }
  }
  return { width, height, data: rgba };
}

async function scanQrInPdf(bytes) {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);
  const xObjects = page.node.Resources().lookup(PDFName.of('XObject'));
  assert.ok(xObjects, 'printable page references an image XObject');
  let scanned;
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream) || object.dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
    const width = object.dict.get(PDFName.of('Width'))?.asNumber();
    const height = object.dict.get(PDFName.of('Height'))?.asNumber();
    if (!width || width !== height || width < 100) continue;
    const rgbBytes = zlib.inflateSync(object.getContents());
    assert.equal(rgbBytes.length, width * height * 3);
    const rgba = Buffer.alloc(width * height * 4);
    for (let source = 0, target = 0; source < rgbBytes.length; source += 3, target += 4) {
      rgba[target] = rgbBytes[source]; rgba[target + 1] = rgbBytes[source + 1]; rgba[target + 2] = rgbBytes[source + 2]; rgba[target + 3] = 255;
    }
    scanned = jsQR(new Uint8ClampedArray(rgba), width, height)?.data;
    if (scanned) break;
  }
  return scanned;
}

test('certificate API persistence, authorization, validation, lifecycle and audit', async (t) => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
  const admin = await User.create({ fullName: 'Certificate Test Admin', email: `cv-admin-${process.pid}@test.invalid`, password: 'TestPassword123!', role: 'admin' });
  const manager = await User.create({ fullName: 'Certificate Test Manager', email: `cv-manager-${process.pid}@test.invalid`, password: 'TestPassword123!', role: 'manager' });
  const superAdmin = await User.create({ fullName: 'Certificate Test Super Admin', email: `cv-super-${process.pid}@test.invalid`, password: 'TestPassword123!', role: 'super_admin' });
  const tokenFor = (user) => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256', issuer: 'kimu-api', audience: 'kimu-client' });
  const adminToken = tokenFor(admin);
  const managerToken = tokenFor(manager);
  const superAdminToken = tokenFor(superAdmin);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const root = `http://127.0.0.1:${server.address().port}/api/certificates`;
  const json = (body, token = adminToken) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const patch = (body) => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify(body) });
  const get = (url, token = adminToken) => fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const encode = (buffer) => buffer.toString('base64');

  await t.test('production QR origin ignores a stale configured URL', () => {
    assert.equal(publicAppOrigin({ NODE_ENV: 'production', PUBLIC_APP_URL: 'https://kimutransport.vercel.app' }), 'https://www.kimudigital.com');
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await fs.rm(process.env.CERTIFICATE_STORAGE_DIR, { recursive: true, force: true });
  });

  const loginUrl = `http://127.0.0.1:${server.address().port}/api/auth/login`;
  let lastLoginResponse;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    lastLoginResponse = await fetch(loginUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'missing@test.invalid', password: 'wrong' }) });
  }
  assert.equal(lastLoginResponse.status, 429, 'repeated login attempts are throttled');

  const forbiddenRole = await fetch('http://127.0.0.1:' + server.address().port + '/api/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ fullName: 'Escalation Attempt', email: `cv-escalate-${process.pid}@test.invalid`, password: 'TestPassword123!', role: 'super_admin' }),
  });
  assert.equal(forbiddenRole.status, 403, 'admin cannot create a super administrator');
  const registerEscalation = await fetch('http://127.0.0.1:' + server.address().port + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ fullName: 'Registration Escalation', email: `cv-register-escalate-${process.pid}@test.invalid`, password: 'TestPassword123!', role: 'super_admin' }),
  });
  assert.equal(registerEscalation.status, 403, 'admin cannot register a super administrator');
  const protectedSuper = await fetch(`http://127.0.0.1:${server.address().port}/api/users/${superAdmin._id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'manager' }),
  });
  assert.equal(protectedSuper.status, 403, 'admin cannot modify a super administrator');
  const lastSuperDemotion = await fetch(`http://127.0.0.1:${server.address().port}/api/users/${superAdmin._id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ role: 'manager' }),
  });
  assert.equal(lastSuperDemotion.status, 409, 'last active super administrator cannot be demoted');

  await t.test('requires admin authorization for management; verifier route remains public', async () => {
    assert.equal((await get(root, null)).status, 401);
    assert.equal((await fetch(root, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await get(root, managerToken)).status, 403);
    const publicMissing = await get(`${root}/verify/UNKNOWN-CERT`, null);
    assert.equal(publicMissing.status, 404);
    assert.equal(publicMissing.headers.get('cache-control'), 'no-store');
  });

  await t.test('rejects missing metadata, invalid dates, wrong extension and malformed PDF', async () => {
    assert.equal((await fetch(root, json({}))).status, 400);
    const base = { studentName: 'Ada Example', course: 'Driver Training', institution: 'KIMU TRANSPORT', issueDate: '2025-02-30', pdf: 'source.pdf', pdfBase64: encode(await createPdf('invalid-date')) };
    assert.equal((await fetch(root, json(base))).status, 400);
    assert.equal((await fetch(root, json({ ...base, issueDate: '2025-02-28', pdf: 'source.txt' }))).status, 400);
    assert.equal((await fetch(root, json({ ...base, issueDate: '2025-02-28', pdfBase64: encode(Buffer.from('not a pdf')) }))).status, 400);
    assert.equal((await fetch(root, json({ ...base, issueDate: '2025-02-28', pdfBase64: encode(Buffer.from('%PDF-1.4\nnot a structured pdf\n%%EOF')) }))).status, 422);
    const signed = Buffer.from((await createPdf('signed')).toString('latin1').replace('%%EOF', '/ByteRange [0 1 2 3]\n%%EOF'), 'latin1');
    assert.equal((await fetch(root, json({ ...base, issueDate: '2025-02-28', pdfBase64: encode(signed) }))).status, 422);
    process.env.PDF_QR_PAGE = '99';
    assert.equal((await fetch(root, json({ ...base, studentName: 'Placement Test', issueDate: '2025-02-28' }))).status, 400);
    delete process.env.PDF_QR_PAGE;
    const tooLarge = Buffer.alloc(11 * 1024 * 1024, 0x20);
    Buffer.from('%PDF-1.4').copy(tooLarge, 0);
    Buffer.from('%%EOF').copy(tooLarge, tooLarge.length - 5);
    assert.equal((await fetch(root, json({ ...base, issueDate: '2025-02-28', pdfBase64: encode(tooLarge) }))).status, 413);
    assert.equal((await fetch(root, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'text/plain' }, body: 'not-json' })).status, 400);
  });

  let created;
  const original = await createPdf('original');
  await t.test('creates certificate, persists original bytes/checksum and returns an unpredictable public token', async () => {
    const response = await fetch(root, json({ studentName: 'Ada Example', course: 'Driver Training', institution: 'KIMU TRANSPORT', issueDate: '2025-02-28', pdf: 'source.pdf', pdfBase64: encode(original), notes: 'private note' }));
    assert.equal(response.status, 201);
    created = (await response.json()).data;
    assert.match(created.certificateId, /^CERT-\d{4}-[A-F0-9]{10}$/);
    assert.match(created.verificationUrl, /verify-certificate\/[A-Za-z0-9_-]{43}$/);
    assert.equal(created.pdfChecksum, crypto.createHash('sha256').update(original).digest('hex'));
    const stored = await Certificate.findOne({ certificateId: created.certificateId }).select('+pdfBase64');
    assert.ok(stored);
    assert.equal(stored.pdfBase64, undefined);
    assert.deepEqual(await storage.get(stored.originalStorageKey), original);
    const printable = await storage.get(stored.printableStorageKey);
    assert.equal((await PDFDocument.load(printable)).getPageCount(), 1);
    assert.equal(stored.verificationToken.length, 43);
    assert.equal(await scanQrInPdf(printable), created.verificationUrl);
    const qrResponse = await get(`${root}/${created.certificateId}/qr?format=png`);
    assert.equal(qrResponse.status, 200);
    const qr = decodePng(Buffer.from(await qrResponse.arrayBuffer()));
    assert.equal(jsQR(qr.data, qr.width, qr.height)?.data, created.verificationUrl);
    assert.throws(() => storage.resolveKey('../private.pdf'), /Unsafe certificate storage key/);
    assert.equal(await AuditLog.countDocuments({ recordId: created.certificateId, action: 'create' }), 1);
  });

  await t.test('supports fresh public verification by token and refuses ID lookup for tokenized records', async () => {
    const token = new URL(created.verificationUrl).pathname.split('/').pop();
    const response = await get(`${root}/verify/${token}`, null);
    assert.equal(response.status, 200);
    const result = (await response.json()).certificate;
    assert.equal(result.status, 'valid');
    assert.equal(result.certificateId, created.certificateId);
    assert.equal('notes' in result, false);
    assert.equal('revocationReason' in result, false);
    assert.equal(result.pdfAvailable, true);
    assert.equal((await get(`${root}/verify/${created.certificateId}`, null)).status, 404);
    const publicPdf = await get(`${root}/verify/${token}/pdf?download=1`, null);
    assert.equal(publicPdf.status, 200);
    assert.equal(publicPdf.headers.get('cache-control'), 'no-store');
    assert.match(publicPdf.headers.get('content-disposition'), /^attachment;/);
    assert.equal(await scanQrInPdf(Buffer.from(await publicPdf.arrayBuffer())), created.verificationUrl);
    process.env.ALLOW_PUBLIC_DOWNLOAD = 'false';
    assert.equal((await get(`${root}/verify/${token}/pdf?download=1`, null)).status, 403);
    assert.equal((await get(`${root}/verify/${token}/pdf`, null)).status, 200);
    process.env.ALLOW_PUBLIC_DOWNLOAD = 'true';
    const originalPdf = await get(`${root}/${created.certificateId}/original-pdf`);
    assert.deepEqual(Buffer.from(await originalPdf.arrayBuffer()), original);
    const svgQr = await get(`${root}/${created.certificateId}/qr?format=svg`);
    assert.match(await svgQr.text(), /^<svg[\s>]/);
    const legacyPdf = await createPdf('legacy');
    await Certificate.create({ certificateId: 'LEGACY-CERT-001', studentName: 'Legacy Holder', course: 'Legacy Course', institution: 'KIMU TRANSPORT', issueDate: new Date('2020-01-01'), pdfBase64: encode(legacyPdf), pdfChecksum: crypto.createHash('sha256').update(legacyPdf).digest('hex'), pdfOriginalFilename: 'legacy.pdf', createdBy: admin._id });
    const legacy = await get(`${root}/verify/LEGACY-CERT-001`, null);
    assert.equal(legacy.status, 200);
    assert.equal((await legacy.json()).certificate.certificateId, 'LEGACY-CERT-001');
    assert.equal((await fetch(`${root}/LEGACY-CERT-001/pdf/regenerate`, json({}))).status, 200);
    const migrated = await Certificate.findOne({ certificateId: 'LEGACY-CERT-001' }).select('+pdfBase64');
    assert.ok(migrated.originalStorageKey);
    assert.ok(migrated.printableStorageKey);
    assert.equal(migrated.pdfBase64, undefined);
    const legacyPublic = await get(`${root}/verify/LEGACY-CERT-001`, null);
    assert.equal((await legacyPublic.json()).certificate.pdfAvailable, true);
    assert.equal(await scanQrInPdf(await storage.get(migrated.printableStorageKey)), `${new URL(created.verificationUrl).origin}/verify-certificate/LEGACY-CERT-001`);
  });

  await t.test('lists, paginates, searches, filters, reports stats and returns details', async () => {
    const listResponse = await get(`${root}?q=Ada&page=1&limit=5`);
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()).data;
    assert.equal(listed.items.length, 1);
    assert.equal(listed.total, 1);
    const dateRange = await get(`${root}?issueFrom=2025-02-28&issueTo=2025-02-28`);
    assert.equal((await dateRange.json()).data.total, 1);
    const revoked = await get(`${root}?status=revoked`);
    assert.equal(revoked.status, 200);
    assert.equal((await revoked.json()).data.total, 0);
    const secondPage = (await (await get(`${root}?page=2&limit=1`)).json()).data;
    assert.equal(secondPage.page, 2);
    assert.equal(secondPage.totalPages, 2);
    assert.equal(secondPage.items.length, 1);
    const stats = (await (await get(`${root}/stats`)).json()).data;
    assert.deepEqual([stats.total, stats.valid, stats.revoked], [2, 2, 0]);
    assert.equal((await get(`${root}/${created.certificateId}`)).status, 200);
    assert.equal((await get(`${root}/${created.certificateId}/pdf`, null)).status, 401);
  });

  await t.test('requires explicit duplicate confirmation and accepts confirmation', async () => {
    const duplicate = { studentName: 'Ada Example', course: 'Driver Training', institution: 'KIMU TRANSPORT', issueDate: '2025-02-28', pdf: 'copy.pdf', pdfBase64: encode(await createPdf('duplicate')) };
    assert.ok(await Certificate.findOne({ studentName: /^Ada Example$/i, course: /^Driver Training$/i, issueDate: new Date('2025-02-28T00:00:00.000Z'), archivedAt: null }), 'duplicate fixture from the create test is present');
    const conflict = await fetch(root, json(duplicate));
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).code, 'POSSIBLE_DUPLICATE');
    const accepted = await fetch(root, json({ ...duplicate, confirmDuplicate: true }));
    assert.equal(accepted.status, 201);
    const supplied = { studentName: 'Tina Sample', course: 'Road Safety', institution: 'KIMU TRANSPORT', issueDate: '2025-03-10', certificateNumber: 'KIMU-CV-001', pdf: 'manual.pdf', pdfBase64: encode(await createPdf('manual-id')) };
    assert.equal((await fetch(root, json({ ...supplied, certificateNumber: 'bad id' }))).status, 400);
    const custom = await fetch(root, json(supplied));
    assert.equal(custom.status, 201);
    assert.equal((await custom.json()).data.certificateId, 'KIMU-CV-001');
    assert.equal((await fetch(root, json({ ...supplied, studentName: 'Different Person' }))).status, 409);
    assert.equal((await get(`${root}/${created.certificateId}/pdf`, managerToken)).status, 403);
  });

  await t.test('edits metadata while preserving certificate ID and logs the update', async () => {
    const response = await fetch(`${root}/${created.certificateId}`, patch({ course: 'Advanced Driver Training', certificateId: 'FORGED-ID', notes: 'edited' }));
    assert.equal(response.status, 200);
    const updated = (await response.json()).data;
    assert.equal(updated.certificateId, created.certificateId);
    assert.equal(updated.course, 'Advanced Driver Training');
    assert.equal(updated.notes, 'edited');
    assert.equal(await AuditLog.countDocuments({ recordId: created.certificateId, action: 'update' }), 1);
    assert.equal((await fetch(`${root}/${created.certificateId}`, patch({ studentName: '' }))).status, 400);
  });

  await t.test('revokes/restores, validates reasons and records lifecycle events', async () => {
    const endpoint = `${root}/${created.certificateId}/status`;
    assert.equal((await fetch(endpoint, patch({ status: 'revoked', reason: 'x' }))).status, 400);
    assert.equal((await fetch(endpoint, patch({ status: 'deleted' }))).status, 400);
    assert.equal((await fetch(endpoint, patch({ status: 'revoked', reason: 'Fraud review' }))).status, 200);
    const publicResult = await get(`${root}/verify/${new URL(created.verificationUrl).pathname.split('/').pop()}`, null);
    assert.equal((await publicResult.json()).certificate.status, 'revoked');
    assert.equal((await get(`${root}/verify/${new URL(created.verificationUrl).pathname.split('/').pop()}/pdf`, null)).status, 404);
    process.env.ALLOW_PUBLIC_PDF_WHEN_REVOKED = 'true';
    assert.equal((await get(`${root}/verify/${new URL(created.verificationUrl).pathname.split('/').pop()}/pdf`, null)).status, 200);
    process.env.ALLOW_PUBLIC_PDF_WHEN_REVOKED = 'false';
    assert.equal((await fetch(endpoint, patch({ status: 'valid' }))).status, 200);
    assert.deepEqual(new Set(await AuditLog.find({ recordId: created.certificateId, action: { $in: ['revoke', 'restore'] } }).distinct('action')), new Set(['restore', 'revoke']));
  });

  await t.test('replaces PDF only after confirmation and keeps original access staff-only', async () => {
    const endpoint = `${root}/${created.certificateId}/pdf`;
    const beforeReplace = await Certificate.findOne({ certificateId: created.certificateId });
    assert.equal((await fetch(endpoint, json({ pdf: 'new.pdf', pdfBase64: encode(await createPdf('new')) }))).status, 400);
    assert.equal((await fetch(endpoint, json({ confirm: true, pdf: 'bad.pdf', pdfBase64: encode(Buffer.from('bad')) }))).status, 400);
    const replacement = await createPdf('replacement');
    const replaceResponse = await fetch(endpoint, json({ confirm: true, pdf: 'replacement.pdf', pdfBase64: encode(replacement) }));
    assert.equal(replaceResponse.status, 200);
    assert.equal((await replaceResponse.json()).data.pdfChecksum, crypto.createHash('sha256').update(replacement).digest('hex'));
    await assert.rejects(storage.get(beforeReplace.originalStorageKey), { code: 'ENOENT' });
    const download = await get(`${endpoint.replace('/pdf', '')}/pdf`);
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-type'), /application\/pdf/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), replacement);
    assert.equal(await AuditLog.countDocuments({ recordId: created.certificateId, action: 'replace_pdf' }), 1);
    assert.equal((await get(`${root}/${created.certificateId}/printable-pdf`)).status, 200);
    process.env.PDF_QR_CORNER = 'top-left';
    const beforeRegenerate = await Certificate.findOne({ certificateId: created.certificateId });
    const regeneratedResponse = await fetch(`${root}/${created.certificateId}/pdf/regenerate`, json({}));
    delete process.env.PDF_QR_CORNER;
    assert.equal(regeneratedResponse.status, 200);
    const regenerated = (await regeneratedResponse.json()).data;
    assert.equal(regenerated.certificateId, created.certificateId);
    assert.equal(regenerated.verificationUrl, created.verificationUrl);
    assert.equal(regenerated.pdfQrCorner, 'top-left');
    await assert.rejects(storage.get(beforeRegenerate.printableStorageKey), { code: 'ENOENT' });
    const finalDoc = await Certificate.findOne({ certificateId: created.certificateId });
    assert.equal(await scanQrInPdf(await storage.get(finalDoc.printableStorageKey)), created.verificationUrl);
    assert.equal(await AuditLog.countDocuments({ recordId: created.certificateId, action: 'regenerate_pdf' }), 1);
  });

  await t.test('exposes ordered, scoped audit history to authorized staff', async () => {
    const response = await get(`${root}/${created.certificateId}/audit`);
    assert.equal(response.status, 200);
    const rows = (await response.json()).data;
    assert.ok(rows.length >= 6);
    assert.ok(rows.some((row) => row.action === 'create' && row.actor === admin.fullName));
    assert.ok(rows.some((row) => row.action === 'replace_pdf'));
    assert.ok(new Date(rows[0].createdAt) >= new Date(rows.at(-1).createdAt));
    assert.equal((await get(`${root}/${created.certificateId}/audit`, managerToken)).status, 403);
  });

  await t.test('archives after confirmation, hides archived record publicly and in register, retains bytes and audit', async () => {
    assert.equal((await fetch(`${root}/${created.certificateId}?confirm=false`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } })).status, 400);
    assert.equal((await fetch(`${root}/${created.certificateId}?confirm=true`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } })).status, 200);
    assert.equal((await get(`${root}/${created.certificateId}`)).status, 404);
    assert.equal((await get(`${root}/verify/${new URL(created.verificationUrl).pathname.split('/').pop()}`, null)).status, 404);
    const retained = await Certificate.findOne({ certificateId: created.certificateId }).select('+pdfBase64');
    assert.ok(retained.archivedAt);
    assert.ok(retained.originalStorageKey);
    assert.ok(await storage.get(retained.originalStorageKey));
    assert.equal(await AuditLog.countDocuments({ recordId: created.certificateId, action: 'archive' }), 1);
  });

  await t.test('persists data across a database reconnect and maps malformed JSON/not-found errors', async () => {
    await mongoose.disconnect();
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    assert.ok(await Certificate.findOne({ certificateId: created.certificateId }));
    const malformed = await fetch(root, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: '{' });
    assert.equal(malformed.status, 400);
    const malformedBody = await malformed.json();
    assert.equal('stack' in malformedBody, false);
    assert.equal(JSON.stringify(malformedBody).includes('SyntaxError'), false);
    const missing = await get(`${root}/does-not-exist`);
    assert.equal(missing.status, 404);
  });
});
