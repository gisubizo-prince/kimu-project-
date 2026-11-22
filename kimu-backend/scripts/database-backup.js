#!/usr/bin/env node
'use strict';

// Logical, BSON-preserving backup. Does not mutate the source database.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { MongoClient, BSON } = require('mongodb');

function safeName(name) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(name)) throw new Error('Unsafe collection name in backup.');
  return name;
}
function encryptionKey() {
  const value = process.env.BACKUP_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('BACKUP_ENCRYPTION_KEY must be a 32-byte hex key from a secret manager.');
  return Buffer.from(value, 'hex');
}
function encrypt(bytes, key) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

async function main() {
  const uri = process.env.MONGO_URI;
  const output = process.env.BACKUP_DIR;
  const storageRoot = process.env.CERTIFICATE_STORAGE_DIR;
  if (!uri || !output || !storageRoot) throw new Error('Set MONGO_URI, BACKUP_DIR, and CERTIFICATE_STORAGE_DIR.');
  const key = encryptionKey();
  const destination = path.resolve(output);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await fs.mkdir(destination, { mode: 0o700 }); // Fails if a prior backup exists.
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const manifest = { format: 'kimu-mongodb-ejson-v1', createdAt: new Date().toISOString(), database: db.databaseName, collections: [], files: [] };
    for (const item of collections) {
      const name = safeName(item.name);
      const collection = db.collection(name);
      const docs = await collection.find({}).toArray();
      const indexes = await collection.indexes();
      const payload = { documents: docs, indexes: indexes.filter((index) => index.name !== '_id_') };
      const fileName = `${name}.ejson.enc`;
      const bytes = Buffer.from(BSON.EJSON.stringify(payload, { relaxed: false, useBigInt64: true }));
      await fs.writeFile(path.join(destination, fileName), encrypt(bytes, key), { flag: 'wx', mode: 0o600 });
      manifest.collections.push({ name, file: fileName, count: docs.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
    const fileRoot = path.resolve(storageRoot);
    async function copyFiles(current, relative = '') {
      for (const entry of await fs.readdir(current, { withFileTypes: true })) {
        const rel = path.posix.join(relative.replace(/\\/g, '/'), entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link in certificate storage: ${rel}`);
        const source = path.join(current, entry.name);
        if (entry.isDirectory()) await copyFiles(source, rel);
        else if (entry.isFile()) {
          const bytes = await fs.readFile(source);
          const target = path.join(destination, 'certificates', ...rel.split('/'));
          await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
          await fs.writeFile(`${target}.enc`, encrypt(bytes, key), { flag: 'wx', mode: 0o600 });
          manifest.files.push({ path: rel, size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
        } else throw new Error(`Unsupported entry in certificate storage: ${rel}`);
      }
    }
    await copyFiles(fileRoot);
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    await fs.writeFile(path.join(destination, 'manifest.json.enc'), encrypt(manifestBytes, key), { flag: 'wx', mode: 0o600 });
    console.log(`Backup created for ${manifest.database}: ${manifest.collections.length} collections and ${manifest.files.length} certificate files.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(`Backup failed: ${error.message}`); process.exitCode = 1; });
