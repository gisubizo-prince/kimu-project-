const mongoose = require('mongoose');

const SHIFTS = ['09:00 - 11:30', '11:30 - 14:00', '14:30 - 16:00', '16:00 - 18:30'];
const LESSONS = ['GPS', 'PARKING', 'CIRCULATION'];

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String, trim: true },
    attendanceKey: { type: String },
    telephone: { type: String, trim: true },
    editedAt: Date,
    shift: { type: String, enum: SHIFTS },
    lesson: { type: String, enum: LESSONS },
    employeeName: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    checkIn: Date,
    checkOut: Date,
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);
attendanceSchema.index(
  { attendanceKey: 1 },
  { unique: true, partialFilterExpression: { attendanceKey: { $type: 'string' } } }
);
const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
module.exports.SHIFTS = SHIFTS;
module.exports.LESSONS = LESSONS;