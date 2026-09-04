const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const createResourceRoutes = require('./routes/resourceRoutes');
const Visitor = require('./models/Visitor');
const attendanceRoutes = require('./routes/attendanceRoutes');
const Attendance = require('./models/Attendance');
const CompanySettings = require('./models/CompanySettings');
const { dateKeyAsUtcDate, getLocalDateKey, previousDateKey } = require('./utils/localTime');
const Employee = require('./models/Employee');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// --- Core middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Kimu Transport API is running.' });
});

// --- Feature routes ---
app.use('/api/auth', authRoutes);
app.use('/api/employees', createResourceRoutes(Employee, { searchable: ['fullName', 'employeeNumber', 'department'], uniqueFields: ['fullName', 'employeeNumber'] }));
app.use('/api/attendance', attendanceRoutes);
app.use('/api/visitors', createResourceRoutes(Visitor, { searchable: ['fullName', 'phone', 'reason'], activity: { create: (item) => ({ title: 'New visitor registered', description: `${item.fullName} was registered at reception.`, type: 'visitor', priority: 'normal', action: 'registered visitor', entity: 'visitor' }), update: (item) => ({ title: 'Visitor record updated', description: `${item.fullName}'s visitor record was updated.`, type: 'visitor', priority: 'normal', action: 'updated visitor', entity: 'visitor' }), remove: (item) => ({ title: 'Visitor record deleted', description: `${item.fullName}'s visitor record was deleted.`, type: 'visitor', priority: 'normal', action: 'deleted visitor', entity: 'visitor' }) } }));
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.get('/api/dashboard/summary', require('./middleware/auth').protect, async (req, res, next) => {
  try {
    const [company, attendance, employees, visitors] = await Promise.all([
      CompanySettings.findOne({ key: 'default' }).select('timezone').lean(),
      Attendance.find().select('checkIn status').lean(),
      Employee.countDocuments({ isActive: true }),
      Visitor.find().select('createdAt').lean(),
    ]);
    const timeZone = company?.timezone || 'Africa/Kigali';
    const today = getLocalDateKey(new Date(), timeZone);
    const arrivalsToday = attendance.filter((record) => getLocalDateKey(record.checkIn, timeZone) === today);
    const visitorsToday = visitors.filter((visitor) => getLocalDateKey(visitor.createdAt, timeZone) === today).length;
    const presentToday = arrivalsToday.filter((record) => record.status !== 'absent').length;
    const absentToday = Math.max(employees - arrivalsToday.length, 0);
    res.json({ success: true, data: { presentToday, absentToday, visitorsToday } });
  } catch (error) { next(error); }
});
app.get('/api/reports/daily', require('./middleware/auth').protect, async (req, res, next) => {
  try {
    const company = await CompanySettings.findOne({ key: 'default' }).select('timezone').lean();
    const timeZone = company?.timezone || 'Africa/Kigali';
    const reportDate = req.query.date || previousDateKey(getLocalDateKey(new Date(), timeZone));
    const day = dateKeyAsUtcDate(reportDate);
    if (Number.isNaN(day.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return res.status(400).json({ success: false, message: 'Invalid report date.' });
    }
    const visitorFilter = { $expr: { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: timeZone } }, reportDate] } };
    if (req.query.search) visitorFilter.fullName = { $regex: req.query.search.trim(), $options: 'i' };
    const [attendance, visitors] = await Promise.all([
      Attendance.find({ date: day }).sort({ employeeName: 1 }),
      Visitor.find(visitorFilter).sort({ createdAt: -1 }),
    ]);
    res.json({ success: true, data: { date: reportDate, attendance, visitors } });
  } catch (error) { next(error); }
});

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
