const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const createResourceRoutes = require('./routes/resourceRoutes');
const Visitor = require('./models/Visitor');
const Attendance = require('./models/Attendance');
const Student = require('./models/Student');
const CompanySettings = require('./models/CompanySettings');
const { dateKeyAsUtcDate, getLocalDateKey } = require('./utils/localTime');
const Employee = require('./models/Employee');
const studentRoutes = require('./routes/studentRoutes');
const trainingAttendanceRoutes = require('./routes/trainingAttendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const maitriseReportRoutes = require('./routes/maitriseReportRoutes');

const app = express();
const allowedOrigins = new Set([process.env.CLIENT_URL || 'http://localhost:5173']);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}

// --- Core middleware ---
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'METRIZE Training API is running.' });
});

// --- Feature routes ---
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/employees', createResourceRoutes(Employee, { searchable: ['fullName', 'employeeNumber', 'department'], uniqueFields: ['fullName', 'employeeNumber'] }));
app.use('/api/attendance', trainingAttendanceRoutes);
app.use('/api/visitors', createResourceRoutes(Visitor, { searchable: ['fullName', 'phone', 'reason'], activity: { create: (item) => ({ title: 'New visitor registered', description: `${item.fullName} was registered at reception.`, type: 'visitor', priority: 'normal', action: 'registered visitor', entity: 'visitor' }), update: (item) => ({ title: 'Visitor record updated', description: `${item.fullName}'s visitor record was updated.`, type: 'visitor', priority: 'normal', action: 'updated visitor', entity: 'visitor' }), remove: (item) => ({ title: 'Visitor record deleted', description: `${item.fullName}'s visitor record was deleted.`, type: 'visitor', priority: 'normal', action: 'deleted visitor', entity: 'visitor' }) } }));
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/maitrise-reports', maitriseReportRoutes);
app.get('/api/dashboard/summary', require('./middleware/auth').protect, async (req, res, next) => {
  try {
    const company = await CompanySettings.findOne({ key: 'default' }).select('timezone').lean();
    const timeZone = company?.timezone || 'Africa/Kigali';
    const today = getLocalDateKey(new Date(), timeZone);
    const [totalStudents, activeStudents, attendanceToday] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Attendance.find({ date: dateKeyAsUtcDate(today), studentId: { $exists: true } }).select('lesson shift').lean(),
    ]);
    const lessons = ['GPS', 'PARKING', 'CIRCULATION'];
    const shifts = Attendance.SHIFTS;
    const attendanceByLesson = Object.fromEntries(lessons.map((lesson) => [lesson, attendanceToday.filter((record) => record.lesson === lesson).length]));
    const attendanceByShift = Object.fromEntries(shifts.map((shift) => [shift, attendanceToday.filter((record) => record.shift === shift).length]));
    res.json({ success: true, data: { totalStudents, activeStudents, todaysAttendance: attendanceToday.length, attendanceByLesson, attendanceByShift } });
  } catch (error) { next(error); }
});
app.get('/api/reports/daily', require('./middleware/auth').protect, async (req, res, next) => {
  try {
    const company = await CompanySettings.findOne({ key: 'default' }).select('timezone').lean();
    const timeZone = company?.timezone || 'Africa/Kigali';
    const reportDate = req.query.date || getLocalDateKey(new Date(), timeZone);
    const day = dateKeyAsUtcDate(reportDate);
    if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return res.status(400).json({ success: false, message: 'Invalid report date.' });
    }
    const attendance = await Attendance.find({ date: day, studentId: { $exists: true } }).sort({ studentName: 1, shift: 1, lesson: 1 });
    res.json({ success: true, data: { date: reportDate, attendance } });
  } catch (error) { next(error); }
});

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
