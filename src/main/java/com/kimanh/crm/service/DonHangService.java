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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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

    @Caching(evict = {
        @CacheEvict(value = "donhang_dashboard_stats", allEntries = true),
        @CacheEvict(value = "donhang_revenue_monthly", allEntries = true),
        @CacheEvict(value = "donhang_orders_daily", allEntries = true),
        @CacheEvict(value = "donhang_order_status", allEntries = true),
        @CacheEvict(value = "donhang_recent_orders", allEntries = true)
    })
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

    @Caching(evict = {
        @CacheEvict(value = "donhang_dashboard_stats", allEntries = true),
        @CacheEvict(value = "donhang_revenue_monthly", allEntries = true),
        @CacheEvict(value = "donhang_orders_daily", allEntries = true),
        @CacheEvict(value = "donhang_order_status", allEntries = true),
        @CacheEvict(value = "donhang_recent_orders", allEntries = true)
    })
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

    @Caching(evict = {
        @CacheEvict(value = "donhang_dashboard_stats", allEntries = true),
        @CacheEvict(value = "donhang_revenue_monthly", allEntries = true),
        @CacheEvict(value = "donhang_orders_daily", allEntries = true),
        @CacheEvict(value = "donhang_order_status", allEntries = true),
        @CacheEvict(value = "donhang_recent_orders", allEntries = true)
    })
    public DonHang updateStatus(Long id, String tinhTrang) {
        DonHang e = findById(id);
        e.setTinhTrang(tinhTrang);
        return repository.save(e);
    }

    @Caching(evict = {
        @CacheEvict(value = "donhang_dashboard_stats", allEntries = true),
        @CacheEvict(value = "donhang_revenue_monthly", allEntries = true),
        @CacheEvict(value = "donhang_orders_daily", allEntries = true),
        @CacheEvict(value = "donhang_order_status", allEntries = true),
        @CacheEvict(value = "donhang_recent_orders", allEntries = true)
    })
    public void delete(Long id) {
        repository.deleteById(id);
    }

    // Dashboard stats with optional date filter
    @Cacheable(value = "donhang_dashboard_stats")
    public Map<String, Object> getDashboardStats() {
        return getDashboardStats(null, null);
    }

    public Map<String, Object> getDashboardStats(LocalDate fromDate, LocalDate toDate) {
        Map<String, Object> stats = new LinkedHashMap<>();
        long total = repository.countByDateRange(fromDate, toDate);
        long completed = repository.countCompletedByDateRange(fromDate, toDate);
        stats.put("tongDonHang", total);
        stats.put("tongDoanhThu", repository.sumTotalRevenueByDateRange(fromDate, toDate));
        // FIXED: donMoiHomNay tuân theo dateRange, không hardcode LocalDate.now()
        stats.put("donMoiHomNay", repository.countByDateRange(LocalDate.now(), LocalDate.now()));
        stats.put("donHoanThanh", completed);
        double conversionRate = total > 0 ? (double) completed / total * 100 : 0;
        stats.put("tyLeChuyenDoi", Math.round(conversionRate * 10.0) / 10.0);
        return stats;
    }

    @Deprecated
    @Cacheable(value = "donhang_dashboard_stats_old")
    public Map<String, Object> getDashboardStatsOld() {
        Map<String, Object> stats = new LinkedHashMap<>();
        long total = repository.count();
        long completed = repository.countCompleted();
        stats.put("tongDonHang", total);
        stats.put("tongDoanhThu", repository.sumTotalRevenue());
        stats.put("donMoiHomNay", repository.countTodayOrders(LocalDate.now()));
        stats.put("donHoanThanh", completed);
        double conversionRate = total > 0 ? (double) completed / total * 100 : 0;
        stats.put("tyLeChuyenDoi", Math.round(conversionRate * 10.0) / 10.0);
        return stats;
    }

    @Cacheable(value = "donhang_revenue_monthly")
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

    @Cacheable(value = "donhang_orders_daily")
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

    @Cacheable(value = "donhang_order_status")
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

    @Cacheable(value = "donhang_recent_orders")
    public List<DonHang> getRecentOrders() {
        return repository.findTop10ByOrderByCreatedAtDesc();
    }

    public List<String> getDistinctSales() {
        return repository.findDistinctSales();
    }

    public List<String> getDistinctPages() {
        return repository.findDistinctPages();
    }

    // Analytics for TongQuat page
    public Map<String, Object> getAnalytics(LocalDate fromDate, LocalDate toDate) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Totals
        List<Object[]> totalsList = repository.aggregateTotals(fromDate, toDate);
        if (totalsList != null && !totalsList.isEmpty()) {
            Object[] totals = totalsList.get(0);
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("tongDon", ((Number) totals[0]).longValue());
            t.put("sumGiaBan", totals[1]);
            t.put("sumGiaThu", totals[2]);
            t.put("sumLoiNhuan", totals[3]);
            t.put("sumGiaVon", totals[4]);
            t.put("sumCPVC", totals[5]);
            t.put("sumLNSauTru", totals[6]);
            result.put("totals", t);
        } else {
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("tongDon", 0L);
            t.put("sumGiaBan", BigDecimal.ZERO);
            t.put("sumGiaThu", BigDecimal.ZERO);
            t.put("sumLoiNhuan", BigDecimal.ZERO);
            t.put("sumGiaVon", BigDecimal.ZERO);
            t.put("sumCPVC", BigDecimal.ZERO);
            t.put("sumLNSauTru", BigDecimal.ZERO);
            result.put("totals", t);
        }

        // By sale + status
        List<Object[]> bySaleStatus = repository.aggregateBySaleAndStatus(fromDate, toDate);
        List<Map<String, Object>> saleStatusData = new ArrayList<>();
        for (Object[] row : bySaleStatus) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sale", row[0] != null ? row[0] : "Không xác định");
            item.put("tinhTrang", row[1] != null ? row[1] : "Không xác định");
            item.put("count", ((Number) row[2]).longValue());
            item.put("sumGiaBan", row[3]);
            item.put("sumGiaThu", row[4]);
            item.put("sumLoiNhuan", row[5]);
            item.put("sumGiaVon", row[6]);
            item.put("sumCPVC", row[7]);
            saleStatusData.add(item);
        }
        result.put("bySaleStatus", saleStatusData);

        // By date
        List<Object[]> byDate = repository.aggregateByDate(fromDate, toDate);
        List<Map<String, Object>> dateData = new ArrayList<>();
        for (Object[] row : byDate) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", row[0]);
            item.put("count", ((Number) row[1]).longValue());
            item.put("sumGiaBan", row[2]);
            item.put("sumGiaThu", row[3]);
            item.put("sumLoiNhuan", row[4]);
            dateData.add(item);
        }
        result.put("byDate", dateData);

        return result;
    }

    // Sale dashboard: revenue stats for a specific sale
    public Map<String, Object> getSaleRevenue(String sale, LocalDate fromDate, LocalDate toDate) {
        Map<String, Object> result = new LinkedHashMap<>();

        BigDecimal totalRevenue = repository.sumRevenueBySale(sale, fromDate, toDate);
        BigDecimal qualifiedRevenue = repository.sumQualifiedRevenueBySale(sale, fromDate, toDate);

        result.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
        result.put("qualifiedRevenue", qualifiedRevenue != null ? qualifiedRevenue : BigDecimal.ZERO);
        result.put("messAllocation", calculateMessAllocation(qualifiedRevenue));

        // Orders by status
        List<Object[]> byStatus = repository.ordersByStatusForSale(sale, fromDate, toDate);
        List<Map<String, Object>> statusData = new ArrayList<>();
        long totalOrders = 0;
        for (Object[] row : byStatus) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("tinhTrang", row[0] != null ? row[0] : "Không xác định");
            long cnt = ((Number) row[1]).longValue();
            item.put("count", cnt);
            item.put("revenue", row[2]);
            statusData.add(item);
            totalOrders += cnt;
        }
        result.put("ordersByStatus", statusData);
        result.put("totalOrders", totalOrders);

        return result;
    }

    // Mess (message) allocation based on qualified revenue tiers (Ngân Sách QC 12%, 65k/Mess)
    private int calculateMessAllocation(BigDecimal revenue) {
        if (revenue == null) return 92;
        long rev = revenue.longValue();
        if (rev < 50_000_000L) return 92;
        if (rev < 75_000_000L) return 138;
        if (rev < 100_000_000L) return 184;
        if (rev < 125_000_000L) return 230;
        if (rev < 150_000_000L) return 276;
        if (rev < 175_000_000L) return 323;
        if (rev < 200_000_000L) return 369;
        if (rev < 250_000_000L) return 461;
        if (rev < 300_000_000L) return 553;
        if (rev < 350_000_000L) return 646;
        if (rev < 400_000_000L) return 738;
        if (rev < 450_000_000L) return 830;
        if (rev < 500_000_000L) return 923;
        return 984;
    }

    // Professional Excel export with premium styling
    public byte[] exportToExcel(String keyword, String tinhTrang, String sale,
                                 String page, String maIdQuangCao,
                                 LocalDate fromDate, LocalDate toDate) throws IOException {

        List<DonHang> orders = repository.findAllWithFilters(
                blankToNull(keyword), blankToNull(tinhTrang), blankToNull(sale),
                blankToNull(page), blankToNull(maIdQuangCao), fromDate, toDate);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Đơn hàng");
            sheet.setDefaultColumnWidth(14);

            // ===== PREMIUM STYLES =====
            XSSFFont titleFont = (XSSFFont) workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 18);
            titleFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFCellStyle titleStyle = (XSSFCellStyle) workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            titleStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 79, (byte) 70, (byte) 229}, null));
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setBorders(titleStyle, BorderStyle.MEDIUM);

            XSSFFont headerFont = (XSSFFont) workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
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
            numberStyle.setVerticalAlignment(VerticalAlignment.CENTER);

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

            XSSFFont profitFont = (XSSFFont) workbook.createFont();
            profitFont.setBold(true);
            profitFont.setFontHeightInPoints((short) 10);
            profitFont.setColor(new XSSFColor(new byte[]{(byte) 16, (byte) 185, (byte) 129}, null));
            CellStyle profitStyle = workbook.createCellStyle();
            profitStyle.cloneStyleFrom(numberStyle);
            profitStyle.setFont(profitFont);

            // Alternating row styles with subtle colors
            XSSFCellStyle oddTextStyle = (XSSFCellStyle) workbook.createCellStyle();
            oddTextStyle.cloneStyleFrom(textStyle);
            oddTextStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 255, (byte) 255, (byte) 255}, null));
            oddTextStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle evenTextStyle = (XSSFCellStyle) workbook.createCellStyle();
            evenTextStyle.cloneStyleFrom(textStyle);
            evenTextStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 248, (byte) 250, (byte) 255}, null));
            evenTextStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle evenNumberStyle = (XSSFCellStyle) workbook.createCellStyle();
            evenNumberStyle.cloneStyleFrom(numberStyle);
            evenNumberStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 248, (byte) 250, (byte) 255}, null));
            evenNumberStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            XSSFCellStyle evenDateStyle = (XSSFCellStyle) workbook.createCellStyle();
            evenDateStyle.cloneStyleFrom(dateStyle);
            evenDateStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 248, (byte) 250, (byte) 255}, null));
            evenDateStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Row 0: Title
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(40);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("📊 BÁO CÁO ĐƠN HÀNG - ĐỒ ĐỒNG KIM ÁNH 📊");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 24));

            // Row 1: Spacer
            sheet.createRow(1).setHeightInPoints(8);

            // Row 2: Date range info
            Row infoRow = sheet.createRow(2);
            infoRow.setHeightInPoints(18);
            CellStyle infoStyle = workbook.createCellStyle();
            Font infoFont = workbook.createFont();
            infoFont.setItalic(true);
            infoFont.setFontHeightInPoints((short) 10);
            infoFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            infoStyle.setFont(infoFont);
            infoStyle.setAlignment(HorizontalAlignment.CENTER);
            Cell infoCell = infoRow.createCell(0);
            String infoText = "Xuất ngày: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    + " |  Tổng: " + orders.size() + " đơn";
            if (fromDate != null || toDate != null) {
                infoText += " |  Khoảng: ";
                if (fromDate != null) infoText += fromDate.format(DateTimeFormatter.ofPattern("dd/MM"));
                if (toDate != null) infoText += " → " + toDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
            infoCell.setCellValue(infoText);
            infoCell.setCellStyle(infoStyle);
            sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, 24));

            // Row 4: Headers
            String[] headers = {
                "STT", "Ngày", "Mã Hóa Đơn", "Mã Đặt Hàng", "Khách Hàng", "SĐT", "Sale",
                "Giá Vốn", "Tổng Tiền\n(Niêm Yết)", "Giá Bán\nLên Đơn", "Cước\nPhụ Trội",
                "Giá Thu\nThực Tế", "Tỷ Lệ CK %", "Lợi Nhuận\nƯớc Tính", "Tình Trạng",
                "Mã Vận Đơn", "CP Vận\nChuyển", "ĐS Vận\nChuyển", "Đặt Cọc/CK",
                "Thu Bán\nTrực Tiếp", "Tổng Thu\nKhách", "LN Sau Trừ\nVốn & VC",
                "Page", "Mã ID Bài\nQuảng Cáo", "Ghi Chú"
            };
            Row headerRow = sheet.createRow(4);
            headerRow.setHeightInPoints(36);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }
            sheet.setAutoFilter(new CellRangeAddress(4, 4, 0, 24));

            // Data rows with better styling
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            int rowNum = 5;
            BigDecimal totalGiaVon = BigDecimal.ZERO;
            BigDecimal totalDoanhThu = BigDecimal.ZERO;
            BigDecimal totalLoiNhuan = BigDecimal.ZERO;

            for (int idx = 0; idx < orders.size(); idx++) {
                DonHang d = orders.get(idx);
                boolean even = idx % 2 == 0;
                CellStyle ts = even ? evenTextStyle : oddTextStyle;
                CellStyle ns = even ? evenNumberStyle : numberStyle;
                CellStyle ds = even ? evenDateStyle : dateStyle;

                Row row = sheet.createRow(rowNum++);
                row.setHeightInPoints(18);
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

            // Summary row with premium styling
            XSSFCellStyle sumStyle = (XSSFCellStyle) workbook.createCellStyle();
            Font sumFont = workbook.createFont();
            sumFont.setBold(true);
            sumFont.setFontHeightInPoints((short) 12);
            sumFont.setColor(IndexedColors.WHITE.getIndex());
            sumStyle.setFont(sumFont);
            sumStyle.setAlignment(HorizontalAlignment.RIGHT);
            sumStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 79, (byte) 70, (byte) 229}, null));
            sumStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            sumStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
            setBorders(sumStyle, BorderStyle.MEDIUM);

            XSSFCellStyle sumLabelStyle = (XSSFCellStyle) workbook.createCellStyle();
            Font sumLabelFont = workbook.createFont();
            sumLabelFont.setBold(true);
            sumLabelFont.setFontHeightInPoints((short) 12);
            sumLabelFont.setColor(IndexedColors.WHITE.getIndex());
            sumLabelStyle.setFont(sumLabelFont);
            sumLabelStyle.setAlignment(HorizontalAlignment.CENTER);
            sumLabelStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 79, (byte) 70, (byte) 229}, null));
            sumLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setBorders(sumLabelStyle, BorderStyle.MEDIUM);

            Row sumRow = sheet.createRow(rowNum + 1);
            sumRow.setHeightInPoints(28);
            Cell sumLabel = sumRow.createCell(0);
            sumLabel.setCellValue("✓ TỔNG CỘNG");
            sumLabel.setCellStyle(sumLabelStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowNum + 1, rowNum + 1, 0, 6));

            Cell sv = sumRow.createCell(7); sv.setCellValue(totalGiaVon.doubleValue()); sv.setCellStyle(sumStyle);
            Cell sr = sumRow.createCell(11); sr.setCellValue(totalDoanhThu.doubleValue()); sr.setCellStyle(sumStyle);
            Cell sp = sumRow.createCell(21); sp.setCellValue(totalLoiNhuan.doubleValue()); sp.setCellStyle(sumStyle);

            // Column widths (optimized for readability)
            int[] widths = {6, 13, 17, 15, 22, 15, 14, 13, 15, 15, 11, 15, 11, 14, 16, 16, 13, 13, 13, 15, 15, 16, 24, 16, 20};
            for (int i = 0; i < widths.length; i++) {
                sheet.setColumnWidth(i, widths[i] * 256);
            }

            // Freeze panes (header stays visible when scrolling)
            sheet.createFreezePane(0, 5);

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
