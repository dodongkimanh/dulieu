package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "zalo_contacts", schema = "public",
    uniqueConstraints = @UniqueConstraint(columnNames = {"khach_hang_id", "session_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZaloContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "khach_hang_id", nullable = false)
    private Long khachHangId;

    @Column(name = "session_id", nullable = false, length = 200)
    private String sessionId;

    @Column(name = "zalo_id", length = 300)
    private String zaloId;

    @Column(name = "display_name", length = 500)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String avatar;

    @Column(name = "synced_at")
    private OffsetDateTime syncedAt;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @PrePersist
    public void prePersist() {
        if (syncedAt == null) syncedAt = OffsetDateTime.now(VN_ZONE);
    }
}
