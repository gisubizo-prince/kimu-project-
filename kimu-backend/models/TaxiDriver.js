const mongoose = require('mongoose');

const taxiDriverSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  bio: { type: String, trim: true, maxlength: 1200, default: '' },
  experienceYears: { type: Number, min: 0, max: 60, default: 0 },
  languages: { type: [String], default: [] },
  location: { type: String, trim: true, maxlength: 120, default: 'Kigali, Rwanda' },
  car: {
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: Number, min: 1980, max: 2100 },
    color: { type: String, trim: true, maxlength: 40, default: '' },
    plateNumber: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    type: { type: String, trim: true, maxlength: 60, default: 'Taxi' },
  },
  profileImage: { type: String, required: true, maxlength: 1400000 },
  carImages: { type: [String], default: [] },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TaxiDriver', taxiDriverSchema);
