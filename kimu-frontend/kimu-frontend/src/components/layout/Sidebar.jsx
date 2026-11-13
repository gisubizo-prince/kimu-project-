import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import kimuMark from '../../assets/LETTER HEAD.png';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: GridIcon },
  { to: '/students', label: 'Students', icon: UsersIcon },
  { to: '/attendance', label: 'Attendance', icon: ClockIcon },
  { to: '/reports', label: 'Daily Reports', icon: ChartIcon },
  { to: '/maitrise-report', label: 'MAITRISE REPORT', icon: ReportIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
];

export default function Sidebar({ collapsed, mobileOpen, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`kimu-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-open' : ''}`}
    >
      <div className="kimu-sidebar__brand">
        <img src={kimuMark} alt="" className="kimu-sidebar__mark" />
        {!collapsed && (
          <div className="kimu-sidebar__brand-text">
            <span className="kimu-sidebar__brand-name">MAITRISE</span>
            <span className="kimu-sidebar__brand-sub">Training Management</span>
          </div>
        )}
      </div>

      <nav className="kimu-sidebar__nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `kimu-sidebar__link ${isActive ? 'is-active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="kimu-sidebar__footer">
        <div className="kimu-sidebar__user">
          <div className="kimu-sidebar__avatar">{initials(user?.fullName)}</div>
          {!collapsed && (
            <div className="kimu-sidebar__user-info">
              <span className="kimu-sidebar__user-name">{user?.fullName || 'User'}</span>
              <span className="kimu-sidebar__user-role">{formatRole(user?.role)}</span>
            </div>
          )}
        </div>
        <button className="kimu-sidebar__logout" onClick={logout} title="Log out">
          <LogoutIcon />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}

function initials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRole(role) {
  if (!role) return '';
  return role
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/* --- Inline icon set (no external icon dependency) --- */
function iconProps() {
  return { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
}
function GridIcon() { return <svg {...iconProps()}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function UsersIcon() { return <svg {...iconProps()}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><circle cx="17" cy="8.5" r="2.5"/><path d="M15.5 14.5c2.6.3 4.5 2.3 4.5 5.5"/></svg>; }
function SteeringIcon() { return <svg {...iconProps()}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 10V4M8.5 15.5 4.5 18M15.5 15.5l4 2.5"/></svg>; }
function TruckIcon() { return <svg {...iconProps()}><rect x="2" y="7" width="12" height="9" rx="1.2"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6.5" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>; }
function ClockIcon() { return <svg {...iconProps()}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>; }
function BadgeIcon() { return <svg {...iconProps()}><rect x="5" y="4" width="14" height="17" rx="2"/><circle cx="12" cy="10.5" r="2.5"/><path d="M8.5 17c.6-1.6 1.9-2.5 3.5-2.5s2.9.9 3.5 2.5"/></svg>; }
function ChartIcon() { return <svg {...iconProps()}><path d="M4 20V10M11 20V4M18 20v-7"/><path d="M3 20h18"/></svg>; }
function ReportIcon() { return <svg {...iconProps()}><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/></svg>; }
function BellIcon() { return <svg {...iconProps()}><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>; }
function GearIcon() { return <svg {...iconProps()}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>; }
function LogoutIcon() { return <svg {...iconProps()}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>; }
