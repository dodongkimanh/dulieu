import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const savedUser = localStorage.getItem('crm_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
      }
    }
    setLoading(false);

    // Lắng nghe sự kiện 401/403 từ api interceptor — không reload trang
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, ...userData } = res.data;
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  }, []);

  const value = useMemo(() => {
    const isAdmin = user?.role === 'ADMIN';
    const isKeToan = user?.role === 'KE_TOAN';
    const isSaler = user?.role === 'SALER';
    const isLaiXe = user?.role === 'LAI_XE';
    const isNhanVien = user?.role === 'NHAN_VIEN';
    const isEmployeeView = isLaiXe || isNhanVien || isSaler;
    const canViewOrders = isAdmin || isKeToan;
    return { user, login, logout, loading, isAdmin, isKeToan, isSaler, isLaiXe, isNhanVien, isEmployeeView, canViewOrders };
  }, [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
