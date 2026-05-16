import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, Tag, Space, Popconfirm, message, Row, Col, Tooltip } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { authApi } from '../api';
import dayjs from 'dayjs';

const { Option } = Select;

const roleLabels = {
  ADMIN: { label: 'Quản trị viên', color: '#7C3AED', bg: '#EDE9FE' },
  KE_TOAN: { label: 'Kế toán', color: '#2563EB', bg: '#DBEAFE' },
  SALER: { label: 'Nhân viên Sale', color: '#059669', bg: '#D1FAE5' },
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const ROLE_ORDER = { ADMIN: 0, KE_TOAN: 1, SALER: 2 };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      // Sort by role priority: ADMIN → KE_TOAN → SALER
      const sorted = [...(res.data || [])].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
      setUsers(sorted);
    } catch { message.error('Không thể tải danh sách tài khoản'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Filtered users based on search + role filter
  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      return (u.username || '').toLowerCase().includes(s) || (u.fullName || '').toLowerCase().includes(s);
    }
    return true;
  });

  const handleCreate = () => {
    form.resetFields();
    form.setFieldsValue({ role: 'SALER' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await authApi.register(values);
      message.success('Tạo tài khoản thành công');
      setModalOpen(false);
      fetchUsers();
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.response?.data?.error || 'Lỗi khi tạo tài khoản');
    }
  };

  const handleToggle = async (id) => {
    try {
      await authApi.toggleUser(id);
      message.success('Cập nhật trạng thái thành công');
      fetchUsers();
    } catch { message.error('Lỗi khi cập nhật'); }
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    editForm.resetFields();
    editForm.setFieldsValue({ username: record.username, fullName: record.fullName });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const data = { fullName: values.fullName, username: values.username };
      const pw = values.password?.trim();
      if (pw) data.password = pw;
      const res = await authApi.updateUser(editingUser.id, data);
      const updatedCustomers = res.data?.updatedCustomers ?? 0;
      let msg = pw ? 'Cập nhật tài khoản & mật khẩu thành công' : 'Cập nhật tài khoản thành công';
      if (updatedCustomers > 0) msg += ` — đã chuyển ${updatedCustomers} khách hàng sang tên mới`;
      message.success(msg);
      setEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.response?.data?.error || 'Lỗi khi cập nhật tài khoản');
    }
  };

  const handleDelete = async (id) => {
    try {
      await authApi.deleteUser(id);
      message.success('Xóa tài khoản thành công');
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      fetchUsers();
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi khi xóa tài khoản');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Tài khoản', dataIndex: 'username', width: 150, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Họ tên', dataIndex: 'fullName', width: 200 },
    { title: 'Vai trò', dataIndex: 'role', width: 150, render: (v) => {
      const r = roleLabels[v] || { label: v, color: '#64748B', bg: '#F1F5F9' };
      return <Tag style={{ background: r.bg, color: r.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>{r.label}</Tag>;
    }},
    { title: 'Trạng thái', dataIndex: 'active', width: 120, render: (v) => v
      ? <Tag icon={<CheckCircleOutlined />} color="success">Hoạt động</Tag>
      : <Tag icon={<StopOutlined />} color="error">Đã khóa</Tag>
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 150, render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '' },
    { title: '', width: 200, render: (_, record) => record.username === 'admin' ? null : (
      <Space size={4}>
        <Tooltip title="Sửa thông tin">
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#4F46E5' }} onClick={() => handleEdit(record)} />
        </Tooltip>
        <Popconfirm
          title={record.active ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
          onConfirm={() => handleToggle(record.id)}
          okText="Xác nhận" cancelText="Hủy"
        >
          <Button type="text" size="small" danger={record.active} style={!record.active ? { color: '#059669' } : {}}>
            {record.active ? 'Khóa' : 'Mở khóa'}
          </Button>
        </Popconfirm>
        <Popconfirm
          title={<span style={{ color: '#DC2626', fontWeight: 600 }}>Xóa tài khoản "{record.fullName || record.username}"?</span>}
          description="Hành động này không thể hoàn tác!"
          icon={<ExclamationCircleOutlined style={{ color: '#DC2626' }} />}
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa vĩnh viễn" cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="Xóa tài khoản">
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Tooltip>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-premium">
        <div className="page-header-left">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large" className="create-btn-premium">Tạo tài khoản</Button>
          <div className="page-header-info">
            <UserOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Quản lý tài khoản</span>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            placeholder="Tìm tài khoản / họ tên..."
            prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="Vai trò"
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
            allowClear
            style={{ width: 170 }}
          >
            <Option value="ADMIN"><Tag style={{ background: '#EDE9FE', color: '#7C3AED', border: 'none', fontWeight: 600 }}>Quản trị viên</Tag></Option>
            <Option value="KE_TOAN"><Tag style={{ background: '#DBEAFE', color: '#2563EB', border: 'none', fontWeight: 600 }}>Kế toán</Tag></Option>
            <Option value="SALER"><Tag style={{ background: '#D1FAE5', color: '#059669', border: 'none', fontWeight: 600 }}>Nhân viên Sale</Tag></Option>
          </Select>
        </div>
      </div>

      <div className="user-mgmt-desc">
        <UserOutlined />
        <span>Tạo tài khoản cho <b>Nhân viên Sale</b> hoặc <b>Kế toán</b>. Chọn vai trò phù hợp khi tạo tài khoản mới.</span>
      </div>

      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng ${total} tài khoản`,
            size: 'small',
          }}
          size="middle"
        />
      </motion.div>

      <Modal
        title="Tạo tài khoản mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Tạo"
        cancelText="Hủy"
        width={500}
        destroyOnClose
        className="premium-modal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[
            { required: true, message: 'Nhập tên đăng nhập' },
            { pattern: /^[a-zA-Z0-9._@]+$/, message: 'Chỉ cho phép chữ cái không dấu, số, dấu chấm, @ và gạch dưới' },
            { min: 3, message: 'Tối thiểu 3 ký tự' },
          ]}>
            <Input prefix={<UserOutlined />} placeholder="vd: hieu@dodong hoặc hieu_sale" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ tên đầy đủ" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Ví dụ: Khánh Đồ Đồng" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò">
            <Select>
              <Option value="SALER">Nhân viên Sale</Option>
              <Option value="KE_TOAN">Kế toán</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span><EditOutlined style={{ color: '#4F46E5', marginRight: 8 }} />Sửa tài khoản: {editingUser?.fullName || editingUser?.username}</span>}
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingUser(null); }}
        onOk={handleEditSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={500}
        destroyOnClose
        className="premium-modal"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[
            { required: true, message: 'Nhập tên đăng nhập' },
            { pattern: /^[a-zA-Z0-9._@]+$/, message: 'Chỉ cho phép chữ cái không dấu, số, dấu chấm, @ và gạch dưới' },
            { min: 3, message: 'Tối thiểu 3 ký tự' },
          ]}>
            <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ tên đầy đủ" rules={[{ required: true, message: 'Nhập họ tên' }]}
            extra={<span style={{ fontSize: 12, color: '#F59E0B' }}>⚠ Đổi tên sẽ tự động cập nhật tất cả dữ liệu khách hàng sang tên mới</span>}
          >
            <Input placeholder="Họ tên đầy đủ" />
          </Form.Item>
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 16px 4px', marginBottom: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <LockOutlined style={{ color: '#F59E0B', fontSize: 16 }} />
              <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Đặt lại mật khẩu</span>
              <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>— Để trống nếu không đổi</span>
            </div>
            <Form.Item
              name="password"
              rules={[{
                validator: (_, value) => {
                  if (!value || !value.trim()) return Promise.resolve();
                  return value.trim().length >= 6 ? Promise.resolve() : Promise.reject('Mật khẩu mới phải có ít nhất 6 ký tự');
                }
              }]}
              style={{ marginBottom: 12 }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)" autoComplete="new-password" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </motion.div>
  );
}
