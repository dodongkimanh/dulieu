package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "removed_sale_names", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RemovedSaleName {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, unique = true)
    private String fullName;

    @Column(name = "removed_at")
    @Builder.Default
    private OffsetDateTime removedAt = OffsetDateTime.now();
}
