
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const storage = require('../services/certificateStorage');

function configureB2(t, overrides = {}) {
  const values = {
    NODE_ENV: 'test',
    CERTIFICATE_STORAGE_PROVIDER: 'b2',
    B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
    B2_REGION: 'us-east-005',
    B2_KEY_ID: 'test-key-id',
    B2_APPLICATION_KEY: 'test-application-key',
    B2_BUCKET: 'certverify-pdfs-kimu-2026',
    ...overrides
  };

  const previous = {};

  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }

  t.after(() => {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });
}

test('creates valid random certificate storage keys', () => {
  const original = storage.createKey('original');
  const printable = storage.createKey('printable');

  assert.match(original, /^[a-f0-9]{32}\.original\.pdf$/);
  assert.match(printable, /^[a-f0-9]{32}\.printable\.pdf$/);
  assert.notEqual(original, printable);
});

test('rejects invalid certificate storage keys', async () => {
  assert.throws(
    () => storage.resolveKey('../unsafe.pdf'),
    /Unsafe certificate storage key/
  );

  await assert.rejects(
    storage.get('invalid-key'),
    /Unsafe certificate storage key/
  );
});

test('rejects unsupported certificate object types', () => {
  assert.throws(
    () => storage.createKey('unsupported'),
    /Invalid certificate storage object type/
  );
});

test('local storage uploads, downloads and deletes PDF files', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'kimu-storage-test-')
  );

  const previousProvider = process.env.CERTIFICATE_STORAGE_PROVIDER;
  const previousDirectory = process.env.CERTIFICATE_STORAGE_DIR;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = 'test';
  process.env.CERTIFICATE_STORAGE_PROVIDER = 'local';
  process.env.CERTIFICATE_STORAGE_DIR = directory;

  t.after(async () => {
    await fs.rm(directory, { recursive: true, force: true });

    if (previousProvider === undefined) {
      delete process.env.CERTIFICATE_STORAGE_PROVIDER;
    } else {
      process.env.CERTIFICATE_STORAGE_PROVIDER = previousProvider;
    }

    if (previousDirectory === undefined) {
      delete process.env.CERTIFICATE_STORAGE_DIR;
    } else {
      process.env.CERTIFICATE_STORAGE_DIR = previousDirectory;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  const key = storage.createKey('original');
  const original = Buffer.from('%PDF-1.7 test certificate');

  assert.equal(await storage.put(key, original), key);
  assert.deepEqual(await storage.get(key), original);

  await storage.remove(key);

  await assert.rejects(
    storage.get(key),
    { code: 'ENOENT' }
  );
});

test('local storage rejects non-Buffer uploads', async () => {
  const key = storage.createKey('original');

  await assert.rejects(
    storage.put(key, 'not a buffer'),
    /expects a Buffer/
  );
});

test('B2 uploads PDF data using PutObjectCommand', async (t) => {
  configureB2(t);

  const expected = Buffer.from('%PDF-1.7 test certificate');
  const key = storage.createKey('original');

  t.mock.method(S3Client.prototype, 'send', async (command) => {
    assert.ok(command instanceof PutObjectCommand);
    assert.equal(command.input.Bucket, 'certverify-pdfs-kimu-2026');
    assert.equal(command.input.Key, key);
    assert.deepEqual(command.input.Body, expected);
    assert.equal(command.input.ContentType, 'application/pdf');
    assert.equal(command.input.ContentLength, expected.length);

    return {};
  });

  assert.equal(await storage.put(key, expected), key);
});

test('B2 downloads PDF data and converts it into a Buffer', async (t) => {
  configureB2(t);

  const expected = Buffer.from('%PDF-1.7 downloaded certificate');
  const key = storage.createKey('printable');

  t.mock.method(S3Client.prototype, 'send', async (command) => {
    assert.ok(command instanceof GetObjectCommand);
    assert.equal(command.input.Bucket, 'certverify-pdfs-kimu-2026');
    assert.equal(command.input.Key, key);

    return {
      Body: {
        transformToByteArray: async () => new Uint8Array(expected)
      }
    };
  });

  const result = await storage.get(key);

  assert.ok(Buffer.isBuffer(result));
  assert.deepEqual(result, expected);
});

test('B2 deletion uses DeleteObjectCommand', async (t) => {
  configureB2(t);

  const key = storage.createKey('original');

  t.mock.method(S3Client.prototype, 'send', async (command) => {
    assert.ok(command instanceof DeleteObjectCommand);
    assert.equal(command.input.Bucket, 'certverify-pdfs-kimu-2026');
    assert.equal(command.input.Key, key);

    return {};
  });

  await storage.remove(key);
});

test('B2 missing objects are converted to ENOENT', async (t) => {
  configureB2(t);

  const key = storage.createKey('original');

  t.mock.method(S3Client.prototype, 'send', async () => {
    const error = new Error('Object not found');
    error.name = 'NoSuchKey';
    throw error;
  });

  await assert.rejects(
    storage.get(key),
    { code: 'ENOENT' }
  );
});

test('B2 rejects incomplete configuration without sending requests', async (t) => {
  configureB2(t, {
    B2_APPLICATION_KEY: ''
  });

  const key = storage.createKey('original');

  await assert.rejects(
    storage.put(key, Buffer.from('test')),
    /Backblaze B2 configuration is incomplete/
  );
});

test('B2 rejects empty download response bodies', async (t) => {
  configureB2(t);

  const key = storage.createKey('original');

  t.mock.method(S3Client.prototype, 'send', async () => ({
    Body: null
  }));

  await assert.rejects(
    storage.get(key),
    /empty response body/
  );
});

test('rejects invalid storage providers', (t) => {
  const previous = process.env.CERTIFICATE_STORAGE_PROVIDER;

  process.env.CERTIFICATE_STORAGE_PROVIDER = 'invalid-provider';

  t.after(() => {
    if (previous === undefined) {
      delete process.env.CERTIFICATE_STORAGE_PROVIDER;
    } else {
      process.env.CERTIFICATE_STORAGE_PROVIDER = previous;
    }
  });

  assert.throws(
    () => storage.provider(),
    /Invalid certificate storage provider/
  );
});

test('defaults to B2 when production provider is not explicitly configured', (t) => {
  const previousProvider = process.env.CERTIFICATE_STORAGE_PROVIDER;
  const previousNodeEnv = process.env.NODE_ENV;

  delete process.env.CERTIFICATE_STORAGE_PROVIDER;
  process.env.NODE_ENV = 'production';

  t.after(() => {
    if (previousProvider === undefined) {
      delete process.env.CERTIFICATE_STORAGE_PROVIDER;
    } else {
      process.env.CERTIFICATE_STORAGE_PROVIDER = previousProvider;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  assert.equal(storage.provider(), 'b2');
});

test('calculates consistent SHA-256 checksums', () => {
  const bytes = Buffer.from('Kimu Transport');

  assert.equal(
    storage.checksum(bytes),
    storage.checksum(bytes)
  );

  assert.match(
    storage.checksum(bytes),
    /^[a-f0-9]{64}$/
  );
});
