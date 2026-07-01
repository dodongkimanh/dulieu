package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "luong_co_cau")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LuongCoCau {

    @Id
    @Column(name = "chuc_vu")
    private String chucVu;

    @Column(name = "luong_co_ban", nullable = false)
    private Long luongCoBan = 0L;

    @Column(name = "mo_ta")
    private String moTa;
}
