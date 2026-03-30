import { useState, useEffect, useCallback } from 'react';
import { Row, Col, DatePicker, Select, Spin, Checkbox, message, Button } from 'antd';
import {
  DollarOutlined,
  MessageOutlined,
  PhoneOutlined,
  RiseOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, authApi } from '../api';
import dayjs from 'dayjs';

const vnd = (v) => Number(v || 0).toLocaleString('vi-VN');
const vndFull = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';
const vndShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
};

const MESS_TIERS = [
  { min: 0, max: 49_999_999, mess: 92, budget: 6_000_000, label: '< 50 triệu' },
  { min: 50_000_000, max: 74_999_999, mess: 138, budget: 9_000_000, label: '50 triệu ≤ 75 triệu' },
  { min: 75_000_000, max: 99_999_999, mess: 184, budget: 12_000_000, label: '75 triệu ≤ 100 triệu' },
  { min: 100_000_000, max: 124_999_999, mess: 230, budget: 15_000_000, label: '100 triệu ≤ 125 triệu' },
  { min: 125_000_000, max: 149_999_999, mess: 276, budget: 18_000_000, label: '125 triệu ≤ 150 triệu' },
  { min: 150_000_000, max: 174_999_999, mess: 323, budget: 21_000_000, label: '150 triệu ≤ 175 triệu' },
  { min: 175_000_000, max: 199_999_999, mess: 369, budget: 24_000_000, label: '175 triệu ≤ 200 triệu' },
  { min: 200_000_000, max: 249_999_999, mess: 461, budget: 30_000_000, label: '200 triệu ≤ 250 triệu' },
  { min: 250_000_000, max: 299_999_999, mess: 553, budget: 36_000_000, label: '250 triệu ≤ 300 triệu' },
  { min: 300_000_000, max: 349_999_999, mess: 646, budget: 42_000_000, label: '300 triệu ≤ 350 triệu' },
  { min: 350_000_000, max: 399_999_999, mess: 738, budget: 48_000_000, label: '350 triệu ≤ 400 triệu' },
  { min: 400_000_000, max: 449_999_999, mess: 830, budget: 54_000_000, label: '400 triệu ≤ 450 triệu' },
  { min: 450_000_000, max: 499_999_999, mess: 923, budget: 60_000_000, label: '450 triệu ≤ 500 triệu' },
  { min: 500_000_000, max: Infinity, mess: 984, budget: 64_000_000, label: 'DS > 500 triệu' },
];

function getMessTier(revenue) {
  const rev = Number(revenue || 0);
  for (const tier of MESS_TIERS) {
    if (rev < tier.max) return tier;
  }
  return MESS_TIERS[MESS_TIERS.length - 1];
}

/* SVG Semi-circle Gauge */
function MessGauge({ used, total }) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const r = 80;
  const cx = 100;
  const cy = 95;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = pct >= 0.9 ? '#EF4444' : pct >= 0.7 ? '#F59E0B' : '#4F46E5';

  return (
    <svg width="200" height="120" viewBox="0 0 200 120">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#E5E7EB" strokeWidth="14" strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 24} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1F2937">
        {used}
      </text>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6B7280">
        / {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
        {(pct * 100).toFixed(0)}%
      </text>
    </svg>
  );
}

const STATUS_OPTIONS = [
  'Đã Giao Thành Công', 'Đang Chờ', 'KH Showroom', 'Hoàn hàng',
  'Đang vận chuyển', 'Đang giao', 'HỦY ĐƠN', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
];

const STATUS_COLORS = {
  'Đã Giao Thành Công': '#4F46E5',
  'Đang Chờ': '#F59E0B',
  'KH Showroom': '#3B82F6',
  'Hoàn hàng': '#EF4444',
  'Đang vận chuyển': '#06B6D4',
  'Đang giao': '#8B5CF6',
  'HỦY ĐƠN': '#991B1B',
  'Khách Đặt Cọc': '#D97706',
  'Kho đang gọi hàng': '#14B8A6',
};

export default function DoanhSo() {
  const { user, isAdmin, isKeToan } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedStatuses, setSelectedStatuses] = useState([...STATUS_OPTIONS]);

  const getMonthRange = (m) => {
    const from = m.startOf('month').format('YYYY-MM-DD');
    const to = m.endOf('month').format('YYYY-MM-DD');
    return { from, to };
  };

  useEffect(() => {
    if (isAdmin || isKeToan) {
      authApi.getSaleUsers().then(res => {
        const names = (res.data || []).filter(Boolean);
        setSalesList(names);
        if (names.length > 0) {
          setSelectedSale(names[0]);
          const { from, to } = getMonthRange(dayjs());
          fetchData(names[0], from, to);
        } else {
          setLoading(false);
        }
      }).catch(() => { setLoading(false); });
    } else {
      const { from, to } = getMonthRange(dayjs());
      fetchData(undefined, from, to);
    }
  }, []);

  const fetchData = useCallback(async (sale, from, to) => {
    setLoading(true);
    try {
      const params = {};
      if (sale) params.sale = sale;
      if (from) params.fromDate = from;
      if (to) params.toDate = to;
      const res = await dashboardApi.getSaleDashboard(params);
      if (res.data?.error) {
        message.warning(res.data.error);
      }
      setData(res.data);
    } catch (err) {
      console.error('Sale dashboard failed:', err);
      message.error('Không thể tải dữ liệu doanh số.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaleChange = (val) => {
    setSelectedSale(val);
    const { from, to } = getMonthRange(selectedMonth);
    fetchData(val, from, to);
  };

  const handleMonthChange = (month) => {
    if (!month) return;
    setSelectedMonth(month);
    const { from, to } = getMonthRange(month);
    fetchData(selectedSale, from, to);
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const params = {
        sale: selectedSale,
        fromDate: selectedMonth.startOf('month').format('YYYY-MM-DD'),
        toDate: selectedMonth.endOf('month').format('YYYY-MM-DD'),
      };
      const response = await dashboardApi.exportDoanhSo(params);
      const timestamp = selectedMonth.format('DD-MM-YYYY');
      const filename = `DoanhSo_${selectedSale}_${timestamp}.xlsx`;
      const url = URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      message.success('✅ Xuất Excel thành công!');
    } catch (err) {
      console.error('Export failed:', err);
      message.error('Không thể xuất dữ liệu.');
    }
  };

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const totalRevenue = Number(data?.totalRevenue || 0);
  const qualifiedRevenue = Number(data?.qualifiedRevenue || 0);
  const messAllocation = Number(data?.messAllocation || 92);
  const totalMess = Number(data?.totalMess || 0);
  const totalPhones = Number(data?.totalPhones || 0);
  const totalOrders = Number(data?.totalOrders || 0);
  const ordersByStatus = data?.ordersByStatus || [];
  const messByDay = data?.messByDay || [];
  const messRemaining = Math.max(0, messAllocation - totalMess);
  const tier = getMessTier(qualifiedRevenue);
  const saleName = data?.sale || user?.fullName || '';

  // Filter orders by status
  const filteredOrders = ordersByStatus.filter(o => selectedStatuses.includes(o.tinhTrang));
  const filteredOrderCount = filteredOrders.reduce((s, o) => s + Number(o.count || 0), 0);
  const filteredRevenue = filteredOrders.reduce((s, o) => s + Number(o.revenue || 0), 0);

  // Mess by day chart
  const messDayChart = messByDay.map(d => ({
    day: `Ngày ${d.day}`,
    count: d.count,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="doanhso-page">
      {/* Filter Bar */}
      <div className="ds-filter-bar">
        <div className="ds-filter-left">
          {(isAdmin || isKeToan) && (
            <div className="ds-filter-group">
              <div className="ds-filter-label">Sale</div>
              <Select
                value={selectedSale}
                onChange={handleSaleChange}
                style={{ width: 200 }}
                placeholder="Chọn Sale"
                options={salesList.map(s => ({ value: s, label: s }))}
              />
            </div>
          )}
          <div className="ds-filter-group">
            <div className="ds-filter-label">Tháng</div>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              format="MM/YYYY"
              size="middle"
              allowClear={false}
              style={{ width: 140 }}
            />
          </div>
        </div>
        <div className="ds-filter-right">
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!data} style={{ background: '#10B981', borderColor: '#10B981', color: '#fff' }}>Tải xuống</Button>
          <div className="ds-sale-name" style={{ marginLeft: 24, fontSize: 15, fontWeight: 600, color: '#4F46E5' }}>{saleName}</div>
        </div>
      </div>

      {/* Revenue KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="ds-kpi-card kpi-blue" whileHover={{ y: -3 }}>
            <div className="ds-kpi-icon"><DollarOutlined /></div>
            <div className="ds-kpi-content">
              <div className="ds-kpi-value">{vnd(totalRevenue)} đ</div>
              <div className="ds-kpi-label">Doanh Số</div>
            </div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="ds-kpi-card kpi-purple" whileHover={{ y: -3 }}>
            <div className="ds-kpi-icon"><RiseOutlined /></div>
            <div className="ds-kpi-content">
              <div className="ds-kpi-value">{vnd(qualifiedRevenue)} đ</div>
              <div className="ds-kpi-label">Doanh Số Tính Mess</div>
            </div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="ds-kpi-card kpi-green" whileHover={{ y: -3 }}>
            <div className="ds-kpi-icon"><MessageOutlined /></div>
            <div className="ds-kpi-content">
              <div className="ds-kpi-value">{totalMess}</div>
              <div className="ds-kpi-label">Tổng Mess Nhận Được</div>
            </div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="ds-kpi-card kpi-pink" whileHover={{ y: -3 }}>
            <div className="ds-kpi-icon"><PhoneOutlined /></div>
            <div className="ds-kpi-content">
              <div className="ds-kpi-value">{totalPhones}</div>
              <div className="ds-kpi-label">Tổng SĐT</div>
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Mess Gauge + Info */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <motion.div className="sg-card ds-gauge-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="sg-card-title">
              <MessageOutlined style={{ color: '#4F46E5' }} /> Mốc Số Mess
            </div>
            <div className="ds-gauge-wrapper">
              <MessGauge used={totalMess} total={messAllocation} />
            </div>
            <div className="ds-gauge-info">
              <div className="ds-gauge-row">
                <span>Mốc hiện tại</span>
                <span className="ds-gauge-val">{messAllocation} mess</span>
              </div>
              <div className="ds-gauge-row">
                <span>Đã dùng</span>
                <span className="ds-gauge-val ds-used">{totalMess} mess</span>
              </div>
              <div className="ds-gauge-row">
                <span>Còn lại</span>
                <span className="ds-gauge-val ds-remain">{messRemaining} mess</span>
              </div>
            </div>
          </motion.div>
        </Col>

        <Col xs={24} md={16}>
          <motion.div className="sg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="sg-card-title">
              <RiseOutlined style={{ color: '#4F46E5' }} /> Bảng Mốc Mess Theo Doanh Số
            </div>
            <div className="ds-tier-table-wrapper">
              <table className="ds-tier-table">
                <thead>
                  <tr>
                    <th>Doanh Số</th>
                    <th>Doanh Số Tối Thiểu</th>
                    <th>Doanh Số Tối Đa</th>
                    <th>Ngân Sách</th>
                    <th>Số Mess (65k/Mess)</th>
                  </tr>
                </thead>
                <tbody>
                  {MESS_TIERS.map((t, i) => (
                    <tr key={i} className={t.mess === tier.mess ? 'active' : ''}>
                      <td style={{ fontWeight: 600 }}>{t.label}</td>
                      <td className="td-num">{t.min > 0 ? t.min.toLocaleString('vi-VN') : '—'}</td>
                      <td className="td-num">{t.max < Infinity ? t.max.toLocaleString('vi-VN') : '—'}</td>
                      <td className="td-num">{t.budget.toLocaleString('vi-VN')}</td>
                      <td className="td-num" style={{ fontWeight: 700, color: '#4F46E5' }}>{t.mess} Mess</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Status Filter + Orders */}
      <motion.div className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="sg-card-title" style={{ marginBottom: 12 }}>
          <DollarOutlined style={{ color: '#4F46E5' }} /> Tình Trạng Đơn Hàng
        </div>
        <div className="ds-status-checks" style={{ marginBottom: 16 }}>
          <Checkbox
            checked={selectedStatuses.length === STATUS_OPTIONS.length}
            indeterminate={selectedStatuses.length > 0 && selectedStatuses.length < STATUS_OPTIONS.length}
            onChange={(e) => setSelectedStatuses(e.target.checked ? [...STATUS_OPTIONS] : [])}
          ><span style={{ fontWeight: 600 }}>Tất cả</span></Checkbox>
          {STATUS_OPTIONS.map(s => (
            <Checkbox key={s} checked={selectedStatuses.includes(s)}
              onChange={() => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
              <span style={{ fontSize: 12 }}>{s}</span>
            </Checkbox>
          ))}
        </div>
        <div className="ds-status-summary">
          <span>Tổng đơn: <strong>{filteredOrderCount}</strong></span>
          <span>Doanh thu: <strong>{vndFull(filteredRevenue)}</strong></span>
        </div>
        <div className="ds-status-grid">
          {filteredOrders.map((o, i) => (
            <div key={i} className="ds-status-item" style={{ borderLeftColor: STATUS_COLORS[o.tinhTrang] || '#94A3B8' }}>
              <div className="ds-status-name">{o.tinhTrang}</div>
              <div className="ds-status-count">{o.count} đơn</div>
              <div className="ds-status-rev">{vndShort(o.revenue)}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mess By Day Chart */}
      {messDayChart.length > 0 && (
        <motion.div className="sg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="sg-card-title">
            <MessageOutlined style={{ color: '#4F46E5' }} /> Số Mess Chia Theo Ngày
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={messDayChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#4F46E5" name="Số Mess" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </motion.div>
  );
}
