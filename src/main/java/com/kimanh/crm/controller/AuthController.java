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
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String fullName = body.get("fullName");
        String role = body.get("role");
        String zalo = body.get("zalo");
        String sim = body.get("sim");
        String zaloPassword = body.get("zaloPassword");

        User user = authService.register(username, password, fullName, role, zalo, sim, zaloPassword);
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

    @GetMapping("/users/sales")
    public ResponseEntity<List<String>> getSaleUsers() {
        return ResponseEntity.ok(authService.getSaleUserNames());
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String username = body.get("username");
        String fullName = body.get("fullName");
        String password = body.get("password");
        String zalo = body.get("zalo");
        String sim = body.get("sim");
        String zaloPassword = body.get("zaloPassword");
        return ResponseEntity.ok(authService.updateUser(id, username, fullName, password, zalo, sim, zaloPassword));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        authService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
