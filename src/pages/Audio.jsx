import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Card, Tag, Space, Spin, message, Badge, Input, Empty, Button, Tooltip, Popconfirm, Alert, Modal, Timeline } from 'antd';
import {
  AudioOutlined,
  FolderOutlined,
  PhoneOutlined,
  UserOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  SyncOutlined,
  DeleteOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { audioApi } from '../api';
import dayjs from 'dayjs';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const AnimatedDiv = motion.div;

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSecondsAgo(sec) {
  if (sec < 60) return `${sec}s trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return `${Math.floor(sec / 86400)} ngày trước`;
}

export default function Audio() {
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [appStatus, setAppStatus] = useState({});
  const [pinging, setPinging] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const statusTimer = useRef(null);
  const prevOnlineState = useRef({});

  const fetchFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const res = await audioApi.getFolders();
      setFolders(res.data || []);
    } catch {
      message.error('Không thể tải danh sách thư mục');
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const fetchRecordings = useCallback(async (employeeId) => {
    setRecordingsLoading(true);
    try {
      const res = await audioApi.getRecordings(employeeId);
      setRecordings(res.data || []);
    } catch {
      message.error('Không thể tải danh sách ghi âm');
    } finally {
      setRecordingsLoading(false);
    }
  }, []);

  const fetchAppStatus = useCallback(async () => {
    try {
      const res = await audioApi.getAppStatus();
      const map = {};
      (res.data || []).forEach(item => {
        map[item.employeeId] = item;
        const wasOnline = prevOnlineState.current[item.employeeId];
        if (wasOnline === false && item.online) {
          message.success(`${item.employeeName || item.employeeId}: Đã kết nối lại!`);
        } else if (wasOnline === true && !item.online) {
          message.error(`${item.employeeName || item.employeeId}: Mất kết nối!`);
        }
        prevOnlineState.current[item.employeeId] = item.online;
      });
      setAppStatus(map);
    } catch {}
  }, []);

  const fetchHistory = useCallback(async (employeeId) => {
    try {
      const res = await audioApi.getConnectionHistory(employeeId);
      setConnectionHistory(res.data?.history || []);
      setShowHistory(true);
    } catch {
      message.error('Không thể tải lịch sử kết nối');
    }
  }, []);

  const handlePing = useCallback(async (employeeId) => {
    setPinging(true);
    try {
      const res = await audioApi.pingDevice(employeeId);
      const data = res.data;
      if (data.online) {
        message.success(`${data.employeeName}: Online — ${data.lastAction} ${formatSecondsAgo(data.secondsAgo)}`);
      } else {
        message.error(`${data.employeeName}: Offline — lần cuối ${data.secondsAgo >= 0 ? formatSecondsAgo(data.secondsAgo) : 'chưa bao giờ kết nối'}`);
      }
      fetchAppStatus();
    } catch {
      message.error('Không thể ping thiết bị');
    } finally {
      setPinging(false);
    }
  }, [fetchAppStatus]);

  useEffect(() => { fetchFolders(); fetchAppStatus(); }, [fetchFolders, fetchAppStatus]);

  useEffect(() => {
    statusTimer.current = setInterval(fetchAppStatus, 30000);
    return () => clearInterval(statusTimer.current);
  }, [fetchAppStatus]);

  const handleDeleteFolder = async (empId, e) => {
    e?.stopPropagation();
    try {
      await audioApi.deleteEmployee(empId);
      message.success('Đã xóa thư mục nhân viên');
      setFolders(prev => prev.filter(f => (f.employeeid || f.employeeId) !== empId));
      if (selectedEmployee && (selectedEmployee.employeeid || selectedEmployee.employeeId) === empId) {
        setSelectedEmployee(null);
        setRecordings([]);
      }
    } catch { message.error('Lỗi xóa'); }
  };

  const handleSelectFolder = (folder) => {
    setSelectedEmployee(folder);
    fetchRecordings(folder.employeeid || folder.employeeId);
  };

  const filteredRecordings = recordings.filter(r => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (r.phone || '').toLowerCase().includes(s)
      || (r.customerName || '').toLowerCase().includes(s)
      || (r.zaloName || '').toLowerCase().includes(s)
      || (r.fileName || '').toLowerCase().includes(s);
  });

  const findStatus = (empId, empName) => {
    if (appStatus[empId]) return appStatus[empId];
    const upper = (empId || '').toUpperCase().trim();
    const nameUpper = (empName || '').toUpperCase().trim();
    return Object.values(appStatus).find(s => {
      const sId = (s.employeeId || '').toUpperCase().trim();
      const sName = (s.employeeName || '').toUpperCase().trim();
      return sId === upper || sId === nameUpper || sName === nameUpper || sName === upper;
    }) || null;
  };

  const offlineDevices = Object.values(appStatus).filter(d => !d.online);
  const onlineCount = Object.values(appStatus).filter(d => d.online).length;
  const totalDevices = Object.keys(appStatus).length;

  const handleDeleteRecording = async (id) => {
    try {
      await audioApi.deleteRecording(id);
      message.success('Đã xóa bản ghi âm');
      if (selectedEmployee) {
        fetchRecordings(selectedEmployee.employeeid || selectedEmployee.employeeId);
      }
    } catch {
      message.error('Lỗi xóa bản ghi âm');
    }
  };

  const columns = [
    {
      title: 'Thời gian', dataIndex: 'recordedAt', width: 140,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
      sorter: (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt),
      defaultSortOrder: 'descend',
    },
    {
      title: 'SĐT', dataIndex: 'phone', width: 120,
      render: (v) => v && v.trim() ? <span style={{ fontFamily: 'monospace', color: '#0891B2', fontWeight: 600 }}>{v}</span> : '—',
    },
    {
      title: 'Tên khách', dataIndex: 'customerName', width: 150, ellipsis: true,
      render: (v, r) => v || r.zaloName || '—',
    },
    {
      title: 'Loại', dataIndex: 'callType', width: 80,
      render: (v) => (
        <Tag style={{
          background: v === 'ZALO' ? '#DCFCE7' : '#DBEAFE',
          color: v === 'ZALO' ? '#15803D' : '#1D4ED8',
          border: 'none', fontWeight: 600, borderRadius: 6,
        }}>
          {v || 'GSM'}
        </Tag>
      ),
    },
    {
      title: 'Chiều', dataIndex: 'callDirection', width: 90,
      render: (v) => (
        <Tag style={{
          background: v === 'OUTGOING' ? '#FEF3C7' : '#F3E8FF',
          color: v === 'OUTGOING' ? '#92400E' : '#6B21A8',
          border: 'none', fontWeight: 500, borderRadius: 6,
        }}>
          {v === 'OUTGOING' ? 'Gọi đi' : 'Gọi đến'}
        </Tag>
      ),
    },
    {
      title: 'Thời lượng', dataIndex: 'duration', width: 90, align: 'center',
      render: (v) => <span style={{ color: '#6B7280', fontSize: 12 }}>{formatDuration(v)}</span>,
    },
    {
      title: 'KH liên kết', dataIndex: 'khachHangId', width: 90, align: 'center',
      render: (v) => v ? <Tag color="green" style={{ borderRadius: 6 }}>ID: {v}</Tag> : <span style={{ color: '#CBD5E1' }}>—</span>,
    },
    {
      title: 'Nghe', key: 'play', width: 300,
      render: (_, r) => r.fileUrl ? (
        <audio controls preload="metadata" style={{ height: 32, width: '100%' }}>
          <source src={r.fileUrl.startsWith('http') ? r.fileUrl : `${API_BASE}${r.fileUrl}`} />
        </audio>
      ) : <span style={{ color: '#CBD5E1', fontSize: 12 }}>Không có file</span>,
    },
    {
      title: '', key: 'action', width: 50, align: 'center',
      render: (_, r) => (
        <Popconfirm
          title="Xóa bản ghi âm này?"
          description="Hành động này không thể hoàn tác"
          onConfirm={() => handleDeleteRecording(r.id)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <AnimatedDiv initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {offlineDevices.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<DisconnectOutlined />}
          style={{ marginBottom: 16, borderRadius: 10, fontWeight: 600 }}
          message={
            <span>
              {offlineDevices.length} thiết bị mất kết nối:{' '}
              {offlineDevices.map((d, i) => (
                <Tag key={d.employeeId} color="red" style={{ borderRadius: 6, marginLeft: i > 0 ? 4 : 0 }}>
                  {d.employeeName || d.employeeId} — {formatSecondsAgo(d.secondsAgo)}
                </Tag>
              ))}
            </span>
          }
        />
      )}

      <div className="audio-layout">
        {/* Left Panel - Employee Folders */}
        <Card
          title={
            <span style={{ fontSize: 13 }}>
              <FolderOutlined style={{ marginRight: 6, color: '#7C3AED' }} />
              NV
              {totalDevices > 0 && (
                <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: onlineCount === totalDevices ? '#10B981' : '#EF4444' }}>
                  <WifiOutlined style={{ marginRight: 4 }} />
                  {onlineCount}/{totalDevices} online
                </span>
              )}
            </span>
          }
          extra={<Button icon={<ReloadOutlined />} size="small" onClick={() => { fetchFolders(); fetchAppStatus(); }} loading={foldersLoading} />}
          style={{ width: 280, flexShrink: 0 }}
          styles={{ body: { padding: 0 } }}
        >
          {foldersLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          ) : folders.length === 0 ? (
            <Empty description="Chưa có ghi âm nào" style={{ padding: 40 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {folders.map((f, i) => {
                const empId = f.employeeid || f.employeeId;
                const empName = f.employeename || f.employeeName || empId;
                const count = Number(f.count || 0);
                const isSelected = selectedEmployee && (selectedEmployee.employeeid || selectedEmployee.employeeId) === empId;
                const status = findStatus(empId, empName);
                const isOnline = status?.online;
                return (
                  <div
                    key={empId || i}
                    className="audio-folder-row"
                    onClick={() => handleSelectFolder(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px', cursor: 'pointer',
                      background: isSelected ? 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #4F46E5' : '3px solid transparent',
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div className="audio-folder-avatar" style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: isSelected ? '#4F46E5' : '#E2E8F0',
                        color: isSelected ? '#fff' : '#64748B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14,
                      }}>
                        {empName.charAt(0).toUpperCase()}
                      </div>
                      {status && (
                        <Tooltip title={isOnline
                          ? `Online — ${status.lastAction === 'upload' ? 'Vừa upload' : status.lastAction === 'location' ? 'Cập nhật vị trí' : 'Heartbeat'} ${formatSecondsAgo(status.secondsAgo)}`
                          : `Mất kết nối — lần cuối ${formatSecondsAgo(status.secondsAgo)}`}>
                          <div style={{
                            position: 'absolute', bottom: -1, right: -1,
                            width: 12, height: 12, borderRadius: '50%',
                            background: isOnline ? '#10B981' : '#EF4444',
                            border: '2px solid #fff',
                            animation: isOnline ? undefined : 'pulse-red 1.5s infinite',
                          }} />
                        </Tooltip>
                      )}
                    </div>
                    <div className="audio-folder-info" style={{ flex: 1, overflow: 'hidden' }}>
                      <div className="audio-folder-name" style={{ fontWeight: 600, fontSize: 13, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {empName}
                      </div>
                      <div className="audio-folder-email" style={{ fontSize: 11, color: status && !isOnline ? '#EF4444' : '#9CA3AF', fontWeight: status && !isOnline ? 600 : 400 }}>
                        {status ? (isOnline ? empId : `Mất kết nối ${formatSecondsAgo(status.secondsAgo)}`) : empId}
                      </div>
                    </div>
                    <div className="audio-folder-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Badge count={count} style={{ backgroundColor: isSelected ? '#4F46E5' : '#94A3B8' }} />
                      <Popconfirm title={`Xóa tất cả ghi âm của ${empName}?`} onConfirm={(e) => handleDeleteFolder(empId, e)} onCancel={(e) => e?.stopPropagation()} okText="Xóa" cancelText="Hủy">
                        <DeleteOutlined style={{ color: '#EF4444', fontSize: 12, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Panel - Recordings Table */}
        <Card
          title={
            selectedEmployee ? (
              <span>
                <AudioOutlined style={{ marginRight: 8, color: '#7C3AED' }} />
                Ghi âm của <strong>{selectedEmployee.employeename || selectedEmployee.employeeName}</strong>
                {(() => {
                  const empId = selectedEmployee.employeeid || selectedEmployee.employeeId;
                  const empName = selectedEmployee.employeename || selectedEmployee.employeeName;
                  const status = findStatus(empId, empName);
                  if (!status) return null;
                  return (
                    <>
                      <Tag
                        color={status.online ? 'green' : 'red'}
                        style={{ marginLeft: 10, borderRadius: 10, fontWeight: 600 }}
                        icon={status.online ? <WifiOutlined /> : <DisconnectOutlined />}
                      >
                        {status.online ? 'Đang kết nối' : `Mất kết nối ${formatSecondsAgo(status.secondsAgo)}`}
                      </Tag>
                      <Tooltip title="Ping kiểm tra kết nối">
                        <Button
                          type="primary"
                          size="small"
                          icon={<WifiOutlined />}
                          loading={pinging}
                          onClick={(e) => { e.stopPropagation(); handlePing(empId); }}
                          style={{ marginLeft: 6, borderRadius: 8, background: status.online ? '#10B981' : '#EF4444', borderColor: status.online ? '#10B981' : '#EF4444' }}
                        >
                          Ping
                        </Button>
                      </Tooltip>
                      <Tooltip title="Xem lịch sử kết nối">
                        <Button
                          size="small"
                          icon={<SyncOutlined />}
                          onClick={(e) => { e.stopPropagation(); fetchHistory(empId); }}
                          style={{ marginLeft: 4, borderRadius: 8 }}
                        >
                          Lịch sử
                        </Button>
                      </Tooltip>
                    </>
                  );
                })()}
              </span>
            ) : (
              <span><AudioOutlined style={{ marginRight: 8, color: '#7C3AED' }} />Chọn nhân viên để xem ghi âm</span>
            )
          }
          extra={
            selectedEmployee && (
              <Space>
                <Input
                  placeholder="Tìm SĐT, tên..."
                  prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                  size="small"
                />
                <Button icon={<ReloadOutlined />} size="small" onClick={() => fetchRecordings(selectedEmployee.employeeid || selectedEmployee.employeeId)} />
              </Space>
            )
          }
          style={{ flex: 1 }}
          styles={{ body: { padding: 0 } }}
        >
          {!selectedEmployee ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12 }}>
              <FolderOutlined style={{ fontSize: 48, color: '#CBD5E1' }} />
              <span style={{ color: '#9CA3AF', fontSize: 14 }}>Chọn một thư mục nhân viên bên trái để xem ghi âm</span>
            </div>
          ) : (
            <Table
              dataSource={filteredRecordings}
              columns={columns}
              rowKey="id"
              loading={recordingsLoading}
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1000 }}
            />
          )}
        </Card>
      </div>

      <Modal
        title="Lịch sử kết nối"
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={500}
      >
        {connectionHistory.length === 0 ? (
          <Empty description="Chưa có lịch sử kết nối" />
        ) : (
          <Timeline
            items={[...connectionHistory].reverse().map((item) => ({
              color: item.event === 'CONNECTED' ? 'green' : 'red',
              children: (
                <div>
                  <Tag color={item.event === 'CONNECTED' ? 'green' : 'red'} style={{ fontWeight: 600, borderRadius: 6 }}>
                    {item.event === 'CONNECTED' ? 'Kết nối lại' : 'Mất kết nối'}
                  </Tag>
                  <span style={{ color: '#6B7280', fontSize: 12, marginLeft: 8 }}>
                    {item.time ? dayjs(item.time).format('DD/MM/YYYY HH:mm:ss') : ''}
                  </span>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    {item.employeeName || item.employeeId}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Modal>

      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </AnimatedDiv>
  );
}
