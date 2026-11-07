import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import './Dashboard.css';

const LESSONS = ['GPS', 'PARKING', 'CIRCULATION'];
const SHIFTS = ['09:00 - 11:30', '11:30 - 14:00', '14:30 - 16:00', '16:00 - 18:30'];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ totalStudents: 0, activeStudents: 0, todaysAttendance: 0, attendanceByLesson: {}, attendanceByShift: {} });
  useEffect(() => { dashboardApi.summary().then((response) => setSummary(response.data.data)).catch(() => {}); }, []);
  const today = new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return <div className="kimu-dashboard">
    <div className="kimu-dashboard__intro"><div><p className="kimu-eyebrow">METRIZE TRAINING MANAGEMENT</p><h2>{greeting()}, {firstName(user?.fullName)}</h2><p>{today}</p></div><Link className="kimu-btn kimu-btn--primary" to="/attendance">Record attendance</Link></div>
    <div className="kimu-stat-grid">
      <Link className="kimu-stat-card" to="/students"><span className="kimu-stat-card__label">Registered students</span><span className="kimu-stat-card__value">{summary.totalStudents}</span></Link>
      <Link className="kimu-stat-card" to="/students"><span className="kimu-stat-card__label">Active students</span><span className="kimu-stat-card__value">{summary.activeStudents}</span></Link>
      <Link className="kimu-stat-card" to="/attendance"><span className="kimu-stat-card__label">Today&apos;s attendance</span><span className="kimu-stat-card__value">{summary.todaysAttendance}</span></Link>
    </div>
    <div className="kimu-dashboard__grid">
      <section className="kimu-panel kimu-breakdown"><h3>Attendance by lesson</h3>{LESSONS.map((lesson) => <div className="kimu-breakdown__row" key={lesson}><span>{lesson}</span><strong>{summary.attendanceByLesson?.[lesson] || 0}</strong></div>)}</section>
      <section className="kimu-panel kimu-breakdown"><h3>Attendance by shift</h3>{SHIFTS.map((shift) => <div className="kimu-breakdown__row" key={shift}><span>{shift}</span><strong>{summary.attendanceByShift?.[shift] || 0}</strong></div>)}</section>
    </div>
    <section className="kimu-panel kimu-dashboard__actions"><h3>Quick actions</h3><div className="kimu-quick-actions"><Link className="kimu-btn kimu-btn--secondary" to="/students">Register student</Link><Link className="kimu-btn kimu-btn--secondary" to="/attendance">Record training</Link><Link className="kimu-btn kimu-btn--secondary" to="/reports">Daily report</Link></div></section>
  </div>;
}

function firstName(name) { return name ? name.split(' ')[0] : 'there'; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }
