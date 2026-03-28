import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, DatePicker, Tag, Modal, Form, InputNumber, Space, Popconfirm, message, Row, Col, Tooltip, Divider, Typography } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [salesList, setSalesList] = useState([]);
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
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({ ...record, ngay: record.ngay ? dayjs(record.ngay) : dayjs() });
    recalculate(record);
    setModalOpen(true);
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
      setModalOpen(false);
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
    { title: 'Ngày', dataIndex: 'ngay', width: 100, fixed: 'left', render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Mã HĐ', dataIndex: 'maHoaDon', width: 150, render: (v) => <span style={{ color: '#4F46E5', fontWeight: 600 }}>{v}</span> },
    { title: 'Mã ĐH', dataIndex: 'maDatHang', width: 120 },
    { title: 'Khách hàng', dataIndex: 'khachHang', width: 150, ellipsis: true },
    { title: 'SĐT', dataIndex: 'sdt', width: 115 },
    { title: 'Sale', dataIndex: 'sale', width: 130 },
    { title: 'Giá Vốn', dataIndex: 'giaVon', width: 120, align: 'right', render: (v) => vnd(v) },
    { title: 'Tổng Niêm Yết', dataIndex: 'tongTienNiemYet', width: 130, align: 'right', render: (v) => vnd(v) },
    { title: 'Giá Bán Lên Đơn', dataIndex: 'giaBanLenDon', width: 140, align: 'right', render: (v) => vnd(v) },
    { title: 'Cước Phụ Trội', dataIndex: 'cuocPhuTroi', width: 120, align: 'right', render: (v) => vnd(v) },
    { title: 'Giá Thu TT', dataIndex: 'giaThuThucTe', width: 120, align: 'right', render: (v) => <b style={{ color: '#059669' }}>{vnd(v)}</b> },
    { title: 'CK %', dataIndex: 'tyLeCk', width: 80, align: 'right', render: (v) => `${Number(v || 0).toFixed(1)}%` },
    { title: 'LN Ước Tính', dataIndex: 'loiNhuanUocTinh', width: 130, align: 'right', render: (v) => <b style={{ color: v >= 0 ? '#059669' : '#DC2626' }}>{vnd(v)}</b> },
    { title: 'Tình Trạng', dataIndex: 'tinhTrang', width: 160, render: (v) => {
      const sc = statusColors[v] || { color: '#64748B', bg: '#F1F5F9' };
      return <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>{v}</Tag>;
    }},
    { title: 'Mã Vận Đơn', dataIndex: 'maVanDon', width: 130 },
    { title: 'CP Vận Chuyển', dataIndex: 'chiPhiVanChuyen', width: 130, align: 'right', render: (v) => vnd(v) },
    { title: 'ĐS Vận Chuyển', dataIndex: 'dsVanChuyen', width: 130, align: 'right', render: (v) => vnd(v) },
    { title: 'Đặt Cọc', dataIndex: 'datCoc', width: 120, align: 'right', render: (v) => vnd(v) },
    { title: 'Thu Trực Tiếp', dataIndex: 'thuBanTrucTiep', width: 130, align: 'right', render: (v) => vnd(v) },
    { title: 'Tổng Thu Khách', dataIndex: 'tongThuKhach', width: 130, align: 'right', render: (v) => <b>{vnd(v)}</b> },
    { title: 'LN Sau Trừ', dataIndex: 'loiNhuanSauTru', width: 130, align: 'right', render: (v) => <b style={{ color: v >= 0 ? '#059669' : '#DC2626' }}>{vnd(v)}</b> },
    { title: 'Page', dataIndex: 'page', width: 200, ellipsis: true },
    { title: 'Mã ID Bài Quảng Cáo', dataIndex: 'maIdQuangCao', width: 160 },
    { title: 'Ghi chú', dataIndex: 'ghiChu', width: 150, ellipsis: true },
    ...(canEdit ? [{ title: '', width: 80, fixed: 'right', render: (_, record) => (
      <Space size={4}>
        <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
          <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
        </Popconfirm>
      </Space>
    )}] : []),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Toolbar */}
      <div className="sg-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="sg-toolbar-title"><ShoppingCartOutlined style={{ color: '#4F46E5' }} /> Đơn hàng</div>
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          value={filters.keyword}
          onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))}
          onPressEnter={handleSearch}
          style={{ width: 180 }}
          allowClear
        />
        <Select placeholder="Tình trạng" value={filters.tinhTrang} onChange={(v) => setFilters(f => ({ ...f, tinhTrang: v }))} allowClear style={{ width: 160 }}>
          {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        <Select placeholder="Sale" value={filters.sale} onChange={(v) => setFilters(f => ({ ...f, sale: v }))} allowClear style={{ width: 140 }}>
          {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        <Select placeholder="Page" value={filters.page} onChange={(v) => setFilters(f => ({ ...f, page: v }))} allowClear style={{ width: 200 }} showSearch optionFilterProp="children">
          {PAGE_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        <Input
          placeholder="Mã ID QC"
          value={filters.maIdQuangCao}
          onChange={(e) => setFilters(f => ({ ...f, maIdQuangCao: e.target.value }))}
          style={{ width: 130 }}
          allowClear
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(v) => setDateRange(v || [null, null])}
          format="DD/MM/YYYY"
          style={{ width: 230 }}
        />
        <Button icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ color: '#10B981' }}>Excel</Button>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tạo đơn</Button>}
      </div>

      {/* Table */}
      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Tổng ${t} đơn` }}
          onChange={handleTableChange}
          scroll={{ x: 3200 }}
          size="small"
        />
      </motion.div>

      {/* Modal */}
      <Modal
        title={editingRecord ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingRecord ? 'Cập nhật' : 'Tạo'}
        cancelText="Hủy"
        width={900}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onValuesChange={handleValuesChange} style={{ marginTop: 16 }}>
          <Divider orientation="left" plain>Thông tin chung</Divider>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="ngay" label="Ngày"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={6}><Form.Item name="maDatHang" label="Mã Đặt Hàng"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="khachHang" label="Khách hàng" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="sdt" label="SĐT"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="sale" label="Sale">
                <Select allowClear showSearch optionFilterProp="children" placeholder="Chọn Sale">
                  {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="page" label="Page">
                <Select allowClear showSearch optionFilterProp="children" placeholder="Chọn Page">
                  {PAGE_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={5}><Form.Item name="maIdQuangCao" label="Mã ID Quảng Cáo"><Input /></Form.Item></Col>
            <Col span={5}>
              <Form.Item name="tinhTrang" label="Tình trạng">
                <Select>
                  {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Giá & Chiết khấu</Divider>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="giaVon" label="Giá Vốn"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
            <Col span={6}><Form.Item name="tongTienNiemYet" label="Tổng Niêm Yết"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
            <Col span={6}><Form.Item name="giaBanLenDon" label="Giá Bán Lên Đơn"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
            <Col span={6}><Form.Item name="cuocPhuTroi" label="Cước Phụ Trội"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Giá Thu Thực Tế</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{vnd(calculated.giaThuThucTe)} đ</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tỷ lệ CK</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{calculated.tyLeCk.toFixed(1)}%</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '8px 12px', background: calculated.loiNhuanUocTinh >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, border: `1px solid ${calculated.loiNhuanUocTinh >= 0 ? '#BBF7D0' : '#FECACA'}` }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Lợi Nhuận Ước Tính</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: calculated.loiNhuanUocTinh >= 0 ? '#059669' : '#DC2626' }}>{vnd(calculated.loiNhuanUocTinh)} đ</div>
              </div>
            </Col>
          </Row>

          <Divider orientation="left" plain style={{ marginTop: 20 }}>Vận chuyển & Thanh toán</Divider>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="maVanDon" label="Mã Vận Đơn"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="chiPhiVanChuyen" label="Chi Phí Vận Chuyển"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
            <Col span={8}><Form.Item name="dsVanChuyen" label="ĐS Vận Chuyển"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="datCoc" label="Đặt cọc / CK"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
            <Col span={8}><Form.Item name="thuBanTrucTiep" label="Thu bán trực tiếp (tiền mặt)"><InputNumber min={0} style={{ width: '100%' }} formatter={numFmt} parser={numParse} /></Form.Item></Col>
            <Col span={8} />
          </Row>
          <Row gutter={16} style={{ marginTop: 4 }}>
            <Col span={12}>
              <div style={{ padding: '8px 12px', background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tổng Thu Khách</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#C2410C' }}>{vnd(calculated.tongThuKhach)} đ</div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ padding: '8px 12px', background: calculated.loiNhuanSauTru >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, border: `1px solid ${calculated.loiNhuanSauTru >= 0 ? '#BBF7D0' : '#FECACA'}` }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Lợi Nhuận Sau Trừ</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: calculated.loiNhuanSauTru >= 0 ? '#059669' : '#DC2626' }}>{vnd(calculated.loiNhuanSauTru)} đ</div>
              </div>
            </Col>
          </Row>

          <Divider orientation="left" plain style={{ marginTop: 20 }}>Ghi chú</Divider>
          <Form.Item name="ghiChu"><TextArea rows={3} placeholder="Ghi chú thêm..." /></Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
}
