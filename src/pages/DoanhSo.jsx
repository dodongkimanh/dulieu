import { useState, useEffect, useCallback } from 'react';
import { Row, Col, DatePicker, Spin, Checkbox, message, Button, Tag, InputNumber, Modal, Input } from 'antd';
import {
  DollarOutlined,
  MessageOutlined,
  PhoneOutlined,
  RiseOutlined,
  DownloadOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  WalletOutlined,
  CalculatorOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, authApi, messConfigApi } from '../api';
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

const DEFAULT_TIERS = [
  { min: 0, max: 49_999_999, budget: 6_000_000, label: '< 50 triệu' },
  { min: 50_000_000, max: 74_999_999, budget: 9_000_000, label: '50 triệu ≤ 75 triệu' },
  { min: 75_000_000, max: 99_999_999, budget: 12_000_000, label: '75 triệu ≤ 100 triệu' },
  { min: 100_000_000, max: 124_999_999, budget: 15_000_000, label: '100 triệu ≤ 125 triệu' },
  { min: 125_000_000, max: 149_999_999, budget: 18_000_000, label: '125 triệu ≤ 150 triệu' },
  { min: 150_000_000, max: 174_999_999, budget: 21_000_000, label: '150 triệu ≤ 175 triệu' },
  { min: 175_000_000, max: 199_999_999, budget: 24_000_000, label: '175 triệu ≤ 200 triệu' },
  { min: 200_000_000, max: 249_999_999, budget: 30_000_000, label: '200 triệu ≤ 250 triệu' },
  { min: 250_000_000, max: 299_999_999, budget: 36_000_000, label: '250 triệu ≤ 300 triệu' },
  { min: 300_000_000, max: 349_999_999, budget: 42_000_000, label: '300 triệu ≤ 350 triệu' },
  { min: 350_000_000, max: 399_999_999, budget: 48_000_000, label: '350 triệu ≤ 400 triệu' },
  { min: 400_000_000, max: 449_999_999, budget: 54_000_000, label: '400 triệu ≤ 450 triệu' },
  { min: 450_000_000, max: 499_999_999, budget: 60_000_000, label: '450 triệu ≤ 500 triệu' },
  { min: 500_000_000, max: 999_999_999_999, budget: 64_000_000, label: 'DS > 500 triệu' },
];

function buildMessTiers(tiers, cost) {
  const c = Number(cost) || 65000;
  return (tiers || DEFAULT_TIERS).map(t => ({ ...t, mess: Math.floor(Number(t.budget) / c) }));
}

function getMessTier(revenue, tiers, cost) {
  const built = buildMessTiers(tiers, cost);
  const rev = Number(revenue || 0);
  for (const tier of built) {
    if (rev <= Number(tier.max)) return tier;
  }
  return built[built.length - 1];
}

/* SVG Semi-circle Gauge */
function MessGauge({ used, total, isOverflow }) {
  const rawPct = total > 0 ? used / total : 0;
  const pct = Math.min(rawPct, 1);
  const r = 80;
  const cx = 100;
  const cy = 95;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = isOverflow ? '#EF4444' : rawPct >= 0.9 ? '#EF4444' : rawPct >= 0.7 ? '#F59E0B' : '#4F46E5';

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
      <text x={cx} y={cy - 24} textAnchor="middle" fontSize="28" fontWeight="800" fill={isOverflow ? '#EF4444' : '#1F2937'}>
        {used}
      </text>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6B7280">
        / {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
        {isOverflow ? `${Math.round(rawPct * 100)}% — Vượt mốc!` : `${(pct * 100).toFixed(0)}%`}
      </text>
    </svg>
  );
}

const STATUS_OPTIONS = [
  'Đã Giao Thành Công', 'Đang Chờ', 'KH Showroom', 'Hoàn hàng',
  'Đang vận chuyển', 'Đang giao', 'HỦY ĐƠN', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
];

// Statuses that count for revenue & mess calculation (qualified)
const QUALIFIED_STATUSES = [
  'Đã Giao Thành Công', 'KH Showroom', 'Đang vận chuyển', 'Đang giao', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
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
  const [selectedStatuses, setSelectedStatuses] = useState([...QUALIFIED_STATUSES]);
  const [costPerMess, setCostPerMess] = useState(65000);
  const [configModal, setConfigModal] = useState(false);
  const [editCost, setEditCost] = useState(65000);
  const [messTierConfig, setMessTierConfig] = useState(DEFAULT_TIERS);
  const [editTiers, setEditTiers] = useState([]);
  const [salesMessOverview, setSalesMessOverview] = useState({});

  const getMonthRange = (m) => {
    const from = m.startOf('month').format('YYYY-MM-DD');
    const to = m.endOf('month').format('YYYY-MM-DD');
    return { from, to };
  };

  useEffect(() => {
    if (isAdmin || isKeToan) {
      authApi.getSaleUsers().then(res => {
        const names = (res.data || []).filter(Boolean);
        // Deduplicate names from frontend side too
        const uniqueNames = [...new Set(names)];
        setSalesList(uniqueNames);
        if (uniqueNames.length > 0) {
          setSelectedSale(uniqueNames[0]);
          const { from, to } = getMonthRange(dayjs());
          // Load sale data and mess overview in parallel
          fetchData(uniqueNames[0], from, to);
          fetchSalesMessOverview(from, to);
        } else {
          setLoading(false);
        }
      }).catch(() => { setLoading(false); });
    } else {
      const { from, to } = getMonthRange(dayjs());
      fetchData(undefined, from, to);
    }
    // Load mess config
    messConfigApi.getConfig().then(res => {
      const c = Number(res.data?.costPerMess || 65000);
      setCostPerMess(c);
      setEditCost(c);
      if (res.data?.tiers && Array.isArray(res.data.tiers)) {
        setMessTierConfig(res.data.tiers);
      }
    }).catch(() => {});
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

  const fetchSalesMessOverview = useCallback(async (from, to) => {
    if (!isAdmin && !isKeToan) return;
    try {
      const params = {};
      if (from) params.fromDate = from;
      if (to) params.toDate = to;
      const res = await dashboardApi.getSalesMessOverview(params);
      const map = {};
      (res.data || []).forEach(item => {
        map[item.sale] = item;
      });
      setSalesMessOverview(map);
    } catch (err) {
      console.error('Sales mess overview failed:', err);
    }
  }, [isAdmin, isKeToan]);

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
    fetchSalesMessOverview(from, to);
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
      const url = URL.createObjectURL(response.data);
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

  const handleSaveConfig = async () => {
    try {
      // Save cost per mess
      const costRes = await messConfigApi.updateCostPerMess(editCost);
      setCostPerMess(Number(costRes.data?.costPerMess || editCost));
      // Save tiers
      const tierRes = await messConfigApi.updateTiers(editTiers);
      if (tierRes.data?.tiers) setMessTierConfig(tierRes.data.tiers);
      setConfigModal(false);
      message.success('Cập nhật cấu hình mess thành công');
      const { from, to } = getMonthRange(selectedMonth);
      fetchData(selectedSale, from, to);
      fetchSalesMessOverview(from, to);
    } catch {
      message.error('Lỗi khi cập nhật cấu hình');
    }
  };

  const handleOpenConfig = () => {
    setEditCost(apiCostPerMess);
    setEditTiers(messTierConfig.map(t => ({ ...t })));
    setConfigModal(true);
  };

  const handleTierChange = (idx, field, value) => {
    setEditTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleAddTier = () => {
    const last = editTiers[editTiers.length - 1];
    const newMin = last ? Number(last.max) + 1 : 0;
    setEditTiers(prev => [...prev, { min: newMin, max: newMin + 49_999_999, budget: (last?.budget || 6_000_000) + 3_000_000, label: '' }]);
  };

  const handleRemoveTier = (idx) => {
    if (editTiers.length <= 1) return;
    setEditTiers(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const apiCostPerMess = Number(data?.costPerMess || costPerMess);
  const qualifiedRevenue = Number(data?.qualifiedRevenue || 0);
  const messAllocation = Number(data?.messAllocation || 92);
  const totalMess = Number(data?.totalMess || 0);
  const totalPhones = Number(data?.totalPhones || 0);
  const ordersByStatus = data?.ordersByStatus || [];
  const messByDay = data?.messByDay || [];
  const messRemaining = Math.max(0, messAllocation - totalMess);
  const messOverflow = totalMess > messAllocation;
  const messOverflowCount = messOverflow ? totalMess - messAllocation : 0;
  const tier = getMessTier(qualifiedRevenue, messTierConfig, apiCostPerMess);
  const messTiers = buildMessTiers(messTierConfig, apiCostPerMess);
  const saleName = data?.sale || user?.fullName || '';
  const totalMessCost = totalMess * apiCostPerMess;
  const hasMessError = !!data?.messError;
  const hasRevenueError = !!data?.revenueError;

  // Filter orders by status
  const filteredOrders = ordersByStatus.filter(o => selectedStatuses.includes(o.tinhTrang));
  const filteredOrderCount = filteredOrders.reduce((s, o) => s + Number(o.count || 0), 0);
  const filteredRevenue = filteredOrders.reduce((s, o) => s + Number(o.revenue || 0), 0);
  const filteredProfit = filteredOrders.reduce((s, o) => s + Number(o.profit || 0), 0);

  // Mess by day chart
  const messDayChart = messByDay.map(d => ({
    day: `Ngày ${d.day}`,
    count: d.count,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="doanhso-page">
      {/* Filter Bar */}
      <div className="ds-filter-bar">
        {/* Row 1: Sale chip bar (Admin / KeToan only) */}
        {(isAdmin || isKeToan) && salesList.length > 0 && (
          <div className="ds-filter-section">
            <span className="ds-filter-label">Sale</span>
            <div className="ds-sale-chips">
              {salesList.map(s => {
                const overview = salesMessOverview[s];
                const isOverflow = overview?.isOverflow;
                const chipClass = `ds-sale-chip${selectedSale === s ? ' active' : ''}${isOverflow ? ' overflow' : overview ? ' ok' : ''}`;
                return (
                  <button
                    key={s}
                    type="button"
                    className={chipClass}
                    onClick={() => handleSaleChange(s)}
                    title={overview ? `Mess: ${overview.totalMess}/${overview.messAllocation}` : s}
                  >
                    {isOverflow && <WarningOutlined style={{ marginRight: 4, fontSize: 11 }} />}
                    {!isOverflow && overview && <CheckCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />}
                    {s}
                    {overview && (
                      <span className="ds-chip-badge">
                        {overview.totalMess}/{overview.messAllocation}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 2: Controls */}
        <div className="ds-filter-controls">
          <div className="ds-filter-left">
            <div className="ds-filter-group">
              <span className="ds-filter-label">Tháng</span>
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
            {saleName && (
              <div className="ds-sale-name-badge">
                <span className="ds-sale-name-dot" />
                {saleName}
              </div>
            )}
          </div>
          <div className="ds-filter-right" style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!data} style={{ background: '#10B981', borderColor: '#10B981', color: '#fff' }}>Tải xuống</Button>
            {isAdmin && (
              <Button icon={<SettingOutlined />} onClick={handleOpenConfig} style={{ color: '#4F46E5' }}>Cấu hình Mess</Button>
            )}
          </div>
        </div>
      </div>

      {/* Error alerts from backend */}
      {hasRevenueError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 16px', marginBottom: 12, color: '#991B1B', fontSize: 13 }}>
          <WarningOutlined style={{ marginRight: 6 }} />Lỗi tải doanh số: {data.revenueError}
        </div>
      )}
      {hasMessError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 16px', marginBottom: 12, color: '#991B1B', fontSize: 13 }}>
          <WarningOutlined style={{ marginRight: 6 }} />Lỗi tải mess: {data.messError}
        </div>
      )}

      {/* --- Bộ lọc Tình Trạng Đơn Hàng --- */}
      <motion.div className="sg-card ds-status-filter-card" style={{ marginBottom: 16 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="sg-card-title" style={{ marginBottom: 4 }}>
          <FilterOutlined style={{ color: '#4F46E5' }} /> Tình Trạng Đơn Hàng
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, paddingLeft: 22 }}>
          <CheckCircleOutlined style={{ color: '#10B981', marginRight: 4 }} />
          Tích xanh = Tính vào doanh số &amp; mốc mess. <span style={{ color: '#EF4444', fontWeight: 600 }}>HỦY ĐƠN</span> và <span style={{ color: '#EF4444', fontWeight: 600 }}>Hoàn hàng</span> không tính vào bất kỳ doanh số / lợi nhuận nào.
        </div>
        <div className="ds-status-checks" style={{ marginBottom: 12 }}>
          <Checkbox
            checked={selectedStatuses.length === STATUS_OPTIONS.length}
            indeterminate={selectedStatuses.length > 0 && selectedStatuses.length < STATUS_OPTIONS.length}
            onChange={(e) => setSelectedStatuses(e.target.checked ? [...STATUS_OPTIONS] : [])}
          ><span style={{ fontWeight: 600 }}>Tất cả</span></Checkbox>
          {STATUS_OPTIONS.map(s => {
            const isQualified = QUALIFIED_STATUSES.includes(s);
            return (
              <Checkbox key={s} checked={selectedStatuses.includes(s)}
                onChange={() => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
                <span style={{ fontSize: 12, color: isQualified ? undefined : '#94A3B8' }}>
                  {isQualified && <CheckCircleOutlined style={{ color: '#10B981', marginRight: 3, fontSize: 10 }} />}
                  {s}
                </span>
              </Checkbox>
            );
          })}
        </div>
        <div className="ds-status-summary-bar">
          <div className="ds-summary-item">
            <span className="ds-summary-label">Tổng đơn</span>
            <span className="ds-summary-value">{filteredOrderCount}</span>
          </div>
          <div className="ds-summary-divider" />
          <div className="ds-summary-item">
            <span className="ds-summary-label">Doanh thu</span>
            <span className="ds-summary-value" style={{ color: '#2563EB' }}>{vndFull(filteredRevenue)}</span>
          </div>
          <div className="ds-summary-divider" />
          <div className="ds-summary-item">
            <span className="ds-summary-label">Lợi nhuận</span>
            <span className="ds-summary-value" style={{ color: filteredProfit >= 0 ? '#059669' : '#DC2626' }}>{vndFull(filteredProfit)}</span>
          </div>
          {selectedStatuses.length < STATUS_OPTIONS.length && (
            <Tag color="blue" style={{ marginLeft: 'auto', fontSize: 11, borderRadius: 12 }}>
              <FilterOutlined style={{ marginRight: 3 }} />Đang lọc {selectedStatuses.length}/{STATUS_OPTIONS.length}
            </Tag>
          )}
        </div>
      </motion.div>

      {/* Revenue KPI Cards — reactive to status filter */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <motion.div className="ds-kpi-card kpi-blue" whileHover={{ y: -3 }}>
            <div className="ds-kpi-icon"><DollarOutlined /></div>
            <div className="ds-kpi-content">
              <div className="ds-kpi-value">{vnd(filteredRevenue)} đ</div>
              <div className="ds-kpi-label">Doanh Số {selectedStatuses.length < STATUS_OPTIONS.length
                ? <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 500 }}>(lọc {selectedStatuses.length} trạng thái)</span>
                : <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400 }}>(tất cả trạng thái)</span>}</div>
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

      {/* ADMIN-only KPI: Profit + Mess Cost */}
      {isAdmin && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12}>
            <motion.div className="ds-kpi-card" whileHover={{ y: -3 }} style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '1px solid #F59E0B' }}>
              <div className="ds-kpi-icon" style={{ background: '#F59E0B20', color: '#D97706' }}><WalletOutlined /></div>
              <div className="ds-kpi-content">
                <div className="ds-kpi-value" style={{ color: '#92400E' }}>{vnd(filteredProfit)} đ</div>
                <div className="ds-kpi-label" style={{ color: '#A16207' }}>Lợi Nhuận Ước Tính {selectedStatuses.length < STATUS_OPTIONS.length
                  ? <span style={{ fontSize: 10, color: '#B45309' }}>(lọc {selectedStatuses.length} trạng thái)</span>
                  : <span style={{ fontSize: 10, color: '#B45309' }}>của Sale</span>}</div>
              </div>
            </motion.div>
          </Col>
          <Col xs={24} sm={12}>
            <motion.div className="ds-kpi-card" whileHover={{ y: -3 }} style={{ background: 'linear-gradient(135deg, #ECFDF5, #A7F3D0)', border: '1px solid #10B981' }}>
              <div className="ds-kpi-icon" style={{ background: '#10B98120', color: '#059669' }}><CalculatorOutlined /></div>
              <div className="ds-kpi-content">
                <div className="ds-kpi-value" style={{ color: '#065F46' }}>{vnd(totalMessCost)} đ</div>
                <div className="ds-kpi-label" style={{ color: '#047857' }}>Chi Phí Ước Tính ({vnd(apiCostPerMess)}đ × {totalMess} mess)</div>
              </div>
            </motion.div>
          </Col>
        </Row>
      )}

      {/* Chi tiết theo trạng thái */}
      {filteredOrders.length > 0 && (
        <motion.div className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="sg-card-title" style={{ marginBottom: 12 }}>
            <DollarOutlined style={{ color: '#4F46E5' }} /> Chi Tiết Theo Trạng Thái
          </div>
          <div className="ds-status-grid">
            {filteredOrders.map((o, i) => (
              <div key={i} className="ds-status-item" style={{ borderLeftColor: STATUS_COLORS[o.tinhTrang] || '#94A3B8' }}>
                <div className="ds-status-name">{o.tinhTrang}</div>
                <div className="ds-status-count">{o.count} đơn</div>
                <div className="ds-status-rev">{vndShort(o.revenue)}</div>
                <div style={{ fontSize: 11, color: Number(o.profit || 0) >= 0 ? '#059669' : '#DC2626', fontWeight: 600, marginTop: 2, fontFamily: "'Inter', monospace" }}>LN: {vndShort(o.profit)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mess Gauge + Info */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <motion.div className={`sg-card ds-gauge-card ${messOverflow ? 'ds-gauge-overflow' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="sg-card-title">
              <MessageOutlined style={{ color: messOverflow ? '#EF4444' : '#4F46E5' }} /> Mốc Số Mess
            </div>
            <div className="ds-gauge-wrapper">
              <MessGauge used={totalMess} total={messAllocation} isOverflow={messOverflow} />
            </div>
            {messOverflow ? (
              <div className="ds-mess-warning">
                <WarningOutlined /> KHÔNG ĐẠT
                <div className="ds-mess-warning-detail">
                  Vượt <strong>{messOverflowCount}</strong> mess so với mốc {messAllocation} mess.
                  Doanh số chưa đạt mốc tiếp theo!
                </div>
              </div>
            ) : totalMess > 0 ? (
              <div className="ds-mess-success">
                <CheckCircleOutlined /> ĐẠT
                <div className="ds-mess-success-detail">
                  Còn {messRemaining} mess trong mốc {messAllocation} mess
                </div>
              </div>
            ) : null}
            <div className="ds-gauge-info">
              <div className="ds-gauge-row">
                <span>Mốc hiện tại</span>
                <span className="ds-gauge-val">{messAllocation} mess</span>
              </div>
              <div className="ds-gauge-row">
                <span>Đã dùng</span>
                <span className={`ds-gauge-val ${messOverflow ? 'ds-overflow' : 'ds-used'}`}>{totalMess} mess</span>
              </div>
              <div className="ds-gauge-row">
                <span>Còn lại</span>
                <span className={`ds-gauge-val ${messOverflow ? 'ds-overflow' : 'ds-remain'}`}>
                  {messOverflow ? `−${messOverflowCount} mess` : `${messRemaining} mess`}
                </span>
              </div>
            </div>
          </motion.div>
        </Col>
        <Col xs={24} md={16}>
          <motion.div className="sg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
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
                    <th>Số Mess ({vnd(apiCostPerMess)}đ/Mess)</th>
                  </tr>
                </thead>
                <tbody>
                  {messTiers.map((t, i) => (
                    <tr key={i} className={t.mess === tier.mess ? 'active' : ''}>
                      <td style={{ fontWeight: 600 }}>{t.label}</td>
                      <td className="td-num">{Number(t.min) > 0 ? Number(t.min).toLocaleString('vi-VN') : '—'}</td>
                      <td className="td-num">{Number(t.max) < 999_999_999_999 ? Number(t.max).toLocaleString('vi-VN') : '∞'}</td>
                      <td className="td-num">{Number(t.budget).toLocaleString('vi-VN')}</td>
                      <td className="td-num" style={{ fontWeight: 700, color: '#4F46E5' }}>{t.mess} Mess</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </Col>
      </Row>

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

      {/* Mess Config Modal (ADMIN) */}
      <Modal
        title={<span><SettingOutlined style={{ color: '#4F46E5', marginRight: 8 }} />Cấu hình Hệ thống Mess</span>}
        open={configModal}
        onCancel={() => setConfigModal(false)}
        onOk={handleSaveConfig}
        okText="Lưu tất cả"
        cancelText="Hủy"
        width={720}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <div style={{ padding: '8px 0' }}>
          {/* Cost per mess */}
          <div style={{ marginBottom: 20, padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 8 }}>💰 Chi phí trên mỗi Mess</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <InputNumber
                value={editCost}
                onChange={(v) => setEditCost(v)}
                min={1000}
                max={1000000}
                step={1000}
                style={{ width: 200 }}
                size="middle"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                addonAfter="VNĐ"
              />
              <span style={{ fontSize: 12, color: '#64748B' }}>Áp dụng toàn bộ hệ thống</span>
            </div>
          </div>

          {/* Tier table */}
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Bảng mốc Mess theo Doanh số</span>
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddTier}>Thêm mốc</Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#374151', color: '#fff' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, fontSize: 11, borderRadius: '8px 0 0 0' }}>Nhãn</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>DS Tối Thiểu</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>DS Tối Đa</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 11 }}>Ngân Sách</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, fontSize: 11 }}>Mess</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, fontSize: 11, borderRadius: '0 8px 0 0', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {editTiers.map((t, i) => {
                  const messCount = editCost > 0 ? Math.floor(Number(t.budget || 0) / editCost) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      <td style={{ padding: '4px 4px' }}>
                        <Input size="small" value={t.label || ''} onChange={(e) => handleTierChange(i, 'label', e.target.value)} style={{ fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <InputNumber size="small" value={t.min} onChange={(v) => handleTierChange(i, 'min', v || 0)} style={{ width: '100%', fontSize: 12 }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <InputNumber size="small" value={t.max} onChange={(v) => handleTierChange(i, 'max', v || 0)} style={{ width: '100%', fontSize: 12 }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <InputNumber size="small" value={t.budget} onChange={(v) => handleTierChange(i, 'budget', v || 0)} style={{ width: '100%', fontSize: 12 }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', fontWeight: 700, color: '#4F46E5', fontSize: 13 }}>
                        {messCount}
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={editTiers.length <= 1} onClick={() => handleRemoveTier(i)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, background: '#F0F9FF', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1E40AF' }}>
            💡 Số Mess = Ngân Sách ÷ Chi phí/Mess. Chỉnh sửa chi phí hoặc ngân sách sẽ tự động cập nhật số mess.
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
