import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import App from './App.jsx'
import './App.css'

// Configure dayjs timezone globally — Vietnam (UTC+7)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Ho_Chi_Minh')

// PWA: khóa màn hình ngang
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  try { screen.orientation.lock('landscape').catch(() => {}) } catch {}
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#4F46E5',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorInfo: '#3B82F6',
          colorBgContainer: '#FFFFFF',
          colorBgElevated: '#FFFFFF',
          colorBgLayout: '#F1F5F9',
          colorText: '#0F172A',
          colorTextSecondary: '#64748B',
          colorBorder: '#E2E8F0',
          borderRadius: 10,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 14,
          controlHeight: 40,
        },
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(79, 70, 229, 0.15)',
            darkItemHoverBg: 'rgba(255,255,255,0.06)',
          },
          Table: {
            headerBg: '#F8FAFC',
            headerColor: '#475569',
            rowHoverBg: '#F1F5F9',
          },
          Button: {
            primaryShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
          },
          Card: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          },
          Input: {
            activeBorderColor: '#4F46E5',
            hoverBorderColor: '#818CF8',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
