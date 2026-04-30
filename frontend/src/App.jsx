import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
// Auth pages
import Login from './pages/Login';
import Signup from './pages/Signup';
// App pages
import Dashboard from './pages/Dashboard';
import MedicineInventory from './pages/MedicineInventory';
import CustomersList from './pages/CustomersList';
import SuppliersList from './pages/SuppliersList';
import ReportsOverview from './pages/ReportsOverview';

const ProtectedRoute = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="medicines" element={<MedicineInventory />} />
            <Route path="customers" element={<CustomersList />} />
            <Route path="suppliers" element={<SuppliersList />} />
            <Route path="reports" element={<ReportsOverview />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
