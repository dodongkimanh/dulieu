import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, DatePicker, Tag, Modal, Form, InputNumber, Space, Popconfirm, message, Row, Col, Tooltip } from 'antd';
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
import { donHangApi, khachHangApi } from '../api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;
const { TextArea } = Input;

const statusColors = {
  'Mới': { color: '#3B82F6', bg: '#EFF6FF' },
  'Đang xử lý': { color: '#F59E0B', bg: '#FFFBEB' },
  'Hoàn thành': { color: '#10B981', bg: '#D1FAE5' },
  'Đã hủy': { color: '#EF4444', bg: '#FEE2E2' },
  'Chờ thanh toán': { color: '#8B5CF6', bg: '#EDE9FE' },
};

export default function DonHang() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [filters, setFilters] = useState({ keyword: '', trangThai: null, sale: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => { fetchData(); fetchSales(); }, []);

  const fetchData = async (page = 1, size = 15, extra = {}) => {
    setLoading(true);
    try {
      const params = {
        page: page - 1, size,
        keyword: (extra.keyword ?? filters.keyword) || undefined,
        trangThai: (extra.trangThai ?? filters.trangThai) || undefined,
        sale: (extra.sale ?? filters.sale) || undefined,
      };
      const res = await donHangApi.getAll(params);
      setData(res.data.content);
      setPagination({ current: page, pageSize: size, total: res.data.totalElements });
    } catch (e) {
      message.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await donHangApi.getSales();
      setSalesList(res.data);
    } catch {}
  };

  const handleTableChange = (pag) => fetchData(pag.current, pag.pageSize);
  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => { setFilters({ keyword: '', trangThai: null, sale: null }); fetchData(1, pagination.pageSize, { keyword: '', trangThai: null, sale: null }); };

  const handleCreate = () => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ ngayDat: dayjs(), soLuong: 1, donGia: 0, chietKhau: 0, hinhThucThanhToan: 'Tien mat', trangThai: 'Moi' }); setModalOpen(true); };
  const handleEdit = (record) => { setEditingRecord(record); form.setFieldsValue({ ...record, ngayDat: record.ngayDat ? dayjs(record.ngayDat) : dayjs() }); setModalOpen(true); };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.ngayDat = values.ngayDat?.format('YYYY-MM-DD');
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
    try {
      await donHangApi.delete(id);
      message.success('Xóa đơn hàng thành công');
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi khi xóa đơn hàng'); }
  };

  const handleExport = async () => {
    try {
      const res = await donHangApi.export(filters);
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

  const handleValuesChange = (changed, allValues) => {
    if (changed.soLuong !== undefined || changed.donGia !== undefined || changed.chietKhau !== undefined) {
      const tongTien = (allValues.donGia || 0) * (allValues.soLuong || 0);
      const thanhToan = tongTien - (allValues.chietKhau || 0);
      form.setFieldsValue({ tongTien, thanhToan });
    }
  };

  const columns = [
    { title: 'Mã đơn', dataIndex: 'maDon', width: 130, fixed: 'left', render: (v) => <span style={{ color: '#4F46E5', fontWeight: 600 }}>{v}</span> },
    { title: 'Ngày đặt', dataIndex: 'ngayDat', width: 110, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Khách hàng', dataIndex: 'tenKhach', width: 150, ellipsis: true },
    { title: 'SĐT', dataIndex: 'sdt', width: 120 },
    { title: 'Sản phẩm', dataIndex: 'sanPham', width: 180, ellipsis: true },
    { title: 'SL', dataIndex: 'soLuong', width: 60, align: 'center' },
    { title: 'Thanh toán', dataIndex: 'thanhToan', width: 130, align: 'right', render: (v) => <span style={{ fontWeight: 700, color: '#0F172A' }}>{Number(v || 0).toLocaleString('vi-VN')} đ</span> },
    { title: 'Trạng thái', dataIndex: 'trangThai', width: 130, render: (v) => {
      const sc = statusColors[v] || { color: '#64748B', bg: '#F1F5F9' };
      return <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>{v}</Tag>;
    }},
    { title: 'Sale', dataIndex: 'sale', width: 100 },
    { title: '', width: 90, fixed: 'right', render: (_, record) => (
      <Space size={4}>
        <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
        <Popconfirm title="Xác nhận xóa đơn hàng?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
          <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Toolbar */}
      <div className="sg-toolbar">
        <div className="sg-toolbar-title"><ShoppingCartOutlined style={{ color: '#4F46E5' }} /> Đơn hàng</div>
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          onPressEnter={handleSearch}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          value={filters.trangThai}
          onChange={(v) => setFilters({ ...filters, trangThai: v })}
          allowClear style={{ width: 150 }}
        >
          {['Mới', 'Đang xử lý', 'Hoàn thành', 'Đã hủy', 'Chờ thanh toán'].map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        <Select
          placeholder="Sale"
          value={filters.sale}
          onChange={(v) => setFilters({ ...filters, sale: v })}
          allowClear style={{ width: 130 }}
        >
          {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        <Button icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ color: '#10B981' }}>Excel</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tạo đơn</Button>
      </div>

      {/* Table */}
      <motion.div
        className="sg-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Tổng ${t} đơn` }}
          onChange={handleTableChange}
          scroll={{ x: 1300 }}
          size="middle"
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
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onValuesChange={handleValuesChange} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="ngayDat" label="Ngày đặt"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={12}><Form.Item name="tenKhach" label="Khách hàng" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="sdt" label="SĐT"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="diaChi" label="Địa chỉ"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}><Form.Item name="sanPham" label="Sản phẩm" rules={[{ required: true, message: 'Nhập sản phẩm' }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="soLuong" label="Số lượng"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="donGia" label="Đơn giá"><InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} /></Form.Item></Col>
            <Col span={8}><Form.Item name="chietKhau" label="Chiết khấu"><InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} /></Form.Item></Col>
            <Col span={8}><Form.Item name="thanhToan" label="Thanh toán"><InputNumber style={{ width: '100%' }} disabled formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="hinhThucThanhToan" label="Hình thức TT"><Select><Option value="Tiền mặt">Tiền mặt</Option><Option value="Chuyển khoản">Chuyển khoản</Option><Option value="QR Code">QR Code</Option></Select></Form.Item></Col>
            <Col span={8}><Form.Item name="trangThai" label="Trạng thái"><Select>{['Mới', 'Đang xử lý', 'Hoàn thành', 'Đã hủy', 'Chờ thanh toán'].map(s => <Option key={s} value={s}>{s}</Option>)}</Select></Form.Item></Col>
            <Col span={8}><Form.Item name="sale" label="Sale"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="ghiChu" label="Ghi chú"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
}
