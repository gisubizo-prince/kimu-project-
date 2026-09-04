import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import kimuLogo from '../../assets/kimu.png';
import '../Operations/Operations.css';
import './Reports.css';

export default function Reports() {
  const [view, setView] = useState('visitors');
  const [visitorReport, setVisitorReport] = useState(null);
  const [visitorDate, setVisitorDate] = useState(localDateKey(new Date()));
  const [visitorSearch, setVisitorSearch] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [day, setDay] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { const params = { date: visitorDate }; if (visitorSearch.trim()) params.search = visitorSearch.trim(); api.get('/reports/daily', { params }).then((response) => setVisitorReport(response.data.data)).catch((requestError) => setError(requestError.message)); }, [visitorDate, visitorSearch]);
  useEffect(() => { if (view !== 'attendance') return; const params = day ? { date: day } : { month }; if (search.trim()) params.search = search.trim(); api.get('/attendance', { params }).then((response) => setAttendance(response.data.data || [])).catch((requestError) => setError(requestError.message)); }, [view, month, day, search]);

  async function downloadVisitors() {
    const document = new jsPDF(); const tableStart = await addReportHeader(document, 'Visitor Report', `Report date: ${visitorReport.date}${visitorSearch.trim() ? ` | Visitor: ${visitorSearch.trim()}` : ''}`);
    autoTable(document, { startY: tableStart, margin: { bottom: 30 }, head: [['Visitor name', 'Phone', 'Reason', 'Check-in', 'Check-out', 'Status']], body: visitorReport.visitors.map((visitor) => [visitor.fullName, visitor.phone || '-', visitor.reason, formatDateTime(visitor.checkIn || visitor.createdAt), formatDateTime(visitor.checkOut), visitor.status]), didDrawPage: () => addReportFooter(document) }); document.save(`kimu-visitors-${visitorReport.date}${visitorSearch.trim() ? `-${visitorSearch.trim().replace(/\s+/g, '-')}` : ''}.pdf`);
  }
  async function downloadAttendance() {
    const period = day || month;
    const document = new jsPDF(); const tableStart = await addReportHeader(document, 'Attendance Report', `Period: ${period}${search.trim() ? ` | Employee: ${search.trim()}` : ''}`);
    autoTable(document, { startY: tableStart, margin: { bottom: 30 }, head: [['Employee', 'Date', 'Arrival time', 'Status']], body: attendance.map((record) => [record.employeeName, formatDate(record.date), formatTime(record.checkIn), record.status]), didDrawPage: () => addReportFooter(document) }); document.save(`kimu-attendance-${period}${search.trim() ? `-${search.trim().replace(/\s+/g, '-')}` : ''}.pdf`);
  }

  const present = attendance.filter((record) => record.status === 'present').length;
  return <div className="kimu-operations"><div className="kimu-operations__heading"><div><p className="kimu-eyebrow">OPERATIONS REPORTS</p><h2>{view === 'visitors' ? 'Visitor report' : 'Attendance report'}</h2><p>{view === 'visitors' ? 'Search a visitor and choose a day to see all visit details.' : 'Search an employee for the month or choose one specific day.'}</p></div><button className="kimu-btn kimu-btn--secondary" onClick={() => setView(view === 'visitors' ? 'attendance' : 'visitors')}>{view === 'visitors' ? 'View attendance report' : 'View visitor report'}</button></div>{error && <p className="kimu-resource__error">{error}</p>}{view === 'visitors' ? <VisitorReport report={visitorReport} date={visitorDate} search={visitorSearch} setDate={setVisitorDate} setSearch={setVisitorSearch} onDownload={downloadVisitors} /> : <AttendanceReport attendance={attendance} month={month} day={day} search={search} setMonth={setMonth} setDay={setDay} setSearch={setSearch} onDownload={downloadAttendance} present={present} />}</div>;
}

function VisitorReport({ report, date, search, setDate, setSearch, onDownload }) {
  return <section className="kimu-panel kimu-report-section"><div className="kimu-report-section__header"><div><p className="kimu-eyebrow">VISITOR REPORT</p><h3>Visitor activity</h3><span>{report ? `Report for ${report.date}${search.trim() ? ` · ${search.trim()}` : ''}` : 'Loading report...'}</span></div><button className="kimu-btn kimu-btn--primary" onClick={onDownload}>Download visitor PDF</button></div><div className="kimu-list-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitor name" aria-label="Search visitor name" /><label className="kimu-date-filter">Day<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>{report && <div className="kimu-resource__table-wrap"><table><thead><tr><th>Visitor name</th><th>Phone</th><th>Reason</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead><tbody>{report.visitors.length ? report.visitors.map((visitor) => <tr key={visitor._id}><td className="kimu-name-cell">{visitor.fullName}</td><td>{visitor.phone || '-'}</td><td>{visitor.reason}</td><td>{formatDateTime(visitor.checkIn || visitor.createdAt)}</td><td>{formatDateTime(visitor.checkOut)}</td><td>{visitor.status}</td></tr>) : <tr><td colSpan="6">No visitor records for this day and search.</td></tr>}</tbody></table></div>}</section>;
}

function AttendanceReport({ attendance, month, day, search, setMonth, setDay, setSearch, onDownload, present }) {
  const personLabel = search.trim() || 'all employees';
  return <><div className="kimu-report-cards"><div className="kimu-panel"><span>Present</span><strong>{present}</strong></div><div className="kimu-panel"><span>Absent</span><strong>{Math.max(attendance.length - present, 0)}</strong></div><div className="kimu-panel"><span>Records</span><strong>{attendance.length}</strong></div></div><section className="kimu-panel kimu-report-section"><div className="kimu-report-section__header"><div><p className="kimu-eyebrow">EMPLOYEE REPORT</p><h3>{day ? 'Daily attendance' : 'Monthly attendance'} for {personLabel}</h3><span>{day || month}</span></div><button className="kimu-btn kimu-btn--primary" onClick={onDownload}>Download {search.trim() ? `${search.trim()}'s` : 'attendance'} PDF</button></div><div className="kimu-list-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name" aria-label="Search employee name" /><label className="kimu-date-filter">Month<input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setDay(''); }} /></label><label className="kimu-date-filter">Day<input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label></div><div className="kimu-resource__table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Arrival time</th><th>Status</th></tr></thead><tbody>{attendance.length ? attendance.map((record) => <tr key={record._id}><td className="kimu-name-cell">{record.employeeName}</td><td>{formatDate(record.date)}</td><td>{formatTime(record.checkIn)}</td><td>{record.status}</td></tr>) : <tr><td colSpan="4">No attendance records for this period and employee search.</td></tr>}</tbody></table></div></section></>;
}

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function localDateKey(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const dateParts = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); return `${dateParts.year}-${dateParts.month}-${dateParts.day}`; }
function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(); }
function formatDateTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString(); }

async function addReportHeader(document, title, subtitle) {
  const logo = await loadLogo();
  const pageWidth = document.internal.pageSize.getWidth();
  const logoWidth = pageWidth - 28;
  const logoHeight = logo.naturalWidth ? (logoWidth * logo.naturalHeight) / logo.naturalWidth : 16;
  document.addImage(logo, 'PNG', 14, 10, logoWidth, logoHeight);
  const titleY = 10 + logoHeight + 9;
  document.setFontSize(18); document.setTextColor(31, 45, 38); document.text(`Kimu Transport - ${title}`, 14, titleY);
  document.setFontSize(10); document.setTextColor(91, 105, 98); document.text(subtitle, 14, titleY + 7);
  return titleY + 14;
}

function addReportFooter(document) {
  const pageHeight = document.internal.pageSize.getHeight();
  document.setDrawColor(196, 207, 200); document.line(14, pageHeight - 22, 196, pageHeight - 22);
  document.setFontSize(8); document.setTextColor(91, 105, 98);
  document.text('Email: kimutransport6@gmail.com  |  Website: www.kimutransport.co.rw  |  Location: Gisozi, KG 780 St', 14, pageHeight - 16);
  document.text('TIN: 121516875  |  Tel: (+250) 792 958 752  |  TOLLFREE: 6364', 14, pageHeight - 10);
}

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = kimuLogo;
  });
}
