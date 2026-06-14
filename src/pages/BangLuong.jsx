import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, DatePicker, InputNumber, message, Tag, Badge, Space, Select, Empty } from 'antd';
import { ReloadOutlined, SaveOutlined, DollarOutlined, LeftOutlined, RightOutlined, LineChartOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { bangLuongApi, nhanVienApi, luongCoCauSaleApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;

const vnd = (v) => Number(v || 0).toLocaleString('vi-VN');

const LOAI_COLORS = {
  HV: { color: '#D97706', bg: '#FEF3C7' },
  TV: { color: '#0891B2', bg: '#CFFAFE' },
  CT: { color: '#059669', bg: '#D1FAE5' },
};

const CHUC_VU_LABELS = {
  SALE: 'Sale', VNVP: 'VNVP', TRUONG_NHOM: 'Trưởng Nhóm', LAI_XE: 'Lái Xe',
};

const SALARY_TIERS = [
  { min: 0,           max: 50,  luongCung: 5,    hh: 0.80 },
  { min: 50,          max: 75,  luongCung: 5.5,  hh: 1.00 },
  { min: 75,          max: 100, luongCung: 6,    hh: 1.00 },
  { min: 100,         max: 125, luongCung: 7,    hh: 1.10 },
  { min: 125,         max: 150, luongCung: 7.5,  hh: 1.10 },
  { min: 150,         max: 175, luongCung: 8,    hh: 1.20 },
  { min: 175,         max: 200, luongCung: 8.5,  hh: 1.20, thuong: '+1%' },
  { min: 200,         max: 250, luongCung: 9,    hh: 1.40, thuong: '+2%' },
  { min: 250,         max: 300, luongCung: 9.5,  hh: 1.50, thuong: '+3%' },
  { min: 300,         max: 350, luongCung: 10,   hh: 1.60, thuong: '+3%' },
  { min: 350,         max: 400, luongCung: 11,   hh: 1.70, thuong: '+3%' },
  { min: 400,         max: 450, luongCung: 13,   hh: 1.80, thuong: '+3%' },
  { min: 450,         max: 500, luongCung: 14,   hh: 1.90, thuong: '+3%' },
  { min: 500, max: Infinity,    luongCung: 15,   hh: 2.00, thuong: '+3%' },
];

const getTierLabel = (ds) => {
  const dsTr = ds / 1_000_000;
  const t = SALARY_TIERS.find(r => dsTr >= r.min && dsTr < r.max);
  if (!t) return '–';
  return `${t.luongCung}tr / ${t.hh}%${t.thuong ? ' ' + t.thuong : ''}`;
};

const GROUPS = [
  { key: 'sale',     label: 'Lương Sale',      roles: ['SALE', 'VNSale', 'TRUONG_NHOM'], color: '#4F46E5', bg: '#EEF2FF' },
  { key: 'vanphong', label: 'Lương Văn Phòng', roles: ['VNVP'],                          color: '#0891B2', bg: '#E0F2FE' },
  { key: 'laixe',    label: 'Lương Lái Xe',    roles: ['LAI_XE'],                         color: '#059669', bg: '#ECFDF5' },
];

const getGroupKey = (chucVu) => {
  for (const g of GROUPS) {
    if (g.roles.includes(chucVu)) return g.key;
  }
  return 'vanphong';
};

const TOTAL_COLS = 19;

function EditableCell({ value, rowId, field, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    setEditing(false);
    if (draft !== value) onSave(rowId, field, draft);
  };

  if (editing) return (
    <InputNumber
      autoFocus
      value={draft}
      onChange={setDraft}
      onBlur={save}
      onPressEnter={save}
      min={0}
      formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={v => v.replace(/,/g, '')}
      size="small"
      style={{ width: 110 }}
      controls={false}
    />
  );

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      style={{ cursor: 'pointer', color: '#374151', borderBottom: '1px dashed #CBD5E1', display: 'inline-block', minWidth: 60 }}
    >
      {vnd(value)}
    </span>
  );
}

// Shared computation helper used in both normal view and compare view
function computeTongLuong(emp) {
  const tongCong = Number(emp.soCongChinhThuc || 0);
  const luongCT = Math.round((emp.luongCung || 0) * Number(emp.soCongChinhThuc || 0) / 26);
  const tienCongPhep = Math.round((emp.luongCung || 0) / 26 * Number(emp.soCongNghiLe || 0));
  const chuyenCan = tongCong >= 26 ? 500_000 : 0;
  const tongLuong = luongCT + tienCongPhep
    + Number(emp.hoaHongDS || 0) + Number(emp.thuongThem || 0)
    + Number(emp.phuCap || 0) + Number(emp.tienTangCa || 0) + Number(emp.phuCapLaiXe || 0)
    + Number(emp.simDt || 0) + Number(emp.chiVt || 0) + Number(emp.hoaHong || 0) + chuyenCan
    - Number(emp.ungLuong || 0) - Number(emp.phat || 0)
    - 150_000 - Number(emp.phatTuChamCong || 0);
  return { tongCong, luongCT, tienCongPhep, chuyenCan, tongLuong };
}

export default function BangLuong() {
  const { isEmployeeView, isAdmin, isKeToan } = useAuth();
  const [month, setMonth] = useState(dayjs());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAdj, setPendingAdj] = useState({});

  // Cơ cấu lương Sale — load từ DB, admin có thể sửa
  const [saleTiersDb, setSaleTiersDb] = useState([]);
  const [saleDraft, setSaleDraft] = useState({});   // { id: { luongCung, hoaHongBp, thuongBp } }
  const [saleSaving, setSaleSaving] = useState(false);

  useEffect(() => {
    if (isAdmin || isKeToan) {
      luongCoCauSaleApi.getAll()
        .then(res => {
          const list = res.data || [];
          setSaleTiersDb(list);
          const draft = {};
          list.forEach(t => { draft[t.id] = { luongCung: t.luongCung, hoaHongBp: t.hoaHongBp, thuongBp: t.thuongBp }; });
          setSaleDraft(draft);
        })
        .catch(() => {});
    }
  }, [isAdmin, isKeToan]);

  const handleSaveSaleTiers = async () => {
    setSaleSaving(true);
    try {
      await Promise.all(
        saleTiersDb.map(t => luongCoCauSaleApi.update(t.id, saleDraft[t.id]))
      );
      message.success('Đã lưu cơ cấu lương Sale');
      fetchData();
    } catch { message.error('Lỗi khi lưu'); }
    finally { setSaleSaving(false); }
  };

  // Lương cứng nhân viên non-sale (chỉ admin/ketoan)
  const [luongDraft, setLuongDraft] = useState({});   // { nhanVienId: luongCoBan }
  const [luongSaving, setLuongSaving] = useState(false);

  // Khi data load xong, khởi tạo draft từ luongCung hiện tại của non-sale
  useEffect(() => {
    if ((isAdmin || isKeToan) && data.length > 0) {
      const SALE_CV = ['SALE', 'VNSale', 'TRUONG_NHOM'];
      const draft = {};
      data.forEach(r => {
        if (!SALE_CV.includes(r.chucVu)) draft[r.nhanVienId] = r.luongCung ?? 0;
      });
      setLuongDraft(draft);
    }
  }, [data, isAdmin, isKeToan]);

  const handleSaveLuongCoBan = async () => {
    setLuongSaving(true);
    try {
      const SALE_CV = ['SALE', 'VNSale', 'TRUONG_NHOM'];
      const nonSale = data.filter(r => !SALE_CV.includes(r.chucVu));
      await Promise.all(
        nonSale.map(r => nhanVienApi.updateLuongCoBan(r.nhanVienId, Number(luongDraft[r.nhanVienId] || 0)))
      );
      message.success('Đã lưu lương cứng');
      fetchData();
    } catch { message.error('Lỗi khi lưu'); }
    finally { setLuongSaving(false); }
  };

  // Filter + compare mode
  const [selectedNV, setSelectedNV] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonthCount, setCompareMonthCount] = useState(3);
  const [compareData, setCompareData] = useState({});
  const [compareLoading, setCompareLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const thang = month.month() + 1;
      const nam = month.year();
      const res = isEmployeeView
        ? await bangLuongApi.getMyData(thang, nam)
        : await bangLuongApi.getByMonth(thang, nam);
      setData(res.data || []);
      setPendingAdj({});
    } catch { message.error('Không thể tải bảng lương'); }
    finally { setLoading(false); }
  }, [month, isEmployeeView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Months to compare: [month-(n-1), ..., month]
  const monthsToCompare = useMemo(() => {
    const result = [];
    for (let i = compareMonthCount - 1; i >= 0; i--) {
      result.push(month.subtract(i, 'month'));
    }
    return result;
  }, [month, compareMonthCount]);

  const fetchCompareData = useCallback(async () => {
    setCompareLoading(true);
    try {
      const results = await Promise.all(
        monthsToCompare.map(m =>
          isEmployeeView
            ? bangLuongApi.getMyData(m.month() + 1, m.year())
            : bangLuongApi.getByMonth(m.month() + 1, m.year())
        )
      );
      const newData = {};
      monthsToCompare.forEach((m, i) => {
        newData[m.format('YYYY-MM')] = results[i].data || [];
      });
      setCompareData(newData);
    } catch { message.error('Không thể tải dữ liệu so sánh'); }
    finally { setCompareLoading(false); }
  }, [monthsToCompare, isEmployeeView]);

  useEffect(() => {
    if (compareMode) fetchCompareData();
  }, [compareMode, fetchCompareData]);

  const handleCellEdit = (nvId, field, val) => {
    setPendingAdj(p => ({ ...p, [nvId]: { ...(p[nvId] || {}), [field]: val } }));
  };

  const hasChanges = Object.keys(pendingAdj).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = data.filter(r => pendingAdj[r.nhanVienId]);
      for (const row of rows) {
        const adj = pendingAdj[row.nhanVienId];
        await bangLuongApi.upsertAdjust({
          id:           row.bangLuongId || undefined,
          nhanVienId:   row.nhanVienId,
          thang:        month.month() + 1,
          nam:          month.year(),
          phuCap:       adj.phuCap       ?? row.phuCap,
          ungLuong:     adj.ungLuong     ?? row.ungLuong,
          phat:         adj.phat         ?? row.phat,
          soCongNghiLe: adj.soCongNghiLe ?? row.soCongNghiLe,
          soCongPhep:   adj.soCongPhep   ?? row.soCongPhep,
          simDt:        adj.simDt !== undefined ? adj.simDt : (row.simDtOverride ?? null),
          chiVt:        adj.chiVt ?? row.chiVt ?? 0,
          hoaHong:      adj.hoaHong ?? row.hoaHong ?? 0,
        });
      }
      message.success(`Đã lưu ${rows.length} điều chỉnh`);
      fetchData();
    } catch { message.error('Lỗi khi lưu'); }
    finally { setSaving(false); }
  };

  const displayData = data.map(row => {
    const adj          = pendingAdj[row.nhanVienId] || {};
    const phuCap       = adj.phuCap       ?? row.phuCap       ?? 0;
    const ungLuong     = adj.ungLuong     ?? row.ungLuong     ?? 0;
    const phat         = adj.phat         ?? row.phat         ?? 0;
    const soCongNghiLe = adj.soCongNghiLe ?? row.soCongNghiLe ?? 0;
    const soCongPhep   = adj.soCongPhep   ?? row.soCongPhep   ?? 0;
    const simDt        = adj.simDt !== undefined ? Number(adj.simDt) : (row.simDt || 0);
    const chiVt        = adj.chiVt        ?? row.chiVt        ?? 0;
    const hoaHong      = adj.hoaHong      ?? row.hoaHong      ?? 0;

    const tongCong     = Number(row.soCongChinhThuc || 0);
    const luongCT      = Math.round((row.luongCung || 0) * Number(row.soCongChinhThuc || 0) / 26);
    const tienCongPhep = Math.round((row.luongCung || 0) / 26 * Number(soCongNghiLe));
    const chuyenCan    = tongCong >= 26 ? 500_000 : 0;
    const tongLuong    = luongCT + tienCongPhep + Number(row.hoaHongDS || 0) + Number(row.thuongThem || 0)
                       + Number(phuCap) + Number(row.tienTangCa || 0) + Number(row.phuCapLaiXe || 0)
                       + simDt + Number(chiVt) + Number(hoaHong) + chuyenCan
                       - Number(ungLuong) - Number(phat)
                       - 150_000 - Number(row.phatTuChamCong || 0);
    return { ...row, phuCap, ungLuong, phat, soCongNghiLe, soCongPhep, tongCong, luongCT, tienCongPhep, simDt, chiVt, hoaHong, chuyenCan, tongLuong };
  });

  // Apply employee filter
  const filteredDisplayData = useMemo(() =>
    selectedNV ? displayData.filter(r => r.nhanVienId === selectedNV) : displayData
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [JSON.stringify(displayData.map(r => r.nhanVienId)), selectedNV, pendingAdj]);

  const groupedDisplayData = useMemo(() => {
    const result = [];
    for (const group of GROUPS) {
      const rows = filteredDisplayData.filter(r => getGroupKey(r.chucVu) === group.key);
      if (rows.length === 0) continue;
      const subtotal = rows.reduce((s, r) => s + (r.tongLuong || 0), 0);
      result.push({ _isHeader: true, _group: group, _subtotal: subtotal, nhanVienId: `hdr-${group.key}` });
      result.push(...rows);
    }
    return result;
  }, [filteredDisplayData]);

  const totals = filteredDisplayData.reduce((acc, r) => ({
    dsThucTe:   acc.dsThucTe   + (r.dsThucTe   || 0),
    luongCT:    acc.luongCT    + (r.luongCT    || 0),
    hoaHongDS:  acc.hoaHongDS  + (r.hoaHongDS  || 0),
    thuongThem: acc.thuongThem + (r.thuongThem || 0),
    tongLuong:  acc.tongLuong  + (r.tongLuong  || 0),
  }), { dsThucTe: 0, luongCT: 0, hoaHongDS: 0, thuongThem: 0, tongLuong: 0 });

  // Employee options for Select (sorted by name)
  const nvOptions = useMemo(() =>
    [...data]
      .sort((a, b) => (a.hoTen || '').localeCompare(b.hoTen || '', 'vi'))
      .map(r => ({ value: r.nhanVienId, label: r.hoTen }))
  , [data]);

  // Compare rows: one row per month for selected employee
  const compareRows = useMemo(() => {
    if (!compareMode) return [];
    return monthsToCompare.map(m => {
      const key = m.format('YYYY-MM');
      const monthData = compareData[key] || [];
      const emp = isEmployeeView
        ? monthData[0]
        : (selectedNV ? monthData.find(r => r.nhanVienId === selectedNV) : null);
      if (!emp) return { key, month: m.format('[T]MM/YYYY'), _empty: true };
      const { tongCong, luongCT, tienCongPhep, chuyenCan, tongLuong } = computeTongLuong(emp);
      return {
        key,
        month: m.format('[T]MM/YYYY'),
        tongCong: Number(tongCong.toFixed(1)),
        dsThucTe: emp.dsThucTe || 0,
        luongCung: emp.luongCung || 0,
        luongCT,
        tienCongPhep,
        hoaHongDS: emp.hoaHongDS || 0,
        thuongThem: emp.thuongThem || 0,
        chuyenCan,
        phuCap: emp.phuCap || 0,
        ungLuong: emp.ungLuong || 0,
        phat: (emp.phat || 0) + (emp.phatTuChamCong || 0),
        simDt: emp.simDt || 0,
        chiVt: emp.chiVt || 0,
        tongLuong,
      };
    });
  }, [compareMode, compareData, selectedNV, monthsToCompare, isEmployeeView]);

  // Find max tongLuong among compareRows for visual highlight
  const maxTongLuong = useMemo(() =>
    Math.max(...compareRows.filter(r => !r._empty).map(r => r.tongLuong || 0), 0)
  , [compareRows]);

  const compareColumns = [
    {
      title: 'Tháng', dataIndex: 'month', width: 100, fixed: 'left',
      render: (v, r) => (
        <b style={{ color: r._empty ? '#94A3B8' : '#4F46E5', fontSize: 14 }}>{v}</b>
      ),
    },
    {
      title: 'Công Đi Làm', dataIndex: 'tongCong', width: 100, align: 'center',
      render: (v, r) => r._empty ? <span style={{ color: '#CBD5E1' }}>—</span> : (
        <span style={{ fontWeight: 700, color: '#4F46E5' }}>
          {v}<span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400 }}>/26</span>
        </span>
      ),
    },
    {
      title: 'DS Thực Tế', dataIndex: 'dsThucTe', width: 130, align: 'right',
      render: (v, r) => r._empty ? '—' : <span style={{ color: '#059669' }}>{vnd(v)}</span>,
    },
    {
      title: 'Lương Cứng', dataIndex: 'luongCung', width: 110, align: 'right',
      render: (v, r) => r._empty ? '—' : <span style={{ color: '#374151' }}>{vnd(v)}</span>,
    },
    {
      title: 'Lương CT', dataIndex: 'luongCT', width: 110, align: 'right',
      render: (v, r) => r._empty ? '—' : <b style={{ color: '#4F46E5' }}>{vnd(v)}</b>,
    },
    {
      title: 'HH DS', dataIndex: 'hoaHongDS', width: 110, align: 'right',
      render: (v, r) => r._empty ? '—' : <b style={{ color: '#0891B2' }}>{vnd(v)}</b>,
    },
    {
      title: 'Thưởng', dataIndex: 'thuongThem', width: 100, align: 'right',
      render: (v, r) => r._empty ? '—' : v > 0
        ? <b style={{ color: '#D97706' }}>{vnd(v)}</b>
        : <span style={{ color: '#E2E8F0' }}>–</span>,
    },
    {
      title: 'Chuyên Cần', dataIndex: 'chuyenCan', width: 100, align: 'right',
      render: (v, r) => r._empty ? '—' : v > 0
        ? <b style={{ color: '#059669' }}>{vnd(v)}</b>
        : <span style={{ color: '#E2E8F0' }}>–</span>,
    },
    {
      title: 'Phụ Cấp', dataIndex: 'phuCap', width: 100, align: 'right',
      render: (v, r) => r._empty ? '—' : vnd(v),
    },
    {
      title: 'Ứng Lương', dataIndex: 'ungLuong', width: 100, align: 'right',
      render: (v, r) => r._empty ? '—' : v > 0
        ? <span style={{ color: '#DC2626' }}>-{vnd(v)}</span>
        : <span style={{ color: '#E2E8F0' }}>–</span>,
    },
    {
      title: 'Phạt', dataIndex: 'phat', width: 100, align: 'right',
      render: (v, r) => r._empty ? '—' : v > 0
        ? <span style={{ color: '#DC2626' }}>-{vnd(v)}</span>
        : <span style={{ color: '#E2E8F0' }}>–</span>,
    },
    {
      title: 'Sim ĐT', dataIndex: 'simDt', width: 90, align: 'right',
      render: (v, r) => r._empty ? '—' : v > 0
        ? <span style={{ color: '#059669' }}>+{vnd(v)}</span>
        : <span style={{ color: '#E2E8F0' }}>–</span>,
    },
    {
      title: 'Tổng Lương', dataIndex: 'tongLuong', width: 140, align: 'right', fixed: 'right',
      render: (v, r) => r._empty
        ? <span style={{ color: '#94A3B8', fontSize: 12 }}>Không có dữ liệu</span>
        : (
          <div>
            <b style={{ color: v >= 0 ? '#059669' : '#DC2626', fontSize: 15 }}>{vnd(v)}</b>
            {v === maxTongLuong && v > 0 && (
              <div style={{ fontSize: 10, color: '#D97706', fontWeight: 600 }}>▲ Cao nhất</div>
            )}
          </div>
        ),
    },
  ];

  // Wrap every column's render: group header rows span all columns
  const wr = (fn, isFirst = false) => (v, r) => {
    if (r._isHeader) {
      if (isFirst) return {
        children: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ color: r._group.color, fontSize: 13 }}>{r._group.label}</b>
            <span style={{ fontSize: 15, color: '#374151', fontWeight: 700 }}>
              Tổng lương: <b style={{ color: r._group.color, fontSize: 17 }}>{vnd(r._subtotal)}</b>
            </span>
          </div>
        ),
        props: { colSpan: TOTAL_COLS, style: { background: r._group.bg, padding: '8px 16px' } },
      };
      return { children: null, props: { colSpan: 0, style: { background: r._group.bg } } };
    }
    return fn(v, r);
  };

  const columns = [
    {
      title: 'Nhân Viên', dataIndex: 'hoTen', width: 160, fixed: 'left',
      render: wr((v, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <Tag style={{ fontSize: 10, padding: '0 6px', ...LOAI_COLORS[r.loaiHopDong] }}>{r.loaiHopDong}</Tag>
            <Tag color="default" style={{ fontSize: 10, padding: '0 6px' }}>{CHUC_VU_LABELS[r.chucVu] || r.chucVu}</Tag>
          </div>
        </div>
      ), true),
    },
    {
      title: 'Công Đi Làm', width: 100, align: 'center',
      render: wr((_, r) => (
        <div style={{ fontWeight: 700, color: '#4F46E5' }}>
          {Number(r.tongCong || 0).toFixed(1)}
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400 }}>/ 26</div>
        </div>
      )),
    },
    {
      title: 'Công Phép', dataIndex: 'soCongNghiLe', width: 100, align: 'center',
      render: wr((v, r) => (
        <div>
          <EditableCell value={Number(v || 0)} rowId={r.nhanVienId} field="soCongNghiLe" onSave={handleCellEdit} />
          <div style={{ fontSize: 10, color: Number(v || 0) > 0 ? '#10B981' : '#CBD5E1', marginTop: 2 }}>
            {Number(v || 0) > 0 ? `+${vnd(r.tienCongPhep)}đ` : `${vnd(Math.round((r.luongCung || 0) / 26))}/ngày`}
          </div>
        </div>
      )),
    },
    {
      title: 'DS Thực Tế', dataIndex: 'dsThucTe', width: 130, align: 'right',
      render: wr((v, r) => (r.chucVu === 'VNVP' || r.chucVu === 'LAI_XE') ? (
        <span style={{ color: '#94A3B8' }}>–</span>
      ) : (
        <div>
          <div style={{ color: '#059669' }}>{vnd(v)}</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{getTierLabel(v)}</div>
        </div>
      )),
    },
    {
      title: 'Lương Cứng', dataIndex: 'luongCung', width: 110, align: 'right',
      render: wr(v => <span style={{ color: '#374151' }}>{vnd(v)}</span>),
    },
    {
      title: 'Lương CT', dataIndex: 'luongCT', width: 110, align: 'right',
      render: wr(v => <b style={{ color: '#4F46E5' }}>{vnd(v)}</b>),
    },
    {
      title: 'HH DS', dataIndex: 'hoaHongDS', width: 110, align: 'right',
      render: wr((v, r) => (r.chucVu === 'VNVP' || r.chucVu === 'LAI_XE') ? (
        <span style={{ color: '#94A3B8' }}>–</span>
      ) : (
        <div>
          <b style={{ color: '#0891B2' }}>{vnd(v)}</b>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{Number(r.hoaHongPct || 0).toFixed(2)}%</div>
        </div>
      )),
    },
    {
      title: 'Hoa Hồng', dataIndex: 'hoaHong', width: 120, align: 'right',
      render: wr((v, r) => (
        <div>
          <EditableCell value={Number(v || 0)} rowId={r.nhanVienId} field="hoaHong" onSave={handleCellEdit} />
          {Number(v || 0) > 0 && <span style={{ fontSize: 10, color: '#7C3AED' }}> +</span>}
        </div>
      )),
    },
    {
      title: 'Thưởng', dataIndex: 'thuongThem', width: 100, align: 'right',
      render: wr(v => v > 0 ? <b style={{ color: '#D97706' }}>{vnd(v)}</b> : <span style={{ color: '#E2E8F0' }}>–</span>),
    },
    {
      title: 'Chuyên Cần', dataIndex: 'chuyenCan', width: 100, align: 'right',
      render: wr(v => v > 0
        ? <b style={{ color: '#059669' }}>{vnd(v)}</b>
        : <span style={{ color: '#E2E8F0' }}>–</span>
      ),
    },
    {
      title: 'Tăng Ca', dataIndex: 'tienTangCa', width: 100, align: 'right',
      render: wr(v => v > 0
        ? <b style={{ color: '#7C3AED' }}>{vnd(v)}</b>
        : <span style={{ color: '#E2E8F0' }}>–</span>
      ),
    },
    {
      title: 'Phụ Cấp', dataIndex: 'phuCap', width: 130, align: 'right',
      render: wr((v, r) => r.chucVu === 'LAI_XE' ? (
        <div>
          <b style={{ color: '#15803D' }}>{vnd(r.phuCapLaiXe || 0)}</b>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>từ chấm công</div>
          <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>+thêm:</div>
          <EditableCell value={v} rowId={r.nhanVienId} field="phuCap" onSave={handleCellEdit} />
        </div>
      ) : (
        <EditableCell value={v} rowId={r.nhanVienId} field="phuCap" onSave={handleCellEdit} />
      )),
    },
    {
      title: 'Ứng Lương', dataIndex: 'ungLuong', width: 110, align: 'right',
      render: wr((v, r) => <EditableCell value={v} rowId={r.nhanVienId} field="ungLuong" onSave={handleCellEdit} />),
    },
    {
      title: 'Phạt', dataIndex: 'phat', width: 100, align: 'right',
      render: wr((v, r) => <EditableCell value={v} rowId={r.nhanVienId} field="phat" onSave={handleCellEdit} />),
    },
    {
      title: 'Phạt Đi Muộn', dataIndex: 'phatTuChamCong', width: 110, align: 'right',
      render: wr(v => v > 0
        ? <span style={{ color: '#DC2626', fontWeight: 600 }}>{vnd(v)}</span>
        : <span style={{ color: '#E2E8F0' }}>–</span>
      ),
    },
    {
      title: 'Quỹ CĐ', width: 80, align: 'right',
      render: wr(() => <span style={{ color: '#DC2626', fontSize: 12 }}>150,000</span>),
    },
    {
      title: 'Sim ĐT', dataIndex: 'simDt', width: 105, align: 'right',
      render: wr((v, r) => (
        <div>
          <EditableCell value={v} rowId={r.nhanVienId} field="simDt" onSave={handleCellEdit} />
          {v > 0 && <span style={{ fontSize: 10, color: '#059669' }}> +</span>}
        </div>
      )),
    },
    {
      title: 'Chi VT', dataIndex: 'chiVt', width: 105, align: 'right',
      render: wr((v, r) => <EditableCell value={Number(v || 0)} rowId={r.nhanVienId} field="chiVt" onSave={handleCellEdit} />),
    },
    {
      title: 'Tổng Lương', dataIndex: 'tongLuong', width: 130, align: 'right', fixed: 'right',
      render: wr(v => (
        <b style={{ color: v >= 0 ? '#059669' : '#DC2626', fontSize: 14 }}>{vnd(v)}</b>
      )),
    },
  ];

  const summaryRow = () => (
    <Table.Summary fixed>
      <Table.Summary.Row style={{ background: '#F0F9FF', fontWeight: 700 }}>
        <Table.Summary.Cell index={0} colSpan={3}>
          <span style={{ color: '#4F46E5' }}>
            Tổng cộng ({filteredDisplayData.length} nhân viên{selectedNV ? ' — đã lọc' : ''})
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3} align="right">
          <span style={{ color: '#059669' }}>{vnd(totals.dsThucTe)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} />
        <Table.Summary.Cell index={5} align="right">
          <span style={{ color: '#4F46E5' }}>{vnd(totals.luongCT)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <span style={{ color: '#0891B2' }}>{vnd(totals.hoaHongDS)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} />
        <Table.Summary.Cell index={8} align="right">
          <span style={{ color: '#D97706' }}>{vnd(totals.thuongThem)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={9} />
        <Table.Summary.Cell index={10} />
        <Table.Summary.Cell index={11} />
        <Table.Summary.Cell index={12} />
        <Table.Summary.Cell index={13} />
        <Table.Summary.Cell index={14} />
        <Table.Summary.Cell index={15} />
        <Table.Summary.Cell index={16} />
        <Table.Summary.Cell index={17} />
        <Table.Summary.Cell index={18} align="right" style={{ background: '#F0F9FF' }}>
          <b style={{ color: '#DC2626', fontSize: 18, fontWeight: 800 }}>{vnd(totals.tongLuong)}</b>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );

  // Name of selected employee (for compare mode header)
  const selectedNVName = useMemo(() =>
    nvOptions.find(o => o.value === selectedNV)?.label || ''
  , [nvOptions, selectedNV]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header-premium">
        <div className="page-header-left">
          <div className="page-header-info">
            <DollarOutlined style={{ fontSize: 20, color: '#4F46E5' }} />
            <span className="page-header-title-text">Bảng Lương</span>
            <Badge count={data.length} showZero style={{ backgroundColor: '#4F46E5' }} />
          </div>
        </div>
        <div className="page-header-right">
          <Space.Compact>
            <Button icon={<LeftOutlined />} onClick={() => setMonth(m => m.subtract(1, 'month'))} />
            <DatePicker
              picker="month"
              value={month}
              onChange={m => m && setMonth(m)}
              format="[Tháng ]MM/YYYY"
              allowClear={false}
              style={{ width: 145 }}
              suffixIcon={null}
            />
            <Button icon={<RightOutlined />} onClick={() => setMonth(m => m.add(1, 'month'))} />
          </Space.Compact>
          <Button icon={<ReloadOutlined />} onClick={compareMode ? fetchCompareData : fetchData} loading={loading || compareLoading}>Tải lại</Button>
          {!isEmployeeView && (
            <Button
              icon={<SaveOutlined />}
              type={hasChanges ? 'primary' : 'default'}
              style={hasChanges ? { background: '#10B981', borderColor: '#10B981' } : {}}
              loading={saving}
              disabled={!hasChanges}
              onClick={handleSave}
            >
              Lưu điều chỉnh
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isEmployeeView && (
          <Select
            value={selectedNV}
            onChange={setSelectedNV}
            placeholder="Lọc theo nhân viên..."
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 220 }}
            options={nvOptions}
          />
        )}
        {!isEmployeeView && (
          <Button
            icon={compareMode ? <UnorderedListOutlined /> : <LineChartOutlined />}
            type={compareMode ? 'primary' : 'default'}
            style={compareMode ? { background: '#7C3AED', borderColor: '#7C3AED' } : {}}
            onClick={() => setCompareMode(v => !v)}
          >
            {compareMode ? 'Xem bảng tháng này' : 'So sánh nhiều tháng'}
          </Button>
        )}
        {compareMode && (
          <>
            <Select
              value={compareMonthCount}
              onChange={setCompareMonthCount}
              style={{ width: 110 }}
            >
              {[2, 3, 4, 5, 6].map(n => (
                <Option key={n} value={n}>{n} tháng</Option>
              ))}
            </Select>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {monthsToCompare[0]?.format('T MM/YYYY')} → {monthsToCompare[monthsToCompare.length - 1]?.format('T MM/YYYY')}
            </span>
          </>
        )}
      </div>

      {/* Summary cards */}
      {!compareMode && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Tổng DS Thực Tế', value: totals.dsThucTe,  color: '#059669' },
            { label: 'Tổng Lương CT',   value: totals.luongCT,   color: '#4F46E5' },
            { label: 'Tổng Hoa Hồng',  value: totals.hoaHongDS + totals.thuongThem, color: '#0891B2' },
            { label: 'Tổng Chi Lương',  value: totals.tongLuong, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 16px', minWidth: 160 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{vnd(s.value)} đ</div>
            </div>
          ))}
        </div>
      )}

      {/* Compare mode: employee must be selected */}
      {compareMode && !isEmployeeView && !selectedNV && (
        <div className="sg-card" style={{ padding: 40 }}>
          <Empty
            description={
              <span style={{ color: '#64748B' }}>
                Chọn nhân viên ở bộ lọc bên trên để xem lịch sử lương nhiều tháng
              </span>
            }
          />
        </div>
      )}

      {/* Compare table */}
      {compareMode && (isEmployeeView || selectedNV) && (
        <div className="sg-card">
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <LineChartOutlined style={{ color: '#7C3AED' }} />
            <span style={{ fontWeight: 700, color: '#374151' }}>
              Lịch sử lương{selectedNVName ? `: ${selectedNVName}` : ''}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              {monthsToCompare[0]?.format('T MM/YYYY')} — {monthsToCompare[monthsToCompare.length - 1]?.format('T MM/YYYY')}
            </span>
          </div>
          <Table
            className="bang-luong-table"
            dataSource={compareRows}
            columns={compareColumns}
            rowKey="key"
            loading={compareLoading}
            pagination={false}
            scroll={{ x: 1500 }}
            size="middle"
            rowClassName={r => r._empty ? 'row-empty' : ''}
            summary={compareRows.filter(r => !r._empty).length > 0 ? () => {
              const validRows = compareRows.filter(r => !r._empty);
              const avg = Math.round(validRows.reduce((s, r) => s + (r.tongLuong || 0), 0) / validRows.length);
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#F5F3FF', fontWeight: 700 }}>
                    <Table.Summary.Cell index={0} colSpan={compareColumns.length - 1}>
                      <span style={{ color: '#7C3AED' }}>Trung bình / tháng</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={compareColumns.length - 1} align="right">
                      <b style={{ color: '#7C3AED', fontSize: 15 }}>{vnd(avg)}</b>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            } : undefined}
          />
        </div>
      )}

      {/* Normal table */}
      {!compareMode && (
        <div className="sg-card">
          <div style={{ marginBottom: 8, fontSize: 12, color: '#94A3B8' }}>
            Click vào ô <b>Phụ Cấp / Ứng Lương / Phạt / Sim ĐT / Công Phép</b> để chỉnh sửa, sau đó bấm Lưu.
            &nbsp;·&nbsp; Tháng {month.format('MM/YYYY')}
            &nbsp;·&nbsp; Quỹ CĐ: −150,000đ · Sim ĐT: +120,000đ mặc định cho Sale · Chuyên Cần: +500,000đ (đủ 26 công)
          </div>
          <Table
            className="bang-luong-table"
            dataSource={groupedDisplayData}
            columns={columns}
            rowKey="nhanVienId"
            loading={loading}
            pagination={false}
            scroll={{ x: 1700 }}
            size="middle"
            summary={filteredDisplayData.length > 0 ? summaryRow : undefined}
            rowClassName={r => r._isHeader ? '' : (pendingAdj[r.nhanVienId] ? 'edited' : '')}
          />
        </div>
      )}

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', color: '#4F46E5', fontSize: 13, fontWeight: 600, userSelect: 'none' }}>
          Bảng cơ cấu lương Sale {isAdmin ? '(click để chỉnh sửa)' : '(xem tham khảo)'}
        </summary>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr style={{ background: '#374151', color: '#fff' }}>
                {['DS Thực Tế', 'DS Tối Thiểu', 'DS Tối Đa', 'Lương Cứng', '% Hoa Hồng DS', '% Thưởng Thêm'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {saleTiersDb.map((t, i) => {
                const draft = saleDraft[t.id] || { luongCung: t.luongCung, hoaHongBp: t.hoaHongBp, thuongBp: t.thuongBp };
                const minLabel = t.minDs === 0 ? '< ' + (t.maxDs / 1_000_000) + ' triệu'
                               : t.maxDs == null ? '> ' + (t.minDs / 1_000_000) + ' triệu'
                               : (t.minDs / 1_000_000) + ' – ' + (t.maxDs / 1_000_000) + ' triệu';
                return (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '5px 12px', fontWeight: 600, color: '#4F46E5' }}>{minLabel}</td>
                    <td style={{ padding: '5px 12px', textAlign: 'right', color: '#64748B' }}>
                      {t.minDs === 0 ? '0' : t.minDs.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '5px 12px', textAlign: 'right', color: '#64748B' }}>
                      {t.maxDs == null ? '—' : (t.maxDs - 1).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {isAdmin ? (
                        <InputNumber
                          value={draft.luongCung}
                          onChange={v => setSaleDraft(d => ({ ...d, [t.id]: { ...draft, luongCung: v ?? 0 } }))}
                          min={0} step={500000}
                          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={v => v.replace(/,/g, '')}
                          style={{ width: 130 }} size="small" controls={false}
                        />
                      ) : draft.luongCung.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', color: '#0891B2', fontWeight: 600 }}>
                      {isAdmin ? (
                        <InputNumber
                          value={draft.hoaHongBp}
                          onChange={v => setSaleDraft(d => ({ ...d, [t.id]: { ...draft, hoaHongBp: v ?? 0 } }))}
                          min={0} max={500} step={10}
                          formatter={v => (Number(v) / 100).toFixed(2) + '%'}
                          parser={v => Math.round(parseFloat(v.replace('%', '')) * 100)}
                          style={{ width: 90 }} size="small" controls={false}
                        />
                      ) : (draft.hoaHongBp / 100).toFixed(2) + '%'}
                    </td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', color: '#D97706', fontWeight: 600 }}>
                      {isAdmin ? (
                        <InputNumber
                          value={draft.thuongBp}
                          onChange={v => setSaleDraft(d => ({ ...d, [t.id]: { ...draft, thuongBp: v ?? 0 } }))}
                          min={0} max={500} step={100}
                          formatter={v => v === 0 ? '—' : '+' + (Number(v) / 100).toFixed(0) + '%'}
                          parser={v => v === '—' ? 0 : Math.round(parseFloat(v.replace('+', '').replace('%', '')) * 100)}
                          style={{ width: 80 }} size="small" controls={false}
                        />
                      ) : (draft.thuongBp === 0 ? '—' : '+' + (draft.thuongBp / 100).toFixed(0) + '%')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isAdmin && saleTiersDb.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saleSaving}
                onClick={handleSaveSaleTiers}
                style={{ background: '#4F46E5', borderColor: '#4F46E5' }}
              >
                Lưu cơ cấu lương Sale
              </Button>
            </div>
          )}
        </div>
      </details>
      {/* Bảng cơ cấu lương Văn Phòng & Lái Xe — per employee, chỉ admin/ketoan */}
      {(isAdmin || isKeToan) && (() => {
        const SALE_CV = ['SALE', 'VNSale', 'TRUONG_NHOM'];
        const nonSale = data.filter(r => !SALE_CV.includes(r.chucVu));
        if (nonSale.length === 0) return null;
        return (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#0891B2', fontSize: 13, fontWeight: 600, userSelect: 'none' }}>
              Bảng cơ cấu lương Văn Phòng &amp; Lái Xe (chỉnh sửa lương cứng từng người)
            </summary>
            <div style={{ marginTop: 10, maxWidth: 520 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
                Điền lương cứng cho từng nhân viên → bấm Lưu → áp dụng khi tính bảng lương tháng.
              </div>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
                <thead>
                  <tr style={{ background: '#0891B2', color: '#fff' }}>
                    <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 600 }}>Nhân Viên</th>
                    <th style={{ padding: '7px 14px', textAlign: 'center', fontWeight: 600 }}>Chức Vụ</th>
                    <th style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 600 }}>Lương Cứng (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {nonSale.map((r, i) => (
                    <tr key={r.nhanVienId} style={{ background: i % 2 === 0 ? '#fff' : '#F0F9FF', borderBottom: '1px solid #E0F2FE' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{r.hoTen}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', color: '#64748B', fontSize: 12 }}>
                        {CHUC_VU_LABELS[r.chucVu] || r.chucVu}
                      </td>
                      <td style={{ padding: '6px 14px', textAlign: 'right' }}>
                        <InputNumber
                          value={luongDraft[r.nhanVienId] ?? 0}
                          onChange={val => setLuongDraft(d => ({ ...d, [r.nhanVienId]: val ?? 0 }))}
                          min={0}
                          step={500000}
                          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={v => v.replace(/,/g, '')}
                          style={{ width: 160 }}
                          controls={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={luongSaving}
                  onClick={handleSaveLuongCoBan}
                  style={{ background: '#0891B2', borderColor: '#0891B2' }}
                >
                  Lưu lương cứng
                </Button>
              </div>
            </div>
          </details>
        );
      })()}
    </motion.div>
  );
}
