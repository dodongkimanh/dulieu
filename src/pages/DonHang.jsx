import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, DatePicker, Tag, Popconfirm, message, Row, Col, Tooltip, Badge } from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  CarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { donHangApi, authApi, kenhTiepThiApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option, OptGroup } = Select;

const STATUS_OPTIONS = [
  'Đã Giao Thành Công', 'Đang Chờ', 'KH Showroom', 'Hoàn hàng',
  'Đang vận chuyển', 'Đang giao', 'HỦY ĐƠN', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
];

const statusColors = {
  'Đã Giao Thành Công': { color: '#059669', bg: '#D1FAE5' },
  'Đang Chờ': { color: '#D97706', bg: '#FEF3C7' },
  'KH Showroom': { color: '#2563EB', bg: '#DBEAFE' },
  'Hoàn hàng': { color: '#DC2626', bg: '#FEE2E2' },
  'Đang vận chuyển': { color: '#0891B2', bg: '#CFFAFE' },
  'Đang giao': { color: '#7C3AED', bg: '#EDE9FE' },
  'HỦY ĐƠN': { color: '#991B1B', bg: '#FEE2E2' },
  'Khách Đặt Cọc': { color: '#B45309', bg: '#FEF3C7' },
  'Kho đang gọi hàng': { color: '#0D9488', bg: '#CCFBF1' },
};

const vnd = (v) => Number(v || 0).toLocaleString('vi-VN');

export default function DonHang() {
  const { isAdmin, isKeToan, isSaler, user } = useAuth();
  const canEdit = isAdmin || isKeToan;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState(() => ({
    keyword: '', tinhTrang: null,
    sale: isSaler ? (user?.fullName || null) : null,
    page: null, maIdQuangCao: '',
  }));
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [salesList, setSalesList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pageChannels, setPageChannels] = useState({});

  const fetchData = useCallback(async (pg = 1, size = 20, overrides = {}) => {
    setLoading(true);
    try {
      const f = { ...filters, ...overrides };
      const params = {
        pageNum: pg - 1, size,
        keyword: f.keyword || undefined,
        tinhTrang: f.tinhTrang || undefined,
        sale: f.sale || undefined,
        page: f.page || undefined,
        maIdQuangCao: f.maIdQuangCao || undefined,
        fromDate: dateRange[0]?.format('YYYY-MM-DD') || undefined,
        toDate: dateRange[1]?.format('YYYY-MM-DD') || undefined,
      };
      const res = await donHangApi.getAll(params);
      setData(res.data.content);
      setPagination({ current: pg, pageSize: size, total: res.data.totalElements });
    } catch { message.error('Không thể tải danh sách đơn hàng'); }
    finally { setLoading(false); }
  }, [filters, dateRange]);

  const fetchSales = async () => {
    try { const res = await authApi.getSaleUsers(); setSalesList(res.data); } catch {}
  };

  const fetchChannels = async () => {
    try { const res = await kenhTiepThiApi.getGrouped(); setPageChannels(res.data || {}); } catch {}
  };

  useEffect(() => { fetchData(); fetchSales(); fetchChannels(); }, []);

  const handleTableChange = (pag) => fetchData(pag.current, pag.pageSize);
  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => {
    const saleFilter = isSaler ? (user?.fullName || null) : null;
    setFilters({ keyword: '', tinhTrang: null, sale: saleFilter, page: null, maIdQuangCao: '' });
    setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
    fetchData(1, pagination.pageSize, { keyword: '', tinhTrang: null, sale: saleFilter, page: null, maIdQuangCao: '' });
  };

  const handleDelete = async (id) => {
    try { await donHangApi.delete(id); message.success('Xóa thành công'); fetchData(pagination.current, pagination.pageSize); }
    catch { message.error('Lỗi khi xóa'); }
  };

  const handleExport = async () => {
    try {
      const params = {
        keyword: filters.keyword || undefined,
        tinhTrang: filters.tinhTrang || undefined,
        sale: filters.sale || undefined,
        page: filters.page || undefined,
        maIdQuangCao: filters.maIdQuangCao || undefined,
        fromDate: dateRange[0]?.format('YYYY-MM-DD') || undefined,
        toDate: dateRange[1]?.format('YYYY-MM-DD') || undefined,
      };
      const res = await donHangApi.export(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `don-hang-${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { message.error('Lỗi khi xuất Excel'); }
  };

  const adminColumns = [
    { title: 'Ngày', dataIndex: 'ngay', width: 100, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Mã HĐ', dataIndex: 'maHoaDon', width: 130, render: (v) => <span style={{ color: '#4F46E5', fontWeight: 600 }}>{v}</span> },
    { title: 'Khách hàng', dataIndex: 'khachHang', width: 160, ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'SĐT', dataIndex: 'sdt', width: 120 },
    { title: 'Sale', dataIndex: 'sale', width: 120 },
    { title: 'Giá Bán', dataIndex: 'giaBanLenDon', width: 130, align: 'right', render: (v) => <span style={{ fontWeight: 500 }}>{vnd(v)}</span> },
    { title: 'Giá Thu TT', dataIndex: 'giaThuThucTe', width: 130, align: 'right', render: (v) => <b style={{ color: '#059669' }}>{vnd(v)}</b> },
    { title: 'LN Ước Tính', dataIndex: 'loiNhuanUocTinh', width: 130, align: 'right', render: (v) => <b style={{ color: v >= 0 ? '#059669' : '#DC2626' }}>{vnd(v)}</b> },
    { title: 'Tình Trạng', dataIndex: 'tinhTrang', width: 150, render: (v) => {
      const sc = statusColors[v] || { color: '#64748B', bg: '#F1F5F9' };
      return <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>{v}</Tag>;
    }},
    ...(canEdit ? [{ title: '', width: 50, fixed: 'right', render: (_, record) => (
      <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
        <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} danger /></Tooltip>
      </Popconfirm>
    )}] : []),
  ];

  const salerColumns = [
    { title: 'Ngày', dataIndex: 'ngay', width: 95, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Mã HĐ', dataIndex: 'maHoaDon', width: 130, render: (v) => <span style={{ color: '#4F46E5', fontWeight: 600 }}>{v}</span> },
    { title: 'Mã ĐH', dataIndex: 'maDatHang', width: 110 },
    { title: 'Khách hàng', dataIndex: 'khachHang', width: 150, ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'SĐT', dataIndex: 'sdt', width: 115 },
    { title: 'Sale', dataIndex: 'sale', width: 110 },
    { title: 'Niêm Yết', dataIndex: 'tongTienNiemYet', width: 120, align: 'right', render: (v) => <span style={{ fontWeight: 500 }}>{vnd(v)}</span> },
    { title: 'Giá Bán', dataIndex: 'giaBanLenDon', width: 120, align: 'right', render: (v) => <span style={{ fontWeight: 500 }}>{vnd(v)}</span> },
    { title: 'Phụ Trội', dataIndex: 'cuocPhuTroi', width: 100, align: 'right', render: (v) => vnd(v) },
    { title: 'CK %', dataIndex: 'tyLeCk', width: 80, align: 'center', render: (v) => `${Number(v || 0).toFixed(1)}%` },
    { title: 'Tình Trạng', dataIndex: 'tinhTrang', width: 140, render: (v) => {
      const sc = statusColors[v] || { color: '#64748B', bg: '#F1F5F9' };
      return <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>{v}</Tag>;
    }},
    { title: 'Mã Vận Đơn', dataIndex: 'maVanDon', width: 120 },
  ];

  const columns = isSaler ? salerColumns : adminColumns;

  const expandedRowRender = (record) => (
    <motion.div
      className="expand-detail-grid"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="expand-section">
        <div className="expand-section-title"><InfoCircleOutlined /> Thông tin đơn</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Mã ĐH</span><span className="expand-value">{record.maDatHang || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Page</span><span className="expand-value">{record.page || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Mã ID QC</span><span className="expand-value">{record.maIdQuangCao || '—'}</span></div>
        </div>
      </div>
      {!isSaler && (
        <div className="expand-section">
          <div className="expand-section-title"><DollarOutlined /> Giá & Chiết khấu</div>
          <div className="expand-items">
            <div className="expand-item"><span className="expand-label">Giá Vốn</span><span className="expand-value">{vnd(record.giaVon)} đ</span></div>
            <div className="expand-item"><span className="expand-label">Tổng Niêm Yết</span><span className="expand-value">{vnd(record.tongTienNiemYet)} đ</span></div>
            <div className="expand-item"><span className="expand-label">Cước Phụ Trội</span><span className="expand-value">{vnd(record.cuocPhuTroi)} đ</span></div>
            <div className="expand-item"><span className="expand-label">CK %</span><span className="expand-value">{Number(record.tyLeCk || 0).toFixed(1)}%</span></div>
          </div>
        </div>
      )}
      {!isSaler && (
        <div className="expand-section">
          <div className="expand-section-title"><CarOutlined /> Vận chuyển & Thanh toán</div>
          <div className="expand-items">
            <div className="expand-item"><span className="expand-label">Mã Vận Đơn</span><span className="expand-value">{record.maVanDon || '—'}</span></div>
            <div className="expand-item"><span className="expand-label">CP Vận Chuyển</span><span className="expand-value">{vnd(record.chiPhiVanChuyen)} đ</span></div>
            <div className="expand-item"><span className="expand-label">ĐS Vận Chuyển</span><span className="expand-value">{vnd(record.dsVanChuyen)} đ</span></div>
            <div className="expand-item"><span className="expand-label">Đặt Cọc</span><span className="expand-value">{vnd(record.datCoc)} đ</span></div>
            <div className="expand-item"><span className="expand-label">Thu Trực Tiếp</span><span className="expand-value">{vnd(record.thuBanTrucTiep)} đ</span></div>
            <div className="expand-item highlight"><span className="expand-label">Tổng Thu Khách</span><span className="expand-value">{vnd(record.tongThuKhach)} đ</span></div>
            <div className="expand-item highlight"><span className="expand-label">Lợi Nhuận Thực</span><span className="expand-value" style={{ color: record.loiNhuanSauTru >= 0 ? '#059669' : '#DC2626' }}>{vnd(record.loiNhuanSauTru)} đ</span></div>
          </div>
        </div>
      )}
      {record.ghiChu && (
        <div className="expand-section full">
          <div className="expand-section-title"><FileTextOutlined /> Ghi chú</div>
          <p className="expand-note">{record.ghiChu}</p>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-premium">
        <div className="page-header-left">
          <div className="page-header-info">
            <ShoppingCartOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Đơn hàng</span>
            <Badge count={pagination.total} showZero style={{ backgroundColor: '#4F46E5' }} overflowCount={9999} />
          </div>
        </div>
        <div className="page-header-right">
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            value={filters.keyword}
            onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          <Tooltip title="Bộ lọc nâng cao">
            <Button icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)} type={showFilters ? 'primary' : 'default'} ghost={showFilters}>Bộ lọc</Button>
          </Tooltip>
          {canEdit && (
            <Tooltip title="Xuất Excel">
              <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ color: '#10B981' }}>Excel</Button>
            </Tooltip>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div className="filter-panel-premium" initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <div className="filter-panel-inner">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} sm={12} md={5}>
                  <Select placeholder="Tình trạng" value={filters.tinhTrang} onChange={(v) => setFilters(f => ({ ...f, tinhTrang: v }))} allowClear style={{ width: '100%' }}>
                    {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Col>
                {!isSaler && (
                  <Col xs={24} sm={12} md={4}>
                    <Select placeholder="Sale" value={filters.sale} onChange={(v) => setFilters(f => ({ ...f, sale: v }))} allowClear style={{ width: '100%' }}>
                      {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
                    </Select>
                  </Col>
                )}
                <Col xs={24} sm={12} md={5}>
                  <Select placeholder="Page" value={filters.page} onChange={(v) => setFilters(f => ({ ...f, page: v }))} allowClear style={{ width: '100%' }} showSearch optionFilterProp="children" popupMatchSelectWidth={false}>
                    {Object.entries(pageChannels).map(([category, items]) => (
                      <OptGroup key={category} label={<span style={{ fontWeight: 600, color: '#4F46E5', fontSize: 12 }}>{category}</span>}>
                        {items.map(item => (
                          <Option key={item.name} value={item.name}>{item.name}</Option>
                        ))}
                      </OptGroup>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Input placeholder="Mã ID QC" value={filters.maIdQuangCao} onChange={(e) => setFilters(f => ({ ...f, maIdQuangCao: e.target.value }))} allowClear />
                </Col>
                <Col xs={24} sm={24} md={6}>
                  <DatePicker.RangePicker value={dateRange} onChange={(v) => setDateRange(v || [null, null])} format="DD/MM/YYYY" style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']} />
                </Col>
              </Row>
              <div className="filter-actions">
                <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Tổng ${t} đơn` }}
          onChange={handleTableChange}
          scroll={{ x: isSaler ? 1500 : 1300 }}
          size="middle"
          expandable={{ expandedRowRender, expandRowByClick: true, rowExpandable: () => true }}
          rowClassName="clickable-row"
        />
      </motion.div>
    </motion.div>
  );
}
