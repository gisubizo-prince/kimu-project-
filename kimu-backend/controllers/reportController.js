const nodemailer = require('nodemailer');

async function emailReport(req, res, next) {
  try {
    const { fileName, pdfBase64, reportType, period } = req.body;
    if (!fileName || !pdfBase64 || !reportType || !period) {
      return res.status(400).json({ success: false, message: 'Report file and details are required.' });
    }

    if (typeof pdfBase64 !== 'string' || pdfBase64.length > 11 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: 'Report PDF exceeds the 8 MB limit.' });
    }
    if (typeof fileName !== 'string' || fileName.length > 120 || typeof reportType !== 'string' || reportType.length > 80 || typeof period !== 'string' || period.length > 80) {
      return res.status(400).json({ success: false, message: 'Report metadata is invalid.' });
    }
    if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD || !process.env.REPORT_RECIPIENT_EMAIL) {
      return res.status(503).json({ success: false, message: 'Email delivery is not configured on the server.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === 'true',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
    });
    const pdf = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
    if (pdf.length < 10 || pdf.length > 8 * 1024 * 1024 || pdf.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) < 0 || pdf.subarray(-1024).indexOf(Buffer.from('%%EOF')) < 0) {
      return res.status(pdf.length > 8 * 1024 * 1024 ? 413 : 400).json({ success: false, message: 'A valid PDF of no more than 8 MB is required.' });
    }
    const safeFileName = fileName.replace(/[\\/\r\n\0"<>:|?*]/g, '_').slice(0, 120) || 'report.pdf';
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: process.env.REPORT_RECIPIENT_EMAIL,
      subject: `METRIZE ${reportType} report - ${period}`,
      text: `Attached is the ${reportType} report for ${period}, sent by ${req.user.fullName}.`,
      attachments: [{ filename: safeFileName.toLowerCase().endsWith('.pdf') ? safeFileName : `${safeFileName}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
    res.json({ success: true, message: `Report sent to ${process.env.REPORT_RECIPIENT_EMAIL}.` });
  } catch (error) { next(error); }
}

module.exports = { emailReport };
