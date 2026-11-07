const crypto = require('crypto');
const Student = require('../models/Student');

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
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;
    const students = await Student.find(filter).sort({ registrationDate: -1, fullName: 1 });
    res.json({ success: true, data: students });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const student = await Student.create({
      fullName: req.body.fullName,
      phone: req.body.phone,
      registrationNumber: createRegistrationNumber(),
    });
    res.status(201).json({ success: true, data: student });
  } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const updates = {};
    for (const field of ['fullName', 'phone', 'registrationDate']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (error) { next(error); }
}

async function setStatus(req, res, next) {
  try {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Student status must be active or inactive.' });
    }
    const student = await Student.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (error) { next(error); }
}

function createRegistrationNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `MTR-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { list, create, update, setStatus };