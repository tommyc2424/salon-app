import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SalonProvider, useSalon } from './context/SalonContext';
import AuthPage        from './components/auth/AuthPage';
import Nav             from './components/layout/Nav';
import Dashboard       from './pages/Dashboard';
import SalonDirectory  from './pages/SalonDirectory';
import Services        from './pages/Services';
import BookingFlow     from './pages/BookingFlow';
import StaffDashboard  from './pages/staff/StaffDashboard';
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminBookings   from './pages/admin/AdminBookings';
import AdminServices   from './pages/admin/AdminServices';
import AdminStaff      from './pages/admin/AdminStaff';
import AdminSalons     from './pages/admin/AdminSalons';
import AdminClients    from './pages/admin/AdminClients';
import SalonLanding    from './pages/SalonLanding';
import './App.css';

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { salonRole, loading: salonLoading } = useSalon();

  if (authLoading || salonLoading) return <div className="loading">Loading...</div>;
  if (!user) return <AuthPage />;

  const isAdmin = salonRole === 'owner' || salonRole === 'admin';
  const isStaff = salonRole === 'staff';

  return (
    <BrowserRouter>
      <Nav />
      <div className="main-content">
        <Routes>
          <Route path="/salons" element={<SalonDirectory />} />

          {isAdmin && <>
            <Route path="/admin"           element={<AdminDashboard />} />
            <Route path="/admin/bookings"  element={<AdminBookings />} />
            <Route path="/admin/services"  element={<AdminServices />} />
            <Route path="/admin/staff"     element={<AdminStaff />} />
            <Route path="/admin/clients"   element={<AdminClients />} />
            <Route path="/admin/salons"    element={<AdminSalons />} />
            <Route path="/"                element={<Navigate to="/admin" />} />
          </>}

          {isStaff && !isAdmin && <>
            <Route path="/staff"           element={<StaffDashboard />} />
            <Route path="/services"        element={<Services />} />
            <Route path="/"                element={<Navigate to="/staff" />} />
          </>}

          {!isAdmin && !isStaff && <>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/services"        element={<Services />} />
            <Route path="/book"            element={<BookingFlow />} />
          </>}

          <Route path="/s/:slug" element={<SalonLanding />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SalonProvider>
        <AppRoutes />
      </SalonProvider>
    </AuthProvider>
  );
}
