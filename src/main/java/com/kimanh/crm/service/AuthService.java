package com.kimanh.crm.service;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /** Normalize Vietnamese Unicode to NFC to avoid NFC/NFD mismatch */
    private String normalizeUnicode(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s.trim(), Normalizer.Form.NFC);
    }

    public Map<String, Object> login(String username, String password) {
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Vui lòng nhập tài khoản");
        }
        if (password == null || password.isBlank()) {
            throw new RuntimeException("Vui lòng nhập mật khẩu");
        }

        String loginInput = normalizeUnicode(username);
        log.info("Login attempt for: '{}' (length={})", loginInput, loginInput.length());

        // Step 1: Try direct DB query (fast path)
        List<User> candidates = userRepository.findByUsernameOrFullName(loginInput);
        log.info("DB query found {} candidates", candidates.size());

        // Step 2: If not found, fallback to Unicode-normalized comparison against ALL users
        // This handles NFC/NFD mismatch between browser input and database storage
        if (candidates.isEmpty()) {
            log.warn("Direct query found nothing. Trying Unicode-normalized fallback...");
            List<User> allUsers = userRepository.findAll();
            candidates = allUsers.stream()
                    .filter(u -> {
                        String uname = normalizeUnicode(u.getUsername());
                        String fname = normalizeUnicode(u.getFullName());
                        return uname.equals(loginInput) || fname.equals(loginInput);
                    })
                    .collect(Collectors.toList());
            log.info("Unicode fallback found {} candidates", candidates.size());

            if (candidates.isEmpty()) {
                // Still not found - log all users for diagnosis
                for (User u : allUsers) {
                    log.warn("DB user: id={}, username='{}' (len={}), fullName='{}' (len={}), active={}",
                            u.getId(), u.getUsername(),
                            u.getUsername() != null ? u.getUsername().length() : 0,
                            u.getFullName(),
                            u.getFullName() != null ? u.getFullName().length() : 0,
                            u.getActive());
                }
                throw new RuntimeException("Tài khoản không tồn tại");
            }
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
            if (hasInactive && candidates.stream().noneMatch(User::getActive)) {
                throw new RuntimeException("Tài khoản đã bị khóa");
            }
            throw new RuntimeException("Mật khẩu không chính xác");
        }

        log.info("Login success for user: {} ({})", matchedUser.getUsername(), matchedUser.getFullName());
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
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Tên đăng nhập không được để trống");
        }
        if (password == null || password.isBlank() || password.trim().length() < 6) {
            throw new RuntimeException("Mật khẩu phải có ít nhất 6 ký tự");
        }
        // Validate: username must be ASCII-only (no Vietnamese/Unicode) to avoid UTF-8 DB issues
        if (!username.matches("^[a-zA-Z0-9._@]+$")) {
            throw new RuntimeException("Tên đăng nhập chỉ cho phép chữ cái không dấu, số, dấu chấm, @ và gạch dưới");
        }
        if (username.length() < 3) {
            throw new RuntimeException("Tên đăng nhập phải có ít nhất 3 ký tự");
        }
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

        return userRepository.save(Objects.requireNonNull(user, "user must not be null"));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User toggleActive(Long id) {
        User user = userRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        user.setActive(!user.getActive());
        return userRepository.save(Objects.requireNonNull(user, "user must not be null"));
    }

    public List<String> getSaleUserNames() {
        return userRepository.findByRoleAndActiveTrue("SALER").stream()
                .map(User::getFullName)
                .filter(Objects::nonNull)
                .map(name -> Normalizer.normalize(name.trim().replaceAll("\\s+", " "), Normalizer.Form.NFC))
                .distinct()
                .toList();
    }

    @Transactional
    public User updateUser(Long id, String fullName, String password) {
        User user = userRepository.findById(Objects.requireNonNull(id, "id must not be null"))
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
        return userRepository.save(Objects.requireNonNull(user, "user must not be null"));
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        if ("ADMIN".equals(user.getRole())) {
            throw new RuntimeException("Không thể xóa tài khoản Admin");
        }
        userRepository.delete(user);
    }
}
