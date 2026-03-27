package com.kimanh.crm.service;

import com.kimanh.crm.entity.DonHang;
import com.kimanh.crm.repository.DonHangRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
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

    public Page<DonHang> findAll(String keyword, String trangThai, String sale,
                                  LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword : null;
        String tt = (trangThai != null && !trangThai.isBlank()) ? trangThai : null;
        String sl = (sale != null && !sale.isBlank()) ? sale : null;
        // Use unsorted pageable since native query handles ORDER BY
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return repository.findWithFilters(kw, tt, sl, fromDate, toDate, unsorted);
    }

    public DonHang findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại: " + id));
    }

    public DonHang create(DonHang entity) {
        // Generate mã đơn
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long countToday = repository.countTodayOrders(LocalDate.now());
        entity.setMaDon(String.format("DH-%s-%03d", datePart, countToday + 1));
        return repository.save(entity);
    }

    public DonHang update(Long id, DonHang data) {
        DonHang existing = findById(id);
        existing.setNgayDat(data.getNgayDat());
        existing.setKhachHangId(data.getKhachHangId());
        existing.setTenKhach(data.getTenKhach());
        existing.setSdt(data.getSdt());
        existing.setDiaChi(data.getDiaChi());
        existing.setSanPham(data.getSanPham());
        existing.setSoLuong(data.getSoLuong());
        existing.setDonGia(data.getDonGia());
        existing.setChietKhau(data.getChietKhau());
        existing.setHinhThucThanhToan(data.getHinhThucThanhToan());
        existing.setTrangThai(data.getTrangThai());
        existing.setGhiChu(data.getGhiChu());
        existing.setSale(data.getSale());
        return repository.save(existing);
    }

    public DonHang updateStatus(Long id, String trangThai) {
        DonHang existing = findById(id);
        existing.setTrangThai(trangThai);
        return repository.save(existing);
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

    // Export to Excel
    public byte[] exportToExcel(String keyword, String trangThai, String sale,
                                 LocalDate fromDate, LocalDate toDate) throws IOException {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword : null;
        String tt = (trangThai != null && !trangThai.isBlank()) ? trangThai : null;
        String sl = (sale != null && !sale.isBlank()) ? sale : null;

        List<DonHang> orders = repository.findAllWithFilters(kw, tt, sl, fromDate, toDate);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Đơn hàng");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            // Header row
            String[] headers = {"Mã đơn", "Ngày đặt", "Khách hàng", "SĐT", "Địa chỉ",
                    "Sản phẩm", "SL", "Đơn giá", "Tổng tiền", "Chiết khấu",
                    "Thanh toán", "Hình thức TT", "Trạng thái", "Sale", "Ghi chú"};

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 1;
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            for (DonHang d : orders) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(d.getMaDon() != null ? d.getMaDon() : "");
                row.createCell(1).setCellValue(d.getNgayDat() != null ? d.getNgayDat().format(fmt) : "");
                row.createCell(2).setCellValue(d.getTenKhach() != null ? d.getTenKhach() : "");
                row.createCell(3).setCellValue(d.getSdt() != null ? d.getSdt() : "");
                row.createCell(4).setCellValue(d.getDiaChi() != null ? d.getDiaChi() : "");
                row.createCell(5).setCellValue(d.getSanPham() != null ? d.getSanPham() : "");
                row.createCell(6).setCellValue(d.getSoLuong() != null ? d.getSoLuong() : 0);
                row.createCell(7).setCellValue(d.getDonGia() != null ? d.getDonGia().doubleValue() : 0);
                row.createCell(8).setCellValue(d.getTongTien() != null ? d.getTongTien().doubleValue() : 0);
                row.createCell(9).setCellValue(d.getChietKhau() != null ? d.getChietKhau().doubleValue() : 0);
                row.createCell(10).setCellValue(d.getThanhToan() != null ? d.getThanhToan().doubleValue() : 0);
                row.createCell(11).setCellValue(d.getHinhThucThanhToan() != null ? d.getHinhThucThanhToan() : "");
                row.createCell(12).setCellValue(d.getTrangThai() != null ? d.getTrangThai() : "");
                row.createCell(13).setCellValue(d.getSale() != null ? d.getSale() : "");
                row.createCell(14).setCellValue(d.getGhiChu() != null ? d.getGhiChu() : "");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
