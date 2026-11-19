const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 80, default: 'MAITRISE student' },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    image: { type: String, required: true, maxlength: 1400000 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Testimonial', testimonialSchema);
