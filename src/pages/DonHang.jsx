import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, DatePicker, Tag, Drawer, Form, InputNumber, Space, Popconfirm, message, Row, Col, Tooltip, Typography, Badge } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  CarOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { donHangApi, authApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const STATUS_OPTIONS = [
  'Đã Giao Thành Công', 'Đang Chờ', 'KH Showroom', 'Hoàn hàng',
  'Đang vận chuyển', 'Đang giao', 'HỦY ĐƠN', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
];

const PAGE_OPTIONS = [
  'Khách Zalo', 'Hotline', 'Khách cũ, khách giới thiệu, tìm kiếm', 'Kh Showroom',
  'Tranh Đồng Kim Ánh Nam Định(576414695535724)',
  'Xưởng Chế Tác Đồ Thờ Kim Ánh(516517308218764)',
  'Kim Ánh Đúc Đỉnh Đồng Nam Định(560584423798299)',
  'Xưởng Đúc Đồng Kim Ánh(647496405105905)',
  'Xưởng Đồng Gia Truyền Nam Định(101435218182393)',
  'Xưởng Đúc Đồng Gia Truyền Kim Ánh(579540361901590)',
  'Đúc Đỉnh Thờ Kim Ánh(576614052193406)',
  'Kim Ánh Đỉnh Đồng Nam Định(585239897998547)',
  'Xưởng Đồng Kim Ánh(530886750113441)',
  'Xưởng Đúc Đồng Kim Ánh Gia Truyền Nam Định(567376346452543)',
  'Đúc Đồng Làng Nghề Truyền Thống Nam Định(578286328693026)',
  'Xưởng Đúc Đồng Nam Định(134583069730624)',
  'Đồ Đồng Kim Ánh Nam Định(110027362001260)',
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
const numFmt = (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const numParse = (v) => v.replace(/,/g, '');

export default function DonHang() {
  const { isAdmin, isKeToan } = useAuth();
  const canEdit = isAdmin || isKeToan;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ keyword: '', tinhTrang: null, sale: null, page: null, maIdQuangCao: '' });
  const [dateRange, setDateRange] = useState([null, null]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [calculated, setCalculated] = useState({ giaThuThucTe: 0, tyLeCk: 0, loiNhuanUocTinh: 0, tongThuKhach: 0, loiNhuanSauTru: 0 });
  const [form] = Form.useForm();

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
    try {
      const res = await authApi.getSaleUsers();
      setSalesList(res.data);
    } catch {}
  };

  useEffect(() => { fetchData(); fetchSales(); }, []);

  const handleTableChange = (pag) => fetchData(pag.current, pag.pageSize);
  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => {
    setFilters({ keyword: '', tinhTrang: null, sale: null, page: null, maIdQuangCao: '' });
    setDateRange([null, null]);
    fetchData(1, pagination.pageSize, { keyword: '', tinhTrang: null, sale: null, page: null, maIdQuangCao: '' });
  };

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ ngay: dayjs(), tinhTrang: 'Đang Chờ', cuocPhuTroi: 0 });
    setCalculated({ giaThuThucTe: 0, tyLeCk: 0, loiNhuanUocTinh: 0, tongThuKhach: 0, loiNhuanSauTru: 0 });
    setDrawerOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, ngay: record.ngay ? dayjs(record.ngay) : dayjs() });
    recalculate(record);
    setDrawerOpen(true);
  };

  const recalculate = (vals) => {
    const ban = Number(vals.giaBanLenDon || 0);
    const phu = Number(vals.cuocPhuTroi || 0);
    const von = Number(vals.giaVon || 0);
    const niem = Number(vals.tongTienNiemYet || 0);
    const coc = Number(vals.datCoc || 0);
    const truc = Number(vals.thuBanTrucTiep || 0);
    const dsvc = Number(vals.dsVanChuyen || 0);
    const cpvc = Number(vals.chiPhiVanChuyen || 0);

    const giaThuThucTe = ban - phu;
    const tyLeCk = niem > 0 ? ((niem - giaThuThucTe) / niem) * 100 : 0;
    const loiNhuanUocTinh = giaThuThucTe - von;
    const tongThuKhach = coc + truc + dsvc;
    const loiNhuanSauTru = tongThuKhach - cpvc;
    setCalculated({ giaThuThucTe, tyLeCk, loiNhuanUocTinh, tongThuKhach, loiNhuanSauTru });
  };

  const handleValuesChange = (_, allValues) => recalculate(allValues);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.ngay = values.ngay?.format('YYYY-MM-DD');
      if (editingRecord) {
        await donHangApi.update(editingRecord.id, values);
        message.success('Cập nhật đơn hàng thành công');
      } else {
        await donHangApi.create(values);
        message.success('Tạo đơn hàng thành công');
      }
      setDrawerOpen(false);
      fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e.errorFields) return;
      message.error('Lỗi khi lưu đơn hàng');
    }
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

  const columns = [
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
    ...(canEdit ? [{ title: '', width: 80, fixed: 'right', render: (_, record) => (
      <Space size={4}>
        <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }} style={{ color: '#4F46E5' }} /></Tooltip>
        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
          <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} danger /></Tooltip>
        </Popconfirm>
      </Space>
    )}] : []),
  ];

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
      <div className="expand-section">
        <div className="expand-section-title"><DollarOutlined /> Giá & Chiết khấu</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Giá Vốn</span><span className="expand-value">{vnd(record.giaVon)} đ</span></div>
          <div className="expand-item"><span className="expand-label">Tổng Niêm Yết</span><span className="expand-value">{vnd(record.tongTienNiemYet)} đ</span></div>
          <div className="expand-item"><span className="expand-label">Cước Phụ Trội</span><span className="expand-value">{vnd(record.cuocPhuTroi)} đ</span></div>
          <div className="expand-item"><span className="expand-label">CK %</span><span className="expand-value">{Number(record.tyLeCk || 0).toFixed(1)}%</span></div>
        </div>
      </div>
      <div className="expand-section">
        <div className="expand-section-title"><CarOutlined /> Vận chuyển & Thanh toán</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Mã Vận Đơn</span><span className="expand-value">{record.maVanDon || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">CP Vận Chuyển</span><span className="expand-value">{vnd(record.chiPhiVanChuyen)} đ</span></div>
          <div className="expand-item"><span className="expand-label">ĐS Vận Chuyển</span><span className="expand-value">{vnd(record.dsVanChuyen)} đ</span></div>
          <div className="expand-item"><span className="expand-label">Đặt Cọc</span><span className="expand-value">{vnd(record.datCoc)} đ</span></div>
          <div className="expand-item"><span className="expand-label">Thu Trực Tiếp</span><span className="expand-value">{vnd(record.thuBanTrucTiep)} đ</span></div>
          <div className="expand-item highlight"><span className="expand-label">Tổng Thu Khách</span><span className="expand-value">{vnd(record.tongThuKhach)} đ</span></div>
          <div className="expand-item highlight"><span className="expand-label">LN Sau Trừ</span><span className="expand-value" style={{ color: record.loiNhuanSauTru >= 0 ? '#059669' : '#DC2626' }}>{vnd(record.loiNhuanSauTru)} đ</span></div>
        </div>
      </div>
      {record.ghiChu && (
        <div className="expand-section full">
          <div className="expand-section-title">📝 Ghi chú</div>
          <p className="expand-note">{record.ghiChu}</p>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Page Header - Create button on LEFT */}
      <div className="page-header-premium">
        <div className="page-header-left">
          {canEdit && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large" className="create-btn-premium">
                Tạo đơn hàng
              </Button>
            </motion.div>
          )}
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
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
              type={showFilters ? 'primary' : 'default'}
              ghost={showFilters}
            >
              Bộ lọc
            </Button>
          </Tooltip>
          <Tooltip title="Xuất Excel">
            <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ color: '#10B981' }}>Excel</Button>
          </Tooltip>
        </div>
      </div>

      {/* Animated Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filter-panel-premium"
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="filter-panel-inner">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} sm={12} md={5}>
                  <Select placeholder="Tình trạng" value={filters.tinhTrang} onChange={(v) => setFilters(f => ({ ...f, tinhTrang: v }))} allowClear style={{ width: '100%' }}>
                    {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Select placeholder="Sale" value={filters.sale} onChange={(v) => setFilters(f => ({ ...f, sale: v }))} allowClear style={{ width: '100%' }}>
                    {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Select placeholder="Page" value={filters.page} onChange={(v) => setFilters(f => ({ ...f, page: v }))} allowClear style={{ width: '100%' }} showSearch optionFilterProp="children">
                    {PAGE_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Input placeholder="Mã ID QC" value={filters.maIdQuangCao} onChange={(e) => setFilters(f => ({ ...f, maIdQuangCao: e.target.value }))} allowClear />
                </Col>
                <Col xs={24} sm={24} md={6}>
                  <DatePicker.RangePicker
                    value={dateRange}
                    onChange={(v) => setDateRange(v || [null, null])}
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    placeholder={['Từ ngày', 'Đến ngày']}
                  />
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

      {/* Table with expandable rows */}
      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Tổng ${t} đơn` }}
          onChange={handleTableChange}
          scroll={{ x: 1300 }}
          size="middle"
          expandable={{
            expandedRowRender,
            expandRowByClick: true,
            rowExpandable: () => true,
          }}
          rowClassName="clickable-row"
        />
      </motion.div>

      {/* Premium Drawer */}
      <Drawer
        title={null}
        placement="right"
        width={680}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        closable={false}
        className="premium-drawer"
        styles={{ body: { padding: 0, background: '#F8FAFC' }, header: { display: 'none' } }}
      >
        <div className="drawer-custom-header">
          <div className="drawer-header-content">
            <div className="drawer-header-icon">
              <ShoppingCartOutlined />
            </div>
            <div>
              <h3>{editingRecord ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng mới'}</h3>
              <p>Điền đầy đủ thông tin đơn hàng</p>
            </div>
          </div>
          <Button type="text" icon={<CloseOutlined />} onClick={() => setDrawerOpen(false)} className="drawer-close-btn" />
        </div>

        <div className="drawer-body-content">
          <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
            <div className="form-section-card">
              <div className="form-section-header">
                <InfoCircleOutlined />
                <span>Thông tin chung</span>
              </div>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="ngay" label="Ngày"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                <Col span={12}><Form.Item name="maDatHang" label="Mã Đặt Hàng"><Input /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="khachHang" label="Khách hàng" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="sdt" label="SĐT"><Input /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="sale" label="Sale">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Chọn Sale">
                      {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="page" label="Page">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Chọn Page">
                      {PAGE_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="maIdQuangCao" label="Mã ID Quảng Cáo"><Input /></Form.Item></Col>
                <Col span={12}>
                  <Form.Item name="tinhTrang" label="Tình trạng">
                    <Select>
                      {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="form-section-card">
              <div className="form-section-header">
                <DollarOutlined />
                <span>Giá & Chiết khấu</span>
              </div>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="giaVon" label="Giá Vốn"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
                <Col span={12}><Form.Item name="tongTienNiemYet" label="Tổng Niêm Yết"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="giaBanLenDon" label="Giá Bán Lên Đơn"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
                <Col span={12}><Form.Item name="cuocPhuTroi" label="Cước Phụ Trội"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
              </Row>
              <div className="calc-cards-row">
                <div className="calc-card green">
                  <span className="calc-label">Giá Thu Thực Tế</span>
                  <span className="calc-value">{vnd(calculated.giaThuThucTe)} đ</span>
                </div>
                <div className="calc-card blue">
                  <span className="calc-label">Tỷ lệ CK</span>
                  <span className="calc-value">{calculated.tyLeCk.toFixed(1)}%</span>
                </div>
                <div className="calc-card purple">
                  <span className="calc-label">LN Ước Tính</span>
                  <span className="calc-value">{vnd(calculated.loiNhuanUocTinh)} đ</span>
                </div>
              </div>
            </div>

            <div className="form-section-card">
              <div className="form-section-header">
                <CarOutlined />
                <span>Vận chuyển & Thanh toán</span>
              </div>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="maVanDon" label="Mã Vận Đơn"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="chiPhiVanChuyen" label="Chi Phí Vận Chuyển"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
                <Col span={8}><Form.Item name="dsVanChuyen" label="ĐS Vận Chuyển"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="datCoc" label="Đặt cọc / CK"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
                <Col span={12}><Form.Item name="thuBanTrucTiep" label="Thu bán trực tiếp (tiền mặt)"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
              </Row>
              <div className="calc-cards-row">
                <div className="calc-card orange">
                  <span className="calc-label">Tổng Thu Khách</span>
                  <span className="calc-value">{vnd(calculated.tongThuKhach)} đ</span>
                </div>
                <div className="calc-card emerald">
                  <span className="calc-label">Lợi Nhuận Sau Trừ</span>
                  <span className="calc-value">{vnd(calculated.loiNhuanSauTru)} đ</span>
                </div>
              </div>
            </div>

            <div className="form-section-card">
              <div className="form-section-header">📝 <span>Ghi chú</span></div>
              <Form.Item name="ghiChu"><TextArea rows={3} placeholder="Ghi chú thêm..." /></Form.Item>
            </div>
          </Form>
        </div>

        <div className="drawer-custom-footer">
          <Button onClick={() => setDrawerOpen(false)} size="large">Hủy</Button>
          <Button type="primary" onClick={handleSubmit} size="large" className="submit-btn-premium">
            {editingRecord ? 'Cập nhật' : 'Tạo đơn hàng'}
          </Button>
        </div>
      </Drawer>
    </motion.div>
  );
}
