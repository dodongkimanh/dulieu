package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

@Entity
@Table(name = "cham_cong")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChamCong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nhan_vien_id", nullable = false)
    private Long nhanVienId;

    @Column(name = "ngay", nullable = false)
    private LocalDate ngay;

    // Trạng thái (auto-derived khi có giờ)
    @Column(name = "ca_sang", length = 20)
    @Builder.Default
    private String caSang = "chua_cham";

    @Column(name = "ca_chieu", length = 20)
    @Builder.Default
    private String caChieu = "chua_cham";

    // 4 mốc giờ trong ngày (định dạng "HH:mm")
    @Column(name = "gio_vao_sang",   length = 5) private String gioVaoSang;   // vào sáng  08:33
    @Column(name = "gio_ra_sang",    length = 5) private String gioRaSang;    // ra sáng   11:45
    @Column(name = "gio_vao_chieu",  length = 5) private String gioVaoChieu;  // vào chiều 13:30
    @Column(name = "gio_ra_chieu",   length = 5) private String gioRaChieu;   // ra chiều  17:00

    // Kết quả tính toán
    @Column(name = "phut_tre")     @Builder.Default private int phutTre    = 0;
    @Column(name = "phut_ve_som")  @Builder.Default private int phutVeSom  = 0;
    @Column(name = "so_cong", precision = 3, scale = 2) @Builder.Default private BigDecimal soCong = BigDecimal.ZERO;

    // Tăng ca lái xe
    @Column(name = "tang_ca_sang")  @Builder.Default private int  tangCaSang  = 0; // phút trước 08:30
    @Column(name = "tang_ca_chieu") @Builder.Default private int  tangCaChieu = 0; // phút sau  17:00
    @Column(name = "tien_tang_ca")  @Builder.Default private long tienTangCa  = 0; // đồng

    // Phạt không chấm công vào/ra: 100k/lần (gioVaoSang null hoặc gioRaChieu null)
    @Column(name = "phat_khong_cham_cong") @Builder.Default private long phatKhongChamCong = 0;

    // Phụ cấp lái xe (nhập thủ công bởi admin/kế toán)
    @Column(name = "so_giao_hang",      precision = 5, scale = 1) @Builder.Default private java.math.BigDecimal soGiaoHang     = java.math.BigDecimal.ZERO;
    @Column(name = "phu_cap_giao_hang") @Builder.Default private long phuCapGiaoHang = 0; // soGiaoHang × 50.000đ
    @Column(name = "so_lap_dat_tranh",  precision = 5, scale = 1) @Builder.Default private java.math.BigDecimal soLapDatTranh  = java.math.BigDecimal.ZERO;
    @Column(name = "phi_lap_dat_tranh") @Builder.Default private long phiLapDatTranh = 0; // soLapDatTranh × 300.000đ
    @Column(name = "chi_mua_vat_tu")    @Builder.Default private long chiMuaVatTu    = 0; // nhập trực tiếp số tiền
    @Column(name = "tien_an")           @Builder.Default private long tienAn          = 0; // 30.000đ/ngày đi làm (tự động)

    // Admin duyệt công override: nếu != null thì dùng giá trị này thay soCong tính toán
    @Column(name = "duyet_cong", precision = 3, scale = 2) private BigDecimal duyetCong;

    // Ghi chú & duyệt
    @Column(name = "ghi_chu")             private String  ghiChu;
    @Column(name = "ghi_chu_nv")          private String  ghiChuNv;
    @Column(name = "da_xin_phep")         @Builder.Default private boolean daXinPhep       = false;
    @Column(name = "duoc_duyet")          @Builder.Default private boolean duocDuyet        = false;
    @Column(name = "duyet_khong_phat")    @Builder.Default private boolean duyetKhongPhat   = false;
    @Column(name = "duyet_note")          private String  duyetNote;

    // Chuẩn giờ (phút từ 00:00)
    private static final int SANG_CHUAN   = 8 * 60 + 33;  // 08:33
    private static final int SANG_MOC     = 9 * 60;        // 09:00 → sau mốc này = 1/4 công
    private static final int SANG_KT      = 11 * 60 + 45;  // 11:45 kết thúc sáng
    private static final int CHIEU_BD     = 13 * 60 + 30;  // 13:30 bắt đầu chiều
    private static final int CHIEU_CHUAN  = 17 * 60;       // 17:00
    private static final int CHIEU_MOC    = 15 * 60 + 30;  // 15:30 → ra tại/trước mốc này = 1/4 công

    /**
     * Tính toán các giá trị từ giờ chấm công.
     * isLaiXe: Lái xe chỉ chấm vào sáng + ra chiều; tính thêm tăng ca.
     */
    public void calculateFromTime(boolean isLaiXe) {
        boolean isSunday = ngay != null && ngay.getDayOfWeek() == DayOfWeek.SUNDAY;

        int vaoSang  = parseTime(gioVaoSang);
        int raSang   = parseTime(gioRaSang);
        int vaoChieu = parseTime(gioVaoChieu);
        int raChieu  = parseTime(gioRaChieu);

        // Chủ Nhật không đi làm → nghỉ, không phạt
        if (isSunday && vaoSang < 0 && raSang < 0 && vaoChieu < 0 && raChieu < 0) {
            this.soCong = BigDecimal.ZERO;
            this.phutTre = 0; this.phutVeSom = 0;
            this.phatKhongChamCong = 0;
            this.tangCaSang = 0; this.tangCaChieu = 0; this.tienTangCa = 0;
            this.caSang = "nghi"; this.caChieu = "nghi";
            return;
        }

        double cong = 0;
        int tre = 0, veSom = 0;

        if (isLaiXe) {
            // Lái xe: chỉ vào sáng + ra chiều; không tính muộn/sớm thông thường
            if (vaoSang >= 0) { cong += 0.5; caSang  = "dung_gio"; }
            if (raChieu  >= 0) { cong += 0.5; caChieu = "dung_gio"; }

            // Tăng ca: trước 08:30 = 50k/h; sau 17:00 = 30k/h
            int tcSang  = (vaoSang >= 0)  ? Math.max(0, SANG_CHUAN  - vaoSang)  : 0;
            int tcChieu = (raChieu  >= 0) ? Math.max(0, raChieu - CHIEU_CHUAN) : 0;
            this.tangCaSang  = tcSang;
            this.tangCaChieu = tcChieu;
            // 50k/h sáng = 50000/60 đ/phút; 30k/h chiều
            this.tienTangCa  = Math.round(tcSang * 50_000.0 / 60) + Math.round(tcChieu * 30_000.0 / 60);
            this.phutTre   = 0;
            this.phutVeSom = 0;
            // tienAn là manual, không tự tính ở đây

        } else {
            // NVVP / VNSale: 4 lần chấm
            long phat = 0;

            // --- Ca sáng ---
            boolean sangVang = (vaoSang < 0 && raSang < 0); // cả 2 trống → nghỉ buổi sáng
            if (sangVang) {
                caSang = "nghi";
                // không công, không phạt
            } else if (vaoSang < 0) {
                // có Ra Sáng nhưng không có Vào Sáng → phạt 100k
                phat += 100_000;
                caSang = "thieu";
            } else {
                if (vaoSang > SANG_MOC) {
                    cong += 0.25;
                } else {
                    cong += 0.5;
                    tre += Math.max(0, vaoSang - SANG_CHUAN);
                }
                caSang = (vaoSang > SANG_CHUAN) ? "di_muon" : "dung_gio";
                // có Vào Sáng nhưng không có Ra Sáng → phạt 100k
                if (raSang < 0) {
                    phat += 100_000;
                } else if (raSang < SANG_KT) {
                    veSom += Math.max(0, SANG_KT - raSang);
                }
            }

            // --- Ca chiều ---
            boolean chieuVang = (vaoChieu < 0 && raChieu < 0); // cả 2 trống → nghỉ buổi chiều
            if (chieuVang) {
                caChieu = "nghi";
                // không công, không phạt
            } else if (raChieu < 0) {
                // có Vào Chiều nhưng không có Ra Chiều → phạt 100k
                phat += 100_000;
                caChieu = "thieu";
            } else {
                // có Ra Chiều
                if (vaoChieu < 0) {
                    // có Ra Chiều nhưng không có Vào Chiều → phạt 100k
                    phat += 100_000;
                } else if (vaoChieu > CHIEU_BD) {
                    tre += Math.max(0, vaoChieu - CHIEU_BD);
                    caChieu = "di_muon";
                } else {
                    caChieu = "dung_gio";
                }
                if (raChieu <= CHIEU_MOC) {
                    cong += 0.25;
                } else {
                    cong += 0.5;
                    if (raChieu < CHIEU_CHUAN) veSom += Math.max(0, CHIEU_CHUAN - raChieu);
                }
                if (caChieu.equals("chua_cham")) caChieu = (raChieu < CHIEU_CHUAN) ? "di_muon" : "dung_gio";
            }

            this.phutTre             = isSunday ? 0 : tre;
            this.phutVeSom           = isSunday ? 0 : veSom;
            this.phatKhongChamCong   = isSunday ? 0 : phat;
            this.tangCaSang          = 0;
            this.tangCaChieu         = 0;
            this.tienTangCa          = 0;
        }

        // Chủ Nhật đi làm → nhân x2 công, không phạt
        if (isSunday) {
            cong *= 2;
            tre = 0; veSom = 0;
            this.phatKhongChamCong = 0;
            this.caSang  = (vaoSang >= 0 || raSang >= 0)   ? "dung_gio" : "nghi";
            this.caChieu = (vaoChieu >= 0 || raChieu >= 0) ? "dung_gio" : "nghi";
        }

        this.soCong = BigDecimal.valueOf(cong);

        // Admin override công (độc lập với duyệt không phạt)
        if (this.duyetCong != null) {
            this.soCong = this.duyetCong;
        }
        // Admin duyệt không phạt → xóa toàn bộ phạt
        if (this.duyetKhongPhat) {
            this.phatKhongChamCong = 0;
            this.phutTre = 0;
            this.phutVeSom = 0;
        }
    }

    private int parseTime(String t) {
        if (t == null || t.isBlank()) return -1;
        try {
            String[] p = t.trim().split(":");
            return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
        } catch (Exception e) { return -1; }
    }
}
