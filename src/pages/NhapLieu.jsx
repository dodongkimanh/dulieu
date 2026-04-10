import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select, DatePicker, InputNumber, message, Popconfirm, Space, Tooltip, Badge, Tag, Modal, Form, Row, Col } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  SearchOutlined,
  FilterOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { donHangApi, authApi, kenhTiepThiApi } from '../api';
import dayjs from 'dayjs';

const { Option, OptGroup } = Select;

const STATUS_OPTIONS = [
  'Đã Giao Thành Công', 'Đang Chờ', 'KH Showroom', 'Hoàn hàng',
  'Đang vận chuyển', 'Đang giao', 'HỦY ĐƠN', 'Khách Đặt Cọc', 'Kho đang gọi hàng',
];

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

const vnd = (v) => Number(v || 0).toLocaleString('vi-VN');

const COLUMNS_DEFAULT = [
  { key: 'stt', label: 'STT', width: 36, type: 'index' },
  { key: 'ngay', label: 'Ngày', width: 100, type: 'date' },
  { key: 'maHoaDon', label: 'Mã Hóa Đơn', width: 100, type: 'text', style: { fontWeight: 600, color: '#4F46E5' } },
  { key: 'maDatHang', label: 'Mã Đặt Hàng', width: 100, type: 'text' },
  { key: 'khachHang', label: 'Khách Hàng', width: 130, type: 'text' },
  { key: 'sdt', label: 'SĐT', width: 100, type: 'text' },
  { key: 'sale', label: 'Sale', width: 110, type: 'select-sale' },
  { key: 'giaVon', label: 'Giá Vốn', width: 100, type: 'number' },
  { key: 'tongTienNiemYet', label: 'Tổng Niêm Yết', width: 110, type: 'number' },
  { key: 'giaBanLenDon', label: 'Giá Bán Lên Đơn', width: 110, type: 'number' },
  { key: 'cuocPhuTroi', label: 'Cước Phụ Trội', width: 95, type: 'number' },
  { key: 'giaThuThucTe', label: 'Giá Thu Thực Tế', width: 110, type: 'computed' },
  { key: 'tyLeCk', label: 'Tỷ Lệ CK %', width: 80, type: 'computed-pct' },
  { key: 'loiNhuanUocTinh', label: 'LN Ước Tính', width: 110, type: 'computed' },
  { key: 'tinhTrang', label: 'Tình Trạng', width: 145, type: 'select-status' },
  { key: 'maVanDon', label: 'Mã Vận Đơn', width: 120, type: 'text' },
  { key: 'chiPhiVanChuyen', label: 'CP Vận Chuyển', width: 100, type: 'number' },
  { key: 'dsVanChuyen', label: 'ĐS Vận Chuyển', width: 100, type: 'number' },
  { key: 'datCoc', label: 'Đặt Cọc/CK', width: 95, type: 'number' },
  { key: 'thuBanTrucTiep', label: 'Thu Bán TT', width: 100, type: 'number' },
  { key: 'tongThuKhach', label: 'Tổng Thu Khách', width: 110, type: 'computed' },
  { key: 'loiNhuanSauTru', label: 'LN Sau Trừ', width: 110, type: 'computed' },
  { key: 'page', label: 'Tùy Chọn', width: 180, type: 'select-page' },
  { key: 'maIdQuangCao', label: 'Mã ID QC', width: 120, type: 'text' },
  { key: 'ghiChu', label: 'Ghi Chú', width: 160, type: 'text' },
];

export default function NhapLieu() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [salesList, setSalesList] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, record: null });
  const [editForm] = Form.useForm();
  const [pageChannels, setPageChannels] = useState({});
  const tableRef = useRef(null);
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('nl_colWidths') || '{}');
      if (Object.keys(saved).length) return saved;
    } catch {}
    return Object.fromEntries(COLUMNS_DEFAULT.map(c => [c.key, c.width]));
  });

  useEffect(() => {
    sessionStorage.setItem('nl_colWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  const handleHeaderResizeStart = useCallback((colKey) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || COLUMNS_DEFAULT.find(c => c.key === colKey)?.width || 100;
    const onMouseMove = (ev) => {
      const diff = ev.clientX - startX;
      const newWidth = Math.max(40, startWidth + diff);
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
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
  }, [colWidths]);

  const COLUMNS = COLUMNS_DEFAULT.map(c => ({ ...c, width: colWidths[c.key] || c.width }));

  const fetchData = useCallback(async (pg = 1, size = 50) => {
    setLoading(true);
    try {
      const params = {
        pageNum: pg - 1, size,
        keyword: keyword || undefined,
        fromDate: dateRange[0]?.format('YYYY-MM-DD') || undefined,
        toDate: dateRange[1]?.format('YYYY-MM-DD') || undefined,
      };
      const res = await donHangApi.getAll(params);
      setData(res.data.content);
      setPagination({ current: pg, pageSize: size, total: res.data.totalElements });
      setEditedRows({});
    } catch { message.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [keyword, dateRange]);

  useEffect(() => { fetchData(); fetchSales(); fetchChannels(); }, []);

  const fetchSales = async () => {
    try { const res = await authApi.getSaleUsers(); setSalesList(res.data); } catch {}
  };

  const fetchChannels = async () => {
    try { const res = await kenhTiepThiApi.getGrouped(); setPageChannels(res.data || {}); } catch {}
  };

  const handleCellChange = (rowId, field, value) => {
    setData(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const updated = { ...row, [field]: value };
      
      // Extract values
      const ban = Number(updated.giaBanLenDon || 0);
      const phu = Number(updated.cuocPhuTroi || 0);
      const von = Number(updated.giaVon || 0);
      const niem = Number(updated.tongTienNiemYet || 0);
      const coc = Number(updated.datCoc || 0);
      const truc = Number(updated.thuBanTrucTiep || 0);
      const dsvc = Number(updated.dsVanChuyen || 0);
      const cpvc = Number(updated.chiPhiVanChuyen || 0);
      
      // CÔNG THỨC 1: Giá Thu Thực Tế = Giá Bán Lên Đơn - Cước Phụ Trội
      updated.giaThuThucTe = ban - phu;
      
      // CÔNG THỨC 2: Tỷ Lệ CK % = ((Niêm Yết - Giá Thu Thực Tế) / Niêm Yết) × 100
      updated.tyLeCk = niem > 0 ? ((niem - updated.giaThuThucTe) / niem) * 100 : 0;
      
      // CÔNG THỨC 3: Lợi Nhuận Ước Tính = Giá Thu Thực Tế - Giá Vốn
      updated.loiNhuanUocTinh = updated.giaThuThucTe - von;
      
      // CÔNG THỨC 4: Tổng Thu Khách = Đặt Cọc + Thu Bán Trực Tiếp + ĐS Vận Chuyển
      updated.tongThuKhach = coc + truc + dsvc;
      
      // CÔNG THỨC 5: Lợi Nhuận Sau Trừ VC
      // Khi có Tổng Thu Khách (> 0): = Tổng Thu Khách - Giá Vốn - CP Vận Chuyển
      // Khi chưa có Tổng Thu Khách (= 0): = LN Ước Tính
      updated.loiNhuanSauTru = updated.tongThuKhach > 0
        ? updated.tongThuKhach - von - cpvc
        : updated.loiNhuanUocTinh;
      
      return updated;
    }));
    setEditedRows(prev => ({ ...prev, [rowId]: true }));
  };

  const handleSaveRow = async (record) => {
    try {
      setSaving(true);
      const payload = { ...record };
      if (payload.ngay && typeof payload.ngay === 'string') {
        // already string
      } else if (payload.ngay && payload.ngay.format) {
        payload.ngay = payload.ngay.format('YYYY-MM-DD');
      }
      await donHangApi.update(record.id, payload);
      message.success(`Đã lưu đơn ${record.maHoaDon || record.id}`);
      setEditedRows(prev => { const n = { ...prev }; delete n[record.id]; return n; });
    } catch { message.error('Lỗi khi lưu'); }
    finally { setSaving(false); }
  };

  const handleSaveAll = async () => {
    const editedIds = Object.keys(editedRows);
    if (editedIds.length === 0) { message.info('Không có thay đổi'); return; }
    setSaving(true);
    let success = 0;
    for (const id of editedIds) {
      const row = data.find(r => r.id === Number(id));
      if (!row) continue;
      try {
        const payload = { ...row };
        if (payload.ngay && payload.ngay.format) payload.ngay = payload.ngay.format('YYYY-MM-DD');
        await donHangApi.update(row.id, payload);
        success++;
      } catch {}
    }
    message.success(`Đã lưu ${success}/${editedIds.length} đơn hàng`);
    setEditedRows({});
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try { await donHangApi.delete(id); message.success('Đã xóa'); fetchData(pagination.current, pagination.pageSize); }
    catch { message.error('Lỗi khi xóa'); }
  };

  const handleExport = async () => {
    try {
      const params = {
        keyword: keyword || undefined,
        fromDate: dateRange[0]?.format('YYYY-MM-DD') || undefined,
        toDate: dateRange[1]?.format('YYYY-MM-DD') || undefined,
      };
      const res = await donHangApi.export(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Nhap-Lieu_${dayjs().format('DD-MM-YYYY_HHmmss')}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Xuất Excel thành công!');
    } catch { message.error('Lỗi khi xuất Excel'); }
  };

  const handleAddRow = async () => {
    try {
      const newOrder = { ngay: dayjs().format('YYYY-MM-DD'), tinhTrang: 'Đang Chờ' };
      await donHangApi.create(newOrder);
      message.success('Đã thêm dòng mới');
      fetchData(1, pagination.pageSize);
    } catch { message.error('Lỗi khi thêm'); }
  };

  const handleOpenEdit = (record) => {
    setEditModal({ open: true, record });
    editForm.setFieldsValue({
      ...record,
      ngay: record.ngay ? dayjs(record.ngay) : null,
    });
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = { ...editModal.record, ...values };
      if (payload.ngay && payload.ngay.format) payload.ngay = payload.ngay.format('YYYY-MM-DD');
      // Recalculate fields
      const ban = Number(payload.giaBanLenDon || 0);
      const phu = Number(payload.cuocPhuTroi || 0);
      const von = Number(payload.giaVon || 0);
      const niem = Number(payload.tongTienNiemYet || 0);
      const coc = Number(payload.datCoc || 0);
      const truc = Number(payload.thuBanTrucTiep || 0);
      const dsvc = Number(payload.dsVanChuyen || 0);
      const cpvc = Number(payload.chiPhiVanChuyen || 0);
      payload.giaThuThucTe = ban - phu;
      payload.tyLeCk = niem > 0 ? ((niem - payload.giaThuThucTe) / niem) * 100 : 0;
      payload.loiNhuanUocTinh = payload.giaThuThucTe - von;
      payload.tongThuKhach = coc + truc + dsvc;
      payload.loiNhuanSauTru = payload.tongThuKhach > 0
        ? payload.tongThuKhach - von - cpvc
        : payload.loiNhuanUocTinh;

      await donHangApi.update(editModal.record.id, payload);
      message.success(`Đã cập nhật đơn ${editModal.record.maHoaDon || editModal.record.id}`);
      setEditModal({ open: false, record: null });
      fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e.errorFields) return;
      message.error('Lỗi khi cập nhật');
    }
  };

  const editedCount = Object.keys(editedRows).length;

  // Compute summary row
  const summary = data.reduce((acc, row) => {
    acc.giaVon += Number(row.giaVon || 0);
    acc.tongTienNiemYet += Number(row.tongTienNiemYet || 0);
    acc.giaBanLenDon += Number(row.giaBanLenDon || 0);
    acc.cuocPhuTroi += Number(row.cuocPhuTroi || 0);
    acc.giaThuThucTe += Number(row.giaThuThucTe || 0);
    acc.loiNhuanUocTinh += Number(row.loiNhuanUocTinh || 0);
    acc.chiPhiVanChuyen += Number(row.chiPhiVanChuyen || 0);
    acc.dsVanChuyen += Number(row.dsVanChuyen || 0);
    acc.datCoc += Number(row.datCoc || 0);
    acc.thuBanTrucTiep += Number(row.thuBanTrucTiep || 0);
    acc.tongThuKhach += Number(row.tongThuKhach || 0);
    acc.loiNhuanSauTru += Number(row.loiNhuanSauTru || 0);
    return acc;
  }, { giaVon: 0, tongTienNiemYet: 0, giaBanLenDon: 0, cuocPhuTroi: 0, giaThuThucTe: 0, loiNhuanUocTinh: 0, chiPhiVanChuyen: 0, dsVanChuyen: 0, datCoc: 0, thuBanTrucTiep: 0, tongThuKhach: 0, loiNhuanSauTru: 0 });

  const renderCell = (col, record, index) => {
    const rowEdited = editedRows[record.id];
    if (col.type === 'index') {
      return <span className="nl-stt">{(pagination.current - 1) * pagination.pageSize + index + 1}</span>;
    }
    if (col.type === 'computed') {
      const val = Number(record[col.key] || 0);
      const isProfit = col.key.includes('loiNhuan');
      return <span className={`nl-computed ${isProfit ? (val >= 0 ? 'profit' : 'loss') : ''}`}>{vnd(val)}</span>;
    }
    if (col.type === 'computed-pct') {
      return <span className="nl-computed">{Number(record[col.key] || 0).toFixed(2)}%</span>;
    }
    if (col.type === 'date') {
      return (
        <DatePicker
          value={record.ngay ? dayjs(record.ngay) : null}
          onChange={(d) => handleCellChange(record.id, 'ngay', d ? d.format('YYYY-MM-DD') : null)}
          format="DD/MM/YYYY"
          size="small"
          variant="borderless"
          className="nl-date-picker"
          allowClear={false}
        />
      );
    }
    if (col.type === 'select-status') {
      const sc = statusColors[record.tinhTrang] || { color: '#64748B', bg: '#F1F5F9' };
      return (
        <Select
          value={record.tinhTrang}
          onChange={(v) => handleCellChange(record.id, 'tinhTrang', v)}
          size="small"
          variant="borderless"
          className="nl-select"
          popupMatchSelectWidth={false}
          style={{ width: '100%' }}
        >
          {STATUS_OPTIONS.map(s => {
            const c = statusColors[s] || {};
            return <Option key={s} value={s}><span style={{ color: c.color, fontWeight: 600, fontSize: 12 }}>{s}</span></Option>;
          })}
        </Select>
      );
    }
    if (col.type === 'select-sale') {
      return (
        <Select
          value={record.sale}
          onChange={(v) => handleCellChange(record.id, 'sale', v)}
          size="small"
          variant="borderless"
          className="nl-select"
          allowClear
          showSearch
          optionFilterProp="children"
          popupMatchSelectWidth={false}
          style={{ width: '100%' }}
        >
          {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
      );
    }
    if (col.type === 'number') {
      return (
        <InputNumber
          value={record[col.key]}
          onChange={(v) => handleCellChange(record.id, col.key, v)}
          size="small"
          variant="borderless"
          className="nl-number"
          min={0}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => v.replace(/,/g, '')}
          style={{ width: '100%' }}
          controls={false}
        />
      );
    }
    if (col.type === 'select-page') {
      return (
        <Select
          value={record[col.key]}
          onChange={(v) => handleCellChange(record.id, col.key, v)}
          size="small"
          variant="borderless"
          className="nl-select"
          allowClear
          showSearch
          optionFilterProp="children"
          popupMatchSelectWidth={false}
          style={{ width: '100%' }}
          popupStyle={{ minWidth: 340 }}
        >
          {Object.entries(pageChannels).map(([category, items]) => (
            <OptGroup key={category} label={<span style={{ fontWeight: 600, color: '#4F46E5', fontSize: 11 }}>{category}</span>}>
              {items.map(item => (
                <Option key={item.name} value={item.name}>{item.name}</Option>
              ))}
            </OptGroup>
          ))}
        </Select>
      );
    }
    // text
    return (
      <Input
        value={record[col.key]}
        onChange={(e) => handleCellChange(record.id, col.key, e.target.value)}
        size="small"
        variant="borderless"
        className="nl-text"
      />
    );
  };

  const renderSummaryCell = (col) => {
    if (col.type === 'index') return <span className="nl-summary-label">Σ</span>;
    if (col.key === 'ngay' || col.key === 'maHoaDon' || col.key === 'maDatHang' || col.key === 'khachHang' || col.key === 'sdt' || col.key === 'sale' || col.key === 'tinhTrang' || col.key === 'maVanDon' || col.key === 'page' || col.key === 'maIdQuangCao' || col.key === 'ghiChu') return null;
    if (col.type === 'computed-pct') return null;
    const val = summary[col.key];
    if (val === undefined) return null;
    const isProfit = col.key.includes('loiNhuan');
    return <span className={`nl-summary-val ${isProfit ? (val >= 0 ? 'profit' : 'loss') : ''}`}>{vnd(val)}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="nhaplieu-page">
      {/* Toolbar */}
      <div className="nl-toolbar">
        <div className="nl-toolbar-left">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow} size="middle">Thêm dòng</Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={saving}
            disabled={editedCount === 0}
            type={editedCount > 0 ? 'primary' : 'default'}
            style={editedCount > 0 ? { background: '#10B981', borderColor: '#10B981' } : {}}
            size="middle"
          >
            Lưu tất cả {editedCount > 0 && <Badge count={editedCount} size="small" style={{ marginLeft: 6, backgroundColor: '#fff', color: '#10B981', boxShadow: 'none' }} />}
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExport} size="middle" style={{ color: '#10B981' }}>Excel</Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(pagination.current, pagination.pageSize)} size="middle">Tải lại</Button>
        </div>
        <div className="nl-toolbar-right">
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => fetchData(1, pagination.pageSize)}
            style={{ width: 200 }}
            size="middle"
            allowClear
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v || [null, null])}
            format="DD/MM/YYYY"
            size="middle"
            style={{ width: 240 }}
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1, pagination.pageSize)} size="middle">Lọc</Button>
          <div className="nl-pagination-info">
            <span>{pagination.total} đơn</span>
            <Button size="small" icon={<LeftOutlined />} disabled={pagination.current <= 1} onClick={() => fetchData(pagination.current - 1, pagination.pageSize)} />
            <span className="nl-page-num">Trang {pagination.current}/{Math.ceil(pagination.total / pagination.pageSize) || 1}</span>
            <Button size="small" icon={<RightOutlined />} disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)} onClick={() => fetchData(pagination.current + 1, pagination.pageSize)} />
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="nl-spreadsheet-wrapper" ref={tableRef}>
        <div className="nl-spreadsheet" style={{ minWidth: COLUMNS.reduce((s, c) => s + c.width, 0) + 90 }}>
          {/* Header */}
          <div className="nl-header-row">
            {COLUMNS.map(col => (
              <div key={col.key} className="nl-header-cell" style={{ width: col.width, minWidth: col.width, position: 'relative' }}>
                {col.label}
                <div
                  className="nl-resize-handle"
                  onMouseDown={handleHeaderResizeStart(col.key)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
            <div className="nl-header-cell nl-action-col" style={{ width: 90 }}>Thao tác</div>
          </div>

          {/* Summary Row */}
          <div className="nl-summary-row">
            {COLUMNS.map(col => (
              <div key={col.key} className="nl-summary-cell" style={{ width: col.width, minWidth: col.width }}>
                {renderSummaryCell(col)}
              </div>
            ))}
            <div className="nl-summary-cell" style={{ width: 90 }}></div>
          </div>

          {/* Data Rows */}
          {loading ? (
            <div className="nl-loading">Đang tải dữ liệu...</div>
          ) : data.length === 0 ? (
            <div className="nl-empty">Không có dữ liệu</div>
          ) : data.map((record, index) => (
            <div key={record.id} className={`nl-data-row ${editedRows[record.id] ? 'edited' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}>
              {COLUMNS.map(col => (
                <div key={col.key} className={`nl-data-cell ${col.type === 'computed' || col.type === 'computed-pct' ? 'computed' : ''}`} style={{ width: col.width, minWidth: col.width }}>
                  {renderCell(col, record, index)}
                </div>
              ))}
              <div className="nl-data-cell nl-action-col" style={{ width: 90 }}>
                <Space size={0}>
                  <Tooltip title="Sửa"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} style={{ color: '#4F46E5' }} /></Tooltip>
                  {editedRows[record.id] && (
                    <Tooltip title="Lưu"><Button type="text" size="small" icon={<SaveOutlined />} onClick={() => handleSaveRow(record)} style={{ color: '#10B981' }} /></Tooltip>
                  )}
                  <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                    <Tooltip title="Xóa"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
                  </Popconfirm>
                </Space>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>✏️ Chỉnh sửa đơn hàng {editModal.record?.maHoaDon || ''}</span>}
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, record: null })}
        onOk={handleEditSubmit}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        width={900}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' } }}
      >
        <Form form={editForm} layout="vertical" size="middle">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Mã Hóa Đơn" name="maHoaDon">
                <Input style={{ fontWeight: 700, color: '#4F46E5' }} placeholder="Để trống sẽ tự tạo" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ngày" name="ngay">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mã Đặt Hàng" name="maDatHang">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Khách Hàng" name="khachHang">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="SĐT" name="sdt">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Sale" name="sale">
                <Select allowClear showSearch optionFilterProp="children" placeholder="Chọn Sale">
                  {salesList.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Giá Vốn" name="giaVon">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tổng Niêm Yết" name="tongTienNiemYet">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giá Bán Lên Đơn" name="giaBanLenDon">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Cước Phụ Trội" name="cuocPhuTroi">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tình Trạng" name="tinhTrang">
                <Select placeholder="Chọn trạng thái">
                  {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mã Vận Đơn" name="maVanDon">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="CP Vận Chuyển" name="chiPhiVanChuyen">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ĐS Vận Chuyển" name="dsVanChuyen">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Đặt Cọc/CK" name="datCoc">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Thu Bán Trực Tiếp" name="thuBanTrucTiep">
                <InputNumber min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tùy Chọn" name="page">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn kênh tiếp thị"
                  optionFilterProp="children"
                  popupMatchSelectWidth={false}
                  popupStyle={{ minWidth: 340 }}
                >
                  {Object.entries(pageChannels).map(([category, items]) => (
                    <OptGroup key={category} label={<span style={{ fontWeight: 600, color: '#4F46E5', fontSize: 12 }}>{category}</span>}>
                      {items.map(item => (
                        <Option key={item.name} value={item.name}>{item.name}</Option>
                      ))}
                    </OptGroup>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mã ID Bài QC" name="maIdQuangCao">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Ghi Chú" name="ghiChu">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </motion.div>
  );
}
