import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, Tag, Space, Popconfirm, message, Row, Col, Tooltip } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  StopOutlined,
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
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch { message.error('Không thể tải danh sách tài khoản'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

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
    { title: '', width: 100, render: (_, record) => record.username === 'admin' ? null : (
      <Popconfirm
        title={record.active ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
        onConfirm={() => handleToggle(record.id)}
        okText="Xác nhận" cancelText="Hủy"
      >
        <Button type="text" size="small" danger={record.active} style={!record.active ? { color: '#059669' } : {}}>
          {record.active ? 'Khóa' : 'Mở khóa'}
        </Button>
      </Popconfirm>
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
      </div>

      <div className="user-mgmt-desc">
        <UserOutlined />
        <span>Tạo tài khoản cho <b>Nhân viên Sale</b>, <b>Kế toán</b> hoặc <b>Quản trị viên</b>. Chọn vai trò phù hợp khi tạo tài khoản mới.</span>
      </div>

      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
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
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
            <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
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
              <Option value="ADMIN">Quản trị viên</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
}
