const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    interest: { type: String, required: true, trim: true, maxlength: 100 },
    experience: { type: String, required: true, trim: true, maxlength: 100 },
    contactMethod: { type: String, required: true, enum: ['Telephone', 'Email', 'WhatsApp'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);
