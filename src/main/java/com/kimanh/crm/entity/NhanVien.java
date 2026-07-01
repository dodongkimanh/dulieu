package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "nhan_vien")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NhanVien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_nv", length = 20)
    private String maNv;

    @Column(name = "ho_ten", nullable = false)
    private String hoTen;

    @Column(name = "loai_hop_dong", length = 5)
    @Builder.Default
    private String loaiHopDong = "CT"; // HV, TV, CT

    @Column(name = "chuc_vu", length = 20)
    @Builder.Default
    private String chucVu = "SALE"; // SALE, VNVP, TRUONG_NHOM

    @Column(name = "luong_co_ban")
    @Builder.Default
    private BigDecimal luongCoBan = BigDecimal.ZERO;

    @Column(name = "ngay_vao_lam")
    private LocalDate ngayVaoLam;

    @Column(name = "trang_thai")
    @Builder.Default
    private boolean trangThai = true;

    @Column(name = "crm_user_name")
    private String crmUserName;

    @Column(name = "an_trong_bang")
    @Builder.Default
    private boolean anTrongBang = false; // true = ẩn khỏi chấm công & bảng lương

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
