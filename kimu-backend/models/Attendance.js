const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },
    checkIn: Date,
    checkOut: Date,
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);
attendanceSchema.index({ employeeName: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', attendanceSchema);