import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../services/api';
import './Header.css';

export default function Header({ pageTitle, onToggleSidebar, onToggleMobile }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  async function loadAlerts() { try { const response = await notificationApi.list(); setAlerts(response.data.data || []); } catch { setAlerts([]); } }
  useEffect(() => { loadAlerts(); }, []);
  async function markRead(id) { try { await notificationApi.markRead(id); setAlerts(alerts.map((alert) => alert._id === id ? { ...alert, read: true } : alert)); } catch { /* Full inbox remains available if the request fails. */ } }

  return (
    <header className="kimu-header">
      <div className="kimu-header__left">
        <button
          className="kimu-header__icon-btn kimu-header__icon-btn--desktop"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
        <button
          className="kimu-header__icon-btn kimu-header__icon-btn--mobile"
          onClick={onToggleMobile}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <h1 className="kimu-header__title">{pageTitle}</h1>
      </div>

      <div className="kimu-header__right">
        <div className="kimu-header__notifications"><button className="kimu-header__icon-btn" aria-label="Open notifications" onClick={() => setOpen(!open)}><BellIcon />{alerts.some((alert) => !alert.read) && <span className="kimu-header__badge">{alerts.filter((alert) => !alert.read).length}</span>}</button>{open && <div className="kimu-header__dropdown"><div className="kimu-header__dropdown-head"><strong>Notifications</strong><Link to="/notifications" onClick={() => setOpen(false)}>View all</Link></div>{alerts.length === 0 ? <p className="kimu-header__empty">No new alerts</p> : alerts.slice(0, 4).map((alert) => <button className={`kimu-header__alert ${alert.read ? 'is-read' : ''}`} key={alert._id} onClick={() => markRead(alert._id)}><strong>{alert.title}</strong><span>{alert.description}</span></button>)}</div>}</div>
        <span className="kimu-header__greeting">
          {greeting()}, <strong>{firstName(user?.fullName)}</strong>
        </span>
      </div>
    </header>
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

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function BellIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
}
