import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Modal, Form, Space, Popconfirm, message, Row, Col, Tooltip, Divider, Tabs, DatePicker, Checkbox, Badge } from 'antd';
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
  PhoneOutlined,
  CalendarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { khachHangApi, authApi, kenhTiepThiApi } from '../api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { Option, OptGroup } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const LOAI_MESS_OPTIONS = [
  { value: 'mess_moi', label: 'Mess Mới', color: '#10B981', bg: '#D1FAE5' },
  { value: 'mess_cu', label: 'Mess Cũ', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'mess_spam', label: 'Mess Spam', color: '#EF4444', bg: '#FEE2E2' },
];

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
  const canManage = isAdmin || user?.role === 'KE_TOAN';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [filters, setFilters] = useState({ keyword: '', status: null, sale: null });
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [hasSdt, setHasSdt] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [transferModal, setTransferModal] = useState({ open: false, record: null, sale: null });
  const [allSaleUsers, setAllSaleUsers] = useState([]);
  const [pageChannels, setPageChannels] = useState({});
  const [assignedCount, setAssignedCount] = useState(0);
  const [form] = Form.useForm();
  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('kh_colWidths') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    if (Object.keys(colWidths).length) sessionStorage.setItem('kh_colWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  const handleResizeStart = useCallback((dataIndex) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const th = e.target.closest('th');
    if (!th) return;
    const startWidth = th.getBoundingClientRect().width;
    
    const onMouseMove = (ev) => {
      const diff = ev.clientX - startX;
      const newWidth = Math.max(60, startWidth + diff);
      setColWidths(prev => ({ ...prev, [dataIndex]: newWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => { fetchData(); fetchMeta(); fetchChannels(); fetchAssignedCount(); }, []);

  const fetchChannels = async () => {
    try { const res = await kenhTiepThiApi.getGrouped(); setPageChannels(res.data || {}); } catch {}
  };

  const fetchAssignedCount = async () => {
    try { const res = await khachHangApi.getAssignedCount(); setAssignedCount(res.data?.count || 0); } catch {}
  };

  const fetchData = async (page = 1, size = 15, extra = {}) => {
    setLoading(true);
    try {
      const currentTab = extra.tab ?? activeTab;
      const currentDateRange = extra.dateRange !== undefined ? extra.dateRange : dateRange;
      const currentHasSdt = extra.hasSdt !== undefined ? extra.hasSdt : hasSdt;
      const params = {
        pageNum: page - 1, size,
        keyword: (extra.keyword ?? filters.keyword) || undefined,
        status: (extra.status ?? filters.status) || undefined,
        sale: (extra.sale ?? filters.sale) || undefined,
        assignedOnly: currentTab === 'assigned' ? true : undefined,
        fromDate: currentDateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        toDate: currentDateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        hasSdt: currentHasSdt ? true : undefined,
      };
      const res = await khachHangApi.getAll(params);
      setData(res.data.content);
      setPagination({ current: page, pageSize: size, total: res.data.totalElements });
    } catch (e) {
      message.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
    // Refresh assigned count in background
    fetchAssignedCount();
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
  const handleReset = () => {
    setFilters({ keyword: '', status: null, sale: null });
    setDateRange(null);
    setHasSdt(false);
    fetchData(1, pagination.pageSize, { keyword: '', status: null, sale: null, dateRange: null, hasSdt: false });
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    fetchData(1, pagination.pageSize, { tab: key });
  };

  const handleLoaiMessChange = async (id, loaiMess) => {
    try {
      await khachHangApi.updateLoaiMess(id, loaiMess);
      message.success('Cập nhật loại mess thành công');
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi cập nhật loại mess'); }
  };

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

  const baseColumns = [
    { title: 'Ngày', dataIndex: 'ngayThang', _defaultWidth: 95, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Khách hàng', dataIndex: 'khachHang', _defaultWidth: 140, ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'SĐT', dataIndex: 'sdt', _defaultWidth: 100 },
    { title: 'Tùy Chọn', dataIndex: 'loaiMess', _defaultWidth: 115, render: (v, record) => (
      <Select
        value={v || undefined}
        onChange={(val) => handleLoaiMessChange(record.id, val)}
        size="small"
        style={{ width: '100%' }}
        placeholder="Chọn..."
        allowClear
        popupMatchSelectWidth={false}
      >
        {LOAI_MESS_OPTIONS.map(opt => (
          <Option key={opt.value} value={opt.value}>
            <Tag style={{ background: opt.bg, color: opt.color, border: 'none', fontWeight: 600, padding: '1px 8px', borderRadius: 6, margin: 0 }}>{opt.label}</Tag>
          </Option>
        ))}
      </Select>
    )},
    { title: 'Sale', dataIndex: 'sale', _defaultWidth: 90, ellipsis: true },
    { title: 'Kênh Tiếp Thị', dataIndex: 'page', _defaultWidth: 170, ellipsis: true, render: (v) => v ? <Tooltip title={v}><Tag style={{ background: '#F5F3FF', color: '#7C3AED', border: 'none', fontWeight: 500, borderRadius: 6, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</Tag></Tooltip> : <span style={{ color: '#CBD5E1' }}>—</span> },
    ...(activeTab === 'assigned' ? [{
      title: 'Chuyển từ', dataIndex: 'assignedFrom', _defaultWidth: 110,
      render: (v) => v ? <Tag color="cyan">{v}</Tag> : '—'
    }] : []),
    { title: 'Trạng thái', dataIndex: 'status', _defaultWidth: 130, render: (v, record) => (
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
    { title: 'Ghi chú', dataIndex: 'mess', _defaultWidth: 180, ellipsis: true, render: (v, record) => {
      const val = v && v !== 'EMPTY' && v !== 'Mes Mới' ? v : '';
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
    { title: '', width: canManage ? 110 : (isSaler ? 40 : 80), fixed: 'right', render: (_, record) => (
      <Space size={4}>
        {canManage && (
          <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
        )}
        {canManage && (
          <Tooltip title="Chuyển Sale"><Button type="text" size="small" icon={<SwapOutlined />} onClick={() => setTransferModal({ open: true, record, sale: record.sale })} style={{ color: '#06B6D4' }} /></Tooltip>
        )}
        {canManage && (
          <Popconfirm title="Xác nhận xóa khách hàng?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
          </Popconfirm>
        )}
        {isSaler && (
          <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
        )}
      </Space>
    )},
  ];

  // Apply dynamic widths + resize handles
  const columns = baseColumns.map(col => {
    if (!col.dataIndex) return col; // action column, keep as-is
    const w = colWidths[col.dataIndex] || col._defaultWidth;
    return {
      ...col,
      width: w,
      title: (
        <div className="resizable-header">
          {col.title}
          <div
            className="col-resize-handle"
            onMouseDown={handleResizeStart(col.dataIndex)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
    };
  });

  const expandedRowRender = (record) => (
    <div className="expand-detail-grid">
      <div className="expand-section">
        <div className="expand-section-title"><UserOutlined /> Thông tin khách hàng</div>
        <div className="expand-items">
          <div className="expand-item"><span className="expand-label">Khách hàng</span><span className="expand-value">{record.khachHang || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">SĐT</span><span className="expand-value">{record.sdt || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Sale</span><span className="expand-value">{record.sale || '—'}</span></div>
          <div className="expand-item"><span className="expand-label">Loại Mess</span><span className="expand-value">{LOAI_MESS_OPTIONS.find(o => o.value === record.loaiMess)?.label || '—'}</span></div>
          {record.assignedFrom && <div className="expand-item"><span className="expand-label">Chuyển từ</span><span className="expand-value" style={{ color: '#06B6D4', fontWeight: 600 }}>{record.assignedFrom}</span></div>}
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
          <div className="expand-item"><span className="expand-label">Ghi chú</span><span className="expand-value">{(record.mess && record.mess !== 'EMPTY' && record.mess !== 'Mes Mới') ? record.mess : '—'}</span></div>
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
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            style={{ width: 240 }}
            allowClear
          />
          <Checkbox checked={hasSdt} onChange={(e) => setHasSdt(e.target.checked)}>
            <PhoneOutlined style={{ marginRight: 4, color: '#10B981' }} />Có SĐT
          </Checkbox>
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
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'all',
              label: <span><TeamOutlined style={{ marginRight: 6 }} />Khách hàng</span>,
            },
            {
              key: 'assigned',
              label: <span><InboxOutlined style={{ marginRight: 6, color: '#06B6D4' }} />Khách Được Phân Công{assignedCount > 0 ? <Badge count={assignedCount} style={{ marginLeft: 8, backgroundColor: '#06B6D4', boxShadow: 'none' }} /> : null}</span>,
            },
          ]}
          style={{ marginBottom: 0 }}
        />
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Tổng ${t} khách hàng` }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
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
            <Col span={12}><Form.Item name="loaiMess" label="Loại Mess">
              <Select allowClear placeholder="Chọn loại mess">
                {LOAI_MESS_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    <Tag style={{ background: opt.bg, color: opt.color, border: 'none', fontWeight: 600, padding: '1px 8px', borderRadius: 6, margin: 0 }}>{opt.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="Trạng thái"><Select popupMatchSelectWidth={false}>{Object.entries(statusColors).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}</Select></Form.Item></Col>
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
                {Object.entries(pageChannels).map(([category, items]) => (
                  <OptGroup key={category} label={<span style={{ fontWeight: 600, color: '#4F46E5', fontSize: 13 }}>{category}</span>}>
                    {items.map(item => (
                      <Option key={item.name} value={item.name} label={item.name}>
                        <div style={{ padding: '6px 0', fontSize: 13 }}>
                          {category === 'KÊNH GIAO TIẾP' ? (
                            <span style={{ color: '#0891B2', fontWeight: 500 }}>💬 {item.name}</span>
                          ) : (
                            <span style={{ color: '#7C3AED', fontWeight: 500, whiteSpace: 'normal' }}>🏭 {item.name}</span>
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
            <Col span={12}><Form.Item name="mess" label="Ghi chú"><TextArea rows={2} placeholder="Ghi chú tình trạng chăm sóc..." /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Transfer Sale Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: '#06B6D4', fontSize: 18 }} />
            <span>Chuyển khách hàng cho Sale khác</span>
          </div>
        }
        open={transferModal.open}
        onCancel={() => setTransferModal({ open: false, record: null, sale: null })}
        onOk={handleTransfer}
        okText="Xác nhận chuyển"
        cancelText="Hủy"
        okButtonProps={{
          disabled: !transferModal.sale || transferModal.sale === transferModal.record?.sale,
          style: { background: '#06B6D4', borderColor: '#06B6D4' }
        }}
        width={440}
        className="premium-modal"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Khách hàng</span>
              <span style={{ fontWeight: 600, color: '#1F2937' }}>{transferModal.record?.khachHang}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>SĐT</span>
              <span style={{ fontWeight: 500, color: '#374151' }}>{transferModal.record?.sdt || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Sale hiện tại</span>
              <span style={{ fontWeight: 600, color: '#EF4444' }}>{transferModal.record?.sale || '—'}</span>
            </div>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 8 }}>
              <SwapOutlined style={{ marginRight: 6, color: '#06B6D4' }} />
              Chuyển cho Sale mới:
            </label>
            <Select
              value={transferModal.sale}
              onChange={(v) => setTransferModal(prev => ({ ...prev, sale: v }))}
              style={{ width: '100%' }}
              placeholder="Chọn Sale mới..."
              size="large"
              showSearch
              optionFilterProp="children"
            >
              {allSaleUsers.filter(s => s !== transferModal.record?.sale).map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </div>
          {transferModal.sale && transferModal.sale !== transferModal.record?.sale && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, 
              padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#166534'
            }}>
              ✅ Khách hàng <strong>{transferModal.record?.khachHang}</strong> sẽ được chuyển từ <strong>{transferModal.record?.sale || '(trống)'}</strong> sang <strong>{transferModal.sale}</strong>
              <br /><span style={{ color: '#0891B2', fontSize: 12 }}>Trạng thái sẽ được đặt lại thành <strong>"Mới"</strong> và hiển thị trong mục <strong>"Khách Được Phân Công"</strong> của sale mới.</span>
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  );
}
