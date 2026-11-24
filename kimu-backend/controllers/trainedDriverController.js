const TrainedDriver = require('../models/TrainedDriver');
const Student = require('../models/Student');
const DRIVER_STATUSES = ['Arimukazi', 'Yavuye mukazi', 'Ntarabona imodoka'];

async function list(req, res, next) {
  try {
    // Reconcile once on reads so students who passed before this feature existed are included too.
    const passedStudents = await Student.find({ status: 'pass' }).select('_id fullName phone').lean();
    await Promise.all(passedStudents.map((student) => TrainedDriver.findOneAndUpdate(
      { sourceStudentId: student._id },
      { $set: { fullName: student.fullName, phone: student.phone }, $setOnInsert: { startedAt: new Date() } },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )));
    const passedIds = passedStudents.map((student) => student._id);
    await TrainedDriver.deleteMany({ sourceStudentId: { $exists: true, $nin: passedIds } });
    const filter = {};
    if (req.query.search) filter.$or = [
      { fullName: { $regex: escapeRegex(req.query.search.trim()), $options: 'i' } },
      { phone: { $regex: escapeRegex(req.query.search.trim()), $options: 'i' } },
      { vehicle: { $regex: escapeRegex(req.query.search.trim()), $options: 'i' } },
    ];
    const drivers = await TrainedDriver.find(filter).sort({ startedAt: -1, fullName: 1 });
    res.json({ success: true, data: drivers });
  } catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const driver = await TrainedDriver.create({ fullName: req.body.fullName, phone: req.body.phone, vehicle: req.body.vehicle || '', startedAt: req.body.startedAt });
    res.status(201).json({ success: true, data: driver });
  } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const driver = await TrainedDriver.findOneAndUpdate({ _id: req.params.id, sourceStudentId: { $exists: false } }, {
      fullName: req.body.fullName, phone: req.body.phone, vehicle: req.body.vehicle || '', startedAt: req.body.startedAt,
    }, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Manual driver record not found.' });
    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
}

async function updateStatus(req, res, next) {
  try {
    const { status, description = '' } = req.body;
    if (!DRIVER_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Hitamo status yemewe.' });
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    if (status === 'Yavuye mukazi' && !cleanDescription) {
      return res.status(400).json({ success: false, message: 'Sobanura impamvu umushoferi yavuye mukazi.' });
    }
    const driver = await TrainedDriver.findByIdAndUpdate(req.params.id, {
      status, statusDescription: status === 'Yavuye mukazi' ? cleanDescription : '',
    }, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Umushoferi ntabonetse.' });
    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    const driver = await TrainedDriver.findOneAndDelete({ _id: req.params.id, sourceStudentId: { $exists: false } });
    if (!driver) return res.status(404).json({ success: false, message: 'Manual driver record not found.' });
    res.json({ success: true, message: 'Driver record deleted.' });
  } catch (error) { next(error); }
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = { list, create, update, updateStatus, remove };
