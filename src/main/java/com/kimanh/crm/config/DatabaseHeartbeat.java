package com.kimanh.crm.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Keeps Supabase free tier alive by executing a lightweight query every 4 minutes.
 * Without this, Supabase pauses the DB after ~1 week of inactivity.
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.db.heartbeat-enabled", havingValue = "true")
public class DatabaseHeartbeat {

    private final DataSource dataSource;

    @Scheduled(fixedDelay = 240_000, initialDelay = 60_000) // every 4 min, start after 1 min
    public void heartbeat() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {
            if (rs.next()) {
                log.debug("DB heartbeat OK");
            }
        } catch (Exception e) {
            log.warn("DB heartbeat failed: {}", e.getMessage());
        }
    }
}
