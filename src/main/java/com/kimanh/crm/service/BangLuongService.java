package com.kimanh.crm.service;

import com.kimanh.crm.entity.BangLuongAdjust;
import com.kimanh.crm.entity.ChamCong;
import com.kimanh.crm.entity.LuongCoCauSale;
import com.kimanh.crm.entity.NhanVien;
import com.kimanh.crm.repository.BangLuongAdjustRepository;
import com.kimanh.crm.repository.ChamCongRepository;
import com.kimanh.crm.repository.DonHangRepository;
import com.kimanh.crm.repository.LuongCoCauSaleRepository;
import com.kimanh.crm.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BangLuongService {

    private final NhanVienRepository nhanVienRepository;
    private final ChamCongRepository chamCongRepository;
    private final BangLuongAdjustRepository adjustRepository;
    private final DonHangRepository donHangRepository;
    private final ChamCongService chamCongService;
    private final LuongCoCauSaleRepository luongCoCauSaleRepository;

    private static final long QUY_CONG_DOAN  = 150_000L;
    private static final long SIM_DT_SALE    = 120_000L;
    private static final long CHUYEN_CAN_BONUS = 500_000L;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> calculateForMonth(int thang, int nam) {
        LocalDate first = LocalDate.of(nam, thang, 1);
        LocalDate last  = first.with(TemporalAdjusters.lastDayOfMonth());

        List<NhanVien> employees = nhanVienRepository.findByTrangThaiTrueOrderByHoTenAsc()
            .stream().filter(nv -> !nv.isAnTrongBang()).toList();
        List<LuongCoCauSale> saleTiers = luongCoCauSaleRepository.findAllByOrderByThuTuAsc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (NhanVien nv : employees) {
            List<ChamCong> records = chamCongRepository.findByNhanVienIdAndNgayBetween(nv.getId(), first, last);

            // Đếm số công từ soCong đã tính (có tính 1/4 ngày)
            double soCongTT = 0;
            int phutBiPhat = 0;
            long phatKhongChamCongTotal = 0;
            for (ChamCong cc : records) {
                if (cc.getSoCong() != null && cc.getSoCong().doubleValue() > 0) {
                    soCongTT += cc.getSoCong().doubleValue();
                } else {
                    // fallback khi chưa có giờ: đếm ca
                    if (isPresent(cc.getCaSang()))  soCongTT += 0.5;
                    if (isPresent(cc.getCaChieu())) soCongTT += 0.5;
                }
                if (!cc.isDuyetKhongPhat()) {
                    phutBiPhat += cc.getPhutTre() + cc.getPhutVeSom();
                    phatKhongChamCongTotal += cc.getPhatKhongChamCong();
                }
            }
            // Tổng phạt từ chấm công (muộn/về sớm + không chấm công)
            long phatTuChamCong = Math.max(0, phutBiPhat - ChamCongService.GRACE_MINUTES)
                                  * ChamCongService.PENALTY_PER_MINUTE + phatKhongChamCongTotal;

            BangLuongAdjust adj = adjustRepository
                .findByNhanVienIdAndThangAndNam(nv.getId(), thang, nam)
                .orElse(new BangLuongAdjust());

            // Mặc định 1 ngày công phép nếu nhân viên có đi làm; 0 nếu không có công thực tế
            // Admin đã lưu record → dùng giá trị đã lưu
            double soCongNghiLe = adj.getId() == null
                    ? (soCongTT > 0 ? 1.0 : 0.0)
                    : safeDouble(adj.getSoCongNghiLe());
            double soCongPhep   = safeDouble(adj.getSoCongPhep());
            double tongCong     = soCongTT + soCongNghiLe + soCongPhep;

            // Xác định loại chức vụ
            String cv = nv.getChucVu() != null ? nv.getChucVu() : "";
            boolean isSale   = "SALE".equals(cv) || "VNSale".equals(cv) || "TRUONG_NHOM".equals(cv);
            boolean isLaiXe  = "LAI_XE".equals(cv);

            // Tổng tiền tăng ca lái xe từ cham_cong
            long tienTangCa = 0;
            if (isLaiXe) {
                tienTangCa = records.stream().mapToLong(ChamCong::getTienTangCa).sum();
            }

            // Tổng phụ cấp lái xe từ cham_cong (tiền ăn + giao hàng + lắp tranh + vật tư)
            long phuCapLaiXe = 0;
            if (isLaiXe) {
                phuCapLaiXe = records.stream().mapToLong(r ->
                    r.getTienAn() + r.getPhuCapGiaoHang() + r.getPhiLapDatTranh() + r.getChiMuaVatTu()
                ).sum();
            }

            // DS Thực Tế + Hoa Hồng đơn hàng (chỉ cho SALE)
            long dsThucTe = 0;
            long hoaHongDonHang = 0;
            if (isSale && nv.getCrmUserName() != null && !nv.getCrmUserName().isBlank()) {
                BigDecimal ds = donHangRepository.sumDsHuongBySaleAndMonth(nv.getCrmUserName(), thang, nam);
                dsThucTe = ds != null ? ds.longValue() : 0;
                BigDecimal hh = donHangRepository.sumHoaHongBySaleAndMonth(nv.getCrmUserName(), thang, nam);
                hoaHongDonHang = hh != null ? hh.longValue() : 0;
            }

            // Tra bảng lương theo DS (SALE) hoặc luongCoBan của nhân viên (non-sale)
            long[] tier = isSale ? getSalaryTierFromDb(dsThucTe, saleTiers)
                                 : new long[]{safeLong(nv.getLuongCoBan()), 0, 0};
            long luongCung   = tier[0];
            long hoaHongBp   = tier[1]; // basis points: 80 = 0.80%
            long thuongBp    = tier[2];

            // Lương CT chỉ tính ngày công thực tế (không gộp nghỉ phép)
            long luongCT       = Math.round(luongCung * soCongTT / 26.0);
            // Tiền công phép = lương cứng / 26 × số ngày phép (cộng riêng vào tổng lương)
            long tienCongPhep  = Math.round(luongCung * soCongNghiLe / 26.0);
            long hoaHongDS  = dsThucTe * hoaHongBp / 10_000;
            long thuongThem = dsThucTe * thuongBp  / 10_000;
            long phuCap     = safeLong(adj.getPhuCap());
            long ungLuong   = safeLong(adj.getUngLuong());
            long phat       = safeLong(adj.getPhat());
            long chiVt      = safeLong(adj.getChiVt());
            long hoaHong    = hoaHongDonHang; // chỉ lấy từ đơn hàng (Doanh Số Tháng)

            // Sim ĐT: từ adj nếu admin đã đặt, ngược lại dùng mặc định theo chức vụ
            long simDtDefault = isSale ? SIM_DT_SALE : 0;
            long simDt = adj.getSimDt() != null ? adj.getSimDt().longValue() : simDtDefault;
            Long simDtOverride = adj.getSimDt() != null ? adj.getSimDt().longValue() : null;
            // Chuyên cần: +500k nếu đủ 26 công (không nghỉ)
            long chuyenCan = tongCong >= 26.0 ? CHUYEN_CAN_BONUS : 0;

            long tongLuong = luongCT + tienCongPhep + hoaHongDS + thuongThem + phuCap + tienTangCa
                           + phuCapLaiXe + hoaHong
                           + simDt + chiVt + chuyenCan
                           - ungLuong - phat - QUY_CONG_DOAN - phatTuChamCong;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bangLuongId",      adj.getId());
            row.put("nhanVienId",       nv.getId());
            row.put("hoTen",            nv.getHoTen());
            row.put("maNv",             nv.getMaNv());
            row.put("loaiHopDong",      nv.getLoaiHopDong());
            row.put("chucVu",           nv.getChucVu());
            row.put("soCongChinhThuc",  soCongTT);
            row.put("soCongNghiLe",     soCongNghiLe);
            row.put("soCongPhep",       soCongPhep);
            row.put("tongCong",         tongCong);
            row.put("dsThucTe",         dsThucTe);
            row.put("luongCung",        luongCung);
            row.put("hoaHongPct",       hoaHongBp / 100.0);
            row.put("luongCT",          luongCT);
            row.put("tienCongPhep",     tienCongPhep);
            row.put("hoaHongDS",        hoaHongDS);
            row.put("thuongThem",       thuongThem);
            row.put("phuCap",           phuCap);
            row.put("ungLuong",         ungLuong);
            row.put("phat",             phat);
            row.put("chiVt",            chiVt);
            row.put("hoaHong",          hoaHong);
            row.put("quyCongDoan",      QUY_CONG_DOAN);
            row.put("simDt",            simDt);
            row.put("simDtOverride",    simDtOverride);
            row.put("chuyenCan",        chuyenCan);
            row.put("tongLuong",        tongLuong);
            row.put("phatTuChamCong",   phatTuChamCong);
            row.put("phutBiPhat",       phutBiPhat);
            row.put("tienTangCa",       tienTangCa);
            row.put("phuCapLaiXe",      phuCapLaiXe);
            row.put("ghiChu",           adj.getGhiChu());
            row.put("daXacNhan",        adj.getDaXacNhan() != null && adj.getDaXacNhan());
            row.put("ngayXacNhan",      adj.getNgayXacNhan());
            result.add(row);
        }
        return result;
    }

    @Transactional
    public BangLuongAdjust upsertAdjust(BangLuongAdjust data) {
        return adjustRepository
            .findByNhanVienIdAndThangAndNam(data.getNhanVienId(), data.getThang(), data.getNam())
            .map(existing -> {
                existing.setPhuCap(data.getPhuCap());
                existing.setUngLuong(data.getUngLuong());
                existing.setPhat(data.getPhat());
                existing.setSoCongNghiLe(data.getSoCongNghiLe());
                existing.setSoCongPhep(data.getSoCongPhep());
                existing.setSimDt(data.getSimDt());
                existing.setChiVt(data.getChiVt());
                existing.setHoaHong(data.getHoaHong());
                existing.setGhiChu(data.getGhiChu());
                return adjustRepository.save(existing);
            })
            .orElseGet(() -> adjustRepository.save(data));
    }

    @Transactional
    public void xacNhanLuong(Long nhanVienId, int thang, int nam) {
        BangLuongAdjust adj = adjustRepository
            .findByNhanVienIdAndThangAndNam(nhanVienId, thang, nam)
            .orElseGet(() -> BangLuongAdjust.builder()
                .nhanVienId(nhanVienId).thang(thang).nam(nam).build());
        adj.setDaXacNhan(true);
        adj.setNgayXacNhan(java.time.OffsetDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
        adjustRepository.save(adj);
    }

    // Trả về {luongCung, hoaHongBasisPoints (80 = 0.80%), thuongBasisPoints} từ DB
    private long[] getSalaryTierFromDb(long ds, List<LuongCoCauSale> tiers) {
        for (LuongCoCauSale t : tiers) {
            long minDs = t.getMinDs() != null ? t.getMinDs() : 0L;
            long maxDs = t.getMaxDs() != null ? t.getMaxDs() : Long.MAX_VALUE;
            if (ds >= minDs && ds < maxDs) {
                return new long[]{t.getLuongCung(), t.getHoaHongBp(), t.getThuongBp()};
            }
        }
        // fallback: tier cuối cùng
        if (!tiers.isEmpty()) {
            LuongCoCauSale last = tiers.get(tiers.size() - 1);
            return new long[]{last.getLuongCung(), last.getHoaHongBp(), last.getThuongBp()};
        }
        return new long[]{5_000_000L, 80, 0};
    }

    private boolean isPresent(String status) {
        return "dung_gio".equals(status) || "di_muon".equals(status);
    }

    private double safeDouble(BigDecimal v) { return v != null ? v.doubleValue() : 0; }
    private long   safeLong(BigDecimal v)   { return v != null ? v.longValue()   : 0; }
}
