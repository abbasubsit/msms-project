import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';

// ─── Auth Pages (Public) ──────────────────────────────────────────────────────
import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

// ─── App Pages (Protected) ───────────────────────────────────────────────────
import Dashboard       from './pages/Dashboard';
import MedicineInventory from './pages/MedicineInventory';
import CustomersList   from './pages/CustomersList';
import SuppliersList   from './pages/SuppliersList';
import ReportsOverview from './pages/ReportsOverview';
import Sales           from './pages/Sales';
import Purchases       from './pages/Purchases';

// ─── User Management Pages (NEW) ─────────────────────────────────────────────
import UserManagement  from './pages/UserManagement';
import ChangePassword  from './pages/ChangePassword';
import Profile         from './pages/Profile';

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute — requires authentication
// Optionally restricts to specific roles via allowedRoles prop
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = React.useContext(AuthContext);

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role restriction enforced
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public Routes ─────────────────────────────────────────────── */}
          <Route path="/login"              element={<Login />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Signup disabled — redirect to login */}
          <Route path="/signup" element={<Navigate to="/login" replace />} />

          {/* ── Protected Routes (all authenticated users) ─────────────────── */}
          {/* Change Password — standalone page (outside Layout, accessible even on first login) */}
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />

          {/* Layout-wrapped routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Dashboard */}
            <Route index element={<Dashboard />} />

            {/* Profile */}
            <Route path="profile" element={<Profile />} />

            {/* ── Pharmacist & Super Admin Routes ─────────────────────────── */}
            <Route path="medicines" element={
              <ProtectedRoute allowedRoles={['super_admin', 'pharmacist']}>
                <MedicineInventory />
              </ProtectedRoute>
            } />
            <Route path="suppliers" element={
              <ProtectedRoute allowedRoles={['super_admin', 'pharmacist']}>
                <SuppliersList />
              </ProtectedRoute>
            } />
            <Route path="purchases" element={
              <ProtectedRoute allowedRoles={['super_admin', 'pharmacist']}>
                <Purchases />
              </ProtectedRoute>
            } />

            {/* ── Sales Staff & Super Admin Routes ────────────────────────── */}
            <Route path="customers" element={
              <ProtectedRoute allowedRoles={['super_admin', 'sales_staff', 'pharmacist']}>
                <CustomersList />
              </ProtectedRoute>
            } />
            <Route path="sales" element={
              <ProtectedRoute allowedRoles={['super_admin', 'sales_staff', 'pharmacist']}>
                <Sales />
              </ProtectedRoute>
            } />

            {/* ── Reports — super_admin & pharmacist ──────────────────────── */}
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['super_admin', 'pharmacist']}>
                <ReportsOverview />
              </ProtectedRoute>
            } />

            {/* ── Super Admin Only Routes ──────────────────────────────────── */}
            <Route path="admin/users" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
          </Route>

          {/* Fallback — redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
