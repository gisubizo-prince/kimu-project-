import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import './Dashboard.css';

const LESSONS = ['GPS', 'PARKING', 'CIRCULATION'];
const SHIFTS = ['09:00 - 11:30', '11:30 - 14:00', '14:30 - 16:00', '16:00 - 18:30'];
const EMPTY_SUMMARY = { totalStudents: 0, activeStudents: 0, inactiveStudents: 0, sessionsToday: 0, sessionsLast7Days: 0, studentsAttendedToday: 0, attendanceByLesson: {}, attendanceByShift: {}, dailyAttendanceTrend: [] };

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    dashboardApi.summary()
      .then((response) => setSummary(response.data.data))
      .catch((requestError) => setError(requestError.message || 'Unable to load dashboard data.'));
  }, []);

  const data = summary || EMPTY_SUMMARY;
  const attendanceRate = data.activeStudents ? Math.round((data.studentsAttendedToday / data.activeStudents) * 100) : 0;
  const metrics = [
    { label: 'Registered students', value: data.totalStudents, detail: `${data.activeStudents} active · ${data.inactiveStudents} inactive`, to: '/students', tone: 'students' },
    { label: 'Active students', value: data.activeStudents, detail: 'Available for training', to: '/students', tone: 'active' },
    { label: 'Sessions today', value: data.sessionsToday, detail: `${data.studentsAttendedToday} students attended`, to: '/attendance', tone: 'today' },
    { label: 'Sessions this week', value: data.sessionsLast7Days, detail: 'Last 7 days', to: '/reports', tone: 'week' },
  ];

  return <div className="kimu-dashboard">
    <header className="kimu-dashboard__intro">
      <div><p className="kimu-eyebrow">METRIZE / OPERATIONS</p><h2>{greeting()}, {firstName(user?.fullName)}</h2><p>{today}</p></div>
      <Link className="kimu-btn kimu-btn--primary" to="/attendance">Record attendance</Link>
    </header>

    {error && <div className="kimu-dashboard__error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Retry</button></div>}

    <section className="kimu-dashboard__metrics" aria-label="Student and attendance totals">
      {metrics.map((metric) => <Link className={`kimu-dashboard__metric kimu-dashboard__metric--${metric.tone}`} key={metric.label} to={metric.to}>
        <span className="kimu-dashboard__metric-label">{metric.label}</span>
        <strong>{summary ? metric.value.toLocaleString() : '—'}</strong>
        <span className="kimu-dashboard__metric-detail">{summary ? metric.detail : 'Loading...'}</span>
      </Link>)}
    </section>

    <section className="kimu-dashboard__overview">
      <article className="kimu-panel kimu-dashboard__trend">
        <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">VOLUME</p><h3>Training sessions</h3><p>Daily attendance records over the last seven days</p></div><span className="kimu-dashboard__period">7 DAYS</span></div>
        <WeeklyChart days={data.dailyAttendanceTrend} loading={!summary} />
      </article>
      <article className="kimu-panel kimu-dashboard__coverage">
        <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">TODAY</p><h3>Student coverage</h3></div></div>
        <div className="kimu-dashboard__coverage-value"><strong>{summary ? `${attendanceRate}%` : '—'}</strong><span>of active students attended</span></div>
        <div className="kimu-dashboard__coverage-track" role="img" aria-label={`${attendanceRate}% of active students attended today`}><span style={{ width: `${attendanceRate}%` }} /></div>
        <div className="kimu-dashboard__coverage-meta"><span>Attended</span><strong>{summary ? data.studentsAttendedToday : '—'}</strong><span>Active</span><strong>{summary ? data.activeStudents : '—'}</strong></div>
        <Link className="kimu-dashboard__text-link" to="/attendance">Open attendance <span aria-hidden="true">&rarr;</span></Link>
      </article>
    </section>

    <section className="kimu-dashboard__breakdowns" aria-label="Today's training distribution">
      <article className="kimu-panel kimu-dashboard__breakdown">
        <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">TODAY&apos;S MIX</p><h3>By lesson</h3></div><span className="kimu-dashboard__small-total">{data.sessionsToday} sessions</span></div>
        <Breakdown rows={LESSONS.map((lesson) => ({ label: lesson, value: data.attendanceByLesson?.[lesson] || 0 }))} loading={!summary} />
      </article>
      <article className="kimu-panel kimu-dashboard__breakdown">
        <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">TODAY&apos;S SCHEDULE</p><h3>By shift</h3></div><span className="kimu-dashboard__small-total">{data.sessionsToday} sessions</span></div>
        <Breakdown rows={SHIFTS.map((shift) => ({ label: shift, value: data.attendanceByShift?.[shift] || 0 }))} loading={!summary} />
      </article>
    </section>

    <footer className="kimu-dashboard__footer"><span>Live operational totals</span><Link to="/maitrise-report">Create daily class report <span aria-hidden="true">&rarr;</span></Link></footer>
  </div>;
}

function firstName(name) { return name ? name.split(' ')[0] : 'there'; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }

function WeeklyChart({ days = [], loading }) {
  const maximum = Math.max(...days.map((day) => day.count), 1);
  return <div className="kimu-dashboard__chart" role="img" aria-label="Attendance sessions over the last seven days">
    {days.map((day) => <div className="kimu-dashboard__chart-day" key={day.date}>
      <span className="kimu-dashboard__chart-value">{loading ? '' : day.count}</span>
      <div className="kimu-dashboard__chart-column"><span style={{ height: loading ? '0%' : `${Math.max((day.count / maximum) * 100, day.count ? 8 : 0)}%` }} /></div>
      <span className="kimu-dashboard__chart-label">{formatDay(day.date)}</span>
    </div>)}
    {!loading && days.length === 0 && <p className="kimu-dashboard__chart-empty">No attendance data for this week yet.</p>}
  </div>;
}

function Breakdown({ rows, loading }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <div className="kimu-dashboard__bar-list">{rows.map((row) => <div className="kimu-dashboard__bar-row" key={row.label}>
    <div className="kimu-dashboard__bar-heading"><span>{row.label}</span><strong>{loading ? '—' : row.value}</strong></div>
    <div className="kimu-dashboard__bar-track"><span style={{ width: loading ? '0%' : `${row.value ? Math.max((row.value / maximum) * 100, 4) : 0}%` }} /></div>
  </div>)}</div>;
}

function formatDay(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
}
