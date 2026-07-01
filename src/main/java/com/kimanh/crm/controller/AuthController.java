package com.kimanh.crm.controller;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        return ResponseEntity.ok(authService.login(username, password));
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        String password = (String) body.get("password");
        String fullName = (String) body.get("fullName");
        String role = (String) body.get("role");
        String zalo = (String) body.get("zalo");
        String sim = (String) body.get("sim");
        String zaloPassword = (String) body.get("zaloPassword");
        Long nhanVienId = body.get("nhanVienId") != null ? ((Number) body.get("nhanVienId")).longValue() : null;

        User user = authService.register(username, password, fullName, role, zalo, sim, zaloPassword, nhanVienId);
        return ResponseEntity.ok(Map.of(
                "message", "Đăng ký thành công",
                "username", user.getUsername(),
                "role", user.getRole()
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@RequestHeader("Authorization") String authHeader) {
        // This endpoint is protected by JWT filter, so if we reach here, user is authenticated
        return ResponseEntity.ok(Map.of("authenticated", true));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @PatchMapping("/users/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> toggleUser(@PathVariable Long id) {
        return ResponseEntity.ok(authService.toggleActive(id));
    }

    @PatchMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody Map<String, String> body,
            org.springframework.security.core.Authentication auth) {
        String result = authService.changePassword(auth.getName(), body.get("currentPassword"), body.get("newPassword"));
        if ("ok".equals(result)) return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        return ResponseEntity.badRequest().body(Map.of("error", result));
    }

    @GetMapping("/users/sales")
    public ResponseEntity<List<String>> getSaleUsers() {
        return ResponseEntity.ok(authService.getSaleUserNames());
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        String fullName = (String) body.get("fullName");
        String password = (String) body.get("password");
        String zalo = (String) body.get("zalo");
        String sim = (String) body.get("sim");
        String zaloPassword = (String) body.get("zaloPassword");
        String role = (String) body.get("role");
        boolean hasNhanVienId = body.containsKey("nhanVienId");
        Long nhanVienId = hasNhanVienId && body.get("nhanVienId") != null
                ? ((Number) body.get("nhanVienId")).longValue() : null;
        return ResponseEntity.ok(authService.updateUser(id, username, fullName, password, zalo, sim, zaloPassword, nhanVienId, hasNhanVienId, role));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        authService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
