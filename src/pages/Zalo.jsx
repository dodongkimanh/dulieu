import { useState, useEffect, useRef, useCallback, useMemo, Component } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Input, Spin, Avatar, Tooltip, Tag,
  message as antMessage, Checkbox, InputNumber, Radio, Select, Modal, Alert,
} from 'antd';
import {
  PoweroffOutlined, ReloadOutlined, SendOutlined, SearchOutlined,
  MessageOutlined, WifiOutlined, DisconnectOutlined, TeamOutlined,
  PhoneOutlined, BulbOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, PlayCircleOutlined, StopOutlined,
  SyncOutlined, QrcodeOutlined,
  PhoneFilled, VideoCameraFilled,
  DownloadOutlined, UploadOutlined, EyeOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api';
import api from '../api';
import QRCode from 'qrcode';

const SERVICE_BASE = import.meta.env.VITE_ZALO_SERVICE || 'http://localhost:3001';
const WS_BASE = import.meta.env.VITE_ZALO_WS || 'ws://localhost:3001';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function isPhoneQuery(s) {
  return (s || '').replace(/\D/g, '').length >= 6;
}

function parseDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

function parseCallSticker(content) {
  if (!content) return null;
  try {
    const d = typeof content === 'object' ? content : JSON.parse(content);
    if (!d || typeof d !== 'object') return null;
    // Cuộc gọi
    if (d.title === 'sendBubbleMessage' || String(d.action || '').includes('call')) {
      let p = {};
      try { p = typeof d.params === 'string' ? JSON.parse(d.params) : (d.params || {}); } catch {}
      return { _type: 'call', isVideo: p.calltype === 1, isCaller: !!p.isCaller, duration: p.duration || 0, hasCallback: !!p.isEnableCallback };
    }
    // Sticker Zalo (type 7)
    if (d.type === 7 && d.catId != null) {
      return { _type: 'sticker', url: `https://zalo-sticker.zadn.vn/${d.catId}/${d.id}.png` };
    }
    // GIF / animated: có trường url hoặc href trực tiếp
    const gifUrl = d.url || d.href || d.normalUrl || d.hdUrl || d.thumbUrl || null;
    if (gifUrl && typeof gifUrl === 'string') {
      return { _type: 'gif', url: gifUrl };
    }
    // Icon / emoticon Zalo (type 1 hoặc type 2 với catId)
    if ((d.type === 1 || d.type === 2) && d.catId != null) {
      return { _type: 'sticker', url: `https://zalo-sticker.zadn.vn/${d.catId}/${d.id}.png` };
    }
    // Object không nhận ra — báo unsupported
    return { _type: 'unsupported' };
  } catch {
    return null;
  }
}

function StickerImg({ url, label }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', color: '#6b7280', fontSize: 13 }}>
        <span style={{ fontSize: 22 }}>🎭</span>
        <span style={{ fontStyle: 'italic' }}>{label || 'Sticker'}</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={label || 'Sticker'}
      style={{ width: 100, height: 100, objectFit: 'contain', display: 'block' }}
      onError={() => setFailed(true)}
    />
  );
}

function SpecialMsgContent({ content }) {
  const parsed = parseCallSticker(content);
  if (!parsed) return null;
  if (parsed._type === 'sticker') {
    return <StickerImg url={parsed.url} label="Sticker" />;
  }
  if (parsed._type === 'gif') {
    return <StickerImg url={parsed.url} label="GIF" />;
  }
  if (parsed._type === 'call') {
    const iconColor = '#22c55e';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, padding: '2px 0' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f0fdf4', border: `1.5px solid ${iconColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {parsed.isVideo ? <VideoCameraFilled style={{ color: iconColor, fontSize: 17 }} /> : <PhoneFilled style={{ color: iconColor, fontSize: 17 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', lineHeight: 1.3 }}>
            {parsed.isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} {parsed.isCaller ? 'đi' : 'đến'}
          </div>
          {parsed.duration > 0 && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>▶ {parseDuration(parsed.duration)}</div>}
          {parsed.hasCallback && <div style={{ marginTop: 5, display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#0068ff', border: '1px solid #0068ff', borderRadius: 12, padding: '2px 10px' }}>GỌI LẠI</div>}
        </div>
      </div>
    );
  }
  if (parsed._type === 'unsupported') {
    return <div style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>[Tin nhắn không hỗ trợ]</div>;
  }
  return null;
}

class MsgErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('Zalo msg render error:', err); }
  render() {
    if (this.state.hasError)
      return <div style={{ padding: '4px 8px', color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>Không thể hiển thị tin nhắn</div>;
    return this.props.children;
  }
}

function ZaloAvatar({ name, src, size = 40 }) {
  const colors = ['#0068FF', '#00AFFF', '#FF6B35', '#10B981', '#8B5CF6', '#F59E0B'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (src && !src.includes('undefined'))
    return <Avatar src={src} size={size} style={{ flexShrink: 0 }} />;
  return (
    <Avatar size={size} style={{ background: color, flexShrink: 0, fontWeight: 700, fontSize: size * 0.4 }}>
      {name?.charAt(0)?.toUpperCase() || 'Z'}
    </Avatar>
  );
}

const OPERATION_TABS = [
  'Gửi tin nhắn bạn bè',
  'Gửi tin ZaloOA',
  'Nhóm',
  'Kết bạn theo gợi ý',
  'Kết bạn Uid, SĐT',
  'Hủy bạn bè',
  'Tham gia nhóm',
  'Gửi tin SĐT',
];

// ── Bulk Send Component ──────────────────────────────────────────────────────
const DEFAULT_GROUPS = [
  { id: 'g1', name: 'Nhóm Tranh' },
  { id: 'g2', name: 'Nhóm Đỉnh Đồng' },
  { id: 'g3', name: 'Nhóm Cuốn Thư' },
  { id: 'g4', name: 'Nhóm Tổng Hợp' },
  { id: 'g5', name: 'Nhóm Kính Chúc' },
];

const DEFAULT_TEMPLATES = [
  { id: 1, groupId: null, content: 'Em Chào Bác. Xuống Đồ Đồng Tư...', images: [], videos: [] },
  { id: 2, groupId: null, content: 'Cuối Năm Xuống Nhà Em Đang Ưu Đãi...', images: [], videos: [] },
  { id: 3, groupId: null, content: 'Cuối Năm Bên Em Ưu Đãi Đặc Biệt...', images: [], videos: [] },
  { id: 4, groupId: null, content: 'Ưu Đãi Đặc Biệt Sắm Sửa Cho Tết...', images: [], videos: [] },
  { id: 5, groupId: null, content: 'Xuống Đúc Đồng Tường Phát Xin...', images: [], videos: [] },
  { id: 6, groupId: null, content: '{Nhân Dịp} {Chương trình} Sự Kiện!...', images: [], videos: [] },
];

function migrateTemplate(t) {
  let r = t;
  if (!Array.isArray(r.images)) {
    const imgs = r.image ? [r.image] : [];
    const { image: _d, ...rest } = r;
    r = { ...rest, images: imgs };
  }
  if (!Array.isArray(r.videos)) r = { ...r, videos: [] };
  if (!('groupId' in r)) r = { ...r, groupId: null };
  return r;
}

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}

// Reset timing defaults khi version thay đổi
(function migrateSettings() {
  if (localStorage.getItem('zalo_v') === '4') return;
  localStorage.setItem('zalo_v', '4');
  localStorage.removeItem('zalo_sendTimeMin');
  localStorage.removeItem('zalo_sendTimeMax');
  localStorage.removeItem('zalo_delayMin');
  localStorage.removeItem('zalo_delayMax');
}());

function BulkSend({ phonebook, wsRef, onRefreshPhonebook, phonebookLoading, bulkResults, bulkRunning, onBulkStart, crmTargets = [], onClearCrm, zcaDisconnected }) {
  const [opTab, setOpTab] = useState(0);
  const [filter, setFilter] = useState({ keyword: '', ageFrom: 0, ageTo: 99, gender: 'All' });
  const [selected, setSelected] = useState(new Set());
  const [selectedCrm, setSelectedCrm] = useState(new Set());
  const [templates, setTemplates] = useState(() => loadLS('zalo_templates', DEFAULT_TEMPLATES).map(migrateTemplate));
  const [groups, setGroups] = useState(() => loadLS('zalo_template_groups', DEFAULT_GROUPS));
  const [selectedTpls, setSelectedTpls] = useState(new Set());
  const [previewTpl, setPreviewTpl] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(['g1','g2','g3','g4','g5','__none__']));
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [sendMode, setSendMode] = useState(() => loadLS('zalo_sendMode', 'random'));
  const [concurrency, setConcurrency] = useState(() => loadLS('zalo_concurrency', 1));
  const [delayMin, setDelayMin] = useState(() => loadLS('zalo_delayMin', 3));
  const [delayMax, setDelayMax] = useState(() => loadLS('zalo_delayMax', 7));
  const [sendTimeMin, setSendTimeMin] = useState(() => loadLS('zalo_sendTimeMin', 3));
  const [sendTimeMax, setSendTimeMax] = useState(() => loadLS('zalo_sendTimeMax', 8));
  const [pauseAfter, setPauseAfter] = useState(() => loadLS('zalo_pauseAfter', 30));
  const [pauseMinutes, setPauseMinutes] = useState(() => loadLS('zalo_pauseMinutes', 15));
  const [errorPause, setErrorPause] = useState(() => loadLS('zalo_errorPause', 30));
  const [repeat, setRepeat] = useState(false);
  const [randomFriend, setRandomFriend] = useState(() => loadLS('zalo_randomFriend', false));
  const [fromIndex, setFromIndex] = useState(() => loadLS('zalo_fromIndex', 0));
  const [targetCount, setTargetCount] = useState(() => loadLS('zalo_targetCount', 3000));

  // Persist settings to localStorage — single effect covers all settings
  useEffect(() => {
    localStorage.setItem('zalo_templates', JSON.stringify(templates));
    localStorage.setItem('zalo_template_groups', JSON.stringify(groups));
    localStorage.setItem('zalo_sendMode', JSON.stringify(sendMode));
    localStorage.setItem('zalo_concurrency', JSON.stringify(concurrency));
    localStorage.setItem('zalo_delayMin', JSON.stringify(delayMin));
    localStorage.setItem('zalo_delayMax', JSON.stringify(delayMax));
    localStorage.setItem('zalo_sendTimeMin', JSON.stringify(sendTimeMin));
    localStorage.setItem('zalo_sendTimeMax', JSON.stringify(sendTimeMax));
    localStorage.setItem('zalo_pauseAfter', JSON.stringify(pauseAfter));
    localStorage.setItem('zalo_pauseMinutes', JSON.stringify(pauseMinutes));
    localStorage.setItem('zalo_errorPause', JSON.stringify(errorPause));
    localStorage.setItem('zalo_repeat', JSON.stringify(repeat));
    localStorage.setItem('zalo_randomFriend', JSON.stringify(randomFriend));
    localStorage.setItem('zalo_fromIndex', JSON.stringify(fromIndex));
    localStorage.setItem('zalo_targetCount', JSON.stringify(targetCount));
  }, [templates, groups, sendMode, concurrency, delayMin, delayMax, sendTimeMin, sendTimeMax,
      pauseAfter, pauseMinutes, errorPause, repeat, randomFriend, fromIndex, targetCount]);
  // Auto-select tất cả CRM targets khi mới nhận
  useEffect(() => {
    if (crmTargets.length > 0) {
      setSelectedCrm(new Set(crmTargets.map(t => t.id)));
    }
  }, [crmTargets]);

  const toggleCrm = (id) => {
    setSelectedCrm(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const running = bulkRunning;
  const uploadListRef = useRef(null);

  const [panelWidths, setPanelWidths] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zb_panelWidths') || '{}'); } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem('zb_panelWidths', JSON.stringify(panelWidths)); } catch {}
  }, [panelWidths]);

  const handlePanelResizeStart = (panel, inverse = false) => (e) => {
    e.preventDefault();
    const defaults = { friends: 280, crm: 210, results: 168 };
    const startX = e.clientX;
    const startWidth = panelWidths[panel] ?? defaults[panel];
    const onMouseMove = (ev) => {
      const diff = ev.clientX - startX;
      const newWidth = Math.max(140, Math.min(520, startWidth + (inverse ? -diff : diff)));
      setPanelWidths(prev => ({ ...prev, [panel]: newWidth }));
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
  };

  const handleDownloadList = () => {
    const toExport = phonebook.filter(c => selected.has(c.id));
    if (!toExport.length) {
      antMessage.warning('Chưa tích chọn bạn bè nào để tải xuống');
      return;
    }
    const lines = ['Tên hiển thị\tTên Zalo\tID Zalo'];
    toExport.forEach(c => {
      const tenHienThi = c.name || '';
      const tenZalo = (c.displayName && c.displayName !== c.name) ? c.displayName : (c.name || '');
      lines.push(`${tenHienThi}\t${tenZalo}\t${c.id}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_zalo_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    antMessage.success(`Đã tải xuống ${toExport.length} bạn bè`);
  };

  const handleUploadList = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target.result || '').replace(/^﻿/, ''); // strip BOM
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      // skip header line if present
      const dataLines = lines[0]?.includes('Tên hiển thị') || lines[0]?.includes('ID Zalo')
        ? lines.slice(1) : lines;
      const fileIds = new Set();
      const fileNames = new Set();
      dataLines.forEach(line => {
        const parts = line.split('\t');
        const id = parts[2]?.trim();
        const name0 = parts[0]?.trim();
        const name1 = parts[1]?.trim();
        if (id && id !== 'ID Zalo') fileIds.add(id);
        if (name0) fileNames.add(name0);
        if (name1) fileNames.add(name1);
      });
      const newSelected = new Set(selected);
      let added = 0;
      phonebook.forEach(c => {
        const byId = fileIds.has(String(c.id));
        const byName = fileNames.has(c.name) || fileNames.has(c.displayName);
        if ((byId || byName) && !newSelected.has(c.id)) {
          newSelected.add(c.id);
          added++;
        }
      });
      setSelected(newSelected);
      if (added > 0) {
        antMessage.success(`Đã chọn thêm ${added} bạn bè từ file (tổng: ${newSelected.size})`);
      } else {
        antMessage.warning('Không khớp được bạn bè nào — thử tải lại danh bạ rồi upload lại');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const [addVisible, setAddVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [modalContent, setModalContent] = useState('');
  const [modalImages, setModalImages] = useState([]);
  const [modalVideos, setModalVideos] = useState([]);
  const [modalGroupId, setModalGroupId] = useState(null);

  const filteredPb = phonebook.filter((c) => {
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(kw);
      const matchDisplay = c.displayName?.toLowerCase().includes(kw);
      const matchPhone = c.phone?.includes(filter.keyword);
      if (!matchName && !matchDisplay && !matchPhone) return false;
    }
    return true;
  });

  const allChecked = filteredPb.length > 0 && selected.size === filteredPb.length;
  const someChecked = selected.size > 0 && selected.size < filteredPb.length;

  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(filteredPb.map((c) => c.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleTpl = (id) => {
    setSelectedTpls((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const openAdd = (defaultGroupId = null) => {
    setEditTarget(null);
    setModalContent('');
    setModalImages([]);
    setModalVideos([]);
    setModalGroupId(defaultGroupId);
    setAddVisible(true);
  };

  const openEdit = () => {
    if (selectedTpls.size !== 1) return;
    const id = [...selectedTpls][0];
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditTarget(id);
    setModalContent(t.content);
    setModalImages(Array.isArray(t.images) ? [...t.images] : []);
    setModalVideos(Array.isArray(t.videos) ? [...t.videos] : []);
    setModalGroupId(t.groupId || null);
    setAddVisible(true);
  };

  const saveTemplate = () => {
    if (!modalContent.trim()) return antMessage.warning('Nhập nội dung tin nhắn');
    const cleanImages = modalImages.map(s => s.trim()).filter(Boolean);
    const cleanVideos = modalVideos.map(s => s.trim()).filter(Boolean);
    if (editTarget) {
      setTemplates((prev) =>
        prev.map((t) => t.id === editTarget
          ? { ...t, content: modalContent, images: cleanImages, videos: cleanVideos, groupId: modalGroupId }
          : t)
      );
    } else {
      setTemplates((prev) => [...prev, {
        id: Date.now(), groupId: modalGroupId,
        content: modalContent, images: cleanImages, videos: cleanVideos,
      }]);
    }
    setAddVisible(false);
  };

  const deleteTpls = () => {
    setTemplates((prev) => prev.filter((t) => !selectedTpls.has(t.id)));
    setSelectedTpls(new Set());
  };

  const toggleExpandGroup = (gid) => {
    setExpandedGroups((prev) => {
      const s = new Set(prev);
      s.has(gid) ? s.delete(gid) : s.add(gid);
      return s;
    });
  };

  const selectAllInGroup = (gid, tplsInGroup) => {
    const ids = tplsInGroup.map(t => t.id);
    const allSelected = ids.every(id => selectedTpls.has(id));
    setSelectedTpls((prev) => {
      const s = new Set(prev);
      if (allSelected) ids.forEach(id => s.delete(id));
      else ids.forEach(id => s.add(id));
      return s;
    });
  };

  const addGroup = () => {
    const name = `Nhóm mới ${groups.length + 1}`;
    const newId = `g_${Date.now()}`;
    setGroups(prev => [...prev, { id: newId, name }]);
    setEditingGroupId(newId);
    setEditingGroupName(name);
  };

  const saveGroupName = () => {
    if (!editingGroupName.trim()) return;
    setGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name: editingGroupName.trim() } : g));
    setEditingGroupId(null);
  };

  const deleteGroup = (gid) => {
    setTemplates(prev => prev.map(t => t.groupId === gid ? { ...t, groupId: null } : t));
    setGroups(prev => prev.filter(g => g.id !== gid));
  };

  const handleStart = () => {
    const totalTargets = selected.size + selectedCrm.size;
    if (totalTargets === 0) return antMessage.warning('Chọn ít nhất 1 người để gửi tin');
    if (selectedTpls.size === 0) return antMessage.warning('Chọn ít nhất 1 mẫu tin nhắn');
    const selectedCrmContacts = crmTargets.filter(t => selectedCrm.has(t.id));
    onBulkStart();
    wsRef.current?.send(
      JSON.stringify({
        type: 'bulk_send',
        targets: [...selected],
        crmTargets: selectedCrmContacts,
        templates: templates.filter((t) => selectedTpls.has(t.id)),
        mode: sendMode,
        concurrency,
        delayMin,
        delayMax,
        sendTimeMin,
        sendTimeMax,
        pauseAfter,
        pauseMinutes,
        errorPause,
        repeat: false,
        randomFriend: false,
        fromIndex,
        targetCount,
      })
    );
    antMessage.success(`Bắt đầu gửi tới ${selected.size} bạn bè + ${selectedCrm.size} khách CRM`);
  };

  const handleStop = () => {
    wsRef.current?.send(JSON.stringify({ type: 'bulk_stop' }));
    antMessage.info('Đã dừng gửi tin nhắn hàng loạt');
  };

  return (
    <div className="zb-root">

      {/* ══ TOP BAR ══ */}
      <div className="zb-topbar">
        <div className="zb-topbar-left">
          <div className="zb-topbar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className="zb-topbar-title">Gửi tin nhắn hàng loạt</div>
            <div className="zb-topbar-sub">
              {selected.size > 0
                ? <span className="zb-chip zb-chip-blue">{selected.size} bạn bè</span>
                : <span className="zb-chip zb-chip-gray">{filteredPb.length} bạn bè</span>
              }
              {selectedCrm.size > 0 &&
                <span className="zb-chip zb-chip-green">{selectedCrm.size} CRM</span>
              }
              {selectedTpls.size > 0 &&
                <span className="zb-chip zb-chip-purple">{selectedTpls.size} mẫu tin</span>
              }
            </div>
          </div>
        </div>
        <div className="zb-topbar-right">
          <Select
            size="small"
            value={opTab}
            onChange={setOpTab}
            style={{ width: 180 }}
            options={OPERATION_TABS.map((l, i) => ({ label: l, value: i }))}
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={running}
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', fontWeight: 600 }}
          >
            Bắt đầu
          </Button>
          <Button
            danger icon={<StopOutlined />}
            onClick={handleStop}
            disabled={!running}
            style={{ fontWeight: 600 }}
          >
            Kết thúc
          </Button>
        </div>
      </div>

      {/* ZCA disconnected warning */}
      {zcaDisconnected && !running && (
        <Alert
          type="warning"
          showIcon
          style={{ margin: '0 0 0 0', borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}
          message="Tài khoản Zalo chưa kết nối ZCA — không thể gửi tin nhắn hàng loạt"
          description={<span>Nhấn icon <strong>⬆</strong> trên thanh tài khoản phía trên để xem hướng dẫn đăng nhập lại qua Extension.</span>}
        />
      )}

      {/* running banner */}
      {running && (
        <div className="zb-running-banner">
          <Spin size="small" />
          <span>Đang gửi tin tới <strong>{selected.size}</strong> người — sử dụng <strong>{selectedTpls.size}</strong> mẫu tin nhắn</span>
          <Button size="small" danger onClick={handleStop} style={{ marginLeft: 'auto' }}>Dừng ngay</Button>
        </div>
      )}

      {/* ══ BODY ══ */}
      <div className="zb-body">

        {/* ── LEFT: Friend list ── */}
        <div className="zb-panel zb-panel-friends" style={{ width: panelWidths.friends ?? 280 }}>
          <div className="zb-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span className="zb-panel-title">Danh sách bạn bè</span>
              <span className="zb-badge">{filteredPb.length}</span>
            </div>
            <Button
              size="small" type="text" icon={<ReloadOutlined />}
              loading={phonebookLoading} onClick={onRefreshPhonebook}
              style={{ color: '#64748b' }}
            />
          </div>

          {/* Search */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <Input
              size="small"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tìm tên bạn bè..."
              value={filter.keyword}
              onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))}
              allowClear
              variant="filled"
            />
          </div>

          {/* Friend rows */}
          <div className="zb-friend-list">
            {filteredPb.length === 0 ? (
              <div className="zb-empty">
                {phonebook.length === 0
                  ? <><Spin size="small" /><span>Đang tải danh bạ...</span></>
                  : <span>Không tìm thấy</span>
                }
              </div>
            ) : filteredPb.map((c, i) => (
              <div
                key={c.id}
                className={`zb-friend-row ${selected.has(c.id) ? 'active' : ''}`}
                onClick={() => toggleOne(c.id)}
              >
                <Checkbox checked={selected.has(c.id)} onChange={() => {}} style={{ pointerEvents: 'none', flexShrink: 0 }} />
                <ZaloAvatar name={c.name} src={c.avatar} size={28} />
                <div className="zb-friend-info">
                  <span className="zb-friend-name">
                    {i + 1}.{' '}
                    {c.name && c.displayName && c.name !== c.displayName
                      ? <Tooltip title={`Tên Zalo: ${c.displayName}`} mouseEnterDelay={0.5}>
                          {c.name} <span className="zb-friend-remark">({c.displayName})</span>
                        </Tooltip>
                      : (c.name || c.displayName)}
                  </span>
                  {c.phone && <span className="zb-friend-phone">{c.phone}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Filter footer */}
          <div className="zb-filter-footer">
            <div className="zb-filter-grid">
              <div className="zb-filter-item">
                <label>Độ tuổi</label>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <InputNumber size="small" value={filter.ageFrom}
                    onChange={(v) => setFilter((f) => ({ ...f, ageFrom: v }))}
                    min={0} max={99} style={{ width: 48 }} />
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>–</span>
                  <InputNumber size="small" value={filter.ageTo}
                    onChange={(v) => setFilter((f) => ({ ...f, ageTo: v }))}
                    min={0} max={99} style={{ width: 48 }} />
                </div>
              </div>
              <div className="zb-filter-item">
                <label>Giới tính</label>
                <Select size="small" value={filter.gender}
                  onChange={(v) => setFilter((f) => ({ ...f, gender: v }))} style={{ width: '100%' }}
                  options={[{ value: 'All', label: 'Tất cả' }, { value: 'Nam', label: 'Nam' }, { value: 'Nu', label: 'Nữ' }]}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input ref={uploadListRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleUploadList} />
              <Tooltip title={selected.size ? `Tải xuống ${selected.size} bạn đã chọn dưới dạng .txt` : 'Tích chọn bạn bè trước'}>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadList}
                  disabled={!selected.size}
                  style={{ flex: 1, borderColor: '#0068FF', color: '#0068FF', fontWeight: 600 }}
                >
                  Tải DS
                </Button>
              </Tooltip>
              <Tooltip title="Tải lên file .txt để chọn lại đúng danh sách">
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => uploadListRef.current?.click()}
                  style={{ flex: 1, borderColor: '#10B981', color: '#10B981', fontWeight: 600 }}
                >
                  Tải Lên
                </Button>
              </Tooltip>
              <Tooltip title="Bỏ tích tất cả">
                <Button
                  size="small"
                  onClick={() => setSelected(new Set())}
                  style={{ flex: 1 }}
                >
                  Bỏ chọn
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="zb-resize-handle" onMouseDown={handlePanelResizeStart('friends')} />

        {/* ── CRM Targets panel ── */}
        <div className="zb-panel zb-panel-crm" style={{ width: panelWidths.crm ?? 210 }}>
          <div className="zb-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Checkbox
                checked={crmTargets.length > 0 && selectedCrm.size === crmTargets.length}
                indeterminate={selectedCrm.size > 0 && selectedCrm.size < crmTargets.length}
                onChange={e => setSelectedCrm(e.target.checked ? new Set(crmTargets.map(t => t.id)) : new Set())}
              />
              <span className="zb-panel-title">Nhắn tin từ CRM</span>
              <span className="zb-badge" style={{ background: '#dcfce7', color: '#15803d' }}>{crmTargets.length}</span>
            </div>
            {onClearCrm && crmTargets.length > 0 && (
              <Button size="small" type="text" onClick={onClearCrm} style={{ color: '#ef4444', fontSize: 11 }}>Xóa</Button>
            )}
          </div>

          <div className="zb-crm-list">
            {crmTargets.length === 0 ? (
              <div className="zb-empty" style={{ flexDirection: 'column', gap: 6, padding: '24px 12px' }}>
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="#bbf7d0"/>
                </svg>
                <span style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Chọn khách hàng ở trang<br />Khách hàng rồi nhấn<br /><strong>"Nhắn tin Zalo"</strong>
                </span>
              </div>
            ) : (
              crmTargets.map((t, i) => (
                <div
                  key={t.id}
                  className={`zb-crm-row${selectedCrm.has(t.id) ? ' active' : ''}`}
                  onClick={() => toggleCrm(t.id)}
                >
                  <Checkbox checked={selectedCrm.has(t.id)} onChange={() => {}} style={{ pointerEvents: 'none', flexShrink: 0 }} />
                  <div className="zb-crm-info">
                    <span className="zb-crm-name">{i + 1}. {t.name}</span>
                    <span className="zb-crm-phone">{t.phone}</span>
                    {t.sale && <span className="zb-crm-sale">Sale: {t.sale}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {crmTargets.length > 0 && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid #bbf7d0', background: '#f0fdf4', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                {selectedCrm.size}/{crmTargets.length} đã chọn
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                Dùng {'{Tên}'} {'{SĐT}'} trong mẫu tin
              </div>
            </div>
          )}
        </div>

        <div className="zb-resize-handle" onMouseDown={handlePanelResizeStart('crm')} />

        {/* ── CENTER: Message config ── */}
        <div className="zb-center-col">

          {/* Card: Templates */}
          {(() => {
            const byGroup = {};
            for (const g of groups) byGroup[g.id] = [];
            byGroup['__none__'] = [];
            let globalIdx = 0;
            const idxMap = {};
            for (const t of templates) {
              const gid = (t.groupId && byGroup[t.groupId]) ? t.groupId : '__none__';
              idxMap[t.id] = ++globalIdx;
              byGroup[gid].push(t);
            }
            const renderTplRow = (t) => (
              <div
                key={t.id}
                className={`zb-tpl-row ${selectedTpls.has(t.id) ? 'active' : ''}`}
                onClick={() => toggleTpl(t.id)}
              >
                <Checkbox checked={selectedTpls.has(t.id)} onChange={() => {}} style={{ pointerEvents: 'none', flexShrink: 0 }} />
                <span className="zb-tpl-content">{idxMap[t.id]}. {t.content}</span>
                <span className={`zb-tpl-img ${(t.images?.length || t.videos?.length) ? 'zb-tpl-img-has' : 'zb-tpl-img-none'}`}>
                  {t.images?.length > 0 && `🖼️ ${t.images.length}`}
                  {t.images?.length > 0 && t.videos?.length > 0 && ' · '}
                  {t.videos?.length > 0 && `📹 ${t.videos.length}`}
                  {!t.images?.length && !t.videos?.length && 'Chưa có'}
                </span>
                <Button
                  size="small" type="text"
                  icon={<EyeOutlined />}
                  style={{ padding: '0 4px', flexShrink: 0, color: '#94a3b8' }}
                  title="Xem trước"
                  onClick={(e) => { e.stopPropagation(); setPreviewTpl(t); }}
                />
              </div>
            );
            return (
              <div className="zb-card">
                <div className="zb-card-head">
                  <span className="zb-card-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0068FF" style={{ marginRight: 6 }}>
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                    Mẫu tin nhắn
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button size="small" onClick={addGroup}>+ Nhóm</Button>
                    <Button size="small" onClick={() => setSelectedTpls(new Set(templates.map(t => t.id)))}>Chọn tất cả</Button>
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openAdd()}>Thêm</Button>
                    <Button size="small" icon={<EditOutlined />} disabled={selectedTpls.size !== 1} onClick={openEdit}>Sửa</Button>
                    <Button size="small" danger icon={<DeleteOutlined />} disabled={selectedTpls.size === 0} onClick={deleteTpls}>Xóa</Button>
                  </div>
                </div>
                <div className="zb-tpl-thead">
                  <span style={{ width: 20 }} />
                  <span style={{ flex: 1 }}>Nội dung tin nhắn</span>
                  <span style={{ width: 100 }}>Media</span>
                </div>
                <div className="zb-tpl-list">
                  {groups.map(g => (
                    <div key={g.id}>
                      <div className="zb-group-header" onClick={() => toggleExpandGroup(g.id)}>
                        <span className="zb-group-arrow">{expandedGroups.has(g.id) ? '▼' : '▶'}</span>
                        {editingGroupId === g.id ? (
                          <Input
                            size="small"
                            value={editingGroupName}
                            onChange={e => setEditingGroupName(e.target.value)}
                            onBlur={saveGroupName}
                            onPressEnter={saveGroupName}
                            autoFocus
                            onClick={e => e.stopPropagation()}
                            style={{ flex: 1, maxWidth: 160, fontSize: 12 }}
                          />
                        ) : (
                          <span className="zb-group-name">{g.name}</span>
                        )}
                        <span className="zb-group-count">({byGroup[g.id]?.length || 0})</span>
                        <div className="zb-group-actions" onClick={e => e.stopPropagation()}>
                          <Button size="small" type="link" style={{ padding: '0 4px', fontSize: 11 }}
                            onClick={() => selectAllInGroup(g.id, byGroup[g.id] || [])}>
                            {(byGroup[g.id] || []).length > 0 && (byGroup[g.id] || []).every(t => selectedTpls.has(t.id)) ? 'Bỏ chọn' : 'Chọn nhóm'}
                          </Button>
                          <Button size="small" type="link" style={{ padding: '0 2px', fontSize: 11 }}
                            onClick={() => openAdd(g.id)}>+ Thêm</Button>
                          <Button size="small" type="text" style={{ padding: '0 3px', fontSize: 11 }}
                            onClick={() => { setEditingGroupId(g.id); setEditingGroupName(g.name); }}>✏️</Button>
                          <Button size="small" type="text" danger style={{ padding: '0 3px', fontSize: 11 }}
                            onClick={() => deleteGroup(g.id)}>🗑️</Button>
                        </div>
                      </div>
                      {expandedGroups.has(g.id) && (byGroup[g.id] || []).map(t => renderTplRow(t))}
                    </div>
                  ))}
                  {byGroup['__none__']?.length > 0 && (
                    <div>
                      <div className="zb-group-header" onClick={() => toggleExpandGroup('__none__')}>
                        <span className="zb-group-arrow">{expandedGroups.has('__none__') ? '▼' : '▶'}</span>
                        <span className="zb-group-name" style={{ color: '#9ca3af' }}>Chưa phân nhóm</span>
                        <span className="zb-group-count">({byGroup['__none__'].length})</span>
                        <div className="zb-group-actions" onClick={e => e.stopPropagation()}>
                          <Button size="small" type="link" style={{ padding: '0 4px', fontSize: 11 }}
                            onClick={() => selectAllInGroup('__none__', byGroup['__none__'])}>
                            {byGroup['__none__'].every(t => selectedTpls.has(t.id)) ? 'Bỏ chọn' : 'Chọn nhóm'}
                          </Button>
                        </div>
                      </div>
                      {expandedGroups.has('__none__') && byGroup['__none__'].map(t => renderTplRow(t))}
                    </div>
                  )}
                  {templates.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                      Chưa có mẫu tin nhắn — nhấn <strong>Thêm</strong> để tạo
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Card: Send options */}
          <div className="zb-card zb-card-compact">
            <div className="zb-send-options-row">
              <div className="zb-send-mode">
                <Radio.Group value={sendMode} onChange={(e) => setSendMode(e.target.value)}>
                  <Radio value="random" style={{ fontSize: 12 }}>Random 1 tin nhắn từ danh sách</Radio>
                  <Radio value="sequential" style={{ fontSize: 12 }}>Gửi lần lượt theo thứ tự</Radio>
                </Radio.Group>
              </div>
              <div className="zb-delay-field">
                <span className="zb-field-label">Delay giữa 2 tin</span>
                <InputNumber size="small" value={delayMin} onChange={setDelayMin} min={1} style={{ width: 56 }} />
                <span style={{ color: '#94a3b8', fontSize: 12 }}>–</span>
                <InputNumber size="small" value={delayMax} onChange={setDelayMax} min={1} style={{ width: 56 }} />
                <span style={{ color: '#94a3b8', fontSize: 11 }}>giây</span>
              </div>
              <div className="zb-delay-field">
                <span className="zb-field-label">Gửi đồng thời</span>
                <InputNumber size="small" value={concurrency} onChange={(v) => setConcurrency(Math.min(5, Math.max(1, v || 1)))} min={1} max={5} style={{ width: 56 }} />
                <span style={{ color: '#94a3b8', fontSize: 11 }}>luồng (1–5)</span>
              </div>
            </div>
          </div>

          {/* Card: Auto-send settings */}
          <div className="zb-card zb-card-auto">
            <div className="zb-card-head" style={{ marginBottom: 12 }}>
              <span className="zb-card-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b5cf6" style={{ marginRight: 6 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
                Cài đặt tự động
              </span>
            </div>
            <div className="zb-auto-grid">
              <div className="zb-auto-field">
                <label>Thời gian gửi tin <span style={{ color: '#94a3b8', fontSize: 10 }}>(giây, an toàn 3–10)</span></label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <InputNumber size="small" value={sendTimeMin} onChange={setSendTimeMin} min={1} style={{ flex: 1 }} />
                  <span style={{ color: '#94a3b8' }}>–</span>
                  <InputNumber size="small" value={sendTimeMax} onChange={setSendTimeMax} min={1} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="zb-auto-field">
                <label>Tạm dừng sau (tin)</label>
                <InputNumber size="small" value={pauseAfter} onChange={setPauseAfter} min={1} style={{ width: '100%' }} />
              </div>
              <div className="zb-auto-field">
                <label>Thời gian tạm dừng (phút)</label>
                <InputNumber size="small" value={pauseMinutes} onChange={setPauseMinutes} min={1} style={{ width: '100%' }} />
              </div>
              <div className="zb-auto-field">
                <label>Nghỉ khi gặp lỗi (phút)</label>
                <InputNumber size="small" value={errorPause} onChange={setErrorPause} min={1} style={{ width: '100%' }} />
              </div>
              <div className="zb-auto-field">
                <label>Gửi từ vị trí bạn</label>
                <InputNumber size="small" value={fromIndex} onChange={setFromIndex} min={0} style={{ width: '100%' }} />
              </div>
              <div className="zb-auto-field">
                <label>Số bạn muốn gửi</label>
                <InputNumber size="small" value={targetCount} onChange={setTargetCount} min={1} style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results panel ── */}
        <div className="zb-resize-handle" onMouseDown={handlePanelResizeStart('results', true)} />
        <div className="zb-action-panel" style={{ width: panelWidths.results ?? 168 }}>
          <div className="zb-results-header">
            <span className="zb-results-title">Kết quả gửi tin</span>
            {bulkResults.length > 0 && (
              <span className="zb-results-counts">
                <span style={{ color: '#22c55e' }}>{bulkResults.filter((r) => r.status === 'success').length}✓</span>
                {' · '}
                <span style={{ color: '#ef4444' }}>{bulkResults.filter((r) => r.status === 'failed').length}✗</span>
                {bulkResults.some((r) => r.status === 'skipped') && (
                  <>{' · '}<span style={{ color: '#94a3b8' }}>{bulkResults.filter((r) => r.status === 'skipped').length}⊘</span></>
                )}
              </span>
            )}
          </div>

          <div className="zb-results-list">
            {bulkResults.length === 0 ? (
              <div className="zb-results-empty">
                {running
                  ? <><Spin size="small" /><span>Đang gửi...</span></>
                  : <span>Chưa có kết quả</span>
                }
              </div>
            ) : (
              [...bulkResults].reverse().map((r, i) => (
                <div key={i} className={`zb-result-row ${r.status}`}>
                  <span className={`zb-result-dot ${r.status}`} />
                  <span className="zb-result-name" title={r.error || r.name}>{r.name}</span>
                  <span className={`zb-result-status ${r.status}`}>
                    {r.status === 'success' ? '✓' : r.status === 'skipped' ? '⊘' : '✗'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="zb-action-divider" />
          <div className="zb-action-stats">
            <div className="zb-stat-row">
              <span>Bạn bè</span>
              <strong style={{ color: '#0068FF' }}>{selected.size}</strong>
            </div>
            <div className="zb-stat-row">
              <span>CRM</span>
              <strong style={{ color: '#15803d' }}>{selectedCrm.size}</strong>
            </div>
            <div className="zb-stat-row">
              <span>Mẫu tin</span>
              <strong style={{ color: '#8b5cf6' }}>{selectedTpls.size}</strong>
            </div>
            <div className="zb-stat-row">
              <span>Tổng bạn</span>
              <strong>{phonebook.length}</strong>
            </div>
            {bulkResults.length > 0 && (
              <>
                <div className="zb-stat-row">
                  <span>Thành công</span>
                  <strong style={{ color: '#22c55e' }}>{bulkResults.filter((r) => r.status === 'success').length}</strong>
                </div>
                <div className="zb-stat-row">
                  <span>Thất bại</span>
                  <strong style={{ color: '#ef4444' }}>{bulkResults.filter((r) => r.status === 'failed').length}</strong>
                </div>
                {bulkResults.some((r) => r.status === 'skipped') && (
                  <div className="zb-stat-row">
                    <span>Bỏ qua</span>
                    <strong style={{ color: '#94a3b8' }}>{bulkResults.filter((r) => r.status === 'skipped').length}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Template modal */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageOutlined style={{ color: '#0068FF' }} />
            {editTarget ? 'Sửa mẫu tin nhắn' : 'Thêm mẫu tin nhắn'}
          </span>
        }
        open={addVisible}
        onOk={saveTemplate}
        onCancel={() => setAddVisible(false)}
        okText="Lưu" cancelText="Hủy" width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {/* Nhóm */}
          <div>
            <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600, color: '#374151' }}>Nhóm</div>
            <Select
              size="small" style={{ width: '100%' }}
              value={modalGroupId}
              onChange={setModalGroupId}
              placeholder="Chưa phân nhóm"
              allowClear
              options={[
                ...groups.map(g => ({ value: g.id, label: g.name })),
              ]}
            />
          </div>
          {/* Nội dung */}
          <div>
            <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600, color: '#374151' }}>Nội dung tin nhắn</div>
            <Input.TextArea
              rows={5}
              value={modalContent}
              onChange={(e) => setModalContent(e.target.value)}
              placeholder="Nhập nội dung... Dùng {Tên}, {SĐT} để cá nhân hoá từng người"
              style={{ resize: 'vertical' }}
            />
          </div>
          {/* Ảnh */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Ảnh đính kèm <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(tuỳ chọn)</span>
              </div>
              <Button size="small" type="dashed" icon={<PlusOutlined />}
                onClick={() => setModalImages(prev => [...prev, ''])} style={{ fontSize: 12 }}>
                Thêm ảnh
              </Button>
            </div>
            {modalImages.length === 0 && (
              <div style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 0' }}>Chưa có ảnh</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {modalImages.map((img, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 18 }}>🖼️</span>
                  <Input value={img}
                    onChange={(e) => setModalImages(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                    placeholder={`https://... hoặc /opt/media/image${idx + 1}.jpg`}
                    style={{ flex: 1 }} size="small" />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />}
                    onClick={() => setModalImages(prev => prev.filter((_, i) => i !== idx))} />
                </div>
              ))}
            </div>
          </div>
          {/* Video */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Video đính kèm <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(tuỳ chọn)</span>
              </div>
              <Button size="small" type="dashed" icon={<PlusOutlined />}
                onClick={() => setModalVideos(prev => [...prev, ''])} style={{ fontSize: 12 }}>
                Thêm video
              </Button>
            </div>
            {modalVideos.length === 0 && (
              <div style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 0' }}>Chưa có video</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {modalVideos.map((vid, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 18 }}>📹</span>
                  <Input value={vid}
                    onChange={(e) => setModalVideos(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                    placeholder={`https://... hoặc /opt/media/video${idx + 1}.mp4`}
                    style={{ flex: 1 }} size="small" />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />}
                    onClick={() => setModalVideos(prev => prev.filter((_, i) => i !== idx))} />
                </div>
              ))}
            </div>
            {(modalImages.length > 0 || modalVideos.length > 0) && (
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                Hỗ trợ link URL (https://...) hoặc đường dẫn file trên VPS. Gửi theo thứ tự: ảnh trước, video sau.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Preview template modal */}
      <Modal
        open={!!previewTpl}
        onCancel={() => setPreviewTpl(null)}
        footer={null}
        title={<span><EyeOutlined style={{ marginRight: 8, color: '#0068FF' }} />Xem trước mẫu tin nhắn</span>}
        width={640}
        destroyOnClose
      >
        {previewTpl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Nội dung văn bản
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, color: '#1e293b', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', minHeight: 48 }}>
                {previewTpl.content || <span style={{ color: '#9ca3af' }}>Không có nội dung văn bản</span>}
              </div>
            </div>

            {previewTpl.images?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Ảnh đính kèm ({previewTpl.images.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {previewTpl.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img
                        src={url}
                        alt={`Ảnh ${i + 1}`}
                        style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                        onError={(e) => { e.target.style.cssText = 'width:100%;height:120px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;'; e.target.alt = '⚠️ Không tải được ảnh'; }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {previewTpl.videos?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Video đính kèm ({previewTpl.videos.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {previewTpl.videos.map((url, i) => {
                    const isHttp = url?.startsWith('http');
                    return (
                      <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
                        {isHttp ? (
                          <video src={url} controls style={{ width: '100%', maxHeight: 260, display: 'block' }} />
                        ) : (
                          <div style={{ background: '#f8fafc', padding: '10px 14px', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📹</span>
                            <span style={{ wordBreak: 'break-all' }}>{url}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!previewTpl.content && !previewTpl.images?.length && !previewTpl.videos?.length && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0', fontSize: 13 }}>
                Mẫu tin nhắn trống
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Admin: thanh pill ngang hiển thị tất cả tài khoản Zalo ──────────────────
function AdminZaloTabs({ selectedSession, onSelect, crmGroups = {}, onSync }) {
  const [crmUsers, setCrmUsers] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [refreshingMyInfo, setRefreshingMyInfo] = useState({});
  const [reloadingSession, setReloadingSession] = useState({});

  useEffect(() => {
    authApi.getUsers()
      .then((res) => setCrmUsers(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => {
      fetch(`${SERVICE_BASE}/sessions`)
        .then((r) => r.json())
        .then((d) => setLiveSessions(Array.isArray(d) ? d : []))
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, []);

  const merged = crmUsers.filter((u) => u.active !== false).map((u) => {
    const live = liveSessions.find((s) => s.sessionId === u.username);
    return {
      username: u.username,
      label: u.fullName || u.username,
      phone: live?.phone || null,
      status: live?.status || 'idle',
      phonebookCount: live?.phonebookCount || 0,
      zcaMode: live?.zcaMode || false,
      zcaConnected: live?.zcaConnected ?? null,
      zcaLastPing: live?.zcaLastPing || null,
      proxy: live?.proxy || null,
    };
  });

  const statusClass = (u) => {
    if (u.zcaMode && u.zcaConnected === false) return 'zca-disconnected';
    const s = u.status;
    return s === 'logged_in' ? 'online' : s === 'waiting_qr' || s === 'loading' ? 'waiting' : 'offline';
  };

  const statusText = (u) => {
    if (u.zcaMode && u.zcaConnected === false) return 'ZCA mất kết nối';
    const s = u.status;
    return s === 'logged_in' ? 'Online' : s === 'waiting_qr' ? 'Chờ QR' : s === 'loading' ? 'Đang tải' : 'Offline';
  };

  const handleRefreshMyInfo = async (e, username) => {
    e.stopPropagation();
    setRefreshingMyInfo((prev) => ({ ...prev, [username]: true }));
    try {
      await fetch(`${SERVICE_BASE}/refresh-myinfo?session=${encodeURIComponent(username)}`, { method: 'POST' });
      // Poll sessions after 1s to pick up updated name/phone
      setTimeout(() => {
        fetch(`${SERVICE_BASE}/sessions`).then((r) => r.json()).then((d) => {
          if (Array.isArray(d)) setLiveSessions(d);
        }).catch(() => {});
      }, 1200);
    } catch {}
    setTimeout(() => setRefreshingMyInfo((prev) => ({ ...prev, [username]: false })), 2000);
  };

  const handleReloadSession = async (e, username) => {
    e.stopPropagation();
    setReloadingSession((prev) => ({ ...prev, [username]: true }));
    try {
      const res = await fetch(`${SERVICE_BASE}/reload-page?session=${encodeURIComponent(username)}`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        antMessage.error(`Không thể kết nối lại: ${d.error || res.statusText}`);
      } else {
        antMessage.success('Đang kết nối lại Zalo...');
      }
    } catch (err) {
      antMessage.error(`Lỗi: ${err.message}`);
    }
    setTimeout(() => setReloadingSession((prev) => ({ ...prev, [username]: false })), 4000);
  };

  if (merged.length === 0) return null;

  return (
    <div className="zadmin-strip">
      {merged.map((u) => {
        const isActive = selectedSession === u.username;
        const sc = statusClass(u);
        const crmCount = (crmGroups[u.username] || []).length;
        const disconnected = u.zcaMode && u.zcaConnected === false;
        return (
          <button
            key={u.username}
            className={`zadmin-pill${isActive ? ' active' : ''} ${sc}`}
            onClick={() => onSelect(u.username)}
            title={disconnected ? 'Mất kết nối zca-js — click để xem' : [u.label, u.phone].filter(Boolean).join(' · ')}
          >
            <span className="zadmin-pill-dot" />
            <span className="zadmin-pill-name">
              {u.label}
              {u.phone && <span className="zadmin-pill-phone">{u.phone}</span>}
            </span>
            {u.phonebookCount > 0 && (
              <span className="zadmin-pill-badge">{u.phonebookCount}</span>
            )}
            {crmCount > 0 && (
              <span className="zadmin-pill-crm">{crmCount} CRM</span>
            )}
            {u.proxy && (
              <span
                className="zadmin-pill-proxy"
                title={`Proxy: ${u.proxy}`}
              >
                🌐 {u.proxy}
              </span>
            )}
            <span className="zadmin-pill-status">{statusText(u)}</span>
            {u.status === 'logged_in' && (
              <span
                className="zadmin-pill-refresh"
                title={disconnected ? 'Kết nối lại Zalo (reload trang VPS)' : 'Lấy lại tên & SĐT Zalo'}
                onClick={(e) => disconnected
                  ? handleReloadSession(e, u.username)
                  : handleRefreshMyInfo(e, u.username)
                }
              >
                {(reloadingSession[u.username] || refreshingMyInfo[u.username]) ? '⟳' : '↻'}
              </span>
            )}
            {onSync && (
              <span
                className="zadmin-pill-refresh"
                title="Đồng bộ Zalo PC"
                style={{ color: '#0068FF', marginLeft: 2 }}
                onClick={(e) => { e.stopPropagation(); onSync(u.username, u.label); }}
              >
                ⬆
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Modal hướng dẫn đăng nhập qua Chrome Extension ───────────────────────────
function ZaloSyncModal({ syncTarget, onClose }) {
  if (!syncTarget) return null;
  return (
    <Modal
      title={<span><SyncOutlined style={{ color: '#0068FF', marginRight: 8 }} />Đăng nhập lại — {syncTarget.label}</span>}
      open
      onCancel={onClose}
      footer={<button onClick={onClose} style={{ padding: '6px 20px', background: '#0068FF', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Đóng</button>}
      width={480}
      destroyOnClose
    >
      <div style={{ padding: '8px 0 4px' }}>
        <Alert
          type="info"
          style={{ marginBottom: 16, fontSize: 12 }}
          message={<b>Cách đăng nhập Zalo lên VPS</b>}
          description={
            <ol style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 2.2 }}>
              <li>Cài <b>Extension "Zalo CRM"</b> vào Chrome (xin file <code>.zip</code> từ Admin)</li>
              <li>Mở <b>chat.zalo.me</b> trong Chrome và đăng nhập bằng điện thoại</li>
              <li>Click icon extension → nhập Session ID: <b style={{ color: '#0068FF', fontSize: 13 }}>{syncTarget.sessionId}</b></li>
              <li>Nhấn <b>"Xuất session lên VPS"</b> → xong ✓</li>
            </ol>
          }
        />
        <div style={{ background: '#f0f7ff', border: '1px solid #bdd7ff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#555' }}>Session ID của bạn:</p>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#0068FF', letterSpacing: 1 }}>{syncTarget.sessionId}</p>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#888' }}>Nhập chính xác ID này vào Extension</p>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Zalo Component ───────────────────────────────────────────────────────
export default function Zalo() {
  const { user, isAdmin } = useAuth();
  const ownSessionId = user?.username || 'default';
  const [searchParams, setSearchParams] = useSearchParams();

  // Admin có thể chọn xem session của bất kỳ nhân viên nào; persist qua URL param ?session=xxx
  const [adminViewSession, setAdminViewSession] = useState(() =>
    isAdmin ? (searchParams.get('session') || null) : null
  );
  const effectiveSessionId = (isAdmin && adminViewSession) ? adminViewSession : ownSessionId;

  // Ref luôn giữ URL mới nhất để connectWS không bị stale closure
  const wsUrlRef = useRef(`${WS_BASE}?session=${encodeURIComponent(effectiveSessionId)}`);
  wsUrlRef.current = `${WS_BASE}?session=${encodeURIComponent(effectiveSessionId)}`;
  const qpRef = useRef(`?session=${encodeURIComponent(effectiveSessionId)}`);
  qpRef.current = `?session=${encodeURIComponent(effectiveSessionId)}`;

  const qp = qpRef.current;

  const [status, setStatus] = useState('loading');
  const [qrData, setQrData] = useState(null);   // ảnh QR (data URL) từ VPS screenshot
  const [qrCanvas, setQrCanvas] = useState(null); // QR được vẽ lại từ qrText (sắc nét hơn)
  const [myInfo, setMyInfo] = useState({ name: null, phone: null, uid: null });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return Number(localStorage.getItem('zalo_sidebarWidth') || 0) || 468; } catch { return 468; }
  });
  const handleSidebarResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev) => {
      const newW = Math.max(240, Math.min(640, startW + (ev.clientX - startX)));
      setSidebarWidth(newW);
      try { localStorage.setItem('zalo_sidebarWidth', newW); } catch {}
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const [contacts, setContacts] = useState([]);
  const [phonebook, setPhonebook] = useState([]);
  const [phonebookLoading, setPhonebookLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [activeTab, setActiveTab] = useState('phonebook'); // 'messages' | 'phonebook' | 'bulk'
  const [contactsRefreshing, setContactsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [zcaDisconnected, setZcaDisconnected] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [msgLoadingStatus, setMsgLoadingStatus] = useState(null);
  const [loadingLong, setLoadingLong] = useState(false);
  const [sessionLoadText, setSessionLoadText] = useState('Đang kết nối...');
  const [sessionLoadHistory, setSessionLoadHistory] = useState([]);
  const [reloadingPage, setReloadingPage] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState(null);
  const [friendReqLoading, setFriendReqLoading] = useState({});
  const [crmAllGroups, setCrmAllGroups] = useState({});
  const [syncTarget, setSyncTarget] = useState(null); // { sessionId, label }
  const [proxyInput, setProxyInput] = useState(() => {
    try { return localStorage.getItem(`zalo_proxy_${effectiveSessionId}`) || ''; } catch { return ''; }
  });
  const [sessionProxy, setSessionProxy] = useState(null); // proxy đang dùng (display)
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimer = useRef(null);
  const inputRef = useRef(null);
  const searchTimer = useRef(null);
  const loadingTimerRef = useRef(null);

  // Load danh bạ từ Supabase (nhanh, không cần quét DOM)
  useEffect(() => {
    if (!effectiveSessionId) return;
    api.get('/zalo-chat/contacts', { params: { session: effectiveSessionId, size: 1000 } })
      .then(r => {
        const list = r.data?.content || [];
        if (list.length > 0) {
          setPhonebook(list.map(c => ({
            id: c.zaloUid,
            name: c.name || c.zaloUid,
            avatar: c.avatar || null,
            phone: '',
          })));
        }
      }).catch(() => {});
  }, [effectiveSessionId]);

  // Load hội thoại từ Supabase cho tab Tin nhắn
  useEffect(() => {
    if (!effectiveSessionId) return;
    api.get('/zalo-chat/inbox', { params: { session: effectiveSessionId, size: 100 } })
      .then(r => {
        const list = r.data?.content || [];
        if (list.length > 0) {
          setContacts(prev => {
            const wsMap = new Map(prev.map(c => [c.id, c]));
            const merged = new Map();
            list.forEach(conv => {
              const uid = conv.zaloUid;
              const ws = wsMap.get(uid) || {};
              merged.set(uid, {
                id: uid,
                name: conv.contactName && conv.contactName !== uid ? conv.contactName : (ws.name || uid),
                avatar: conv.avatar || ws.avatar || null,
                lastMsg: (typeof conv.lastMessage === 'string' ? conv.lastMessage : '') || (typeof ws.lastMsg === 'string' ? ws.lastMsg : '') || '',
                time: conv.updatedAt ? new Date(conv.updatedAt).getTime() : (ws.time || 0),
                unread: ws.unread || 0,
                _convId: conv.conversationId,
              });
            });
            // Giữ lại WS contacts có unread mà DB chưa có
            prev.forEach(c => { if (!merged.has(c.id)) merged.set(c.id, c); });
            return Array.from(merged.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
          });
        }
      }).catch(() => {});
  }, [effectiveSessionId]);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(wsUrlRef.current); // luôn dùng URL mới nhất qua ref
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setSessionLoadHistory(prev => {
        const label = 'Đã kết nối tới server';
        return prev.includes(label) ? prev : [...prev, label];
      });
      setSessionLoadText('Đang lấy thông tin phiên...');
      ws.send(JSON.stringify({ type: 'get_my_info' }));
      ws.send(JSON.stringify({ type: 'get_phonebook' }));
      ws.send(JSON.stringify({ type: 'get_messages' }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status') {
          setStatus(msg.status);
          if (msg.status === 'logged_in') {
            setZcaDisconnected(false);
            // Load proxy đang dùng — nếu localStorage trống thì pre-fill từ server
            fetch(`${SERVICE_BASE}/get-proxy${qp}`).then(r => r.json()).then(d => {
              setSessionProxy(d.proxyDisplay || null);
              if (d.proxy) {
                setProxyInput(prev => {
                  if (!prev) {
                    try { localStorage.setItem(`zalo_proxy_${effectiveSessionId}`, d.proxy); } catch {}
                    return d.proxy;
                  }
                  return prev;
                });
              }
            }).catch(() => {});
          }
        }
        if (msg.type === 'zca_disconnected') {
          setZcaDisconnected(true);
        }
        if (msg.type === 'zca_connected') {
          setZcaDisconnected(false);
        }
        if (msg.type === 'qr') {
          setQrData(msg.data);
          if (msg.qrText) {
            // Vẽ lại QR từ text → sắc nét, hoạt động trên mọi máy
            QRCode.toDataURL(msg.qrText, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
              .then(url => setQrCanvas(url))
              .catch(() => setQrCanvas(null));
          } else {
            setQrCanvas(null);
          }
        }
        if (msg.type === 'logged_in') { setQrData(null); setQrCanvas(null); }
        if (msg.type === 'contacts') setContacts((msg.data || []).map(c => ({
          ...c,
          lastMsg: typeof c.lastMsg === 'string' ? c.lastMsg : '',
        })));
        if (msg.type === 'phonebook') setPhonebook(msg.data || []);
        if (msg.type === 'phonebook_loading') setPhonebookLoading(msg.loading);
        if (msg.type === 'search_loading') setSearchLoading(msg.loading);
        if (msg.type === 'search_results') {
          setSearchResults(msg.data || []);
          setLookupLoading(false);
          setLookupResults((prev) => prev ? { ...prev, zalo: msg.data || [] } : prev);
        }
        if (msg.type === 'messages') {
          const wsMsgs = msg.data || [];
          setMessages(prev => {
            // Đã có messages từ Spring Boot API → bỏ qua messages từ zalo-service (tránh trùng)
            if (prev.some(m => m._fromDB)) return prev;
            return wsMsgs;
          });
        }
        if (msg.type === 'loading_status') {
          setMsgLoadingStatus(msg.step === 'done' ? null : { step: msg.step, text: msg.text });
        }
        if (msg.type === 'session_progress') {
          setSessionLoadHistory(prev => {
            if (prev.includes(msg.text)) return prev;
            return [...prev, msg.text];
          });
          setSessionLoadText(msg.text);
        }
        if (msg.type === 'new_message') {
          setMessages((prev) => {
            const exists = prev.some((m) => m.msgId && m.msgId === msg.data.msgId);
            if (exists) return prev;
            return [...prev, msg.data];
          });
        }
        if (msg.type === 'send_result') {
          setSending(false);
          if (!msg.ok) antMessage.error(`Gửi thất bại: ${msg.error}`);
        }
        if (msg.type === 'phonebook_notice') {
          antMessage.warning(msg.message, 5);
        }
        if (msg.type === 'my_info') {
          if (msg.data?.name) setMyInfo((prev) => ({ ...prev, ...msg.data }));
        }
        if (msg.type === 'bulk_send_started') {
          setBulkResults([]);
          setBulkRunning(true);
        }
        if (msg.type === 'bulk_progress') {
          if (msg.result) setBulkResults((prev) => [...prev, msg.result]);
        }
        if (msg.type === 'bulk_done') {
          setBulkRunning(false);
          if (msg.results) setBulkResults(msg.results);
          if (msg.error) antMessage.error(msg.error, 8);
        }
        if (msg.type === 'bulk_paused') {
          antMessage.info(msg.reason || 'Tạm dừng gửi tin', 5);
        }
        if (msg.type === 'friend_request_result') {
          setFriendReqLoading((prev) => {
            const n = { ...prev };
            delete n[msg.userId || msg.query || ''];
            delete n[msg.query || ''];
            return n;
          });
          if (msg.ok) antMessage.success(msg.message || 'Đã gửi lời mời kết bạn');
          else antMessage.error(msg.error || 'Không thể gửi lời mời kết bạn');
        }
        if (msg.type === 'new_message_notify') {
          const title = `💬 ${msg.contactName}`;
          const body = msg.preview?.slice(0, 80) || 'Tin nhắn mới';
          // Ant Design notification popup (hiện dù đang ở trang nào trong CRM)
          antMessage.open({ type: 'info', content: `${title}: ${body}`, duration: 6 });
          // Browser notification (hiện kể cả khi tab không được focus)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, tag: `zalo-${msg.contactId}` });
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connectWS, 3000);
    };
  }, []);

  // Fetch status ngay khi mount / đổi session — không phụ thuộc WS
  useEffect(() => {
    fetch(`${SERVICE_BASE}/status${qp}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status) setStatus(d.status);
        if (d.myUid) setMyInfo((prev) => ({ ...prev, uid: d.myUid }));
        if (d.name) setMyInfo((prev) => ({ ...prev, name: d.name }));
        if (d.phone) setMyInfo((prev) => ({ ...prev, phone: d.phone }));
      })
      .catch(() => {});
  }, [qp]);

  useEffect(() => {
    connectWS();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [connectWS]);

  // Xin quyền browser notification khi lần đầu vào trang
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Đọc danh sách CRM targets từ KhachHang (qua localStorage)
  useEffect(() => {
    const stored = localStorage.getItem('crm_bulk_targets');
    if (!stored) return;
    try {
      const { timestamp, groups, defaultSession } = JSON.parse(stored);
      if (Date.now() - timestamp > 10 * 60 * 1000) {
        localStorage.removeItem('crm_bulk_targets');
        return;
      }
      setCrmAllGroups(groups || {});
      setActiveTab('bulk');
      if (isAdmin && defaultSession && defaultSession !== ownSessionId) {
        setAdminViewSession(defaultSession);
      }
    } catch {}
    localStorage.removeItem('crm_bulk_targets');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Không auto-start — chỉ khởi động khi người dùng bấm nút Start

  // Khi admin đổi session → reconnect WS tới session mới
  const prevEffectiveRef = useRef(effectiveSessionId);
  useEffect(() => {
    if (prevEffectiveRef.current === effectiveSessionId) return;
    prevEffectiveRef.current = effectiveSessionId;
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    setTimeout(() => connectWS(), 80);
  }, [effectiveSessionId, connectWS]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (activeTab === 'phonebook' && isPhoneQuery(search)) {
      searchTimer.current = setTimeout(() => {
        setSearchResults([]);
        wsRef.current?.send(JSON.stringify({ type: 'search_contacts', query: search.trim() }));
      }, 600);
    } else {
      setSearchResults([]);
    }
    return () => clearTimeout(searchTimer.current);
  }, [search, activeTab]);

  // Timeout khi loading treo: hiện nút hủy sau 30s, tự chuyển error sau 90s
  useEffect(() => {
    if (status !== 'loading') {
      setLoadingLong(false);
      setReloadingPage(false);
      clearTimeout(loadingTimerRef.current);
      return;
    }
    setLoadingLong(false);
    const t1 = setTimeout(() => setLoadingLong(true), 30000);
    const t2 = setTimeout(() => setStatus('error'), 90000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [status]);

  const handleAdminSelect = (username) => {
    if (username === effectiveSessionId) return;
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null; // tắt handler để message cũ không override state mới
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('loading'); setQrData(null); setQrCanvas(null); setContacts([]); setPhonebook([]);
    setMessages([]); setActiveContact(null); setMyInfo({ name: null, phone: null, uid: null });
    setSearch(''); setSearchResults([]); setWsConnected(false);
    setSessionLoadText('Đang kết nối tài khoản mới...');
    setSessionLoadHistory([]);
    setAdminViewSession(username);
    setSearchParams({ session: username }, { replace: true });
  };

  const refreshQR = async () => {
    setQrData(null);
    await fetch(`${SERVICE_BASE}/refresh-qr${qp}`, { method: 'POST' }).catch(() => {});
  };

  const startService = () => {
    handleStartServer();
  };

  const resetState = () => {
    setQrData(null);
    setContacts([]);
    setPhonebook([]);
    setMessages([]);
    setActiveContact(null);
    setSearch('');
    setSearchResults([]);
    setMyInfo({ name: null, phone: null, uid: null });
  };

  const handleStartServer = async () => {
    setStatus('loading');
    try {
      await fetch(`${SERVICE_BASE}/start${qp}`, { method: 'POST' });
    } catch { /* ignore */ }
    setTimeout(() => connectWS(), 3000);
  };

  const handleZcaQrLogin = async () => {
    setStatus('waiting_qr');
    setQrData(null);
    setQrCanvas(null);
    // Lưu proxy vào localStorage
    try { localStorage.setItem(`zalo_proxy_${effectiveSessionId}`, proxyInput); } catch {}
    try {
      await fetch(`${SERVICE_BASE}/zca-qr-login${qp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxy: proxyInput.trim() || null }),
      });
    } catch { /* ignore */ }
  };

  // Dừng từ màn QR → về idle chờ kết nối
  const cancelService = async () => {
    await fetch(`${SERVICE_BASE}/stop${qp}`, { method: 'POST' }).catch(() => {});
    resetState();
    setStatus('idle');
  };

  // Đăng xuất Zalo — xóa session data, về màn hình idle chờ Start
  const stopService = async () => {
    await fetch(`${SERVICE_BASE}/logout${qp}`, { method: 'POST' }).catch(() => {});
    resetState();
    setStatus('idle');
  };

  const openContact = async (contact) => {
    setActiveContact(contact);
    setMessages([]);
    setMsgLoadingStatus(null);
    setInputText('');

    // Load tin nhắn từ Supabase trước (nhanh, hiển thị ngay)
    try {
      let convId = contact._convId;
      if (!convId) {
        const r = await api.get('/zalo-chat/conversation', {
          params: { session: effectiveSessionId, uid: contact.id }
        });
        convId = r.data?.conversationId;
      }
      if (convId) {
        const r2 = await api.get(`/zalo-chat/messages/${convId}`, { params: { size: 100 } });
        const dbMsgs = (r2.data?.content || []).map(m => ({
          id:        String(m.id),
          msgId:     String(m.id),
          content:   m.text || '',
          isSelf:    m.isSelf,
          timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
          type:      m.type,
          imageUrl:  m.imageUrl || null,
          callInfo:  m.callInfo || null,
          _fromDB:   true,
        }));
        if (dbMsgs.length > 0) setMessages(dbMsgs);
      }
    } catch {}

    // WS tiếp tục để nhận tin nhắn mới real-time
    wsRef.current?.send(JSON.stringify({ type: 'open_contact', id: contact.id, name: contact.name, phone: contact.phone }));
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sending || !activeContact) return;
    setSending(true);
    setInputText('');
    wsRef.current?.send(JSON.stringify({ type: 'send_message', text }));
    inputRef.current?.focus();
  };

  const handleRefreshPhonebook = () => {
    setPhonebookLoading(true);
    wsRef.current?.send(JSON.stringify({ type: 'refresh_phonebook' }));
  };

  const handleRefreshContacts = async () => {
    setContactsRefreshing(true);
    try {
      await fetch(`${SERVICE_BASE}/refresh-contacts${qp}`, { method: 'POST' });
    } catch {}
    setTimeout(() => setContactsRefreshing(false), 3000);
  };

  const handleReloadPage = async () => {
    setReloadingPage(true);
    setSessionLoadText('Đang tải lại Zalo Web...');
    setSessionLoadHistory([]);
    try {
      const res = await fetch(`${SERVICE_BASE}/reload-page${qp}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        antMessage.error(`Không thể tải lại: ${data.error || res.statusText}`);
        setReloadingPage(false);
      }
    } catch (e) {
      antMessage.error(`Lỗi kết nối: ${e.message}`);
      setReloadingPage(false);
    }
  };

  const resolveIsSelf = (msg) => {
    if (msg.isSelf !== null && msg.isSelf !== undefined) return msg.isSelf;
    if (myInfo.uid && msg.from) return msg.from === myInfo.uid;
    return false;
  };

  const handleLookup = () => {
    const q = lookupPhone.replace(/\s/g, '').trim();
    if (!q) return antMessage.warning('Nhập số điện thoại cần tra cứu');
    if (q.replace(/\D/g, '').length < 6) return antMessage.warning('Số điện thoại cần ít nhất 6 chữ số');

    setLookupLoading(true);
    setLookupResults(null);

    // Find in local phonebook (friends)
    const digits = q.replace(/\D/g, '');
    const inPhonebook = phonebook.filter((c) => {
      if (!c.phone) return false;
      return c.phone.replace(/\D/g, '').includes(digits) || digits.includes(c.phone.replace(/\D/g, ''));
    });

    // Check which phonebook matches also have conversations
    const contactIds = new Set(contacts.map((c) => c.id));
    const phonebookWithConv = inPhonebook.map((c) => ({
      ...c,
      hasConversation: contactIds.has(c.id),
    }));

    // Also search on Zalo via WS
    wsRef.current?.send(JSON.stringify({ type: 'search_contacts', query: q, _isLookup: true }));

    // Store local results immediately; Zalo search result will merge when it arrives
    setLookupResults({ phonebook: phonebookWithConv, zalo: [], query: q });
    // setLookupLoading will be cleared when search_results arrives
  };

  const handleSendFriendRequest = (query, userId) => {
    const key = userId || query;
    setFriendReqLoading((prev) => ({ ...prev, [key]: true }));
    wsRef.current?.send(JSON.stringify({ type: 'send_friend_request', query, userId }));
  };

  const handleSyncOpen = (sessionId, label) => {
    setSyncTarget({ sessionId: sessionId || effectiveSessionId, label: label || sessionId || effectiveSessionId });
  };

  const handleSyncClose = () => setSyncTarget(null);

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread || 0), 0);

  const filteredContacts = contacts.filter((c) =>
    !c.isGroup && c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPhonebook = phonebook.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(search.replace(/\D/g, ''));
  });

  const showPhoneResults =
    activeTab === 'phonebook' &&
    isPhoneQuery(search) &&
    (searchLoading || searchResults.length > 0);

  // Non-admin: ZCA mất kết nối → hiển thị màn hình đăng nhập lại
  const effectiveStatus = (!isAdmin && zcaDisconnected && status === 'logged_in') ? 'idle' : status;

  // ── IDLE (đã dừng thủ công hoặc ZCA mất kết nối với nhân viên) ──
  if (effectiveStatus === 'idle') {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="zalo-page">
          {isAdmin && <AdminZaloTabs selectedSession={effectiveSessionId} onSelect={handleAdminSelect} crmGroups={crmAllGroups} onSync={handleSyncOpen} />}
          <div className="zalo-start-screen">
            <div className="zalo-brand-icon">
              <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
                <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="white"/>
                <path d="M33 28.5c-.28-.14-1.63-.8-1.88-.9-.25-.1-.43-.14-.62.14-.18.28-.72.9-.88 1.08-.16.18-.33.2-.61.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.4-1.66-1.56-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.18-.28.28-.47.1-.2.05-.36-.02-.5-.07-.14-.62-1.5-.85-2.05-.22-.54-.45-.46-.62-.47-.16 0-.35-.02-.53-.02-.18 0-.48.07-.74.33-.25.27-.97.95-.97 2.32 0 1.37.99 2.7 1.13 2.88.14.18 1.96 2.99 4.75 4.2.66.28 1.18.45 1.58.58.66.21 1.27.18 1.74.11.53-.08 1.63-.67 1.86-1.3.23-.64.23-1.19.16-1.3-.07-.12-.26-.18-.54-.32z" fill="#0068FF"/>
              </svg>
            </div>
            <h2 style={{ marginBottom: 4 }}>Đăng nhập Zalo</h2>
            {zcaDisconnected && !isAdmin && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 12, color: '#DC2626', textAlign: 'center' }}>
                Kết nối Zalo bị gián đoạn — vui lòng đăng nhập lại
              </div>
            )}
            <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px', marginBottom: 20 }}>
              Tài khoản: <strong>{effectiveSessionId}</strong>
            </Tag>
            {/* Proxy input */}
            <div style={{ width: '100%', maxWidth: 320, marginBottom: 16 }}>
              <Input
                prefix={<span style={{ fontSize: 13 }}>🌐</span>}
                placeholder="Proxy: http://user:pass@ip:port (tuỳ chọn)"
                value={proxyInput}
                onChange={e => {
                  setProxyInput(e.target.value);
                  try { localStorage.setItem(`zalo_proxy_${effectiveSessionId}`, e.target.value); } catch {}
                }}
                style={{ fontSize: 12, borderRadius: 8 }}
                allowClear
              />
              {proxyInput && (
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, paddingLeft: 4 }}>
                  Tài khoản này sẽ kết nối qua proxy
                </div>
              )}
            </div>
            <Button
              type="primary"
              size="large"
              icon={<QrcodeOutlined />}
              onClick={handleZcaQrLogin}
              className="zalo-start-btn"
              style={{ background: '#0068FF', borderColor: '#0068FF' }}
            >
              Đăng nhập bằng QR
            </Button>
            <div className="zalo-start-hint">Mở Zalo mobile → Quét QR → Đăng nhập ngay</div>
            <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16, width: '100%', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Dùng Puppeteer (cũ): </span>
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={handleStartServer}
                style={{ fontSize: 11, color: '#9CA3AF', borderColor: '#E5E7EB' }}
              >
                Khởi động server ảo
              </Button>
            </div>
          </div>
        </motion.div>
        <ZaloSyncModal syncTarget={syncTarget} onClose={handleSyncClose} />
      </>
    );
  }

  // ── ERROR (service không chạy) ──
  if (status === 'error') {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="zalo-page">
          {isAdmin && <AdminZaloTabs selectedSession={effectiveSessionId} onSelect={handleAdminSelect} crmGroups={crmAllGroups} onSync={handleSyncOpen} />}
          <div className="zalo-start-screen">
            <div className="zalo-brand-icon" style={{ background: '#FEF2F2' }}>
              <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
                <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="#FCA5A5"/>
              </svg>
            </div>
            <h2 style={{ color: '#DC2626' }}>Không kết nối được</h2>
            <div className="zalo-error-hint">
              ⚠️ Không thể kết nối dịch vụ Zalo. Hãy chắc chắn <strong>zalo-service</strong> đang chạy trên máy chủ.
            </div>
            <Button type="primary" danger size="large" icon={<ReloadOutlined />} onClick={startService} className="zalo-start-btn">
              Thử lại
            </Button>
            <div className="zalo-start-hint">Chạy lệnh: <code>cd zalo-service &amp;&amp; node server.js</code></div>
          </div>
        </motion.div>
        <ZaloSyncModal syncTarget={syncTarget} onClose={handleSyncClose} />
      </>
    );
  }

  // ── LOADING ──
  if (status === 'loading') {
    return (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="zalo-page">
          {isAdmin && <AdminZaloTabs selectedSession={effectiveSessionId} onSelect={handleAdminSelect} crmGroups={crmAllGroups} onSync={handleSyncOpen} />}
          <div className="zalo-start-screen">
            <Spin size="large" />
            <h3 style={{ marginTop: 20, color: '#0068FF', marginBottom: 4 }}>{sessionLoadText}</h3>
            <p style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>Lần đầu có thể mất 30–60 giây</p>
            {sessionLoadHistory.length > 0 && (
              <div style={{
                background: '#f0f6ff',
                border: '1px solid #d0e4ff',
                borderRadius: 8,
                padding: '10px 14px',
                width: 280,
                textAlign: 'left',
              }}>
                {sessionLoadHistory.map((label, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: '#10B981',
                    marginBottom: i < sessionLoadHistory.length - 1 ? 6 : 0,
                  }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>✓</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
            {loadingLong && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <p style={{ color: '#F59E0B', fontSize: 13, margin: 0 }}>
                  ⚠️ Đang mất nhiều thời gian hơn dự kiến...
                </p>
                <Button
                  danger
                  icon={<PoweroffOutlined />}
                  onClick={() => {
                    fetch(`${SERVICE_BASE}/stop${qp}`, { method: 'POST' }).catch(() => {});
                    setStatus('error');
                  }}
                >
                  Hủy và thử lại
                </Button>
              </div>
            )}
          </div>
        </motion.div>
        <ZaloSyncModal syncTarget={syncTarget} onClose={handleSyncClose} />
      </>
    );
  }

  // ── QR ──
  if (status === 'waiting_qr') {
    return (
      <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="zalo-page">
        {isAdmin && <AdminZaloTabs selectedSession={effectiveSessionId} onSelect={handleAdminSelect} crmGroups={crmAllGroups} onSync={handleSyncOpen} />}
        <div className="zalo-qr-page">
          <div className="zalo-qr-card2">

            {/* Card header */}
            <div className="zalo-qr2-header">
              <div className="zalo-qr2-brand">
                <div className="zalo-qr2-logo">
                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                    <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="white"/>
                  </svg>
                </div>
                <div>
                  <div className="zalo-qr2-title">Đăng nhập Zalo</div>
                  <div className="zalo-qr2-sub">
                    Tài khoản: <strong>{effectiveSessionId}</strong>
                  </div>
                </div>
              </div>
              <Button size="small" danger icon={<PoweroffOutlined />} onClick={cancelService} style={{ flexShrink: 0 }}>
                Dừng
              </Button>
            </div>

            {/* QR area */}
            <div className="zalo-qr2-body">
              {(qrCanvas || qrData) ? (
                <div className="zalo-qr2-frame">
                  {/* qrCanvas = vẽ lại từ text (sắc nét, luôn hợp lệ); fallback sang ảnh VPS */}
                  <img src={qrCanvas || qrData} alt="Zalo QR Code" className="zalo-qr2-img" />
                </div>
              ) : (
                <div className="zalo-qr2-loading">
                  <Spin size="large" />
                  <span>Đang tải mã QR...</span>
                </div>
              )}
              <p className="zalo-qr2-hint">
                Quét mã QR bằng Zalo trên điện thoại
              </p>
              <Button
                icon={<ReloadOutlined />}
                onClick={refreshQR}
                size="small"
                style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}
              >
                Mã bị lỗi? Lấy mã mới
              </Button>

              {/* Các cách đăng nhập thay thế */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 8px', fontWeight: 600 }}>
                  Không quét được mã QR? Chọn cách khác:
                </p>

                {/* Cách 1: Extension Chrome (KHUYÊN DÙNG) */}
                <div style={{
                  background: '#f0f7ff', border: '1px solid #bdd7ff', borderRadius: 8,
                  padding: '10px 12px', marginBottom: 8
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0052cc', margin: '0 0 4px' }}>
                    ⭐ Cách 1: Dùng Extension Chrome (dễ nhất)
                  </p>
                  <p style={{ fontSize: 11, color: '#444', margin: '0 0 6px', lineHeight: 1.5 }}>
                    1. Cài extension <b>"Zalo CRM"</b> vào Chrome (tải từ IT/Admin)<br/>
                    2. Mở <b>chat.zalo.me</b> → quét QR bằng điện thoại như bình thường<br/>
                    3. Click icon extension → nhập <b>{effectiveSessionId}</b> → nhấn <b>Xuất session</b>
                  </p>
                  <p style={{ fontSize: 10, color: '#888', margin: 0 }}>
                    Session ID của bạn: <b style={{ color: '#0052cc' }}>{effectiveSessionId}</b>
                  </p>
                </div>

                {/* Cách 2: noVNC */}
                <div style={{
                  background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 8,
                  padding: '10px 12px', marginBottom: 8
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#555', margin: '0 0 6px' }}>
                    🖥️ Cách 2: Trình duyệt ảo trên VPS
                  </p>
                  <Button
                    size="small"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      const url = `${SERVICE_BASE}/vnc-login?session=${encodeURIComponent(effectiveSessionId)}`;
                      window.open(url, '_blank', 'width=560,height=460,noopener');
                    }}
                  >
                    Mở trình duyệt ảo & quét QR
                  </Button>
                </div>

                {/* Cách 3: Xem lại hướng dẫn */}
                <div style={{
                  background: '#f0fff4', border: '1px solid #bbf7d0', borderRadius: 8,
                  padding: '10px 12px'
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: '0 0 4px' }}>
                    ❓ Cần trợ giúp?
                  </p>
                  <Button
                    size="small"
                    icon={<SyncOutlined />}
                    style={{ fontSize: 12, color: '#059669', borderColor: '#059669' }}
                    onClick={() => handleSyncOpen(effectiveSessionId, effectiveSessionId)}
                  >
                    Xem hướng dẫn đăng nhập
                  </Button>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="zalo-qr2-steps">
              {[
                { n: 1, text: 'Mở Zalo\nđiện thoại' },
                { n: 2, text: 'Nhấn icon QR\ngóc trên phải' },
                { n: 3, text: 'Quét mã QR\nnày' },
                { n: 4, text: 'Xác nhận\nđăng nhập' },
              ].map((s, i, arr) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="zalo-qr2-step">
                    <div className="zalo-qr2-step-num">{s.n}</div>
                    <span className="zalo-qr2-step-text">{s.text}</span>
                  </div>
                  {i < arr.length - 1 && <span className="zalo-qr2-arrow">›</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      <ZaloSyncModal syncTarget={syncTarget} onClose={handleSyncClose} />
      </>
    );
  }

  // ── LOGGED IN ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="zalo-page">
      {isAdmin && <AdminZaloTabs selectedSession={effectiveSessionId} onSelect={handleAdminSelect} crmGroups={crmAllGroups} onSync={handleSyncOpen} />}
      <div className="zalo-chat-layout">

        {/* ── Sidebar ── */}
        <div className="zalo-sidebar" style={{ width: sidebarWidth, minWidth: 240 }}>

          {/* Header row — account info + controls */}
          <div className="zalo-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <div className="zalo-brand-small">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="#0068FF"/>
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {myInfo.name ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {myInfo.name}
                    </div>
                    {myInfo.phone && (
                      <div style={{ fontSize: 11, color: '#0068FF', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <PhoneOutlined style={{ fontSize: 10 }} />
                        {myInfo.phone}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>Đang tải...</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {zcaDisconnected && (
                <Tooltip title="zca-js mất kết nối với Zalo — tin nhắn có thể bị trễ. Đang tự động thử lại...">
                  <Tag icon={<DisconnectOutlined />} color="error" style={{ margin: 0, cursor: 'default', fontSize: 11, animation: 'pulse-red 2s infinite' }}>
                    Mất kết nối Zalo
                  </Tag>
                </Tooltip>
              )}
              {sessionProxy && (
                <Tooltip title={`Proxy: ${sessionProxy}`}>
                  <Tag
                    style={{ margin: 0, cursor: 'default', fontSize: 11, background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8' }}
                  >
                    🌐 {sessionProxy}
                  </Tag>
                </Tooltip>
              )}
              <Tooltip title={wsConnected ? 'Đang kết nối' : 'Mất kết nối'}>
                <Tag
                  icon={wsConnected ? <WifiOutlined /> : <DisconnectOutlined />}
                  color={wsConnected ? 'success' : 'error'}
                  style={{ margin: 0, cursor: 'default', fontSize: 11 }}
                >
                  {wsConnected ? 'Online' : 'Offline'}
                </Tag>
              </Tooltip>
              <Tooltip title="Tải lại trang Zalo">
                <Button
                  size="small"
                  icon={<SyncOutlined spin={reloadingPage} />}
                  style={{ color: '#0068FF', borderColor: '#0068FF' }}
                  loading={reloadingPage}
                  onClick={handleReloadPage}
                />
              </Tooltip>
              <Tooltip title={isAdmin ? 'Đăng xuất Zalo' : 'Chỉ quản trị viên mới có thể đăng xuất'}>
                <Button size="small" danger icon={<PoweroffOutlined />} onClick={stopService} disabled={!isAdmin} />
              </Tooltip>
            </div>
          </div>

          {/* Tabs: Danh bạ / Tin nhắn / Tra cứu SĐT / Gửi hàng loạt */}
          <div className="zalo-tabs">
            <button
              className={`zalo-tab ${activeTab === 'phonebook' ? 'active' : ''}`}
              onClick={() => { setActiveTab('phonebook'); setSearch(''); setSearchResults([]); }}
            >
              <TeamOutlined style={{ marginRight: 4 }} />
              Danh bạ
              {phonebook.length > 0 && (
                <span className="zalo-tab-count">{phonebook.length}</span>
              )}
            </button>
            <button
              className={`zalo-tab ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => { setActiveTab('messages'); setSearch(''); setSearchResults([]); }}
            >
              <MessageOutlined style={{ marginRight: 4 }} />
              Tin nhắn
              {totalUnread > 0 ? (
                <span className="zalo-tab-count" style={{ background: '#EF4444', color: '#fff', minWidth: 18, borderRadius: 9, padding: '0 5px', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                  {totalUnread}
                </span>
              ) : contacts.length > 0 ? (
                <span className="zalo-tab-count">{contacts.length}</span>
              ) : null}
            </button>
            <button
              className={`zalo-tab ${activeTab === 'lookup' ? 'active' : ''}`}
              onClick={() => { setActiveTab('lookup'); setSearch(''); setSearchResults([]); }}
              style={{ fontSize: 11 }}
            >
              <PhoneOutlined style={{ marginRight: 4 }} />
              Tra cứu SĐT
            </button>
            <button
              className={`zalo-tab ${activeTab === 'bulk' ? 'active' : ''}`}
              onClick={() => { setActiveTab('bulk'); setSearch(''); setSearchResults([]); }}
              style={{ fontSize: 11 }}
            >
              <BulbOutlined style={{ marginRight: 4 }} />
              Gửi hàng loạt
            </button>
          </div>

          {/* Search bar — hidden in bulk and lookup tabs */}
          {activeTab !== 'bulk' && activeTab !== 'lookup' && (
            <div className="zalo-search-wrap">
              <Input
                prefix={
                  searchLoading
                    ? <Spin size="small" style={{ fontSize: 12 }} />
                    : <SearchOutlined style={{ color: '#94A3B8' }} />
                }
                placeholder={
                  activeTab === 'phonebook'
                    ? 'Tìm tên hoặc số điện thoại...'
                    : 'Tìm kiếm...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                size="small"
                variant="filled"
              />
              {activeTab === 'phonebook' && search && isPhoneQuery(search) && (
                <div className="zalo-search-hint">
                  <PhoneOutlined style={{ fontSize: 11 }} /> Đang tìm SĐT trên Zalo...
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Tin nhắn ── */}
          {activeTab === 'messages' && (
            <div className="zalo-contact-list">
              <div className="zalo-phonebook-toolbar">
                <span style={{ color: '#6B7280', fontSize: 12 }}>
                  {contacts.length > 0 ? `${contacts.length} hội thoại` : 'Chưa có hội thoại'}
                </span>
                <Button size="small" icon={<ReloadOutlined />} loading={contactsRefreshing} onClick={handleRefreshContacts}>
                  Làm mới
                </Button>
              </div>
              {contacts.length === 0 ? (
                <div className="zalo-empty-contacts">
                  <Spin size="small" style={{ marginBottom: 8 }} />
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Đang tải tin nhắn...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="zalo-empty-contacts">
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Không tìm thấy</p>
                </div>
              ) : (
                filteredContacts.map((c) => (
                  <div
                    key={c.id}
                    className={`zalo-contact-item ${activeContact?.id === c.id ? 'active' : ''}`}
                    onClick={() => openContact(c)}
                    style={c.unread > 0 && activeContact?.id !== c.id ? { background: '#EFF6FF', borderLeft: '3px solid #0068FF' } : {}}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <ZaloAvatar name={c.name} src={c.avatar} size={42} />
                      {c.unread > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4,
                          background: '#EF4444', color: '#fff',
                          borderRadius: '50%', minWidth: 18, height: 18,
                          fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 3px', border: '2px solid #fff', zIndex: 1,
                        }}>
                          {c.unread > 99 ? '99+' : c.unread}
                        </span>
                      )}
                    </div>
                    <div className="zalo-contact-info">
                      <div className="zalo-contact-name" style={{ fontWeight: c.unread > 0 ? 700 : 500 }}>
                        {c.name}
                      </div>
                      <div className="zalo-contact-last" style={{ fontWeight: c.unread > 0 ? 600 : 400, color: c.unread > 0 ? '#059669' : undefined }}>
                        {(typeof c.lastMsg === 'string' ? c.lastMsg : '') || '—'}
                      </div>
                    </div>
                    <div className="zalo-contact-time">{formatTime(c.time)}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Danh bạ ── */}
          {activeTab === 'phonebook' && (
            <div className="zalo-contact-list">
              <div className="zalo-phonebook-toolbar">
                <span style={{ color: '#6B7280', fontSize: 12 }}>
                  {phonebook.length > 0 ? `${phonebook.length} bạn bè` : (phonebookLoading ? 'Đang tải...' : 'Chưa có dữ liệu')}
                </span>
                <Button size="small" icon={<ReloadOutlined />} loading={phonebookLoading} onClick={handleRefreshPhonebook}>
                  Làm mới
                </Button>
              </div>

              {showPhoneResults && (
                <div className="zalo-search-section">
                  <div className="zalo-section-label">
                    <PhoneOutlined /> Kết quả tìm SĐT &ldquo;{search}&rdquo;
                  </div>
                  {searchLoading ? (
                    <div className="zalo-empty-contacts">
                      <Spin size="small" />
                      <p style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>Đang tìm trên Zalo...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="zalo-empty-contacts">
                      <p style={{ color: '#9CA3AF', fontSize: 13 }}>Không tìm thấy số &ldquo;{search}&rdquo;</p>
                    </div>
                  ) : (
                    searchResults.map((c, i) => (
                      <div
                        key={c.id || i}
                        className={`zalo-contact-item ${activeContact?.id === c.id ? 'active' : ''}`}
                        onClick={() => openContact(c)}
                      >
                        <ZaloAvatar name={c.name} src={c.avatar} size={42} />
                        <div className="zalo-contact-info">
                          <div className="zalo-contact-name">{c.name}</div>
                          {c.phone && (
                            <div className="zalo-contact-phone">
                              <PhoneOutlined style={{ fontSize: 11, marginRight: 4 }} />{c.phone}
                            </div>
                          )}
                        </div>
                        <Tag color="blue" style={{ fontSize: 10, flexShrink: 0 }}>Zalo</Tag>
                      </div>
                    ))
                  )}
                  <div className="zalo-section-divider" />
                </div>
              )}

              {phonebook.length === 0 ? (
                <div className="zalo-empty-contacts">
                  {phonebookLoading
                    ? <><Spin size="small" style={{ marginBottom: 8 }} /><p style={{ color: '#9CA3AF', fontSize: 13 }}>Đang tải danh bạ...</p></>
                    : <p style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có dữ liệu danh bạ</p>
                  }
                </div>
              ) : filteredPhonebook.length === 0 && !showPhoneResults ? (
                <div className="zalo-empty-contacts">
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Không tìm thấy &ldquo;{search}&rdquo;</p>
                </div>
              ) : (
                <>
                  {filteredPhonebook.length > 0 && (
                    <div className="zalo-section-label" style={{ marginTop: showPhoneResults ? 0 : 4 }}>
                      <TeamOutlined /> Danh bạ
                      {search && <span style={{ color: '#9CA3AF', marginLeft: 4 }}>({filteredPhonebook.length})</span>}
                    </div>
                  )}
                  {filteredPhonebook.map((c) => (
                    <div
                      key={c.id}
                      className={`zalo-contact-item ${activeContact?.id === c.id ? 'active' : ''}`}
                      onClick={() => openContact(c)}
                    >
                      <ZaloAvatar name={c.name} src={c.avatar} size={42} />
                      <div className="zalo-contact-info">
                        <div className="zalo-contact-name">{c.name}</div>
                        {c.phone ? (
                          <div className="zalo-contact-phone">
                            <PhoneOutlined style={{ fontSize: 11, marginRight: 4 }} />{c.phone}
                          </div>
                        ) : (
                          <div className="zalo-contact-last" style={{ color: '#16a34a' }}>
                            {c.displayName || ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Tab: Tra cứu SĐT ── */}
          {activeTab === 'lookup' && (
            <div className="zalo-contact-list">
              <div style={{ padding: '10px 12px 6px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <Input
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    onPressEnter={handleLookup}
                    prefix={<PhoneOutlined style={{ color: '#94A3B8' }} />}
                    size="small"
                    variant="filled"
                    allowClear
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleLookup}
                    loading={lookupLoading}
                    style={{ flexShrink: 0 }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>
                  Tìm bạn bè, tìm khách đã nhắn tin, hoặc gửi lời mời kết bạn
                </div>
              </div>

              {lookupLoading && (
                <div className="zalo-empty-contacts">
                  <Spin size="small" style={{ marginBottom: 8 }} />
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Đang tìm kiếm trên Zalo...</p>
                </div>
              )}

              {lookupResults !== null && !lookupLoading && (
                <>
                  {/* ── Trong danh bạ ── */}
                  {lookupResults.phonebook.length > 0 && (
                    <>
                      <div className="zalo-section-label">
                        <TeamOutlined /> Trong danh bạ ({lookupResults.phonebook.length})
                      </div>
                      {lookupResults.phonebook.map((c) => (
                        <div key={c.id} style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ZaloAvatar name={c.name} src={c.avatar} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>{c.phone}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                            {c.hasConversation ? (
                              <Tag color="green" style={{ margin: 0, fontSize: 10, cursor: 'pointer' }}
                                onClick={() => { openContact(c); setActiveTab('messages'); }}>
                                Xem tin nhắn
                              </Tag>
                            ) : (
                              <Button size="small" type="primary" style={{ fontSize: 11, height: 22, padding: '0 6px' }}
                                onClick={() => { openContact(c); setActiveTab('messages'); }}>
                                Nhắn tin
                              </Button>
                            )}
                            <Tag color="blue" style={{ margin: 0, fontSize: 10, textAlign: 'center' }}>Bạn bè</Tag>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* ── Kết quả tìm trên Zalo ── */}
                  {lookupResults.zalo.length > 0 && (
                    <>
                      <div className="zalo-section-label" style={{ marginTop: lookupResults.phonebook.length > 0 ? 4 : 0 }}>
                        <SearchOutlined /> Tìm thấy trên Zalo ({lookupResults.zalo.length})
                      </div>
                      {lookupResults.zalo.map((c, i) => {
                        const reqKey = c.id || c.name || lookupResults.query;
                        const alreadyFriend = phonebook.some((p) => p.id === c.id);
                        return (
                          <div key={c.id || i} style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ZaloAvatar name={c.name} src={c.avatar} size={36} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                              {c.phone && <div style={{ fontSize: 11, color: '#6B7280' }}>{c.phone}</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                              <Button size="small" type="primary" style={{ fontSize: 11, height: 22, padding: '0 6px' }}
                                onClick={() => { openContact(c); setActiveTab('messages'); }}>
                                Nhắn tin
                              </Button>
                              {!alreadyFriend && (
                                <Button
                                  size="small"
                                  loading={!!friendReqLoading[reqKey]}
                                  style={{ fontSize: 11, height: 22, padding: '0 6px' }}
                                  onClick={() => handleSendFriendRequest(lookupResults.query, c.id)}
                                >
                                  Kết bạn
                                </Button>
                              )}
                              {alreadyFriend && (
                                <Tag color="blue" style={{ margin: 0, fontSize: 10, textAlign: 'center' }}>Bạn bè</Tag>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {lookupResults.phonebook.length === 0 && lookupResults.zalo.length === 0 && (
                    <div className="zalo-empty-contacts">
                      <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '0 16px' }}>
                        Không tìm thấy người dùng với số <strong>{lookupResults.query}</strong>
                      </p>
                    </div>
                  )}
                </>
              )}

              {lookupResults === null && !lookupLoading && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                  <PhoneOutlined style={{ fontSize: 28, color: '#BFDBFE', display: 'block', marginBottom: 8 }} />
                  Nhập SĐT và nhấn tìm kiếm để tra cứu khách hàng hoặc kết bạn mới
                </div>
              )}
            </div>
          )}

          {/* Bulk tab: sidebar is hidden, show placeholder */}
          {activeTab === 'bulk' && (
            <div style={{ padding: '12px', color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              <BulbOutlined style={{ fontSize: 24, color: '#BFDBFE', display: 'block', marginBottom: 8 }} />
              Chọn tab để xem danh bạ hoặc tin nhắn
            </div>
          )}
        </div>

        {/* ── Sidebar resize handle ── */}
        <div className="zb-resize-handle" onMouseDown={handleSidebarResizeStart} />

        {/* ── Main area ── */}
        {/* BulkSend is always mounted (display:none when inactive) to preserve selected/template state */}
        <div style={{ display: activeTab === 'bulk' ? 'contents' : 'none' }}>
          <BulkSend
            phonebook={phonebook}
            wsRef={wsRef}
            onRefreshPhonebook={handleRefreshPhonebook}
            phonebookLoading={phonebookLoading}
            bulkResults={bulkResults}
            bulkRunning={bulkRunning}
            onBulkStart={() => { setBulkResults([]); setBulkRunning(true); }}
            crmTargets={crmAllGroups[effectiveSessionId] || []}
            onClearCrm={() => setCrmAllGroups(prev => { const n = { ...prev }; delete n[effectiveSessionId]; return n; })}
            zcaDisconnected={zcaDisconnected}
          />
        </div>
        {/* ── Chat area ── */}
        <div className="zalo-chat-area" style={{ display: activeTab !== 'bulk' ? undefined : 'none' }}>
            {!activeContact ? (
              <div className="zalo-no-chat">
                <MessageOutlined style={{ fontSize: 48, color: '#BFDBFE' }} />
                <h3 style={{ color: '#374151', marginTop: 16 }}>Chọn một cuộc trò chuyện</h3>
                <p style={{ color: '#9CA3AF' }}>
                  {activeTab === 'lookup'
                    ? 'Nhấn "Nhắn tin" hoặc "Xem tin nhắn" ở kết quả tìm kiếm'
                    : 'Nhấn vào liên hệ bên trái để xem tin nhắn'}
                </p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="zalo-chat-header">
                  <ZaloAvatar name={activeContact.name} src={activeContact.avatar} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1F2937' }}>{activeContact.name}</div>
                    {activeContact.phone ? (
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        <PhoneOutlined style={{ marginRight: 4 }} />{activeContact.phone}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#6B7280' }}>ID: {activeContact.id}</div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="zalo-messages">
                  {messages.length === 0 && (
                    <div className="zalo-no-messages">
                      <Spin size="small" />
                      <span style={{ marginLeft: 8, color: '#9CA3AF' }}>
                        {msgLoadingStatus?.text || 'Đang tải tin nhắn...'}
                      </span>
                    </div>
                  )}
                  {messages.length > 0 && msgLoadingStatus && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', background: '#f0f9ff',
                      borderBottom: '1px solid #bae6fd', fontSize: 12, color: '#0369a1' }}>
                      <Spin size="small" />
                      <span>{msgLoadingStatus.text}</span>
                    </div>
                  )}
                  {messages.map((m, i) => {
                      const isSelf = resolveIsSelf(m);
                      return (
                        <div key={m.msgId || i} className={`zalo-msg-row ${isSelf ? 'self' : 'other'}`}>
                          {!isSelf && (
                            <ZaloAvatar name={activeContact.name} src={activeContact.avatar} size={28} />
                          )}
                          <MsgErrorBoundary key={`eb-${m.msgId || i}`}>
                          <div className={`zalo-msg-bubble ${isSelf ? 'self' : 'other'}`}>
                            {(() => {
                              const mediaUrl = m.fileUrl || m.imageUrl || m.images?.[0]?.url || null;
                              const mType = m.type || m.msgType || '';

                              // Tin nhắn thoại
                              if (mType === 'audio' || mType === 'chat.voice') {
                                return mediaUrl ? (
                                  <audio controls style={{ maxWidth: 240, height: 40, display: 'block', borderRadius: 6 }}>
                                    <source src={mediaUrl} type="audio/mpeg" />
                                    <source src={mediaUrl} type="audio/mp4" />
                                    <source src={mediaUrl} type="audio/ogg" />
                                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0068FF' }}>🎵 Tin nhắn thoại</a>
                                  </audio>
                                ) : <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>🎵 Tin nhắn thoại</div>;
                              }

                              // Tin nhắn video
                              if (mType === 'video' || mType === 'chat.video.msg' || mType === 'chat.video') {
                                if (!mediaUrl) return <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>📹 Video</div>;
                                return (
                                  <div>
                                    <video
                                      controls
                                      style={{ maxWidth: 380, maxHeight: 280, borderRadius: 8, display: 'block', background: '#000' }}
                                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline'; }}
                                    >
                                      <source src={mediaUrl} type="video/mp4" />
                                    </video>
                                    <a
                                      href={mediaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: 12, color: '#0068FF', display: 'none' }}
                                    >
                                      📹 Mở video
                                    </a>
                                  </div>
                                );
                              }

                              // Ảnh
                              if (!mediaUrl) return null;
                              const isAudioVideoType = mType === 'audio' || mType === 'video' || mType === 'chat.voice' || mType === 'chat.video.msg';
                              if (isAudioVideoType) return null;
                              return (
                                <img
                                  src={mediaUrl}
                                  alt="Hình ảnh"
                                  style={{ maxWidth: 220, maxHeight: 300, borderRadius: 8, display: 'block', marginBottom: m.content ? 4 : 0, cursor: 'pointer' }}
                                  onClick={() => {
                                    if (mediaUrl.startsWith('data:')) {
                                      const win = window.open('about:blank', '_blank');
                                      if (win) {
                                        win.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${mediaUrl}" style="max-width:100%;max-height:100vh;object-fit:contain"></body></html>`);
                                        win.document.close();
                                      }
                                    } else {
                                      window.open(mediaUrl, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              );
                            })()}
                            {m.content && m.msgType !== 'image' && m.type !== 'image' && (() => {
                              const mType = m.type || m.msgType || '';
                              if (mType === 'audio' || mType === 'chat.voice' || mType === 'video' || mType === 'chat.video.msg') return null;
                              const special = parseCallSticker(m.content);
                              if (special) return <SpecialMsgContent content={m.content} />;
                              const txt = typeof m.content === 'string' ? m.content : null;
                              return txt ? <div className="zalo-msg-content">{txt}</div> : null;
                            })()}
                            <span className="zalo-msg-time">{formatTime(m.time)}</span>
                          </div>
                          </MsgErrorBoundary>
                        </div>
                      );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="zalo-input-bar">
                  <Input
                    ref={inputRef}
                    placeholder="Nhập tin nhắn..."
                    variant="filled"
                    style={{ flex: 1 }}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPressEnter={handleSend}
                    disabled={sending || !wsConnected}
                    suffix={
                      <Tooltip title="Gửi (Enter)">
                        <SendOutlined
                          onClick={handleSend}
                          style={{
                            color: inputText.trim() && wsConnected ? '#0068FF' : '#D1D5DB',
                            cursor: inputText.trim() && wsConnected ? 'pointer' : 'default',
                            fontSize: 16,
                          }}
                        />
                      </Tooltip>
                    }
                  />
                </div>
              </>
            )}
          </div>
      </div>    {/* zalo-chat-layout */}

      <ZaloSyncModal syncTarget={syncTarget} onClose={handleSyncClose} />
    </motion.div>
  );
}
