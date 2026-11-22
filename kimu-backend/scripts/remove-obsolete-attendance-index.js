require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

const APPLY = process.argv.includes('--apply');
const CONFIRMATION = 'drop-obsolete-attendance-index';

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured.');
  if (APPLY && process.env.MIGRATION_CONFIRM !== CONFIRMATION) throw new Error(`Set MIGRATION_CONFIRM=${CONFIRMATION} to apply this migration.`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    const indexes = await Attendance.collection.indexes();
    const target = indexes.find((index) => index.unique && index.key?.employeeName === 1 && index.key?.date === 1 && Object.keys(index.key).length === 2);
    const attendanceKeyIndex = indexes.find((index) => index.unique && index.key?.attendanceKey === 1);
    if (!target) {
      console.log('[migration] Obsolete employeeName/date index not found; no change needed.');
      return;
    }
    if (!attendanceKeyIndex) throw new Error('Expected unique attendanceKey index is missing; refusing to remove the legacy index.');
    console.log(`[migration] ${APPLY ? 'Applying' : 'Dry run:'} would remove index ${target.name}; unique attendanceKey index is present.`);
    if (APPLY) await Attendance.collection.dropIndex(target.name);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(`[migration] Failed: ${error.name || 'error'}`);
  process.exitCode = 1;
});
