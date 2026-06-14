import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Input, InputNumber, Select, Tag, Popconfirm, message, Tooltip, Badge } from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  CalendarOutlined,
  FilterOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { DatePicker } from 'antd';
import { motion } from 'framer-motion';
import { donHangApi, authApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;

const vnd = (v) => Number(v || 0).toLocaleString('vi-VN');

const statusColors = {
  'Đã Giao Thành Công': { color: '#059669', bg: '#D1FAE5' },
  'Đang Chờ': { color: '#D97706', bg: '#FEF3C7' },
  'KH Showroom': { color: '#2563EB', bg: '#DBEAFE' },
  'Hoàn hàng': { color: '#DC2626', bg: '#FEE2E2' },
  'Đang vận chuyển': { color: '#0891B2', bg: '#CFFAFE' },
  'Đang giao': { color: '#7C3AED', bg: '#EDE9FE' },
  'HỦY ĐƠN': { color: '#991B1B', bg: '#FEE2E2' },
  'Khách Đặt Cọc': { color: '#B45309', bg: '#FEF3C7' },
  'Kho đang gọi hàng': { color: '#0D9488', bg: '#CCFBF1' },
};

// Inline editable note cell
function NoteCell({ value, recordId, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(value || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const save = async (e) => {
    e?.stopPropagation();
    setEditing(false);
    if (draft !== (value || '')) {
      await onSave(recordId, draft);
    }
  };

  const cancel = (e) => {
    e?.stopPropagation();
    setEditing(false);
    setDraft(value || '');
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={save}
          onBlur={save}
          style={{ fontSize: 12, width: 140 }}
        />
        <Button type="text" size="small" icon={<CheckOutlined />} onClick={save} style={{ color: '#059669', padding: 2 }} />
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={cancel} style={{ color: '#94A3B8', padding: 2 }} />
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', minHeight: 22 }}
      onClick={startEdit}
    >
      {value ? (
        <Tooltip title={value}>
          <span style={{ color: '#374151', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {value}
          </span>
        </Tooltip>
      ) : (
        <span style={{ color: '#CBD5E1', fontSize: 11, fontStyle: 'italic' }}>Thêm ghi chú...</span>
      )}
      <EditOutlined style={{ fontSize: 10, color: '#CBD5E1', flexShrink: 0 }} />
    </div>
  );
}

function HoaHongCell({ value, recordId, onSave, canEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || 0);
  const inputRef = useRef(null);

  const val = Number(value || 0);

  if (!canEdit) {
    return (
      <div style={{ textAlign: 'right', minHeight: 22 }}>
        {val > 0
          ? <b style={{ color: '#059669', fontSize: 13 }}>{val.toLocaleString('vi-VN')}</b>
          : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>
        }
      </div>
    );
  }

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(value || 0);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const save = async (e) => {
    e?.stopPropagation();
    setEditing(false);
    if (draft !== (value || 0)) {
      await onSave(recordId, draft || 0);
    }
  };

  const cancel = (e) => {
    e?.stopPropagation();
    setEditing(false);
    setDraft(value || 0);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <InputNumber
          ref={inputRef}
          size="small"
          value={draft}
          onChange={(v) => setDraft(v)}
          onPressEnter={save}
          onBlur={save}
          min={0}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => v.replace(/,/g, '')}
          controls={false}
          style={{ fontSize: 12, width: 110 }}
        />
        <Button type="text" size="small" icon={<CheckOutlined />} onClick={save} style={{ color: '#059669', padding: 2 }} />
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={cancel} style={{ color: '#94A3B8', padding: 2 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, cursor: 'pointer', minHeight: 22 }} onClick={startEdit}>
      {val > 0
        ? <b style={{ color: '#059669', fontSize: 13 }}>{val.toLocaleString('vi-VN')}</b>
        : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>
      }
      <EditOutlined style={{ fontSize: 10, color: '#CBD5E1', flexShrink: 0 }} />
    </div>
  );
}

export default function DonHang() {
  const { isAdmin, isKeToan, isSaler, user } = useAuth();
  const canEdit = isAdmin || isKeToan;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 9999, total: 0 });
  const [totals, setTotals] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [keyword, setKeyword] = useState('');
  const [sale, setSale] = useState(isSaler ? (user?.fullName || null) : null);
  const [salesList, setSalesList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const getMonthRange = (m) => ({
    fromDate: m.startOf('month').format('YYYY-MM-DD'),
    toDate: m.endOf('month').format('YYYY-MM-DD'),
  });

  const getMonthRangeLabel = (m) =>
    `${m.startOf('month').format('DD/MM')} – ${m.endOf('month').format('DD/MM/YYYY')}`;

  const fetchData = useCallback(async (pg = 1, size = 9999, overrides = {}) => {
    setLoading(true);
    try {
      const { fromDate, toDate } = getMonthRange(overrides.month ?? selectedMonth);
      const params = {
        pageNum: pg - 1,
        size,
        doanhSoMode: true,
        fromDate,
        toDate,
        keyword: (overrides.keyword ?? keyword) || undefined,
        sale: (overrides.sale !== undefined ? overrides.sale : sale) || undefined,
      };
      const res = await donHangApi.getAll(params);
      setData(res.data.content);
      setPagination({ current: pg, pageSize: size, total: res.data.totalElements });
      setTotals(res.data.totals || null);
    } catch {
      message.error('Không thể tải dữ liệu doanh số');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, keyword, sale]);

  useEffect(() => {
    fetchData();
    if (!isSaler) {
      authApi.getSaleUsers().then(res => setSalesList(res.data || [])).catch(() => {});
    }
  }, []);

  const handleMonthChange = (m) => {
    if (!m) return;
    setSelectedMonth(m);
    fetchData(1, pagination.pageSize, { month: m });
  };

  const handleSearch = () => fetchData(1, pagination.pageSize);

  const handleReset = () => {
    const newSale = isSaler ? (user?.fullName || null) : null;
    setKeyword('');
    setSale(newSale);
    setSelectedMonth(dayjs());
    fetchData(1, pagination.pageSize, { keyword: '', sale: newSale, month: dayjs() });
  };

  const handleDelete = async (id) => {
    try {
      await donHangApi.delete(id);
      message.success('Xóa thành công');
      fetchData(pagination.current, pagination.pageSize);
    } catch {
      message.error('Lỗi khi xóa');
    }
  };

  const handleSaveNote = async (id, ghiChuDoanhSo) => {
    try {
      await donHangApi.updateGhiChuDoanhSo(id, ghiChuDoanhSo);
      setData(prev => prev.map(r => r.id === id ? { ...r, ghiChuDoanhSo } : r));
    } catch {
      message.error('Lỗi khi lưu ghi chú');
    }
  };

  const handleSaveHoaHong = async (id, hoaHong) => {
    try {
      await donHangApi.updateHoaHong(id, hoaHong);
      setData(prev => prev.map(r => r.id === id ? { ...r, hoaHong } : r));
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || '';
      message.error(`Lỗi ${status || ''}: ${msg || 'không lưu được hoa hồng'}`, 6);
    }
  };

  const handleExport = async () => {
    try {
      const { fromDate, toDate } = getMonthRange(selectedMonth);
      const params = {
        doanhSoMode: true,
        fromDate,
        toDate,
        keyword: keyword || undefined,
        sale: sale || undefined,
      };
      const res = await donHangApi.export(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DoanhSoThang_${selectedMonth.format('MM-YYYY')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Lỗi khi xuất Excel');
    }
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      width: 100,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '',
    },
    {
      title: 'Mã ĐH',
      dataIndex: 'maDatHang',
      width: 120,
      render: (v, r) => (
        <span style={{ color: '#4F46E5', fontWeight: 600 }}>
          {v || r.maHoaDon || '—'}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'khachHang',
      width: 155,
      ellipsis: true,
      render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'SĐT',
      dataIndex: 'sdt',
      width: 115,
    },
    {
      title: 'Sale',
      dataIndex: 'sale',
      width: 125,
    },
    {
      title: 'Giá Bán',
      dataIndex: 'giaBanLenDon',
      width: 125,
      align: 'right',
      render: (v) => <span style={{ fontWeight: 500 }}>{vnd(v)}</span>,
    },
    {
      title: 'Giá Thu TT',
      dataIndex: 'giaThuThucTe',
      width: 125,
      align: 'right',
      render: (v) => <b style={{ color: '#059669' }}>{vnd(v)}</b>,
    },
    {
      title: 'Chiết Khấu',
      dataIndex: 'tyLeCk',
      width: 95,
      align: 'center',
      render: (v) => (
        <span style={{ color: '#D97706', fontWeight: 600 }}>
          {Number(v || 0).toFixed(1)}%
        </span>
      ),
    },
    {
      title: '% DS',
      dataIndex: 'huongDoanhSo',
      width: 80,
      align: 'center',
      render: (v) => v ? (
        <span style={{ color: '#7C3AED', fontWeight: 600, fontSize: 12 }}>{v}</span>
      ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>,
    },
    {
      title: 'DS Hưởng',
      dataIndex: 'dsHuong',
      width: 125,
      align: 'right',
      render: (v) => <b style={{ color: '#2563EB' }}>{vnd(v)}</b>,
    },
    {
      title: 'Hoa Hồng',
      dataIndex: 'hoaHong',
      width: 145,
      align: 'right',
      render: (v, record) => (
        <HoaHongCell value={v} recordId={record.id} onSave={handleSaveHoaHong} canEdit={canEdit} />
      ),
    },
    {
      title: 'Tình Trạng',
      dataIndex: 'tinhTrang',
      width: 155,
      render: (v) => {
        const sc = statusColors[v] || { color: '#64748B', bg: '#F1F5F9' };
        return (
          <Tag style={{ background: sc.bg, color: sc.color, border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghiChuDoanhSo',
      width: 170,
      render: (v, record) => (
        <NoteCell value={v} recordId={record.id} onSave={handleSaveNote} />
      ),
    },
    ...(canEdit ? [{
      title: '',
      width: 50,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
          <Tooltip title="Xóa">
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} danger />
          </Tooltip>
        </Popconfirm>
      ),
    }] : []),
  ];

  const summaryRow = () => {
    if (!totals) return null;
    if (isSaler) {
      const t = data.reduce((acc, r) => ({
        giaBanLenDon: acc.giaBanLenDon + Number(r.giaBanLenDon || 0),
        giaThuThucTe: acc.giaThuThucTe + Number(r.giaThuThucTe || 0),
        dsHuong:      acc.dsHuong      + Number(r.dsHuong      || 0),
        hoaHong:      acc.hoaHong      + Number(r.hoaHong      || 0),
      }), { giaBanLenDon: 0, giaThuThucTe: 0, dsHuong: 0, hoaHong: 0 });
      return (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ background: '#F0F9FF', fontWeight: 700 }}>
            <Table.Summary.Cell index={0} colSpan={5}>
              <span style={{ color: '#4F46E5', fontSize: 13 }}>Tổng cộng ({data.length} đơn)</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">
              <span style={{ color: '#374151' }}>{vnd(t.giaBanLenDon)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <b style={{ color: '#059669' }}>{vnd(t.giaThuThucTe)}</b>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} />
            <Table.Summary.Cell index={8} />
            <Table.Summary.Cell index={9} align="right">
              <b style={{ color: '#2563EB' }}>{vnd(t.dsHuong)}</b>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={10} align="right">
              <b style={{ color: '#059669' }}>{vnd(t.hoaHong)}</b>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={11} colSpan={2} />
          </Table.Summary.Row>
        </Table.Summary>
      );
    }
    const colCount = canEdit ? 3 : 2;
    return (
      <Table.Summary fixed>
        <Table.Summary.Row style={{ background: '#F0F9FF', fontWeight: 700 }}>
          <Table.Summary.Cell index={0} colSpan={5}>
            <span style={{ color: '#4F46E5', fontSize: 13 }}>Tổng cộng ({pagination.total} đơn)</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={5} align="right">
            <span style={{ color: '#374151' }}>{vnd(totals.giaBanLenDon)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={6} align="right">
            <span style={{ color: '#059669' }}>{vnd(totals.giaThuThucTe)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={7} />
          <Table.Summary.Cell index={8} />
          <Table.Summary.Cell index={9} align="right">
            <span style={{ color: '#2563EB' }}>{vnd(totals.dsHuong)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={10} align="right">
            <span style={{ color: '#059669' }}>{vnd(totals.hoaHong)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={11} colSpan={colCount} />
        </Table.Summary.Row>
      </Table.Summary>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="page-header-premium">
        <div className="page-header-left">
          <div className="page-header-info">
            <CalendarOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Doanh Số Tháng</span>
            <Badge count={pagination.total} showZero style={{ backgroundColor: '#059669' }} overflowCount={9999} />
          </div>
        </div>
        <div className="page-header-right">
          <Tooltip title={`Đang xem: ${getMonthRangeLabel(selectedMonth)}`} placement="bottom">
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              format="MM/YYYY"
              allowClear={false}
              style={{ width: 130 }}
            />
          </Tooltip>
          <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
            {getMonthRangeLabel(selectedMonth)}
          </span>
          <Input
            placeholder="Tìm kiếm KH, SĐT..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 190 }}
            allowClear
          />
          {!isSaler && (
            <Tooltip title="Lọc theo Sale">
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
                ghost={showFilters}
              >
                Bộ lọc
              </Button>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip title="Xuất Excel">
              <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ color: '#10B981' }}>Excel</Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && !isSaler && (
        <motion.div
          className="filter-panel-premium"
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
          transition={{ duration: 0.25 }}
        >
          <div className="filter-panel-inner">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Select
                placeholder="Lọc theo Sale"
                value={sale}
                onChange={(v) => setSale(v)}
                allowClear
                style={{ width: 200 }}
              >
                {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </div>
            <div className="filter-actions">
              <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tổng kết doanh số cho SALER — tính client-side vì backend không trả totals cho SALER */}
      {isSaler && data.length > 0 && (() => {
        const t = data.reduce((acc, r) => ({
          giaBanLenDon: acc.giaBanLenDon + Number(r.giaBanLenDon || 0),
          giaThuThucTe: acc.giaThuThucTe + Number(r.giaThuThucTe || 0),
          dsHuong:      acc.dsHuong      + Number(r.dsHuong      || 0),
          hoaHong:      acc.hoaHong      + Number(r.hoaHong      || 0),
        }), { giaBanLenDon: 0, giaThuThucTe: 0, dsHuong: 0, hoaHong: 0 });
        return (
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Số đơn',         value: `${data.length} đơn`,         color: '#4F46E5' },
              { label: 'Tổng Giá Bán',   value: `${vnd(t.giaBanLenDon)} đ`,   color: '#374151' },
              { label: 'Tổng Giá Thu TT',value: `${vnd(t.giaThuThucTe)} đ`,   color: '#059669' },
              { label: 'Tổng DS Hưởng',  value: `${vnd(t.dsHuong)} đ`,        color: '#2563EB' },
              { label: 'Tổng Hoa Hồng',  value: `${vnd(t.hoaHong)} đ`,        color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 20px', minWidth: 170 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Table */}
      <motion.div className="sg-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1250 }}
          size="middle"
          summary={summaryRow}
          rowClassName="clickable-row"
        />
      </motion.div>
    </motion.div>
  );
}
