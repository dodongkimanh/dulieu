package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "zalo_messages", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZaloMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contact_id")
    private Long contactId;

    @Column(name = "khach_hang_id", nullable = false)
    private Long khachHangId;

    @Column(name = "session_id", length = 200)
    private String sessionId;

    @Column(name = "zalo_id", length = 300)
    private String zaloId;

    /** "staff" hoặc "customer" */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String sender = "staff";

    /** "text", "image", "video", "file" */
    @Column(name = "message_type", nullable = false, length = 20)
    @Builder.Default
    private String messageType = "text";

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_name", length = 500)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now(VN_ZONE);
        if (sentAt == null) sentAt = now;
        if (createdAt == null) createdAt = now;
    }
}
