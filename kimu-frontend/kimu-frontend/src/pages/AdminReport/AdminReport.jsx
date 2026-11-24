import { useState } from 'react';
import { jsPDF } from 'jspdf';
import kimuLogo from '../../assets/LETTER HEAD.png';
import { catDateKey, formatCatDate } from '../../utils/catTime';
import './AdminReport.css';

const TITLE = 'RAPORO YUMUYOBOZI WA MAHUGURWA';
const SIGNERS = [
  { label: 'Byagenzuwe na:', name: 'HITIMANA JEAN', title: 'TRAINING CENTER COORDINATOR' },
  { label: 'Byemejwe na:', name: 'NKUNZIRYAYO JEAN PIERRE', title: 'CEO KIMU TRANSPORT' },
];

export default function AdminReport() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function download(event) {
    event.preventDefault();
    const reportMessage = message.trim();
    if (!reportMessage) { setError('Andika ubutumwa ushaka gushyira muri raporo.'); return; }
    setError('');
    try {
      const document = await buildAdminReport(reportMessage, catDateKey());
      document.save(`raporo-yumuyobozi-wamahugurwa-${catDateKey()}.pdf`);
    } catch {
      setError('Raporo ntiyashoboye gukorwa. Ongera ugerageze.');
    }
  }

  return <main className="admin-report">
    <header className="admin-report__heading"><div><p className="kimu-eyebrow">INYANDIKO Y’UYUBOZI</p><h2>Admin Report</h2><p>Andika ubutumwa ushaka gutanga, hanyuma ukore raporo ya PDF.</p></div><span className="admin-report__date">{formatCatDate(catDateKey())}</span></header>
    {error && <p className="admin-report__error" role="alert">{error}</p>}
    <div className="admin-report__layout">
      <form className="kimu-panel admin-report__form" onSubmit={download}>
        <div className="admin-report__section-heading"><span className="admin-report__icon" aria-hidden="true">▤</span><div><p className="kimu-eyebrow">UBUTUMWA BWA RAPORO</p><h3>Andika ubutumwa</h3></div></div>
        <label htmlFor="admin-report-message">Ubutumwa ushaka gutanga</label>
        <textarea id="admin-report-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={8000} rows={13} placeholder="Andika ubutumwa buzagaragara muri raporo…" required />
        <div className="admin-report__form-footer"><span>{message.length}/8,000 inyuguti · Itariki izongerwaho muri PDF</span><button className="kimu-btn kimu-btn--primary" type="submit" disabled={!message.trim()}>Download PDF</button></div>
      </form>
      <aside className="admin-report__preview">
        <p className="kimu-eyebrow">ABAZASINYA</p><h3>Raporo izagaragaza</h3>
        <p>Ubutumwa bwawe buzashyirwa munsi y’umutwe wa raporo n’itariki y’uyu munsi.</p>
        <div className="admin-report__signers">{SIGNERS.map((signer) => <div key={signer.name}><span className="admin-report__signer-mark" aria-hidden="true">✍</span><strong>{signer.name}</strong><small>{signer.title}</small><i /></div>)}</div>
        <div className="admin-report__preview-note"><span aria-hidden="true">✓</span> Raporo izakoresha logo n’umurongo wo hasi biri ku zindi raporo za MAITRISE.</div>
      </aside>
    </div>
  </main>;
}

async function buildAdminReport(message, date) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const logoWidth = pageWidth - margin * 2;
  const logoHeight = logo.naturalWidth ? logoWidth * logo.naturalHeight / logo.naturalWidth : 24;
  doc.addImage(logo, 'PNG', margin, 9, logoWidth, logoHeight);

  const titleY = 9 + logoHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text(TITLE, pageWidth / 2, titleY, { align: 'center' });
  const titleWidth = doc.getTextWidth(TITLE);
  doc.setLineWidth(0.35);
  doc.line((pageWidth - titleWidth) / 2, titleY + 1.5, (pageWidth + titleWidth) / 2, titleY + 1.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Itariki: ${formatCatDate(date)}`, pageWidth - margin, titleY + 10, { align: 'right' });

  const bodyStartY = titleY + 20;
  const bodyWidth = pageWidth - margin * 2;
  const lines = doc.splitTextToSize(message, bodyWidth);
  const fontSize = 11;
  const lineHeight = 6;
  const bodyBottom = pageHeight - 63;
  let y = bodyStartY;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  for (const line of lines) {
    if (y > bodyBottom) { doc.addPage(); y = 24; }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawAdminReportFooter(doc, SIGNERS, page === pageCount);
  }
  return doc;
}

function drawAdminReportFooter(doc, signers, includeSigners) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const blockWidth = 78;
  const gap = pageWidth - margin * 2 - blockWidth * 2;
  const signY = pageHeight - 53;
  (includeSigners ? signers : []).forEach((signer, index) => {
    const x = margin + index * (blockWidth + gap);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(signer.label, x, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(signer.name, x, signY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(signer.title, blockWidth), x, signY + 10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.line(x, signY + 20, x + blockWidth, signY + 20);
  });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Email: kimutransport6@gmail.com  |  Website: www.kimutransport.co.rw  |  Location: Gisozi, KG 780 St', margin, pageHeight - 17);
  doc.text('TIN: 121516875  |  Tel: (+250) 792 958 752  |  TOLLFREE: 6364', margin, pageHeight - 11);
}

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = kimuLogo;
  });
}
