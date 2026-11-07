const mongoose = require('mongoose');

const CAR_NAMES = ['Levin 1', 'Levin 2', 'Dongfeng'];
const CAR_PLATES = ['RAI631P', 'RAK165B', 'RAJ016W'];
const CONDITIONS = ['Good', 'Fair', 'Problem'];

const carSchema = new mongoose.Schema({
  car: { type: String, enum: CAR_NAMES, required: true },
  plate: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Used', 'Not used'], required: true },
  teacher: { type: String, trim: true, default: null },
  km_start: { type: Number, default: null, min: 0 },
  km_end: { type: Number, default: null, min: 0 },
  km_used: { type: Number, default: 0, min: 0 },
  condition_start: { type: String, enum: [...CONDITIONS, null], default: null },
  condition_end: { type: String, enum: [...CONDITIONS, null], default: null },
  start_time: { type: String, default: null },
  end_time: { type: String, default: null },
  hours_worked: { type: Number, default: 0, min: 0 },
  problem_details: { type: String, trim: true, default: '' },
}, { _id: false });

const reportSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  class_group: { type: String, required: true, trim: true },
  students: {
    attended: { type: Number, required: true, min: 0 },
    missed: { type: Number, required: true, min: 0 },
    total_registered: { type: Number, required: true, min: 0 },
  },
  cars: {
    type: [carSchema],
    required: true,
    validate: {
      validator: (cars) => cars.length === CAR_NAMES.length && cars.every((car, index) => car.car === CAR_NAMES[index]),
      message: 'A report must include Levin 1, Levin 2, and Dongfeng in order.',
    },
  },
  totals: {
    km_used: { type: Number, required: true, min: 0 },
    hours_worked: { type: Number, required: true, min: 0 },
  },
  ikitonderwa: { type: String, required: true, trim: true },
  reported_by: { type: String, required: true, trim: true },
  signatures: {
    prepared_by: { type: String, default: 'JEAN' },
    verified_by: { type: String, default: 'AGNES' },
    approved_by: { type: String, default: 'CEO NKUNZIRYAYO JEAN PIERRE' },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'maitizereports' });

reportSchema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.model('MaitriseReport', reportSchema);
module.exports.CAR_NAMES = CAR_NAMES;
module.exports.CAR_PLATES = CAR_PLATES;
module.exports.CONDITIONS = CONDITIONS;