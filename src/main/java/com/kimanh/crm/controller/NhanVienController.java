package com.kimanh.crm.controller;

import com.kimanh.crm.entity.NhanVien;
import com.kimanh.crm.service.NhanVienService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nhan-vien")
@RequiredArgsConstructor
public class NhanVienController {

    private final NhanVienService service;

    @GetMapping
    public ResponseEntity<List<NhanVien>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<NhanVien>> getActive() {
        return ResponseEntity.ok(service.findActive());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<NhanVien> create(@RequestBody NhanVien nv) {
        return ResponseEntity.ok(service.create(nv));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<NhanVien> update(@PathVariable Long id, @RequestBody NhanVien nv) {
        return ResponseEntity.ok(service.update(id, nv));
    }

    @PatchMapping("/{id}/an-trong-bang")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<NhanVien> toggleAnTrongBang(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleAnTrongBang(id));
    }

    @PatchMapping("/{id}/luong-co-ban")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<NhanVien> updateLuongCoBan(@PathVariable Long id,
                                                      @RequestBody Map<String, Object> body) {
        Long luong = ((Number) body.get("luongCoBan")).longValue();
        return ResponseEntity.ok(service.updateLuongCoBan(id, luong));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok().build();
    }
}
