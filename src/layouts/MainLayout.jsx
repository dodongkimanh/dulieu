import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Tooltip, Dropdown, Badge } from 'antd';
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const allSidebarItems = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Tổng quan' },
  { key: '/don-hang', icon: <ShoppingCartOutlined />, label: 'Đơn hàng' },
  { key: '/khach-hang', icon: <TeamOutlined />, label: 'Khách hàng' },
  { key: '/users', icon: <UserOutlined />, label: 'Quản lý tài khoản', roles: ['ADMIN'] },
  { key: '/gioi-thieu', icon: <InfoCircleOutlined />, label: 'Giới thiệu' },
];

const pageTitles = {
  '/dashboard': 'Tổng quan',
  '/don-hang': 'Quản lý Đơn hàng',
  '/khach-hang': 'Quản lý Khách hàng',
  '/users': 'Quản lý Tài khoản',
  '/gioi-thieu': 'Giới thiệu hệ thống',
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const roleLabel = user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'KE_TOAN' ? 'Kế toán' : 'Nhân viên Sale';

  const userMenuItems = [
    { key: 'role', label: `Vai trò: ${roleLabel}`, disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const sidebarItems = allSidebarItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  });

  return (
    <div className="sg-layout">
      {/* Icon Sidebar */}
      <aside className="sg-sidebar">
        <div className="sg-sidebar-top">
          <motion.div
            className="sg-sidebar-logo"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
          >
            <div className="sg-logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </div>
          </motion.div>

          <nav className="sg-sidebar-nav">
            {sidebarItems.map((item) => (
              <Tooltip key={item.key} title={item.label} placement="right">
                <motion.div
                  className={`sg-nav-item ${location.pathname === item.key ? 'active' : ''}`}
                  onClick={() => navigate(item.key)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon}
                </motion.div>
              </Tooltip>
            ))}
          </nav>
        </div>

        <div className="sg-sidebar-bottom">
          <Tooltip title="Cài đặt" placement="right">
            <div className="sg-nav-item">
              <SettingOutlined />
            </div>
          </Tooltip>
          <div className="sg-sidebar-footer-text">KA</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="sg-main">
        {/* Header */}
        <header className="sg-header">
          <h1 className="sg-header-title">{pageTitles[location.pathname] || 'CRM'}</h1>

          <div className="sg-header-right">
            <div className="sg-status-badge">
              <span className="sg-status-dot" />
              Active
            </div>
            <div className="sg-header-icon">
              <MoonOutlined />
            </div>
            <div className="sg-header-icon">
              <Badge count={0} size="small">
                <BellOutlined />
              </Badge>
            </div>
            <div className="sg-lang-badge">VN Tiếng Việt</div>

            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight" trigger={['click']}>
              <div className="sg-user-badge">
                <div className="sg-user-avatar">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="sg-user-name">
                  {user?.fullName || user?.username}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 5l3 3 3-3" /></svg>
              </div>
            </Dropdown>
          </div>
        </header>

        {/* Page Content */}
        <main className="sg-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
