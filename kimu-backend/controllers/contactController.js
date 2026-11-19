const Contact = require('../models/Contact');

async function submit(req, res, next) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const fullName = normalizeText(body.fullName, 120);
    const phone = normalizeText(body.phone, 40);
    const email = normalizeText(body.email, 254).toLowerCase();
    const interest = normalizeText(body.interest, 100);
    const experience = normalizeText(body.experience, 100);
    const contactMethod = normalizeText(body.contactMethod, 20);

    if (!fullName || !phone || !interest || !experience) {
      return res.status(400).json({ success: false, message: 'Please provide your name, telephone number, training interest, and driving experience.' });
    }
    if (
      (typeof body.fullName === 'string' && body.fullName.length > 120)
      || (typeof body.phone === 'string' && body.phone.length > 40)
      || (typeof body.email === 'string' && body.email.length > 254)
    ) {
      return res.status(400).json({ success: false, message: 'One or more contact fields exceed the allowed length.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!['Telephone', 'Email', 'WhatsApp'].includes(contactMethod)) {
      return res.status(400).json({ success: false, message: 'Please select a valid preferred contact method.' });
    }

    const contact = await Contact.create({ fullName, phone, email, interest, experience, contactMethod });
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const filter = {};
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const search = escapeRegex(req.query.search.trim());
      filter.$or = ['fullName', 'phone', 'email', 'interest', 'experience', 'contactMethod']
        .map((field) => ({ [field]: { $regex: search, $options: 'i' } }));
    }

    const contacts = await Contact.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
}

function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { submit, list };
