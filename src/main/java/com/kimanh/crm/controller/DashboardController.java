package com.kimanh.crm.controller;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.DonHangService;
import com.kimanh.crm.service.KhachHangService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DonHangService donHangService;
    private final KhachHangService khachHangService;
    private final UserRepository userRepository;
    private final com.kimanh.crm.service.MessConfigService messConfigService;
    private final com.kimanh.crm.repository.KhachHangRepository khachHangRepository;
    private final com.kimanh.crm.repository.DonHangRepository donHangRepository;

    private LocalDate[] getDateRangeFromFilter(String filter) {
        LocalDate end = LocalDate.now();
        LocalDate start;
        
        switch (filter.toLowerCase()) {
            case "hôm nay":
                start = end;
                break;
            case "hôm qua":
                start = end.minusDays(1);
                end = start;
                break;
            case "7 ngày qua":
                start = end.minusDays(6);  // Hôm nay + 6 ngày trước = 7 ngày
                break;
            case "30 ngày qua":
                start = end.minusDays(29); // Hôm nay + 29 ngày trước = 30 ngày
                break;
            case "tuần này":
                // Từ thứ 2 tuần này đến hôm nay
                int dayOfWeek = end.getDayOfWeek().getValue(); // 1=Thứ 2, 7=Chủ nhật
                start = end.minusDays(dayOfWeek - 1);
                break;
            case "tuần trước":
                // Từ thứ 2 tuần trước đến CN tuần trước
                dayOfWeek = end.getDayOfWeek().getValue();
                LocalDate thisWeekMonday = end.minusDays(dayOfWeek - 1);
                end = thisWeekMonday.minusDays(1);  // CN tuần trước
                start = end.minusDays(6);           // Thứ 2 tuần trước
                break;
            case "tháng này":
                start = LocalDate.of(end.getYear(), end.getMonth(), 1);
                break;
            case "tháng trước":
                LocalDate firstOfThisMonth = LocalDate.of(end.getYear(), end.getMonth(), 1);
                end = firstOfThisMonth.minusDays(1);
                start = LocalDate.of(end.getYear(), end.getMonth(), 1);
                break;
            case "trọn đời":
            default:
                start = null;
                break;
        }
        
        return new LocalDate[] { start, end };
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        LocalDate start = fromDate;
        LocalDate end = toDate;
        
        // Prioritize: Manual date range > Quick Filter
        // If user provided fromDate/toDate, use them. Otherwise, use filter
        if ((fromDate == null || toDate == null) && filter != null && !filter.isBlank()) {
            LocalDate[] range = getDateRangeFromFilter(filter);
            start = range[0];
            end = range[1];
        }
        
        Map<String, Object> stats = new LinkedHashMap<>(donHangService.getDashboardStats(start, end));
        stats.put("tongKhachHang", khachHangService.count());
        stats.put("khachMoiThangNay", khachHangService.countNewThisMonth());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/revenue-monthly")
    public ResponseEntity<?> getRevenueMonthly() {
        return ResponseEntity.ok(donHangService.getRevenueByMonth());
    }

    @GetMapping("/orders-daily")
    public ResponseEntity<?> getOrdersDaily() {
        return ResponseEntity.ok(donHangService.getOrdersByDay());
    }

    @GetMapping("/order-status")
    public ResponseEntity<?> getOrderStatus() {
        return ResponseEntity.ok(donHangService.getOrderStatusDistribution());
    }

    @GetMapping("/recent-orders")
    public ResponseEntity<?> getRecentOrders() {
        return ResponseEntity.ok(donHangService.getRecentOrders());
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(donHangService.getAnalytics(fromDate, toDate));
    }

    @GetMapping("/sale-dashboard")
    public ResponseEntity<Map<String, Object>> getSaleDashboard(
            @RequestParam(required = false) String sale,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        // If SALER, force to their own fullName
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isSaler = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SALER"));
            if (isSaler) {
                sale = userRepository.findByUsername(auth.getName())
                        .map(User::getFullName)
                        .orElse(null);
            }
        }

        if (sale == null || sale.isBlank()) {
            return ResponseEntity.ok(Map.of("error", "Sale không xác định"));
        }

        // Normalize Unicode to NFC to handle NFC/NFD mismatch between crm_users and data tables
        sale = Normalizer.normalize(sale.trim(), Normalizer.Form.NFC);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sale", sale);
        result.put("costPerMess", messConfigService.getCostPerMess());

        log.info("sale-dashboard: sale='{}', fromDate={}, toDate={}", sale, fromDate, toDate);

        // Sequential calls (CompletableFuture causes Spring AOP/cache proxy issues in production)
        final String saleName = sale;
        try {
            Map<String, Object> revenueData = donHangService.getSaleRevenue(saleName, fromDate, toDate);
            log.info("sale-dashboard revenue: totalRevenue={}, qualifiedRevenue={}, totalOrders={}",
                    revenueData.get("totalRevenue"), revenueData.get("qualifiedRevenue"), revenueData.get("totalOrders"));
            result.putAll(revenueData);
        } catch (Exception e) {
            log.error("sale-dashboard revenueError for sale='{}': {}", saleName, e.getMessage(), e);
            result.put("revenueError", e.getMessage());
        }
        try {
            Map<String, Object> messData = khachHangService.getMessStats(saleName, fromDate, toDate);
            log.info("sale-dashboard mess: totalMess={}, totalPhones={}",
                    messData.get("totalMess"), messData.get("totalPhones"));
            result.putAll(messData);
        } catch (Exception e) {
            log.error("sale-dashboard messError for sale='{}': {}", saleName, e.getMessage(), e);
            result.put("messError", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Overview of mess status for ALL active sales (for coloring sale chips green/red).
     * Uses batch queries (2 total) instead of N+1 per sale.
     * Returns: [ { sale, totalMess, messAllocation, isOverflow }, ... ]
     */
    @GetMapping("/sales-mess-overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<Map<String, Object>>> getSalesMessOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        List<String> saleNames = userRepository.findByRoleAndActiveTrue("SALER").stream()
                .map(User::getFullName)
                .filter(n -> n != null && !n.isBlank())
                .map(n -> Normalizer.normalize(n.trim(), Normalizer.Form.NFC))
                .distinct()
                .toList();

        // Batch query 1: mess counts grouped by TRIM(Sale)
        Map<String, Long> messCountMap = new HashMap<>();
        for (Object[] row : khachHangRepository.countMessGroupedBySale(fromDate, toDate)) {
            String saleName = row[0] != null ? Normalizer.normalize(row[0].toString().trim(), Normalizer.Form.NFC) : "";
            long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            messCountMap.merge(saleName, count, Long::sum);
        }

        // Batch query 2: qualified revenue grouped by TRIM(sale)
        Map<String, BigDecimal> revenueMap = new HashMap<>();
        for (Object[] row : donHangRepository.sumQualifiedRevenueGroupedBySale(fromDate, toDate)) {
            String saleName = row[0] != null ? Normalizer.normalize(row[0].toString().trim(), Normalizer.Form.NFC) : "";
            BigDecimal revenue = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            revenueMap.merge(saleName, revenue, BigDecimal::add);
        }

        // Get cost per mess for tier calculation
        long costPerMess = messConfigService.getCostPerMess();
        List<Map<String, Object>> tiers = messConfigService.getMessTiers();

        List<Map<String, Object>> overview = new ArrayList<>();
        for (String saleName : saleNames) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sale", saleName);

            long totalMess = messCountMap.getOrDefault(saleName, 0L);
            // Also try NFD form for matching
            if (totalMess == 0) {
                String nfdName = Normalizer.normalize(saleName, Normalizer.Form.NFD);
                totalMess = messCountMap.getOrDefault(nfdName, 0L);
            }

            BigDecimal qualifiedRevenue = revenueMap.getOrDefault(saleName, BigDecimal.ZERO);
            if (qualifiedRevenue.compareTo(BigDecimal.ZERO) == 0) {
                String nfdName = Normalizer.normalize(saleName, Normalizer.Form.NFD);
                qualifiedRevenue = revenueMap.getOrDefault(nfdName, BigDecimal.ZERO);
            }

            // Calculate mess allocation from tier config
            int messAllocation = calculateMessAllocation(qualifiedRevenue.longValue(), tiers, costPerMess);

            item.put("totalMess", totalMess);
            item.put("messAllocation", messAllocation);
            item.put("isOverflow", totalMess > messAllocation);
            overview.add(item);
        }
        return ResponseEntity.ok(overview);
    }

    private int calculateMessAllocation(long revenue, List<Map<String, Object>> tiers, long costPerMess) {
        if (tiers == null || tiers.isEmpty() || costPerMess <= 0) return 0;
        for (Map<String, Object> tier : tiers) {
            long max = ((Number) tier.getOrDefault("max", 0)).longValue();
            if (revenue <= max) {
                long budget = ((Number) tier.getOrDefault("budget", 0)).longValue();
                return (int) (budget / costPerMess);
            }
        }
        // Last tier
        Map<String, Object> lastTier = tiers.get(tiers.size() - 1);
        long budget = ((Number) lastTier.getOrDefault("budget", 0)).longValue();
        return (int) (budget / costPerMess);
    }

    @GetMapping("/export-doanhso")
    public ResponseEntity<byte[]> exportDoanhSo(
            @RequestParam(required = false) String sale,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) throws IOException {

        // If SALER, force to their own fullName
        Authentication auth2 = SecurityContextHolder.getContext().getAuthentication();
        if (auth2 != null) {
            boolean isSaler = auth2.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SALER"));
            if (isSaler) {
                sale = userRepository.findByUsername(auth2.getName())
                        .map(User::getFullName)
                        .orElse(null);
            }
        }

        if (sale == null || sale.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        // Get data
        Map<String, Object> data = new LinkedHashMap<>();
        data.putAll(donHangService.getSaleRevenue(sale, fromDate, toDate));
        data.putAll(khachHangService.getMessStats(sale, fromDate, toDate));

        byte[] excelFile = createDoanhSoExcel(sale, fromDate, toDate, data);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        String timestamp = LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        String filename = "DoanhSo_" + sale + "_" + timestamp + ".xlsx";
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8);
        headers.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                .filename(encodedFilename, StandardCharsets.UTF_8)
                .build());

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelFile);
    }

    private byte[] createDoanhSoExcel(String sale, LocalDate fromDate, LocalDate toDate, Map<String, Object> data) throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Doanh Số");
        sheet.setDefaultColumnWidth(18);

        int rowIdx = 0;

        // ===== PREMIUM STYLES =====
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
        setBorders(titleStyle, BorderStyle.THIN);

        // Title
        Row titleRow = sheet.createRow(rowIdx++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("📊 BÁO CÁO DOANH SỐ - ĐỒ ĐỒNG KIM ÁNH 📊");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));
        titleRow.setHeightInPoints(25);

        // Info row
        XSSFFont infoFont = (XSSFFont) workbook.createFont();
        infoFont.setBold(false);
        infoFont.setFontHeightInPoints((short) 11);
        XSSFCellStyle infoStyle = (XSSFCellStyle) workbook.createCellStyle();
        infoStyle.setFont(infoFont);
        infoStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 240, (byte) 245, (byte) 250}, null));
        infoStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(infoStyle, BorderStyle.THIN);

        Row infoRow = sheet.createRow(rowIdx++);
        String infoText = "👤 " + sale + " | 📅 " + (fromDate != null && toDate != null ? 
            fromDate + " đến " + toDate : "Toàn bộ thời gian");
        Cell infoCell = infoRow.createCell(0);
        infoCell.setCellValue(infoText);
        infoCell.setCellStyle(infoStyle);
        sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 6));

        rowIdx++; // Spacing

        // ===== KPIs SECTION =====
        XSSFFont headerFont = (XSSFFont) workbook.createFont();
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 11);
        headerFont.setColor(IndexedColors.WHITE.getIndex());

        XSSFCellStyle headerStyle = (XSSFCellStyle) workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 55, (byte) 86, (byte) 65}, null));
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        setBorders(headerStyle, BorderStyle.THIN);

        XSSFCellStyle dataStyle = (XSSFCellStyle) workbook.createCellStyle();
        dataStyle.setAlignment(HorizontalAlignment.RIGHT);
        dataStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
        setBorders(dataStyle, BorderStyle.THIN);

        // KPI rows
        String[][] kpis = {
            {" Doanh Số", String.valueOf((Number) data.getOrDefault("totalRevenue", 0L))},
            {" Doanh Số Tính Mess", String.valueOf((Number) data.getOrDefault("qualifiedRevenue", 0L))},
            {" Tổng Mess Nhận", String.valueOf((Number) data.getOrDefault("totalMess", 0L))},
            {" Mốc Mess Phân Bổ", String.valueOf((Number) data.getOrDefault("messAllocation", 92L))},
            {" Tổng SĐT", String.valueOf((Number) data.getOrDefault("totalPhones", 0L))},
            {" Tổng Đơn", String.valueOf((Number) data.getOrDefault("totalOrders", 0L))},
        };

        for (String[] kpi : kpis) {
            Row r = sheet.createRow(rowIdx++);
            Cell labelCell = r.createCell(0);
            labelCell.setCellValue(kpi[0]);
            labelCell.setCellStyle(headerStyle);
            Cell valueCell = r.createCell(1);
            try {
                valueCell.setCellValue(Long.parseLong(kpi[1]));
            } catch (Exception e) {
                valueCell.setCellValue(kpi[1]);
            }
            valueCell.setCellStyle(dataStyle);
        }

        rowIdx++; // Spacing

        // ===== BY STATUS TABLE =====
        Row statusHeaderRow = sheet.createRow(rowIdx++);
        String[] statusHeaders = {"Tình Trạng", "Số Đơn", "Doanh Thu"};
        for (int i = 0; i < statusHeaders.length; i++) {
            Cell c = statusHeaderRow.createCell(i);
            c.setCellValue(statusHeaders[i]);
            c.setCellStyle(headerStyle);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> ordersByStatus = (List<Map<String, Object>>) data.getOrDefault("ordersByStatus", new ArrayList<>());
        for (Map<String, Object> status : ordersByStatus) {
            Row r = sheet.createRow(rowIdx++);
            Cell c0 = r.createCell(0);
            c0.setCellValue((String) status.getOrDefault("tinhTrang", ""));
            c0.setCellStyle(dataStyle);
            Cell c1 = r.createCell(1);
            c1.setCellValue(((Number) status.getOrDefault("count", 0)).longValue());
            c1.setCellStyle(dataStyle);
            Cell c2 = r.createCell(2);
            c2.setCellValue(((Number) status.getOrDefault("revenue", 0)).longValue());
            c2.setCellStyle(dataStyle);
        }

        rowIdx++; // Spacing

        // ===== BY DAY TABLE =====
        Row dayHeaderRow = sheet.createRow(rowIdx++);
        dayHeaderRow.createCell(0).setCellValue("Ngày");
        dayHeaderRow.getCell(0).setCellStyle(headerStyle);
        dayHeaderRow.createCell(1).setCellValue("Số Mess");
        dayHeaderRow.getCell(1).setCellStyle(headerStyle);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> messByDay = (List<Map<String, Object>>) data.getOrDefault("messByDay", new ArrayList<>());
        for (Map<String, Object> day : messByDay) {
            Row r = sheet.createRow(rowIdx++);
            Cell c0 = r.createCell(0);
            c0.setCellValue("Ngày " + (Number) day.getOrDefault("day", ""));
            c0.setCellStyle(dataStyle);
            Cell c1 = r.createCell(1);
            c1.setCellValue(((Number) day.getOrDefault("count", 0)).longValue());
            c1.setCellStyle(dataStyle);
        }

        // Auto-filter
        sheet.setAutoFilter(new CellRangeAddress(rowIdx - messByDay.size() - 1, rowIdx - 1, 0, 1));

        // Freeze panes
        sheet.createFreezePane(0, 2);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        return baos.toByteArray();
    }

    private void setBorders(XSSFCellStyle style, BorderStyle borderStyle) {
        style.setBorderTop(borderStyle);
        style.setBorderBottom(borderStyle);
        style.setBorderLeft(borderStyle);
        style.setBorderRight(borderStyle);
    }
}
