import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Attendance from './pages/Attendance/Attendance';
import Visitors from './pages/Visitors/Visitors';
import Reports from './pages/Reports/Reports';
import Notifications from './pages/Notifications/Notifications';
import Settings, { AdminControls } from './pages/Settings/Settings';
import Students from './pages/Students/Students';
import VisitorList from './pages/Visitors/VisitorList';
import MaitriseReport from './pages/MaitriseReport/MaitriseReport';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/employees" element={<Navigate to="/students" replace />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/list" element={<Navigate to="/attendance" replace />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/visitors/list" element={<VisitorList />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/maitrise-report" element={<MaitriseReport />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/admin" element={<ProtectedRoute roles={['super_admin', 'admin']}><AdminControls /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
