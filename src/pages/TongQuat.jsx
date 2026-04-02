import { useState, useEffect, useCallback } from 'react';
import { Row, Col, DatePicker, Checkbox, Spin, Tag, message } from 'antd';
import {
  DollarOutlined,
  BarChartOutlined,
  FundOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import { dashboardApi, donHangApi, authApi } from '../api';
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
    try {
      // Merge sales from orders + active sale users to get ALL sales
      const [orderSalesRes, userSalesRes] = await Promise.all([
        donHangApi.getSales().catch(() => ({ data: [] })),
        authApi.getSaleUsers().catch(() => ({ data: [] })),
      ]);
      const merged = [...new Set([...(orderSalesRes.data || []), ...(userSalesRes.data || [])])].filter(Boolean).sort();
      setSalesList(merged);
    } catch {}
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
  const chartData = Object.values(saleMap).sort((a, b) => b.total - a.total).map(d => ({ ...d, _lbl: 0.001 }));
  const activeStatuses = [...new Set(bySaleStatus.map(i => i.tinhTrang))].filter(s => selectedStatuses.includes(s));

  // Label renderer for the transparent label bar at end of stack
  const renderStackLabel = (props) => {
    const { x, y, width, height, index } = props;
    const entry = chartData[index];
    if (!entry?.total) return null;
    return (
      <text
        x={(x || 0) + (width || 0) + 8}
        y={(y || 0) + (height || 0) / 2}
        fill="#374151"
        fontSize={11}
        fontWeight={700}
        dominantBaseline="middle"
      >
        {vnd(entry.total)} đ
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

  // Channel chart data: stacked by status (like sale chart), showing Giá Thu Thực Tế
  const byPageStatus = analytics?.byPageStatus || [];
  const pageMap = {};
  byPageStatus.forEach(item => {
    const page = item.page || 'Không xác định';
    if (!selectedStatuses.includes(item.tinhTrang)) return;
    if (!pageMap[page]) pageMap[page] = { page, total: 0, totalLoiNhuan: 0 };
    pageMap[page][item.tinhTrang] = Number(item.sumGiaThu || 0);
    pageMap[page].total += Number(item.sumGiaThu || 0);
    pageMap[page].totalLoiNhuan += Number(item.sumLoiNhuan || 0);
  });
  const channelChartData = Object.values(pageMap).sort((a, b) => b.total - a.total).map(d => ({ ...d, _lbl: 0.001 }));
  const channelActiveStatuses = [...new Set(byPageStatus.map(i => i.tinhTrang))].filter(s => selectedStatuses.includes(s));

  // Channel chart label renderer
  const renderChannelLabel = (props) => {
    const { x, y, width, height, index } = props;
    const entry = channelChartData[index];
    if (!entry?.total) return null;
    return (
      <text
        x={(x || 0) + (width || 0) + 8}
        y={(y || 0) + (height || 0) / 2}
        fill="#374151"
        fontSize={10}
        fontWeight={700}
        dominantBaseline="middle"
      >
        {vnd(entry.total)} đ
      </text>
    );
  };

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
          <motion.div className="tq-kpi-card kpi-blue" whileHover={{ y: -3 }}>
            <div className="tq-kpi-value">{vnd(filteredTotal.sumGiaThu)} đ</div>
            <div className="tq-kpi-label">Giá Thu Thực Tế</div>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="tq-kpi-card kpi-purple" whileHover={{ y: -3 }}>
            <div className="tq-kpi-value">{vnd(filteredTotal.sumLoiNhuan)} đ</div>
            <div className="tq-kpi-label">Lợi Nhuận Ước Tính</div>
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
              <Tooltip
                formatter={(v, name) => {
                  if (name === '_lbl' || name === '') return null;
                  return [vndFull(v), name];
                }}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
              />
              <Legend
                payload={activeStatuses.map(s => ({ value: s, type: 'rect', color: STATUS_COLORS[s] || '#94A3B8' }))}
                wrapperStyle={{ fontSize: 11 }}
              />
              {activeStatuses.map(status => (
                <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status] || '#94A3B8'} name={status} />
              ))}
              <Bar dataKey="_lbl" stackId="a" fill="transparent" isAnimationActive={false} legendType="none">
                <LabelList content={renderStackLabel} />
              </Bar>
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

      {/* Channel Revenue Chart - Stacked by status (like sale chart), showing Giá Thu Thực Tế */}
      {channelChartData.length > 0 && (
        <motion.div className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="sg-card-title">
            <AppstoreOutlined style={{ color: '#4F46E5' }} /> Giá Thu Thực Tế theo Kênh Tiếp Thị & Tình Trạng
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, paddingLeft: 22 }}>
            Lọc theo tình trạng giao hàng ở bộ lọc phía trên. Di chuột để xem Giá Thu và Lợi Nhuận từng kênh.
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, channelChartData.length * 50)}>
            <BarChart data={channelChartData} layout="vertical" margin={{ top: 5, right: 160, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={(v) => vndShort(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="page" tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} width={120} />
              <Tooltip
                cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 12,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  padding: '14px 18px',
                  minWidth: 280,
                  background: '#fff',
                }}
                labelStyle={{ fontWeight: 700, fontSize: 13, color: '#1F2937', marginBottom: 8, paddingBottom: 8, borderBottom: '2px solid #F1F5F9' }}
                formatter={(v, name) => {
                  if (name === '_lbl' || name === '') return null;
                  return [vndFull(v), name];
                }}
                labelFormatter={(label, payload) => {
                  const entry = payload?.[0]?.payload;
                  if (!entry) return label;
                  return `${label}\n\nGiá Thu: ${vndFull(entry.total)} | LN: ${vndFull(entry.totalLoiNhuan)}`;
                }}
              />
              <Legend
                payload={channelActiveStatuses.map(s => ({ value: s, type: 'rect', color: STATUS_COLORS[s] || '#94A3B8' }))}
                wrapperStyle={{ fontSize: 11 }}
              />
              {channelActiveStatuses.map(status => (
                <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status] || '#94A3B8'} name={status} />
              ))}
              <Bar dataKey="_lbl" stackId="a" fill="transparent" isAnimationActive={false} legendType="none">
                <LabelList content={renderChannelLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Summary table below chart */}
          <div style={{ padding: '16px 22px 8px', borderTop: '1px solid #F1F5F9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>Kênh Tiếp Thị</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#10B981', fontWeight: 600 }}>Giá Thu Thực Tế</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#F59E0B', fontWeight: 600 }}>Lợi Nhuận</th>
                </tr>
              </thead>
              <tbody>
                {channelChartData.map((ch, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#374151' }}>{ch.page}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>{vndFull(ch.total)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#F59E0B' }}>{vndFull(ch.totalLoiNhuan)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1F2937' }}>TỔNG CỘNG</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10B981', fontSize: 14 }}>
                    {vndFull(channelChartData.reduce((s, c) => s + c.total, 0))}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#F59E0B', fontSize: 14 }}>
                    {vndFull(channelChartData.reduce((s, c) => s + c.totalLoiNhuan, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
