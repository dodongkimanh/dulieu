import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('crm_token');
    const savedUser = sessionStorage.getItem('crm_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        sessionStorage.removeItem('crm_token');
        sessionStorage.removeItem('crm_user');
      }
    }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setLoading(false);

    // Lắng nghe sự kiện 401/403 từ api interceptor — không reload trang
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, ...userData } = res.data;
    sessionStorage.setItem('crm_token', token);
    sessionStorage.setItem('crm_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    sessionStorage.removeItem('crm_token');
    sessionStorage.removeItem('crm_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isKeToan = user?.role === 'KE_TOAN';
  const isSaler = user?.role === 'SALER';
  const canViewOrders = isAdmin || isKeToan;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isKeToan, isSaler, canViewOrders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
