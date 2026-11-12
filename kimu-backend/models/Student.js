const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    normalizedName: { type: String },
    phone: { type: String, required: true, trim: true },
    registrationDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index(
  { normalizedName: 1 },
  { unique: true, partialFilterExpression: { normalizedName: { $type: 'string' } } }
);
studentSchema.index({ fullName: 1 });
studentSchema.index({ phone: 1 });

module.exports = mongoose.model('Student', studentSchema);