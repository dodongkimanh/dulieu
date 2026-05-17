package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "call_recordings", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "khach_hang_id", nullable = false)
    private Long khachHangId;

    @Column(name = "file_url", columnDefinition = "TEXT", nullable = false)
    private String fileUrl;

    @Column(name = "file_name", length = 500)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now(VN_ZONE);
        if (recordedAt == null) recordedAt = now;
        if (createdAt == null) createdAt = now;
    }
}
