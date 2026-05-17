package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "data_dulieukhach", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KhachHang implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay_thang")
    private LocalDate ngayThang;

    @Column(name = "khach_hang")
    private String khachHang;

    @Column(name = "sdt")
    private String sdt;

    @Column(name = "sale")
    private String sale;

    @Column(name = "mess")
    private String mess;

    @Column(name = "uid")
    private String uid;

    @Column(name = "ad_id")
    private String adId;

    @Column(name = "\"id trang\"")
    private String idTrang;

    @Column(name = "page")
    private String page;

    @Column(name = "loai_mess")
    private String loaiMess;

    @Column(name = "assigned_from")
    private String assignedFrom;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @PrePersist
    public void prePersist() {
        if (status == null) status = "moi";
        if (loaiMess == null) loaiMess = "mess_moi";
        if (createdAt == null) createdAt = OffsetDateTime.now(VN_ZONE);
    }
}
