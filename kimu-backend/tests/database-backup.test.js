const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { MongoClient } = require('mongodb');

const base = process.env.KIMU_OPS_TEST_MONGO_URI;
let parsed;
try { parsed = new URL(base); } catch { parsed = null; }
if (process.env.KIMU_OPS_TEST_DISPOSABLE !== 'YES' || !parsed || parsed.protocol !== 'mongodb:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.port !== '27018') {
  throw new Error('Ops tests require KIMU_OPS_TEST_DISPOSABLE=YES and a loopback disposable MongoDB URI on port 27018.');
}

test('backup preserves BSON/indexes; restore fills only an empty, explicitly named database', async (t) => {
  const sourceName = `kimu_ops_src_${process.pid}`;
  const targetName = `kimu_ops_dst_${process.pid}`;
  const sourceUri = new URL(base); sourceUri.pathname = `/${sourceName}`;
  const targetUri = new URL(base); targetUri.pathname = `/${targetName}`;
  const backupDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kimu-backup-'));
  await fs.rm(backupDir, { recursive: true, force: true }); // backup script expects a new path
  const sourceFiles = `${backupDir}-source-files`;
  const restoreFiles = `${backupDir}-restored-files`;
  await fs.mkdir(sourceFiles, { recursive: true });
  await fs.writeFile(path.join(sourceFiles, 'private.pdf'), Buffer.from('private certificate bytes'));
  const client = new MongoClient(sourceUri.toString());
  const key = require('node:crypto').randomBytes(32).toString('hex');
  t.after(async () => {
    await client.db(sourceName).dropDatabase().catch(() => {});
    await client.db(targetName).dropDatabase().catch(() => {});
    await client.close();
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.rm(sourceFiles, { recursive: true, force: true });
    await fs.rm(restoreFiles, { recursive: true, force: true });
  });
  await client.connect();
  await client.db(sourceName).collection('records').insertOne({ _id: 'fixed', createdAt: new Date('2025-01-02T03:04:05Z'), payload: Buffer.from([1, 2, 3]) });
  await client.db(sourceName).collection('records').createIndex({ createdAt: 1 }, { name: 'createdAt_1' });

  const run = (script, extraEnv) => spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', script)], {
    encoding: 'utf8', env: { ...process.env, BACKUP_DIR: backupDir, BACKUP_ENCRYPTION_KEY: key, ...extraEnv },
  });
  const backedUp = run('database-backup.js', { MONGO_URI: sourceUri.toString(), CERTIFICATE_STORAGE_DIR: sourceFiles });
  assert.equal(backedUp.status, 0, backedUp.stderr);
  const encryptedManifest = await fs.readFile(path.join(backupDir, 'manifest.json.enc'));
  assert.equal(encryptedManifest.includes(Buffer.from('private certificate bytes')), false);
  const decipher = require('node:crypto').createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), encryptedManifest.subarray(0, 12));
  decipher.setAuthTag(encryptedManifest.subarray(12, 28));
  const manifest = JSON.parse(Buffer.concat([decipher.update(encryptedManifest.subarray(28)), decipher.final()]).toString('utf8'));
  assert.equal(manifest.collections.find((item) => item.name === 'records').count, 1);

  const restored = run('database-restore.js', { RESTORE_MONGO_URI: targetUri.toString(), RESTORE_CONFIRM: `restore-to-empty-database:${targetName}`, RESTORE_CERTIFICATE_STORAGE_DIR: restoreFiles });
  assert.equal(restored.status, 0, restored.stderr);
  const record = await client.db(targetName).collection('records').findOne({ _id: 'fixed' });
  assert.deepEqual(Buffer.from(record.payload.buffer), Buffer.from([1, 2, 3]));
  assert.equal(record.createdAt.toISOString(), '2025-01-02T03:04:05.000Z');
  assert.ok((await client.db(targetName).collection('records').indexes()).some((index) => index.name === 'createdAt_1'));
  assert.deepEqual(await fs.readFile(path.join(restoreFiles, 'private.pdf')), Buffer.from('private certificate bytes'));

  const rejected = run('database-restore.js', { RESTORE_MONGO_URI: targetUri.toString(), RESTORE_CONFIRM: `restore-to-empty-database:${targetName}`, RESTORE_CERTIFICATE_STORAGE_DIR: restoreFiles });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /not empty/);
  assert.equal(await client.db(targetName).collection('records').countDocuments(), 1);
});
