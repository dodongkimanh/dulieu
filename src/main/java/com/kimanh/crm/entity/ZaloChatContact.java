package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "zalo_chat_contacts", schema = "public",
    uniqueConstraints = @UniqueConstraint(columnNames = {"zalo_uid", "session_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ZaloChatContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "zalo_uid", nullable = false)
    private String zaloUid;

    @Column(name = "session_id", nullable = false, length = 200)
    private String sessionId;

    @Column(columnDefinition = "TEXT")
    private String name;

    @Column(columnDefinition = "TEXT")
    private String avatar;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
