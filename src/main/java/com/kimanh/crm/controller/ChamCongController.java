package com.kimanh.crm.controller;

import com.kimanh.crm.entity.ChamCong;
import com.kimanh.crm.service.ChamCongService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cham-cong")
@RequiredArgsConstructor
public class ChamCongController {

    private final ChamCongService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Object>> getByMonth(
            @RequestParam int thang, @RequestParam int nam) {
        return ResponseEntity.ok(service.getByMonth(thang, nam));
    }

    // SALER / LAI_XE / NHAN_VIEN xem chấm công của chính mình (read-only, filtered by nhanVienId in JWT)
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('SALER', 'LAI_XE', 'NHAN_VIEN')")
    public ResponseEntity<Map<String, Object>> getMyData(
            @RequestParam int thang, @RequestParam int nam) {
        Long nhanVienId = getNhanVienIdFromContext();
        if (nhanVienId == null) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(service.getByMonthForEmployee(thang, nam, nhanVienId));
    }

    private Long getNhanVienIdFromContext() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof UsernamePasswordAuthenticationToken t && t.getDetails() instanceof Long id) {
            return id;
        }
        return null;
    }

    // Lưu 1 bản ghi (có tính giờ)
    @PostMapping("/save")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<ChamCong> saveOne(@RequestBody ChamCong cc) {
        return ResponseEntity.ok(service.saveOne(cc));
    }

    // Nhân viên tự lưu ghi chú của mình
    @PatchMapping("/{id}/ghi-chu-nv")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChamCong> saveGhiChuNv(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(service.saveGhiChuNv(id, body.get("ghiChuNv")));
    }

    // Lưu nhiều bản ghi cùng lúc
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<ChamCong>> saveBulk(@RequestBody List<ChamCong> records) {
        return ResponseEntity.ok(service.saveBulk(records));
    }

    // Duyệt / không phạt cho 1 bản ghi cụ thể
    @PostMapping("/{id}/duyet")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ChamCong> duyetRecord(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean duyetKhongPhat,
            @RequestParam(required = false) String duyetNote,
            @RequestParam(required = false) Double duyetCong) {
        return ResponseEntity.ok(service.duyetRecord(id, duyetKhongPhat, duyetNote, duyetCong));
    }

    // Duyệt tổng thể cả tháng (đánh dấu đã chốt)
    @PostMapping("/duyet")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Object>> duyet(
            @RequestParam int thang, @RequestParam int nam) {
        int count = service.duyetThang(thang, nam);
        return ResponseEntity.ok(Map.of("updated", count));
    }

    // Import Excel chấm công
    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam int thang, @RequestParam int nam) throws Exception {
        return ResponseEntity.ok(service.importExcel(file, thang, nam));
    }

    // Tính lại công cho toàn tháng (khi thay đổi ngưỡng)
    @PostMapping("/recalculate")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Map<String, Object>> recalculate(
            @RequestParam int thang, @RequestParam int nam) throws Exception {
        int count = service.recalculate(thang, nam);
        return ResponseEntity.ok(Map.of("updated", count));
    }

    // Tải file Excel mẫu
    @GetMapping("/template")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<byte[]> downloadTemplate(
            @RequestParam int thang, @RequestParam int nam) {
        try {
            byte[] bytes = service.exportTemplate(thang, nam);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment",
                    "ChamCong_T" + thang + "_" + nam + ".xlsx");
            headers.setContentLength(bytes.length);
            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
