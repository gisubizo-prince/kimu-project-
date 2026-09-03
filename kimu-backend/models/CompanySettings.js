const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    companyName: { type: String, default: 'Kimu Transport' },
    logo: String,
    phone: String,
    email: String,
    address: String,
    currency: { type: String, default: 'RWF' },
    timezone: { type: String, default: 'Africa/Kigali' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
  },
  { timestamps: true }
);
module.exports = mongoose.model('CompanySettings', companySettingsSchema);