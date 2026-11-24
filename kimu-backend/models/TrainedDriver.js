const mongoose = require('mongoose');

const trainedDriverSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  vehicle: { type: String, trim: true, maxlength: 120, default: '' },
  startedAt: { type: Date, required: true, default: Date.now },
  sourceStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', unique: true, sparse: true },
}, { timestamps: true });

trainedDriverSchema.index({ fullName: 1 });
module.exports = mongoose.model('TrainedDriver', trainedDriverSchema);
