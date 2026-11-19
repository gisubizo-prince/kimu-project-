import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import { catDateKey, catHour, formatCatDate, formatCatWeekday, formatTimeRange } from '../../utils/catTime';
import './Dashboard.css';

const LESSONS = ['GPS', 'PARKING', 'CIRCULATION'];
const SHIFTS = ['09:00 - 11:30', '11:30 - 14:00', '14:30 - 16:00', '16:00 - 18:30'];
const EMPTY_SUMMARY = { totalStudents: 0, traineeStudents: 0, passStudents: 0, repeatStudents: 0, trainingStudents: 0, sessionsToday: 0, sessionsLast7Days: 0, studentsAttendedToday: 0, attendanceByLesson: {}, attendanceByShift: {}, dailyAttendanceTrend: [] };

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const today = formatCatDate(new Date());

  useEffect(() => {
    dashboardApi.summary()
      .then((response) => setSummary(response.data.data))
      .catch((requestError) => setError(requestError.message || 'Unable to load dashboard data.'));
  }, []);

  const data = summary || EMPTY_SUMMARY;
  const attendanceRate = data.trainingStudents ? Math.round((data.studentsAttendedToday / data.trainingStudents) * 100) : 0;
  const metrics = [
    { label: 'Registered students', value: data.totalStudents, detail: `${data.traineeStudents} trainee · ${data.passStudents} pass · ${data.repeatStudents} repeat`, to: '/students', tone: 'students', icon: <StudentsIcon /> },
    { label: 'In training', value: data.trainingStudents, detail: `${data.traineeStudents} trainee · ${data.repeatStudents} repeat`, to: '/students', tone: 'active', icon: <TrainingIcon /> },
    { label: 'Sessions today', value: data.sessionsToday, detail: `${data.studentsAttendedToday} students attended`, to: '/attendance', tone: 'today', icon: <AttendanceIcon /> },
    { label: 'Sessions this week', value: data.sessionsLast7Days, detail: 'Last 7 days', to: '/reports', tone: 'week', icon: <ReportIcon /> },
  ];

  return <div className="kimu-dashboard">
    <header className="kimu-dashboard__intro">
      <div><p className="kimu-eyebrow">MAITRISE / OPERATIONS</p><h2>Dashboard</h2><p>{greeting()}, {firstName(user?.fullName)} <span className="kimu-dashboard__intro-divider">·</span> {today}</p></div>
      <Link className="kimu-btn kimu-btn--primary" to="/attendance"><AttendanceIcon />Record attendance</Link>
    </header>

    {error && <div className="kimu-dashboard__error" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Retry</button></div>}

    <div className="kimu-dashboard__layout">
      <div className="kimu-dashboard__main-column">
        <section className="kimu-dashboard__metrics" aria-label="Student and attendance totals">
          {metrics.map((metric) => <Link className={`kimu-dashboard__metric kimu-dashboard__metric--${metric.tone}`} key={metric.label} to={metric.to}>
            <span className="kimu-dashboard__metric-top"><span className="kimu-dashboard__metric-label">{metric.label}</span><span className="kimu-dashboard__metric-icon" aria-hidden="true">{metric.icon}</span></span>
            <strong>{summary ? metric.value.toLocaleString() : '—'}</strong>
            <span className="kimu-dashboard__metric-detail">{summary ? metric.detail : 'Loading...'}</span>
          </Link>)}
        </section>

        <section className="kimu-dashboard__analytics" aria-label="Attendance analytics">
          <article className="kimu-panel kimu-dashboard__trend">
            <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">ATTENDANCE</p><h3>Training sessions</h3><p>Records over the last seven days</p></div><span className="kimu-dashboard__period">LAST 7 DAYS</span></div>
            <WeeklyChart days={data.dailyAttendanceTrend} loading={!summary} />
          </article>
          <article className="kimu-panel kimu-dashboard__breakdown">
            <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">TODAY</p><h3>By lesson</h3></div><span className="kimu-dashboard__panel-icon"><ReportIcon /></span></div>
            <Breakdown rows={LESSONS.map((lesson) => ({ label: lesson, value: data.attendanceByLesson?.[lesson] || 0 }))} loading={!summary} />
          </article>
        </section>

        <section className="kimu-panel kimu-dashboard__activity">
          <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">LIVE OVERVIEW</p><h3>Today&apos;s activity</h3></div><span className="kimu-dashboard__live"><i /> LIVE</span></div>
          <div className="kimu-dashboard__activity-list">
            <ActivityRow icon={<AttendanceIcon />} title="Attendance sessions recorded" detail="All lessons and shifts today" value={summary ? data.sessionsToday : '—'} to="/attendance" />
            <ActivityRow icon={<StudentsIcon />} title="Students attended" detail={`${summary ? data.trainingStudents : '—'} students currently in training`} value={summary ? data.studentsAttendedToday : '—'} to="/attendance" />
            <ActivityRow icon={<ReportIcon />} title="Sessions this week" detail="Attendance records over the last seven days" value={summary ? data.sessionsLast7Days : '—'} to="/reports" />
          </div>
        </section>
      </div>

      <aside className="kimu-dashboard__side-column">
        <CalendarPanel />
        <article className="kimu-panel kimu-dashboard__coverage">
          <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">ATTENDANCE RATE</p><h3>Student coverage</h3></div></div>
          <div className="kimu-dashboard__coverage-value"><strong>{summary ? `${attendanceRate}%` : '—'}</strong><span>of training students attended today</span></div>
          <div className="kimu-dashboard__coverage-track" role="img" aria-label={`${attendanceRate}% of training students attended today`}><span style={{ width: `${attendanceRate}%` }} /></div>
          <div className="kimu-dashboard__coverage-meta"><span>Attended</span><strong>{summary ? data.studentsAttendedToday : '—'}</strong><span>In training</span><strong>{summary ? data.trainingStudents : '—'}</strong></div>
          <Link className="kimu-dashboard__text-link" to="/attendance">Open attendance <span aria-hidden="true">&rarr;</span></Link>
        </article>
        <article className="kimu-dashboard__quick-card">
          <span className="kimu-dashboard__quick-icon"><ReportIcon /></span>
          <p className="kimu-eyebrow">QUICK ACCESS</p>
          <h3>Keep your team in sync</h3>
          <p>Go straight to the tools you use every day.</p>
          <div className="kimu-dashboard__quick-links">
            <Link to="/students">Manage students <span aria-hidden="true">&rarr;</span></Link>
            <Link to="/reports">View daily reports <span aria-hidden="true">&rarr;</span></Link>
            <Link to="/maitrise-report">Create class report <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </article>
        <article className="kimu-panel kimu-dashboard__shifts">
          <div className="kimu-dashboard__panel-head"><div><p className="kimu-eyebrow">TODAY&apos;S SCHEDULE</p><h3>By shift</h3></div></div>
          <Breakdown rows={SHIFTS.map((shift) => ({ label: formatTimeRange(shift), value: data.attendanceByShift?.[shift] || 0 }))} loading={!summary} />
        </article>
      </aside>
    </div>

    <footer className="kimu-dashboard__footer"><span>Live operational totals</span><Link to="/maitrise-report">Create daily class report <span aria-hidden="true">&rarr;</span></Link></footer>
  </div>;
}

function ActivityRow({ icon, title, detail, value, to }) {
  return <Link className="kimu-dashboard__activity-row" to={to}>
    <span className="kimu-dashboard__activity-icon" aria-hidden="true">{icon}</span>
    <span className="kimu-dashboard__activity-copy"><strong>{title}</strong><span>{detail}</span></span>
    <strong className="kimu-dashboard__activity-value">{value}</strong>
  </Link>;
}

function CalendarPanel() {
  const [monthOffset, setMonthOffset] = useState(0);
  const todayKey = catDateKey();
  const today = new Date(`${todayKey}T12:00:00.000Z`);
  const firstDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1, 12));
  const year = firstDay.getUTCFullYear();
  const month = firstDay.getUTCMonth();
  const monthTitle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'Africa/Kigali' }).format(firstDay);
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days = [...Array(offset).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];

  return <article className="kimu-panel kimu-dashboard__calendar">
    <div className="kimu-dashboard__calendar-head">
      <h3>{monthTitle}</h3>
      <div><button type="button" aria-label="Previous month" onClick={() => setMonthOffset((offsetValue) => offsetValue - 1)}>&lsaquo;</button><button type="button" aria-label="Next month" onClick={() => setMonthOffset((offsetValue) => offsetValue + 1)}>&rsaquo;</button></div>
    </div>
    <div className="kimu-dashboard__calendar-grid" role="grid" aria-label={monthTitle}>
      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => <span className="kimu-dashboard__calendar-weekday" key={day}>{day}</span>)}
      {days.map((day, index) => {
        const key = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `blank-${index}`;
        const isToday = key === todayKey;
        return <span key={key} className={`kimu-dashboard__calendar-day ${day ? '' : 'is-empty'} ${isToday ? 'is-today' : ''}`} aria-current={isToday ? 'date' : undefined}>{day || ''}</span>;
      })}
    </div>
    <p className="kimu-dashboard__calendar-note"><span /> Today</p>
  </article>;
}

function firstName(name) { return name ? name.split(' ')[0] : 'there'; }
function greeting() { const hour = catHour(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }

function WeeklyChart({ days = [], loading }) {
  const maximum = Math.max(...days.map((day) => day.count), 1);
  return <div className="kimu-dashboard__chart" role="img" aria-label="Attendance sessions over the last seven days">
    <svg className="kimu-dashboard__chart-svg" viewBox="0 0 700 190" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="attendance-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#31a58a" stopOpacity=".34" /><stop offset="100%" stopColor="#31a58a" stopOpacity=".025" /></linearGradient></defs>
      {[0, 1, 2].map((line) => <line key={line} x1="0" x2="700" y1={36 + line * 54} y2={36 + line * 54} className="kimu-dashboard__chart-gridline" />)}
      {!loading && days.length > 0 && <ChartPath days={days} maximum={maximum} />}
    </svg>
    <div className="kimu-dashboard__chart-labels">
      {days.map((day) => <span key={day.date}><strong>{loading ? '—' : day.count}</strong>{formatDay(day.date)}</span>)}
      {!loading && days.length === 0 && <p className="kimu-dashboard__chart-empty">No attendance data for this week yet.</p>}
    </div>
  </div>;
}

function ChartPath({ days, maximum }) {
  const points = days.map((day, index) => ({
    x: days.length === 1 ? 350 : 8 + (index / (days.length - 1)) * 684,
    y: 155 - (day.count / maximum) * 120,
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x} 174 L ${points[0].x} 174 Z`;
  return <><path d={area} fill="url(#attendance-area)" /><path d={line} className="kimu-dashboard__chart-line" />{points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="4" className="kimu-dashboard__chart-dot" />)}</>;
}

function Breakdown({ rows, loading }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <div className="kimu-dashboard__bar-chart">{rows.map((row, index) => <div className="kimu-dashboard__bar-column" key={row.label}>
    <strong>{loading ? '—' : row.value}</strong>
    <div className="kimu-dashboard__bar-track"><span className={`tone-${index % 4}`} style={{ height: loading ? '0%' : `${row.value ? Math.max((row.value / maximum) * 100, 5) : 2}%` }} /></div>
    <span className="kimu-dashboard__bar-label">{row.label}</span>
  </div>)}</div>;
}

function formatDay(dateKey) {
  return formatCatWeekday(dateKey);
}

function iconProps() {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
}
function StudentsIcon() { return <svg {...iconProps()}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.2 2.3-5.3 5.5-5.3s5.5 2.1 5.5 5.3M16 5.5a3 3 0 0 1 0 5.5M17 15c2 .7 3 2.3 3 5"/></svg>; }
function TrainingIcon() { return <svg {...iconProps()}><path d="m3 8 9-5 9 5-9 5-9-5Z"/><path d="M7 10.5V15c2.8 2.2 7.2 2.2 10 0v-4.5M21 8v6"/></svg>; }
function AttendanceIcon() { return <svg {...iconProps()}><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18m-13 5 2 2 4-4"/></svg>; }
function ReportIcon() { return <svg {...iconProps()}><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/></svg>; }
