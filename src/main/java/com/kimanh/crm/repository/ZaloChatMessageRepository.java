package com.kimanh.crm.repository;

import com.kimanh.crm.entity.ZaloChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ZaloChatMessageRepository extends JpaRepository<ZaloChatMessage, Long> {

    Page<ZaloChatMessage> findByConversationIdOrderByTimestampAsc(Long conversationId, Pageable pageable);
}
