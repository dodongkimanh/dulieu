package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "bang_luong")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BangLuongAdjust {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nhan_vien_id", nullable = false)
    private Long nhanVienId;

    @Column(name = "thang", nullable = false)
    private int thang;

    @Column(name = "nam", nullable = false)
    private int nam;

    @Column(name = "phu_cap")
    @Builder.Default
    private BigDecimal phuCap = BigDecimal.ZERO;

    @Column(name = "ung_luong")
    @Builder.Default
    private BigDecimal ungLuong = BigDecimal.ZERO;

    @Column(name = "phat")
    @Builder.Default
    private BigDecimal phat = BigDecimal.ZERO;

    @Column(name = "so_cong_nghi_le")
    @Builder.Default
    private BigDecimal soCongNghiLe = BigDecimal.ZERO;

    @Column(name = "so_cong_phep")
    @Builder.Default
    private BigDecimal soCongPhep = BigDecimal.ZERO;

    @Column(name = "sim_dt")
    private BigDecimal simDt; // null = dùng giá trị mặc định theo chức vụ

    @Column(name = "chi_vt")
    @Builder.Default
    private BigDecimal chiVt = BigDecimal.ZERO;

    @Column(name = "hoa_hong")
    @Builder.Default
    private BigDecimal hoaHong = BigDecimal.ZERO;

    @Column(name = "ghi_chu")
    private String ghiChu;

    @Column(name = "da_xac_nhan")
    @Builder.Default
    private Boolean daXacNhan = false;

    @Column(name = "ngay_xac_nhan")
    private java.time.OffsetDateTime ngayXacNhan;
}
