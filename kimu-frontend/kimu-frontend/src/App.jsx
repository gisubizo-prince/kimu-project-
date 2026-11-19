import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { NetworkLoader } from './components/common/LoadingIndicator';

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
import Home from './pages/Home/Home';
import Contacts from './pages/Contacts/Contacts';
import Testimonials from './pages/Testimonials/Testimonials';
import TaxiDrivers from './pages/TaxiDrivers/TaxiDrivers';
import TaxiDriverDetails from './pages/TaxiDrivers/TaxiDriverDetails';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NetworkLoader />
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
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/admin" element={<ProtectedRoute roles={['super_admin', 'admin']}><AdminControls /></ProtectedRoute>} />
            <Route path="/testimonials/manage" element={<ProtectedRoute roles={['super_admin', 'admin']}><Testimonials /></ProtectedRoute>} />
            <Route path="/taxi-drivers/manage" element={<ProtectedRoute roles={['super_admin', 'admin']}><TaxiDrivers /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Home />} />
          <Route path="/taxi-drivers/:id" element={<TaxiDriverDetails />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
