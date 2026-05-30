import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Tooltip, Dropdown, Badge, Popover } from 'antd';
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
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const SERVICE_BASE = import.meta.env.VITE_ZALO_SERVICE || 'http://66.42.61.149:3001';
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
  { key: '/tong-quat', icon: <FundOutlined />, label: 'Phân tích tổng quan', roles: ['ADMIN'] },
  { key: '/tin-nhan-tong-hop', icon: <InboxOutlined />, label: 'Tin nhắn tổng hợp', roles: ['ADMIN'] },
  { key: '/hop-thu-zalo', icon: <ZaloIcon />, label: 'Hộp thư Zalo', roles: ['ADMIN'] },
  { key: '/doanh-so', icon: <BarChartOutlined />, label: 'Doanh số & Mess', roles: ['ADMIN', 'SALER'] },
  { key: '/don-hang', icon: <ShoppingCartOutlined />, label: 'Đơn hàng', roles: ['ADMIN', 'KE_TOAN', 'SALER'] },
  { key: '/zalo', icon: <ZaloIcon />, label: 'Zalo', roles: ['ADMIN', 'SALER'] },
  { key: '/khach-hang', icon: <TeamOutlined />, label: 'Khách hàng', roles: ['ADMIN', 'SALER'] },
  { key: '/nhap-lieu', icon: <TableOutlined />, label: 'Nhập liệu kế toán', roles: ['ADMIN', 'KE_TOAN'] },
  { key: '/kenh-tiep-thi', icon: <AppstoreOutlined />, label: 'Kênh tiếp thị', roles: ['ADMIN'] },
  { key: '/users', icon: <UserOutlined />, label: 'Quản lý tài khoản', roles: ['ADMIN'] },
];

const pageTitles = {
  '/tin-nhan-tong-hop': 'Tin nhắn tổng hợp',
  '/hop-thu-zalo': 'Hộp thư Zalo',
  '/doanh-so': 'Doanh số & Mess',
  '/don-hang': 'Quản lý Đơn hàng',
  '/zalo': 'Zalo',
  '/khach-hang': 'Quản lý Khách hàng',
  '/nhap-lieu': 'Nhập liệu kế toán',
  '/tong-quat': 'Phân tích tổng quan',
  '/kenh-tiep-thi': 'Quản lý Kênh tiếp thị',
  '/users': 'Quản lý Tài khoản',
};

function ZaloFloatingBtn({ navigate, location }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const fetch_ = () => {
      fetch(`${SERVICE_BASE}/sessions`)
        .then(r => r.json())
        .then(d => setSessions(Array.isArray(d) ? d : []))
        .catch(() => {});
    };
    fetch_();
    timerRef.current = setInterval(fetch_, 30000);
    return () => clearInterval(timerRef.current);
  }, [user?.role]);

  if (user?.role !== 'ADMIN') return null;

  const onlineCount = sessions.filter(s => s.status === 'online').length;

  const content = (
    <div style={{ width: 260, maxHeight: 360, overflowY: 'auto' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#0068FF', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
        Zalo VPS — {onlineCount}/{sessions.length} online
      </div>
      {sessions.length === 0 && (
        <div style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Không có session nào</div>
      )}
      {sessions.map(s => (
        <div
          key={s.sessionId}
          onClick={() => { setOpen(false); navigate('/zalo'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 4px',
            borderRadius: 6, cursor: 'pointer', transition: 'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: '#0068FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {(s.name || s.sessionId)?.charAt(0)?.toUpperCase() || 'Z'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name || s.sessionId}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.phone || s.sessionId}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {s.status === 'online'
              ? <><WifiOutlined style={{ color: '#22C55E', fontSize: 12 }} /><span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>Online</span></>
              : <><DisconnectOutlined style={{ color: '#9CA3AF', fontSize: 12 }} /><span style={{ fontSize: 11, color: '#9CA3AF' }}>Offline</span></>
            }
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="topRight"
    >
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0068FF 0%, #0052cc 100%)',
          boxShadow: '0 4px 16px rgba(0,104,255,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <ZaloIcon />
        {onlineCount > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            background: '#22C55E', color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {onlineCount}
          </div>
        )}
      </motion.div>
    </Popover>
  );
}

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

  const defaultPath = user?.role === 'ADMIN' ? '/tong-quat' : user?.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';

  return (
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

      <ZaloFloatingBtn navigate={navigate} location={location} />
    </div>
  );
}
