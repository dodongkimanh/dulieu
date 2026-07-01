package com.kimanh.crm.controller;

import com.kimanh.crm.entity.BangLuongAdjust;
import com.kimanh.crm.service.BangLuongService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bang-luong")
@RequiredArgsConstructor
public class BangLuongController {

    private final BangLuongService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<Map<String, Object>>> getByMonth(
            @RequestParam int thang,
            @RequestParam int nam) {
        return ResponseEntity.ok(service.calculateForMonth(thang, nam));
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<BangLuongAdjust> upsertAdjust(@RequestBody BangLuongAdjust data) {
        return ResponseEntity.ok(service.upsertAdjust(data));
    }

    // SALER / LAI_XE / NHAN_VIEN xem bảng lương của chính mình (read-only)
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('SALER', 'LAI_XE', 'NHAN_VIEN')")
    public ResponseEntity<List<Map<String, Object>>> getMyData(
            @RequestParam int thang,
            @RequestParam int nam) {
        Long nhanVienId = getNhanVienIdFromContext();
        if (nhanVienId == null) return ResponseEntity.status(403).build();
        List<Map<String, Object>> all = service.calculateForMonth(thang, nam);
        List<Map<String, Object>> mine = all.stream()
                .filter(row -> nhanVienId.equals(row.get("nhanVienId")))
                .toList();
        return ResponseEntity.ok(mine);
    }

    @PostMapping("/xac-nhan")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> xacNhan(@RequestBody Map<String, Object> body) {
        Long nhanVienId = Long.valueOf(body.get("nhanVienId").toString());
        int thang = Integer.parseInt(body.get("thang").toString());
        int nam   = Integer.parseInt(body.get("nam").toString());
        // Chỉ cho phép xác nhận lương của chính mình (trừ admin/ketoan)
        Long selfId = getNhanVienIdFromContext();
        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdminOrKeToan = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_KE_TOAN"));
        if (!isAdminOrKeToan && selfId != null && !selfId.equals(nhanVienId)) {
            return ResponseEntity.status(403).build();
        }
        service.xacNhanLuong(nhanVienId, thang, nam);
        return ResponseEntity.ok().build();
    }

    private Long getNhanVienIdFromContext() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof UsernamePasswordAuthenticationToken t && t.getDetails() instanceof Long id) {
            return id;
        }
        return null;
    }
}
