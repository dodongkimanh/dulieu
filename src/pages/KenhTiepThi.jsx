import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Modal, Form, Space, Popconfirm, message, Tag, Switch, Tooltip, Badge, Row, Col } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { kenhTiepThiApi } from '../api';

const { Option } = Select;

const CATEGORY_COLORS = {
  'KÊNH GIAO TIẾP': { color: '#0891B2', bg: '#ECFEFF', icon: '💬' },
  'CÁC XƯỞNG/SHOWROOM': { color: '#7C3AED', bg: '#F5F3FF', icon: '🏭' },
};

export default function KenhTiepThi() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kenhTiepThiApi.getAll();
      setData(res.data || []);
      const cats = [...new Set((res.data || []).map(d => d.category))].filter(Boolean);
      setCategories(cats);
    } catch {
      message.error('Không thể tải danh sách kênh tiếp thị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ active: true, sortOrder: 0 });
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        await kenhTiepThiApi.update(editingRecord.id, values);
        message.success('Cập nhật kênh thành công');
      } else {
        await kenhTiepThiApi.create(values);
        message.success('Thêm kênh thành công');
      }
      setModalOpen(false);
      fetchData();
    } catch (e) {
      if (e.errorFields) return;
      message.error('Lỗi khi lưu');
    }
  };

  const handleDelete = async (id) => {
    try {
      await kenhTiepThiApi.delete(id);
      message.success('Đã xóa kênh');
      fetchData();
    } catch {
      message.error('Lỗi khi xóa');
    }
  };

  const handleToggleActive = async (record) => {
    try {
      await kenhTiepThiApi.update(record.id, { ...record, active: !record.active });
      message.success(record.active ? 'Đã ẩn kênh' : 'Đã kích hoạt kênh');
      fetchData();
    } catch {
      message.error('Lỗi cập nhật trạng thái');
    }
  };

  // Group data by category
  const grouped = {};
  data.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  const columns = [
    {
      title: 'STT',
      width: 60,
      align: 'center',
      render: (_, __, idx) => <span style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</span>,
    },
    {
      title: 'Tên kênh',
      dataIndex: 'name',
      ellipsis: true,
      render: (v, record) => {
        const cat = CATEGORY_COLORS[record.category] || {};
        return (
          <span style={{ fontWeight: 600, color: record.active ? '#1F2937' : '#94A3B8', textDecoration: record.active ? 'none' : 'line-through' }}>
            {cat.icon || '📌'} {v}
          </span>
        );
      },
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      width: 200,
      render: (v) => {
        const cat = CATEGORY_COLORS[v] || { color: '#64748B', bg: '#F1F5F9' };
        return <Tag style={{ background: cat.bg, color: cat.color, border: 'none', fontWeight: 600, borderRadius: 6, padding: '2px 10px' }}>{v}</Tag>;
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      width: 90,
      align: 'center',
      render: (v) => <span style={{ color: '#64748B' }}>{v}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      width: 120,
      align: 'center',
      render: (v, record) => (
        <Switch
          checked={v}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Hiện"
          unCheckedChildren="Ẩn"
          style={{ backgroundColor: v ? '#10B981' : '#CBD5E1' }}
        />
      ),
    },
    {
      title: '',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} />
          </Tooltip>
          <Popconfirm title="Xác nhận xóa kênh?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Tooltip title="Xóa">
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-premium">
        <div className="page-header-left">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large" className="create-btn-premium">
            Thêm kênh
          </Button>
          <div className="page-header-info">
            <AppstoreOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Kênh tiếp thị</span>
            <Badge count={data.length} showZero style={{ backgroundColor: '#4F46E5' }} overflowCount={999} />
          </div>
        </div>
        <div className="page-header-right">
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Tải lại</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {Object.entries(grouped).map(([category, items]) => {
          const catStyle = CATEGORY_COLORS[category] || { color: '#64748B', bg: '#F1F5F9', icon: '📌' };
          const activeCount = items.filter(i => i.active).length;
          return (
            <Col xs={24} sm={12} key={category}>
              <motion.div
                whileHover={{ y: -2 }}
                style={{
                  background: `linear-gradient(135deg, ${catStyle.bg}, white)`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  border: `1px solid ${catStyle.color}20`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{catStyle.icon}</span>
                  <span style={{ fontWeight: 700, color: catStyle.color, fontSize: 14 }}>{category}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748B' }}>
                  <span>Tổng: <strong style={{ color: catStyle.color }}>{items.length}</strong></span>
                  <span>Hoạt động: <strong style={{ color: '#10B981' }}>{activeCount}</strong></span>
                  <span>Ẩn: <strong style={{ color: '#94A3B8' }}>{items.length - activeCount}</strong></span>
                </div>
              </motion.div>
            </Col>
          );
        })}
      </Row>

      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 700 }}
          size="middle"
          rowClassName={(record) => record.active ? '' : 'row-inactive'}
        />
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRecord ? 'Cập nhật kênh tiếp thị' : 'Thêm kênh tiếp thị mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingRecord ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={520}
        destroyOnClose
        className="premium-modal"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên kênh" rules={[{ required: true, message: 'Nhập tên kênh' }]}>
            <Input placeholder="VD: Khách Zalo, Xưởng Đúc Đồng..." prefix={<TagOutlined style={{ color: '#94A3B8' }} />} />
          </Form.Item>
          <Form.Item name="category" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
            <Select
              placeholder="Chọn danh mục"
              showSearch
              allowClear
              optionFilterProp="children"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: '8px 12px', borderTop: '1px solid #F1F5F9', fontSize: 11, color: '#94A3B8' }}>
                    Nhập tên mới để tạo danh mục
                  </div>
                </>
              )}
            >
              {categories.map(c => (
                <Option key={c} value={c}>
                  {CATEGORY_COLORS[c]?.icon || '📌'} {c}
                </Option>
              ))}
              {/* Allow custom input */}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sortOrder" label="Thứ tự hiển thị">
                <Input type="number" min={0} prefix={<OrderedListOutlined style={{ color: '#94A3B8' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Ẩn" style={{ marginTop: 4 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </motion.div>
  );
}
