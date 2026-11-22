const QRCode = require('qrcode');
const { PDFDocument, rgb } = require('pdf-lib');

const MM_TO_POINTS = 72 / 25.4;
const CORNERS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

function getPlacement(pageCount) {
  const page = Number.parseInt(process.env.PDF_QR_PAGE || '1', 10);
  const sizeMm = Number.parseFloat(process.env.PDF_QR_SIZE_MM || '28');
  const marginMm = Number.parseFloat(process.env.PDF_QR_MARGIN_MM || '10');
  const corner = process.env.PDF_QR_CORNER || 'bottom-right';
  if (!Number.isInteger(page) || page < 1 || page > pageCount) throw Object.assign(new Error(`PDF_QR_PAGE must be between 1 and ${pageCount}.`), { status: 400 });
  if (!Number.isFinite(sizeMm) || sizeMm < 18 || sizeMm > 60) throw Object.assign(new Error('PDF_QR_SIZE_MM must be between 18 and 60.'), { status: 400 });
  if (!Number.isFinite(marginMm) || marginMm < 0 || marginMm > 100) throw Object.assign(new Error('PDF_QR_MARGIN_MM must be between 0 and 100.'), { status: 400 });
  if (!CORNERS.has(corner)) throw Object.assign(new Error('PDF_QR_CORNER is invalid.'), { status: 400 });
  return { page, sizeMm, marginMm, corner };
}

async function createQrPng(verificationUrl) {
  return QRCode.toBuffer(verificationUrl, {
    type: 'png', width: 640, margin: 4, errorCorrectionLevel: 'Q',
    color: { dark: '#000000', light: '#FFFFFFFF' },
  });
}

async function createQrSvg(verificationUrl) {
  return QRCode.toString(verificationUrl, {
    type: 'svg', margin: 4, errorCorrectionLevel: 'Q',
    color: { dark: '#000000', light: '#FFFFFFFF' },
  });
}

async function createPrintablePdf(originalBytes, verificationUrl) {
  let pdf;
  let pages;
  try {
    pdf = await PDFDocument.load(originalBytes, { updateMetadata: false });
    pages = pdf.getPages();
  } catch (cause) {
    throw Object.assign(new Error('The uploaded PDF could not be parsed or is encrypted.'), { status: 422, cause });
  }
  if (!pages.length) throw Object.assign(new Error('The PDF does not contain any pages.'), { status: 422 });
  const placement = getPlacement(pages.length);
  const page = pages[placement.page - 1];
  const { width, height } = page.getSize();
  const size = placement.sizeMm * MM_TO_POINTS;
  const margin = placement.marginMm * MM_TO_POINTS;
  const backing = 2 * MM_TO_POINTS;
  const totalSize = size + backing * 2;
  if (totalSize + margin * 2 > width || totalSize + margin * 2 > height) {
    throw Object.assign(new Error('The configured QR size and margin do not fit on the selected PDF page.'), { status: 422 });
  }
  const left = placement.corner.endsWith('left');
  const top = placement.corner.startsWith('top');
  const x = left ? margin : width - margin - totalSize;
  const y = top ? height - margin - totalSize : margin;
  const qrPng = await createQrPng(verificationUrl);
  const qrImage = await pdf.embedPng(qrPng);
  page.drawRectangle({ x, y, width: totalSize, height: totalSize, color: rgb(1, 1, 1), borderColor: rgb(1, 1, 1), borderWidth: 0 });
  page.drawImage(qrImage, { x: x + backing, y: y + backing, width: size, height: size });
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return { bytes, qrPng, page: placement.page, corner: placement.corner };
}

module.exports = { createQrPng, createQrSvg, createPrintablePdf, getPlacement };
