package com.kimanh.crm.config;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.KhachHangRepository;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.KenhTiepThiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.text.Normalizer;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class InitDataConfig {

    private final UserRepository userRepository;
    private final KhachHangRepository khachHangRepository;
    private final PasswordEncoder passwordEncoder;
    private final KenhTiepThiService kenhTiepThiService;

    private static final String ADMIN_USERNAME = "dangducky@kimanh.com";
    private static final String ADMIN_PASSWORD = "Admin@123";
    private static final String DEFAULT_SALER_PASSWORD = "111111";

    @Bean
    public CommandLineRunner initAdmin() {
        return args -> {
            try {
                doInit();
            } catch (Exception e) {
                log.error("InitDataConfig failed (app will continue): {}", e.getMessage(), e);
            }
        };
    }

    private void doInit() {
        // 1. Create/update admin account
        try {
            User admin = userRepository.findByUsername(ADMIN_USERNAME).orElse(null);
            if (admin == null) {
                admin = User.builder()
                        .username(ADMIN_USERNAME)
                        .password(passwordEncoder.encode(ADMIN_PASSWORD))
                        .fullName("Dang Duc Ky")
                        .role("ADMIN")
                        .active(true)
                        .build();
                userRepository.save(admin);
                log.info("Created admin: {}", ADMIN_USERNAME);
            }
        } catch (Exception e) {
            log.warn("Could not init admin account: {}", e.getMessage());
        }

        // 2. Seed SALER accounts from data_dulieukhach distinct Sale names
        try {
            List<String> saleNames = khachHangRepository.findDistinctSales();
            // Normalize existing fullNames (collapse whitespace + NFC) to prevent Unicode/space duplicates
            Set<String> existingFullNames = userRepository.findAll().stream()
                    .map(User::getFullName)
                    .filter(fn -> fn != null)
                    .map(fn -> normalizeName(fn))
                    .collect(Collectors.toSet());

            for (String rawName : saleNames) {
                if (rawName == null || rawName.isBlank()) continue;
                String trimmedName = normalizeName(rawName);
                if (trimmedName.equalsIgnoreCase("No Sale") || trimmedName.isEmpty()) continue;

                if (trimmedName.contains(",")) {
                    for (String part : trimmedName.split(",")) {
                        seedSaleAccount(normalizeName(part), existingFullNames);
                    }
                    continue;
                }
                seedSaleAccount(trimmedName, existingFullNames);
            }
            log.info("SALER account seeding completed. Total users: {}", userRepository.count());
        } catch (Exception e) {
            log.warn("Could not seed SALER accounts from data_dulieukhach: {}", e.getMessage());
        }

        // 3. Repair any users with null/corrupted passwords
        try {
            List<User> allUsers = userRepository.findAll();
            for (User user : allUsers) {
                if (user.getPassword() == null || user.getPassword().isBlank()) {
                    user.setPassword(passwordEncoder.encode(DEFAULT_SALER_PASSWORD));
                    userRepository.save(user);
                    log.warn("Repaired null password for user: {} ({}). Reset to default.",
                            user.getUsername(), user.getFullName());
                }
            }
        } catch (Exception e) {
            log.warn("Could not repair passwords: {}", e.getMessage());
        }

        // 4. Seed default marketing channels
        try {
            kenhTiepThiService.seedDefaults();
        } catch (Exception e) {
            log.warn("Could not seed marketing channels: {}", e.getMessage());
        }
    }

    private void seedSaleAccount(String fullName, Set<String> existingNormalizedNames) {
        if (fullName == null || fullName.isBlank()) return;
        String normalized = normalizeName(fullName);
        if (existingNormalizedNames.contains(normalized)) return;

        String username = toAsciiUsername(fullName);
        if (username == null) {
            log.warn("Could not generate valid username for sale: '{}'", fullName);
            return;
        }

        // Ensure unique username (append suffix before @kimanh.com if collision)
        String basePart = username.replace("@kimanh.com", "");
        String finalUsername = username;
        int suffix = 2;
        while (userRepository.existsByUsername(finalUsername)) {
            finalUsername = basePart + suffix + "@kimanh.com";
            suffix++;
        }

        User saler = User.builder()
                .username(finalUsername)
                .password(passwordEncoder.encode(DEFAULT_SALER_PASSWORD))
                .fullName(fullName)
                .role("SALER")
                .active(true)
                .build();
        userRepository.save(saler);
        existingNormalizedNames.add(normalized);
        log.info("Created SALER: username='{}', fullName='{}'", finalUsername, fullName);
    }

    /**
     * Normalize a name for dedup comparison: NFC unicode + collapse whitespace + trim.
     * "Hiếu  Đồ Đồng" → "Hiếu Đồ Đồng"
     */
    private String normalizeName(String name) {
        if (name == null) return "";
        String s = name.trim().replaceAll("\\s+", " ");
        return Normalizer.normalize(s, Normalizer.Form.NFC);
    }

    /**
     * Convert Vietnamese full name to ASCII-only username with @kimanh.com suffix.
     * "Kiên Đồ Đồng" → "kiendodong@kimanh.com"
     * "Quỳnh Đồ Đồng" → "quynhdodong@kimanh.com"
     * "Kiều Đúc Đồng Nam.Định" → "kieuducdongnamdinh@kimanh.com"
     */
    private String toAsciiUsername(String fullName) {
        if (fullName == null || fullName.isBlank()) return null;
        String s = Normalizer.normalize(fullName.trim(), Normalizer.Form.NFD);
        s = s.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        s = s.replace("đ", "d").replace("Đ", "d");
        s = s.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (s.isEmpty()) return null;
        return s + "@kimanh.com";
    }
}
