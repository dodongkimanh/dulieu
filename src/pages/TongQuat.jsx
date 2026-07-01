import { useState, useEffect, useCallback, useMemo } from 'react';
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

const AnimatedDiv = motion.div;

const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  'Đã Giao Thành Công', 'Đang Chờ', 'KH Showroom', 'Hoàn hàng',
  'Đang vận chuyển', 'Đang giao', 'HỦY ĐƠN', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
];

const EXCLUDED_BY_DEFAULT = new Set(['Hoàn hàng', 'HỦY ĐƠN']);
const DEFAULT_SELECTED_STATUSES = STATUS_OPTIONS.filter((status) => !EXCLUDED_BY_DEFAULT.has(status));

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
const vndMobile = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' tỷ';
  if (Math.abs(n) >= 1e6) return Math.round(n / 1e6) + 'tr';
  return n.toLocaleString('vi-VN');
};
const vndShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
};

const STORAGE_KEY = 'tq_filters';
const STORAGE_VERSION = 2;

function normalizeSavedStatuses(statuses) {
  if (!Array.isArray(statuses)) return null;

  const unique = [...new Set(statuses)].filter((status) => STATUS_OPTIONS.includes(status));
  return unique;
}

function loadSavedFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const normalizedStatuses = normalizeSavedStatuses(parsed?.selectedStatuses);

    // Migrate legacy saved filter that previously defaulted to selecting all statuses.
    const shouldApplyNewDefault =
      (!parsed?.version || parsed.version < STORAGE_VERSION)
      && Array.isArray(normalizedStatuses)
      && normalizedStatuses.length === STATUS_OPTIONS.length;

    return {
      ...parsed,
      selectedStatuses: shouldApplyNewDefault ? [...DEFAULT_SELECTED_STATUSES] : normalizedStatuses,
      version: STORAGE_VERSION,
    };
  } catch {
    return null;
  }
}

function saveFilters(filters) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...filters,
      version: STORAGE_VERSION,
    }));
  } catch {
    // Ignore storage errors (private mode / full quota).
  }
}

export default function TongQuat() {
  const saved = loadSavedFilters();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    if (saved?.dateFrom && saved?.dateTo) {
      return [dayjs(saved.dateFrom), dayjs(saved.dateTo)];
    }
    return [dayjs().startOf('month'), dayjs().endOf('month')];
  });
  const [salesList, setSalesList] = useState([]);
  const [selectedSales, setSelectedSales] = useState(saved?.selectedSales || []);
  const [selectedStatuses, setSelectedStatuses] = useState(
    saved?.selectedStatuses || [...DEFAULT_SELECTED_STATUSES]
  );
  const [dateDropOpen, setDateDropOpen] = useState(false);
  const [saleDropOpen, setSaleDropOpen] = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      // Merge sales from orders + active sale users to get ALL sales
      const [orderSalesRes, userSalesRes] = await Promise.all([
        donHangApi.getSales().catch(() => ({ data: [] })),
        authApi.getSaleUsers().catch(() => ({ data: [] })),
      ]);
      const normalize = (s) => s?.trim().replace(/\s+/g, ' ') || '';
      const merged = [...new Set([
        ...(orderSalesRes.data || []).map(normalize),
        ...(userSalesRes.data || []).map(normalize),
      ])].filter(Boolean).sort();
      setSalesList(merged);
    } catch (err) {
      console.error('Failed to fetch sales list:', err);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Persist filters to sessionStorage whenever they change
  useEffect(() => {
    saveFilters({
      selectedSales,
      selectedStatuses,
      dateFrom: dateRange[0]?.format('YYYY-MM-DD') || null,
      dateTo: dateRange[1]?.format('YYYY-MM-DD') || null,
    });
  }, [selectedSales, selectedStatuses, dateRange]);

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

  useEffect(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD') || dayjs().endOf('month').format('YYYY-MM-DD');
    fetchAnalytics(from, to);
  }, [dateRange, fetchAnalytics]);

  const handleDateChange = (dates) => {
    setDateRange(dates || [null, null]);
  };

  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleSelectAllStatuses = (checked) => {
    setSelectedStatuses(checked ? [...STATUS_OPTIONS] : []);
  };

  const bySaleStatus = analytics?.bySaleStatus || [];
  const byDate = analytics?.byDate || [];
  const byPageStatus = analytics?.byPageStatus || [];

  const { chartData, activeStatuses } = useMemo(() => {
    const saleMap = {};
    bySaleStatus.forEach(item => {
      const sale = item.sale || 'Không xác định';
      if (selectedSales.length > 0 && !selectedSales.includes(sale)) return;
      if (!selectedStatuses.includes(item.tinhTrang)) return;
      if (!saleMap[sale]) saleMap[sale] = { sale, total: 0 };
      saleMap[sale][item.tinhTrang] = Number(item.sumGiaBan || 0);
      saleMap[sale].total += Number(item.sumGiaBan || 0);
    });
    return {
      chartData: Object.values(saleMap).sort((a, b) => b.total - a.total).map(d => ({ ...d, _lbl: 0.001 })),
      activeStatuses: [...new Set(bySaleStatus.map(i => i.tinhTrang))].filter(s => selectedStatuses.includes(s)),
    };
  }, [bySaleStatus, selectedSales, selectedStatuses]);

  const renderStackLabel = useCallback((props) => {
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
  }, [chartData]);

  const { filteredTotal, lnSauTruDisplay } = useMemo(() => {
    const totals = { sumGiaBan: 0, sumGiaThu: 0, sumLoiNhuan: 0, sumLNSauTru: 0, sumGiaVon: 0, count: 0 };
    bySaleStatus.forEach(item => {
      const sale = item.sale || 'Không xác định';
      if (selectedSales.length > 0 && !selectedSales.includes(sale)) return;
      if (!selectedStatuses.includes(item.tinhTrang)) return;
      totals.sumGiaBan += Number(item.sumGiaBan || 0);
      totals.sumGiaThu += Number(item.sumGiaThu || 0);
      totals.sumLoiNhuan += Number(item.sumLoiNhuan || 0);
      totals.sumLNSauTru += Number(item.sumLNSauTru || 0);
      totals.sumGiaVon += Number(item.sumGiaVon || 0);
      totals.count += Number(item.count || 0);
    });
    // Fallback: nếu bySaleStatus chưa có sumLNSauTru (backend chưa deploy query mới)
    // thì dùng analytics.totals.sumLNSauTru cho trường hợp không lọc theo sale
    const lnDisplay = totals.sumLNSauTru > 0
      ? totals.sumLNSauTru
      : (selectedSales.length === 0 ? Number(analytics?.totals?.sumLNSauTru || 0) : 0);
    return { filteredTotal: totals, lnSauTruDisplay: lnDisplay };
  }, [bySaleStatus, selectedSales, selectedStatuses, analytics]);

  const dateChartData = useMemo(() => byDate.map(d => ({
    date: d.date,
    giaBan: Number(d.sumGiaBan || 0),
    giaThu: Number(d.sumGiaThu || 0),
    loiNhuan: Number(d.sumLoiNhuan || 0),
  })), [byDate]);

  const channelChartData = useMemo(() => {
    const pageMap = {};
    byPageStatus.forEach(item => {
      const page = item.page || 'Không xác định';
      if (!selectedStatuses.includes(item.tinhTrang)) return;
      if (!pageMap[page]) pageMap[page] = { page, giaThu: 0, loiNhuan: 0, loiNhuanThuc: 0 };
      pageMap[page].giaThu += Number(item.sumGiaThu || 0);
      pageMap[page].loiNhuan += Number(item.sumLoiNhuan || 0);
      pageMap[page].loiNhuanThuc += Number(item.sumLNSauTru || 0);
    });
    return Object.values(pageMap).sort((a, b) => b.giaThu - a.giaThu);
  }, [byPageStatus, selectedStatuses]);

  const channelTooltipFormatter = useCallback((value, name) => [vndFull(value), name], []);

  if (loading && !analytics) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  return (
    <AnimatedDiv initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="tongquat-page">
      {/* Filter Bar */}
      <div className="tq-filter-bar" style={{ padding: '12px 16px' }}>
        {isMobile ? (
          /* Mobile: 3 dropdowns cùng hàng */
          <div className="tq-dropdown-row">
            {/* Date dropdown */}
            <div className="tq-dropdown-filter">
              <div className="tq-dropdown-trigger" onClick={() => { setDateDropOpen(v => !v); setSaleDropOpen(false); setStatusDropOpen(false); }}>
                <span className="tq-dropdown-label">Thời gian</span>
                <span className={`tq-dropdown-arrow ${dateDropOpen ? 'open' : ''}`}>▾</span>
              </div>
              {dateDropOpen && (
                <div className="tq-dropdown-panel" style={{ padding: 10 }}>
                  <RangePicker value={dateRange} onChange={(dates) => { handleDateChange(dates); setDateDropOpen(false); }} format="DD/MM/YYYY" size="small" placeholder={['Từ', 'Đến']} style={{ width: '100%' }} />
                </div>
              )}
            </div>

            {/* Sale dropdown */}
            <div className="tq-dropdown-filter">
              <div className="tq-dropdown-trigger" onClick={() => { setSaleDropOpen(v => !v); setDateDropOpen(false); setStatusDropOpen(false); }}>
                      <span className="tq-dropdown-label">Sale</span>
                      <span className="tq-dropdown-summary">
                        {selectedSales.length === 0 ? 'Tất cả' : selectedSales.length}
                      </span>
                      <span className={`tq-dropdown-arrow ${saleDropOpen ? 'open' : ''}`}>▾</span>
                    </div>
                    {saleDropOpen && (
                      <div className="tq-dropdown-panel">
                        {selectedSales.length > 0 && (
                          <div className="tq-dropdown-clear" onClick={() => setSelectedSales([])}>Bỏ chọn tất cả</div>
                        )}
                        <div className="tq-dropdown-options">
                          {salesList.map(s => (
                            <div key={s}
                              className={`tq-dropdown-option ${selectedSales.includes(s) ? 'active' : ''}`}
                              onClick={() => setSelectedSales(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                            >
                              <span className="tq-dropdown-check">{selectedSales.includes(s) ? '✓' : ''}</span>
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status dropdown */}
                  <div className="tq-dropdown-filter">
                    <div className="tq-dropdown-trigger" onClick={() => { setStatusDropOpen(v => !v); setDateDropOpen(false); setSaleDropOpen(false); }}>
                      <span className="tq-dropdown-label">Trạng thái</span>
                      <span className="tq-dropdown-summary">
                        {selectedStatuses.length === STATUS_OPTIONS.length ? 'Tất cả' : `${selectedStatuses.length}/${STATUS_OPTIONS.length}`}
                      </span>
                      <span className={`tq-dropdown-arrow ${statusDropOpen ? 'open' : ''}`}>▾</span>
                    </div>
                    {statusDropOpen && (
                      <div className="tq-dropdown-panel">
                        <div
                          className={`tq-dropdown-option ${selectedStatuses.length === STATUS_OPTIONS.length ? 'active' : ''}`}
                          onClick={() => handleSelectAllStatuses(selectedStatuses.length !== STATUS_OPTIONS.length)}
                        >
                          <span className="tq-dropdown-check">
                            {selectedStatuses.length === STATUS_OPTIONS.length ? '✓' : selectedStatuses.length > 0 ? '−' : ''}
                          </span>
                          <strong>Chọn tất cả</strong>
                        </div>
                        <div className="tq-dropdown-options">
                          {STATUS_OPTIONS.map(s => (
                            <div key={s}
                              className={`tq-dropdown-option ${selectedStatuses.includes(s) ? 'active' : ''}`}
                              onClick={() => handleStatusToggle(s)}
                            >
                              <span className="tq-dropdown-check">{selectedStatuses.includes(s) ? '✓' : ''}</span>
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
          </div>
        ) : (
          /* Desktop: layout gốc */
          <>
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
                  ><span style={{ fontWeight: 600 }}>Chọn tất cả</span></Checkbox>
                  {STATUS_OPTIONS.map(s => (
                    <Checkbox key={s} checked={selectedStatuses.includes(s)} onChange={() => handleStatusToggle(s)}>
                      <span style={{ fontSize: 12 }}>{s}</span>
                    </Checkbox>
                  ))}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#64748B' }}>
                  Mặc định đã bỏ chọn <Tag color="red" style={{ marginInlineEnd: 4 }}>Hoàn hàng</Tag>
                  và <Tag color="volcano">HỦY ĐƠN</Tag> để phản ánh doanh số thực tế.
                </div>
              </div>
            </div>
            <div className="tq-filter-right">
              <div className="tq-filter-group">
                <div className="tq-filter-label">Khoảng thời gian</div>
                <RangePicker value={dateRange} onChange={handleDateChange} format="DD/MM/YYYY" size="middle" placeholder={['Từ ngày', 'Đến ngày']} style={{ width: 260 }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* KPI Cards */}
      <div className="tq-kpi-grid">
        <AnimatedDiv className="tq-kpi-card kpi-pink" whileHover={{ y: -3 }}>
          <div className="tq-kpi-value">{vnd(filteredTotal.sumGiaBan)} đ</div>
          <div className="tq-kpi-label">Giá Bán Lên Đơn</div>
        </AnimatedDiv>
        <AnimatedDiv className="tq-kpi-card kpi-blue" whileHover={{ y: -3 }}>
          <div className="tq-kpi-value">{vnd(filteredTotal.sumGiaThu)} đ</div>
          <div className="tq-kpi-label">Giá Thu Thực Tế</div>
        </AnimatedDiv>
        <AnimatedDiv className="tq-kpi-card kpi-purple" whileHover={{ y: -3 }}>
          <div className="tq-kpi-value">{vnd(filteredTotal.sumLoiNhuan)} đ</div>
          <div className="tq-kpi-label">Lợi Nhuận Ước Tính</div>
        </AnimatedDiv>
        <AnimatedDiv className="tq-kpi-card kpi-teal" whileHover={{ y: -3 }}>
          <div className="tq-kpi-value">{vnd(lnSauTruDisplay)} đ</div>
          <div className="tq-kpi-label">Lợi Nhuận Đã Nhận</div>
        </AnimatedDiv>
        <AnimatedDiv className="tq-kpi-card kpi-green" whileHover={{ y: -3 }}>
          <div className="tq-kpi-value">{filteredTotal.count}</div>
          <div className="tq-kpi-label">Tổng đơn hàng</div>
        </AnimatedDiv>
      </div>

      {/* Stacked Bar Chart */}
      <AnimatedDiv className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="sg-card-title">
          <BarChartOutlined style={{ color: '#4F46E5' }} /> Giá Bán Lên Đơn theo Sale & Tình Trạng
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: isMobile ? 80 : 160, left: isMobile ? 4 : 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={(v) => vndShort(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="sale" tick={{ fontSize: isMobile ? 10 : 12, fill: '#374151' }} width={isMobile ? 56 : 80} />
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
      </AnimatedDiv>

      {/* Daily Trend */}
      {dateChartData.length > 0 && (
        <AnimatedDiv className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
        </AnimatedDiv>
      )}

      {/* Channel Revenue Chart - Side-by-side Lợi Nhuận vs Giá Thu Thực Tế */}
      {channelChartData.length > 0 && (
        <AnimatedDiv className="sg-card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="sg-card-title">
            <AppstoreOutlined style={{ color: '#4F46E5' }} /> Lợi Nhuận & Giá Thu Thực Tế theo Kênh Tiếp Thị
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, paddingLeft: 22 }}>
            Lọc theo tình trạng giao hàng ở bộ lọc phía trên. Di chuột để xem Giá Thu và Lợi Nhuận từng kênh.
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, channelChartData.length * 60)}>
            <BarChart data={channelChartData} layout="vertical" margin={{ top: 5, right: isMobile ? 80 : 160, left: isMobile ? 4 : 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={(v) => vndShort(v)} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="page" tick={{ fontSize: isMobile ? 9 : 11, fill: '#374151', fontWeight: 500 }} width={isMobile ? 60 : 120} />
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
                formatter={channelTooltipFormatter}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="loiNhuan" fill="#F59E0B" name="Lợi Nhuận" radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList
                  dataKey="loiNhuan"
                  position="right"
                  formatter={(v) => vnd(v) + ' đ'}
                  style={{ fontSize: 10, fontWeight: 700, fill: '#92400E' }}
                />
              </Bar>
              <Bar dataKey="giaThu" fill="#06B6D4" name="Giá Thu Thực Tế" radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList
                  dataKey="giaThu"
                  position="right"
                  formatter={(v) => vnd(v) + ' đ'}
                  style={{ fontSize: 10, fontWeight: 700, fill: '#0E7490' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Summary table below chart */}
          <div style={{ padding: '16px 22px 8px', borderTop: '1px solid #F1F5F9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748B', fontWeight: 600 }}>Kênh Tiếp Thị</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#F59E0B', fontWeight: 600 }}>Lợi Nhuận</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#06B6D4', fontWeight: 600 }}>Giá Thu Thực Tế</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#059669', fontWeight: 600 }}>Lợi Nhuận Thực</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#7C3AED', fontWeight: 600 }}>Biên Độ LN</th>
                </tr>
              </thead>
              <tbody>
                {channelChartData.map((ch, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#374151' }}>{ch.page}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#F59E0B' }}>{vndFull(ch.loiNhuan)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#06B6D4' }}>{vndFull(ch.giaThu)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{vndFull(ch.loiNhuanThuc)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>{ch.giaThu > 0 ? ((ch.loiNhuan / ch.giaThu) * 100).toFixed(1) + '%' : '–'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1F2937' }}>TỔNG CỘNG</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#F59E0B', fontSize: 14 }}>
                    {vndFull(channelChartData.reduce((s, c) => s + c.loiNhuan, 0))}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#06B6D4', fontSize: 14 }}>
                    {vndFull(channelChartData.reduce((s, c) => s + c.giaThu, 0))}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: 14 }}>
                    {vndFull(channelChartData.reduce((s, c) => s + c.loiNhuanThuc, 0))}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#7C3AED', fontSize: 14 }}>
                    {(() => { const t = channelChartData.reduce((s, c) => s + c.giaThu, 0); const l = channelChartData.reduce((s, c) => s + c.loiNhuan, 0); return t > 0 ? ((l / t) * 100).toFixed(1) + '%' : '–'; })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </AnimatedDiv>
      )}

      {/* Detail Table */}
      <AnimatedDiv className="sg-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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
      </AnimatedDiv>
    </AnimatedDiv>
  );
}
