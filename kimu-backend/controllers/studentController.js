const crypto = require('crypto');
const Student = require('../models/Student');
const TrainedDriver = require('../models/TrainedDriver');
const { getLocalDateKey } = require('../utils/localTime');

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { fullName: { $regex: escapeRegex(search), $options: 'i' } },
        { phone: { $regex: escapeRegex(search), $options: 'i' } },
        { registrationNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (req.query.status) {
      if (!STUDENT_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Select a valid student status.' });
      }
      filter.status = req.query.status;
    }
    const students = await Student.find(filter)
      .sort({ fullName: 1 })
      .collation({ locale: 'en', strength: 2 });
    res.json({ success: true, data: students });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const fullName = normalizeName(req.body.fullName);
    if (!fullName) return res.status(400).json({ success: false, message: 'Student name is required.' });
    const existing = await Student.findOne({ fullName: namePattern(fullName) });
    if (existing) return res.status(409).json({ success: false, message: `${fullName} is already registered.` });
    const student = await Student.create({
      fullName,
      normalizedName: normalizeNameKey(fullName),
      phone: req.body.phone,
      registrationNumber: createRegistrationNumber(),
      status: 'trainee',
    });
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.normalizedName) {
      return res.status(409).json({ success: false, message: 'This student name is already registered.' });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const updates = {};
    if (req.body.fullName !== undefined) {
      updates.fullName = normalizeName(req.body.fullName);
      if (!updates.fullName) return res.status(400).json({ success: false, message: 'Student name is required.' });
      updates.normalizedName = normalizeNameKey(updates.fullName);
      const existing = await Student.findOne({
        _id: { $ne: req.params.id },
        fullName: namePattern(updates.fullName),
      });
      if (existing) return res.status(409).json({ success: false, message: `${updates.fullName} is already registered.` });
    }
    for (const field of ['phone', 'registrationDate']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (student.status === 'pass') {
      await TrainedDriver.updateOne({ sourceStudentId: student._id }, { $set: { fullName: student.fullName, phone: student.phone } });
    }
    res.json({ success: true, data: student });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.normalizedName) {
      return res.status(409).json({ success: false, message: 'This student name is already registered.' });
    }
    next(error);
  }
}

async function setStatus(req, res, next) {
  try {
    if (!STUDENT_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Select a valid student status.' });
    }
    const student = await Student.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (student.status === 'pass') {
      await TrainedDriver.findOneAndUpdate(
        { sourceStudentId: student._id },
        { $set: { fullName: student.fullName, phone: student.phone }, $setOnInsert: { startedAt: new Date() } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    } else {
      await TrainedDriver.deleteOne({ sourceStudentId: student._id });
    }
    res.json({ success: true, data: student });
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    await TrainedDriver.deleteOne({ sourceStudentId: student._id });
    res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (error) { next(error); }
}

const STUDENT_STATUSES = ['trainee', 'pass', 'repeat'];

function createRegistrationNumber() {
  const date = getLocalDateKey().replace(/-/g, '');
  return `MTR-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function normalizeNameKey(value) {
  return normalizeName(value).toLocaleLowerCase('en');
}

function namePattern(value) {
  const words = value.split(' ').map(escapeRegex);
  return { $regex: `^\\s*${words.join('\\s+')}\\s*$`, $options: 'i' };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { list, create, update, setStatus, remove };
