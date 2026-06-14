import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import './App.css';

const DonHang = lazy(() => import('./pages/DonHang'));
const KhachHang = lazy(() => import('./pages/KhachHang'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const NhapLieu = lazy(() => import('./pages/NhapLieu'));
const DoanhSo = lazy(() => import('./pages/DoanhSo'));
const TongQuat = lazy(() => import('./pages/TongQuat'));
const KenhTiepThi = lazy(() => import('./pages/KenhTiepThi'));
const Zalo = lazy(() => import('./pages/Zalo'));
const TinNhanTongHop = lazy(() => import('./pages/TinNhanTongHop'));
const ChamCong = lazy(() => import('./pages/ChamCong'));
const BangLuong = lazy(() => import('./pages/BangLuong'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
    <Spin size="large" />
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

function getDefaultPath(role) {
  if (role === 'ADMIN') return '/tong-quat';
  if (role === 'KE_TOAN') return '/don-hang';
  if (role === 'LAI_XE' || role === 'NHAN_VIEN') return '/cham-cong';
  return '/doanh-so';
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getDefaultPath(user.role)} replace />;
  return children;
}

function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!roles.includes(user.role)) return <Navigate to={getDefaultPath(user.role)} replace />;
  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultPath(user?.role)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="don-hang" element={<Suspense fallback={<PageLoader />}><DonHang /></Suspense>} />
            <Route path="zalo" element={<RoleRoute roles={['ADMIN', 'SALER']}><Suspense fallback={<PageLoader />}><Zalo /></Suspense></RoleRoute>} />
            <Route path="khach-hang" element={<RoleRoute roles={['ADMIN', 'SALER']}><Suspense fallback={<PageLoader />}><KhachHang /></Suspense></RoleRoute>} />
            <Route path="nhap-lieu" element={<RoleRoute roles={['ADMIN', 'KE_TOAN']}><Suspense fallback={<PageLoader />}><NhapLieu /></Suspense></RoleRoute>} />
            <Route path="doanh-so" element={<RoleRoute roles={['ADMIN', 'SALER']}><Suspense fallback={<PageLoader />}><DoanhSo /></Suspense></RoleRoute>} />
            <Route path="users" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><UserManagement /></Suspense></RoleRoute>} />
            <Route path="tong-quat" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><TongQuat /></Suspense></RoleRoute>} />
            <Route path="tin-nhan-tong-hop" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><TinNhanTongHop /></Suspense></RoleRoute>} />
            <Route path="kenh-tiep-thi" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><KenhTiepThi /></Suspense></RoleRoute>} />
            <Route path="cham-cong" element={<RoleRoute roles={['ADMIN', 'KE_TOAN', 'SALER', 'LAI_XE', 'NHAN_VIEN']}><Suspense fallback={<PageLoader />}><ChamCong /></Suspense></RoleRoute>} />
            <Route path="bang-luong" element={<RoleRoute roles={['ADMIN', 'KE_TOAN', 'SALER', 'LAI_XE', 'NHAN_VIEN']}><Suspense fallback={<PageLoader />}><BangLuong /></Suspense></RoleRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
