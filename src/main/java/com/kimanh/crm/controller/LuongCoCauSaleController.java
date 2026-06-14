package com.kimanh.crm.controller;

import com.kimanh.crm.entity.LuongCoCauSale;
import com.kimanh.crm.repository.LuongCoCauSaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/luong-co-cau-sale")
@RequiredArgsConstructor
public class LuongCoCauSaleController {

    private final LuongCoCauSaleRepository repository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LuongCoCauSale>> getAll() {
        return ResponseEntity.ok(repository.findAllByOrderByThuTuAsc());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LuongCoCauSale> update(@PathVariable Long id,
                                                  @RequestBody Map<String, Object> body) {
        LuongCoCauSale tier = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tier: " + id));
        if (body.containsKey("luongCung"))
            tier.setLuongCung(((Number) body.get("luongCung")).longValue());
        if (body.containsKey("hoaHongBp"))
            tier.setHoaHongBp(((Number) body.get("hoaHongBp")).intValue());
        if (body.containsKey("thuongBp"))
            tier.setThuongBp(((Number) body.get("thuongBp")).intValue());
        return ResponseEntity.ok(repository.save(tier));
    }
}
