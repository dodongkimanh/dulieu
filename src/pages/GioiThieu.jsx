import { Row, Col, Typography } from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  LockOutlined,
  RocketOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const features = [
  { icon: <DashboardOutlined />, title: 'Dashboard thông minh', desc: 'Biểu đồ trực quan, thống kê thời gian thực, giúp bạn nắm bắt tình hình kinh doanh nhanh chóng.', color: '#4F46E5', bg: '#EEF2FF' },
  { icon: <ShoppingCartOutlined />, title: 'Quản lý đơn hàng', desc: 'Tạo, cập nhật, theo dõi đơn hàng từ A-Z. Xuất Excel, lọc theo nhiều tiêu chí.', color: '#10B981', bg: '#D1FAE5' },
  { icon: <TeamOutlined />, title: 'Quản lý khách hàng', desc: 'Quản lý data khách hàng, phân loại trạng thái, theo dõi nguồn lead.', color: '#F59E0B', bg: '#FEF3C7' },
  { icon: <LockOutlined />, title: 'Phân quyền người dùng', desc: 'Hệ thống phân quyền Admin/Saler, bảo mật JWT, kiểm soát truy cập.', color: '#EF4444', bg: '#FEE2E2' },
  { icon: <LineChartOutlined />, title: 'Báo cáo & Phân tích', desc: 'Doanh thu theo tháng, tỷ lệ chuyển đổi, thống kê đơn hàng chi tiết.', color: '#06B6D4', bg: '#CFFAFE' },
  { icon: <CloudServerOutlined />, title: 'Cloud & API', desc: 'Backend Spring Boot, PostgreSQL trên Supabase, REST API đầy đủ.', color: '#8B5CF6', bg: '#EDE9FE' },
];

const values = [
  { icon: <ThunderboltOutlined />, title: 'Nhanh chóng', desc: 'Tối ưu hiệu suất, tải trang dưới 1 giây.', gradient: 'linear-gradient(135deg, #4F46E5, #818CF8)' },
  { icon: <SafetyCertificateOutlined />, title: 'Bảo mật', desc: 'Mã hóa JWT, SSL, bảo vệ dữ liệu toàn diện.', gradient: 'linear-gradient(135deg, #10B981, #6EE7B7)' },
  { icon: <RocketOutlined />, title: 'Hiện đại', desc: 'Công nghệ mới nhất: React 19, Spring Boot 3.', gradient: 'linear-gradient(135deg, #F59E0B, #FCD34D)' },
  { icon: <HeartOutlined />, title: 'Thân thiện', desc: 'Giao diện trực quan, dễ sử dụng cho mọi người.', gradient: 'linear-gradient(135deg, #EF4444, #FCA5A5)' },
];

const techStack = [
  { name: 'React 19', desc: 'Frontend Framework' },
  { name: 'Ant Design 6', desc: 'UI Components' },
  { name: 'Spring Boot 3', desc: 'Backend API' },
  { name: 'PostgreSQL', desc: 'Database' },
  { name: 'Supabase', desc: 'Cloud Platform' },
  { name: 'JWT', desc: 'Authentication' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

export default function GioiThieu() {
  return (
    <div>
      {/* Hero */}
      <motion.div
        className="gioithieu-hero"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: 80, height: 80, borderRadius: 22,
              background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 800, color: '#fff',
              margin: '0 auto 24px',
              boxShadow: '0 12px 40px rgba(79, 70, 229, 0.4)',
            }}
          >
            KA
          </motion.div>
          <Title level={2} style={{ color: '#fff', marginBottom: 8, letterSpacing: -0.5 }}>
            Đồ Đồng Kim Ánh — CRM System
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
            Hệ thống quản lý bán hàng chuyên nghiệp, hiện đại, tối ưu cho doanh nghiệp.
          </Paragraph>

          <Row gutter={32} justify="center" style={{ marginTop: 36 }}>
            {[
              { value: '10K+', label: 'Đơn hàng' },
              { value: '5K+', label: 'Khách hàng' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Hỗ trợ' },
            ].map((s, i) => (
              <Col key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  style={{ textAlign: 'center', padding: '0 16px' }}
                >
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#818CF8' }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </motion.div>

      {/* Features */}
      <div style={{ marginBottom: 32 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ color: '#0F172A' }}>Tính năng nổi bật</Title>
          <Text style={{ color: '#64748B' }}>Mọi thứ bạn cần để quản lý kinh doanh hiệu quả</Text>
        </motion.div>
        <Row gutter={[16, 16]}>
          {features.map((f, i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <motion.div
                className="gioithieu-feature-card"
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ y: -6, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}
              >
                <div className="gioithieu-feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <Title level={5} style={{ marginBottom: 8, color: '#0F172A' }}>{f.title}</Title>
                <Text style={{ color: '#64748B', fontSize: 13 }}>{f.desc}</Text>
              </motion.div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Core Values */}
      <div style={{ marginBottom: 32 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ color: '#0F172A' }}>Giá trị cốt lõi</Title>
        </motion.div>
        <Row gutter={[16, 16]}>
          {values.map((v, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <motion.div
                className="gioithieu-value-card"
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ y: -4 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: v.gradient }} />
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: v.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff', margin: '0 auto 14px',
                  boxShadow: `0 6px 20px rgba(0,0,0,0.15)`,
                }}>{v.icon}</div>
                <Title level={5} style={{ marginBottom: 6 }}>{v.title}</Title>
                <Text style={{ color: '#64748B', fontSize: 13 }}>{v.desc}</Text>
              </motion.div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Tech Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        style={{
          background: '#fff', borderRadius: 12, padding: 28,
          border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Title level={4} style={{ textAlign: 'center', marginBottom: 20 }}>
          <CrownOutlined style={{ color: '#4F46E5', marginRight: 8 }} />Công nghệ sử dụng
        </Title>
        <Row gutter={[16, 16]} justify="center">
          {techStack.map((t, i) => (
            <Col xs={12} sm={8} md={4} key={i}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  textAlign: 'center', padding: '16px 8px',
                  borderRadius: 10, background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{t.name}</div>
                <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{t.desc}</div>
              </motion.div>
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ textAlign: 'center', padding: '32px 0 8px', color: '#94A3B8', fontSize: 13 }}
      >
        <StarOutlined style={{ color: '#4F46E5', marginRight: 6 }} />
        Đồ Đồng Kim Ánh CRM — Built with passion & modern technology
      </motion.div>
    </div>
  );
}
