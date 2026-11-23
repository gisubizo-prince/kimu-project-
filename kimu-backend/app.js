const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { apiLimit, loginLimit } = require('./middleware/rateLimit');
mongoose.set('bufferCommands', false);
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const createResourceRoutes = require('./routes/resourceRoutes');
const Visitor = require('./models/Visitor');
const Attendance = require('./models/Attendance');
const Student = require('./models/Student');
const { dateKeyAsUtcDate, getLocalDateKey } = require('./utils/localTime');
const Employee = require('./models/Employee');
const studentRoutes = require('./routes/studentRoutes');
const trainingAttendanceRoutes = require('./routes/trainingAttendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const maitriseReportRoutes = require('./routes/maitriseReportRoutes');
const contactRoutes = require('./routes/contactRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const taxiDriverRoutes = require('./routes/taxiDriverRoutes');
const certificateRoutes = require('./routes/certificateRoutes');

const app = express();
if (process.env.TRUST_PROXY_HOPS && /^(?:0|[1-9]\d*)$/.test(process.env.TRUST_PROXY_HOPS)) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
const configuredClientOrigin = process.env.CLIENT_URL ? (() => { try { return new URL(process.env.CLIENT_URL).origin; } catch { return process.env.CLIENT_URL; } })() : 'http://localhost:5173';
const allowedOrigins = new Set([
  configuredClientOrigin,
  'https://www.kimudigital.com',
  'https://kimudigital.com',
  'https://kimutransport.vercel.app',
]);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}

// --- Core middleware ---
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.set('X-Request-Id', req.requestId);
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ success: false, message: 'Origin is not allowed.', requestId: req.requestId });
  next();
});
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: false,
  })
);
app.use('/api', apiLimit);
app.use('/api/auth/login', loginLimit);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 100 }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ success: ready, status: ready ? 'ready' : 'unavailable' });
});

// Private-network scrape endpoint. The production edge only proxies /api/*;
// this route is reachable by the internal monitoring network, not browsers.
app.get('/internal/metrics', (req, res) => {
  const ready = mongoose.connection.readyState === 1 ? 1 : 0;
  const memory = process.memoryUsage();
  res.type('text/plain; version=0.0.4; charset=utf-8').send([
    '# HELP kimu_api_up API process is accepting requests.',
    '# TYPE kimu_api_up gauge',
    'kimu_api_up 1',
    '# HELP kimu_mongodb_ready MongoDB connection readiness.',
    '# TYPE kimu_mongodb_ready gauge',
    `kimu_mongodb_ready ${ready}`,
    '# HELP kimu_process_resident_memory_bytes Resident memory in bytes.',
    '# TYPE kimu_process_resident_memory_bytes gauge',
    `kimu_process_resident_memory_bytes ${memory.rss}`,
    '',
  ].join('\n'));
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
app.use('/api/contacts', contactRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/taxi-drivers', taxiDriverRoutes);
app.use('/api/certificates', certificateRoutes);
app.get('/api/dashboard/summary', require('./middleware/auth').protect, async (req, res, next) => {
  try {
    const today = getLocalDateKey();
    const todayDate = dateKeyAsUtcDate(today);
    const weekStart = new Date(todayDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const [totalStudents, traineeStudents, passStudents, repeatStudents, attendanceWeek] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ $or: [{ status: 'trainee' }, { status: { $exists: false } }] }),
      Student.countDocuments({ status: 'pass' }),
      Student.countDocuments({ status: 'repeat' }),
      Attendance.find({ date: { $gte: weekStart, $lte: todayDate }, studentId: { $exists: true } }).select('date studentId lesson shift').lean(),
    ]);
    const trainingStudents = traineeStudents + repeatStudents;
    const attendanceToday = attendanceWeek.filter((record) => record.date.toISOString().slice(0, 10) === today);
    const lessons = ['GPS', 'PARKING', 'CIRCULATION'];
    const shifts = Attendance.SHIFTS;
    const attendanceByLesson = Object.fromEntries(lessons.map((lesson) => [lesson, attendanceToday.filter((record) => record.lesson === lesson).length]));
    const attendanceByShift = Object.fromEntries(shifts.map((shift) => [shift, attendanceToday.filter((record) => record.shift === shift).length]));
    const dayKeys = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setUTCDate(day.getUTCDate() + index);
      return day.toISOString().slice(0, 10);
    });
    const attendanceByDay = Object.fromEntries(dayKeys.map((day) => [day, 0]));
    attendanceWeek.forEach((record) => {
      const day = record.date.toISOString().slice(0, 10);
      if (attendanceByDay[day] !== undefined) attendanceByDay[day] += 1;
    });
    const studentsAttendedToday = new Set(attendanceToday.map((record) => String(record.studentId))).size;
    res.json({
      success: true,
      data: {
        totalStudents,
        traineeStudents,
        passStudents,
        repeatStudents,
        trainingStudents,
        sessionsToday: attendanceToday.length,
        sessionsLast7Days: attendanceWeek.length,
        studentsAttendedToday,
        attendanceByLesson,
        attendanceByShift,
        dailyAttendanceTrend: dayKeys.map((date) => ({ date, count: attendanceByDay[date] })),
      },
    });
  } catch (error) { next(error); }
});
app.get('/api/reports/daily', require('./middleware/auth').protect, async (req, res, next) => {
  try {
    const reportDate = req.query.date || getLocalDateKey();
    const day = dateKeyAsUtcDate(reportDate);
    if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return res.status(400).json({ success: false, message: 'Invalid report date.' });
    }
    const attendance = await Attendance.find({ date: day, studentId: { $exists: true } })
      .sort({ studentName: 1, shift: 1, lesson: 1 })
      .collation({ locale: 'en', strength: 2 });
    res.json({ success: true, data: { date: reportDate, attendance } });
  } catch (error) { next(error); }
});

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
