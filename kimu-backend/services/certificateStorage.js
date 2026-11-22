const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const KEY_PATTERN = /^[a-f0-9]{32}\.(?:original|printable)\.pdf$/;

function storageRoot() {
  return path.resolve(process.env.CERTIFICATE_STORAGE_DIR || path.join(__dirname, '..', 'storage', 'certificates'));
}

function createKey(kind) {
  if (!['original', 'printable'].includes(kind)) throw new TypeError('Invalid certificate storage object type.');
  return `${crypto.randomBytes(16).toString('hex')}.${kind}.pdf`;
}

function resolveKey(key) {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) throw new Error('Unsafe certificate storage key.');
  const root = storageRoot();
  const resolved = path.resolve(root, key);
  if (path.dirname(resolved) !== root) throw new Error('Unsafe certificate storage path.');
  return resolved;
}

async function put(key, bytes) {
  const filePath = resolveKey(key);
  await fs.mkdir(storageRoot(), { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await fs.chmod(storageRoot(), 0o700);
  let handle;
  try {
    handle = await fs.open(filePath, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
      handle = undefined;
      await fs.rm(filePath, { force: true }).catch(() => {});
    }
    throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
  return key;
}

async function get(key) {
  return fs.readFile(resolveKey(key));
}

async function remove(key) {
  if (!key) return;
  await fs.rm(resolveKey(key), { force: true });
}

function checksum(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function ensureStorageRoot() {
  await fs.mkdir(storageRoot(), { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await fs.chmod(storageRoot(), 0o700);
}

module.exports = { createKey, put, get, remove, checksum, storageRoot, resolveKey, ensureStorageRoot };
