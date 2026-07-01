import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, message, Tooltip, Modal, Form, Input, Select, DatePicker,
  InputNumber, Popconfirm, Badge, Tag, TimePicker, Upload, Alert, Divider, Checkbox, Radio,
} from 'antd';
import {
  LeftOutlined, RightOutlined, SaveOutlined, CheckCircleOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, EyeInvisibleOutlined, EyeOutlined,
  DownloadOutlined, SyncOutlined, WarningOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { chamCongApi, nhanVienApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;
const LOAI_OPTIONS    = ['HV', 'TV', 'CT'];
const CHUC_VU_OPTIONS = ['NVVP', 'VNSale', 'LAI_XE'];
const CHUC_VU_LABELS  = { NVVP: 'NV Văn Phòng', VNSale: 'NV Sale', LAI_XE: 'Lái Xe',
                          SALE: 'NV Sale', VNVP: 'NV Văn Phòng', TRUONG_NHOM: 'Trưởng Nhóm' };
const GRACE_MINUTES = 90;
const PENALTY_PER_MINUTE = 30_000;

const SANG_CHUAN  = 8 * 60 + 33;  // 08:33 vào chuẩn
const SANG_MOC    = 9 * 60 + 30;   // 09:30 → sau này = 1/4 công
const SANG_KT     = 11 * 60 + 45;  // 11:45 kết thúc sáng
const CHIEU_BD    = 13 * 60 + 30;  // 13:30 bắt đầu chiều
const CHIEU_CHUAN = 17 * 60;       // 17:00 ra chuẩn
const CHIEU_MOC   = 15 * 60 + 30;  // 15:30 → ra tại/trước mốc này = 1/4 công

const toMin = (t) => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const computeFromTimes = (gioVaoSang, gioRaSang, gioVaoChieu, gioRaChieu, isLaiXe, isSunday = false) => {
  const vaoSang  = toMin(gioVaoSang);
  const raSang   = toMin(gioRaSang);
  const vaoChieu = toMin(gioVaoChieu);
  const raChieu  = toMin(gioRaChieu);

  let cong = 0, phutTre = 0, phutVeSom = 0, tangCaSang = 0, tangCaChieu = 0;
  let phatKhongChamCong = 0;

  if (isLaiXe) {
    if (vaoSang >= 0) cong += 0.5; else phatKhongChamCong += 100_000;
    if (raChieu  >= 0) cong += 0.5; else phatKhongChamCong += 100_000;
    tangCaSang  = vaoSang >= 0  ? Math.max(0, SANG_CHUAN  - vaoSang)  : 0;
    tangCaChieu = raChieu  >= 0 ? Math.max(0, raChieu - CHIEU_CHUAN) : 0;
  } else {
    // Ca sáng
    const sangVang = vaoSang < 0 && raSang < 0; // cả 2 trống → nghỉ buổi sáng
    if (sangVang) {
      // không công, không phạt
    } else if (vaoSang < 0) {
      phatKhongChamCong += 100_000; // có Ra Sáng, không có Vào Sáng
    } else {
      if (vaoSang > SANG_MOC) {
        cong += 0.25;
      } else {
        cong += 0.5;
        phutTre += Math.max(0, vaoSang - SANG_CHUAN);
      }
      if (raSang < 0) {
        phatKhongChamCong += 100_000; // có Vào Sáng, không có Ra Sáng
      } else if (raSang < SANG_KT) {
        phutVeSom += Math.max(0, SANG_KT - raSang);
      }
    }
    // Ca chiều
    const chieuVang = vaoChieu < 0 && raChieu < 0; // cả 2 trống → nghỉ buổi chiều
    if (chieuVang) {
      // không công, không phạt
    } else if (raChieu < 0) {
      phatKhongChamCong += 100_000; // có Vào Chiều, không có Ra Chiều
    } else {
      if (vaoChieu < 0) {
        phatKhongChamCong += 100_000; // có Ra Chiều, không có Vào Chiều
      } else if (vaoChieu > CHIEU_BD) {
        phutTre += Math.max(0, vaoChieu - CHIEU_BD);
      }
      if (raChieu <= CHIEU_MOC) {
        cong += 0.25;
      } else {
        cong += 0.5;
        if (raChieu < CHIEU_CHUAN) phutVeSom += Math.max(0, CHIEU_CHUAN - raChieu);
      }
    }
  }

  // Chủ Nhật đi làm → x2 công, không phạt
  if (isSunday && cong > 0) {
    cong *= 2;
    phutTre = 0;
    phutVeSom = 0;
    phatKhongChamCong = 0;
  }

  const tienTangCa = Math.round(tangCaSang * 50000 / 60) + Math.round(tangCaChieu * 30000 / 60);
  return { cong, phutTre, phutVeSom, tangCaSang, tangCaChieu, tienTangCa, phatKhongChamCong };
};

const STATUS_DOT = {
  dung_gio:  '#2563EB',
  di_muon:   '#F97316',
  thieu:     '#DC2626',
  nghi:      '#94A3B8',
  chua_cham: '#E2E8F0',
};

function TimeField({ label, hint, value, onChange, disabled }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3, fontWeight: 600 }}>
        {label} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({hint})</span>
      </div>
      <TimePicker
        format="HH:mm" minuteStep={1}
        value={value ? dayjs(value, 'HH:mm') : null}
        onChange={(_, s) => onChange && onChange(s || '')}
        style={{ width: '100%' }}
        placeholder="--:--"
        disabled={disabled}
      />
    </div>
  );
}

function ChamCongCell({ nv, date, record, onSave, onDuyet, isAdmin, isKeToan, duocDuyet, readOnly }) {
  const [open, setOpen]           = useState(false);
  const [gioVaoSang,  setGVS]     = useState('');
  const [gioRaSang,   setGRS]     = useState('');
  const [gioVaoChieu, setGVC]     = useState('');
  const [gioRaChieu,  setGRC]     = useState('');
  const [ghiChuNv,    setGhiChu]  = useState('');
  const [duyetKP,     setDuyetKP] = useState(false);
  const [duyetNote,   setDuyetNote] = useState('');
  const [duyetCong,   setDuyetCong] = useState(null);
  const [saving,       setSaving]        = useState(false);
  const [soGiaoHang,   setSoGiaoHang]    = useState(0);
  const [soLapDatTranh,setSoLapDatTranh] = useState(0);
  const [chiMuaVatTu,  setChiMuaVatTu]  = useState(0);
  const [tienAn,       setTienAn]        = useState(0);
  const [huyTangCa,    setHuyTangCa]     = useState(false);

  const isLaiXe = nv.chucVu === 'LAI_XE';

  const openModal = () => {
    setGVS(record?.gioVaoSang  || '');
    setGRS(record?.gioRaSang   || '');
    setGVC(record?.gioVaoChieu || '');
    setGRC(record?.gioRaChieu  || '');
    setGhiChu(record?.ghiChuNv || '');
    setDuyetKP(record?.duyetKhongPhat || false);
    setDuyetNote(record?.duyetNote || '');
    setDuyetCong(record?.duyetCong ?? null);
    setSoGiaoHang(record?.soGiaoHang != null ? Number(record.soGiaoHang) : 0);
    setSoLapDatTranh(record?.soLapDatTranh != null ? Number(record.soLapDatTranh) : 0);
    setChiMuaVatTu(record?.chiMuaVatTu != null ? Number(record.chiMuaVatTu) : 0);
    setTienAn(record?.tienAn != null ? Number(record.tienAn) : 0);
    setHuyTangCa(record?.huyTangCa || false);
    setOpen(true);
  };

  const preview = computeFromTimes(gioVaoSang, gioRaSang, gioVaoChieu, gioRaChieu, isLaiXe, date.day() === 0);
  const daysSince      = record?.ngay ? dayjs().diff(dayjs(record.ngay), 'day') : 0;
  const isApprovedFlag = record?.duyetKhongPhat || record?.duyetCong != null;
  const isLate         = (record?.phutTre || 0) + (record?.phutVeSom || 0) > 0 && !isApprovedFlag;
  const isMissingCC    = (record?.phatKhongChamCong || 0) > 0 && !isApprovedFlag;
  const isMissingCCNew = isMissingCC && daysSince <= 7;
  const isMissingCCOld = isMissingCC && daysSince > 7;
  const hasPenalty     = isLate || isMissingCC;
  const hasTangCa      = (record?.tangCaSang || 0) + (record?.tangCaChieu || 0) > 0;

  const handleSaveGhiChu = async () => {
    if (!record?.id) { setOpen(false); return; }
    setSaving(true);
    try {
      await chamCongApi.saveGhiChuNv(record.id, ghiChuNv);
      message.success('Đã lưu ghi chú');
      setOpen(false);
    } catch { message.error('Lỗi khi lưu ghi chú'); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const phuCapGiaoHang = isLaiXe ? Math.round(soGiaoHang * 50_000) : 0;
      const phiLapDatTranh = isLaiXe ? Math.round(soLapDatTranh * 300_000) : 0;
      await onSave({
        id: record?.id,
        nhanVienId: nv.id,
        ngay: date.format('YYYY-MM-DD'),
        gioVaoSang:  gioVaoSang  || null,
        gioRaSang:   isLaiXe ? null : (gioRaSang   || null),
        gioVaoChieu: isLaiXe ? null : (gioVaoChieu || null),
        gioRaChieu:  gioRaChieu  || null,
        ghiChuNv,
        soGiaoHang:    isLaiXe ? soGiaoHang    : 0,
        phuCapGiaoHang,
        soLapDatTranh: isLaiXe ? soLapDatTranh : 0,
        phiLapDatTranh,
        chiMuaVatTu:   isLaiXe ? chiMuaVatTu   : 0,
        tienAn:        isLaiXe ? tienAn        : 0,
      });
      const canApprove = isAdmin || isKeToan;
      const duyetChanged = canApprove && record?.id && (
        duyetKP !== (record?.duyetKhongPhat || false) ||
        duyetCong !== (record?.duyetCong ?? null) ||
        huyTangCa !== (record?.huyTangCa || false)
      );
      if (duyetChanged) {
        await onDuyet(record.id, duyetKP, duyetNote, duyetCong, huyTangCa);
      }
      setOpen(false);
    } catch { message.error('Lỗi khi lưu'); }
    finally { setSaving(false); }
  };

  const hasTime    = record?.gioVaoSang || record?.gioRaSang || record?.gioVaoChieu || record?.gioRaChieu;
  const laiXeHasTime = isLaiXe ? (record?.gioVaoSang || record?.gioRaChieu) : hasTime;
  const dotColor   = !laiXeHasTime
    ? STATUS_DOT[record?.caSang || 'chua_cham']
    : isApprovedFlag ? '#10B981'
    : isMissingCCOld ? '#DC2626'
    : isMissingCCNew ? '#EAB308'
    : isLate ? '#F97316'
    : hasTangCa ? '#7C3AED'
    : '#2563EB';

  return (
    <>
      <div
        onClick={date.day() === 0 ? undefined : openModal}
        style={{ cursor: date.day() === 0 ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '3px 1px' }}
      >
        {date.day() === 0 ? (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2E8F0' }} />
        ) : (
          <>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
            <div style={{ fontSize: 8, lineHeight: 1.3, textAlign: 'center', width: '100%' }}>
              {isLaiXe ? (
                <>
                  <div style={{ color: record?.gioVaoSang ? '#374151' : '#CBD5E1' }}>{record?.gioVaoSang || '--:--'}</div>
                  <div style={{ color: record?.gioRaChieu  ? '#374151' : '#CBD5E1' }}>{record?.gioRaChieu  || '--:--'}</div>
                </>
              ) : (
                <>
                  <div style={{ color: record?.gioVaoSang  ? '#374151' : '#CBD5E1' }}>{record?.gioVaoSang  || '--:--'}</div>
                  <div style={{ color: record?.gioRaSang   ? '#374151' : '#CBD5E1' }}>{record?.gioRaSang   || '--:--'}</div>
                  <div style={{ color: record?.gioVaoChieu ? '#374151' : '#CBD5E1' }}>{record?.gioVaoChieu || '--:--'}</div>
                  <div style={{ color: record?.gioRaChieu  ? '#374151' : '#CBD5E1' }}>{record?.gioRaChieu  || '--:--'}</div>
                </>
              )}
            </div>
            {hasTangCa && <span style={{ fontSize: 7, color: '#7C3AED', fontWeight: 700 }}>TC</span>}
            {isMissingCCNew && <WarningOutlined style={{ fontSize: 8, color: '#EAB308' }} />}
            {isMissingCCOld && <WarningOutlined style={{ fontSize: 8, color: '#DC2626' }} />}
            {isLate && !isMissingCC && <WarningOutlined style={{ fontSize: 8, color: '#EF4444' }} />}
          </>
        )}
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: readOnly ? '#94A3B8' : '#4F46E5' }} />
            <span style={{ fontSize: 14 }}>
              {nv.hoTen}
              <Tag color={isLaiXe ? 'purple' : 'blue'} style={{ marginLeft: 8, fontSize: 10 }}>
                {CHUC_VU_LABELS[nv.chucVu] || nv.chucVu}
              </Tag>
              — {date.format('DD/MM')} ({['CN','T2','T3','T4','T5','T6','T7'][date.day()]})
              {readOnly && <Tag color="default" style={{ marginLeft: 8, fontSize: 10 }}>Chỉ xem</Tag>}
            </span>
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={readOnly ? handleSaveGhiChu : handleSave}
        okText={readOnly ? 'Lưu ghi chú' : 'Lưu'}
        cancelText="Đóng"
        confirmLoading={saving}
        width={isLaiXe ? 400 : 520}
        destroyOnClose
      >
        {isLaiXe ? (
          /* Lái xe: chỉ 2 mốc + phụ cấp */
          <>
            <div style={{ background: '#F5F3FF', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#6D28D9' }}>
              Lái xe chỉ cần chấm <b>vào sáng</b> + <b>ra chiều</b>. Tăng ca tự động tính.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <TimeField label="Vào Sáng" hint="08:33" value={gioVaoSang} onChange={readOnly ? undefined : setGVS} disabled={readOnly} />
              <TimeField label="Ra Chiều" hint="17:00" value={gioRaChieu} onChange={readOnly ? undefined : setGRC} disabled={readOnly} />
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 12px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 10 }}>Phụ Cấp Lái Xe</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3, fontWeight: 600 }}>
                    Giao hàng thành công <span style={{ color: '#94A3B8', fontWeight: 400 }}>(50.000đ/đơn)</span>
                  </div>
                  <InputNumber
                    min={0} step={1} precision={1}
                    value={soGiaoHang}
                    onChange={v => setSoGiaoHang(v || 0)}
                    style={{ width: '100%' }}
                    placeholder="Số đơn"
                    disabled={readOnly}
                  />
                  {soGiaoHang > 0 && (
                    <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                      = {(soGiaoHang * 50_000).toLocaleString('vi-VN')}đ
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3, fontWeight: 600 }}>
                    Lắp đặt tranh <span style={{ color: '#94A3B8', fontWeight: 400 }}>(300.000đ/tranh)</span>
                  </div>
                  <InputNumber
                    min={0} step={0.5} precision={1}
                    value={soLapDatTranh}
                    onChange={v => setSoLapDatTranh(v || 0)}
                    style={{ width: '100%' }}
                    placeholder="Số tranh (0.5 = 1/2)"
                    disabled={readOnly}
                  />
                  {soLapDatTranh > 0 && (
                    <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                      = {Math.round(soLapDatTranh * 300_000).toLocaleString('vi-VN')}đ
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3, fontWeight: 600 }}>Chi mua vật tư (đ)</div>
                  <InputNumber
                    min={0} step={1000}
                    value={chiMuaVatTu}
                    onChange={v => setChiMuaVatTu(v || 0)}
                    style={{ width: '100%' }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={v => v.replace(/,/g, '')}
                    placeholder="Số tiền đã chi"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3, fontWeight: 600 }}>
                    Tiền ăn <span style={{ color: '#94A3B8', fontWeight: 400 }}>(30.000đ/ngày)</span>
                  </div>
                  <InputNumber
                    min={0} step={1000}
                    value={tienAn}
                    onChange={v => setTienAn(v || 0)}
                    style={{ width: '100%' }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={v => v.replace(/,/g, '')}
                    placeholder="Nhập số tiền"
                    disabled={readOnly}
                  />
                </div>
              </div>
              {(soGiaoHang > 0 || soLapDatTranh > 0 || chiMuaVatTu > 0 || tienAn > 0) && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#15803D', fontWeight: 700, borderTop: '1px solid #BBF7D0', paddingTop: 6 }}>
                  Tổng phụ cấp: {(
                    soGiaoHang * 50_000 +
                    Math.round(soLapDatTranh * 300_000) +
                    chiMuaVatTu +
                    tienAn
                  ).toLocaleString('vi-VN')}đ
                </div>
              )}
            </div>
          </>
        ) : (
          /* NVVP / VNSale: 4 mốc */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <TimeField label="Vào Sáng"   hint="08:33" value={gioVaoSang}  onChange={readOnly ? undefined : setGVS} disabled={readOnly} />
            <TimeField label="Ra Sáng"    hint="11:45" value={gioRaSang}   onChange={readOnly ? undefined : setGRS} disabled={readOnly} />
            <TimeField label="Vào Chiều"  hint="13:30" value={gioVaoChieu} onChange={readOnly ? undefined : setGVC} disabled={readOnly} />
            <TimeField label="Ra Chiều"   hint="17:00" value={gioRaChieu}  onChange={readOnly ? undefined : setGRC} disabled={readOnly} />
          </div>
        )}

        {/* Preview */}
        {(gioVaoSang || gioRaChieu || (!gioVaoSang && !gioRaChieu)) && (
          <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 10, marginTop: 14, fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {/* Nếu admin đã chọn duyetCong thì hiển thị giá trị đó, không dùng preview tính toán */}
              <span>Công: <b style={{ color: '#4F46E5' }}>
                {duyetCong != null ? Number(duyetCong).toFixed(2) : preview.cong.toFixed(2)}
              </b></span>
              {!isLaiXe && preview.phutTre > 0 && !duyetCong && (
                <span style={{ color: '#F97316' }}>Muộn: <b>{preview.phutTre} ph</b></span>
              )}
              {!isLaiXe && preview.phutVeSom > 0 && !duyetCong && (
                <span style={{ color: '#EF4444' }}>Về sớm: <b>{preview.phutVeSom} ph</b></span>
              )}
              {preview.phatKhongChamCong > 0 && (
                <span style={{ color: '#DC2626', fontWeight: 700 }}>
                  Phạt không CC: {preview.phatKhongChamCong.toLocaleString('vi-VN')}đ
                </span>
              )}
              {isLaiXe && preview.tangCaSang > 0 && (
                <span style={{ color: '#7C3AED' }}>
                  TC sáng: <b>{preview.tangCaSang} ph</b> = {(preview.tangCaSang * 50000 / 60 | 0).toLocaleString('vi-VN')}đ
                </span>
              )}
              {isLaiXe && preview.tangCaChieu > 0 && (
                <span style={{ color: '#7C3AED' }}>
                  TC chiều: <b>{preview.tangCaChieu} ph</b> = {(preview.tangCaChieu * 30000 / 60 | 0).toLocaleString('vi-VN')}đ
                </span>
              )}
              {isLaiXe && preview.tienTangCa > 0 && (
                <b style={{ color: '#7C3AED' }}>Tổng TC: {preview.tienTangCa.toLocaleString('vi-VN')}đ</b>
              )}
            </div>
          </div>
        )}

        {/* Ghi chú NV */}
        {(preview.phutTre > 0 || preview.phutVeSom > 0 || preview.phatKhongChamCong > 0) && !isLaiXe && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>Ghi chú lý do (nhân viên)</div>
            <Input.TextArea value={ghiChuNv} onChange={e => setGhiChu(e.target.value)} rows={2} placeholder="Lý do muộn/về sớm/không chấm công..." />
          </div>
        )}

        {/* Admin duyệt không phạt */}
        {isAdmin && record?.id && (() => {
          const missingSang  = !record?.gioVaoSang && !!record?.gioRaSang;
          const missingChieu = !!record?.gioVaoChieu && !record?.gioRaChieu;
          const hasLatePenalty = (record?.phutTre || 0) + (record?.phutVeSom || 0) > 0;
          const hasCCPenalty   = (record?.phatKhongChamCong || 0) > 0;
          if (!hasLatePenalty && !hasCCPenalty) return null;

          // base = công tính từ giờ thực tế (không có override), luôn dùng preview.cong
          const baseCong = preview.cong;

          return (
            <div style={{ background: '#FFFBEB', borderRadius: 8, padding: 12, marginTop: 12, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 12, color: '#92400E', marginBottom: 10 }}>
                {hasLatePenalty && <div>Muộn/sớm: <b>{(record?.phutTre || 0) + (record?.phutVeSom || 0)} phút</b></div>}
                {hasCCPenalty  && <div>Không chấm công: <b style={{ color: '#DC2626' }}>{(record.phatKhongChamCong).toLocaleString('vi-VN')}đ</b></div>}
              </div>

              {/* Chọn công buổi thiếu — hiện ngay, không cần tick checkbox */}
              {(missingSang || missingChieu) && (
                <div style={{ background: '#FEF9C3', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#78350F', marginBottom: 6, fontWeight: 600 }}>
                    Duyệt công buổi {missingSang ? 'sáng' : 'chiều'} (không biết vào ca từ lúc nào):
                  </div>
                  <Radio.Group value={duyetCong} onChange={e => setDuyetCong(e.target.value)}>
                    <Radio value={null} style={{ display: 'block', marginBottom: 4 }}>
                      Không duyệt — giữ {baseCong.toFixed(2)} công
                    </Radio>
                    <Radio value={parseFloat((baseCong + 0.25).toFixed(2))} style={{ display: 'block', marginBottom: 4 }}>
                      0.25 công {missingSang ? 'sáng' : 'chiều'} → tổng {(baseCong + 0.25).toFixed(2)} công
                    </Radio>
                    <Radio value={parseFloat((baseCong + 0.5).toFixed(2))} style={{ display: 'block' }}>
                      0.5 công {missingSang ? 'sáng' : 'chiều'} → tổng {(baseCong + 0.5).toFixed(2)} công
                    </Radio>
                  </Radio.Group>
                </div>
              )}

              <Checkbox
                checked={duyetKP}
                onChange={e => setDuyetKP(e.target.checked)}
                style={{ fontWeight: 600 }}
              >
                Duyệt không phạt (đã xin phép)
              </Checkbox>
              {duyetKP && (
                <Input style={{ marginTop: 8 }} value={duyetNote} onChange={e => setDuyetNote(e.target.value)} placeholder="Ghi chú duyệt..." />
              )}
            </div>
          );
        })()}

        {/* Admin / Kế toán hủy tăng ca lái xe */}
        {(isAdmin || isKeToan) && isLaiXe && record?.id && ((record?.tangCaSang || 0) + (record?.tangCaChieu || 0) > 0 || huyTangCa) && (
          <div style={{ background: '#F5F3FF', borderRadius: 8, padding: 12, marginTop: 12, border: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: 12, color: '#6D28D9', marginBottom: 8, fontWeight: 600 }}>
              Phê duyệt tăng ca lái xe
            </div>
            {!huyTangCa && (
              <div style={{ fontSize: 12, color: '#7C3AED', marginBottom: 8 }}>
                {(record?.tangCaSang || 0) > 0 && (
                  <div>TC sáng: <b>{record.tangCaSang} ph</b> = {Math.round(record.tangCaSang * 50000 / 60).toLocaleString('vi-VN')}đ</div>
                )}
                {(record?.tangCaChieu || 0) > 0 && (
                  <div>TC chiều: <b>{record.tangCaChieu} ph</b> = {Math.round(record.tangCaChieu * 30000 / 60).toLocaleString('vi-VN')}đ</div>
                )}
              </div>
            )}
            <Checkbox
              checked={huyTangCa}
              onChange={e => setHuyTangCa(e.target.checked)}
              style={{ fontWeight: 600, color: '#DC2626' }}
            >
              Hủy tăng ca (không tính tiền tăng ca)
            </Checkbox>
            {huyTangCa && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', fontStyle: 'italic' }}>
                Tăng ca sẽ không được tính vào lương tháng này.
              </div>
            )}
          </div>
        )}

        {record?.ghiChuNv && (
          <Alert type="info" message={`NV ghi chú: ${record.ghiChuNv}`} style={{ marginTop: 10, fontSize: 12 }} />
        )}
      </Modal>
    </>
  );
}

export default function ChamCong() {
  const { isAdmin, isKeToan, isLaiXe, isEmployeeView, user } = useAuth();
  const [month, setMonth] = useState(dayjs());
  const [nhanVienList, setNhanVienList] = useState([]);
  const [chamCongMap, setChamCongMap] = useState({}); // { nvId: { dateStr: record } }
  const [statsMap, setStatsMap]       = useState({}); // { nvId: { tongCong, phutBiPhat, penalty } }
  const [loading, setLoading]   = useState(false);
  const [duocDuyet, setDuocDuyet] = useState(false);

  // NV modal
  const [nvModal, setNvModal] = useState({ open: false, record: null });
  const [nvForm] = Form.useForm();

  const days = Array.from({ length: month.daysInMonth() }, (_, i) => month.date(i + 1));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const thang = month.month() + 1;
      const nam = month.year();
      const ccRes = isEmployeeView
        ? await chamCongApi.getMyData(thang, nam)
        : await chamCongApi.getByMonth(thang, nam);

      let nhanVienData = ccRes.data.nhanVienList || [];
      if (!isEmployeeView) {
        const nvRes = await nhanVienApi.getActive();
        nhanVienData = [...(nvRes.data || [])].sort((a, b) => {
          const aLX = a.chucVu === 'LAI_XE' ? 1 : 0;
          const bLX = b.chucVu === 'LAI_XE' ? 1 : 0;
          if (aLX !== bLX) return aLX - bLX;
          return (a.hoTen || '').localeCompare(b.hoTen || '', 'vi');
        });
      }
      setNhanVienList(nhanVienData);
      const map = {};
      (ccRes.data.chamCongList || []).forEach(cc => {
        if (!map[cc.nhanVienId]) map[cc.nhanVienId] = {};
        map[cc.nhanVienId][cc.ngay] = cc;
      });
      setChamCongMap(map);
      setDuocDuyet(ccRes.data.duocDuyet || false);
      setStatsMap(ccRes.data.statsMap || {});
    } catch { message.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [month, isEmployeeView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyChamCongRecord = useCallback((r) => {
    setChamCongMap(prev => {
      const next = { ...prev };
      if (!next[r.nhanVienId]) next[r.nhanVienId] = {};
      next[r.nhanVienId][r.ngay] = r;
      return next;
    });
  }, []);

  const handleSaveCell = async (data) => {
    const res = await chamCongApi.saveOne(data);
    applyChamCongRecord(res.data);
    fetchData(); // refresh stats in background (không await)
  };

  const handleDuyetRecord = async (id, duyetKhongPhat, duyetNote, duyetCong, huyTangCa) => {
    const res = await chamCongApi.duyetRecord(id, duyetKhongPhat, duyetNote, duyetCong, huyTangCa);
    applyChamCongRecord(res.data);
    fetchData(); // refresh stats in background
  };

  const handleDuyetThang = async () => {
    try {
      await chamCongApi.duyet(month.month() + 1, month.year());
      message.success('Đã chốt bảng công tháng ' + month.format('MM/YYYY'));
      setDuocDuyet(true);
    } catch { message.error('Lỗi khi duyệt'); }
  };

  // Tính lại toàn bộ công theo ngưỡng mới
  const handleRecalculate = async () => {
    try {
      const res = await chamCongApi.recalculate(month.month() + 1, month.year());
      message.success(`Đã tính lại ${res.data.updated} bản ghi`);
      fetchData();
    } catch { message.error('Lỗi khi tính lại'); }
  };

  // Import Excel
  const handleImport = async (file) => {
    try {
      message.loading({ content: 'Đang xử lý file...', key: 'import' });
      const res = await chamCongApi.importExcel(file, month.month() + 1, month.year());
      const d = res.data;
      if (d.success > 0) {
        message.success({ content: `Import xong: ${d.success} bản ghi thành công${d.errors > 0 ? `, ${d.errors} lỗi` : ''}`, key: 'import', duration: 4 });
      } else if (d.errors > 0) {
        message.error({ content: `Import thất bại: ${d.errors} lỗi — kiểm tra tên NV và tháng`, key: 'import', duration: 5 });
      } else {
        message.warning({ content: `Không có bản ghi nào được import — kiểm tra tháng trong file có khớp với tháng đang xem (${month.format('MM/YYYY')}) không`, key: 'import', duration: 6 });
      }
      if (d.messages?.length > 0) {
        Modal.warning({ title: 'Chi tiết lỗi import', content: <ul>{d.messages.map((m, i) => <li key={i}>{m}</li>)}</ul> });
      }
      fetchData();
    } catch { message.error({ content: 'Lỗi khi import file', key: 'import' }); }
  };

  // Tải file mẫu
  const handleDownloadTemplate = async () => {
    try {
      const res = await chamCongApi.downloadTemplate(month.month() + 1, month.year());
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `ChamCong_T${month.month() + 1}_${month.year()}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { message.error('Lỗi tải file mẫu'); }
  };

  // NV management
  const handleOpenNv = (record = null) => {
    setNvModal({ open: true, record });
    if (record) {
      nvForm.setFieldsValue({ ...record, ngayVaoLam: record.ngayVaoLam ? dayjs(record.ngayVaoLam) : null });
    } else { nvForm.resetFields(); }
  };

  const handleSaveNv = async () => {
    try {
      const vals = await nvForm.validateFields();
      const payload = { ...vals, ngayVaoLam: vals.ngayVaoLam?.format('YYYY-MM-DD') || null };
      if (nvModal.record) { await nhanVienApi.update(nvModal.record.id, payload); message.success('Đã cập nhật'); }
      else { await nhanVienApi.create(payload); message.success('Đã thêm'); }
      setNvModal({ open: false, record: null });
      fetchData();
    } catch (e) { if (!e.errorFields) message.error('Lỗi'); }
  };

  const handleDeleteNv = async (id) => {
    try { await nhanVienApi.delete(id); message.success('Đã xóa'); fetchData(); }
    catch { message.error('Lỗi khi xóa'); }
  };

  const handleToggleAn = async (nv) => {
    try {
      await nhanVienApi.toggleAnTrongBang(nv.id);
      setNhanVienList(prev => prev.map(n => n.id === nv.id ? { ...n, anTrongBang: !n.anTrongBang } : n));
      message.success(nv.anTrongBang ? `Đã hiện lại ${nv.hoTen}` : `Đã ẩn ${nv.hoTen}`);
    } catch { message.error('Lỗi khi thay đổi trạng thái'); }
  };

  const nvHienThi  = nhanVienList.filter(nv => !nv.anTrongBang);
  const nvAnDi     = nhanVienList.filter(nv => nv.anTrongBang);

  // Tổng thống kê tháng
  const totalWarnings = Object.values(statsMap).filter(s => (s.phutBiPhat || 0) > GRACE_MINUTES).length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="page-header-premium">
        <div className="page-header-left" style={{ flex: 1 }}>
          <div className="page-header-info" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#1F2937' }}>Bảng Chấm Công</span>
            {duocDuyet && <Badge color="green" text="Đã chốt" />}
            {totalWarnings > 0 && (
              <Badge count={totalWarnings} title={`${totalWarnings} NV vượt 90 phút`}
                style={{ backgroundColor: '#EF4444' }} />
            )}
          </div>
          <div className="chamcong-month-nav" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <Button icon={<LeftOutlined />} size="small" onClick={() => setMonth(m => m.subtract(1, 'month'))} />
            <span style={{ fontWeight: 600, fontSize: 13, minWidth: 100, textAlign: 'center', whiteSpace: 'nowrap' }}>
              Tháng {month.format('MM/YYYY')}
            </span>
            <Button icon={<RightOutlined />} size="small" onClick={() => setMonth(m => m.add(1, 'month'))} />
          </div>
        </div>
        <div className="page-header-right chamcong-admin-actions" style={{ gap: 6, flexWrap: 'wrap' }}>
          {!isEmployeeView && <>
            <Button icon={<PlusOutlined />} onClick={() => handleOpenNv()} size="middle">Thêm NV</Button>

            <Tooltip title="Tải file Excel mẫu về điền giờ chấm công">
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>File mẫu</Button>
            </Tooltip>

            <Tooltip title="Tính lại công cho toàn tháng theo ngưỡng hiện tại">
              <Button icon={<SyncOutlined />} onClick={handleRecalculate}>Tính lại</Button>
            </Tooltip>

            <Upload beforeUpload={(file) => { handleImport(file); return false; }} accept=".xlsx,.xls,.csv" showUploadList={false}>
              <Tooltip title="Import Excel từ phần mềm chấm công hoặc file mẫu đã điền">
                <Button icon={<UploadOutlined />} type="dashed">Import CC</Button>
              </Tooltip>
            </Upload>

            <Popconfirm
              title={`Chốt bảng công tháng ${month.format('MM/YYYY')}? Sau khi chốt không thể sửa.`}
              onConfirm={handleDuyetThang}
              disabled={duocDuyet}
            >
              <Button icon={<CheckCircleOutlined />} type="primary" disabled={duocDuyet}>
                Chốt tháng
              </Button>
            </Popconfirm>
          </>}
        </div>
      </div>

      {/* Chú thích quy tắc */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 12, color: '#92400E', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span><b>08:33</b>: Giờ vào chuẩn</span>
        <span><b>Sau 09:30</b>: Tính 1/4 công sáng</span>
        <span><b>Trước 15:30</b>: Tính 1/4 công chiều</span>
        <span><b>Miễn phạt</b>: {GRACE_MINUTES} phút/tháng</span>
        <span><b>Phạt</b>: 30.000đ/phút vượt</span>
        <span style={{ borderLeft: '1px solid #FDE68A', paddingLeft: 16 }}>
          <b style={{ color: '#B45309' }}>Quên CC</b>: 100.000đ/lần — nếu đã chấm không hiện; quá 7 ngày chưa báo/duyệt → xác nhận phạt
        </span>
      </div>

      {/* Monthly stats per employee */}
      {nhanVienList.length > 0 && Object.keys(statsMap).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {nhanVienList.map(nv => {
            const s = statsMap[nv.id] || {};
            const isLaiXeNv = nv.chucVu === 'LAI_XE';
            const phut = s.phutBiPhat || 0;
            const penalty = s.penalty || 0;
            const overGrace = phut > GRACE_MINUTES;
            const tienTangCa     = s.tienTangCa     || 0;
            const tangCaSang     = s.tangCaSang     || 0;
            const tangCaChieu    = s.tangCaChieu    || 0;
            const phuCapGiaoHang = s.phuCapGiaoHang || 0;
            const phiLapDatTranh = s.phiLapDatTranh || 0;
            const chiMuaVatTu    = s.chiMuaVatTu    || 0;
            const tienAn         = s.tienAn         || 0;
            const soGiaoHang     = s.soGiaoHang     || 0;
            const soLapDatTranh  = s.soLapDatTranh  || 0;
            const tongPhuCap     = phuCapGiaoHang + phiLapDatTranh + chiMuaVatTu + tienAn;
            const hasTangCa = isLaiXeNv && (tangCaSang + tangCaChieu) > 0;
            const hasPhuCap = isLaiXeNv && tongPhuCap > 0;

            return (
              <div key={nv.id} style={{
                background: hasTangCa || hasPhuCap ? '#F5F3FF' : overGrace ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${hasTangCa || hasPhuCap ? '#DDD6FE' : overGrace ? '#FECACA' : '#BBF7D0'}`,
                borderRadius: 8, padding: '6px 12px', fontSize: 12, minWidth: 170,
              }}>
                <div style={{ fontWeight: 700, color: '#1F2937', marginBottom: 2 }}>
                  {nv.hoTen}
                  {isLaiXeNv && <Tag color="purple" style={{ marginLeft: 6, fontSize: 9, padding: '0 4px' }}>Lái Xe</Tag>}
                </div>
                <div style={{ color: '#64748B' }}>Công: <b>{Number(s.tongCong || 0).toFixed(2)}</b></div>

                {isLaiXeNv ? (
                  /* Lái xe: hiển thị tăng ca + phụ cấp */
                  <>
                    {hasTangCa ? (
                      <>
                        {tangCaSang > 0 && (
                          <div style={{ color: '#7C3AED' }}>
                            TC sáng: <b>{tangCaSang} ph</b> ({Math.round(tangCaSang * 50000 / 60).toLocaleString('vi-VN')}đ)
                          </div>
                        )}
                        {tangCaChieu > 0 && (
                          <div style={{ color: '#7C3AED' }}>
                            TC chiều: <b>{tangCaChieu} ph</b> ({Math.round(tangCaChieu * 30000 / 60).toLocaleString('vi-VN')}đ)
                          </div>
                        )}
                        <div style={{ color: '#6D28D9', fontWeight: 700 }}>
                          Tổng TC: {tienTangCa.toLocaleString('vi-VN')} đ
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#94A3B8' }}>Không có tăng ca</div>
                    )}
                    {hasPhuCap && (
                      <div style={{ marginTop: 4, borderTop: '1px solid #DDD6FE', paddingTop: 4 }}>
                        {tienAn         > 0 && <div style={{ color: '#15803D' }}>Tiền ăn: <b>{tienAn.toLocaleString('vi-VN')}đ</b></div>}
                        {phuCapGiaoHang > 0 && <div style={{ color: '#15803D' }}>Giao hàng: <b>{Number(soGiaoHang)} đơn</b> ({phuCapGiaoHang.toLocaleString('vi-VN')}đ)</div>}
                        {phiLapDatTranh > 0 && <div style={{ color: '#15803D' }}>Lắp tranh: <b>{Number(soLapDatTranh)} tranh</b> ({phiLapDatTranh.toLocaleString('vi-VN')}đ)</div>}
                        {chiMuaVatTu    > 0 && <div style={{ color: '#B45309' }}>Vật tư chi: <b>{chiMuaVatTu.toLocaleString('vi-VN')}đ</b></div>}
                        <div style={{ color: '#166534', fontWeight: 700 }}>Tổng PC: {tongPhuCap.toLocaleString('vi-VN')}đ</div>
                      </div>
                    )}
                  </>
                ) : (
                  /* NVVP / VNSale: hiển thị muộn/sớm + phạt không CC */
                  <>
                    <div style={{ color: overGrace ? '#DC2626' : '#64748B' }}>
                      Muộn/sớm: <b>{phut} phút</b> {GRACE_MINUTES - phut >= 0
                        ? `(còn ${GRACE_MINUTES - phut}ph)`
                        : `(vượt ${phut - GRACE_MINUTES}ph)`}
                    </div>
                    {overGrace && (
                      <div style={{ color: '#DC2626', fontWeight: 700 }}>
                        Phạt muộn: {penalty.toLocaleString('vi-VN')} đ
                      </div>
                    )}
                    {(s.phatKhongChamCong || 0) > 0 && (
                      <div style={{ color: '#DC2626', fontWeight: 700 }}>
                        Phạt không CC: {(s.phatKhongChamCong).toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Grid chấm công */}
      <div className="chamcong-table-wrapper" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 150 + days.length * 46 }}>
          <colgroup>
            <col style={{ width: 150, minWidth: 130 }} />
            {days.map(d => <col key={d.date()} style={{ width: 46, minWidth: 46 }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{
                width: 150, minWidth: 130, padding: '8px 12px', textAlign: 'left',
                fontWeight: 700, fontSize: 13, borderBottom: '2px solid #E2E8F0',
                borderRight: '1px solid #E2E8F0', position: 'sticky', left: 0, background: '#F8FAFC', zIndex: 2,
              }}>Nhân Viên</th>
              {days.map(d => {
                const isSun   = d.day() === 0;
                const isToday = d.isSame(dayjs(), 'day');
                return (
                  <th key={d.date()} style={{
                    padding: '4px 1px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, borderBottom: '2px solid #E2E8F0',
                    borderRight: '1px solid #F1F5F9',
                    background: isSun ? '#FEF2F2' : isToday ? '#EFF6FF' : '#F8FAFC',
                    color: isSun ? '#DC2626' : isToday ? '#2563EB' : '#374151',
                  }}>
                    <div>{d.format('DD')}</div>
                    <div style={{ fontWeight: 400, fontSize: 9 }}>{['CN','T2','T3','T4','T5','T6','T7'][d.day()]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {nhanVienList.length === 0 && !loading && (
              <tr><td colSpan={days.length + 1} style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
                Chưa có nhân viên. Bấm "Thêm NV" để bắt đầu.
              </td></tr>
            )}
            {nvHienThi.map((nv, idx) => (
              <tr key={nv.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{
                  padding: '6px 12px', fontWeight: 600, fontSize: 12,
                  borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #E2E8F0',
                  position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#FAFAFA', zIndex: 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{nv.hoTen}</span>
                    <Tag color={nv.chucVu === 'LAI_XE' ? 'purple' : nv.chucVu === 'VNSale' || nv.chucVu === 'SALE' ? 'blue' : 'default'}
                      style={{ fontSize: 9, padding: '0 5px', margin: 0, lineHeight: '16px' }}>
                      {CHUC_VU_LABELS[nv.chucVu] || nv.chucVu}
                    </Tag>
                    {(isAdmin || isKeToan) && <>
                      <Button type="text" size="small" icon={<EditOutlined />}
                        style={{ color: '#94A3B8', padding: 0, minWidth: 18, height: 18 }}
                        onClick={() => handleOpenNv(nv)} />
                      <Popconfirm title="Xóa nhân viên?" onConfirm={() => handleDeleteNv(nv.id)}>
                        <Button type="text" size="small" icon={<DeleteOutlined />}
                          style={{ color: '#FCA5A5', padding: 0, minWidth: 18, height: 18 }} danger />
                      </Popconfirm>
                      <Tooltip title="Ẩn nhân viên (nghỉ)">
                        <Button type="text" size="small" icon={<EyeInvisibleOutlined />}
                          style={{ color: '#94A3B8', padding: 0, minWidth: 18, height: 18 }}
                          onClick={() => handleToggleAn(nv)} />
                      </Tooltip>
                    </>}
                  </div>
                </td>
                {days.map(d => {
                  const dateStr = d.format('YYYY-MM-DD');
                  const record  = chamCongMap[nv.id]?.[dateStr] || null;
                  return (
                    <td key={dateStr} style={{
                      borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9',
                      background: d.day() === 0 ? '#FFF7F7' : undefined,
                      verticalAlign: 'middle',
                    }}>
                      <ChamCongCell
                        nv={nv}
                        date={d}
                        record={record}
                        onSave={isEmployeeView ? null : handleSaveCell}
                        onDuyet={isEmployeeView ? null : handleDuyetRecord}
                        isAdmin={isAdmin}
                        isKeToan={isKeToan}
                        duocDuyet={duocDuyet}
                        readOnly={isEmployeeView}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Section nhân viên đang nghỉ */}
            {nvAnDi.length > 0 && (
              <>
                <tr>
                  <td colSpan={days.length + 1} style={{
                    padding: '6px 12px', background: '#FEF3C7',
                    borderTop: '2px solid #F59E0B', borderBottom: '1px solid #FDE68A',
                    fontSize: 11, fontWeight: 700, color: '#92400E',
                    position: 'sticky', left: 0,
                  }}>
                    Nhân viên đang nghỉ ({nvAnDi.length}) — Không tính vào bảng lương
                  </td>
                </tr>
                {nvAnDi.map((nv, idx) => (
                  <tr key={nv.id} style={{ background: idx % 2 === 0 ? '#FFFBEB' : '#FEF9E7', opacity: 0.75 }}>
                    <td style={{
                      padding: '6px 12px', fontSize: 12,
                      borderBottom: '1px solid #FDE68A', borderRight: '1px solid #FDE68A',
                      position: 'sticky', left: 0, background: idx % 2 === 0 ? '#FFFBEB' : '#FEF9E7', zIndex: 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#92400E' }}>{nv.hoTen}</span>
                        <Tag color="warning" style={{ fontSize: 9, padding: '0 5px', margin: 0, lineHeight: '16px' }}>Nghỉ</Tag>
                        {(isAdmin || isKeToan) && (
                          <Tooltip title="Hiện lại nhân viên">
                            <Button type="text" size="small" icon={<EyeOutlined />}
                              style={{ color: '#D97706', padding: 0, minWidth: 18, height: 18 }}
                              onClick={() => handleToggleAn(nv)} />
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    {days.map(d => (
                      <td key={d.format('YYYY-MM-DD')} style={{
                        borderBottom: '1px solid #FDE68A', borderRight: '1px solid #FDE68A',
                        background: d.day() === 0 ? '#FEF3C7' : undefined,
                      }} />
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: '#64748B' }}>
        {[
          { color: '#2563EB', label: 'Đúng giờ' },
          { color: '#F97316', label: 'Muộn/Về sớm' },
          { color: '#EAB308', label: 'Quên CC (≤7 ngày)' },
          { color: '#DC2626', label: 'Quên CC (>7 ngày)' },
          { color: '#E2E8F0', label: 'Chưa chấm' },
          { color: '#94A3B8', label: 'Nghỉ' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
        <span style={{ color: '#94A3B8' }}>· Click ô để nhập giờ | Màu đỏ nhỏ = vượt ngưỡng phạt</span>
      </div>

      {/* NhanVien Modal */}
      <Modal
        title={nvModal.record ? 'Sửa nhân viên' : 'Thêm nhân viên'}
        open={nvModal.open}
        onCancel={() => setNvModal({ open: false, record: null })}
        onOk={handleSaveNv} okText="Lưu" cancelText="Hủy"
        width={520} destroyOnClose
      >
        <Form form={nvForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Họ Tên" name="hoTen" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item label="Mã NV" name="maNv"><Input placeholder="NV001" /></Form.Item>
            <Form.Item label="Loại HĐ" name="loaiHopDong" initialValue="CT">
              <Select>{LOAI_OPTIONS.map(o => <Option key={o} value={o}>{o}</Option>)}</Select>
            </Form.Item>
            <Form.Item label="Chức Vụ" name="chucVu" initialValue="SALE">
              <Select>{CHUC_VU_OPTIONS.map(o => <Option key={o} value={o}>{o}</Option>)}</Select>
            </Form.Item>
          </div>
          <Form.Item label="Lương Cơ Bản (VNVP)" name="luongCoBan">
            <InputNumber min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Tên Sale trong CRM (để tính lương DS)" name="crmUserName">
            <Input placeholder="Khớp chính xác cột Sale trên đơn hàng" />
          </Form.Item>
          <Form.Item label="Ngày Vào Làm" name="ngayVaoLam">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
}
