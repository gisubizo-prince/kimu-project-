import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ResourcePage from '../../components/common/ResourcePage';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import kimuLogo from '../../assets/LETTER HEAD.png';

const fields = [
  { name: 'fullName', label: 'Full name' },
  { name: 'phone', label: 'Telephone' },
];

const columns = [
  { key: 'registrationNumber', label: 'Student ID' },
  { key: 'fullName', label: 'Name' },
  { key: 'phone', label: 'Telephone' },
  { key: 'registrationDate', label: 'Registered', render: (student) => new Date(student.registrationDate).toLocaleDateString() },
  { key: 'status', label: 'Status', render: (student) => formatStatus(student.status) },
];

const statusOptions = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'pass', label: 'Pass' },
  { value: 'repeat', label: 'Repeat' },
];

export default function Students() {
  const { hasRole } = useAuth();
  const canDelete = hasRole('super_admin', 'admin');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  async function downloadStudents() {
    setDownloading(true);
    setDownloadError('');
    try {
      const response = await api.get('/students');
      const students = response.data.data;
      if (!Array.isArray(students)) throw new Error('Unable to load the registered students.');
      const document = await buildStudentsPdf(students);
      document.save(`registered-students-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      setDownloadError(error.message || 'Unable to download the registered students.');
    } finally {
      setDownloading(false);
    }
  }

  return <ResourcePage
    resourceClassName="kimu-students"
    title="Students"
    description="Register students and keep their contact details ready for training attendance."
    endpoint="/students"
    fields={fields}
    columns={columns}
    statusEndpoint="status"
    statusOptions={statusOptions}
    allowDelete={canDelete}
    deleteConfirmation={(student) => `Are you sure you want to delete ${student.fullName}?`}
    headerActions={<div className="kimu-resource__intro-actions"><button className="kimu-btn kimu-btn--primary" type="button" onClick={downloadStudents} disabled={downloading}>{downloading ? 'Preparing PDF...' : 'Download PDF'}</button></div>}
    headerError={downloadError}
  />;
}

function formatStatus(status) {
  return statusOptions.find((option) => option.value === status)?.label || 'Trainee';
}

async function buildStudentsPdf(students) {
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const tableStart = drawStudentsHeader(document, logo, 'REGISTERED STUDENTS');

  autoTable(document, {
    theme: 'grid',
    startY: tableStart,
    margin: { top: tableStart, left: 14, right: 14, bottom: 32 },
    head: [['NO.', 'STUDENT ID', 'NAME', 'TELEPHONE', 'REGISTERED', 'STATUS']],
    body: students.map((student, index) => [
      index + 1,
      student.registrationNumber || '-',
      student.fullName || '-',
      student.phone || '-',
      formatRegistrationDate(student.registrationDate),
      formatStatus(student.status),
    ]),
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle', textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 35 }, 2: { cellWidth: 43 }, 3: { cellWidth: 34 }, 4: { cellWidth: 30 }, 5: { cellWidth: 22 } },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) drawStudentsHeader(document, logo, 'REGISTERED STUDENTS');
      drawReportFooter(document);
    },
  });
  return document;
}

function drawStudentsHeader(document, logo, title) {
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
  document.text(`Tariki: ${new Date().toLocaleDateString('en-GB')}`, 14, titleY + 8);
  return titleY + 15;
}

function drawReportFooter(document) {
  const pageHeight = document.internal.pageSize.getHeight();
  document.setDrawColor(0, 0, 0);
  document.line(14, pageHeight - 25, 196, pageHeight - 25);
  document.setFontSize(8);
  document.setTextColor(0, 0, 0);
  document.text('Email: kimutransport6@gmail.com  |  Website: www.kimutransport.co.rw  |  Location: Gisozi, KG 780 St', 14, pageHeight - 17);
  document.text('TIN: 121516875  |  Tel: (+250) 792 958 752  |  TOLLFREE: 6364', 14, pageHeight - 11);
}

function formatRegistrationDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the report logo.'));
    image.src = kimuLogo;
  });
}