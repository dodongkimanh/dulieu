package com.kimanh.crm.controller;

import com.kimanh.crm.entity.KhachHang;
import com.kimanh.crm.service.KhachHangService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/khach-hang")
@RequiredArgsConstructor
public class KhachHangController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "khachHang", "sdt", "sale", "page", "status", "ngayThang");

    private final KhachHangService service;

    @GetMapping
    public ResponseEntity<Page<KhachHang>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String sale,
            @RequestParam(defaultValue = "0") int pageNum,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(safeSortBy).ascending() : Sort.by(safeSortBy).descending();
        PageRequest pageable = PageRequest.of(pageNum, size, sort);
        return ResponseEntity.ok(service.findAll(keyword, status, page, sale, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<KhachHang> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<KhachHang> create(@RequestBody KhachHang entity) {
        return ResponseEntity.ok(service.create(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KhachHang> update(@PathVariable Long id, @RequestBody KhachHang entity) {
        return ResponseEntity.ok(service.update(id, entity));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<KhachHang> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.updateStatus(id, body.get("status")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<KhachHang>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(service.search(keyword));
    }

    @GetMapping("/pages")
    public ResponseEntity<List<String>> getPages() {
        return ResponseEntity.ok(service.getDistinctPages());
    }

    @GetMapping("/sales")
    public ResponseEntity<List<String>> getSales() {
        return ResponseEntity.ok(service.getDistinctSales());
    }
}
