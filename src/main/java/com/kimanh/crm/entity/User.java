package com.kimanh.crm.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "crm_users", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Column(nullable = false)
    private String role; // ADMIN, SALER

    @Column
    @Builder.Default
    private Boolean active = true;

    @Column
    private String zalo;

    @Column(name = "zalo_password")
    private String zaloPassword;

    @Column
    private String sim;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now(VN_ZONE);
        if (active == null) active = true;
    }
}
