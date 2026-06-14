package com.kimanh.crm.config;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.KhachHangRepository;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.KenhTiepThiService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.text.Normalizer;
import java.util.List;
import java.util.Objects;
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
    private final EntityManager entityManager;
    private final DataSource dataSource;

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
        // 0. Fix PostgreSQL identity sequences — prevent "duplicate key" errors
        // when tables have pre-imported data with explicit IDs
        syncSequences();

        // 0b. Migrations: add new columns if not exist
        runMigrations();

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
                userRepository.save(Objects.requireNonNull(admin, "admin must not be null"));
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

        // 3. Repair any users with null/corrupted passwords (skip already-hashed passwords)
        try {
            List<User> allUsers = userRepository.findAll();
            for (User user : allUsers) {
                String pw = user.getPassword();
                boolean needsRepair = pw == null || pw.isBlank()
                        || (!pw.startsWith("$2a$") && !pw.startsWith("$2b$") && !pw.startsWith("$2y$"));
                if (needsRepair) {
                    user.setPassword(passwordEncoder.encode(DEFAULT_SALER_PASSWORD));
                    userRepository.save(user);
                    log.warn("Repaired invalid password for user: {} ({}). Reset to default.",
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
        userRepository.save(Objects.requireNonNull(saler, "saler must not be null"));
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

    private void runMigrations() {
        String[] migrations = {
            "ALTER TABLE cham_cong ADD COLUMN IF NOT EXISTS phat_khong_cham_cong BIGINT DEFAULT 0",
            "ALTER TABLE cham_cong ADD COLUMN IF NOT EXISTS duyet_cong NUMERIC(3,2)",
            "ALTER TABLE bang_luong ADD COLUMN IF NOT EXISTS sim_dt BIGINT",
            "ALTER TABLE bang_luong ADD COLUMN IF NOT EXISTS chi_vt BIGINT DEFAULT 0",
            "ALTER TABLE bang_luong ADD COLUMN IF NOT EXISTS da_xac_nhan BOOLEAN DEFAULT FALSE",
            "ALTER TABLE bang_luong ADD COLUMN IF NOT EXISTS ngay_xac_nhan TIMESTAMPTZ",
            "ALTER TABLE nhan_vien ADD COLUMN IF NOT EXISTS an_trong_bang BOOLEAN DEFAULT FALSE",
        };
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            for (String sql : migrations) {
                try {
                    stmt.execute(sql);
                    log.info("Migration OK: {}", sql);
                } catch (Exception e) {
                    log.warn("Migration skipped: {} — {}", sql, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Migration connection failed: {}", e.getMessage());
        }
    }

    /**
     * Fixes "duplicate key value violates unique constraint" errors caused by
     * bulk-imported data with explicit IDs that leave the sequence behind.
     *
     * Uses two-phase sequence discovery:
     * 1. pg_get_serial_sequence() — works for SERIAL and IDENTITY columns
     * 2. Convention name {table}_{column}_seq — fallback for non-standard setups
     */
    @Transactional
    private void syncSequences() {
        String[][] tables = {
            {"data_dulieukhach", "id"},
            {"don_hang", "id"},
            {"crm_users", "id"},
            {"kenh_tiep_thi", "id"},
            {"mess_config", "id"},
        };
        for (String[] t : tables) {
            try {
                String seqName = null;

                // Phase 1: Try pg_get_serial_sequence (works for SERIAL / IDENTITY)
                try {
                    Object result = entityManager.createNativeQuery(
                        String.format("SELECT pg_get_serial_sequence('%s', '%s')", t[0], t[1]))
                        .getSingleResult();
                    if (result != null) seqName = result.toString();
                } catch (Exception ignored) {}

                // Phase 2: Fallback to convention name {table}_{column}_seq
                if (seqName == null) {
                    String conventionName = t[0] + "_" + t[1] + "_seq";
                    Object count = entityManager.createNativeQuery(
                        String.format("SELECT COUNT(*) FROM pg_class WHERE relname = '%s' AND relkind = 'S'", conventionName))
                        .getSingleResult();
                    if (((Number) count).intValue() > 0) {
                        seqName = conventionName;
                    }
                }

                if (seqName == null) {
                    log.warn("No sequence found for {}.{}, skipping sync", t[0], t[1]);
                    continue;
                }

                // Reset sequence to MAX(id) + 1
                entityManager.createNativeQuery(
                    String.format("SELECT setval('%s', COALESCE((SELECT MAX(%s) FROM %s), 0) + 1, false)",
                        seqName, t[1], t[0]))
                    .getSingleResult();
                log.info("Synced sequence '{}' for {}.{}", seqName, t[0], t[1]);
            } catch (Exception e) {
                log.warn("Could not sync sequence for {}.{}: {}", t[0], t[1], e.getMessage());
            }
        }
    }
}
