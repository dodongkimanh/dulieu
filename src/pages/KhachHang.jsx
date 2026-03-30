import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Modal, Form, Space, Popconfirm, message, Row, Col, Tooltip, Divider } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { khachHangApi, authApi } from '../api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { Option, OptGroup } = Select;
const { TextArea } = Input;

// PAGE OPTIONS - Danh sách kênh tiếp thị
const PAGE_CATEGORIES = {
  'KÊNH GIAO TIẾP': ['Khách Zalo', 'Hotline', 'Khách cũ, khách giới thiệu, tìm kiếm', 'Kh Showroom'],
  'CÁC XƯỞNG/SHOWROOM': [
    'Tranh Đồng Kim Ánh Nam Định(576414695535724)',
    'Xưởng Chế Tác Đồ Thờ Kim Ánh(516517308218764)',
    'Kim Ánh Đúc Đỉnh Đồng Nam Định(560584423798299)',
    'Xưởng Đúc Đồng Kim Ánh(647496405105905)',
    'Xưởng Đồng Gia Truyền Nam Định(101435218182393)',
    'Xưởng Đúc Đồng Gia Truyền Kim Ánh (579540361901590)',
    'Đúc Đỉnh Thờ Kim Ánh(576614052193406)',
    'Kim Ánh Đỉnh Đồng Nam Định (585239897998547)',
    'Xưởng Đồng Kim Ánh(530886750113441)',
    'Xưởng Đúc Đồng Kim Ánh Gia Truyền Nam Định (567376346452543)',
    'Đúc Đồng Làng Nghề Truyền Thống Nam Định (578286328693026)',
    'Xưởng Đúc Đồng Nam Định (134583069730624)',
    'Đồ Đồng Kim Ánh Nam Định(110027362001260)',
  ],
};

const statusColors = {
  'moi': { color: '#3B82F6', bg: '#EFF6FF', label: 'Mới' },
  'da_lien_he': { color: '#8B5CF6', bg: '#F5F3FF', label: 'Đã liên hệ' },
  'dang_cham_soc': { color: '#F59E0B', bg: '#FFFBEB', label: 'Đang chăm sóc' },
  'da_chuyen_doi': { color: '#10B981', bg: '#D1FAE5', label: 'Đã chuyển đổi' },
  'da_chot_don': { color: '#4F46E5', bg: '#EEF2FF', label: 'Đã chốt đơn' },
  'tiem_nang': { color: '#06B6D4', bg: '#ECFEFF', label: 'Tiềm năng' },
  'khong_tiem_nang': { color: '#94A3B8', bg: '#F1F5F9', label: 'Không tiềm năng' },
  'huy_don': { color: '#EF4444', bg: '#FEE2E2', label: 'Hủy đơn' },
};

export default function KhachHang() {
  const { user, isAdmin, isSaler } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [filters, setFilters] = useState({ keyword: '', status: null, sale: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [transferModal, setTransferModal] = useState({ open: false, record: null, sale: null });
  const [allSaleUsers, setAllSaleUsers] = useState([]);
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
      setSalesList(sr.data || []);
      setPagesList(pr.data || []);
    } catch {}
    try {
      const res = await authApi.getSaleUsers();
      const names = (res.data || []).filter(Boolean);
      setAllSaleUsers(names);
    } catch {}
  };

  const handleTableChange = (pag) => fetchData(pag.current, pag.pageSize);
  const handleSearch = () => fetchData(1, pagination.pageSize);
  const handleReset = () => { setFilters({ keyword: '', status: null, sale: null }); fetchData(1, pagination.pageSize, { keyword: '', status: null, sale: null }); };

  const handleCreate = () => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ ngayThang: dayjs(), status: 'moi' }); setModalOpen(true); };
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

  const handleStatusChange = async (id, status) => {
    try {
      await khachHangApi.updateStatus(id, status);
      message.success('Cập nhật trạng thái thành công');
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi cập nhật trạng thái'); }
  };

  const handleTransfer = async () => {
    if (!transferModal.record || !transferModal.sale) return;
    try {
      await khachHangApi.transferSale(transferModal.record.id, transferModal.sale);
      message.success('Chuyển khách hàng thành công');
      setTransferModal({ open: false, record: null, sale: null });
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi chuyển khách hàng'); }
  };

  const handleNoteSave = async (id, notes) => {
    try {
      await khachHangApi.updateNotes(id, notes);
      message.success('Lưu ghi chú thành công');
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi lưu ghi chú'); }
  };

  const columns = [
    { title: 'Ngày', dataIndex: 'ngayThang', width: 110, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Khách hàng', dataIndex: 'khachHang', width: 180, ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'SĐT', dataIndex: 'sdt', width: 130 },
    { title: 'Sale', dataIndex: 'sale', width: 100 },
    { title: 'Tùy Chọn', dataIndex: 'page', width: 220, ellipsis: true, render: (v) => <Tooltip title={v}><span style={{ color: '#7C3AED', fontWeight: 500 }}>{v}</span></Tooltip> },
    { title: 'Trạng thái', dataIndex: 'status', width: 160, render: (v, record) => (
      <Select
        value={v}
        onChange={(val) => handleStatusChange(record.id, val)}
        size="small"
        style={{ width: '100%' }}
        popupMatchSelectWidth={false}
      >
        {Object.entries(statusColors).map(([k, sc]) => (
          <Option key={k} value={k}>
            <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '1px 8px', borderRadius: 6, margin: 0 }}>{sc.label}</Tag>
          </Option>
        ))}
      </Select>
    )},
    { title: 'Ghi chú', dataIndex: 'mess', width: 200, ellipsis: true, render: (v, record) => {
      const val = v && v !== 'EMPTY' ? v : '';
      return (
        <Input.TextArea
          defaultValue={val}
          placeholder="Ghi chú..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ fontSize: 12, border: 'none', background: 'transparent', padding: '2px 4px', resize: 'none' }}
          onBlur={(e) => {
            const newVal = e.target.value;
            if (newVal !== val) handleNoteSave(record.id, newVal);
          }}
        />
      );
    }},
    { title: '', width: isAdmin ? 110 : 80, fixed: 'right', render: (_, record) => (
      <Space size={4}>
        <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
        {isAdmin && (
          <Tooltip title="Chuyển Sale"><Button type="text" size="small" icon={<SwapOutlined />} onClick={() => setTransferModal({ open: true, record, sale: record.sale })} style={{ color: '#06B6D4' }} /></Tooltip>
        )}
        <Popconfirm title="Xác nhận xóa khách hàng?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
          <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
        </Popconfirm>
      </Space>
    )},
  ];

  const expandedRowRender = (record) => (
    <div className="expand-detail-grid">
      <div className="expand-section">
        <div className="expand-section-title"><UserOutlined /> Thông tin khách hàng</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Khách hàng</span><span className="expand-value">{record.khachHang || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">SĐT</span><span className="expand-value">{record.sdt || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Sale</span><span className="expand-value">{record.sale || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">UID</span><span className="expand-value">{record.uid || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Ad ID</span><span className="expand-value">{record.adId || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">ID Trang</span><span className="expand-value">{record.idTrang || '—'}</span></div>
        </div>
      </div>
      <div className="expand-section">
        <div className="expand-section-title"><InfoCircleOutlined /> Nguồn & Trạng thái</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Page</span><span className="expand-value">{record.page || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Trạng thái</span><span className="expand-value" style={{ color: statusColors[record.status]?.color, fontWeight: 700 }}>{statusColors[record.status]?.label || record.status || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Ghi chú</span><span className="expand-value">{(record.mess && record.mess !== 'EMPTY') ? record.mess : '—'}</span></div>
        </div>
      </div>
      <div className="expand-section">
        <div className="expand-section-title"><ClockCircleOutlined /> Thời gian</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Ngày tháng</span><span className="expand-value">{record.ngayThang ? dayjs(record.ngayThang).format('DD/MM/YYYY') : '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Ngày tạo</span><span className="expand-value">{record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</span></div>
        </div>
      </div>
    </div>
  );

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
          <Select placeholder="Trạng thái" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} allowClear style={{ width: 160 }} popupMatchSelectWidth={false}>
            {Object.entries(statusColors).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
          </Select>
          {!isSaler && (
            <Select placeholder="Sale" value={filters.sale} onChange={(v) => setFilters({ ...filters, sale: v })} allowClear style={{ width: 130 }}>
              {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          )}
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
          expandable={{ expandedRowRender, expandRowByClick: true }}
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
            <Col span={12}><Form.Item name="sale" label="Sale">
              <Select showSearch allowClear optionFilterProp="children" placeholder="Chọn Sale">
                {allSaleUsers.map(s => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}><Form.Item name="page" label="Tùy Chọn Kênh Tiếp Thị" tooltip="Chọn kênh nguồn khách hàng">
              <Select 
                showSearch 
                allowClear 
                placeholder="Chọn kênh tiếp thị" 
                optionFilterProp="children"
                popupMatchSelectWidth={false}
                style={{ width: '100%' }}
                popupStyle={{ minWidth: 380 }}
                filterOption={(input, option) => {
                  const label = option.label?.toLowerCase() || '';
                  const inputLower = input.toLowerCase();
                  return label.includes(inputLower);
                }}
              >
                {Object.entries(PAGE_CATEGORIES).map(([category, items]) => (
                  <OptGroup key={category} label={<span style={{ fontWeight: 600, color: '#4F46E5', fontSize: 13 }}>{category}</span>}>
                    {items.map(item => (
                      <Option key={item} value={item} label={item}>
                        <div style={{ padding: '6px 0', fontSize: 13 }}>
                          {category === 'KÊNH GIAO TIẾP' ? (
                            <span style={{ color: '#0891B2', fontWeight: 500 }}>💬 {item}</span>
                          ) : (
                            <span style={{ color: '#7C3AED', fontWeight: 500, whiteSpace: 'normal' }}>🏭 {item}</span>
                          )}
                        </div>
                      </Option>
                    ))}
                  </OptGroup>
                ))}
              </Select>
            </Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="idTrang" label="ID Trang"><Input /></Form.Item></Col>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="uid" label="UID"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="adId" label="Ad ID"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="status" label="Trạng thái"><Select popupMatchSelectWidth={false}>{Object.entries(statusColors).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}</Select></Form.Item></Col>
            <Col span={12}><Form.Item name="mess" label="Ghi chú"><TextArea rows={2} placeholder="Ghi chú tình trạng chăm sóc..." /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Transfer Sale Modal */}
      <Modal
        title="Chuyển khách hàng cho Sale khác"
        open={transferModal.open}
        onCancel={() => setTransferModal({ open: false, record: null, sale: null })}
        onOk={handleTransfer}
        okText="Chuyển"
        cancelText="Hủy"
        width={400}
      >
        <div style={{ marginBottom: 12 }}>
          <strong>Khách hàng:</strong> {transferModal.record?.khachHang}
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>Sale hiện tại:</strong> {transferModal.record?.sale || '—'}
        </div>
        <div>
          <strong>Chuyển cho Sale:</strong>
          <Select
            value={transferModal.sale}
            onChange={(v) => setTransferModal(prev => ({ ...prev, sale: v }))}
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Chọn Sale"
          >
            {allSaleUsers.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </div>
      </Modal>
    </motion.div>
  );
}
