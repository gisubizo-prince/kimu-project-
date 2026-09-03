import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import '../Operations/Operations.css';

export default function AttendanceList() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const [records, setRecords] = useState([]); const [search, setSearch] = useState(''); const [selectedDate, setSelectedDate] = useState(localDateKey(new Date())); const [error, setError] = useState('');
  async function load() { try { const params = { date: selectedDate }; if (search.trim()) params.search = search.trim(); if (status && status !== 'absent') params.status = status; const attendanceResponse = await api.get('/attendance', { params }); const current = attendanceResponse.data.data || []; if (selectedDate !== localDateKey(new Date()) || status === 'present' || status === 'late') { setRecords(status ? current.filter((record) => record.status === status) : current); return; } const employeeResponse = await api.get('/employees'); const recordedNames = new Set(current.map((record) => record.employeeName)); const missing = (employeeResponse.data.data || []).filter((employee) => employee.isActive && !recordedNames.has(employee.fullName) && (!search.trim() || employee.fullName.toLowerCase().includes(search.trim().toLowerCase()))).map((employee) => ({ _id: `missing-${employee._id}`, employeeName: employee.fullName, employeeNumber: employee.employeeNumber, date: new Date(), status: 'absent', missing: true })); setRecords(status === 'absent' ? missing : [...current, ...missing]); } catch (requestError) { setError(requestError.message); } }
  useEffect(() => { load(); }, [search, selectedDate, status]);
  async function checkout(id) { try { await api.patch(`/attendance/${id}/checkout`); await load(); } catch (requestError) { setError(requestError.message); } }
  const statusLabel = status ? `${status} attendance` : 'Attendance records';
  return <div className="kimu-operations"><div className="kimu-operations__heading"><div><p className="kimu-eyebrow">ARRIVAL LOG</p><h2>{statusLabel}</h2><p>{status ? `Showing employees marked ${status} for the selected day.` : 'Search an employee and choose a day to see the recorded arrival time.'}</p></div><Link className="kimu-btn kimu-btn--primary" to="/attendance">Record arrival</Link></div><section className="kimu-panel kimu-operations__list">{error && <p className="kimu-resource__error">{error}</p>}<div className="kimu-list-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name" aria-label="Search employee name" /><label className="kimu-date-filter">Day<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><span>{records.length} records</span></div><div className="kimu-resource__table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Arrival time</th><th>Status</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan="4">No attendance records found for this search.</td></tr> : records.map((record) => <tr key={record._id}><td className="kimu-name-cell">{record.employeeName}</td><td>{formatDate(record.date)}</td><td>{formatTime(record.checkIn)}</td><td>{record.status}</td></tr>)}</tbody></table></div></section></div>;
}

function localDateKey(value) {
  const rawDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(rawDate.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(rawDate);
  const dateParts = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}