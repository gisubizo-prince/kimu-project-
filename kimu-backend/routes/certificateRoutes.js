const express = require('express');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const storage = require('../services/certificateStorage');
const { createQrPng, createQrSvg, createPrintablePdf } = require('../services/certificatePdf');
const { publicVerificationLimit } = require('../middleware/rateLimit');
const publicAppOrigin = require('../config/publicAppOrigin');

const router = express.Router();
const clean = (v) => String(v || '').trim().replace(/[\x00-\x1f\x7f]/g, '');
const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const publicVerificationUrl = (identifier) => `${publicAppOrigin()}/verify-certificate/${encodeURIComponent(identifier)}`;
const verificationUrl = (certificate) => publicVerificationUrl(certificate.verificationToken || certificate.certificateId);
const view = (doc) => ({
  certificateId: doc.certificateId, studentName: doc.studentName, course: doc.course,
  institution: doc.institution, issueDate: doc.issueDate, graduationDate: doc.graduationDate,
  department: doc.department, academicYear: doc.academicYear, notes: doc.notes,
  status: doc.status, revokedAt: doc.revokedAt, revocationReason: doc.revocationReason, pdfOriginalFilename: doc.pdfOriginalFilename,
  pdfChecksum: doc.pdfChecksum, pdfSize: doc.pdfSize, pdfFinalChecksum: doc.pdfFinalChecksum,
  pdfFinalSize: doc.pdfFinalSize, pdfQrPage: doc.pdfQrPage, pdfQrCorner: doc.pdfQrCorner,
  hasPrintablePdf: Boolean(doc.printableStorageKey), archivedAt: doc.archivedAt, verificationUrl: verificationUrl(doc),
  createdAt: doc.createdAt, updatedAt: doc.updatedAt,
});
function pdfError(message, status = 422) { return Object.assign(new Error(message), { status }); }
function validatePdfBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 10 || bytes.length > 10 * 1024 * 1024) throw pdfError('PDF must be between 10 bytes and 10 MB.', bytes?.length > 10 * 1024 * 1024 ? 413 : 400);
  if (bytes.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) < 0 || bytes.subarray(-1024).indexOf(Buffer.from('%%EOF')) < 0) throw pdfError('The uploaded file does not look like a PDF.', 400);
  if (bytes.toString('latin1').includes('/ByteRange')) throw pdfError('Digitally signed PDFs cannot be modified to add a verification QR code.', 422);
}
async function readOriginalPdf(certificate) {
  if (certificate.originalStorageKey) return storage.get(certificate.originalStorageKey);
  if (certificate.pdfBase64) return Buffer.from(certificate.pdfBase64, 'base64');
  throw pdfError('The original PDF is unavailable.', 404);
}
async function storePdfPair(originalBytes, url) {
  const originalKey = storage.createKey('original');
  const printableKey = storage.createKey('printable');
  const printable = await createPrintablePdf(originalBytes, url);
  await storage.put(originalKey, originalBytes);
  try { await storage.put(printableKey, printable.bytes); }
  catch (error) { await storage.remove(originalKey).catch(() => {}); throw error; }
  return {
    originalKey, printableKey, printableBytes: printable.bytes,
    pdfChecksum: storage.checksum(originalBytes), pdfSize: originalBytes.length,
    pdfFinalChecksum: storage.checksum(printable.bytes), pdfFinalSize: printable.bytes.length,
    pdfQrPage: printable.page, pdfQrCorner: printable.corner,
  };
}
async function removePair(originalKey, printableKey) {
  await Promise.all([storage.remove(originalKey).catch(() => {}), storage.remove(printableKey).catch(() => {})]);
}
async function audit(req, action, certificate, details = {}) {
  try { await AuditLog.create({ user: req.user?._id, action, entity: 'certificate', recordId: certificate.certificateId, details }); } catch (error) { console.error('Certificate audit log failed:', error.message); }
}

function findVerificationCertificate(supplied, allowCertificateId) {
  const byId = { certificateId: supplied.toUpperCase() };
  if (!allowCertificateId) byId.verificationToken = { $exists: false };
  return Certificate.findOne({ archivedAt: null, $or: [{ verificationToken: supplied }, byId] });
}
const verificationHandler = (allowCertificateId) => async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const certificate = await findVerificationCertificate(clean(req.params.id), allowCertificateId);
    if (!certificate) return res.status(404).json({ success: false, code: 'CERTIFICATE_NOT_FOUND', message: 'Certificate not found.' });
    const pdfAllowed = Boolean(certificate.printableStorageKey) && (certificate.status !== 'revoked' || process.env.ALLOW_PUBLIC_PDF_WHEN_REVOKED === 'true');
    res.json({ success: true, certificate: { certificateId: certificate.certificateId, studentName: certificate.studentName,
      course: certificate.course, institution: certificate.institution, issueDate: certificate.issueDate,
      graduationDate: certificate.graduationDate, academicYear: certificate.academicYear,
      status: certificate.status, revokedAt: certificate.revokedAt, pdfAvailable: pdfAllowed } });
  } catch (error) { next(error); }
};
const verificationPdfHandler = (allowCertificateId) => async (req, res, next) => {
  try {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    const certificate = await findVerificationCertificate(clean(req.params.id), allowCertificateId);
    if (!certificate || !certificate.printableStorageKey) return res.status(404).json({ success: false, code: 'CERTIFICATE_PDF_UNAVAILABLE', message: 'Printable certificate PDF is unavailable.' });
    if (certificate.status === 'revoked' && process.env.ALLOW_PUBLIC_PDF_WHEN_REVOKED !== 'true') return res.status(404).json({ success: false, code: 'CERTIFICATE_PDF_UNAVAILABLE', message: 'Printable certificate PDF is unavailable.' });
    const download = req.query.download === '1';
    if (download && process.env.ALLOW_PUBLIC_DOWNLOAD === 'false') return res.status(403).json({ success: false, code: 'DOWNLOAD_DISABLED', message: 'Certificate downloads are disabled.' });
    const bytes = await storage.get(certificate.printableStorageKey);
    res.type('application/pdf').set('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="certificate-${certificate.certificateId}-verified.pdf"`).send(bytes);
  } catch (error) { next(error); }
};
router.get('/verify/:id', publicVerificationLimit, verificationHandler(false));
router.get('/verify/:id/pdf', publicVerificationLimit, verificationPdfHandler(false));
router.get('/verify-legacy/:id', publicVerificationLimit, verificationHandler(true));
router.get('/verify-legacy/:id/pdf', publicVerificationLimit, verificationPdfHandler(true));

router.use(protect, authorize('super_admin', 'admin'));
router.get('/stats', async (req, res, next) => {
  try {
    const active = { archivedAt: null };
    const [total, valid, revoked, recent] = await Promise.all([
      Certificate.countDocuments(active), Certificate.countDocuments({ ...active, status: 'valid' }),
      Certificate.countDocuments({ ...active, status: 'revoked' }), Certificate.find(active).sort({ createdAt: -1 }).limit(5),
    ]);
    res.json({ success: true, data: { total, valid, revoked, recent: recent.map(view) } });
  } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try {
    const q = clean(req.query.q);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = { archivedAt: null };
    if (['valid', 'revoked'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.issueFrom && /^\d{4}-\d{2}-\d{2}$/.test(req.query.issueFrom)) filter.issueDate = { ...filter.issueDate, $gte: new Date(`${req.query.issueFrom}T00:00:00.000Z`) };
    if (req.query.issueTo && /^\d{4}-\d{2}-\d{2}$/.test(req.query.issueTo)) filter.issueDate = { ...filter.issueDate, $lte: new Date(`${req.query.issueTo}T23:59:59.999Z`) };
    if (q) filter.$or = [{ certificateId: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { studentName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { course: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
    const [items, total] = await Promise.all([Certificate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Certificate.countDocuments(filter)]);
    res.json({ success: true, data: { items: items.map(view), page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const { studentName, course, institution, issueDate, graduationDate, department, academicYear, notes } = body;
    if (!clean(studentName) || !clean(course) || !clean(institution) || !isDateOnly(issueDate)) return res.status(400).json({ success: false, message: 'Student name, course, institution and a valid issue date are required.' });
    const raw = String(body.pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '');
    if (!body.pdf || !String(body.pdf).toLowerCase().endsWith('.pdf') || !raw) return res.status(400).json({ success: false, message: 'Choose a PDF file.' });
    const bytes = Buffer.from(raw, 'base64');
    validatePdfBytes(bytes);
    const duplicate = await Certificate.findOne({ archivedAt: null, studentName: new RegExp(`^${clean(studentName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), course: new RegExp(`^${clean(course).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), issueDate: new Date(`${issueDate}T00:00:00.000Z`) });
    if (duplicate && body.confirmDuplicate !== true) return res.status(409).json({ success: false, code: 'POSSIBLE_DUPLICATE', message: 'A certificate with this student, course and issue date already exists.' });
    const suppliedId = clean(body.certificateNumber).toUpperCase();
    if (suppliedId && !/^[A-Z0-9][A-Z0-9._-]{2,63}$/.test(suppliedId)) return res.status(400).json({ success: false, message: 'Certificate number must be 3 to 64 letters, numbers, dots, underscores or hyphens.' });
    const certificateId = suppliedId || `CERT-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    if (await Certificate.exists({ certificateId })) return res.status(409).json({ success: false, code: 'CERTIFICATE_NUMBER_EXISTS', message: 'That certificate number is already in use.' });
    const token = crypto.randomBytes(32).toString('base64url');
    const files = await storePdfPair(bytes, publicVerificationUrl(token));
    let certificate;
    try {
      certificate = await Certificate.create({
        certificateId, verificationToken: token, studentName: clean(studentName), course: clean(course), institution: clean(institution),
        issueDate, graduationDate: graduationDate || null, department: clean(department), academicYear: clean(academicYear), notes: clean(notes),
        originalStorageKey: files.originalKey, printableStorageKey: files.printableKey,
        pdfOriginalFilename: clean(body.pdf).replace(/[\\/]/g, '_'), pdfChecksum: files.pdfChecksum,
        pdfSize: files.pdfSize, pdfFinalChecksum: files.pdfFinalChecksum, pdfFinalSize: files.pdfFinalSize,
        pdfQrPage: files.pdfQrPage, pdfQrCorner: files.pdfQrCorner, createdBy: req.user?._id,
      });
    } catch (error) {
      await removePair(files.originalKey, files.printableKey);
      throw error;
    }
    await audit(req, 'create', certificate);
    res.status(201).json({ success: true, data: view(certificate) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, code: 'CERTIFICATE_NUMBER_EXISTS', message: 'That certificate number is already in use.' });
    next(error);
  }
});
router.patch('/:id/status', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!['valid', 'revoked'].includes(body.status)) return res.status(400).json({ success: false, message: 'Status must be valid or revoked.' });
    if (body.status === 'revoked' && clean(body.reason).length < 3) return res.status(400).json({ success: false, message: 'Provide a revocation reason.' });
    const certificate = await Certificate.findOneAndUpdate({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }, { status: body.status, revokedAt: body.status === 'revoked' ? new Date() : null, revocationReason: body.status === 'revoked' ? clean(body.reason) : '' }, { new: true, runValidators: true });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    await audit(req, body.status === 'revoked' ? 'revoke' : 'restore', certificate, { reason: certificate.revocationReason });
    res.json({ success: true, data: view(certificate) });
  } catch (error) { next(error); }
});
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }).select('+pdfBase64');
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    const bytes = await readOriginalPdf(certificate);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).type('application/pdf').attachment(certificate.pdfOriginalFilename).send(bytes);
  } catch (error) { next(error); }
});
router.get('/:id/original-pdf', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }).select('+pdfBase64');
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    const bytes = await readOriginalPdf(certificate);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).type('application/pdf').attachment(certificate.pdfOriginalFilename).send(bytes);
  } catch (error) { next(error); }
});
router.get('/:id/printable-pdf', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    if (!certificate.printableStorageKey) return res.status(404).json({ success: false, message: 'Printable PDF has not been generated yet.' });
    const bytes = await storage.get(certificate.printableStorageKey);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).type('application/pdf').attachment(`certificate-${certificate.certificateId}-verified.pdf`).send(bytes);
  } catch (error) { next(error); }
});
router.get('/:id/qr', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    const format = req.query.format === 'svg' ? 'svg' : 'png';
    const bytes = format === 'svg' ? await createQrSvg(verificationUrl(certificate)) : await createQrPng(verificationUrl(certificate));
    res.set('Cache-Control', 'private, no-store').type(format === 'svg' ? 'image/svg+xml' : 'image/png');
    if (req.query.download === '1') res.attachment(`certificate-${certificate.certificateId}-qr.${format}`);
    res.send(bytes);
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    res.json({ success: true, data: view(certificate) });
  } catch (error) { next(error); }
});
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = ['studentName', 'course', 'institution', 'issueDate', 'graduationDate', 'department', 'academicYear', 'notes'];
    const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => fields.includes(key)));
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'Provide certificate metadata to update.' });
    for (const key of Object.keys(update)) if (typeof update[key] === 'string') update[key] = clean(update[key]);
    if (update.graduationDate === '') update.graduationDate = null;
    if (update.issueDate && !isDateOnly(update.issueDate)) return res.status(400).json({ success: false, message: 'Issue date is not a real calendar date.' });
    const certificate = await Certificate.findOneAndUpdate({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }, update, { new: true, runValidators: true });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    await audit(req, 'update', certificate, { fields: Object.keys(update) });
    res.json({ success: true, data: view(certificate) });
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.query.confirm !== 'true') return res.status(400).json({ success: false, message: 'Confirm archival with confirm=true.' });
    const certificate = await Certificate.findOneAndUpdate({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }, { archivedAt: new Date() }, { new: true });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    await audit(req, 'archive', certificate);
    res.json({ success: true, data: { ok: true } });
  } catch (error) { next(error); }
});
router.get('/:id/audit', async (req, res, next) => {
  try {
    const rows = await AuditLog.find({ entity: 'certificate', recordId: clean(req.params.id).toUpperCase() }).sort({ createdAt: -1 }).limit(100).populate('user', 'fullName email').lean();
    res.json({ success: true, data: rows.map((row) => ({ action: row.action, actor: row.user?.fullName || row.user?.email || 'Staff', details: row.details || {}, createdAt: row.createdAt })) });
  } catch (error) { next(error); }
});
router.post('/:id/pdf/regenerate', async (req, res, next) => {
  let newOriginalKey = '';
  let newPrintableKey = '';
  try {
    const certificate = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }).select('+pdfBase64');
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    const originalBytes = await readOriginalPdf(certificate);
    validatePdfBytes(originalBytes);
    const originalKey = certificate.originalStorageKey || storage.createKey('original');
    if (!certificate.originalStorageKey) {
      newOriginalKey = originalKey;
      await storage.put(originalKey, originalBytes);
    }
    const printable = await createPrintablePdf(originalBytes, verificationUrl(certificate));
    newPrintableKey = storage.createKey('printable');
    await storage.put(newPrintableKey, printable.bytes);
    const updated = await Certificate.findOneAndUpdate(
      { _id: certificate._id, archivedAt: null },
      { $set: {
        originalStorageKey: originalKey, printableStorageKey: newPrintableKey,
        pdfChecksum: storage.checksum(originalBytes), pdfSize: originalBytes.length,
        pdfFinalChecksum: storage.checksum(printable.bytes), pdfFinalSize: printable.bytes.length,
        pdfQrPage: printable.page, pdfQrCorner: printable.corner,
      }, $unset: { pdfBase64: 1 } },
      { new: true, runValidators: true }
    );
    if (!updated) throw pdfError('Certificate was archived before regeneration completed.', 409);
    await storage.remove(certificate.printableStorageKey).catch(() => {});
    await audit(req, 'regenerate_pdf', updated, { pdfFinalChecksum: updated.pdfFinalChecksum });
    res.json({ success: true, data: view(updated) });
  } catch (error) {
    await removePair(newOriginalKey, newPrintableKey);
    next(error);
  }
});
router.post('/:id/pdf', async (req, res, next) => {
  let files;
  try {
    const body = req.body || {};
    if (body.confirm !== true) return res.status(400).json({ success: false, message: 'Confirm PDF replacement.' });
    const raw = String(body.pdfBase64 || '');
    const bytes = Buffer.from(raw, 'base64');
    const filename = clean(body.pdf || '');
    if (!filename.toLowerCase().endsWith('.pdf')) return res.status(400).json({ success: false, message: 'Choose a PDF file.' });
    validatePdfBytes(bytes);
    const existing = await Certificate.findOne({ certificateId: clean(req.params.id).toUpperCase(), archivedAt: null }).select('+pdfBase64');
    if (!existing) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    files = await storePdfPair(bytes, verificationUrl(existing));
    const certificate = await Certificate.findOneAndUpdate({ _id: existing._id, archivedAt: null }, {
      $set: {
        originalStorageKey: files.originalKey, printableStorageKey: files.printableKey,
        pdfOriginalFilename: filename.replace(/[\\/]/g, '_'), pdfChecksum: files.pdfChecksum, pdfSize: files.pdfSize,
        pdfFinalChecksum: files.pdfFinalChecksum, pdfFinalSize: files.pdfFinalSize,
        pdfQrPage: files.pdfQrPage, pdfQrCorner: files.pdfQrCorner,
      }, $unset: { pdfBase64: 1 },
    }, { new: true, runValidators: true });
    if (!certificate) {
      await removePair(files.originalKey, files.printableKey);
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    await removePair(existing.originalStorageKey, existing.printableStorageKey);
    await audit(req, 'replace_pdf', certificate, { filename: certificate.pdfOriginalFilename, checksum: certificate.pdfChecksum });
    res.json({ success: true, data: view(certificate) });
  } catch (error) {
    if (files) await removePair(files.originalKey, files.printableKey);
    next(error);
  }
});
module.exports = router;
