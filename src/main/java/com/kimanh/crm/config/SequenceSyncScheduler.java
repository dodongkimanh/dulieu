package com.kimanh.crm.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Periodically resyncs PostgreSQL identity sequences to MAX(id)+1.
 * Prevents "duplicate key" errors when data is inserted directly into
 * the database (e.g. via Supabase dashboard, CSV import, SQL scripts).
 *
 * Runs every 5 minutes — lightweight single SELECT+setval per table.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SequenceSyncScheduler {

    private final EntityManager entityManager;

    private static final String[][] TABLES = {
        {"data_dulieukhach", "id"},
        {"don_hang", "id"},
        {"crm_users", "id"},
        {"kenh_tiep_thi", "id"},
        {"mess_config", "id"},
    };

    @Scheduled(fixedRate = 300_000, initialDelay = 60_000) // every 5 min, first run after 1 min
    @Transactional
    public void syncAllSequences() {
        for (String[] t : TABLES) {
            syncSequence(t[0], t[1]);
        }
    }

    private void syncSequence(String table, String column) {
        try {
            // Discover sequence name
            String seqName = null;
            try {
                Object result = entityManager.createNativeQuery(
                    String.format("SELECT pg_get_serial_sequence('%s', '%s')", table, column))
                    .getSingleResult();
                if (result != null) seqName = result.toString();
            } catch (Exception ignored) {}

            if (seqName == null) {
                String conventionName = table + "_" + column + "_seq";
                Object count = entityManager.createNativeQuery(
                    String.format("SELECT COUNT(*) FROM pg_class WHERE relname = '%s' AND relkind = 'S'", conventionName))
                    .getSingleResult();
                if (((Number) count).intValue() > 0) seqName = conventionName;
            }

            if (seqName == null) return; // no sequence → nothing to sync

            // Only update if sequence is behind MAX(id)
            Object maxIdResult = entityManager.createNativeQuery(
                String.format("SELECT COALESCE(MAX(%s), 0) FROM %s", column, table))
                .getSingleResult();
            long maxId = ((Number) maxIdResult).longValue();

            Object seqValResult = entityManager.createNativeQuery(
                String.format("SELECT last_value FROM %s", seqName))
                .getSingleResult();
            long seqVal = ((Number) seqValResult).longValue();

            if (seqVal <= maxId) {
                entityManager.createNativeQuery(
                    String.format("SELECT setval('%s', %d, true)", seqName, maxId))
                    .getSingleResult();
                log.info("Sequence sync: {}.{} was behind (seq={}, max={}), advanced to {}",
                    table, column, seqVal, maxId, maxId);
            }
        } catch (Exception e) {
            log.debug("Sequence sync skip {}.{}: {}", table, column, e.getMessage());
        }
    }
}
