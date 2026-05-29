package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "kenh_tiep_thi", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KenhTiepThi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now(VN_ZONE);
        if (active == null) active = true;
        if (sortOrder == null) sortOrder = 0;
    }
}
