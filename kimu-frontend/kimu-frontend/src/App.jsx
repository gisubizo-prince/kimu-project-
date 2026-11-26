import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoadingIndicator, { NetworkLoader } from './components/common/LoadingIndicator';

const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Attendance = lazy(() => import('./pages/Attendance/Attendance'));
const Visitors = lazy(() => import('./pages/Visitors/Visitors'));
const Reports = lazy(() => import('./pages/Reports/Reports'));
const Notifications = lazy(() => import('./pages/Notifications/Notifications'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const AdminControls = lazy(() => import('./pages/Settings/Settings').then((module) => ({ default: module.AdminControls })));
const Students = lazy(() => import('./pages/Students/Students'));
const VisitorList = lazy(() => import('./pages/Visitors/VisitorList'));
const MaitriseReport = lazy(() => import('./pages/MaitriseReport/MaitriseReport'));
const AdminReport = lazy(() => import('./pages/AdminReport/AdminReport'));
const Home = lazy(() => import('./pages/Home/Home'));
const Contacts = lazy(() => import('./pages/Contacts/Contacts'));
const Testimonials = lazy(() => import('./pages/Testimonials/Testimonials'));
const TaxiDrivers = lazy(() => import('./pages/TaxiDrivers/TaxiDrivers'));
const TaxiDriverDetails = lazy(() => import('./pages/TaxiDrivers/TaxiDriverDetails'));
const TrainedDrivers = lazy(() => import('./pages/TrainedDrivers/TrainedDrivers'));
const Certverify = lazy(() => import('./pages/Certverify/Certverify'));
const VerifyCertificate = lazy(() => import('./pages/Certverify/VerifyCertificate'));

function RouteCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = new URL(pathname || '/', 'https://www.kimudigital.com').href;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteCanonical />
      <AuthProvider>
        <NetworkLoader />
        <Suspense fallback={<LoadingIndicator />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-certificate/:id" element={<VerifyCertificate />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/certverify" element={<ProtectedRoute roles={['super_admin', 'admin']}><Certverify /></ProtectedRoute>} />
            <Route path="/students" element={<Students />} />
            <Route path="/trained-drivers" element={<ProtectedRoute roles={['super_admin', 'admin', 'hr_staff', 'manager']}><TrainedDrivers /></ProtectedRoute>} />
            <Route path="/employees" element={<Navigate to="/students" replace />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/list" element={<Navigate to="/attendance" replace />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/visitors/list" element={<VisitorList />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/maitrise-report" element={<MaitriseReport />} />
            <Route path="/admin-report" element={<ProtectedRoute roles={['super_admin', 'admin']}><AdminReport /></ProtectedRoute>} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/admin" element={<ProtectedRoute roles={['super_admin', 'admin']}><AdminControls /></ProtectedRoute>} />
            <Route path="/testimonials/manage" element={<ProtectedRoute roles={['super_admin', 'admin']}><Testimonials /></ProtectedRoute>} />
            <Route path="/taxi-drivers/manage" element={<ProtectedRoute roles={['super_admin', 'admin']}><TaxiDrivers /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Home />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/taxi-drivers/:id" element={<TaxiDriverDetails />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
