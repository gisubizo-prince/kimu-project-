const nodemailer = require('nodemailer');

async function emailReport(req, res, next) {
  try {
    const { fileName, pdfBase64, reportType, period } = req.body;
    if (!fileName || !pdfBase64 || !reportType || !period) {
      return res.status(400).json({ success: false, message: 'Report file and details are required.' });
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
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: process.env.REPORT_RECIPIENT_EMAIL,
      subject: `METRIZE ${reportType} report - ${period}`,
      text: `Attached is the ${reportType} report for ${period}, sent by ${req.user.fullName}.`,
      attachments: [{ filename: fileName, content: pdf, contentType: 'application/pdf' }],
    });
    res.json({ success: true, message: `Report sent to ${process.env.REPORT_RECIPIENT_EMAIL}.` });
  } catch (error) { next(error); }
}

module.exports = { emailReport };
