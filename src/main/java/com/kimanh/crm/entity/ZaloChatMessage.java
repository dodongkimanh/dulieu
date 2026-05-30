package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "zalo_chat_messages", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ZaloChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "message_hash", length = 32, nullable = false, unique = true)
    private String messageHash;

    @Column(name = "sender_id", columnDefinition = "TEXT")
    private String senderId;

    @Column(columnDefinition = "TEXT")
    private String text;

    @Column(length = 20)
    private String type;

    private OffsetDateTime timestamp;

    @Column(name = "is_self")
    private Boolean isSelf;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "call_info", columnDefinition = "TEXT")
    private String callInfo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
