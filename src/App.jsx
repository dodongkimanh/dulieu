import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
const HopThuZalo = lazy(() => import('./pages/HopThuZalo'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
    <Spin size="large" />
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const target = user.role === 'ADMIN' ? '/tong-quat' : user.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
    return <Navigate to={target} replace />;
  }
  return children;
}

function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    const fallback = user.role === 'ADMIN' ? '/tong-quat' : user.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  const target = user?.role === 'ADMIN' ? '/tong-quat' : user?.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
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
            <Route path="don-hang" element={<Suspense fallback={<PageLoader />}><DonHang /></Suspense>} />
            <Route path="zalo" element={<RoleRoute roles={['ADMIN', 'SALER']}><Suspense fallback={<PageLoader />}><Zalo /></Suspense></RoleRoute>} />
            <Route path="khach-hang" element={<RoleRoute roles={['ADMIN', 'SALER']}><Suspense fallback={<PageLoader />}><KhachHang /></Suspense></RoleRoute>} />
            <Route path="nhap-lieu" element={<RoleRoute roles={['ADMIN', 'KE_TOAN']}><Suspense fallback={<PageLoader />}><NhapLieu /></Suspense></RoleRoute>} />
            <Route path="doanh-so" element={<RoleRoute roles={['ADMIN', 'SALER']}><Suspense fallback={<PageLoader />}><DoanhSo /></Suspense></RoleRoute>} />
            <Route path="users" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><UserManagement /></Suspense></RoleRoute>} />
            <Route path="tong-quat" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><TongQuat /></Suspense></RoleRoute>} />
            <Route path="tin-nhan-tong-hop" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><TinNhanTongHop /></Suspense></RoleRoute>} />
            <Route path="hop-thu-zalo" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><HopThuZalo /></Suspense></RoleRoute>} />
            <Route path="kenh-tiep-thi" element={<RoleRoute roles={['ADMIN']}><Suspense fallback={<PageLoader />}><KenhTiepThi /></Suspense></RoleRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
