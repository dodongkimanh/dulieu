import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Modal, Form, Space, Popconfirm, message, Row, Col, Tooltip } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { khachHangApi } from '../api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;

const statusColors = {
  'pending': { color: '#F59E0B', bg: '#FFFBEB', label: 'Chờ xử lý' },
  'contacted': { color: '#3B82F6', bg: '#EFF6FF', label: 'Đã liên hệ' },
  'qualified': { color: '#10B981', bg: '#D1FAE5', label: 'Tiềm năng' },
  'converted': { color: '#4F46E5', bg: '#EEF2FF', label: 'Đã chuyển đổi' },
  'lost': { color: '#EF4444', bg: '#FEE2E2', label: 'Mất' },
};

export default function KhachHang() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [filters, setFilters] = useState({ keyword: '', status: null, sale: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => { fetchData(); fetchMeta(); }, []);

  const fetchData = async (page = 1, size = 15, extra = {}) => {
    setLoading(true);
    try {
      const params = {
        pageNum: page - 1, size,
        keyword: (extra.keyword ?? filters.keyword) || undefined,
        status: (extra.status ?? filters.status) || undefined,
        sale: (extra.sale ?? filters.sale) || undefined,
      };
      const res = await khachHangApi.getAll(params);
      setData(res.data.content);
      setPagination({ current: page, pageSize: size, total: res.data.totalElements });
    } catch (e) {
      message.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [sr, pr] = await Promise.all([khachHangApi.getSales(), khachHangApi.getPages()]);
      setSalesList(sr.data);
      setPagesList(pr.data);
    } catch {}
  };

  const handleTableChange = (pag) => fetchData(pag.current, pag.pageSize);
  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => { setFilters({ keyword: '', status: null, sale: null }); fetchData(1, pagination.pageSize, { keyword: '', status: null, sale: null }); };

  const handleCreate = () => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ ngayThang: dayjs(), status: 'pending' }); setModalOpen(true); };
  const handleEdit = (record) => { setEditingRecord(record); form.setFieldsValue({ ...record, ngayThang: record.ngayThang ? dayjs(record.ngayThang) : dayjs() }); setModalOpen(true); };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.ngayThang = values.ngayThang?.format('YYYY-MM-DD');
      if (editingRecord) {
        await khachHangApi.update(editingRecord.id, values);
        message.success('Cập nhật khách hàng thành công');
      } else {
        await khachHangApi.create(values);
        message.success('Thêm khách hàng thành công');
      }
      setModalOpen(false);
      fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e.errorFields) return;
      message.error('Lỗi khi lưu khách hàng');
    }
  };

  const handleDelete = async (id) => {
    try {
      await khachHangApi.delete(id);
      message.success('Xóa khách hàng thành công');
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi khi xóa khách hàng'); }
  };

  const columns = [
    { title: 'Ngày', dataIndex: 'ngayThang', width: 110, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Khách hàng', dataIndex: 'khachHang', width: 180, ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'SĐT', dataIndex: 'sdt', width: 130 },
    { title: 'Sale', dataIndex: 'sale', width: 100 },
    { title: 'Page', dataIndex: 'page', width: 140, ellipsis: true },
    { title: 'Mess', dataIndex: 'mess', width: 180, ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (v) => {
      const sc = statusColors[v] || { color: '#64748B', bg: '#F1F5F9', label: v };
      return <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>{sc.label}</Tag>;
    }},
    { title: '', width: 90, fixed: 'right', render: (_, record) => (
      <Space size={4}>
        <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
        <Popconfirm title="Xác nhận xóa khách hàng?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
          <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-premium">
        <div className="page-header-left">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large" className="create-btn-premium">Thêm khách hàng</Button>
          <div className="page-header-info">
            <TeamOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Khách hàng</span>
          </div>
        </div>
        <div className="page-header-right">
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onPressEnter={handleSearch}
            style={{ width: 220 }}
            allowClear
          />
          <Select placeholder="Trạng thái" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} allowClear style={{ width: 140 }}>
            {Object.entries(statusColors).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
          </Select>
          <Select placeholder="Sale" value={filters.sale} onChange={(v) => setFilters({ ...filters, sale: v })} allowClear style={{ width: 130 }}>
            {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
          <Button icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        </div>
      </div>

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
          pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Tổng ${t} khách hàng` }}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
          size="middle"
        />
      </motion.div>

      <Modal
        title={editingRecord ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingRecord ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={680}
        destroyOnClose
        className="premium-modal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="ngayThang" label="Ngày"><Input disabled={true} /></Form.Item></Col>
            <Col span={12}><Form.Item name="khachHang" label="Tên khách hàng" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="sdt" label="Số điện thoại"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="sale" label="Sale"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="page" label="Page"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="idTrang" label="ID Trang"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="uid" label="UID"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="adId" label="Ad ID"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="status" label="Trạng thái"><Select>{Object.entries(statusColors).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}</Select></Form.Item></Col>
            <Col span={12}><Form.Item name="mess" label="Mess"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </motion.div>
  );
}
