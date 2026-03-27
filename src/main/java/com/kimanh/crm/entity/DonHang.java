package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "don_hang", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_don", length = 50)
    private String maDon;

    @Column(name = "ngay_dat")
    private LocalDate ngayDat;

    @Column(name = "khach_hang_id")
    private Long khachHangId;

    @Column(name = "ten_khach")
    private String tenKhach;

    @Column(name = "sdt")
    private String sdt;

    @Column(name = "dia_chi")
    private String diaChi;

    @Column(name = "san_pham")
    private String sanPham;

    @Column(name = "so_luong")
    private Integer soLuong;

    @Column(name = "don_gia", precision = 15, scale = 0)
    private BigDecimal donGia;

    @Column(name = "tong_tien", precision = 15, scale = 0)
    private BigDecimal tongTien;

    @Column(name = "chiet_khau", precision = 15, scale = 0)
    private BigDecimal chietKhau;

    @Column(name = "thanh_toan", precision = 15, scale = 0)
    private BigDecimal thanhToan;

    @Column(name = "hinh_thuc_thanh_toan", length = 50)
    private String hinhThucThanhToan;

    @Column(name = "trang_thai", length = 50)
    private String trangThai;

    @Column(name = "ghi_chu")
    private String ghiChu;

    @Column(name = "sale")
    private String sale;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (ngayDat == null) ngayDat = LocalDate.now();
        if (soLuong == null) soLuong = 1;
        if (donGia == null) donGia = BigDecimal.ZERO;
        if (chietKhau == null) chietKhau = BigDecimal.ZERO;
        if (hinhThucThanhToan == null) hinhThucThanhToan = "Tiền mặt";
        if (trangThai == null) trangThai = "Mới";
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();

        // Auto-calculate
        tongTien = donGia.multiply(BigDecimal.valueOf(soLuong));
        thanhToan = tongTien.subtract(chietKhau != null ? chietKhau : BigDecimal.ZERO);
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
        if (donGia != null && soLuong != null) {
            tongTien = donGia.multiply(BigDecimal.valueOf(soLuong));
            thanhToan = tongTien.subtract(chietKhau != null ? chietKhau : BigDecimal.ZERO);
        }
    }
}
