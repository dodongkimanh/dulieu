package com.kimanh.crm.repository;

import com.kimanh.crm.entity.ZaloChatConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ZaloChatConversationRepository extends JpaRepository<ZaloChatConversation, Long> {

    @Query(value = """
        SELECT conv.id AS conversation_id,
               c.id   AS contact_id,
               c.zalo_uid,
               c.name AS contact_name,
               c.avatar,
               conv.last_message,
               conv.updated_at
        FROM zalo_chat_conversations conv
        JOIN zalo_chat_contacts c ON c.id = conv.contact_id
        WHERE conv.session_id = :sessionId
        ORDER BY conv.updated_at DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM zalo_chat_conversations conv
        JOIN zalo_chat_contacts c ON c.id = conv.contact_id
        WHERE conv.session_id = :sessionId
        """,
        nativeQuery = true)
    Page<Object[]> findInboxBySession(@Param("sessionId") String sessionId, Pageable pageable);

    @Query(value = """
        SELECT conv.id FROM zalo_chat_conversations conv
        JOIN zalo_chat_contacts c ON c.id = conv.contact_id
        WHERE c.zalo_uid = :uid AND c.session_id = :sessionId
        LIMIT 1
        """, nativeQuery = true)
    Optional<Long> findConversationIdByUid(@Param("sessionId") String sessionId, @Param("uid") String uid);
}
