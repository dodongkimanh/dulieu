import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Badge, Input, Spin, Avatar, Tooltip, Tag, Select,
  message as antMessage, Button,
} from 'antd';
import {
  SearchOutlined, MessageOutlined, PhoneOutlined, VideoCameraOutlined,
  ReloadOutlined, SendOutlined, WifiOutlined, DisconnectOutlined,
  PhoneFilled, VideoCameraFilled,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { authApi } from '../api';

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

// Zalo service có thể trả time=0 hoặc là chuỗi tương đối trong lastMsg ("8 phút", "3 giờ").
// Hàm này trả về timestamp tuyệt đối (giây) để sort đúng — mới nhất = số lớn nhất.
function parseContactTime(c) {
  const t = c.time;
  if (typeof t === 'number' && t > 1000000000) return t > 1e12 ? Math.floor(t / 1000) : t;
  const now = Math.floor(Date.now() / 1000);
  const s = String(c.timeStr || c.lastMsg || '').trim();
  const m = s.match(/^(\d+)\s*(giây|phút|giờ|ngày|tuần|tháng|năm)/i);
  if (m) {
    const n = parseInt(m[1]);
    const units = { giây: 1, phút: 60, giờ: 3600, ngày: 86400, tuần: 604800, tháng: 2592000, năm: 31536000 };
    const unit = m[2].toLowerCase();
    return now - n * (units[unit] || 0);
  }
  return 0;
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

function SessionStatusStrip({ sessionPills, sessionContacts }) {
  if (sessionPills.length === 0) return null;
  const statusClass = (s) =>
    s === 'logged_in' ? 'online' : s === 'waiting_qr' || s === 'loading' ? 'waiting' : 'offline';
  const statusText = (s) =>
    s === 'logged_in' ? 'Online' : s === 'waiting_qr' ? 'Chờ QR' : s === 'loading' ? 'Đang tải' : 'Offline';

  return (
    <div className="zadmin-strip">
      {sessionPills.map((u) => {
        const sc = statusClass(u.status);
        const count = (sessionContacts[u.username] || []).length;
        return (
          <div key={u.username} className={`zadmin-pill ${sc}`} style={{ cursor: 'default' }}>
            <span className="zadmin-pill-dot" />
            <span className="zadmin-pill-name">{u.label}</span>
            {count > 0 && <span className="zadmin-pill-badge">{count}</span>}
            <span className="zadmin-pill-status">{statusText(u.status)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CallBubble({ callInfo }) {
  const isVideo = callInfo.type === 'video_call';
  const isMissed = callInfo.direction === 'missed';
  const isIncoming = callInfo.direction === 'incoming';

  const dirLabel = isMissed ? 'nhỡ' : isIncoming ? 'đến' : 'đi';
  const typeLabel = isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
  const iconColor = isMissed ? '#ef4444' : isIncoming ? '#22c55e' : '#3b82f6';
  const bgColor = isMissed ? '#fef2f2' : isIncoming ? '#f0fdf4' : '#eff6ff';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, padding: '2px 0' }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: bgColor, border: `1.5px solid ${iconColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {isVideo
          ? <VideoCameraFilled style={{ color: iconColor, fontSize: 17 }} />
          : <PhoneFilled style={{ color: iconColor, fontSize: 17 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: isMissed ? '#ef4444' : '#1f2937', lineHeight: 1.3 }}>
          {typeLabel} {dirLabel}
        </div>
        {callInfo.duration && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
            ▶ {callInfo.duration}
          </div>
        )}
        {callInfo.hasCallBack && (
          <div style={{
            marginTop: 5, display: 'inline-block',
            fontSize: 11, fontWeight: 700, color: '#0068ff',
            border: '1px solid #0068ff', borderRadius: 12,
            padding: '2px 10px', cursor: 'default',
          }}>
            GỌI LẠI
          </div>
        )}
      </div>
    </div>
  );
}

export default function TinNhanTongHop() {
  const [crmUsers, setCrmUsers] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [sessionContacts, setSessionContacts] = useState({});
  const [sessionConnected, setSessionConnected] = useState({});
  const [sessionMyInfo, setSessionMyInfo] = useState({});
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSession, setFilterSession] = useState('all');

  const wsRefs = useRef({});
  const reconnectTimers = useRef({});
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const activeConvRef = useRef(activeConv);
  activeConvRef.current = activeConv;

  useEffect(() => {
    authApi.getUsers().then((r) => setCrmUsers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const poll = () => {
      fetch(`${SERVICE_BASE}/sessions`)
        .then((r) => r.json())
        .then((d) => setLiveSessions(Array.isArray(d) ? d : []))
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  const connectSession = useCallback((username) => {
    if (wsRefs.current[username]?.readyState === WebSocket.OPEN) return;
    clearTimeout(reconnectTimers.current[username]);

    const ws = new WebSocket(`${WS_BASE}?session=${encodeURIComponent(username)}`);
    wsRefs.current[username] = ws;

    ws.onopen = () => {
      setSessionConnected((prev) => ({ ...prev, [username]: true }));
      ws.send(JSON.stringify({ type: 'get_my_info' }));
      ws.send(JSON.stringify({ type: 'get_messages' }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'contacts') {
          setSessionContacts((prev) => ({ ...prev, [username]: msg.data || [] }));
        }

        if (msg.type === 'my_info' && msg.data?.name) {
          setSessionMyInfo((prev) => ({ ...prev, [username]: msg.data }));
        }

        if (msg.type === 'new_message' && msg.data) {
          setSessionContacts((prev) => {
            const contacts = prev[username] || [];
            const exists = contacts.some((c) => c.id === msg.data.from);
            const updated = exists
              ? contacts.map((c) =>
                  c.id === msg.data.from
                    ? { ...c, unread: (c.unread || 0) + 1, lastMsg: msg.data.content, time: msg.data.time }
                    : c
                )
              : contacts;
            return { ...prev, [username]: updated };
          });
          const conv = activeConvRef.current;
          if (conv?.sessionId === username && conv?.contact?.id === msg.data.from) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.msgId && m.msgId === msg.data.msgId);
              return exists ? prev : [...prev, msg.data];
            });
          }
        }

        if (msg.type === 'messages') {
          const conv = activeConvRef.current;
          if (conv?.sessionId === username) {
            setMessages(msg.data || []);
            if (msg.final) setLoadingMessages(false);
          }
        }

        if (msg.type === 'new_message_notify') {
          setSessionContacts((prev) => {
            const contacts = prev[username] || [];
            const exists = contacts.some((c) => c.id === msg.contactId || c.name === msg.contactName);
            if (!exists) return prev;
            const updated = contacts.map((c) =>
              c.id === msg.contactId || c.name === msg.contactName
                ? { ...c, unread: msg.unread ?? (c.unread || 0) + 1, lastMsg: msg.preview ?? c.lastMsg }
                : c
            );
            return { ...prev, [username]: updated };
          });
        }

        if (msg.type === 'send_result') {
          setSending(false);
          if (!msg.ok) antMessage.error(`Gửi thất bại: ${msg.error}`);
        }
      } catch {}
    };

    ws.onclose = () => {
      setSessionConnected((prev) => ({ ...prev, [username]: false }));
      if (wsRefs.current[username] === ws) {
        delete wsRefs.current[username];
        reconnectTimers.current[username] = setTimeout(() => connectSession(username), 5000);
      }
    };
  }, []);

  useEffect(() => {
    const loggedIn = liveSessions.filter((s) => s.status === 'logged_in').map((s) => s.sessionId);

    loggedIn.forEach((sid) => connectSession(sid));

    Object.keys(wsRefs.current).forEach((username) => {
      if (!loggedIn.includes(username)) {
        const ws = wsRefs.current[username];
        if (ws) { ws.onclose = null; ws.close(); }
        delete wsRefs.current[username];
        clearTimeout(reconnectTimers.current[username]);
        setSessionConnected((prev) => { const n = { ...prev }; delete n[username]; return n; });
        setSessionContacts((prev) => { const n = { ...prev }; delete n[username]; return n; });
      }
    });
  }, [liveSessions, connectSession]);

  useEffect(() => {
    return () => {
      Object.values(wsRefs.current).forEach((ws) => { ws.onclose = null; ws.close(); });
      Object.values(reconnectTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sessionPills = useMemo(() =>
    crmUsers.map((u) => {
      const live = liveSessions.find((s) => s.sessionId === u.username);
      return {
        username: u.username,
        label: u.fullName || u.username,
        status: live?.status || 'idle',
        connected: !!sessionConnected[u.username],
      };
    }),
    [crmUsers, liveSessions, sessionConnected]
  );

  const allContacts = useMemo(() => {
    const result = [];
    Object.entries(sessionContacts).forEach(([sessionId, contacts]) => {
      const u = crmUsers.find((x) => x.username === sessionId);
      contacts.forEach((c) => {
        result.push({ ...c, sessionId, sessionLabel: u?.fullName || sessionId });
      });
    });
    return result.sort((a, b) => parseContactTime(b) - parseContactTime(a));
  }, [sessionContacts, crmUsers]);

  const filteredContacts = useMemo(() => {
    return allContacts.filter((c) => {
      if (filterSession !== 'all' && c.sessionId !== filterSession) return false;
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allContacts, filterSession, search]);

  const totalUnread = useMemo(
    () => allContacts.reduce((s, c) => s + (c.unread || 0), 0),
    [allContacts]
  );

  const openContact = (sessionId, contact) => {
    setActiveConv({ sessionId, contact });
    setMessages([]);
    setLoadingMessages(true);
    setInputText('');
    const ws = wsRefs.current[sessionId];
    ws?.send(JSON.stringify({ type: 'open_contact', id: contact.id, name: contact.name, phone: contact.phone }));
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sending || !activeConv) return;
    setSending(true);
    setInputText('');
    wsRefs.current[activeConv.sessionId]?.send(JSON.stringify({ type: 'send_message', text }));
    inputRef.current?.focus();
  };

  const handleRefreshAll = () => {
    const loggedIn = liveSessions.filter((s) => s.status === 'logged_in').map((s) => s.sessionId);
    loggedIn.forEach((sid) => {
      wsRefs.current[sid]?.send(JSON.stringify({ type: 'get_messages' }));
    });
    antMessage.info('Đang tải lại tin nhắn tất cả tài khoản...');
  };

  const activeContact = activeConv?.contact;
  const activeSessionId = activeConv?.sessionId;
  const activeSessionLabel = sessionPills.find((s) => s.username === activeSessionId)?.label || activeSessionId;
  const activeMyInfo = sessionMyInfo[activeSessionId];

  const isActiveConnected = activeSessionId ? !!sessionConnected[activeSessionId] : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="zalo-page">
      <SessionStatusStrip sessionPills={sessionPills} sessionContacts={sessionContacts} />

      <div className="zalo-chat-layout">
        {/* ── Sidebar: unified inbox ── */}
        <div className="zalo-sidebar">

          {/* Header */}
          <div className="zalo-sidebar-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1F2937' }}>Tin nhắn tổng hợp</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>
                {Object.keys(sessionContacts).length} tài khoản · {allContacts.length} hội thoại
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {totalUnread > 0 && (
                <Badge count={totalUnread} overflowCount={99} size="small" />
              )}
              <Tooltip title="Tải lại tất cả">
                <Button size="small" type="text" icon={<ReloadOutlined />} onClick={handleRefreshAll} />
              </Tooltip>
            </div>
          </div>

          {/* Filter by account */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <Select
              size="small"
              style={{ width: '100%' }}
              value={filterSession}
              onChange={setFilterSession}
              options={[
                { value: 'all', label: 'Tất cả tài khoản' },
                ...sessionPills.map((s) => ({
                  value: s.username,
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: s.status === 'logged_in' ? '#22c55e' : '#9ca3af',
                        }}
                      />
                      {s.label}
                    </span>
                  ),
                })),
              ]}
            />
          </div>

          {/* Search */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <Input
              size="small"
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Tìm tên khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              variant="filled"
            />
          </div>

          {/* Contact list */}
          <div className="zalo-contact-list">
            {filteredContacts.length === 0 ? (
              <div className="zalo-empty-contacts">
                {Object.keys(sessionContacts).length === 0 && liveSessions.filter(s => s.status === 'logged_in').length > 0 ? (
                  <>
                    <Spin size="small" style={{ marginBottom: 8 }} />
                    <p style={{ color: '#9CA3AF', fontSize: 13 }}>Đang tải tin nhắn...</p>
                  </>
                ) : Object.keys(sessionContacts).length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '0 16px' }}>
                    Chưa có tài khoản nào đăng nhập Zalo
                  </p>
                ) : (
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Không có hội thoại nào</p>
                )}
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isActive = activeConv?.sessionId === c.sessionId && activeConv?.contact?.id === c.id;
                return (
                  <div
                    key={`${c.sessionId}:${c.id}`}
                    className={`zalo-contact-item ${isActive ? 'active' : ''}`}
                    onClick={() => openContact(c.sessionId, c)}
                    style={c.unread > 0 && !isActive ? { background: '#EFF6FF', borderLeft: '3px solid #0068FF' } : {}}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <ZaloAvatar name={c.name} src={c.avatar} size={40} />
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
                    <div className="zalo-contact-info" style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                        <div
                          className="zalo-contact-name"
                          style={{ fontWeight: c.unread > 0 ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {c.name}
                        </div>
                        <Tag color="blue" style={{ fontSize: 9, padding: '0 4px', lineHeight: '14px', flexShrink: 0, margin: 0 }}>
                          {c.sessionLabel}
                        </Tag>
                      </div>
                      <div className="zalo-contact-last" style={{ fontWeight: c.unread > 0 ? 600 : 400, color: c.unread > 0 ? '#374151' : undefined }}>
                        {c.lastMsg || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Chưa có tin nhắn</span>}
                      </div>
                    </div>
                    <div className="zalo-contact-time" style={{ flexShrink: 0 }}>{c.timeStr || ''}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="zalo-chat-area">
          {!activeConv ? (
            <div className="zalo-no-chat">
              <MessageOutlined style={{ fontSize: 48, color: '#BFDBFE' }} />
              <h3 style={{ color: '#374151', marginTop: 16 }}>Chọn một cuộc trò chuyện</h3>
              <p style={{ color: '#9CA3AF' }}>
                {allContacts.length === 0
                  ? 'Chưa có tin nhắn nào. Nhân viên cần đăng nhập Zalo trước.'
                  : 'Nhấn vào liên hệ bên trái để xem tin nhắn'}
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="zalo-chat-header">
                <ZaloAvatar name={activeContact.name} src={activeContact.avatar} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1F2937' }}>{activeContact.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {activeContact.phone && (
                      <span><PhoneOutlined style={{ marginRight: 3 }} />{activeContact.phone}</span>
                    )}
                    <span>
                      Tài khoản: <strong style={{ color: '#0068FF' }}>{activeSessionLabel}</strong>
                      {activeMyInfo?.phone && <span style={{ marginLeft: 4 }}>({activeMyInfo.phone})</span>}
                    </span>
                  </div>
                </div>
                <Tooltip title={isActiveConnected ? 'Đang kết nối' : 'Mất kết nối'}>
                  <Tag
                    icon={isActiveConnected ? <WifiOutlined /> : <DisconnectOutlined />}
                    color={isActiveConnected ? 'success' : 'error'}
                    style={{ margin: 0, cursor: 'default', fontSize: 11 }}
                  >
                    {isActiveConnected ? 'Online' : 'Offline'}
                  </Tag>
                </Tooltip>
              </div>

              {/* Messages — newest first */}
              <div className="zalo-messages" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                  <div className="zalo-no-messages">
                    {loadingMessages ? (
                      <>
                        <Spin size="small" />
                        <span style={{ marginLeft: 8, color: '#9CA3AF' }}>Đang tải tin nhắn...</span>
                      </>
                    ) : (
                      <span style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có tin nhắn hoặc không tìm thấy hội thoại</span>
                    )}
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isSelf = m.isSelf;
                    return (
                      <div key={m.msgId || i} className={`zalo-msg-row ${isSelf ? 'self' : 'other'}`}>
                        {!isSelf && (
                          <ZaloAvatar name={activeContact.name} src={activeContact.avatar} size={28} />
                        )}
                        <div className={`zalo-msg-bubble ${isSelf ? 'self' : 'other'}${m.callInfo ? ' call-bubble' : ''}`}>
                          {m.callInfo ? (
                            <CallBubble callInfo={m.callInfo} isSelf={isSelf} />
                          ) : (
                            <>
                              {m.imageUrl && (
                                <img
                                  src={m.imageUrl}
                                  alt="Hình ảnh"
                                  style={{ maxWidth: 220, maxHeight: 300, borderRadius: 8, display: 'block', marginBottom: m.content ? 4 : 0, cursor: 'pointer' }}
                                  onClick={() => window.open(m.imageUrl, '_blank')}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              {m.content && <div className="zalo-msg-content">{m.content}</div>}
                            </>
                          )}
                          <span className="zalo-msg-time">{formatTime(m.time)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className="zalo-input-bar">
                <Input
                  ref={inputRef}
                  placeholder={isActiveConnected ? 'Nhập tin nhắn...' : 'Mất kết nối tới tài khoản này'}
                  variant="filled"
                  style={{ flex: 1 }}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPressEnter={handleSend}
                  disabled={sending || !isActiveConnected}
                  suffix={
                    <Tooltip title="Gửi (Enter)">
                      <SendOutlined
                        onClick={handleSend}
                        style={{
                          color: inputText.trim() && isActiveConnected ? '#0068FF' : '#D1D5DB',
                          cursor: inputText.trim() && isActiveConnected ? 'pointer' : 'default',
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
      </div>
    </motion.div>
  );
}
