package com.kimanh.crm.controller;

import com.kimanh.crm.entity.DonHang;
import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.DonHangService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/don-hang")
@RequiredArgsConstructor
public class DonHangController {

    private final DonHangService service;
    private final UserRepository userRepository;

    private boolean isSaler(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SALER"));
    }

    private String getSalerFullName(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByUsername(auth.getName())
                .map(User::getFullName)
                .map(n -> n.trim().replaceAll("\\s+", " "))
                .orElse(null);
    }

    @GetMapping
    public ResponseEntity<Page<DonHang>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tinhTrang,
            @RequestParam(required = false) String sale,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String maIdQuangCao,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int pageNum,
            @RequestParam(defaultValue = "20") int size) {

        // SALER can only see their own orders
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean currentUserIsSaler = isSaler(auth);
        if (currentUserIsSaler) {
            sale = getSalerFullName(auth);
        }

        PageRequest pageable = PageRequest.of(pageNum, size);
        Page<DonHang> result = service.findAll(keyword, tinhTrang, sale, page, maIdQuangCao, fromDate, toDate, pageable);

        // SALER must NOT see cost/profit fields — null them out
        if (currentUserIsSaler) {
            result.getContent().forEach(dh -> {
                dh.setGiaVon(null);
                dh.setLoiNhuanUocTinh(null);
                dh.setLoiNhuanSauTru(null);
                dh.setChiPhiVanChuyen(null);
                dh.setDsVanChuyen(null);
                dh.setDatCoc(null);
                dh.setThuBanTrucTiep(null);
                dh.setTongThuKhach(null);
            });
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DonHang> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<DonHang> create(@RequestBody DonHang entity) {
        return ResponseEntity.ok(service.create(entity));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<DonHang> update(@PathVariable Long id, @RequestBody DonHang entity) {
        return ResponseEntity.ok(service.update(id, entity));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<DonHang> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.updateStatus(id, body.get("tinhTrang")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sales")
    public ResponseEntity<List<String>> getSales() {
        return ResponseEntity.ok(service.getDistinctSales());
    }

    @GetMapping("/pages")
    public ResponseEntity<List<String>> getPages() {
        return ResponseEntity.ok(service.getDistinctPages());
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tinhTrang,
            @RequestParam(required = false) String sale,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String maIdQuangCao,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) throws IOException {

        byte[] excelData = service.exportToExcel(keyword, tinhTrang, sale, page, maIdQuangCao, fromDate, toDate);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "don-hang.xlsx");

        return ResponseEntity.ok().headers(headers).body(excelData);
    }
}
