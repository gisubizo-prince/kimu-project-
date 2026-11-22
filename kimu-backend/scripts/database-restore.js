#!/usr/bin/env node
'use strict';

// Restore only into a new/empty database. Never drops collections or data.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { MongoClient, BSON } = require('mongodb');

function decrypt(bytes, key) {
  if (bytes.length < 29) throw new Error('Encrypted backup entry is truncated.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
}

async function main() {
  const uri = process.env.RESTORE_MONGO_URI;
  const input = process.env.BACKUP_DIR;
  const storageRoot = process.env.RESTORE_CERTIFICATE_STORAGE_DIR;
  if (!uri || !input || !storageRoot) throw new Error('Set RESTORE_MONGO_URI, BACKUP_DIR, and RESTORE_CERTIFICATE_STORAGE_DIR.');
  const rawKey = process.env.BACKUP_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(rawKey)) throw new Error('BACKUP_ENCRYPTION_KEY must be a 32-byte hex key from a secret manager.');
  const key = Buffer.from(rawKey, 'hex');
  const dir = path.resolve(input);
  const manifest = JSON.parse(decrypt(await fs.readFile(path.join(dir, 'manifest.json.enc')), key).toString('utf8'));
  if (manifest.format !== 'kimu-mongodb-ejson-v1' || !Array.isArray(manifest.collections)) throw new Error('Unsupported backup manifest.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db();
    if (!db.databaseName || db.databaseName === manifest.database) throw new Error('Restore target must be a separately named database.');
    if (process.env.RESTORE_CONFIRM !== `restore-to-empty-database:${db.databaseName}`) throw new Error(`Set RESTORE_CONFIRM=restore-to-empty-database:${db.databaseName} to confirm this target.`);
    const existing = await db.listCollections({}, { nameOnly: true }).toArray();
    for (const item of existing) {
      if (await db.collection(item.name).estimatedDocumentCount() > 0) throw new Error(`Restore target is not empty (collection ${item.name}). No data was changed.`);
    }
    const fileRoot = path.resolve(storageRoot);
    await fs.mkdir(path.dirname(fileRoot), { recursive: true });
    await fs.mkdir(fileRoot, { mode: 0o700 }); // Fails when the target already exists.
    for (const item of manifest.files || []) {
      if (typeof item.path !== 'string' || item.path.includes('..') || path.isAbsolute(item.path) || item.path.includes('\\')) throw new Error('Unsafe file path in manifest.');
      const bytes = decrypt(await fs.readFile(`${path.join(dir, 'certificates', ...item.path.split('/'))}.enc`), key);
      const digest = crypto.createHash('sha256').update(bytes).digest('hex');
      if (digest !== item.sha256 || bytes.length !== item.size) throw new Error(`Certificate file checksum mismatch: ${item.path}.`);
      const target = path.join(fileRoot, ...item.path.split('/'));
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    }
    for (const item of manifest.collections) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(item.name) || item.file !== `${item.name}.ejson.enc`) throw new Error('Unsafe collection entry in manifest.');
      const bytes = decrypt(await fs.readFile(path.join(dir, item.file)), key);
      const digest = crypto.createHash('sha256').update(bytes).digest('hex');
      if (digest !== item.sha256) throw new Error(`Checksum mismatch for ${item.file}.`);
      const payload = BSON.EJSON.parse(bytes.toString('utf8'), { relaxed: false, useBigInt64: true });
      const collection = db.collection(item.name);
      if (payload.documents.length) await collection.insertMany(payload.documents, { ordered: true });
      if (payload.indexes.length) await collection.createIndexes(payload.indexes);
      const actual = await collection.countDocuments();
      if (actual !== item.count) throw new Error(`Restore count mismatch for ${item.name}: expected ${item.count}, got ${actual}.`);
    }
    console.log(`Restore verified in empty database ${db.databaseName}: ${manifest.collections.length} collections.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(`Restore failed: ${error.message}`); process.exitCode = 1; });
