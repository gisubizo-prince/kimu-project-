
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const KEY_PATTERN = /^[a-f0-9]{32}\.(?:original|printable)\.pdf$/;

let s3Client;

function provider() {
  const configured = process.env.CERTIFICATE_STORAGE_PROVIDER;

  const selected = configured ||
    (process.env.NODE_ENV === 'production' ? 'b2' : 'local');

  if (!['local', 'b2'].includes(selected)) {
    throw new Error('Invalid certificate storage provider.');
  }

  return selected;
}

function storageRoot() {
  return path.resolve(
    process.env.CERTIFICATE_STORAGE_DIR ||
    path.join(__dirname, '..', 'storage', 'certificates')
  );
}

function createKey(kind) {
  if (!['original', 'printable'].includes(kind)) {
    throw new TypeError('Invalid certificate storage object type.');
  }

  return `${crypto.randomBytes(16).toString('hex')}.${kind}.pdf`;
}

function validateKey(key) {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    throw new Error('Unsafe certificate storage key.');
  }

  return key;
}

function resolveKey(key) {
  validateKey(key);

  const root = storageRoot();
  const resolved = path.resolve(root, key);

  if (path.dirname(resolved) !== root) {
    throw new Error('Unsafe certificate storage path.');
  }

  return resolved;
}

function getS3Client() {
  if (provider() !== 'b2') {
    throw new Error('B2 client requested while local storage is active.');
  }

  const {
    B2_ENDPOINT,
    B2_REGION,
    B2_KEY_ID,
    B2_APPLICATION_KEY,
    B2_BUCKET
  } = process.env;

  if (
    !B2_ENDPOINT ||
    !B2_REGION ||
    !B2_KEY_ID ||
    !B2_APPLICATION_KEY ||
    !B2_BUCKET
  ) {
    throw new Error('Backblaze B2 configuration is incomplete.');
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: B2_ENDPOINT,
      region: B2_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY
      }
    });
  }

  return s3Client;
}

async function put(key, bytes) {
  validateKey(key);

  if (!Buffer.isBuffer(bytes)) {
    throw new TypeError('Certificate storage expects a Buffer.');
  }

  if (provider() === 'b2') {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: 'application/pdf',
        ContentLength: bytes.length
      })
    );

    return key;
  }

  const filePath = resolveKey(key);

  await fs.mkdir(storageRoot(), {
    recursive: true,
    mode: 0o700
  });

  if (process.platform !== 'win32') {
    await fs.chmod(storageRoot(), 0o700);
  }

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
  validateKey(key);

  if (provider() === 'b2') {
    try {
      const response = await getS3Client().send(
        new GetObjectCommand({
          Bucket: process.env.B2_BUCKET,
          Key: key
        })
      );

      if (!response.Body) {
        throw new Error('B2 returned an empty response body.');
      }

      const bytes = await response.Body.transformToByteArray();

      return Buffer.from(bytes);
    } catch (error) {
      if (
        error.name === 'NoSuchKey' ||
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        const missing = new Error('Certificate file not found.');
        missing.code = 'ENOENT';
        throw missing;
      }

      throw error;
    }
  }

  return fs.readFile(resolveKey(key));
}

async function remove(key) {
  if (!key) return;

  validateKey(key);

  if (provider() === 'b2') {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.B2_BUCKET,
        Key: key
      })
    );

    return;
  }

  await fs.rm(resolveKey(key), { force: true });
}

function checksum(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function ensureStorageRoot() {
  if (provider() === 'b2') return;

  await fs.mkdir(storageRoot(), {
    recursive: true,
    mode: 0o700
  });

  if (process.platform !== 'win32') {
    await fs.chmod(storageRoot(), 0o700);
  }
}

module.exports = {
  createKey,
  put,
  get,
  remove,
  checksum,
  storageRoot,
  resolveKey,
  ensureStorageRoot,
  provider
};
