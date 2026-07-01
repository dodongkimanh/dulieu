package com.kimanh.crm.controller;

import com.kimanh.crm.entity.LuongCoCau;
import com.kimanh.crm.repository.LuongCoCauRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/luong-co-cau")
@RequiredArgsConstructor
public class LuongCoCauController {

    private final LuongCoCauRepository repository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<LuongCoCau>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PutMapping("/{chucVu}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<LuongCoCau> update(@PathVariable String chucVu,
                                              @RequestBody Map<String, Object> body) {
        Long luongCoBan = body.get("luongCoBan") != null
                ? ((Number) body.get("luongCoBan")).longValue() : 0L;
        LuongCoCau config = repository.findById(chucVu)
                .orElse(new LuongCoCau(chucVu, 0L, null));
        config.setLuongCoBan(luongCoBan);
        return ResponseEntity.ok(repository.save(config));
    }
}
