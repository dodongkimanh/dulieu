import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Tooltip, Dropdown, Badge, Modal, Form, Input, message } from 'antd';
import {
  ShoppingCartOutlined,
  TeamOutlined,
  LogoutOutlined,
  BellOutlined,
  UserOutlined,
  MoonOutlined,
  TableOutlined,
  BarChartOutlined,
  FundOutlined,
  AppstoreOutlined,
  InboxOutlined,
  CalendarOutlined,
  DollarOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';

const VNC_URL = import.meta.env.VITE_VNC_URL || null;

function ZaloIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="currentColor"/>
      <path d="M33 28.5c-.28-.14-1.63-.8-1.88-.9-.25-.1-.43-.14-.62.14-.18.28-.72.9-.88 1.08-.16.18-.33.2-.61.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.4-1.66-1.56-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.18-.28.28-.47.1-.2.05-.36-.02-.5-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.46-.62-.47-.16 0-.35-.02-.53-.02-.18 0-.48.07-.74.33-.25.27-.97.95-.97 2.32 0 1.37.99 2.7 1.13 2.88.14.18 1.96 2.99 4.75 4.2.66.28 1.18.45 1.58.58.66.21 1.27.18 1.74.11.53-.08 1.63-.67 1.86-1.3.23-.64.23-1.19.16-1.3-.07-.12-.26-.18-.54-.32z" fill="white"/>
    </svg>
  );
}

const allSidebarItems = [
  { key: '/tong-quat',       icon: <FundOutlined />,         label: 'Phân tích tổng quan',   shortLabel: 'Tổng Quan',  roles: ['ADMIN'] },
  { key: '/tin-nhan-tong-hop', icon: <InboxOutlined />,      label: 'Tin nhắn tổng hợp',     shortLabel: 'Tin Nhắn',   roles: ['ADMIN'] },
  { key: '/doanh-so',        icon: <BarChartOutlined />,     label: 'Doanh số & Mess',       shortLabel: 'DS & Mess',  roles: ['ADMIN', 'SALER'] },
  { key: '/don-hang',        icon: <ShoppingCartOutlined />, label: 'Doanh Số Tháng',        shortLabel: 'Đơn Hàng',   roles: ['ADMIN', 'KE_TOAN', 'SALER'] },
  { key: '/zalo',            icon: <ZaloIcon />,             label: 'Zalo',                  shortLabel: 'Zalo',       roles: ['ADMIN', 'SALER'] },
  { key: '/khach-hang',      icon: <TeamOutlined />,         label: 'Khách hàng',            shortLabel: 'Khách Hàng', roles: ['ADMIN', 'SALER'] },
  { key: '/nhap-lieu',       icon: <TableOutlined />,        label: 'Nhập liệu kế toán',     shortLabel: 'Nhập Liệu', roles: ['ADMIN', 'KE_TOAN'] },
  { key: '/cham-cong',       icon: <CalendarOutlined />,     label: 'Bảng Chấm Công',        shortLabel: 'Chấm Công',  roles: ['ADMIN', 'KE_TOAN', 'SALER', 'LAI_XE', 'NHAN_VIEN'] },
  { key: '/bang-luong',      icon: <DollarOutlined />,       label: 'Bảng Lương',            shortLabel: 'Bảng Lương', roles: ['ADMIN', 'KE_TOAN', 'SALER', 'LAI_XE', 'NHAN_VIEN'] },
  { key: '/kenh-tiep-thi',   icon: <AppstoreOutlined />,     label: 'Kênh tiếp thị',         shortLabel: 'Kênh TT',    roles: ['ADMIN'] },
  { key: '/users',           icon: <UserOutlined />,         label: 'Quản lý tài khoản',     shortLabel: 'Tài Khoản',  roles: ['ADMIN'] },
];

const pageTitles = {
  '/tin-nhan-tong-hop': 'Tin nhắn tổng hợp',
  '/doanh-so': 'Doanh số & Mess',
  '/don-hang': 'Doanh Số Tháng',
  '/zalo': 'Zalo',
  '/khach-hang': 'Quản lý Khách hàng',
  '/nhap-lieu': 'Nhập liệu kế toán',
  '/tong-quat': 'Phân tích tổng quan',
  '/cham-cong': 'Bảng Chấm Công',
  '/bang-luong': 'Bảng Lương',
  '/kenh-tiep-thi': 'Quản lý Kênh tiếp thị',
  '/users': 'Quản lý Tài khoản',
};


export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [pwModal, setPwModal] = useState(false);
  const [pwForm] = Form.useForm();
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    try {
      const values = await pwForm.validateFields();
      setPwLoading(true);
      await authApi.changePassword(values.currentPassword, values.newPassword);
      message.success('Đổi mật khẩu thành công!');
      setPwModal(false);
      pwForm.resetFields();
    } catch (err) {
      const errMsg = err?.response?.data?.error;
      if (errMsg) message.error(errMsg);
    } finally {
      setPwLoading(false);
    }
  };

  const roleLabel = user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'KE_TOAN' ? 'Kế toán' : user?.role === 'LAI_XE' ? 'Lái xe' : user?.role === 'NHAN_VIEN' ? 'Nhân viên' : 'Nhân viên Sale';

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

  const defaultPath = user?.role === 'ADMIN' ? '/tong-quat' : user?.role === 'KE_TOAN' ? '/don-hang' : (user?.role === 'LAI_XE' || user?.role === 'NHAN_VIEN') ? '/cham-cong' : '/doanh-so';

  return (
    <>
    <div className="sg-layout">
      {/* Icon Sidebar */}
      <aside className="sg-sidebar">
        <div className="sg-sidebar-top">
          <motion.div
            className="sg-sidebar-logo"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(defaultPath)}
          >
            <div className="sg-logo-icon" style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, color: '#fff' }}>
              KA
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
          <div className="sg-sidebar-footer-text">KA</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="sg-main">
        {/* Header */}
        <header className="sg-header">
          <h1 className="sg-header-title">{pageTitles[location.pathname] || 'CRM'}</h1>

          <div className="sg-header-right">
            {user?.role === 'ADMIN' && (
              <Tooltip title="Mở màn hình VPS" placement="bottom">
                <motion.button
                  onClick={() => VNC_URL
                    ? window.open(VNC_URL, 'zalo-vnc', 'width=1400,height=900,noopener,noreferrer')
                    : navigate('/zalo')
                  }
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#0068ff',
                    color: 'white', border: 'none', borderRadius: 8,
                    padding: '6px 12px', cursor: 'pointer', fontSize: 13,
                    fontWeight: 600, boxShadow: '0 2px 8px rgba(0,104,255,0.35)',
                  }}
                >
                  <ZaloIcon />
                  Zalo VPS
                </motion.button>
              </Tooltip>
            )}
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

            <Tooltip title="Đổi mật khẩu" placement="bottom">
              <div className="sg-header-icon" onClick={() => setPwModal(true)} style={{ cursor: 'pointer' }}>
                <LockOutlined />
              </div>
            </Tooltip>

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

      {/* Bottom Navigation — always in DOM via Portal, CSS controls visibility */}
      {createPortal(
        <nav
          className="sg-bottom-nav"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          {sidebarItems.map((item) => (
            <div
              key={item.key}
              className={`sg-bottom-nav-item ${location.pathname === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              <span className="sg-bottom-nav-icon">{item.icon}</span>
              <span className="sg-bottom-nav-label">{item.shortLabel}</span>
            </div>
          ))}
        </nav>,
        document.body
      )}

    </div>

    <Modal
      title={<span><LockOutlined style={{ color: '#7C3AED', marginRight: 8 }} />Đổi mật khẩu</span>}
      open={pwModal}
      onCancel={() => { setPwModal(false); pwForm.resetFields(); }}
      onOk={handleChangePassword}
      okText="Đổi mật khẩu"
      cancelText="Hủy"
      confirmLoading={pwLoading}
      width={400}
      destroyOnClose
    >
      <Form form={pwForm} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item label="Mật khẩu hiện tại" name="currentPassword"
          rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
          <Input.Password placeholder="Nhập mật khẩu hiện tại" />
        </Form.Item>
        <Form.Item label="Mật khẩu mới" name="newPassword"
          rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { min: 6, message: 'Ít nhất 6 ký tự' }]}>
          <Input.Password placeholder="Ít nhất 6 ký tự" />
        </Form.Item>
        <Form.Item label="Xác nhận mật khẩu mới" name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject('Mật khẩu xác nhận không khớp');
              },
            }),
          ]}>
          <Input.Password placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
