package com.kimanh.crm.service;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));

        if (!user.getActive()) {
            throw new RuntimeException("Tài khoản đã bị khóa");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Mật khẩu không chính xác");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("username", user.getUsername());
        result.put("fullName", user.getFullName());
        result.put("role", user.getRole());
        return result;
    }

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

        User saved = userRepository.save(user);
        saved.setPassword(null);
        return saved;
    }

    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        users.forEach(u -> u.setPassword(null));
        return users;
    }

    public User toggleActive(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        user.setActive(!user.getActive());
        User saved = userRepository.save(user);
        saved.setPassword(null);
        return saved;
    }

    public List<String> getSaleUserNames() {
        return userRepository.findByRoleAndActiveTrue("SALER").stream()
                .map(User::getFullName)
                .toList();
    }

    public User updateUser(Long id, String fullName, String password) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }
        if (password != null && !password.isBlank()) {
            if (password.length() < 6) {
                throw new RuntimeException("Mật khẩu phải có ít nhất 6 ký tự");
            }
            user.setPassword(passwordEncoder.encode(password));
        }
        User saved = userRepository.save(user);
        saved.setPassword(null);
        return saved;
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
