import { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, Input, InputNumber, Button, Switch, Table, Tag, DatePicker,
  Space, Typography, Divider, message, Popconfirm, Tooltip, Badge,
} from 'antd';
import {
  WifiOutlined, SyncOutlined, SaveOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { hikvisionApi, nhanVienApi } from '../api';

const { Title, Text } = Typography;

export default function HikvisionConfig() {
  const [devices, setDevices]       = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [logs, setLogs]             = useState([]);
  const [logTotal, setLogTotal]     = useState(0);
  const [logPage, setLogPage]       = useState(0);
  const [syncing, setSyncing]       = useState(false);
  const [testing, setTesting]       = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncDate, setSyncDate]     = useState(dayjs());
  const [editingNvId, setEditingNvId] = useState(null);
  const [editingCode, setEditingCode] = useState('');
  const [deviceForm] = Form.useForm();

  const loadDevices = useCallback(async () => {
    const res = await hikvisionApi.getDevices();
    setDevices(res.data);
    if (res.data.length > 0) deviceForm.setFieldsValue(res.data[0]);
  }, [deviceForm]);

  const loadEmployees = useCallback(async () => {
    const res = await nhanVienApi.getAll();
    setEmployees(res.data);
  }, []);

  const loadLogs = useCallback(async (page = 0) => {
    setLoadingLogs(true);
    try {
      const res = await hikvisionApi.getLogs(page, 20);
      setLogs(res.data.content);
      setLogTotal(res.data.totalElements);
      setLogPage(page);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadEmployees();
    loadLogs(0);
  }, [loadDevices, loadEmployees, loadLogs]);

  const handleSaveDevice = async (values) => {
    const existing = devices[0];
    const payload = existing ? { ...existing, ...values } : values;
    await hikvisionApi.saveDevice(payload);
    message.success('Đã lưu cấu hình thiết bị');
    loadDevices();
  };

  const handleTestConnection = async () => {
    try {
      const values = await deviceForm.validateFields();
      setTesting(true);
      const res = await hikvisionApi.testConnection(values);
      if (res.data.success) {
        message.success('Kết nối thành công tới máy chấm công');
      } else {
        message.error('Không thể kết nối: ' + res.data.message);
      }
    } catch {
      message.error('Lỗi kết nối tới thiết bị');
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteDevice = async (id) => {
    await hikvisionApi.deleteDevice(id);
    message.success('Đã xóa thiết bị');
    deviceForm.resetFields();
    loadDevices();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const dateStr = syncDate.format('YYYY-MM-DD');
      const res = await hikvisionApi.sync(dateStr);
      const log = res.data;
      if (log.status === 'SUCCESS') {
        message.success(`Đồng bộ thành công: tạo ${log.recordsCreated}, cập nhật ${log.recordsUpdated} bản ghi`);
      } else if (log.status === 'SKIP') {
        message.warning('Bỏ qua: ' + log.errorMessage);
      } else {
        message.error('Đồng bộ thất bại: ' + log.errorMessage);
      }
      loadLogs(0);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveMaHikvision = async (nvId) => {
    await nhanVienApi.updateMaHikvision(nvId, editingCode);
    message.success('Đã cập nhật mã HIKVISION');
    setEditingNvId(null);
    loadEmployees();
  };

  const statusTag = (status) => {
    if (status === 'SUCCESS') return <Tag color="success" icon={<CheckCircleOutlined />}>Thành công</Tag>;
    if (status === 'ERROR')   return <Tag color="error"   icon={<CloseCircleOutlined />}>Lỗi</Tag>;
    if (status === 'SKIP')    return <Tag color="default" icon={<ClockCircleOutlined />}>Bỏ qua</Tag>;
    return <Tag>{status}</Tag>;
  };

  const deviceCols = [
    { title: 'IP',       dataIndex: 'ip',       width: 140 },
    { title: 'Port',     dataIndex: 'port',     width: 80  },
    { title: 'Username', dataIndex: 'username', width: 120 },
    {
      title: 'Trạng thái', dataIndex: 'enabled', width: 120,
      render: (v) => v
        ? <Badge status="success" text="Đang bật" />
        : <Badge status="default" text="Tắt" />,
    },
    {
      title: 'Đồng bộ cuối', dataIndex: 'lastSyncTime', width: 180,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Trạng thái sync', dataIndex: 'lastSyncStatus', width: 140,
      render: (v) => v ? statusTag(v) : '—',
    },
    {
      title: '',
      render: (_, rec) => (
        <Popconfirm title="Xóa thiết bị này?" onConfirm={() => handleDeleteDevice(rec.id)}>
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const nvCols = [
    { title: 'Họ tên', dataIndex: 'hoTen', flex: 1 },
    { title: 'Mã NV', dataIndex: 'maNv', width: 100 },
    { title: 'Chức vụ', dataIndex: 'chucVu', width: 110 },
    {
      title: 'Mã HIKVISION',
      dataIndex: 'maHikvision',
      width: 200,
      render: (val, rec) => editingNvId === rec.id ? (
        <Space>
          <Input
            size="small"
            value={editingCode}
            onChange={(e) => setEditingCode(e.target.value)}
            placeholder="Mã trên máy"
            style={{ width: 120 }}
            onPressEnter={() => handleSaveMaHikvision(rec.id)}
          />
          <Button size="small" type="primary" onClick={() => handleSaveMaHikvision(rec.id)}>Lưu</Button>
          <Button size="small" onClick={() => setEditingNvId(null)}>Hủy</Button>
        </Space>
      ) : (
        <Space>
          <Text type={val ? undefined : 'secondary'}>{val || '(chưa có)'}</Text>
          <Button
            size="small"
            type="link"
            onClick={() => { setEditingNvId(rec.id); setEditingCode(val || ''); }}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  const logCols = [
    {
      title: 'Thời gian', dataIndex: 'syncTime', width: 160,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Ngày đồng bộ', dataIndex: 'dateSynced', width: 130,
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Tổng events', dataIndex: 'recordsFetched', width: 110, align: 'center' },
    { title: 'Tạo mới',     dataIndex: 'recordsCreated', width: 90,  align: 'center', render: (v) => <Text type={v > 0 ? 'success' : undefined}>{v}</Text> },
    { title: 'Cập nhật',    dataIndex: 'recordsUpdated', width: 90,  align: 'center' },
    {
      title: 'Kích hoạt bởi', dataIndex: 'triggeredBy', width: 130,
      render: (v) => v === 'SCHEDULER' ? <Tag color="blue">Tự động</Tag> : <Tag color="orange">Thủ công</Tag>,
    },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: statusTag },
    {
      title: 'Lỗi', dataIndex: 'errorMessage',
      render: (v) => v
        ? <Tooltip title={v}><Text type="danger" style={{ maxWidth: 200 }} ellipsis>{v}</Text></Tooltip>
        : null,
    },
  ];

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        Máy chấm công HIKVISION SH-K1T9320MFWX
      </Title>

      {/* ── Cấu hình thiết bị ── */}
      <Card title={<><WifiOutlined style={{ marginRight: 8 }} />Cấu hình kết nối</>} style={{ marginBottom: 16 }}>
        <Form form={deviceForm} layout="inline" onFinish={handleSaveDevice} initialValues={{ port: 80, username: 'admin', enabled: true }}>
          <Form.Item name="ip" label="IP máy" rules={[{ required: true, message: 'Nhập IP' }]}>
            <Input placeholder="192.168.1.100" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="port" label="Port" rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="username" label="Username">
            <Input style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="enabled" label="Bật" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Lưu</Button>
              <Button
                icon={<WifiOutlined />}
                loading={testing}
                onClick={handleTestConnection}
              >
                Test kết nối
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {devices.length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Table
              columns={deviceCols}
              dataSource={devices}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </>
        )}
      </Card>

      {/* ── Đồng bộ thủ công ── */}
      <Card
        title={<><SyncOutlined style={{ marginRight: 8 }} />Đồng bộ thủ công</>}
        style={{ marginBottom: 16 }}
      >
        <Space>
          <Text>Ngày cần đồng bộ:</Text>
          <DatePicker
            value={syncDate}
            onChange={setSyncDate}
            format="DD/MM/YYYY"
            disabledDate={(d) => d && d.isAfter(dayjs())}
          />
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleSync}
          >
            Đồng bộ ngay
          </Button>
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">
            Hệ thống tự động đồng bộ mỗi ngày lúc <strong>23:30</strong>.
            Dùng chức năng này để đồng bộ lại dữ liệu hoặc đồng bộ cho ngày cụ thể.
          </Text>
        </div>
      </Card>

      {/* ── Mapping nhân viên ── */}
      <Card
        title="Mapping mã nhân viên HIKVISION"
        extra={<Text type="secondary">Gán mã NV trên máy để tăng độ chính xác khi đồng bộ</Text>}
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={nvCols}
          dataSource={employees}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
          scroll={{ y: 360 }}
        />
      </Card>

      {/* ── Lịch sử đồng bộ ── */}
      <Card title="Lịch sử đồng bộ">
        <Table
          columns={logCols}
          dataSource={logs}
          rowKey="id"
          size="small"
          loading={loadingLogs}
          pagination={{
            total: logTotal,
            current: logPage + 1,
            pageSize: 20,
            onChange: (p) => loadLogs(p - 1),
            showTotal: (t) => `Tổng ${t} lần đồng bộ`,
          }}
          scroll={{ x: 960 }}
        />
      </Card>
    </div>
  );
}
