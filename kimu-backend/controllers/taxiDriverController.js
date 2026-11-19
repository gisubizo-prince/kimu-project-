const TaxiDriver = require('../models/TaxiDriver');

const fields = 'fullName phone bio experienceYears languages location car profileImage carImages isPublished createdAt updatedAt';

async function listPublished(req, res, next) {
  try {
    const drivers = await TaxiDriver.find({ isPublished: true }).select(fields).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: drivers });
  } catch (error) { next(error); }
}

async function getPublished(req, res, next) {
  try {
    const driver = await TaxiDriver.findOne({ _id: req.params.id, isPublished: true }).select(fields).lean();
    if (!driver) return res.status(404).json({ success: false, message: 'Taxi driver not found.' });
    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
}

async function listAll(req, res, next) {
  try {
    const drivers = await TaxiDriver.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: drivers });
  } catch (error) { next(error); }
}

function cleanImage(image) {
  if (typeof image !== 'string') return '';
  const match = image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || Buffer.from(match[2], 'base64').length > 1024 * 1024) return null;
  return image;
}

function cleanPayload(body = {}) {
  const profileImage = cleanImage(body.profileImage);
  const carImages = Array.isArray(body.carImages) ? body.carImages.map(cleanImage) : [];
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const car = body.car || {};
  const make = typeof car.make === 'string' ? car.make.trim() : '';
  const model = typeof car.model === 'string' ? car.model.trim() : '';
  const experienceYears = Number(body.experienceYears || 0);
  if (!fullName || !phone || !make || !model || !profileImage || carImages.some((image) => !image) || carImages.length > 6 || !Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 60) return null;
  return {
    fullName: fullName.slice(0, 120), phone: phone.slice(0, 30),
    bio: typeof body.bio === 'string' ? body.bio.trim().slice(0, 1200) : '',
    experienceYears,
    languages: Array.isArray(body.languages) ? body.languages.map((v) => String(v).trim()).filter(Boolean).slice(0, 8) : [],
    location: (typeof body.location === 'string' && body.location.trim() ? body.location.trim() : 'Kigali, Rwanda').slice(0, 120),
    car: { make: make.slice(0, 60), model: model.slice(0, 60), year: Number(car.year) || undefined, color: String(car.color || '').trim().slice(0, 40), plateNumber: String(car.plateNumber || '').trim().toUpperCase().slice(0, 20), type: String(car.type || 'Taxi').trim().slice(0, 60) },
    profileImage, carImages, isPublished: body.isPublished !== false,
  };
}

async function create(req, res, next) {
  try {
    const payload = cleanPayload(req.body);
    if (!payload) return res.status(400).json({ success: false, message: 'Add a valid driver profile, phone, car details, portrait and up to six optimized car photos.' });
    const driver = await TaxiDriver.create(payload);
    res.status(201).json({ success: true, data: driver });
  } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const payload = cleanPayload(req.body);
    if (!payload) return res.status(400).json({ success: false, message: 'Please complete the required driver and vehicle details with valid images.' });
    const driver = await TaxiDriver.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Taxi driver not found.' });
    res.json({ success: true, data: driver });
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    const driver = await TaxiDriver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Taxi driver not found.' });
    res.json({ success: true, message: 'Taxi driver removed.' });
  } catch (error) { next(error); }
}

module.exports = { listPublished, getPublished, listAll, create, update, remove };
