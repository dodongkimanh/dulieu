import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import DonHang from './pages/DonHang';
import KhachHang from './pages/KhachHang';
import GioiThieu from './pages/GioiThieu';
import UserManagement from './pages/UserManagement';
import NhapLieu from './pages/NhapLieu';
import DoanhSo from './pages/DoanhSo';
import TongQuat from './pages/TongQuat';
import KenhTiepThi from './pages/KenhTiepThi';
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
  if (user) {
    const target = user.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
    return <Navigate to={target} replace />;
  }
  return children;
}

function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    const fallback = user.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  const target = user?.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="don-hang" element={<DonHang />} />
            <Route path="khach-hang" element={<RoleRoute roles={['ADMIN', 'SALER']}><KhachHang /></RoleRoute>} />
            <Route path="nhap-lieu" element={<RoleRoute roles={['ADMIN', 'KE_TOAN']}><NhapLieu /></RoleRoute>} />
            <Route path="doanh-so" element={<RoleRoute roles={['ADMIN', 'SALER']}><DoanhSo /></RoleRoute>} />
            <Route path="gioi-thieu" element={<RoleRoute roles={['ADMIN', 'SALER']}><GioiThieu /></RoleRoute>} />
            <Route path="users" element={<RoleRoute roles={['ADMIN']}><UserManagement /></RoleRoute>} />
            <Route path="tong-quat" element={<RoleRoute roles={['ADMIN']}><TongQuat /></RoleRoute>} />
            <Route path="kenh-tiep-thi" element={<RoleRoute roles={['ADMIN']}><KenhTiepThi /></RoleRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
