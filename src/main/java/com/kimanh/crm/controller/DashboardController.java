package com.kimanh.crm.controller;

import com.kimanh.crm.service.DonHangService;
import com.kimanh.crm.service.KhachHangService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DonHangService donHangService;
    private final KhachHangService khachHangService;

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
}
