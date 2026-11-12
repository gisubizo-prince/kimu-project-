const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const CompanySettings = require('../models/CompanySettings');
const { dateKeyAsUtcDate, getLocalDateKey } = require('../utils/localTime');
const { SHIFTS, LESSONS } = Attendance;

async function list(req, res, next) {
  try {
    const filter = { studentId: { $exists: true } };
    if (req.query.search) filter.studentName = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.shift) {
      if (!SHIFTS.includes(req.query.shift)) return res.status(400).json({ success: false, message: 'Invalid attendance shift.' });
      filter.shift = req.query.shift;
    }
    if (req.query.lesson) {
      if (!LESSONS.includes(req.query.lesson)) return res.status(400).json({ success: false, message: 'Invalid attendance lesson.' });
      filter.lesson = req.query.lesson;
    }
    if (req.query.date) {
      const day = parseDateKey(req.query.date);
      if (!day) return res.status(400).json({ success: false, message: 'Invalid attendance date.' });
      filter.date = day;
    }
    if (req.query.month) {
      if (!/^\d{4}-\d{2}$/.test(req.query.month)) return res.status(400).json({ success: false, message: 'Invalid attendance month.' });
      const start = dateKeyAsUtcDate(`${req.query.month}-01`);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ success: false, message: 'Invalid attendance month.' });
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      filter.date = { $gte: start, $lt: end };
    }
    const records = await Attendance.find(filter)
      .sort({ date: -1, studentName: 1, shift: 1, lesson: 1 })
      .collation({ locale: 'en', strength: 2 });
    res.json({ success: true, data: records });
  }
  catch (error) { next(error); }
}

async function record(req, res, next) {
  try {
    const { studentId, shift, lesson } = req.body;
    if (!studentId || !shift || !lesson) return res.status(400).json({ success: false, message: 'Student, shift, and lesson are required.' });
    if (!SHIFTS.includes(shift)) return res.status(400).json({ success: false, message: 'Select a valid shift.' });
    if (!LESSONS.includes(lesson)) return res.status(400).json({ success: false, message: 'Select a valid lesson.' });
    const company = await CompanySettings.findOne({ key: 'default' }).select('timezone').lean();
    const dateKey = req.body.date || getLocalDateKey(new Date(), company?.timezone || 'Africa/Kigali');
    const day = parseDateKey(dateKey);
    if (!day) return res.status(400).json({ success: false, message: 'Invalid attendance date.' });
    const student = await Student.findOne({ _id: studentId, isActive: true }).lean();
    if (!student) return res.status(404).json({ success: false, message: 'Active student not found.' });
    const duplicate = await Attendance.exists({ studentId: student._id, date: day, shift, lesson });
    if (duplicate) return res.status(409).json({ success: false, message: 'This student already has attendance for that date, shift, and lesson.' });
    const record = await Attendance.create({
      studentId: student._id,
      studentName: student.fullName,
      telephone: student.phone,
      shift,
      lesson,
      date: day,
      status: 'present',
      checkIn: new Date(),
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'This student already has attendance for that date, shift, and lesson.' });
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const record = await Attendance.findOne({ _id: req.params.id, studentId: { $exists: true } });
    if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    const studentId = req.body.studentId || record.studentId;
    const student = await Student.findById(studentId).lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    const shift = req.body.shift ?? record.shift;
    const lesson = req.body.lesson ?? record.lesson;
    const day = req.body.date ? parseDateKey(req.body.date) : record.date;
    if (!SHIFTS.includes(shift)) return res.status(400).json({ success: false, message: 'Select a valid shift.' });
    if (!LESSONS.includes(lesson)) return res.status(400).json({ success: false, message: 'Select a valid lesson.' });
    if (!day) return res.status(400).json({ success: false, message: 'Invalid attendance date.' });
    const duplicate = await Attendance.exists({
      studentId: student._id,
      date: day,
      shift,
      lesson,
      _id: { $ne: record._id },
    });
    if (duplicate) return res.status(409).json({ success: false, message: 'This student already has attendance for that date, shift, and lesson.' });
    Object.assign(record, {
      studentId: student._id,
      studentName: student.fullName,
      telephone: student.phone,
      shift,
      lesson,
      date: day,
      editedAt: new Date(),
    });
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'This student already has attendance for that date, shift, and lesson.' });
    next(error);
  }
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const day = dateKeyAsUtcDate(value);
  return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value ? null : day;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { list, record, update };