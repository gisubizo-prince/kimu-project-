const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    workStartTime: { type: String, default: '08:00' },
    workEndTime: { type: String, default: '17:00' },
    allowManualCheckIn: { type: Boolean, default: true },
    allowManualCheckOut: { type: Boolean, default: true },
    allowAttendanceEdits: { type: Boolean, default: false },
    requireVisitorPhone: { type: Boolean, default: false },
    requireVisitorId: { type: Boolean, default: false },
    visitorRetentionDays: { type: Number, default: 365, min: 1 },
  },
  { timestamps: true }
);
module.exports = mongoose.model('SystemSettings', systemSettingsSchema);