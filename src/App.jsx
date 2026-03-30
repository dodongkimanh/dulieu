import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DonHang from './pages/DonHang';
import KhachHang from './pages/KhachHang';
import GioiThieu from './pages/GioiThieu';
import UserManagement from './pages/UserManagement';
import NhapLieu from './pages/NhapLieu';
import TongQuat from './pages/TongQuat';
import DoanhSo from './pages/DoanhSo';
import Login from './pages/Login';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="don-hang" element={<DonHang />} />
            <Route path="khach-hang" element={<KhachHang />} />
            <Route path="nhap-lieu" element={<RoleRoute roles={['ADMIN', 'KE_TOAN']}><NhapLieu /></RoleRoute>} />
            <Route path="tong-quat" element={<RoleRoute roles={['ADMIN', 'KE_TOAN']}><TongQuat /></RoleRoute>} />
            <Route path="doanh-so" element={<DoanhSo />} />
            <Route path="gioi-thieu" element={<GioiThieu />} />
            <Route path="users" element={<RoleRoute roles={['ADMIN']}><UserManagement /></RoleRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
