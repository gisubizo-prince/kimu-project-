import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import kimuLogo from '../../assets/kimu.png';
import '../Operations/Operations.css';
import './Reports.css';

export default function Reports() {
  const [date, setDate] = useState(localDateKey(new Date()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/reports/daily', { params: { date } }).then((response) => {
      if (active) setReport(response.data.data);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [date]);

  const attendance = report?.attendance || [];

  async function buildPdf() {
    if (!attendance.length) return;
    const document = await buildAttendancePdf(attendance, date);
    document.save(`metrize-attendance-${date}.pdf`);
  }

  async function emailReport() {
    if (!attendance.length) return;
    setEmailSending(true);
    setEmailSuccess('');
    setError('');
    try {
      const document = await buildAttendancePdf(attendance, date);
      await api.post('/reports/email', { fileName: `metrize-attendance-${date}.pdf`, pdfBase64: document.output('datauristring'), reportType: 'daily attendance', period: date });
      setEmailSuccess('Report emailed successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to email report.');
    } finally {
      setEmailSending(false);
    }
  }

  return <div className="kimu-operations kimu-daily-report">
    <div className="kimu-operations__heading"><div><p className="kimu-eyebrow">METRIZE TRAINING</p><h2>Daily attendance report</h2><p>Review and export real student attendance for a selected day.</p></div></div>
    {error && <p className="kimu-resource__error" role="alert">{error}</p>}
    {emailSuccess && <p className="kimu-resource__success" role="status">{emailSuccess}</p>}
    <section className="kimu-panel kimu-report-section">
      <div className="kimu-report-section__header"><div><p className="kimu-eyebrow">ATTENDANCE REGISTER</p><h3>Training attendance</h3><span>{attendance.length} records for {date}</span></div><div className="kimu-report-section__actions"><button className="kimu-btn kimu-btn--primary" onClick={buildPdf} disabled={loading || attendance.length === 0}>Download PDF</button><button className="kimu-btn kimu-btn--secondary" onClick={emailReport} disabled={loading || attendance.length === 0 || emailSending}>{emailSending ? 'Emailing...' : 'Email report'}</button></div></div>
      <div className="kimu-list-toolbar"><label className="kimu-date-filter">Attendance date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      {loading ? <p className="kimu-panel__placeholder">Loading attendance...</p> : attendance.length === 0 ? <p className="kimu-report-empty" role="status">No attendance records for this date. Choose another date to view or download a report.</p> : <div className="kimu-resource__table-wrap"><table><thead><tr><th>NO.</th><th>NAME</th><th>TEL</th><th>SHIFT</th><th>LESSON</th></tr></thead><tbody>{attendance.map((record, index) => <tr key={record._id}><td>{index + 1}</td><td className="kimu-name-cell">{record.studentName}</td><td>{record.telephone || '-'}</td><td>{record.shift}</td><td>{record.lesson}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

async function buildAttendancePdf(records, date) {
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const title = 'URUTONDE RWABITABIRIYE AMAHUGURWA (MAITRIZE)';
  const tableStart = await addReportHeader(document, title, `Tariki: ${date}`);
  autoTable(document, {
    theme: 'grid',
    startY: tableStart,
    margin: { left: 14, right: 14, bottom: 32 },
    head: [['NO.', 'AMAZINA', 'TEL', 'AMASAHA', 'ISOMO']],
    body: records.map((record, index) => [index + 1, record.studentName, record.telephone || '-', record.shift, record.lesson]),
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle', textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 45 }, 2: { cellWidth: 34 }, 3: { cellWidth: 48 }, 4: { cellWidth: 44 } },
    didDrawPage: () => addReportFooter(document),
  });
  let signatureTop = document.lastAutoTable.finalY + 10;
  const pageHeight = document.internal.pageSize.getHeight();
  if (signatureTop + 39 > pageHeight - 30) {
    document.addPage();
    signatureTop = await addReportHeader(document, title, `Tariki: ${date}`) + 5;
    addReportFooter(document);
  }
  document.setTextColor(0, 0, 0);
  const approvals = [
    ['Byateguwe na:', 'NIYONZIMA JEAN PIERRE', "DRIVER'S TRAINER"],
    ['Byagenzuwe na:', 'HITIMANA JEAN', 'HEAD OF TRANSPORT'],
    ['Byagenzuwe na:', 'MANIRAGUHA AGNES', 'HEAD OF TRANSPORT'],
    ['Byemejwe na:', 'NKUNZIRYAYO JEAN PIERRE', 'CEO KIMU TRANSPORT'],
  ];
  const lefts = [14, 61, 108, 155];
  approvals.forEach((approval, index) => {
    const blockWidth = 42;
    const blockX = lefts[index];
    const blockY = signatureTop;
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    document.text(approval[0], blockX, blockY);
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.text(document.splitTextToSize(approval[1], blockWidth), blockX, blockY + 4.5);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    document.text(document.splitTextToSize(approval[2], blockWidth), blockX, blockY + 9);
    const lineY = blockY + 16;
    document.setDrawColor(0, 0, 0);
    document.setLineWidth(0.25);
    document.line(blockX, lineY, blockX + blockWidth, lineY);
  });
  return document;
}

function localDateKey(value) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const dateParts = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

async function addReportHeader(document, title, subtitle) {
  const logo = await loadLogo();
  const pageWidth = document.internal.pageSize.getWidth();
  const logoWidth = pageWidth - 28;
  const logoHeight = logo.naturalWidth ? (logoWidth * logo.naturalHeight) / logo.naturalWidth : 16;
  document.addImage(logo, 'PNG', 14, 10, logoWidth, logoHeight);
  const titleY = 10 + logoHeight + 9;
  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.setTextColor(0, 0, 0);
  const titleWidth = document.getTextWidth(title);
  const titleX = (pageWidth - titleWidth) / 2;
  document.text(title, titleX, titleY);
  document.setDrawColor(0, 0, 0);
  document.setLineWidth(0.35);
  document.line(titleX, titleY + 1.5, titleX + titleWidth, titleY + 1.5);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(subtitle, 14, titleY + 8);
  return titleY + 15;
}

function addReportFooter(document) {
  const pageHeight = document.internal.pageSize.getHeight();
  document.setDrawColor(0, 0, 0); document.line(14, pageHeight - 25, 196, pageHeight - 25);
  document.setFontSize(8); document.setTextColor(0, 0, 0);
  document.text('Email: kimutransport6@gmail.com  |  Website: www.kimutransport.co.rw  |  Location: Gisozi, KG 780 St', 14, pageHeight - 17);
  document.text('TIN: 121516875  |  Tel: (+250) 792 958 752  |  TOLLFREE: 6364', 14, pageHeight - 11);
}

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = kimuLogo;
  });
}
