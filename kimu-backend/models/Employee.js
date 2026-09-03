const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    employeeNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ fullName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Employee', employeeSchema);