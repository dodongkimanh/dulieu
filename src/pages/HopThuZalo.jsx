import { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Spin, Empty, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import api from '../api';

const SESSIONS_LABELS = {
  'hangdodong@kimanh.com':        'Hằng Đồ Đồng',
  'hiendodong@kimanh.com':        'Hiền Đồ Đồng',
  'kydodong@kimanh.com':          'Kỳ Đúc Đồng',
  'quynhdodong@kimanh.com':       'Quỳnh Đồ Đồng',
  'kieuducdongnamdinh@kimanh.com':'Kiều Đúc Đồng',
  'tranbaoyen@kimanh.com':        'Trần Bảo Yến',
};

function Avatar({ name, avatar, size = 40 }) {
  const [imgErr, setImgErr] = useState(false);
  const letter = (name || '?').charAt(0).toUpperCase();
  const colors = ['#0068FF','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4'];
  const bg = colors[(name || '').charCodeAt(0) % colors.length];

  if (avatar && !imgErr) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.4,
    }}>
      {letter}
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return d.toLocaleDateString('vi-VN', { weekday: 'short' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatMsgTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function parseDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

function parseJsonCall(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const d = JSON.parse(text);
    if (!d || typeof d !== 'object') return null;
    if (d.title === 'sendBubbleMessage' || String(d.action || '').includes('call')) {
      let p = {};
      try { p = typeof d.params === 'string' ? JSON.parse(d.params) : (d.params || {}); } catch {}
      const duration = p.duration || 0;
      const isCaller = !!p.isCaller;
      return { _type: 'call', isVideo: p.calltype === 1, isCaller, duration, hasCallback: !!p.isEnableCallback, missed: !isCaller && duration === 0 };
    }
    if (String(d.action || '').includes('actionlist') || String(d.action || '').includes('msginfo')) {
      let p = {};
      try { p = typeof d.params === 'string' ? JSON.parse(d.params) : (d.params || {}); } catch {}
      const viMsg = p?.msg?.vi;
      const label = viMsg ? viMsg.replace(/%1\$s/g, '').trim() : (d.title || 'Thông báo');
      return { _type: 'notification', label };
    }
    if ((d.type === 7 || d.type === 1 || d.type === 2) && d.catId != null) {
      return { _type: 'sticker', url: `https://zalo-sticker.zadn.vn/${d.catId}/${d.id}.png` };
    }
    const gifUrl = d.url || d.href || d.normalUrl || d.hdUrl;
    if (gifUrl && typeof gifUrl === 'string') return { _type: 'gif', url: gifUrl };
    return { _type: 'unsupported' };
  } catch {}
  return null;
}

function MessageBubble({ msg, prevMsg }) {
  const isSelf = msg.isSelf;
  const sameAsPrev = prevMsg && prevMsg.isSelf === msg.isSelf;
  const isCall = msg.type === 'voice_call' || msg.type === 'video_call';
  const callInfo = msg.callInfo ? (typeof msg.callInfo === 'string' ? JSON.parse(msg.callInfo) : msg.callInfo) : null;
  const jsonCall = !isCall && !callInfo ? parseJsonCall(msg.text) : null;

  let content = null;
  if (isCall || callInfo) {
    const isVideo = (callInfo?.type || msg.type) === 'video_call';
    const isMissed = callInfo?.direction === 'missed';
    const isIncoming = callInfo?.direction === 'incoming';
    const iconColor = isMissed ? '#ef4444' : isIncoming ? '#22c55e' : '#3b82f6';
    const bgColor = isMissed ? '#fef2f2' : isIncoming ? '#f0fdf4' : '#eff6ff';
    const dirLabel = isMissed ? 'nhỡ' : isIncoming ? 'đến' : 'đi';
    content = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, padding: '2px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: bgColor, border: `1.5px solid ${iconColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isVideo ? <VideoCameraOutlined style={{ color: iconColor, fontSize: 16 }} /> : <PhoneOutlined style={{ color: iconColor, fontSize: 16 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: isMissed ? '#ef4444' : '#1f2937', lineHeight: 1.3 }}>
            {isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} {dirLabel}
          </div>
          {callInfo?.duration > 0 && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>▶ {parseDuration(callInfo.duration)}</div>}
          {callInfo?.hasCallBack && <div style={{ marginTop: 5, display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#0068ff', border: '1px solid #0068ff', borderRadius: 12, padding: '2px 10px' }}>GỌI LẠI</div>}
        </div>
      </div>
    );
  } else if (jsonCall && jsonCall._type === 'call') {
    const iconColor = jsonCall.missed ? '#ef4444' : jsonCall.isCaller ? '#3b82f6' : '#22c55e';
    const bgColor = jsonCall.missed ? '#fef2f2' : jsonCall.isCaller ? '#eff6ff' : '#f0fdf4';
    const dirLabel = jsonCall.missed ? 'nhỡ' : jsonCall.isCaller ? 'đi' : 'đến';
    content = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, padding: '2px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: bgColor, border: `1.5px solid ${iconColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {jsonCall.isVideo ? <VideoCameraOutlined style={{ color: iconColor, fontSize: 16 }} /> : <PhoneOutlined style={{ color: iconColor, fontSize: 16 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: jsonCall.missed ? '#ef4444' : '#1f2937', lineHeight: 1.3 }}>
            {jsonCall.isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} {dirLabel}
          </div>
          {jsonCall.duration > 0 && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>▶ {parseDuration(jsonCall.duration)}</div>}
          {jsonCall.hasCallback && <div style={{ marginTop: 5, display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#0068ff', border: '1px solid #0068ff', borderRadius: 12, padding: '2px 10px' }}>GỌI LẠI</div>}
        </div>
      </div>
    );
  } else if (jsonCall && jsonCall._type === 'notification') {
    content = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 13, fontStyle: 'italic' }}>
        <span>{jsonCall.label}</span>
      </div>
    );
  } else if (jsonCall && jsonCall._type === 'sticker') {
    content = <img src={jsonCall.url} alt="Sticker" style={{ maxWidth: 100, maxHeight: 100 }} onError={e => { e.target.style.display = 'none'; }} />;
  } else if (jsonCall && jsonCall._type === 'gif') {
    content = <img src={jsonCall.url} alt="GIF" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }} onError={e => { e.target.style.display = 'none'; }} />;
  } else if (jsonCall && jsonCall._type === 'unsupported') {
    content = <span style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>[Tin nhắn không hỗ trợ]</span>;
  } else if (msg.imageUrl) {
    content = (
      <>
        <img
          src={msg.imageUrl}
          alt="ảnh"
          style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, display: 'block', cursor: 'pointer', marginBottom: msg.text ? 4 : 0 }}
          onClick={() => window.open(msg.imageUrl, '_blank')}
        />
        {msg.text && <span style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block' }}>{msg.text}</span>}
      </>
    );
  } else {
    content = <span style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text || ''}</span>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isSelf ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 6,
      marginTop: sameAsPrev ? 2 : 10,
      paddingRight: isSelf ? 4 : 0,
      paddingLeft: isSelf ? 0 : 4,
    }}>
      <Tooltip title={formatMsgTime(msg.timestamp)} placement={isSelf ? 'left' : 'right'}>
        <div style={{
          maxWidth: '65%',
          padding: isCall || callInfo || jsonCall ? '8px 14px' : msg.imageUrl ? '4px' : '8px 14px',
          borderRadius: isSelf ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isSelf
            ? 'linear-gradient(135deg, #0068FF 0%, #0052cc 100%)'
            : (isCall || callInfo ? '#F3F4F6' : '#F3F4F6'),
          color: isSelf ? '#fff' : '#1a1a1a',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}>
          {content}
        </div>
      </Tooltip>
    </div>
  );
}

export default function HopThuZalo() {
  const [sessions, setSessions]           = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [inbox, setInbox]                 = useState([]);
  const [inboxPage, setInboxPage]         = useState(0);
  const [inboxTotal, setInboxTotal]       = useState(0);
  const [inboxLoading, setInboxLoading]   = useState(false);
  const [search, setSearch]               = useState('');

  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [msgPage, setMsgPage]             = useState(0);
  const [msgTotal, setMsgTotal]           = useState(0);
  const [msgLoading, setMsgLoading]       = useState(false);

  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);

  // Load sessions
  useEffect(() => {
    api.get('/zalo-chat/sessions').then(r => {
      const list = r.data || [];
      setSessions(list);
      if (list.length > 0 && !activeSession) setActiveSession(list[0].sessionId);
    }).catch(() => {});
  }, []);

  // Load inbox when session changes
  const loadInbox = useCallback((sessionId, page = 0, append = false) => {
    if (!sessionId) return;
    setInboxLoading(true);
    api.get('/zalo-chat/inbox', { params: { session: sessionId, page, size: 30 } })
      .then(r => {
        const data = r.data;
        setInbox(prev => append ? [...prev, ...data.content] : data.content);
        setInboxTotal(data.totalElements);
        setInboxPage(page);
      })
      .catch(() => {})
      .finally(() => setInboxLoading(false));
  }, []);

  useEffect(() => {
    if (activeSession) {
      setInbox([]);
      setActiveConv(null);
      setMessages([]);
      loadInbox(activeSession, 0);
    }
  }, [activeSession, loadInbox]);

  // Load messages when conversation selected
  const loadMessages = useCallback((convId, page = 0, prepend = false) => {
    if (!convId) return;
    setMsgLoading(true);
    api.get(`/zalo-chat/messages/${convId}`, { params: { page, size: 50 } })
      .then(r => {
        const data = r.data;
        setMessages(prev => prepend ? [...data.content, ...prev] : data.content);
        setMsgTotal(data.totalElements);
        setMsgPage(page);
      })
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, []);

  useEffect(() => {
    if (activeConv) {
      setMessages([]);
      setMsgPage(0);
      loadMessages(activeConv.conversationId, 0);
    }
  }, [activeConv, loadMessages]);

  // Scroll to bottom when messages load (first page)
  useEffect(() => {
    if (msgPage === 0 && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, msgPage]);

  const filteredInbox = inbox.filter(c =>
    !search || (c.contactName || c.zaloUid || '').toLowerCase().includes(search.toLowerCase())
  );

  const sessionLabel = s => SESSIONS_LABELS[s] || s?.split('@')[0] || s;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#F8FAFC', overflow: 'hidden' }}>

      {/* ─── LEFT PANEL ─────────────────────────────────────── */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #E5E7EB' }}>

        {/* Session tabs */}
        <div style={{ padding: '12px 12px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Tài khoản Zalo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 10 }}>
            {sessions.map(s => (
              <div
                key={s.sessionId}
                onClick={() => setActiveSession(s.sessionId)}
                style={{
                  padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: activeSession === s.sessionId ? '#0068FF' : '#F3F4F6',
                  color: activeSession === s.sessionId ? '#fff' : '#374151',
                  transition: 'all .15s',
                  border: activeSession === s.sessionId ? '1px solid #0068FF' : '1px solid #E5E7EB',
                }}
              >
                {sessionLabel(s.sessionId)}
                <span style={{ marginLeft: 4, opacity: 0.75, fontWeight: 400 }}>({s.contactCount})</span>
              </div>
            ))}
            {sessions.length === 0 && (
              <div style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 0' }}>Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="Tìm liên hệ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            size="small"
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {inboxLoading && inbox.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spin /></div>
          ) : filteredInbox.length === 0 ? (
            <Empty description="Chưa có cuộc hội thoại" style={{ paddingTop: 40 }} imageStyle={{ height: 48 }} />
          ) : (
            filteredInbox.map(conv => {
              const isActive = activeConv?.conversationId === conv.conversationId;
              return (
                <div
                  key={conv.conversationId}
                  onClick={() => setActiveConv(conv)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', cursor: 'pointer',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    borderLeft: isActive ? '3px solid #0068FF' : '3px solid transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar name={conv.contactName || conv.zaloUid} avatar={conv.avatar} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                        {conv.contactName && conv.contactName !== conv.zaloUid ? conv.contactName : conv.zaloUid}
                      </span>
                      <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: 2, lineHeight: 1.4 }}>
                      {conv.lastMessage || <span style={{ fontStyle: 'italic', color: '#D1D5DB' }}>Chưa có tin nhắn</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* Load more inbox */}
          {!inboxLoading && inbox.length < inboxTotal && (
            <div
              style={{ textAlign: 'center', padding: '10px 0', cursor: 'pointer', fontSize: 12, color: '#0068FF' }}
              onClick={() => loadInbox(activeSession, inboxPage + 1, true)}
            >
              Tải thêm...
            </div>
          )}
        </div>

        {/* Inbox footer */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{inboxTotal} cuộc hội thoại</span>
          <Tooltip title="Làm mới">
            <ReloadOutlined
              onClick={() => loadInbox(activeSession, 0)}
              style={{ fontSize: 13, color: '#9CA3AF', cursor: 'pointer' }}
            />
          </Tooltip>
        </div>
      </div>

      {/* ─── RIGHT PANEL ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#9CA3AF' }}>
            <svg width="64" height="64" viewBox="0 0 48 48" fill="none" opacity={0.3}>
              <path d="M24 4C12.95 4 4 12.95 4 24c0 3.9 1.07 7.55 2.93 10.67L4 44l9.6-2.87A19.87 19.87 0 0024 44c11.05 0 20-8.95 20-20S35.05 4 24 4z" fill="#0068FF"/>
            </svg>
            <span style={{ fontSize: 14 }}>Chọn một cuộc hội thoại để xem tin nhắn</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '12px 20px', background: '#fff', borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Avatar name={activeConv.contactName || activeConv.zaloUid} avatar={activeConv.avatar} size={38} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                  {activeConv.contactName && activeConv.contactName !== activeConv.zaloUid
                    ? activeConv.contactName : activeConv.zaloUid}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {sessionLabel(activeSession)} · Zalo ID: {activeConv.zaloUid}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Tooltip title="Làm mới tin nhắn">
                  <ReloadOutlined
                    onClick={() => loadMessages(activeConv.conversationId, 0)}
                    style={{ fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#F8FAFC' }}>
              <div ref={messagesTopRef} />

              {/* Load older messages */}
              {msgTotal > messages.length && (
                <div
                  style={{ textAlign: 'center', marginBottom: 12, cursor: 'pointer', fontSize: 12, color: '#0068FF' }}
                  onClick={() => loadMessages(activeConv.conversationId, msgPage + 1, true)}
                >
                  {msgLoading ? <Spin size="small" /> : '↑ Tải tin nhắn cũ hơn'}
                </div>
              )}

              {msgLoading && messages.length === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spin /></div>
              )}

              {!msgLoading && messages.length === 0 && (
                <Empty description="Chưa có tin nhắn" style={{ paddingTop: 60 }} imageStyle={{ height: 48 }} />
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={msg.id} msg={msg} prevMsg={i > 0 ? messages[i - 1] : null} />
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer info */}
            <div style={{ padding: '8px 20px', background: '#fff', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                {messages.length} / {msgTotal} tin nhắn
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                Chỉ xem — gửi tin qua trang Zalo
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
