import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const mongoose = require('../../../kimu-backend/node_modules/mongoose');
const User = require('../../../kimu-backend/models/User');
const { PDFDocument } = require('../../../kimu-backend/node_modules/pdf-lib');
const SPA_URL = process.env.KIMU_SPA_URL || 'http://127.0.0.1:5173';
const testMongoUri = process.env.KIMU_TEST_MONGO_URI;
let browser;
let page;
let consoleErrors = [];
let httpErrors = [];
const adminEmail = `spa-smoke-${process.pid}@test.invalid`;
const adminPassword = 'BrowserTestPassword123!';

function assertIsolatedMongo(uri) {
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error('KIMU_TEST_MONGO_URI must identify an isolated loopback test DB.'); }
  if (process.env.NODE_ENV === 'production' || process.env.KIMU_TEST_DB_DISPOSABLE !== 'YES' || !['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.pathname !== '/kimu_spa_verify') {
    throw new Error('Browser tests require KIMU_TEST_DB_DISPOSABLE=YES and the isolated loopback kimu_spa_verify database.');
  }
}

before(async () => {
  assertIsolatedMongo(testMongoUri);
  await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 3000 });
  await User.create({ fullName: 'Browser Smoke Admin', email: adminEmail, password: adminPassword, role: 'admin' });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });
});

after(async () => {
  await browser?.close();
  await User.deleteOne({ email: adminEmail }).catch(() => {});
  await mongoose.disconnect();
});

test('SPA deep links load and refresh on desktop, tablet, and mobile widths', async () => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${SPA_URL}/verify-certificate/BROWSER-SMOKE-MISSING`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByText('Certificate not found.').waitFor();
    const widthCheck = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(widthCheck.document <= widthCheck.viewport, `verification page overflows at ${width}px (${widthCheck.document}px)`);
    assert.equal((await page.reload({ waitUntil: 'networkidle' })).status(), 200, 'direct route refresh returns the SPA');
  }
  await page.goto(`${SPA_URL}/cerificate/BROWSER-SMOKE-MISSING`, { waitUntil: 'networkidle' });
  await page.getByText('Certificate not found.').waitFor();
});

test('staff can sign in and load the protected dashboard without browser console errors', async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${SPA_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(adminEmail);
  await page.getByLabel('Password', { exact: true }).fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await page.waitForURL('**/dashboard');
  const dashboardHeading = page.locator('h1.kimu-header__title');
  await dashboardHeading.waitFor();
  assert.equal((await dashboardHeading.textContent()).trim(), 'Dashboard');
  const expectedNotFoundResponses = httpErrors.filter((entry) => entry.includes('/certificates/verify/BROWSER-SMOKE-MISSING'));
  assert.equal(httpErrors.length, expectedNotFoundResponses.length, `unexpected HTTP errors: ${httpErrors.join(' | ')}`);
  const expectedMissingCertificateMessages = consoleErrors.filter((error) => error === 'Failed to load resource: the server responded with a status of 404 (Not Found)');
  assert.equal(consoleErrors.length, expectedMissingCertificateMessages.length, `unexpected browser console errors: ${consoleErrors.join(' | ')}`);
  assert.equal(expectedMissingCertificateMessages.length, expectedNotFoundResponses.length, 'only the deliberately missing certificate lookups may log an HTTP 404');
});

test('browser certificate verification and printable PDF delivery work end to end', async () => {
  const token = await page.evaluate(() => localStorage.getItem('kimu_token'));
  assert.ok(token, 'successful browser login stored the staff token');
  const sourcePdf = await PDFDocument.create();
  const sourcePage = sourcePdf.addPage([612, 792]);
  sourcePage.drawText('KIMU browser verification test certificate', { x: 54, y: 720, size: 18 });
  const pdfBase64 = Buffer.from(await sourcePdf.save()).toString('base64');
  const certificateId = `BROWSER-${process.pid}-${Date.now()}`;
  const create = await fetch('http://127.0.0.1:5000/api/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ certificateNumber: certificateId, confirmDuplicate: true, studentName: 'Browser Test Learner', course: 'Safe Driving', institution: 'KIMU', issueDate: '2026-11-22', pdf: 'browser-test.pdf', pdfBase64 }),
  });
  assert.equal(create.status, 201);
  const created = (await create.json()).data;
  const verificationToken = new URL(created.verificationUrl).pathname.split('/').pop();
  const verification = await fetch(`http://127.0.0.1:5000/api/certificates/verify/${verificationToken}`);
  assert.equal(verification.status, 200);
  assert.equal((await verification.json()).certificate.status, 'valid');

  await page.goto(`${SPA_URL}/verify-certificate/${verificationToken}`, { waitUntil: 'networkidle' });
  await page.getByText('Certificate verified').waitFor();
  await page.getByText('Browser Test Learner').waitFor();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download printable certificate' }).click(),
  ]);
  const downloadedPath = await download.path();
  const downloadedPdf = await import('node:fs/promises').then((fs) => fs.readFile(downloadedPath));
  assert.equal(download.suggestedFilename(), `certificate-${certificateId}-verified.pdf`);
  const printable = await PDFDocument.load(downloadedPdf);
  assert.equal(printable.getPageCount(), 1);
  assert.ok(downloadedPdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
});
