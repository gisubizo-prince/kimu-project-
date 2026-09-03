const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    reason: { type: String, required: true, trim: true },
    checkIn: { type: Date, default: Date.now },
    checkOut: Date,
    status: { type: String, enum: ['checked_in', 'checked_out'], default: 'checked_in' },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Visitor', visitorSchema);