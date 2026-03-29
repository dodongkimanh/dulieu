package com.kimanh.crm.service;

import com.kimanh.crm.entity.DonHang;
import com.kimanh.crm.repository.DonHangRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DonHangService {

    private final DonHangRepository repository;

    private String blankToNull(String s) {
        return (s != null && !s.isBlank()) ? s : null;
    }

    public Page<DonHang> findAll(String keyword, String tinhTrang, String sale,
                                  String page, String maIdQuangCao,
                                  LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return repository.findWithFilters(
                blankToNull(keyword), blankToNull(tinhTrang), blankToNull(sale),
                blankToNull(page), blankToNull(maIdQuangCao), fromDate, toDate, unsorted);
    }

    public DonHang findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại: " + id));
    }

    public DonHang create(DonHang entity) {
        // Allow manual Mã Hóa Đơn; auto-generate if blank
        if (entity.getMaHoaDon() == null || entity.getMaHoaDon().isBlank()) {
            String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String prefix = "HD-" + datePart + "-";
            int maxSeq = repository.findMaxInvoiceSeq(prefix);
            entity.setMaHoaDon(String.format("%s%03d", prefix, maxSeq + 1));
        }
        return repository.save(entity);
    }

    public DonHang update(Long id, DonHang data) {
        DonHang e = findById(id);
        e.setNgay(data.getNgay());
        e.setMaDatHang(data.getMaDatHang());
        e.setKhachHang(data.getKhachHang());
        e.setSdt(data.getSdt());
        e.setSale(data.getSale());
        e.setGiaVon(data.getGiaVon());
        e.setTongTienNiemYet(data.getTongTienNiemYet());
        e.setGiaBanLenDon(data.getGiaBanLenDon());
        e.setCuocPhuTroi(data.getCuocPhuTroi());
        e.setTinhTrang(data.getTinhTrang());
        e.setMaVanDon(data.getMaVanDon());
        e.setChiPhiVanChuyen(data.getChiPhiVanChuyen());
        e.setDsVanChuyen(data.getDsVanChuyen());
        e.setDatCoc(data.getDatCoc());
        e.setThuBanTrucTiep(data.getThuBanTrucTiep());
        e.setPage(data.getPage());
        e.setMaIdQuangCao(data.getMaIdQuangCao());
        e.setGhiChu(data.getGhiChu());
        return repository.save(e);
    }

    public DonHang updateStatus(Long id, String tinhTrang) {
        DonHang e = findById(id);
        e.setTinhTrang(tinhTrang);
        return repository.save(e);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    // Dashboard stats
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("tongDonHang", repository.count());
        stats.put("tongDoanhThu", repository.sumTotalRevenue());
        stats.put("donMoiHomNay", repository.countTodayOrders(LocalDate.now()));
        stats.put("donHoanThanh", repository.countCompleted());
        long total = repository.count();
        long completed = repository.countCompleted();
        double conversionRate = total > 0 ? (double) completed / total * 100 : 0;
        stats.put("tyLeChuyenDoi", Math.round(conversionRate * 10.0) / 10.0);
        return stats;
    }

    public List<Map<String, Object>> getRevenueByMonth() {
        LocalDate startDate = LocalDate.now().minusMonths(11).withDayOfMonth(1);
        List<Object[]> results = repository.revenueByMonth(startDate);
        List<Map<String, Object>> data = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("month", row[0]);
            item.put("revenue", row[1]);
            data.add(item);
        }
        return data;
    }

    public List<Map<String, Object>> getOrdersByDay() {
        LocalDate startDate = LocalDate.now().minusDays(30);
        List<Object[]> results = repository.ordersByDay(startDate);
        List<Map<String, Object>> data = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("day", row[0]);
            item.put("total", row[1]);
            data.add(item);
        }
        return data;
    }

    public List<Map<String, Object>> getOrderStatusDistribution() {
        List<Object[]> results = repository.orderStatusDistribution();
        List<Map<String, Object>> data = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("status", row[0] != null ? row[0] : "Không xác định");
            item.put("count", row[1]);
            data.add(item);
        }
        return data;
    }

    public List<DonHang> getRecentOrders() {
        return repository.findTop10ByOrderByCreatedAtDesc();
    }

    public List<String> getDistinctSales() {
        return repository.findDistinctSales();
    }

    public List<String> getDistinctPages() {
        return repository.findDistinctPages();
    }

    // Beautiful Excel export
    public byte[] exportToExcel(String keyword, String tinhTrang, String sale,
                                 String page, String maIdQuangCao,
                                 LocalDate fromDate, LocalDate toDate) throws IOException {

        List<DonHang> orders = repository.findAllWithFilters(
                blankToNull(keyword), blankToNull(tinhTrang), blankToNull(sale),
                blankToNull(page), blankToNull(maIdQuangCao), fromDate, toDate);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Đơn hàng");
            sheet.setDefaultColumnWidth(14);

            // -- Styles (cast to XSSFCellStyle for custom RGB colors) --
            XSSFFont titleFont = (XSSFFont) workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFCellStyle titleStyle = (XSSFCellStyle) workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            titleStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 79, (byte) 70, (byte) 229}, null));
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFFont headerFont = (XSSFFont) workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 10);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFCellStyle headerStyle = (XSSFCellStyle) workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 55, (byte) 65, (byte) 81}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setWrapText(true);
            setBorders(headerStyle, BorderStyle.THIN);

            CellStyle numberStyle = workbook.createCellStyle();
            numberStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            numberStyle.setAlignment(HorizontalAlignment.RIGHT);
            setBorders(numberStyle, BorderStyle.THIN);

            CellStyle percentStyle = workbook.createCellStyle();
            percentStyle.setDataFormat(workbook.createDataFormat().getFormat("0.00\"%\""));
            percentStyle.setAlignment(HorizontalAlignment.CENTER);
            setBorders(percentStyle, BorderStyle.THIN);

            CellStyle textStyle = workbook.createCellStyle();
            setBorders(textStyle, BorderStyle.THIN);
            textStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(workbook.createDataFormat().getFormat("dd/MM/yyyy"));
            setBorders(dateStyle, BorderStyle.THIN);
            dateStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFFont greenFont = (XSSFFont) workbook.createFont();
            greenFont.setBold(true);
            greenFont.setColor(new XSSFColor(new byte[]{(byte) 16, (byte) 185, (byte) 129}, null));
            CellStyle profitStyle = workbook.createCellStyle();
            profitStyle.cloneStyleFrom(numberStyle);
            profitStyle.setFont(greenFont);

            // Row 0: Title
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(36);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BÁO CÁO ĐƠN HÀNG - ĐỒ ĐỒNG KIM ÁNH");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 24));

            // Row 1: Date range info
            Row infoRow = sheet.createRow(1);
            infoRow.setHeightInPoints(20);
            CellStyle infoStyle = workbook.createCellStyle();
            Font infoFont = workbook.createFont();
            infoFont.setItalic(true);
            infoFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            infoStyle.setFont(infoFont);
            infoStyle.setAlignment(HorizontalAlignment.CENTER);
            Cell infoCell = infoRow.createCell(0);
            infoCell.setCellValue("Xuất ngày: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    + " | Tổng: " + orders.size() + " đơn");
            infoCell.setCellStyle(infoStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 24));

            // Row 3: Headers
            String[] headers = {
                "STT", "Ngày", "Mã Hóa Đơn", "Mã Đặt Hàng", "Khách Hàng", "SĐT", "Sale",
                "Giá Vốn", "Tổng Tiền\n(Niêm Yết)", "Giá Bán\nLên Đơn", "Cước\nPhụ Trội",
                "Giá Thu\nThực Tế", "Tỷ Lệ CK %", "Lợi Nhuận\nƯớc Tính", "Tình Trạng",
                "Mã Vận Đơn", "CP Vận\nChuyển", "ĐS Vận\nChuyển", "Đặt Cọc/CK",
                "Thu Bán\nTrực Tiếp", "Tổng Thu\nKhách", "LN Sau Trừ\nVốn & VC",
                "Page", "Mã ID Bài\nQuảng Cáo", "Ghi Chú"
            };
            Row headerRow = sheet.createRow(3);
            headerRow.setHeightInPoints(32);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            int rowNum = 4;
            BigDecimal totalGiaVon = BigDecimal.ZERO;
            BigDecimal totalDoanhThu = BigDecimal.ZERO;
            BigDecimal totalLoiNhuan = BigDecimal.ZERO;

            // Alternating row color
            XSSFCellStyle evenTextStyle = (XSSFCellStyle) workbook.createCellStyle();
            evenTextStyle.cloneStyleFrom(textStyle);
            evenTextStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 249, (byte) 250, (byte) 251}, null));
            evenTextStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle evenNumberStyle = (XSSFCellStyle) workbook.createCellStyle();
            evenNumberStyle.cloneStyleFrom(numberStyle);
            evenNumberStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 249, (byte) 250, (byte) 251}, null));
            evenNumberStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle evenDateStyle = (XSSFCellStyle) workbook.createCellStyle();
            evenDateStyle.cloneStyleFrom(dateStyle);
            evenDateStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 249, (byte) 250, (byte) 251}, null));
            evenDateStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            for (int idx = 0; idx < orders.size(); idx++) {
                DonHang d = orders.get(idx);
                boolean even = idx % 2 == 1;
                CellStyle ts = even ? evenTextStyle : textStyle;
                CellStyle ns = even ? evenNumberStyle : numberStyle;
                CellStyle ds = even ? evenDateStyle : dateStyle;

                Row row = sheet.createRow(rowNum++);
                int c = 0;
                Cell stt = row.createCell(c++); stt.setCellValue(idx + 1); stt.setCellStyle(ts);

                Cell dateCell = row.createCell(c++);
                if (d.getNgay() != null) dateCell.setCellValue(d.getNgay().format(fmt));
                dateCell.setCellStyle(ds);

                Cell cc;
                cc = row.createCell(c++); cc.setCellValue(str(d.getMaHoaDon())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getMaDatHang())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getKhachHang())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getSdt())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getSale())); cc.setCellStyle(ts);

                cc = row.createCell(c++); cc.setCellValue(num(d.getGiaVon())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getTongTienNiemYet())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getGiaBanLenDon())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getCuocPhuTroi())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getGiaThuThucTe())); cc.setCellStyle(ns);

                cc = row.createCell(c++);
                cc.setCellValue(d.getTyLeCk() != null ? d.getTyLeCk().doubleValue() : 0);
                cc.setCellStyle(percentStyle);

                cc = row.createCell(c++); cc.setCellValue(num(d.getLoiNhuanUocTinh())); cc.setCellStyle(profitStyle);
                cc = row.createCell(c++); cc.setCellValue(str(d.getTinhTrang())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getMaVanDon())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(num(d.getChiPhiVanChuyen())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getDsVanChuyen())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getDatCoc())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getThuBanTrucTiep())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getTongThuKhach())); cc.setCellStyle(ns);
                cc = row.createCell(c++); cc.setCellValue(num(d.getLoiNhuanSauTru())); cc.setCellStyle(profitStyle);
                cc = row.createCell(c++); cc.setCellValue(str(d.getPage())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getMaIdQuangCao())); cc.setCellStyle(ts);
                cc = row.createCell(c++); cc.setCellValue(str(d.getGhiChu())); cc.setCellStyle(ts);

                totalGiaVon = totalGiaVon.add(d.getGiaVon() != null ? d.getGiaVon() : BigDecimal.ZERO);
                totalDoanhThu = totalDoanhThu.add(d.getGiaThuThucTe() != null ? d.getGiaThuThucTe() : BigDecimal.ZERO);
                totalLoiNhuan = totalLoiNhuan.add(d.getLoiNhuanSauTru() != null ? d.getLoiNhuanSauTru() : BigDecimal.ZERO);
            }

            // Summary row
            XSSFCellStyle sumStyle = (XSSFCellStyle) workbook.createCellStyle();
            Font sumFont = workbook.createFont();
            sumFont.setBold(true);
            sumFont.setFontHeightInPoints((short) 11);
            sumStyle.setFont(sumFont);
            sumStyle.setAlignment(HorizontalAlignment.RIGHT);
            sumStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 238, (byte) 242, (byte) 255}, null));
            sumStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            sumStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            setBorders(sumStyle, BorderStyle.MEDIUM);

            XSSFCellStyle sumLabelStyle = (XSSFCellStyle) workbook.createCellStyle();
            sumLabelStyle.cloneStyleFrom(sumStyle);
            sumLabelStyle.setAlignment(HorizontalAlignment.CENTER);

            Row sumRow = sheet.createRow(rowNum);
            sumRow.setHeightInPoints(24);
            Cell sumLabel = sumRow.createCell(0);
            sumLabel.setCellValue("TỔNG CỘNG");
            sumLabel.setCellStyle(sumLabelStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowNum, rowNum, 0, 6));

            Cell sv = sumRow.createCell(7); sv.setCellValue(totalGiaVon.doubleValue()); sv.setCellStyle(sumStyle);
            Cell sr = sumRow.createCell(11); sr.setCellValue(totalDoanhThu.doubleValue()); sr.setCellStyle(sumStyle);
            Cell sp = sumRow.createCell(21); sp.setCellValue(totalLoiNhuan.doubleValue()); sp.setCellStyle(sumStyle);

            // Column widths
            int[] widths = {6, 12, 16, 14, 20, 14, 16, 14, 14, 14, 10, 14, 10, 14, 18, 16, 12, 12, 12, 14, 14, 16, 22, 16, 18};
            for (int i = 0; i < widths.length; i++) {
                sheet.setColumnWidth(i, widths[i] * 256);
            }

            // Freeze header
            sheet.createFreezePane(0, 4);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void setBorders(CellStyle style, BorderStyle border) {
        style.setBorderTop(border);
        style.setBorderBottom(border);
        style.setBorderLeft(border);
        style.setBorderRight(border);
    }

    private String str(String s) { return s != null ? s : ""; }
    private double num(BigDecimal b) { return b != null ? b.doubleValue() : 0; }
}
