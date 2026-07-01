package com.kimanh.crm.service;

import com.kimanh.crm.entity.ChamCong;
import com.kimanh.crm.entity.NhanVien;
import com.kimanh.crm.repository.ChamCongRepository;
import com.kimanh.crm.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChamCongService {

    private final ChamCongRepository chamCongRepository;
    private final NhanVienRepository nhanVienRepository;

    // 90 phút miễn phí / tháng
    public static final int GRACE_MINUTES = 90;
    // 30.000đ / phút vượt quá
    public static final long PENALTY_PER_MINUTE = 30_000L;

    @Transactional(readOnly = true)
    public Map<String, Object> getByMonth(int thang, int nam) {
        LocalDate first = LocalDate.of(nam, thang, 1);
        LocalDate last  = first.with(TemporalAdjusters.lastDayOfMonth());

        List<NhanVien> nhanVienList = nhanVienRepository.findByTrangThaiTrueOrderByHoTenAsc();
        List<ChamCong> records      = chamCongRepository.findByNgayBetweenOrderByNhanVienIdAscNgayAsc(first, last);
        boolean duocDuyet           = records.stream().anyMatch(ChamCong::isDuocDuyet);

        // Monthly stats per employee
        List<Object[]> statsRows = chamCongRepository.monthlyStats(first, last);
        Map<Long, Map<String, Object>> statsMap = new HashMap<>();
        for (Object[] r : statsRows) {
            long nvId              = ((Number) r[0]).longValue();
            double tongCong        = r[1] != null ? ((Number) r[1]).doubleValue() : 0;
            int tongTre            = r[2] != null ? ((Number) r[2]).intValue() : 0;
            int tongVeSom          = r[3] != null ? ((Number) r[3]).intValue() : 0;
            int phutBiPhat         = r[4] != null ? ((Number) r[4]).intValue() : 0;
            long penalty           = Math.max(0, phutBiPhat - GRACE_MINUTES) * PENALTY_PER_MINUTE;
            int tangCaSang         = r[5] != null ? ((Number) r[5]).intValue() : 0;
            int tangCaChieu        = r[6] != null ? ((Number) r[6]).intValue() : 0;
            long tienTangCa        = r[7] != null ? ((Number) r[7]).longValue() : 0;
            long phatKhongChamCong = r[8]  != null ? ((Number) r[8]).longValue()  : 0;
            long phuCapGiaoHang   = r[9]  != null ? ((Number) r[9]).longValue()  : 0;
            long phiLapDatTranh   = r[10] != null ? ((Number) r[10]).longValue() : 0;
            long chiMuaVatTu      = r[11] != null ? ((Number) r[11]).longValue() : 0;
            long tienAn           = r[12] != null ? ((Number) r[12]).longValue() : 0;

            Map<String, Object> s = new HashMap<>();
            s.put("tongCong",           tongCong);
            s.put("tongTre",            tongTre);
            s.put("tongVeSom",          tongVeSom);
            s.put("phutBiPhat",         phutBiPhat);
            s.put("penalty",            penalty);
            s.put("tangCaSang",         tangCaSang);
            s.put("tangCaChieu",        tangCaChieu);
            s.put("tienTangCa",         tienTangCa);
            s.put("phatKhongChamCong",  phatKhongChamCong);
            s.put("phuCapGiaoHang",     phuCapGiaoHang);
            s.put("phiLapDatTranh",     phiLapDatTranh);
            s.put("chiMuaVatTu",        chiMuaVatTu);
            s.put("tienAn",             tienAn);
            statsMap.put(nvId, s);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("nhanVienList", nhanVienList);
        result.put("chamCongList", records);
        result.put("duocDuyet",    duocDuyet);
        result.put("statsMap",     statsMap);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getByMonthForEmployee(int thang, int nam, Long nhanVienId) {
        Map<String, Object> full = getByMonth(thang, nam);
        // Filter to only this employee's data
        @SuppressWarnings("unchecked")
        List<NhanVien> allNv = (List<NhanVien>) full.get("nhanVienList");
        List<NhanVien> filteredNv = allNv.stream()
                .filter(nv -> nv.getId().equals(nhanVienId))
                .toList();
        @SuppressWarnings("unchecked")
        List<com.kimanh.crm.entity.ChamCong> allRecords = (List<com.kimanh.crm.entity.ChamCong>) full.get("chamCongList");
        List<com.kimanh.crm.entity.ChamCong> filteredRecords = allRecords.stream()
                .filter(cc -> nhanVienId.equals(cc.getNhanVienId()))
                .toList();
        @SuppressWarnings("unchecked")
        Map<Long, Map<String, Object>> statsMap = (Map<Long, Map<String, Object>>) full.get("statsMap");
        Map<Long, Map<String, Object>> filteredStats = new HashMap<>();
        if (statsMap.containsKey(nhanVienId)) filteredStats.put(nhanVienId, statsMap.get(nhanVienId));

        Map<String, Object> result = new HashMap<>();
        result.put("nhanVienList", filteredNv);
        result.put("chamCongList", filteredRecords);
        result.put("duocDuyet",    full.get("duocDuyet"));
        result.put("statsMap",     filteredStats);
        return result;
    }

    @Transactional
    public ChamCong saveOne(ChamCong cc) {
        // Xác định chức vụ để tính tăng ca lái xe
        boolean isLaiXe = nhanVienRepository.findById(cc.getNhanVienId())
            .map(nv -> "LAI_XE".equalsIgnoreCase(nv.getChucVu()))
            .orElse(false);

        if (cc.getGioVaoSang() != null || cc.getGioRaChieu() != null
                || cc.getGioRaSang() != null || cc.getGioVaoChieu() != null) {
            cc.calculateFromTime(isLaiXe);
        }

        return chamCongRepository.findByNhanVienIdAndNgay(cc.getNhanVienId(), cc.getNgay())
            .map(existing -> {
                existing.setGioVaoSang(cc.getGioVaoSang());
                existing.setGioRaSang(cc.getGioRaSang());
                existing.setGioVaoChieu(cc.getGioVaoChieu());
                existing.setGioRaChieu(cc.getGioRaChieu());
                existing.setCaSang(cc.getCaSang());
                existing.setCaChieu(cc.getCaChieu());
                existing.setSoCong(cc.getSoCong());
                existing.setPhutTre(cc.getPhutTre());
                existing.setPhutVeSom(cc.getPhutVeSom());
                existing.setTangCaSang(cc.getTangCaSang());
                existing.setTangCaChieu(cc.getTangCaChieu());
                existing.setTienTangCa(cc.getTienTangCa());
                existing.setGhiChu(cc.getGhiChu());
                existing.setGhiChuNv(cc.getGhiChuNv());
                existing.setDaXinPhep(cc.isDaXinPhep());
                existing.setSoGiaoHang(cc.getSoGiaoHang());
                existing.setPhuCapGiaoHang(cc.getPhuCapGiaoHang());
                existing.setSoLapDatTranh(cc.getSoLapDatTranh());
                existing.setPhiLapDatTranh(cc.getPhiLapDatTranh());
                existing.setChiMuaVatTu(cc.getChiMuaVatTu());
                existing.setTienAn(cc.getTienAn());
                return chamCongRepository.save(existing);
            })
            .orElseGet(() -> chamCongRepository.save(cc));
    }

    @Transactional
    public List<ChamCong> saveBulk(List<ChamCong> records) {
        List<ChamCong> saved = new ArrayList<>();
        for (ChamCong cc : records) {
            saved.add(saveOne(cc));
        }
        return saved;
    }

    public ChamCong saveGhiChuNv(Long id, String ghiChuNv) {
        ChamCong cc = chamCongRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi: " + id));
        cc.setGhiChuNv(ghiChuNv);
        return chamCongRepository.save(cc);
    }

    @Transactional
    public ChamCong duyetRecord(Long id, boolean duyetKhongPhat, String duyetNote, Double duyetCong) {
        ChamCong cc = chamCongRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi: " + id));
        cc.setDuyetKhongPhat(duyetKhongPhat);
        cc.setDuyetNote(duyetNote);
        // duyetCong độc lập với duyetKhongPhat
        if (duyetCong != null) {
            cc.setDuyetCong(java.math.BigDecimal.valueOf(duyetCong));
        } else {
            cc.setDuyetCong(null); // null = xóa override, trả về công tính toán
        }
        // Áp dụng lại tính toán với trạng thái duyệt mới
        boolean isLaiXe = nhanVienRepository.findById(cc.getNhanVienId())
            .map(nv -> "LAI_XE".equalsIgnoreCase(nv.getChucVu()))
            .orElse(false);
        if (cc.getGioVaoSang() != null || cc.getGioRaChieu() != null
                || cc.getGioRaSang() != null || cc.getGioVaoChieu() != null) {
            cc.calculateFromTime(isLaiXe);
        }
        return chamCongRepository.save(cc);
    }

    @Transactional
    public int duyetThang(int thang, int nam) {
        LocalDate first = LocalDate.of(nam, thang, 1);
        LocalDate last  = first.with(TemporalAdjusters.lastDayOfMonth());
        return chamCongRepository.duyetThang(first, last);
    }

    // Import từ Excel (định dạng chuẩn hoặc từ phần mềm chấm công)
    // Cột: Ngày | Họ Tên NV | Giờ Vào Sáng | Giờ Ra Chiều
    @Transactional
    public Map<String, Object> importExcel(MultipartFile file, int thang, int nam) throws IOException {
        List<NhanVien> nhanVienList = nhanVienRepository.findByTrangThaiTrueOrderByHoTenAsc();

        int success = 0, errors = 0;
        List<String> errorMessages = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            DateTimeFormatter dateFmt1 = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter dateFmt2 = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            DateTimeFormatter dateFmt3 = DateTimeFormatter.ofPattern("d/M/yyyy");

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    String dateStr    = getCellString(row.getCell(0));
                    String nvName     = getCellString(row.getCell(1));
                    String gioVaoSang = getCellString(row.getCell(2));
                    String gioRaSang  = getCellString(row.getCell(3));
                    String gioVaoChieu= getCellString(row.getCell(4));
                    String gioRaChieu = getCellString(row.getCell(5));

                    if (dateStr.isBlank() || nvName.isBlank()) continue;

                    log.info("Row {}: date='{}' nv='{}' gs='{}' rs='{}' gc='{}' rc='{}'",
                        i + 1, dateStr, nvName, gioVaoSang, gioRaSang, gioVaoChieu, gioRaChieu);

                    LocalDate ngay;
                    try { ngay = LocalDate.parse(dateStr.trim(), dateFmt1); }
                    catch (Exception e1) {
                        try { ngay = LocalDate.parse(dateStr.trim(), dateFmt2); }
                        catch (Exception e2) { ngay = LocalDate.parse(dateStr.trim(), dateFmt3); }
                    }

                    // Kiểm tra thuộc tháng đúng
                    if (ngay.getMonthValue() != thang || ngay.getYear() != nam) {
                        log.warn("Row {}: Skipped — date {} not in {}/{}", i + 1, ngay, thang, nam);
                        continue;
                    }

                    // Tìm nhân viên
                    final String nvNameFinal = nvName.trim();
                    Optional<NhanVien> nvOpt = nhanVienList.stream()
                        .filter(nv -> nv.getHoTen().trim().equalsIgnoreCase(nvNameFinal)
                                   || (nv.getMaNv() != null && nv.getMaNv().equalsIgnoreCase(nvNameFinal)))
                        .findFirst();

                    if (nvOpt.isEmpty()) {
                        errorMessages.add("Dòng " + (i + 1) + ": Không tìm thấy NV '" + nvNameFinal + "'");
                        errors++;
                        continue;
                    }

                    ChamCong cc = ChamCong.builder()
                        .nhanVienId(nvOpt.get().getId())
                        .ngay(ngay)
                        .gioVaoSang(normalizeTime(gioVaoSang))
                        .gioRaSang(normalizeTime(gioRaSang))
                        .gioVaoChieu(normalizeTime(gioVaoChieu))
                        .gioRaChieu(normalizeTime(gioRaChieu))
                        .build();

                    saveOne(cc);
                    success++;
                } catch (Exception ex) {
                    errorMessages.add("Dòng " + (i + 1) + ": " + ex.getMessage());
                    errors++;
                }
            }
        }

        return Map.of("success", success, "errors", errors, "messages", errorMessages);
    }

    // Tạo file Excel mẫu để tải về
    public byte[] exportTemplate(int thang, int nam) throws IOException {
        LocalDate first = LocalDate.of(nam, thang, 1);
        LocalDate last  = first.with(TemporalAdjusters.lastDayOfMonth());
        List<NhanVien> nhanVienList = nhanVienRepository.findByTrangThaiTrueOrderByHoTenAsc();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("ChamCong T" + thang + "-" + nam);

            // Header
            Row header = sheet.createRow(0);
            String[] cols = {
                "Ngày", "Họ Tên Nhân Viên",
                "Giờ Vào Sáng (08:33)", "Giờ Ra Sáng (11:45)",
                "Giờ Vào Chiều (13:30)", "Giờ Ra Chiều (17:00)",
                "Ghi Chú"
            };
            for (int i = 0; i < cols.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(cols[i]);
            }

            // Sample rows: mỗi NV × mỗi ngày trong tháng (bỏ CN)
            int rowNum = 1;
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
                if (d.getDayOfWeek().getValue() == 7) continue; // Bỏ CN
                for (NhanVien nv : nhanVienList) {
                    boolean isLaiXe = "LAI_XE".equalsIgnoreCase(nv.getChucVu());
                    Row r = sheet.createRow(rowNum++);
                    r.createCell(0).setCellValue(d.format(fmt));
                    r.createCell(1).setCellValue(nv.getHoTen() != null ? nv.getHoTen() : "");
                    r.createCell(2).setCellValue("08:30");                   // vào sáng
                    r.createCell(3).setCellValue(isLaiXe ? "" : "11:45");   // ra sáng (lái xe để trống)
                    r.createCell(4).setCellValue(isLaiXe ? "" : "13:30");   // vào chiều (lái xe để trống)
                    r.createCell(5).setCellValue("17:00");                   // ra chiều
                    r.createCell(6).setCellValue("");
                }
            }

            sheet.setColumnWidth(0, 15 * 256);
            sheet.setColumnWidth(1, 22 * 256);
            sheet.setColumnWidth(2, 20 * 256);
            sheet.setColumnWidth(3, 20 * 256);
            sheet.setColumnWidth(4, 20 * 256);
            sheet.setColumnWidth(5, 20 * 256);
            sheet.setColumnWidth(6, 25 * 256);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    // Tính lại toàn bộ công cho tất cả record có giờ trong tháng
    @Transactional
    public int recalculate(int thang, int nam) {
        LocalDate first = LocalDate.of(nam, thang, 1);
        LocalDate last  = first.with(TemporalAdjusters.lastDayOfMonth());
        List<ChamCong> records = chamCongRepository.findByNgayBetweenOrderByNhanVienIdAscNgayAsc(first, last);
        int count = 0;
        for (ChamCong cc : records) {
            if (cc.getGioVaoSang() != null || cc.getGioRaChieu() != null
                    || cc.getGioRaSang() != null || cc.getGioVaoChieu() != null) {
                boolean isLaiXe = nhanVienRepository.findById(cc.getNhanVienId())
                    .map(nv -> "LAI_XE".equalsIgnoreCase(nv.getChucVu()))
                    .orElse(false);
                cc.calculateFromTime(isLaiXe);
                chamCongRepository.save(cc);
                count++;
            }
        }
        return count;
    }

    // Lấy monthly stats riêng (dùng cho BangLuong)
    @Transactional(readOnly = true)
    public Map<Long, Map<String, Object>> getMonthlyStats(int thang, int nam) {
        LocalDate first = LocalDate.of(nam, thang, 1);
        LocalDate last  = first.with(TemporalAdjusters.lastDayOfMonth());
        List<Object[]> rows = chamCongRepository.monthlyStats(first, last);
        Map<Long, Map<String, Object>> result = new HashMap<>();
        for (Object[] r : rows) {
            long nvId      = ((Number) r[0]).longValue();
            double tongCong = r[1] != null ? ((Number) r[1]).doubleValue() : 0;
            int phutBiPhat  = r[4] != null ? ((Number) r[4]).intValue() : 0;
            long penalty    = Math.max(0, phutBiPhat - GRACE_MINUTES) * PENALTY_PER_MINUTE;
            result.put(nvId, Map.of("tongCong", tongCong, "penalty", penalty, "phutBiPhat", phutBiPhat));
        }
        return result;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    double val = cell.getNumericCellValue();
                    if (val < 1.0) {
                        // Ô giờ (fraction of day): lấy phần giờ:phút:giây
                        java.time.LocalDateTime ldt = cell.getLocalDateTimeCellValue();
                        yield String.format("%02d:%02d:%02d",
                            ldt.getHour(), ldt.getMinute(), ldt.getSecond());
                    }
                    yield cell.getLocalDateTimeCellValue().toLocalDate()
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }
                yield String.valueOf((long) cell.getNumericCellValue());
            }
            default -> "";
        };
    }

    private String normalizeTime(String t) {
        if (t == null || t.isBlank()) return null;
        t = t.trim();
        // HH:mm:ss hoặc H:mm:ss — bỏ giây, chỉ lấy giờ:phút
        if (t.matches("\\d{1,2}:\\d{2}:\\d{2}")) {
            String[] p = t.split(":");
            return String.format("%02d:%02d", Integer.parseInt(p[0]), Integer.parseInt(p[1]));
        }
        // HH:mm hoặc H:mm
        if (t.matches("\\d{1,2}:\\d{2}")) {
            String[] p = t.split(":");
            return String.format("%02d:%02d", Integer.parseInt(p[0]), Integer.parseInt(p[1]));
        }
        return null;
    }
}
