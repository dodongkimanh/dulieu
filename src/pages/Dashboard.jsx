import { useState, useEffect } from 'react';
import { Row, Col, Spin, DatePicker, Table, Tag } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  PhoneOutlined,
  BarChartOutlined,
  MessageOutlined,
  LineChartOutlined,
  PieChartOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { dashboardApi, khachHangApi } from '../api';
import dayjs from 'dayjs';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

const formatVND = (v) => {
  if (!v) return '0 đ';
  const num = Number(v);
  return num.toLocaleString('vi-VN') + ' đ';
};

const quickFilters = ['Trọn đời', 'Hôm nay', 'Hôm qua', '7 ngày qua', '30 ngày qua', 'Tuần này', 'Tuần trước', 'Tháng này', 'Tháng trước'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Hôm nay');
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);

  useEffect(() => { fetchAll(); }, [activeFilter, dateRange]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = { filter: activeFilter };
      const [s, r, os, d, ro] = await Promise.allSettled([
        dashboardApi.getStats(params),
        dashboardApi.getRevenueMonthly(),
        dashboardApi.getOrderStatus(),
        dashboardApi.getOrdersDaily(),
        dashboardApi.getRecentOrders(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (r.status === 'fulfilled') {
        const rd = r.value.data;
        setRevenueData(Array.isArray(rd) ? rd.map(item => ({ ...item, revenue: Number(item.revenue) })) : [rd].map(item => ({ ...item, revenue: Number(item.revenue) })));
      }
      if (os.status === 'fulfilled') setOrderStatusData(Array.isArray(os.value.data) ? os.value.data : []);
      if (d.status === 'fulfilled') {
        const dd = d.value.data;
        setDailyData(Array.isArray(dd) ? dd.map(item => ({ ...item, total: Number(item.total) })) : [dd].map(item => ({ ...item, total: Number(item.total) })));
      }
      if (ro.status === 'fulfilled') setRecentOrders(Array.isArray(ro.value.data) ? ro.value.data : []);
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Tổng đơn hàng', value: stats.tongDonHang || 0, icon: <ShoppingCartOutlined />, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Đơn hoàn thành', value: stats.donHoanThanh || 0, icon: <CheckCircleOutlined />, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Doanh thu', value: formatVND(stats.tongDoanhThu), icon: <DollarOutlined />, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'ROAS', value: stats.tongDoanhThu && stats.tongDonHang ? ((stats.tongDoanhThu / stats.tongDonHang / 1000000).toFixed(2) + 'x') : '0.00x', icon: <FundOutlined />, color: '#EF4444', bg: '#FEE2E2' },
    { label: 'Đơn mới hôm nay', value: stats.donMoiHomNay || 0, icon: <ThunderboltOutlined />, color: '#F97316', bg: '#FFF7ED' },
    { label: 'Tổng khách hàng', value: stats.tongKhachHang || 0, icon: <EyeOutlined />, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Khách mới tháng này', value: stats.khachMoiThangNay || 0, icon: <TeamOutlined />, color: '#06B6D4', bg: '#ECFEFF' },
    { label: 'Tỷ lệ chuyển đổi', value: (stats.tyLeChuyenDoi || 0).toFixed(1) + '%', icon: <RiseOutlined />, color: '#EC4899', bg: '#FDF2F8' },
  ];

  const statusColorMap = { 'Mới': 'blue', 'Đang xử lý': 'orange', 'Hoàn thành': 'green', 'Đã hủy': 'red', 'Chờ thanh toán': 'gold' };

  const recentColumns = [
    { title: 'Mã hóa đơn', dataIndex: 'maHoaDon', key: 'maHoaDon', render: (v) => <span style={{ color: '#4F46E5', fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { title: 'Khách hàng', dataIndex: 'khachHang', key: 'khachHang', ellipsis: true },
    { title: 'Giá thu thực tế', dataIndex: 'giaThuThucTe', key: 'giaThuThucTe', render: (v) => <span style={{ fontWeight: 700 }}>{Number(v || 0).toLocaleString('vi-VN')} đ</span> },
    { title: 'Trạng thái', dataIndex: 'tinhTrang', key: 'tinhTrang', render: (v) => <Tag color={statusColorMap[v] || 'default'}>{v}</Tag> },
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay', render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Date Range Filter Bar */}
      <motion.div
        className="sg-filter-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="sg-date-range">
          <div className="sg-date-field">
            <span className="sg-date-label">Từ ngày</span>
            <DatePicker
              value={dateRange[0]}
              onChange={(d) => setDateRange([d || dayjs(), dateRange[1]])}
              format="MM/DD/YYYY"
              size="middle"
              style={{ width: 150 }}
            />
          </div>
          <div className="sg-date-field">
            <span className="sg-date-label">Đến ngày</span>
            <DatePicker
              value={dateRange[1]}
              onChange={(d) => setDateRange([dateRange[0], d || dayjs()])}
              format="MM/DD/YYYY"
              size="middle"
              style={{ width: 150 }}
            />
          </div>
        </div>
        <div className="sg-quick-filters">
          {quickFilters.map((f) => (
            <button
              key={f}
              className={`sg-quick-btn ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stat Cards - 4 columns, 2 rows */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <motion.div
              className="sg-stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
            >
              <div className="sg-stat-icon" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
              <div className="sg-stat-value">{card.value}</div>
              <div className="sg-stat-label">{card.label}</div>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <motion.div
            className="sg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="sg-card-title">
              <BarChartOutlined style={{ color: '#4F46E5' }} /> Chi phí và doanh thu theo ngày
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v) => Number(v).toLocaleString('vi-VN')} />
                <Tooltip
                  formatter={(v) => [Number(v).toLocaleString('vi-VN') + ' đ', 'Doanh thu']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </Col>

        <Col xs={24} lg={8}>
          <motion.div
            className="sg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{ height: '100%' }}
          >
            <div className="sg-card-title">
              <PieChartOutlined style={{ color: '#4F46E5' }} /> Phân bổ theo trạng thái
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%" cy="50%"
                  outerRadius={95}
                  innerRadius={55}
                  paddingAngle={3}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Đơn']} contentStyle={{ borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </Col>
      </Row>

      {/* Daily chart + Recent orders */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <motion.div
            className="sg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="sg-card-title">
              <LineChartOutlined style={{ color: '#4F46E5' }} /> Đơn hàng 30 ngày qua
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" stroke="#4F46E5" fill="url(#areaGrad)" strokeWidth={2} dot={{ r: 3, fill: '#4F46E5' }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </Col>

        <Col xs={24} lg={14}>
          <motion.div
            className="sg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <div className="sg-card-title" style={{ marginBottom: 16 }}>
              <ShoppingCartOutlined style={{ color: '#4F46E5' }} /> Đơn hàng gần đây
            </div>
            <Table
              dataSource={recentOrders}
              columns={recentColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
