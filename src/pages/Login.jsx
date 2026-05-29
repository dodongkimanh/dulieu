import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { MailOutlined, LockOutlined, ArrowRightOutlined, SyncOutlined, ApiOutlined, BarChartOutlined, TeamOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const userData = await login(values.username, values.password);
      message.success('Đăng nhập thành công!');
      const target = userData.role === 'ADMIN' ? '/tong-quat' : userData.role === 'KE_TOAN' ? '/don-hang' : '/doanh-so';
      navigate(target);
    } catch (err) {
      message.error(err.response?.data?.error || 'Sai tài khoản hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const featureBadges = [
    { icon: <SyncOutlined />, title: 'Sẵn sàng', desc: 'Đồng bộ đơn hàng' },
    { icon: <TeamOutlined />, title: 'Sẵn sàng', desc: 'Quản lý khách hàng' },
    { icon: <BarChartOutlined />, title: 'Real-time', desc: 'Báo cáo doanh thu' },
    { icon: <ApiOutlined />, title: 'Đa kênh', desc: 'Quản lý bán hàng' },
  ];

  return (
    <div className="login-page">
      {/* Left Panel - Brand */}
      <motion.div
        className="login-left"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-left-content">
          <div className="login-brand">
            <div className="login-brand-icon">KA</div>
            <span className="login-brand-name">Đồ Đồng Kim Ánh</span>
          </div>
          <div className="login-brand-sub">CRM Management Platform</div>

          <div className="login-hero-text">
            <h1>Quản lý bán hàng<br />thông minh hơn</h1>
            <p>
              Quản lý đơn hàng, khách hàng, doanh thu và phân tích hiệu quả kinh doanh
              với ROAS, CPA trong một nền tảng duy nhất.
            </p>
          </div>

          <div className="login-features-grid">
            {featureBadges.map((f, i) => (
              <motion.div
                key={i}
                className="login-feature-badge"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              >
                <div className="login-feature-title">{f.title}</div>
                <div className="login-feature-desc">{f.desc}</div>
              </motion.div>
            ))}
          </div>

          {/* Decorative circles */}
          <div className="login-deco-circle c1" />
          <div className="login-deco-circle c2" />
        </div>
        <div className="login-left-footer">© 2026 Đồ Đồng Kim Ánh. All rights reserved.</div>
      </motion.div>

      {/* Right Panel - Form */}
      <motion.div
        className="login-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-form-wrapper">
          <h2 className="login-form-title">Đăng nhập</h2>
          <p className="login-form-subtitle">Nhập thông tin để truy cập hệ thống quản lý CRM</p>

          <Form name="login" onFinish={onFinish} size="large" layout="vertical">
            <Form.Item
              name="username"
              label="Tài khoản"
              rules={[{ required: true, message: 'Nhập tên đăng nhập hoặc họ tên' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Tên đăng nhập hoặc họ tên"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder="••••••••"
                className="login-input"
              />
            </Form.Item>

            <div className="login-options">
              <Checkbox>Ghi nhớ đăng nhập</Checkbox>
            </div>

            <Form.Item style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="login-btn"
                icon={<ArrowRightOutlined />}
                iconPosition="end"
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
