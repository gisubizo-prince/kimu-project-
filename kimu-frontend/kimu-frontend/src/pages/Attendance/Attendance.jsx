import { useEffect, useState } from 'react';
import api from '../../services/api';
import './Attendance.css';
import '../Operations/Operations.css';

const SHIFTS = ['09:00 - 11:30', '11:30 - 14:00', '14:30 - 16:00', '16:00 - 18:30'];
const LESSONS = ['GPS', 'PARKING', 'CIRCULATION'];

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ studentId: '', shift: '', lesson: '' });
  const [editingId, setEditingId] = useState('');
  const [date, setDate] = useState(localDateKey(new Date()));
  const [studentFilter, setStudentFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api.get('/students').then((response) => setStudents(response.data.data || [])).catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    const params = { date };
    if (studentFilter) params.studentId = studentFilter;
    if (shiftFilter) params.shift = shiftFilter;
    if (lessonFilter) params.lesson = lessonFilter;
    api.get('/attendance', { params }).then((response) => {
      setRecords(response.data.data || []);
      setError('');
    }).catch((requestError) => setError(requestError.message));
  }, [date, studentFilter, shiftFilter, lessonFilter, refresh]);

  const selectedStudent = students.find((student) => student._id === form.studentId);
  const activeStudents = students.filter((student) => student.isActive);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form, date };
      if (editingId) await api.put(`/attendance/${editingId}`, payload);
      else await api.post('/attendance', payload);
      setSuccess(editingId ? 'Attendance updated.' : 'Attendance recorded.');
      setForm({ studentId: '', shift: '', lesson: '' });
      setEditingId('');
      setRefresh((value) => value + 1);
    } catch (requestError) { setError(requestError.message || 'Unable to save attendance.'); }
    finally { setSaving(false); }
  }

  function editRecord(record) {
    setEditingId(record._id);
    setDate(localDateKey(record.date));
    setForm({ studentId: record.studentId, shift: record.shift, lesson: record.lesson });
    setSuccess('');
  }

  function cancelEdit() {
    setEditingId('');
    setForm({ studentId: '', shift: '', lesson: '' });
  }

  return <div className="kimu-operations kimu-attendance-page">
    <div className="kimu-operations__heading"><div><p className="kimu-eyebrow">METRIZE TRAINING</p><h2>Attendance</h2><p>Record student participation by training shift and lesson.</p></div></div>
    <form className="kimu-panel kimu-training-form" onSubmit={submit}>
      <h3>{editingId ? 'Edit attendance' : 'Record attendance'}</h3>
      {error && <p className="kimu-resource__error" role="alert">{error}</p>}
      {success && <p className="kimu-resource__success" role="status">{success}</p>}
      <div className="kimu-training-form__grid">
        <label>Student<select required value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">Select student</option>{activeStudents.map((student) => <option key={student._id} value={student._id}>{student.fullName}</option>)}</select></label>
        <label>Telephone<input value={selectedStudent?.phone || ''} readOnly placeholder="Filled from student record" /></label>
        <label>Shift<select required value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value })}><option value="">Select shift</option>{SHIFTS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}</select></label>
        <label>Lesson<select required value={form.lesson} onChange={(event) => setForm({ ...form, lesson: event.target.value })}><option value="">Select lesson</option>{LESSONS.map((lesson) => <option key={lesson} value={lesson}>{lesson}</option>)}</select></label>
        <label>Attendance date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </div>
      <div className="kimu-training-form__actions"><button className="kimu-btn kimu-btn--primary" disabled={saving || activeStudents.length === 0}>{saving ? 'Saving...' : editingId ? 'Update attendance' : 'Record attendance'}</button>{editingId && <button className="kimu-btn kimu-btn--secondary" type="button" onClick={cancelEdit}>Cancel</button>}</div>
    </form>
    <section className="kimu-panel kimu-operations__list kimu-attendance-list">
      <div className="kimu-attendance-list__heading"><div><h3>Attendance records</h3><span>{records.length} records for {date}</span></div></div>
      <div className="kimu-list-toolbar kimu-attendance-filters">
        <label>Day<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Student<select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}><option value="">All students</option>{students.map((student) => <option key={student._id} value={student._id}>{student.fullName}</option>)}</select></label>
        <label>Shift<select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}><option value="">All shifts</option>{SHIFTS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}</select></label>
        <label>Lesson<select value={lessonFilter} onChange={(event) => setLessonFilter(event.target.value)}><option value="">All lessons</option>{LESSONS.map((lesson) => <option key={lesson} value={lesson}>{lesson}</option>)}</select></label>
      </div>
      <div className="kimu-resource__table-wrap"><table><thead><tr><th>NO.</th><th>NAME</th><th>TEL</th><th>SHIFT</th><th>LESSON</th><th>Actions</th></tr></thead><tbody>
        {records.length === 0 ? <tr><td colSpan="6">No attendance records for the selected filters.</td></tr> : records.map((record, index) => <tr key={record._id}><td>{index + 1}</td><td className="kimu-name-cell">{record.studentName}</td><td>{record.telephone || '-'}</td><td>{record.shift}</td><td>{record.lesson}</td><td>{students.some((student) => student._id === record.studentId && student.isActive) && <button className="kimu-link-button" type="button" onClick={() => editRecord(record)}>Edit</button>}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const dateParts = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}
