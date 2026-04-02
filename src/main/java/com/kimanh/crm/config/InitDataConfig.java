package com.kimanh.crm.config;

import com.kimanh.crm.entity.User;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.KenhTiepThiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class InitDataConfig {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final KenhTiepThiService kenhTiepThiService;

    @Bean
    public CommandLineRunner initAdmin() {
        return args -> {
            User admin = userRepository.findByUsername("admin").orElse(null);
            if (admin == null) {
                admin = User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .fullName("Administrator")
                        .role("ADMIN")
                        .active(true)
                        .build();
            } else {
                // Always reset admin password to ensure it matches
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setActive(true);
            }
            userRepository.save(admin);

            // Repair any users with null/corrupted passwords (from old setPassword(null) bug)
            List<User> allUsers = userRepository.findAll();
            for (User user : allUsers) {
                if (user.getPassword() == null || user.getPassword().isBlank()) {
                    // Reset to default password (username + "123")
                    String defaultPw = user.getUsername() + "123";
                    user.setPassword(passwordEncoder.encode(defaultPw));
                    userRepository.save(user);
                    log.warn("Repaired null password for user: {} ({}). Default password set to: {}",
                            user.getUsername(), user.getFullName(), defaultPw);
                }
            }

            // Seed default marketing channels
            kenhTiepThiService.seedDefaults();
        };
    }
}
