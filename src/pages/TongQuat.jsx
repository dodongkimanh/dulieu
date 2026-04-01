import { useState, useEffect, useCallback } from 'react';
import { Row, Col, DatePicker, Checkbox, Spin, Tag, message } from 'antd';
import {
  DollarOutlined,
  BarChartOutlined,
  FundOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { dashboardApi, donHangApi } from '../api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

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

const vnd = (v) => Number(v || 0).toLocaleString('vi-VN');
const vndFull = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';
const vndShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
};

export default function TongQuat() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [salesList, setSalesList] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([...STATUS_OPTIONS]);

  useEffect(() => {
    fetchSales();
    fetchAnalytics(dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD'));
  }, []);

  const fetchSales = async () => {
    try { const res = await donHangApi.getSales(); setSalesList(res.data || []); } catch {}
  };

  const fetchAnalytics = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.fromDate = from;
      if (to) params.toDate = to;
      const res = await dashboardApi.getAnalytics(params);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Analytics failed:', err);
      message.error('Không thể tải dữ liệu phân tích. Vui lòng thử lại.');
    }
    finally { setLoading(false); }
  }, []);

  const handleDateChange = (dates) => {
    setDateRange(dates || [null, null]);
    const from = dates?.[0]?.format('YYYY-MM-DD') || undefined;
    const to = dates?.[1]?.format('YYYY-MM-DD') || undefined;
    fetchAnalytics(from, to);
  };

  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleSelectAllStatuses = (checked) => {
    setSelectedStatuses(checked ? [...STATUS_OPTIONS] : []);
  };

  if (loading && !analytics) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const bySaleStatus = analytics?.bySaleStatus || [];
  const byDate = analytics?.byDate || [];

  // Build chart data
  const saleMap = {};
  bySaleStatus.forEach(item => {
    const sale = item.sale || 'Không xác định';
    if (selectedSales.length > 0 && !selectedSales.includes(sale)) return;
    if (!selectedStatuses.includes(item.tinhTrang)) return;
    if (!saleMap[sale]) saleMap[sale] = { sale, total: 0 };
    saleMap[sale][item.tinhTrang] = Number(item.sumGiaBan || 0);
    saleMap[sale].total += Number(item.sumGiaBan || 0);
  });
  const chartData = Object.values(saleMap).sort((a, b) => b.total - a.total);
  const activeStatuses = [...new Set(bySaleStatus.map(i => i.tinhTrang))].filter(s => selectedStatuses.includes(s));
  const lastActiveStatus = activeStatuses.length > 0 ? activeStatuses[activeStatuses.length - 1] : null;

  // Custom label renderer for total at end of stacked bar
  const renderTotalLabel = (props) => {
    const { x, y, width, height, index } = props;
    if (!chartData[index]) return null;
    const total = chartData[index].total;
    if (!total) return null;
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill="#374151"
        fontSize={11}
        fontWeight={700}
        dominantBaseline="middle"
      >
        {vnd(total)} đ
      </text>
    );
  };

  // Filtered totals
  let filteredTotal = { sumGiaBan: 0, sumGiaThu: 0, sumLoiNhuan: 0, sumGiaVon: 0, count: 0 };
  bySaleStatus.forEach(item => {
    const sale = item.sale || 'Không xác định';
    if (selectedSales.length > 0 && !selectedSales.includes(sale)) return;
    if (!selectedStatuses.includes(item.tinhTrang)) return;
    filteredTotal.sumGiaBan += Number(item.sumGiaBan || 0);
    filteredTotal.sumGiaThu += Number(item.sumGiaThu || 0);
    filteredTotal.sumLoiNhuan += Number(item.sumLoiNhuan || 0);
    filteredTotal.sumGiaVon += Number(item.sumGiaVon || 0);
    filteredTotal.count += Number(item.count || 0);
  });

  // Date chart
  const dateChartData = byDate.map(d => ({
    date: d.date,
    giaBan: Number(d.sumGiaBan || 0),
    giaThu: Number(d.sumGiaThu || 0),
    loiNhuan: Number(d.sumLoiNhuan || 0),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="tongquat-page">
      {/* Filter Bar */}
      <div className="tq-filter-bar">
        <div className="tq-filter-left">
          <div className="tq-filter-group">
            <div className="tq-filter-label">Sale</div>
            <div className="tq-sale-chips">
              {salesList.map(s => (
                <div key={s} className={`tq-sale-chip ${selectedSales.includes(s) ? 'active' : ''}`}
                  onClick={() => setSelectedSales(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>{s}</div>
              ))}
              {selectedSales.length > 0 && (
                <div className="tq-sale-chip clear" onClick={() => setSelectedSales([])}>Tất cả</div>
              )}
            </div>
          </div>
          <div className="tq-filter-group">
            <div className="tq-filter-label">Tình trạng</div>
            <div className="tq-status-checks">
              <Checkbox
                checked={selectedStatuses.length === STATUS_OPTIONS.length}
                indeterminate={selectedStatuses.length > 0 && selectedStatuses.length < STATUS_OPTIONS.length}
                onChange={(e) => handleSelectAllStatuses(e.target.checked)}
              ><span style={{ fontWeight: 600 }}>Select all</span></Checkbox>
              {STATUS_OPTIONS.map(s => (
                <Checkbox key={s} checked={selectedStatuses.includes(s)} onChange={() => handleStatusToggle(s)}>
                  <span style={{ fontSize: 12 }}>{s}</span>
                </Checkbox>
              ))}
            </div>
          </div>
        </div>
        <div className="tq-filter-right">
          <div className="tq-filter-group">
            <div className="tq-filter-label">Khoảng thời gian</div>
            <RangePicker value={dateRange} onChange={handleDateChange} format="DD/MM/YYYY" size="middle" placeholder={['Từ ngày', 'Đến ngày']} style={{ width: 260 }} />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="tq-kpi-card kpi-pink" whileHover={{ y: -3 }}>
            <div className="tq-kpi-value">{vnd(filteredTotal.sumGiaBan)} đ</div>
            <div className="tq-kpi-label">Giá Bán Lên Đơn</div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="tq-kpi-card kpi-purple" whileHover={{ y: -3 }}>
            <div className="tq-kpi-value">{vnd(filteredTotal.sumLoiNhuan)} đ</div>
            <div className="tq-kpi-label">Lợi Nhuận Ước Tính</div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="tq-kpi-card kpi-blue" whileHover={{ y: -3 }}>
            <div className="tq-kpi-value">{vnd(filteredTotal.sumGiaThu)} đ</div>
            <div className="tq-kpi-label">Giá Thu Thực Tế</div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="tq-kpi-card kpi-green" whileHover={{ y: -3 }}>
            <div className="tq-kpi-value">{filteredTotal.count}</div>
            <div className="tq-kpi-label">Tổng đơn hàng</div>
          </motion.div>
        </Col>
      </Row>

      {/* Stacked Bar Chart */}
      <motion.div className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="sg-card-title">
          <BarChartOutlined style={{ color: '#4F46E5' }} /> Giá Bán Lên Đơn theo Sale & Tình Trạng
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 160, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={(v) => vndShort(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="sale" tick={{ fontSize: 12, fill: '#374151' }} width={80} />
              <Tooltip formatter={(v, name) => [vndFull(v), name]} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {activeStatuses.map(status => (
                <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status] || '#94A3B8'} name={status}>
                  {status === lastActiveStatus && (
                    <LabelList content={renderTotalLabel} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Không có dữ liệu phù hợp</div>
        )}
      </motion.div>

      {/* Daily Trend */}
      {dateChartData.length > 0 && (
        <motion.div className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="sg-card-title">
            <FundOutlined style={{ color: '#4F46E5' }} /> Xu hướng theo ngày
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dateChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis tickFormatter={(v) => vndShort(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip formatter={(v, name) => [vndFull(v), name]} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="giaBan" fill="#4F46E5" name="Giá Bán Lên Đơn" radius={[3, 3, 0, 0]} />
              <Bar dataKey="giaThu" fill="#10B981" name="Giá Thu Thực Tế" radius={[3, 3, 0, 0]} />
              <Bar dataKey="loiNhuan" fill="#F59E0B" name="Lợi Nhuận Ước Tính" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Channel Revenue Chart - Single total bar per channel */}
      {(analytics?.byPage || []).length > 0 && (
        <motion.div className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="sg-card-title">
            <AppstoreOutlined style={{ color: '#4F46E5' }} /> Doanh số theo Kênh Tiếp Thị
          </div>
          <ResponsiveContainer width="100%" height={Math.max(280, (analytics.byPage || []).length * 44)}>
            <BarChart data={analytics.byPage} layout="vertical" margin={{ top: 5, right: 160, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={(v) => vndShort(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="page" tick={{ fontSize: 11, fill: '#374151' }} width={120} />
              <Tooltip
                formatter={(v) => [vndFull(v), 'Tổng Giá Bán']}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                labelFormatter={(label) => `Kênh: ${label}`}
              />
              <Bar dataKey="sumGiaBan" fill="#4F46E5" name="Tổng Giá Bán Lên Đơn" radius={[0, 6, 6, 0]} barSize={28}>
                <LabelList position="right" formatter={(v) => vnd(v) + ' đ'} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Detail Table */}
      <motion.div className="sg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="sg-card-title">
          <DollarOutlined style={{ color: '#4F46E5' }} /> Chi tiết theo Sale
        </div>
        <div className="tq-detail-table-wrapper">
          <table className="tq-detail-table">
            <thead>
              <tr>
                <th>Sale</th>
                <th>Tình Trạng</th>
                <th>Số đơn</th>
                <th>Giá Bán Lên Đơn</th>
                <th>Giá Thu Thực Tế</th>
                <th>Lợi Nhuận Ước Tính</th>
                <th>Giá Vốn</th>
                <th>CP Vận Chuyển</th>
              </tr>
            </thead>
            <tbody>
              {bySaleStatus
                .filter(item => {
                  const sale = item.sale || 'Không xác định';
                  if (selectedSales.length > 0 && !selectedSales.includes(sale)) return false;
                  if (!selectedStatuses.includes(item.tinhTrang)) return false;
                  return true;
                })
                .map((item, i) => (
                <tr key={i}>
                  <td className="td-sale">{item.sale || '—'}</td>
                  <td><Tag style={{ background: STATUS_COLORS[item.tinhTrang] ? STATUS_COLORS[item.tinhTrang] + '20' : '#F1F5F9', color: STATUS_COLORS[item.tinhTrang] || '#64748B', border: 'none', fontWeight: 600, fontSize: 11 }}>{item.tinhTrang}</Tag></td>
                  <td className="td-num">{item.count}</td>
                  <td className="td-num">{vndFull(item.sumGiaBan)}</td>
                  <td className="td-num">{vndFull(item.sumGiaThu)}</td>
                  <td className="td-num td-profit">{vndFull(item.sumLoiNhuan)}</td>
                  <td className="td-num">{vndFull(item.sumGiaVon)}</td>
                  <td className="td-num">{vndFull(item.sumCPVC)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="td-sale" style={{ fontWeight: 700 }}>TỔNG CỘNG</td>
                <td className="td-num" style={{ fontWeight: 700 }}>{filteredTotal.count}</td>
                <td className="td-num" style={{ fontWeight: 700 }}>{vndFull(filteredTotal.sumGiaBan)}</td>
                <td className="td-num" style={{ fontWeight: 700 }}>{vndFull(filteredTotal.sumGiaThu)}</td>
                <td className="td-num td-profit" style={{ fontWeight: 700 }}>{vndFull(filteredTotal.sumLoiNhuan)}</td>
                <td className="td-num" style={{ fontWeight: 700 }}>{vndFull(filteredTotal.sumGiaVon)}</td>
                <td className="td-num" style={{ fontWeight: 700 }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
