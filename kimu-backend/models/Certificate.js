const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  verificationToken: { type: String, unique: true, sparse: true },
  studentName: { type: String, required: true, trim: true, maxlength: 200 },
  course: { type: String, required: true, trim: true, maxlength: 250 },
  institution: { type: String, required: true, trim: true, maxlength: 250 },
  issueDate: { type: Date, required: true },
  graduationDate: { type: Date, default: null },
  department: { type: String, default: '' },
  academicYear: { type: String, default: '' },
  notes: { type: String, default: '', maxlength: 2000 },
  status: { type: String, enum: ['valid', 'revoked'], default: 'valid', index: true },
  revokedAt: { type: Date, default: null },
  revocationReason: { type: String, default: '' },
  // `pdfBase64` remains optional for legacy records; new uploads use private file keys.
  pdfBase64: { type: String, select: false },
  originalStorageKey: { type: String, default: '' },
  printableStorageKey: { type: String, default: '' },
  pdfOriginalFilename: { type: String, required: true },
  pdfChecksum: { type: String, required: true },
  pdfSize: { type: Number, default: 0 },
  pdfFinalChecksum: { type: String, default: '' },
  pdfFinalSize: { type: Number, default: 0 },
  pdfQrPage: { type: Number, default: null },
  pdfQrCorner: { type: String, default: '' },
  archivedAt: { type: Date, default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

certificateSchema.index({ studentName: 1 });
module.exports = mongoose.model('Certificate', certificateSchema);
