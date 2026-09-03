import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import './Dashboard.css';

// Dashboard values are loaded from the API and default to zero while loading.
const STATS = [
  { key: 'presentToday', label: 'Present Today', to: '/attendance/list?status=present' },
  { key: 'lateToday', label: 'Late Today', to: '/attendance/list?status=late' },
  { key: 'absentToday', label: 'Absent Today', to: '/attendance/list?status=absent' },
  { key: 'visitorsToday', label: 'Visitors Today', to: '/visitors/list' },
];

const QUICK_ACTIONS = [
 
  'Record Visitor',
  'Record Attendance',
  'Generate Report',
];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ presentToday: 0, lateToday: 0, absentToday: 0, visitorsToday: 0 });
  useEffect(() => { dashboardApi.summary().then((response) => setSummary(response.data.data)).catch(() => {}); }, []);
  const today = new Date().toLocaleDateString('en-RW', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="kimu-dashboard">
      <div className="kimu-dashboard__intro">
        <h2>{greeting()}, {firstName(user?.fullName)}</h2>
        <p>{today}</p>
      </div>

      <div className="kimu-stat-grid">
        {STATS.map((stat) => (
          <Link className="kimu-stat-card" key={stat.key} to={stat.to}>
            <span className="kimu-stat-card__label">{stat.label}</span>
            <span className="kimu-stat-card__value">{summary[stat.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="kimu-dashboard__grid">
        <section className="kimu-panel">
          <h3>Attendance overview</h3>
          <div className="kimu-chart kimu-chart--attendance" role="img" aria-label={`Attendance: ${summary.presentToday} present and ${summary.absentToday ?? 0} absent`}>
            <div className="kimu-chart__legend"><span><i className="kimu-chart__dot kimu-chart__dot--present" />Present <strong>{summary.presentToday}</strong></span><span><i className="kimu-chart__dot kimu-chart__dot--absent" />Absent <strong>{summary.absentToday ?? 0}</strong></span></div>
            <div className="kimu-chart__bar"><span className="kimu-chart__present" style={{ width: `${attendancePercent(summary.presentToday, summary.absentToday)}%` }} /></div>
            <p className="kimu-chart__caption">Live employee attendance for today</p>
          </div>
        </section>

        <section className="kimu-panel">
          <h3>Today&apos;s activity</h3>
          <div className="kimu-activity-chart" role="img" aria-label={`${summary.visitorsToday ?? 0} visitors and ${summary.presentToday} employee arrivals today`}>
            <div className="kimu-activity-chart__item"><div className="kimu-activity-chart__label"><span>Employee arrivals</span><strong>{summary.presentToday}</strong></div><div className="kimu-activity-chart__track"><span style={{ width: `${activityPercent(summary.presentToday, summary.visitorsToday)}%` }} /></div></div>
            <div className="kimu-activity-chart__item"><div className="kimu-activity-chart__label"><span>Visitor check-ins</span><strong>{summary.visitorsToday ?? 0}</strong></div><div className="kimu-activity-chart__track kimu-activity-chart__track--visitor"><span style={{ width: `${activityPercent(summary.visitorsToday, summary.presentToday)}%` }} /></div></div>
            <p className="kimu-chart__caption">Recorded actions since midnight</p>
          </div>
        </section>
      </div>

      <section className="kimu-panel">
        <h3>Quick actions</h3>
        <div className="kimu-quick-actions">
          {QUICK_ACTIONS.map((label) => (
            <Link className="kimu-btn kimu-btn--secondary" key={label} to={label === 'Record Visitor' ? '/visitors' : label === 'Record Attendance' ? '/attendance' : '/reports'}>
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function firstName(name) {
  if (!name) return 'there';
  return name.split(' ')[0];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function attendancePercent(present, absent = 0) {
  const total = present + absent;
  return total ? Math.round((present / total) * 100) : 0;
}

function activityPercent(value, comparison = 0) {
  const total = Math.max(value, comparison, 1);
  return Math.round((value / total) * 100);
}
