import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Table, Button, Input, Select, Tag, Modal, Form, Space, Popconfirm, message, Row, Col, Tooltip, Divider, Tabs, DatePicker, Checkbox, Badge, Spin, Avatar, Progress } from 'antd';

const AnimatedDiv = motion.div;
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
  CheckSquareOutlined,
  SaveOutlined,
  SyncOutlined,
  MessageOutlined,
  AudioOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  DeleteFilled,
} from '@ant-design/icons';
import { khachHangApi, authApi, kenhTiepThiApi, zaloContactApi, callRecordingApi } from '../api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const ZALO_SERVICE = import.meta.env.VITE_ZALO_SERVICE || 'http://localhost:3001';

const ZaloIcon = memo(function ZaloIcon({ size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={style}>
      <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="#0068FF"/>
      <path d="M33 28.5c-.28-.14-1.63-.8-1.88-.9-.25-.1-.43-.14-.62.14-.18.28-.72.9-.88 1.08-.16.18-.33.2-.61.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.4-1.66-1.56-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.18-.28.28-.47.1-.2.05-.36-.02-.5-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.46-.62-.47-.16 0-.35-.02-.53-.02-.18 0-.48.07-.74.33-.25.27-.97.95-.97 2.32 0 1.37.99 2.7 1.13 2.88.14.18 1.96 2.99 4.75 4.2.66.28 1.18.45 1.58.58.66.21 1.27.18 1.74.11.53-.08 1.63-.67 1.86-1.3.23-.64.23-1.19.16-1.3-.07-.12-.26-.18-.54-.32z" fill="white"/>
    </svg>
  );
});

const ZaloAvatar = memo(function ZaloAvatar({ name, src, size = 36 }) {
  const colors = ['#0068FF', '#00AFFF', '#FF6B35', '#10B981', '#8B5CF6', '#F59E0B'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (src && !src.includes('undefined'))
    return <Avatar src={src} size={size} style={{ flexShrink: 0 }} />;
  return (
    <Avatar size={size} style={{ background: color, flexShrink: 0, fontWeight: 700 }}>
      {name?.charAt(0)?.toUpperCase() || 'Z'}
    </Avatar>
  );
});

function formatZaloTime(ts) {
  if (!ts) return '';
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

const { Option, OptGroup } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const LOAI_MESS_OPTIONS = [
  { value: 'mess_moi', label: 'Mess Mới', color: '#10B981', bg: '#D1FAE5' },
  { value: 'mess_cu', label: 'Mess Cũ', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'mess_spam', label: 'Mess Spam', color: '#EF4444', bg: '#FEE2E2' },
];

const statusColors = {
  'uu_tien': { color: '#15803D', bg: '#DCFCE7', label: 'Ưu Tiên' },
  'moi': { color: '#3B82F6', bg: '#EFF6FF', label: 'Đang Chờ' },
  'pending': { color: '#3B82F6', bg: '#EFF6FF', label: 'Đang Chờ' },
  'dang_cham_soc': { color: '#F59E0B', bg: '#FFFBEB', label: 'Đang Phân Vân' },
  'chua_nghe_may': { color: '#F97316', bg: '#FFF7ED', label: 'Chưa Nghe Máy' },
  'da_chuyen_doi': { color: '#8B5CF6', bg: '#F5F3FF', label: 'Đã Mua Nơi Khác' },
  'da_chot_don': { color: '#10B981', bg: '#D1FAE5', label: 'Chốt Đơn' },
  'tiem_nang': { color: '#06B6D4', bg: '#ECFEFF', label: 'Khách Tiềm Năng' },
  'khong_tiem_nang': { color: '#94A3B8', bg: '#F1F5F9', label: 'Không Nhu Cầu' },
  'huy_don': { color: '#EF4444', bg: '#FEE2E2', label: 'Hủy Đơn' },
};

export default function KhachHang() {
  const { user, isAdmin, isSaler } = useAuth();
  const navigate = useNavigate();
  const canManage = isAdmin || user?.role === 'KE_TOAN';
  const currentSaleName = (user?.fullName || '').trim().replace(/\s+/g, ' ');
  const [data, setData] = useState([]);
  const [pinnedRows, setPinnedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0 });
  const [filters, setFilters] = useState(() => ({
    keyword: '', status: null,
    sale: isSaler ? currentSaleName : null,
  }));
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [hasSdt, setHasSdt] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [transferModal, setTransferModal] = useState({ open: false, record: null, sale: null });
  const [bulkTransferModal, setBulkTransferModal] = useState({ open: false, sale: null });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [allSaleUsers, setAllSaleUsers] = useState([]);
  const [pageChannels, setPageChannels] = useState({});
  const [assignedCount, setAssignedCount] = useState(0);
  const [form] = Form.useForm();
  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('kh_colWidths') || '{}'); } catch { return {}; }
  });
  const [noteValues, setNoteValues] = useState({});
  const [pendingStatus, setPendingStatus] = useState({});
  const [zaloData, setZaloData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zaloData') || '{}'); } catch { return {}; }
  });
  const [zaloSyncing, setZaloSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [zaloPopup, setZaloPopup] = useState({ open: false, record: null, contact: null, messages: [], loading: false });
  const [audioModal, setAudioModal] = useState({ open: false, record: null, recordings: [], loading: false, uploading: false, uploadProgress: 0 });
  const [recordingCounts, setRecordingCounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kh_recCounts') || '{}'); } catch { return {}; }
  });
  const audioUploadRef = useRef(null);
  const [allCrmUsers, setAllCrmUsers] = useState([]);
  const zaloMsgsEndRef = useRef(null);
  const msgPollerRef = useRef(null);
  const [newMsgCount, setNewMsgCount] = useState(0);

  useEffect(() => {
    if (Object.keys(colWidths).length) sessionStorage.setItem('kh_colWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  useEffect(() => {
    if (Object.keys(zaloData).length) {
      try { localStorage.setItem('zaloData', JSON.stringify(zaloData)); } catch {}
    }
  }, [zaloData]);

  useEffect(() => {
    if (zaloPopup.open && !zaloPopup.loading) {
      setTimeout(() => zaloMsgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [zaloPopup.messages, zaloPopup.loading, zaloPopup.open]);

  // Cleanup poller on unmount
  useEffect(() => () => { if (msgPollerRef.current) clearInterval(msgPollerRef.current); }, []);

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

  const fetchChannels = useCallback(async () => {
    try {
      const res = await kenhTiepThiApi.getGrouped();
      setPageChannels(res.data || {});
    } catch (err) {
      console.error('Không thể tải nhóm kênh tiếp thị:', err);
    }
  }, []);

  const fetchAssignedCount = useCallback(async () => {
    try {
      const res = await khachHangApi.getAssignedCount();
      setAssignedCount(res.data?.count || 0);
    } catch (err) {
      console.error('Không thể tải số khách được phân công:', err);
    }
  }, []);

  const fetchPinnedRows = useCallback(async (extra = {}) => {
    const currentDateRange = extra.dateRange !== undefined ? extra.dateRange : dateRange;
    const currentHasSdt = extra.hasSdt !== undefined ? extra.hasSdt : hasSdt;
    const statusFilter = extra.status !== undefined ? extra.status : filters.status;
    if (statusFilter === 'uu_tien') { setPinnedRows([]); return; }
    try {
      const res = await khachHangApi.getAll({
        pageNum: 0, size: 500, status: 'uu_tien',
        keyword: (extra.keyword ?? filters.keyword) || undefined,
        sale: (extra.sale ?? filters.sale) || undefined,
        fromDate: currentDateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        toDate: currentDateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        hasSdt: currentHasSdt ? true : undefined,
      });
      const pinned = res.data.content || [];
      setPinnedRows(pinned);
      fetchZaloContacts(pinned);
    } catch { setPinnedRows([]); }
  }, [dateRange, filters.keyword, filters.sale, filters.status, hasSdt]); // fetchZaloContacts stable ([] deps) — không cần trong array

  const fetchData = useCallback(async (page = 1, size = 30, extra = {}) => {
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
      const newRows = res.data.content;
      setData(newRows);
      setPagination({ current: page, pageSize: size, total: res.data.totalElements });
      fetchZaloContacts(newRows);
      fetchRecordingCounts(newRows);
    } catch {
      message.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
    // Refresh assigned count in background
    fetchAssignedCount();
  }, [activeTab, dateRange, filters.keyword, filters.sale, filters.status, hasSdt, fetchAssignedCount]); // fetchZaloContacts, fetchRecordingCounts stable ([] deps) — không cần trong array

  const fetchMeta = useCallback(async () => {
    try {
      const res = await authApi.getSaleUsers();
      const names = (res.data || []).filter(Boolean);
      setAllSaleUsers([...new Set(names)]);
    } catch (err) {
      console.error('Không thể tải danh sách sale:', err);
    }
  }, []);

  const fetchAllCrmUsers = useCallback(async () => {
    try {
      const res = await authApi.getUsers();
      setAllCrmUsers(res.data || []);
    } catch {}
  }, []);

  const fetchRecordingCounts = useCallback(async (rows) => {
    const ids = (rows || []).map(r => r.id).filter(Boolean);
    if (!ids.length) return;
    try {
      const res = await callRecordingApi.getCounts(ids);
      const counts = res.data || {};
      setRecordingCounts(prev => {
        const next = { ...prev };
        ids.forEach(id => { next[id] = Number(counts[String(id)] ?? counts[id] ?? 0); });
        try { localStorage.setItem('kh_recCounts', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch {}
  }, []);

  const stopMsgPoller = useCallback(() => {
    if (msgPollerRef.current) {
      clearInterval(msgPollerRef.current);
      msgPollerRef.current = null;
    }
    setNewMsgCount(0);
  }, []);

  const fetchZaloContacts = useCallback(async (rows) => {
    const ids = [...new Set((rows || []).map(r => r.id).filter(Boolean))];
    if (!ids.length) return;
    try {
      const res = await zaloContactApi.getByIds(ids);
      const fetched = res.data || [];
      if (!fetched.length) return;
      setZaloData(prev => {
        const next = { ...prev };
        fetched.forEach(zc => {
          // Always load from DB unless a fresh sync already set this entry
          if (!next[zc.khachHangId] || next[zc.khachHangId].fromDb) {
            next[zc.khachHangId] = {
              contact: { id: zc.zaloId, name: zc.displayName, avatar: zc.avatar },
              saleSession: zc.sessionId,
              fromDb: true,
            };
          }
        });
        return next;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchPinnedRows();
    fetchMeta();
    fetchChannels();
    if (isAdmin) fetchAllCrmUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (pag) => fetchData(pag.current, pag.pageSize);
  const handleSearch = () => { fetchData(1, pagination.pageSize); fetchPinnedRows(); };
  const handleReset = () => {
    const saleFilter = isSaler ? currentSaleName : null;
    setFilters({ keyword: '', status: null, sale: saleFilter });
    setDateRange(null);
    setHasSdt(false);
    const extra = { keyword: '', status: null, sale: saleFilter, dateRange: null, hasSdt: false };
    fetchData(1, pagination.pageSize, extra);
    fetchPinnedRows(extra);
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

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      ngayThang: dayjs(),
      status: 'moi',
      loaiMess: 'mess_moi',
      sale: isSaler ? currentSaleName : undefined,
    });
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      ngayThang: record.ngayThang ? dayjs(record.ngayThang) : dayjs(),
      sale: isSaler ? currentSaleName : record.sale,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.ngayThang = values.ngayThang?.format('YYYY-MM-DD');
      if (isSaler) {
        values.sale = currentSaleName;
      }
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

  const handleStatusChange = (id, status) => {
    setPendingStatus(prev => ({ ...prev, [id]: status }));
  };

  const handleRowSave = async (record) => {
    const id = record.id;
    const savedStatus = statusColors[record.status] ? record.status : 'moi';
    const hasStatusChange = pendingStatus[id] !== undefined && pendingStatus[id] !== savedStatus;
    const originalNote = record.mess && record.mess !== 'EMPTY' && record.mess !== 'Mes Mới' ? record.mess : '';
    const hasNoteChange = noteValues[id] !== undefined && noteValues[id] !== originalNote;
    if (!hasStatusChange && !hasNoteChange) return;
    try {
      await Promise.all([
        hasStatusChange ? khachHangApi.updateStatus(id, pendingStatus[id]) : null,
        hasNoteChange ? khachHangApi.updateNotes(id, noteValues[id]) : null,
      ].filter(Boolean));
      message.success('Lưu thành công');
      setPendingStatus(prev => { const next = { ...prev }; delete next[id]; return next; });
      setNoteValues(prev => { const next = { ...prev }; delete next[id]; return next; });
      fetchData(pagination.current, pagination.pageSize);
      if (hasStatusChange) fetchPinnedRows();
    } catch { message.error('Lỗi khi lưu'); }
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

  const handleBulkTransfer = async () => {
    if (!selectedRowKeys.length || !bulkTransferModal.sale) return;
    try {
      const res = await khachHangApi.bulkTransferSale(selectedRowKeys, bulkTransferModal.sale);
      message.success(`Chuyển thành công ${res.data?.count || selectedRowKeys.length} khách hàng`);
      setBulkTransferModal({ open: false, sale: null });
      setSelectedRowKeys([]);
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi chuyển khách hàng hàng loạt'); }
  };

  const handleNoteSave = async (id, notes) => {
    try {
      await khachHangApi.updateNotes(id, notes);
      message.success('Lưu ghi chú thành công');
      setNoteValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchData(pagination.current, pagination.pageSize);
    } catch { message.error('Lỗi lưu ghi chú'); }
  };

  const handleZaloSync = async () => {
    const allVisible = [...pinnedRows, ...data];
    const uniqueMap = new Map(allVisible.map(d => [d.id, d]));
    const selectedWithPhone = selectedRowKeys
      .map(id => uniqueMap.get(id))
      .filter(d => d && d.sdt);

    if (!selectedWithPhone.length) {
      message.warning('Chọn ít nhất 1 khách hàng có số điện thoại để đồng bộ Zalo');
      return;
    }

    setZaloSyncing(true);
    setSyncProgress({ current: 0, total: selectedWithPhone.length });
    const newZaloData = { ...zaloData };
    let found = 0;

    for (let i = 0; i < selectedWithPhone.length; i++) {
      const customer = selectedWithPhone[i];
      setSyncProgress({ current: i + 1, total: selectedWithPhone.length });
      const normStr = s => (s || '').replace(/\s+/g, ' ').trim();
      const saleUser = allCrmUsers.find(u => normStr(u.fullName) === normStr(customer.sale));
      const sessionId = saleUser?.username || (isSaler ? user?.username : null) || customer.sale || 'default';

      try {
        const resp = await fetch(
          `${ZALO_SERVICE}/search?session=${encodeURIComponent(sessionId)}&q=${encodeURIComponent(customer.sdt)}`
        );
        if (!resp.ok) continue;
        const contacts = await resp.json();
        if (Array.isArray(contacts) && contacts.length > 0) {
          newZaloData[customer.id] = { contact: contacts[0], saleSession: sessionId };
          found++;
        }
      } catch {}
    }

    setZaloData(newZaloData);

    // Lưu kết quả đồng bộ vào database
    const batch = Object.entries(newZaloData)
      .filter(([, v]) => !v.fromDb)
      .map(([khId, v]) => ({
        khachHangId: Number(khId),
        sessionId: v.saleSession,
        zaloId: v.contact?.id || null,
        displayName: v.contact?.name || null,
        avatar: v.contact?.avatar || null,
      }));
    if (batch.length) {
      zaloContactApi.syncBatch(batch).catch(() => {});
    }

    setZaloSyncing(false);
    setSyncProgress({ current: 0, total: 0 });
    message.success(`Đồng bộ hoàn tất: tìm thấy ${found}/${selectedWithPhone.length} khách hàng trên Zalo`);
  };

  const handleZaloIconClick = async (record) => {
    const zInfo = zaloData[record.id];
    if (!zInfo) return;

    stopMsgPoller();
    setNewMsgCount(0);
    setZaloPopup({ open: true, record, contact: zInfo.contact, messages: [], loading: true });

    const session = zInfo.saleSession;

    try {
      await fetch(
        `${ZALO_SERVICE}/open-contact?session=${encodeURIComponent(session)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: zInfo.contact.id, name: zInfo.contact.name, phone: record.sdt }),
        }
      );
      await new Promise(r => setTimeout(r, 1800));
      const resp = await fetch(`${ZALO_SERVICE}/messages?session=${encodeURIComponent(session)}`);
      const msgs = await resp.json();
      const initialMsgs = Array.isArray(msgs) ? msgs : [];
      setZaloPopup(prev => ({ ...prev, messages: initialMsgs, loading: false }));

      // Start polling for new messages every 3 seconds
      msgPollerRef.current = setInterval(async () => {
        try {
          const r2 = await fetch(`${ZALO_SERVICE}/messages?session=${encodeURIComponent(session)}`);
          if (!r2.ok) return;
          const latest = await r2.json();
          if (!Array.isArray(latest)) return;
          setZaloPopup(prev => {
            if (latest.length <= prev.messages.length) return prev;
            const added = latest.length - prev.messages.length;
            setNewMsgCount(n => n + added);
            return { ...prev, messages: latest };
          });
        } catch {}
      }, 3000);
    } catch {
      message.error('Không thể tải tin nhắn Zalo — kiểm tra Zalo service đang chạy');
      setZaloPopup(prev => ({ ...prev, loading: false }));
    }
  };

  const handleAudioIconClick = async (record) => {
    setAudioModal({ open: true, record, recordings: [], loading: true, uploading: false, uploadProgress: 0 });
    try {
      const res = await callRecordingApi.getByKhachHang(record.id);
      const recs = res.data || [];
      setAudioModal(prev => ({ ...prev, recordings: recs, loading: false }));
      setRecordingCounts(prev => {
        const next = { ...prev, [record.id]: recs.length };
        try { localStorage.setItem('kh_recCounts', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch {
      message.error('Không thể tải danh sách bản ghi âm');
      setAudioModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const { record } = audioModal;
    setAudioModal(prev => ({ ...prev, uploading: true, uploadProgress: 0 }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('khachHangId', record.id);
      await callRecordingApi.upload(formData, {
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
          setAudioModal(prev => ({ ...prev, uploadProgress: pct }));
        },
      });
      message.success('Tải bản ghi âm lên thành công');
      const res = await callRecordingApi.getByKhachHang(record.id);
      const recs = res.data || [];
      setAudioModal(prev => ({ ...prev, recordings: recs, uploading: false, uploadProgress: 0 }));
      setRecordingCounts(prev => {
        const next = { ...prev, [record.id]: recs.length };
        try { localStorage.setItem('kh_recCounts', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Tải lên thất bại';
      message.error(msg);
      setAudioModal(prev => ({ ...prev, uploading: false, uploadProgress: 0 }));
    }
  };

  const handleAudioDelete = async (id) => {
    try {
      await callRecordingApi.delete(id);
      setAudioModal(prev => {
        const recs = prev.recordings.filter(r => r.id !== id);
        setRecordingCounts(c => {
          const next = { ...c, [prev.record?.id]: recs.length };
          try { localStorage.setItem('kh_recCounts', JSON.stringify(next)); } catch {}
          return next;
        });
        return { ...prev, recordings: recs };
      });
      message.success('Đã xóa bản ghi âm');
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const handleSendZalo = () => {
    const allVisible = [...pinnedRows, ...data];
    const uniqueMap = new Map(allVisible.map(d => [d.id, d]));
    const selectedWithPhone = selectedRowKeys
      .map(id => uniqueMap.get(id))
      .filter(d => d && d.sdt);

    if (!selectedWithPhone.length) {
      message.warning('Chọn ít nhất 1 khách hàng có số điện thoại để nhắn tin Zalo');
      return;
    }

    const groups = {};
    selectedWithPhone.forEach(c => {
      const normStr = s => (s || '').replace(/\s+/g, ' ').trim();
      const saleUser = allCrmUsers.find(u => normStr(u.fullName) === normStr(c.sale));
      const sessionId = saleUser?.username || (isSaler ? user?.username : null) || c.sale || 'default';
      if (!groups[sessionId]) groups[sessionId] = [];
      groups[sessionId].push({
        id: String(c.id),
        name: c.khachHang || '',
        phone: c.sdt || '',
        sale: c.sale || '',
      });
    });

    localStorage.setItem('crm_bulk_targets', JSON.stringify({
      timestamp: Date.now(),
      groups,
      defaultSession: Object.keys(groups)[0] || null,
    }));

    navigate('/zalo');
  };

  const baseColumns = [
    { title: 'Ngày', dataIndex: 'ngayThang', _defaultWidth: 95, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
    { title: 'Khách hàng', dataIndex: 'khachHang', _defaultWidth: 140, ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'SĐT', dataIndex: 'sdt', _defaultWidth: 100 },
    { title: 'Tùy Chọn', dataIndex: 'loaiMess', _defaultWidth: 115, render: (v, record) => (
      <Select
        value={v || 'mess_moi'}
        onChange={(val) => handleLoaiMessChange(record.id, val || 'mess_moi')}
        size="small"
        style={{ width: '100%' }}
        placeholder="Mess Mới"
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
    { title: 'Trạng thái', dataIndex: 'status', _defaultWidth: 130, render: (v, record) => {
      const savedStatus = statusColors[v] ? v : 'moi';
      const currentVal = pendingStatus[record.id] !== undefined ? pendingStatus[record.id] : savedStatus;
      const isDirty = pendingStatus[record.id] !== undefined && pendingStatus[record.id] !== savedStatus;
      return (
        <Select
          value={currentVal}
          onChange={(val) => handleStatusChange(record.id, val)}
          size="small"
          style={{ width: '100%', outline: isDirty ? '1.5px solid #10B981' : undefined, borderRadius: 6 }}
          popupMatchSelectWidth={false}
        >
          {Object.entries(statusColors)
            .filter(([k]) => k !== 'pending')
            .map(([k, sc]) => (
              <Option key={k} value={k}>
                <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '1px 8px', borderRadius: 6, margin: 0 }}>{sc.label}</Tag>
              </Option>
            ))}
        </Select>
      );
    }},
    { title: 'Ghi chú', dataIndex: 'mess', _defaultWidth: 220, render: (v, record) => {
      const originalVal = v && v !== 'EMPTY' && v !== 'Mes Mới' ? v : '';
      const currentVal = noteValues[record.id] !== undefined ? noteValues[record.id] : originalVal;
      const isDirty = currentVal !== originalVal;
      return (
        <Input.TextArea
          value={currentVal}
          placeholder="Ghi chú..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ fontSize: 12, outline: isDirty ? '1.5px solid #10B981' : undefined, border: 'none', borderRadius: 4, background: 'transparent', padding: '2px 4px', resize: 'none', width: '100%', transition: 'outline 0.2s' }}
          onChange={(e) => setNoteValues(prev => ({ ...prev, [record.id]: e.target.value }))}
        />
      );
    }},
    { title: '', width: canManage ? 168 : (isSaler ? 98 : 108), fixed: 'right', render: (_, record) => {
      const savedStatus = statusColors[record.status] ? record.status : 'moi';
      const originalNote = record.mess && record.mess !== 'EMPTY' && record.mess !== 'Mes Mới' ? record.mess : '';
      const hasChanges = (pendingStatus[record.id] !== undefined && pendingStatus[record.id] !== savedStatus)
        || (noteValues[record.id] !== undefined && noteValues[record.id] !== originalNote);
      const hasZalo = !!zaloData[record.id];
      return (
      <Space size={4}>
        {hasChanges && (
          <Tooltip title="Lưu thay đổi"><Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => handleRowSave(record)} style={{ background: '#10B981', borderColor: '#10B981' }} /></Tooltip>
        )}
        {hasZalo && (
          <Tooltip title={`Xem hội thoại Zalo — ${zaloData[record.id].contact.name}`}>
            <Button
              type="text"
              size="small"
              icon={<ZaloIcon size={15} />}
              onClick={() => handleZaloIconClick(record)}
              style={{ color: '#0068FF', padding: '0 4px' }}
            />
          </Tooltip>
        )}
        {(() => {
          const hasRec = recordingCounts[record.id] > 0;
          const unknownRec = recordingCounts[record.id] === undefined;
          return (
            <Tooltip title={hasRec ? `${recordingCounts[record.id]} bản ghi âm` : 'Bản ghi âm cuộc gọi'}>
              <Button
                type="text"
                size="small"
                icon={<AudioOutlined />}
                onClick={() => handleAudioIconClick(record)}
                style={{
                  color: hasRec ? '#7C3AED' : '#9CA3AF',
                  padding: '0 4px',
                  opacity: unknownRec ? 0.4 : (hasRec ? 1 : 0.4),
                }}
              />
            </Tooltip>
          );
        })()}
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
    );
  }},
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
          <div className="expand-item"><span className="expand-label">Loại Mess</span><span className="expand-value">{LOAI_MESS_OPTIONS.find(o => o.value === (record.loaiMess || 'mess_moi'))?.label || 'Mess Mới'}</span></div>
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
    <AnimatedDiv initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-premium">
        <div className="page-header-left">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large" className="create-btn-premium">Thêm khách hàng</Button>
          <div className="page-header-info">
            <TeamOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Khách hàng</span>
          </div>
          <Tooltip title={selectedRowKeys.length ? `Đồng bộ Zalo cho ${selectedRowKeys.length} khách đã chọn` : 'Chọn khách hàng để đồng bộ Zalo'}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Button
                onClick={handleZaloSync}
                loading={zaloSyncing}
                disabled={!selectedRowKeys.length}
                icon={<ZaloIcon size={16} style={{ verticalAlign: 'middle' }} />}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderColor: '#0068FF', color: '#0068FF',
                  fontWeight: 600, borderRadius: 8,
                  opacity: selectedRowKeys.length ? 1 : 0.5,
                }}
              >
                {zaloSyncing
                  ? `Đang đồng bộ... ${syncProgress.current}/${syncProgress.total}`
                  : 'Đồng bộ Zalo'}
              </Button>
              {zaloSyncing && syncProgress.total > 0 && (
                <div style={{ width: '100%', height: 4, background: '#E8EAED', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`,
                      background: '#0068FF',
                      borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}
            </div>
          </Tooltip>
          <Tooltip title={selectedRowKeys.length ? `Nhắn tin Zalo cho ${selectedRowKeys.length} khách đã chọn` : 'Chọn khách hàng để nhắn tin Zalo'}>
            <Button
              onClick={handleSendZalo}
              disabled={!selectedRowKeys.length}
              icon={<ZaloIcon size={16} style={{ verticalAlign: 'middle' }} />}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: selectedRowKeys.length ? '#0068FF' : undefined,
                borderColor: '#0068FF', color: selectedRowKeys.length ? '#fff' : '#0068FF',
                fontWeight: 600, borderRadius: 8,
                opacity: selectedRowKeys.length ? 1 : 0.5,
              }}
            >
              Nhắn tin Zalo
            </Button>
          </Tooltip>
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
            {Object.entries(statusColors).filter(([k]) => k !== 'pending').map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
          </Select>
          {!isSaler && (
            <Select placeholder="Sale" value={filters.sale} onChange={(v) => setFilters({ ...filters, sale: v })} allowClear style={{ width: 130 }}>
              {allSaleUsers.map(s => <Option key={s} value={s}>{s}</Option>)}
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

      <AnimatedDiv
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
        {selectedRowKeys.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            border: '1px solid #C7D2FE',
            borderRadius: 10,
            padding: '10px 18px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#4F46E5', boxShadow: 'none', fontWeight: 700 }} />
              <span style={{ fontWeight: 600, color: '#3730A3', fontSize: 14 }}>khách hàng đã chọn</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {canManage && (
                <Button
                  type="primary"
                  icon={<SwapOutlined />}
                  onClick={() => setBulkTransferModal({ open: true, sale: null })}
                  style={{ background: '#06B6D4', borderColor: '#06B6D4', fontWeight: 600, borderRadius: 8 }}
                >
                  Chuyển Sale ({selectedRowKeys.length})
                </Button>
              )}
              <Button
                onClick={() => setSelectedRowKeys([])}
                style={{ borderRadius: 8, fontWeight: 500 }}
              >
                Bỏ chọn
              </Button>
            </div>
          </div>
        )}
        <Table
          dataSource={(() => {
            if (filters.status === 'uu_tien') return data;
            const pinnedIds = new Set(pinnedRows.map(r => r.id));
            const regular = data.filter(r => !pinnedIds.has(r.id));
            return pagination.current === 1 ? [...pinnedRows, ...regular] : regular;
          })()}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => record.status === 'uu_tien' ? 'row-uu-tien' : ''}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            columnWidth: 42,
            fixed: true,
            getCheckboxProps: () => ({ style: { transform: 'scale(1.15)' } }),
          }}
          pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: ['30', '50', '100'], showTotal: (t) => `Tổng ${t} khách hàng` }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
          expandable={{ expandedRowRender, expandRowByClick: false }}
        />
      </AnimatedDiv>

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
            <Col span={12}><Form.Item name="ngayThang" label="Ngày"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} allowClear={false} /></Form.Item></Col>
            <Col span={12}><Form.Item name="khachHang" label="Tên khách hàng" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="sdt" label="Số điện thoại"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="sale" label="Sale">
              {isSaler ? (
                <Input disabled />
              ) : (
                <Select showSearch allowClear optionFilterProp="children" placeholder="Chọn Sale">
                  {allSaleUsers.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              )}
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
            <Col span={12}><Form.Item name="status" label="Trạng thái"><Select popupMatchSelectWidth={false}>{Object.entries(statusColors).filter(([k]) => k !== 'pending').map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}</Select></Form.Item></Col>
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
              Khách hàng <strong>{transferModal.record?.khachHang}</strong> sẽ được chuyển từ <strong>{transferModal.record?.sale || '(trống)'}</strong> sang <strong>{transferModal.sale}</strong>
              <br /><span style={{ color: '#0891B2', fontSize: 12 }}>Trạng thái sẽ được đặt lại thành <strong>"Mới"</strong> và hiển thị trong mục <strong>"Khách Được Phân Công"</strong> của sale mới.</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Transfer Sale Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: '#06B6D4', fontSize: 18 }} />
            <span>Chuyển {selectedRowKeys.length} khách hàng cho Sale khác</span>
          </div>
        }
        open={bulkTransferModal.open}
        onCancel={() => setBulkTransferModal({ open: false, sale: null })}
        onOk={handleBulkTransfer}
        okText={`Xác nhận chuyển ${selectedRowKeys.length} khách hàng`}
        cancelText="Hủy"
        okButtonProps={{
          disabled: !bulkTransferModal.sale,
          style: { background: '#06B6D4', borderColor: '#06B6D4' }
        }}
        width={500}
        className="premium-modal"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#4F46E5', boxShadow: 'none', fontWeight: 700, fontSize: 14 }} />
              <span style={{ fontWeight: 600, color: '#1F2937', fontSize: 14 }}>khách hàng được chọn</span>
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, background: '#fff' }}>
              {data.filter(d => selectedRowKeys.includes(d.id)).map((kh, i) => (
                <div key={kh.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', borderBottom: i < selectedRowKeys.length - 1 ? '1px solid #F1F5F9' : 'none',
                  fontSize: 13
                }}>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{kh.khachHang}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#64748B' }}>{kh.sdt || '—'}</span>
                    <span style={{ color: '#EF4444', fontWeight: 500, minWidth: 80, textAlign: 'right' }}>{kh.sale || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 8 }}>
              <SwapOutlined style={{ marginRight: 6, color: '#06B6D4' }} />
              Chuyển tất cả cho Sale mới:
            </label>
            <Select
              value={bulkTransferModal.sale}
              onChange={(v) => setBulkTransferModal(prev => ({ ...prev, sale: v }))}
              style={{ width: '100%' }}
              placeholder="Chọn Sale mới..."
              size="large"
              showSearch
              optionFilterProp="children"
            >
              {allSaleUsers.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </div>
          {bulkTransferModal.sale && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
              padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#166534'
            }}>
              ✅ <strong>{selectedRowKeys.length}</strong> khách hàng sẽ được chuyển sang <strong>{bulkTransferModal.sale}</strong>
              <br /><span style={{ color: '#0891B2', fontSize: 12 }}>Trạng thái sẽ được đặt lại thành <strong>"Mới"</strong> và hiển thị trong mục <strong>"Khách Được Phân Công"</strong> của sale mới.</span>
            </div>
          )}
        </div>
      </Modal>
      {/* Audio Recording Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AudioOutlined style={{ color: '#7C3AED', fontSize: 20 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1F2937' }}>Bản ghi âm cuộc gọi</div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>
                KH: {audioModal.record?.khachHang} · SĐT: {audioModal.record?.sdt}
              </div>
            </div>
          </div>
        }
        open={audioModal.open}
        onCancel={() => setAudioModal({ open: false, record: null, recordings: [], loading: false, uploading: false })}
        footer={null}
        width={520}
        className="premium-modal"
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Upload button + progress */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#FAF5FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                ref={audioUploadRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.opus,.wma"
                style={{ display: 'none' }}
                onChange={handleAudioUpload}
              />
              <Button
                icon={<UploadOutlined />}
                loading={audioModal.uploading}
                disabled={audioModal.uploading}
                onClick={() => audioUploadRef.current?.click()}
                style={{ background: '#7C3AED', borderColor: '#7C3AED', color: '#fff', fontWeight: 600 }}
              >
                Tải bản ghi âm lên
              </Button>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>MP3, M4A, WAV, OGG, AAC...</span>
            </div>
            {audioModal.uploading && (
              <div style={{ marginTop: 10 }}>
                <Progress
                  percent={audioModal.uploadProgress}
                  strokeColor="#7C3AED"
                  trailColor="#EDE9FE"
                  size="small"
                  status={audioModal.uploadProgress < 100 ? 'active' : 'success'}
                  format={pct => <span style={{ fontSize: 12, color: '#7C3AED' }}>{pct}%</span>}
                />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {audioModal.uploadProgress < 100 ? 'Đang tải lên Supabase Storage...' : 'Đang lưu vào cơ sở dữ liệu...'}
                </div>
              </div>
            )}
          </div>

          {/* Recordings list */}
          <div style={{ padding: '12px 20px', minHeight: 200, maxHeight: 420, overflowY: 'auto' }}>
            {audioModal.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
                <Spin size="large" />
              </div>
            ) : audioModal.recordings.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
                <AudioOutlined style={{ fontSize: 40, color: '#CBD5E1' }} />
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có bản ghi âm nào</span>
                <span style={{ color: '#CBD5E1', fontSize: 12 }}>Nhấn "Tải bản ghi âm lên" để thêm</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {audioModal.recordings.map((rec, i) => (
                  <div key={rec.id} style={{
                    background: '#F8F7FF', border: '1px solid #DDD6FE', borderRadius: 10,
                    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PlayCircleOutlined style={{ color: '#7C3AED', fontSize: 18 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2937', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.fileName || `Bản ghi âm #${i + 1}`}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                            {rec.recordedAt ? new Date(rec.recordedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            {rec.fileSize ? ` · ${(rec.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}
                          </div>
                        </div>
                      </div>
                      <Popconfirm title="Xóa bản ghi âm này?" onConfirm={() => handleAudioDelete(rec.id)} okText="Xóa" cancelText="Hủy">
                        <Button type="text" size="small" icon={<DeleteFilled />} danger style={{ flexShrink: 0 }} />
                      </Popconfirm>
                    </div>
                    <audio
                      controls
                      src={rec.fileUrl}
                      style={{ width: '100%', height: 36, borderRadius: 6 }}
                      preload="metadata"
                    />
                    {rec.note && (
                      <div style={{ fontSize: 12, color: '#6B7280', padding: '4px 8px', background: '#EDE9FE', borderRadius: 6 }}>
                        {rec.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Zalo Conversation Popup */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ZaloIcon size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1F2937', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 8 }}>
                {zaloPopup.contact?.name || 'Hội thoại Zalo'}
                {!zaloPopup.loading && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: '#16A34A', background: '#DCFCE7', borderRadius: 10, padding: '1px 7px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                    Live
                  </span>
                )}
                {newMsgCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#EF4444', borderRadius: 10, padding: '1px 7px' }}>
                    +{newMsgCount} mới
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>
                KH: {zaloPopup.record?.khachHang} · SĐT: {zaloPopup.record?.sdt} · Sale: {zaloPopup.record?.sale}
              </div>
            </div>
          </div>
        }
        open={zaloPopup.open}
        onCancel={() => { stopMsgPoller(); setZaloPopup({ open: false, record: null, contact: null, messages: [], loading: false }); }}
        footer={null}
        width={520}
        className="premium-modal"
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
          {/* Contact info bar */}
          {zaloPopup.contact && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 20px', background: '#F0F9FF',
              borderBottom: '1px solid #BAE6FD',
            }}>
              <ZaloAvatar name={zaloPopup.contact.name} src={zaloPopup.contact.avatar} size={40} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1F2937' }}>{zaloPopup.contact.name}</div>
                {zaloPopup.contact.phone && (
                  <div style={{ fontSize: 12, color: '#0068FF' }}>
                    <PhoneOutlined style={{ marginRight: 4 }} />{zaloPopup.contact.phone}
                  </div>
                )}
              </div>
              <Tag color="blue" style={{ marginLeft: 'auto', fontSize: 11 }}>Zalo</Tag>
            </div>
          )}

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {zaloPopup.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <Spin size="large" />
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>Đang tải tin nhắn từ Zalo...</span>
              </div>
            ) : zaloPopup.messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <MessageOutlined style={{ fontSize: 40, color: '#CBD5E1' }} />
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có tin nhắn trong hội thoại này</span>
                <span style={{ color: '#CBD5E1', fontSize: 12 }}>Hoặc chưa có cuộc trò chuyện nào với khách hàng</span>
              </div>
            ) : (
              <>
                {zaloPopup.messages.map((m, i) => {
                  const isSelf = m.isSelf || false;
                  return (
                    <div key={m.msgId || i} style={{ display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                      {!isSelf && (
                        <ZaloAvatar name={zaloPopup.contact?.name} src={zaloPopup.contact?.avatar} size={28} />
                      )}
                      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', gap: 2 }}>
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt=""
                            style={{ maxWidth: 200, maxHeight: 240, borderRadius: 10, cursor: 'pointer', display: 'block' }}
                            onClick={() => window.open(m.imageUrl, '_blank')}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        )}
                        {m.content && (
                          <div style={{
                            background: isSelf ? '#0068FF' : '#fff',
                            color: isSelf ? '#fff' : '#1F2937',
                            borderRadius: isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            padding: '8px 12px',
                            fontSize: 13,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                          }}>
                            {m.content}
                          </div>
                        )}
                        <span style={{ fontSize: 10, color: '#9CA3AF', padding: '0 4px' }}>
                          {formatZaloTime(m.time)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={zaloMsgsEndRef} />
              </>
            )}
          </div>

          {/* Footer hint */}
          <div style={{ padding: '10px 20px', borderTop: '1px solid #E2E8F0', background: '#fff', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
            Để nhắn tin, hãy mở tab <strong>Zalo</strong> trong menu
          </div>
        </div>
      </Modal>
    </AnimatedDiv>
  );
}
