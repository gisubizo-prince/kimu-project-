import { useEffect, useState } from 'react';
import api from '../../services/api';
import './Attendance.css';
import { Link } from 'react-router-dom';

export default function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [success, setSuccess] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() { try { const response = await api.get('/employees'); setEmployees((response.data.data || []).filter((employee) => employee.isActive)); } catch (requestError) { setError(requestError.message); } }
  useEffect(() => { load(); }, []);
  async function submit(event) { event.preventDefault(); setError(''); setSuccess(''); setArrivalTime(''); setSaving(true); try { const response = await api.post('/attendance', { employeeName }); const checkIn = response.data.data?.checkIn; setEmployeeName(''); setSuccess('Arrival recorded.'); setArrivalTime(checkIn ? new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''); } catch (requestError) { setError(requestError.message || 'Unable to save attendance.'); } finally { setSaving(false); } }
  return <div className="kimu-operations"><div className="kimu-operations__heading"><div><p className="kimu-eyebrow">DAILY CHECK-IN</p><h2>Record arrival</h2><p>Select an employee and save the exact time they arrived.</p></div><Link className="kimu-btn kimu-btn--secondary" to="/attendance/list">View attendance</Link></div><form className="kimu-panel kimu-clean-form" onSubmit={submit}><h3>Employee arrival</h3>{error && <p className="kimu-resource__error" role="alert">{error}</p>}{success && <p className="kimu-resource__success" role="status">{success} {arrivalTime && `Time: ${arrivalTime}`}</p>}<label>Employee<select required value={employeeName} onChange={(event) => setEmployeeName(event.target.value)}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee.fullName}>{employee.fullName} ({employee.employeeNumber})</option>)}</select></label><button className="kimu-btn kimu-btn--primary" disabled={saving}>{saving ? 'Recording...' : 'Record arrival'}</button></form></div>;
}
