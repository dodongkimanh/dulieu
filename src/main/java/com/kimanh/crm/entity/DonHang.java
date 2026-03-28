package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
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

    @Column(name = "ngay")
    private LocalDate ngay;

    @Column(name = "ma_hoa_don", length = 50)
    private String maHoaDon;

    @Column(name = "ma_dat_hang", length = 50)
    private String maDatHang;

    @Column(name = "khach_hang")
    private String khachHang;

    @Column(name = "sdt")
    private String sdt;

    @Column(name = "sale")
    private String sale;

    @Column(name = "gia_von", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal giaVon = BigDecimal.ZERO;

    @Column(name = "tong_tien_niem_yet", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal tongTienNiemYet = BigDecimal.ZERO;

    @Column(name = "gia_ban_len_don", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal giaBanLenDon = BigDecimal.ZERO;

    @Column(name = "cuoc_phu_troi", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal cuocPhuTroi = BigDecimal.ZERO;

    @Column(name = "gia_thu_thuc_te", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal giaThuThucTe = BigDecimal.ZERO;

    @Column(name = "ty_le_ck", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal tyLeCk = BigDecimal.ZERO;

    @Column(name = "loi_nhuan_uoc_tinh", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal loiNhuanUocTinh = BigDecimal.ZERO;

    @Column(name = "tinh_trang", length = 50)
    private String tinhTrang;

    @Column(name = "ma_van_don", length = 100)
    private String maVanDon;

    @Column(name = "chi_phi_van_chuyen", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal chiPhiVanChuyen = BigDecimal.ZERO;

    @Column(name = "ds_van_chuyen", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal dsVanChuyen = BigDecimal.ZERO;

    @Column(name = "dat_coc", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal datCoc = BigDecimal.ZERO;

    @Column(name = "thu_ban_truc_tiep", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal thuBanTrucTiep = BigDecimal.ZERO;

    @Column(name = "tong_thu_khach", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal tongThuKhach = BigDecimal.ZERO;

    @Column(name = "loi_nhuan_sau_tru", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal loiNhuanSauTru = BigDecimal.ZERO;

    @Column(name = "page")
    private String page;

    @Column(name = "ma_id_quang_cao")
    private String maIdQuangCao;

    @Column(name = "ghi_chu")
    private String ghiChu;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (ngay == null) ngay = LocalDate.now();
        if (tinhTrang == null) tinhTrang = "Đang Chờ";
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        calculate();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
        calculate();
    }

    public void calculate() {
        BigDecimal ban = giaBanLenDon != null ? giaBanLenDon : BigDecimal.ZERO;
        BigDecimal phu = cuocPhuTroi != null ? cuocPhuTroi : BigDecimal.ZERO;
        BigDecimal von = giaVon != null ? giaVon : BigDecimal.ZERO;
        BigDecimal niem = tongTienNiemYet != null ? tongTienNiemYet : BigDecimal.ZERO;
        BigDecimal coc = datCoc != null ? datCoc : BigDecimal.ZERO;
        BigDecimal truc = thuBanTrucTiep != null ? thuBanTrucTiep : BigDecimal.ZERO;
        BigDecimal dsvc = dsVanChuyen != null ? dsVanChuyen : BigDecimal.ZERO;
        BigDecimal cpvc = chiPhiVanChuyen != null ? chiPhiVanChuyen : BigDecimal.ZERO;

        // Giá Thu Thực Tế = Giá Bán Lên Đơn - Cước Phụ Trội
        giaThuThucTe = ban.subtract(phu);
        // Tỷ lệ CK % = ((Giá niêm yết - Giá Thu Thực Tế) / Giá niêm yết) * 100
        if (niem.compareTo(BigDecimal.ZERO) > 0) {
            tyLeCk = niem.subtract(giaThuThucTe).multiply(BigDecimal.valueOf(100))
                    .divide(niem, 2, RoundingMode.HALF_UP);
        } else {
            tyLeCk = BigDecimal.ZERO;
        }
        // Lợi Nhuận Ước Tính = Giá Thu Thực Tế - Giá Vốn
        loiNhuanUocTinh = giaThuThucTe.subtract(von);
        // Tổng thu khách = Đặt cọc + Thu bán trực tiếp + ĐS Vận Chuyển
        tongThuKhach = coc.add(truc).add(dsvc);
        // Lợi nhuận sau trừ = Tổng thu khách - Chi phí Vận Chuyển
        loiNhuanSauTru = tongThuKhach.subtract(cpvc);
    }
}
