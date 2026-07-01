package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "luong_co_cau_sale")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LuongCoCauSale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "min_ds", nullable = false)
    private Long minDs;

    @Column(name = "max_ds")
    private Long maxDs; // null = không giới hạn (tier cuối)

    @Column(name = "luong_cung", nullable = false)
    private Long luongCung;

    @Column(name = "hoa_hong_bp", nullable = false)
    private Integer hoaHongBp; // basis points: 80 = 0.80%

    @Column(name = "thuong_bp", nullable = false)
    private Integer thuongBp; // basis points: 100 = 1%

    @Column(name = "thu_tu", nullable = false)
    private Integer thuTu;
}
