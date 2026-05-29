package com.kimanh.crm.controller;

import com.kimanh.crm.entity.KhachHang;
import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.KhachHangService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@RestController
@RequestMapping("/api/khach-hang")
@RequiredArgsConstructor
public class KhachHangController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "khachHang", "sdt", "sale", "page", "status", "ngayThang");

    private final KhachHangService service;
    private final UserRepository userRepository;

    private String normalizeSale(String sale) {
        if (sale == null) return null;
        String normalized = Normalizer.normalize(sale, Normalizer.Form.NFC).trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth != null && auth.getAuthorities() != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    private String getCurrentSalerNameOrThrow(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .map(User::getFullName)
                .map(this::normalizeSale)
                .filter(Objects::nonNull)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin sale hiện tại"));
    }

    private void ensureSalerOwnsCustomer(Long customerId, String currentSale) {
        KhachHang existing = service.findById(customerId);
        String recordSale = normalizeSale(existing.getSale());
        if (!Objects.equals(recordSale, currentSale)) {
            throw new AccessDeniedException("Bạn chỉ được thao tác khách hàng thuộc tài khoản sale của mình");
        }
    }

    @GetMapping
    public ResponseEntity<Page<KhachHang>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String sale,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Boolean hasSdt,
            @RequestParam(required = false) Boolean assignedOnly,
            @RequestParam(defaultValue = "0") int pageNum,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        // SALER can only see their own customers
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isSaler = hasRole(auth, "SALER");
        if (isSaler) {
            sale = getCurrentSalerNameOrThrow(auth);
        } else {
            sale = normalizeSale(sale);
        }

        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(safeSortBy).ascending() : Sort.by(safeSortBy).descending();
        PageRequest pageable = PageRequest.of(pageNum, size, sort);
        return ResponseEntity.ok(service.findAll(keyword, status, page, sale, fromDate, toDate, hasSdt, assignedOnly, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<KhachHang> getById(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "SALER")) {
            ensureSalerOwnsCustomer(id, getCurrentSalerNameOrThrow(auth));
        }
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<KhachHang> create(@RequestBody KhachHang entity) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "SALER")) {
            // Enforce creator ownership: SALER cannot assign customer to another sale.
            entity.setSale(getCurrentSalerNameOrThrow(auth));
        } else {
            entity.setSale(normalizeSale(entity.getSale()));
        }
        return ResponseEntity.ok(service.create(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KhachHang> update(@PathVariable Long id, @RequestBody KhachHang entity) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "SALER")) {
            String currentSale = getCurrentSalerNameOrThrow(auth);
            ensureSalerOwnsCustomer(id, currentSale);
            // Prevent tampering sale field via crafted requests.
            entity.setSale(currentSale);
        } else {
            entity.setSale(normalizeSale(entity.getSale()));
        }
        return ResponseEntity.ok(service.update(id, entity));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<KhachHang> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "SALER")) {
            ensureSalerOwnsCustomer(id, getCurrentSalerNameOrThrow(auth));
        }
        return ResponseEntity.ok(service.updateStatus(id, body.get("status")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
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

    @PatchMapping("/{id}/transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<KhachHang> transferSale(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.transferSale(id, body.get("sale")));
    }

    @PatchMapping("/bulk-transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Object>> bulkTransferSale(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("ids");
        List<Long> ids = rawIds.stream().map(Integer::longValue).toList();
        String sale = (String) body.get("sale");
        int count = service.bulkTransferSale(ids, sale);
        return ResponseEntity.ok(Map.of("success", true, "count", count));
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<KhachHang> updateNotes(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "SALER")) {
            ensureSalerOwnsCustomer(id, getCurrentSalerNameOrThrow(auth));
        }
        return ResponseEntity.ok(service.updateNotes(id, body.get("notes")));
    }

    @PatchMapping("/{id}/loai-mess")
    public ResponseEntity<KhachHang> updateLoaiMess(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (hasRole(auth, "SALER")) {
            ensureSalerOwnsCustomer(id, getCurrentSalerNameOrThrow(auth));
        }
        return ResponseEntity.ok(service.updateLoaiMess(id, body.get("loaiMess")));
    }

    @GetMapping("/assigned-count")
    public ResponseEntity<Map<String, Long>> getAssignedCount() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return ResponseEntity.ok(Map.of("count", 0L));
        }
        boolean isSaler = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SALER"));
        String sale = null;
        if (isSaler) {
            sale = userRepository.findByUsername(auth.getName())
                    .map(User::getFullName)
                    .map(this::normalizeSale)
                    .orElse(null);
        }
        return ResponseEntity.ok(Map.of("count", service.countPendingAssigned(sale)));
    }
}
