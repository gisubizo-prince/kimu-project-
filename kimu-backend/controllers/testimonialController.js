const Testimonial = require('../models/Testimonial');

async function listPublished(req, res, next) {
  try {
    const testimonials = await Testimonial.find({ isPublished: true })
      .select('fullName role message image createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: testimonials });
  } catch (error) {
    next(error);
  }
}

async function listAll(req, res, next) {
  try {
    const testimonials = await Testimonial.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: testimonials });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const fullName = normalizeText(req.body?.fullName, 120);
    const role = normalizeText(req.body?.role, 80) || 'MAITRISE student';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const image = typeof req.body?.image === 'string' ? req.body.image : '';

    if (!fullName || !message || !image) {
      return res.status(400).json({ success: false, message: 'Please provide the student name, portrait, and testimonial message.' });
    }
    if (message.length > 1200) {
      return res.status(400).json({ success: false, message: 'Testimonial messages must be 1,200 characters or fewer.' });
    }

    const imageMatch = image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!imageMatch) {
      return res.status(400).json({ success: false, message: 'Upload a valid JPEG, PNG, or WebP portrait image.' });
    }

    const imageBytes = Buffer.from(imageMatch[2], 'base64');
    if (imageBytes.length > 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'The optimized portrait must be smaller than 1 MB.' });
    }

    const testimonial = await Testimonial.create({ fullName, role, message, image });
    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found.' });
    }
    res.json({ success: true, message: 'Testimonial removed successfully.' });
  } catch (error) {
    next(error);
  }
}

function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

module.exports = { listPublished, listAll, create, remove };
