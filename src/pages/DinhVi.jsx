import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, List, Tag, Spin, message, Button, DatePicker, Space, Empty, Badge, Avatar, Popconfirm } from 'antd';
import {
  EnvironmentOutlined,
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  AimOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { locationApi } from '../api';
import dayjs from 'dayjs';

const AnimatedDiv = motion.div;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

const MARKER_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];

function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="
      width: 10px; height: 10px; border-radius: 50%;
      background: white; transform: rotate(45deg);
    "></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ locations }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [locations, map]);
  return null;
}

export default function DinhVi() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDate, setHistoryDate] = useState(dayjs());
  const pollerRef = useRef(null);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await locationApi.getLatest();
      setEmployees(res.data || []);
    } catch {
      // silent fail for polling
    }
  }, []);

  const fetchLatestWithLoading = useCallback(async () => {
    setLoading(true);
    await fetchLatest();
    setLoading(false);
  }, [fetchLatest]);

  const fetchHistory = useCallback(async (employeeId, date) => {
    setHistoryLoading(true);
    try {
      const d = date || dayjs();
      const res = await locationApi.getHistory(employeeId, d.format('YYYY-MM-DD'), d.format('YYYY-MM-DD'));
      setHistory(res.data || []);
    } catch {
      message.error('Không thể tải lịch sử vị trí');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestWithLoading();
    pollerRef.current = setInterval(fetchLatest, 30000);
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, [fetchLatest, fetchLatestWithLoading]);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setHistoryDate(dayjs());
    fetchHistory(emp.employeeId, dayjs());
  };

  const handleDateChange = (date) => {
    setHistoryDate(date);
    if (selectedEmployee) {
      fetchHistory(selectedEmployee.employeeId, date);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    try {
      await locationApi.deleteEmployee(employeeId);
      message.success('Đã xóa dữ liệu định vị');
      setEmployees(prev => prev.filter(e => e.employeeId !== employeeId));
      if (selectedEmployee?.employeeId === employeeId) {
        setSelectedEmployee(null);
        setHistory([]);
      }
    } catch { message.error('Lỗi xóa'); }
  };

  const historyPolyline = history.length > 1
    ? history.map(h => [h.latitude, h.longitude]).reverse()
    : [];

  return (
    <AnimatedDiv initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="dinhvi-layout">
        {/* Left Panel - Employee List */}
        <Card
          title={<span><UserOutlined style={{ marginRight: 8, color: '#4F46E5' }} />Nhân viên</span>}
          extra={
            <Space>
              <Badge status="processing" text={<span style={{ fontSize: 11, color: '#10B981' }}>Live 30s</span>} />
              <Button icon={<ReloadOutlined />} size="small" onClick={fetchLatestWithLoading} loading={loading} />
            </Space>
          }
          style={{ width: 300, flexShrink: 0 }}
          styles={{ body: { padding: 0, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
        >
          {loading && employees.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          ) : employees.length === 0 ? (
            <Empty description="Chưa có dữ liệu định vị" style={{ padding: 40 }} />
          ) : (
            employees.map((emp, i) => {
              const color = MARKER_COLORS[i % MARKER_COLORS.length];
              const isSelected = selectedEmployee?.employeeId === emp.employeeId;
              const timeAgo = emp.createdAt ? dayjs(emp.createdAt).format('HH:mm DD/MM') : '';
              return (
                <div
                  key={emp.employeeId || i}
                  className="dinhvi-emp-row"
                  onClick={() => handleSelectEmployee(emp)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', cursor: 'pointer',
                    background: isSelected ? '#EEF2FF' : 'transparent',
                    borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'all 0.2s',
                  }}
                >
                  <Avatar className="dinhvi-emp-avatar" size={36} style={{ background: color, fontWeight: 700, flexShrink: 0 }}>
                    {(emp.employeeName || emp.employeeId || '?').charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="dinhvi-emp-info" style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="dinhvi-emp-name" style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>
                      {emp.employeeName || emp.employeeId}
                    </div>
                    <div className="dinhvi-emp-time" style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClockCircleOutlined style={{ fontSize: 10 }} />
                      {emp.createdAt ? dayjs(emp.createdAt).format('HH:mm DD/MM') : '—'}
                    </div>
                    <div className="dinhvi-emp-coords" style={{ fontSize: 10, color: '#CBD5E1' }}>
                      {emp.latitude?.toFixed(5)}, {emp.longitude?.toFixed(5)}
                      {emp.accuracy != null && <span> (±{Math.round(emp.accuracy)}m)</span>}
                    </div>
                  </div>
                  <div className="dinhvi-emp-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <EnvironmentOutlined style={{ color, fontSize: 16 }} />
                    <Popconfirm title="Xóa dữ liệu định vị nhân viên này?" onConfirm={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.employeeId); }} onCancel={(e) => e.stopPropagation()} okText="Xóa" cancelText="Hủy">
                      <DeleteOutlined style={{ color: '#EF4444', fontSize: 12, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* Right Panel - Map + History */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Map */}
          <Card
            title={<span><AimOutlined style={{ marginRight: 8, color: '#10B981' }} />Bản đồ định vị</span>}
            extra={
              selectedEmployee && (
                <Space>
                  <DatePicker
                    value={historyDate}
                    onChange={handleDateChange}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    size="small"
                  />
                  {historyLoading && <Spin size="small" />}
                </Space>
              )
            }
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
              <MapContainer
                center={[20.5, 106.0]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
              >
                <MapResizer />
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {employees.length > 0 && <FitBounds locations={employees} />}
              {employees.map((emp, i) => (
                <Marker
                  key={emp.employeeId || i}
                  position={[emp.latitude, emp.longitude]}
                  icon={createColoredIcon(MARKER_COLORS[i % MARKER_COLORS.length])}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {emp.employeeName || emp.employeeId}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} />
                        {emp.latitude?.toFixed(6)}, {emp.longitude?.toFixed(6)}
                      </div>
                      {emp.accuracy != null && (
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                          Độ chính xác: ±{Math.round(emp.accuracy)}m
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {emp.createdAt ? dayjs(emp.createdAt).format('HH:mm:ss DD/MM/YYYY') : '—'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {historyPolyline.length > 1 && (
                <Polyline positions={historyPolyline} color="#4F46E5" weight={3} opacity={0.7} dashArray="8,4" />
              )}
              {history.map((h, i) => (
                <Marker
                  key={`hist-${h.id || i}`}
                  position={[h.latitude, h.longitude]}
                  icon={L.divIcon({
                    className: '',
                    html: `<div style="width:10px;height:10px;border-radius:50%;background:#4F46E5;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [10, 10],
                    iconAnchor: [5, 5],
                  })}
                >
                  <Popup>
                    <div style={{ fontSize: 12 }}>
                      <div>{h.createdAt ? dayjs(h.createdAt).format('HH:mm:ss') : ''}</div>
                      <div style={{ color: '#6B7280' }}>{h.latitude?.toFixed(6)}, {h.longitude?.toFixed(6)}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            </div>
          </Card>

          {/* History Timeline */}
          {selectedEmployee && (
            <Card
              title={
                <span>
                  <ClockCircleOutlined style={{ marginRight: 8, color: '#F59E0B' }} />
                  Lịch sử di chuyển — {selectedEmployee.employeeName || selectedEmployee.employeeId}
                  {historyDate && <Tag color="blue" style={{ marginLeft: 8 }}>{historyDate.format('DD/MM/YYYY')}</Tag>}
                </span>
              }
              styles={{ body: { padding: '8px 16px', maxHeight: 200, overflowY: 'auto' } }}
            >
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
              ) : history.length === 0 ? (
                <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Không có dữ liệu vị trí trong ngày này</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {history.map((h, i) => (
                    <Tag key={h.id || i} style={{ borderRadius: 6, fontSize: 11 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {h.createdAt ? dayjs(h.createdAt).format('HH:mm:ss') : ''}
                      <span style={{ color: '#9CA3AF', marginLeft: 4 }}>
                        ({h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)})
                      </span>
                    </Tag>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </AnimatedDiv>
  );
}
