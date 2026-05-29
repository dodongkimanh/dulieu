package com.kimanh.crm.config;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
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
 * Keeps Supabase alive and monitors HikariCP pool health.
 * Runs every 2 minutes. Logs pool stats and triggers soft eviction on failure.
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.db.heartbeat-enabled", havingValue = "true")
public class DatabaseHeartbeat {

    private final DataSource dataSource;
    private int consecutiveFailures = 0;

    @Scheduled(fixedDelay = 120_000, initialDelay = 30_000) // every 2 min, start after 30s
    public void heartbeat() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {
            if (rs.next()) {
                consecutiveFailures = 0;
                // Log pool stats
                if (dataSource instanceof HikariDataSource hds) {
                    HikariPoolMXBean pool = hds.getHikariPoolMXBean();
                    if (pool != null) {
                        log.info("DB heartbeat OK — pool: active={}, idle={}, waiting={}, total={}",
                                pool.getActiveConnections(), pool.getIdleConnections(),
                                pool.getThreadsAwaitingConnection(), pool.getTotalConnections());
                    }
                }
            }
        } catch (Exception e) {
            consecutiveFailures++;
            log.warn("DB heartbeat failed (attempt {}): {}", consecutiveFailures, e.getMessage());
            // After 3 consecutive failures, soft evict idle connections to force pool refresh
            if (consecutiveFailures >= 3 && dataSource instanceof HikariDataSource hds) {
                try {
                    HikariPoolMXBean pool = hds.getHikariPoolMXBean();
                    if (pool != null) {
                        log.warn("Soft evicting idle connections after {} consecutive heartbeat failures", consecutiveFailures);
                        pool.softEvictConnections();
                    }
                } catch (Exception evictEx) {
                    log.error("Failed to soft evict connections: {}", evictEx.getMessage());
                }
            }
        }
    }
}
