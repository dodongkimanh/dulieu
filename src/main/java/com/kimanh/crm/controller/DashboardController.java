package com.kimanh.crm.controller;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.DonHangService;
import com.kimanh.crm.service.KhachHangService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DonHangService donHangService;
    private final KhachHangService khachHangService;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>(donHangService.getDashboardStats());
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
        boolean isSaler = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SALER"));
        if (isSaler) {
            sale = userRepository.findByUsername(auth.getName())
                    .map(User::getFullName)
                    .orElse(null);
        }

        if (sale == null || sale.isBlank()) {
            return ResponseEntity.ok(Map.of("error", "Sale không xác định"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sale", sale);
        result.putAll(donHangService.getSaleRevenue(sale, fromDate, toDate));
        result.putAll(khachHangService.getMessStats(sale, fromDate, toDate));

        return ResponseEntity.ok(result);
    }
}
