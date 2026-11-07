import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './AppLayout.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/employees': 'Students',
  '/attendance': 'Attendance',
  '/visitors': 'Visitor Management',
  '/reports': 'Daily Reports',
  '/maitrise-report': 'MAITRISE REPORT',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/settings/admin': 'System Controls',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const pageTitle = PAGE_TITLES[location.pathname] || 'METRIZE';

  return (
    <div className="kimu-shell">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {mobileOpen && <div className="kimu-shell__overlay" onClick={() => setMobileOpen(false)} />}

      <div className="kimu-shell__main">
        <Header
          pageTitle={pageTitle}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />
        <main className="kimu-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
