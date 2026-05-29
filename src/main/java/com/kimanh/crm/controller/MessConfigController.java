package com.kimanh.crm.controller;

import com.kimanh.crm.service.MessConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mess-config")
@RequiredArgsConstructor
public class MessConfigController {

    private final MessConfigService service;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(service.getConfig());
    }

    @PutMapping("/cost-per-mess")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateCostPerMess(@RequestBody Map<String, Object> body) {
        long cost = ((Number) body.get("costPerMess")).longValue();
        if (cost < 1000 || cost > 1_000_000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Chi phí phải từ 1,000 đến 1,000,000 VNĐ"));
        }
        return ResponseEntity.ok(service.updateCostPerMess(cost));
    }

    @SuppressWarnings("unchecked")
    @PutMapping("/tiers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateMessTiers(@RequestBody Map<String, Object> body) {
        List<Map<String, Object>> tiers = (List<Map<String, Object>>) body.get("tiers");
        if (tiers == null || tiers.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Danh sách mốc không được trống"));
        }
        // Validate each tier has required fields
        for (Map<String, Object> tier : tiers) {
            if (tier.get("min") == null || tier.get("max") == null || tier.get("budget") == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mỗi mốc phải có min, max và budget"));
            }
            long budget = ((Number) tier.get("budget")).longValue();
            if (budget <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ngân sách phải lớn hơn 0"));
            }
        }
        return ResponseEntity.ok(service.updateMessTiers(tiers));
    }
}
