package com.kimanh.crm.service;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public Map<String, Object> login(String username, String password) {
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Vui lòng nhập tài khoản");
        }
        if (password == null || password.isBlank()) {
            throw new RuntimeException("Vui lòng nhập mật khẩu");
        }

        String loginInput = username.trim();

        // Search by username OR fullName in a single query (safe with duplicates)
        List<User> candidates = userRepository.findByUsernameOrFullName(loginInput);
        if (candidates.isEmpty()) {
            throw new RuntimeException("Tài khoản không tồn tại");
        }

        // Try to find the first active user whose password matches
        User matchedUser = null;
        boolean hasInactive = false;
        for (User candidate : candidates) {
            if (!candidate.getActive()) {
                hasInactive = true;
                continue;
            }
            if (candidate.getPassword() != null && passwordEncoder.matches(password, candidate.getPassword())) {
                matchedUser = candidate;
                break;
            }
        }

        if (matchedUser == null) {
            // All candidates were inactive
            if (hasInactive && candidates.stream().noneMatch(User::getActive)) {
                throw new RuntimeException("Tài khoản đã bị khóa");
            }
            throw new RuntimeException("Mật khẩu không chính xác");
        }

        String token = jwtUtil.generateToken(matchedUser.getUsername(), matchedUser.getRole());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("username", matchedUser.getUsername());
        result.put("fullName", matchedUser.getFullName());
        result.put("role", matchedUser.getRole());
        return result;
    }

    @Transactional
    public User register(String username, String password, String fullName, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }

        // Only allow SALER and KE_TOAN roles; ADMIN cannot be created
        if (role == null || (!role.equals("SALER") && !role.equals("KE_TOAN"))) {
            role = "SALER";
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .fullName(fullName)
                .role(role)
                .active(true)
                .build();

        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User toggleActive(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        user.setActive(!user.getActive());
        return userRepository.save(user);
    }

    public List<String> getSaleUserNames() {
        return userRepository.findByRoleAndActiveTrue("SALER").stream()
                .map(User::getFullName)
                .toList();
    }

    @Transactional
    public User updateUser(Long id, String fullName, String password) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại (ID: " + id + ")"));
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }
        if (password != null && !password.isBlank()) {
            String pw = password.trim();
            if (pw.length() < 6) {
                throw new RuntimeException("Mật khẩu phải có ít nhất 6 ký tự");
            }
            user.setPassword(passwordEncoder.encode(pw));
        }
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        if ("ADMIN".equals(user.getRole())) {
            throw new RuntimeException("Không thể xóa tài khoản Admin");
        }
        userRepository.delete(user);
    }
}
