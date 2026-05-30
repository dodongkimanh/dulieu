package com.kimanh.crm.repository;

import com.kimanh.crm.entity.ZaloChatContact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ZaloChatContactRepository extends JpaRepository<ZaloChatContact, Long> {

    @Query(value = """
        SELECT DISTINCT session_id,
               COUNT(*) OVER (PARTITION BY session_id) AS contact_count,
               MAX(updated_at) OVER (PARTITION BY session_id) AS last_activity
        FROM zalo_chat_contacts
        ORDER BY last_activity DESC
        """, nativeQuery = true)
    List<Object[]> findDistinctSessions();

    @Query(value = """
        SELECT * FROM zalo_chat_contacts
        WHERE session_id = :sessionId
          AND (:search IS NULL OR :search = '' OR LOWER(name) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY name ASC
        """,
        countQuery = """
        SELECT COUNT(*) FROM zalo_chat_contacts
        WHERE session_id = :sessionId
          AND (:search IS NULL OR :search = '' OR LOWER(name) LIKE LOWER(CONCAT('%', :search, '%')))
        """,
        nativeQuery = true)
    Page<ZaloChatContact> findBySessionWithSearch(
        @Param("sessionId") String sessionId,
        @Param("search") String search,
        Pageable pageable
    );
}
