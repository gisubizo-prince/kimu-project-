const Attendance = require('../models/Attendance');
const CompanySettings = require('../models/CompanySettings');
const { recordActivity } = require('../utils/activity');
const { dateKeyAsUtcDate, getAttendanceStatus, getLocalDateKey } = require('../utils/localTime');

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.search) filter.employeeName = { $regex: req.query.search.trim(), $options: 'i' };
    if (req.query.status) {
      if (!['present', 'late', 'absent'].includes(req.query.status)) return res.status(400).json({ success: false, message: 'Invalid attendance status.' });
      filter.status = req.query.status;
    }
    if (req.query.date) {
      const day = dateKeyAsUtcDate(req.query.date);
      if (Number.isNaN(day.getTime())) return res.status(400).json({ success: false, message: 'Invalid attendance date.' });
      filter.date = day;
    }
    if (req.query.month) {
      if (!/^\d{4}-\d{2}$/.test(req.query.month)) return res.status(400).json({ success: false, message: 'Invalid attendance month.' });
      const start = dateKeyAsUtcDate(`${req.query.month}-01`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      filter.date = { $gte: start, $lt: end };
    }
    const records = await Attendance.find(filter).sort({ date: -1, checkIn: -1 });
    res.json({ success: true, data: records });
  }
  catch (error) { next(error); }
}
async function record(req, res, next) {
  try {
    const { employeeName, notes } = req.body;
    if (!employeeName) return res.status(400).json({ success: false, message: 'Employee name is required.' });

    const now = new Date();
    const company = await CompanySettings.findOne({ key: 'default' }).select('timezone').lean();
    const timeZone = company?.timezone || 'Africa/Kigali';
    const day = dateKeyAsUtcDate(getLocalDateKey(now, timeZone));
    const existing = await Attendance.findOne({ employeeName, date: day }).lean();
    if (existing) {
      const existingCheckIn = new Date(existing.checkIn);
      const arrivalTime = Number.isNaN(existingCheckIn.getTime()) ? 'an earlier time' : `at ${existingCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return res.status(409).json({ success: false, message: `${employeeName} has already registered attendance today ${arrivalTime}.` });
    }

    let record;
    try {
      record = await Attendance.create({ employeeName, date: day, status: getAttendanceStatus(now, timeZone), notes, checkIn: now });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: `${employeeName} has already registered attendance today.` });
      }
      throw error;
    }
    await recordActivity({ user: req.user, title: 'Employee checked in', description: `${employeeName} arrived at work.`, type: 'attendance', priority: 'normal', action: 'checked employee in', entity: 'attendance', recordId: record._id });
    res.status(201).json({ success: true, data: record });
  } catch (error) { next(error); }
}
async function checkout(req, res, next) {
  try { const record = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: new Date() }, { new: true }); if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' }); await recordActivity({ user: req.user, title: 'Employee checked out', description: `${record.employeeName} left work.`, type: 'attendance', priority: 'normal', action: 'checked employee out', entity: 'attendance', recordId: record._id }); res.json({ success: true, data: record }); }
  catch (error) { next(error); }
}
module.exports = { list, record, checkout };