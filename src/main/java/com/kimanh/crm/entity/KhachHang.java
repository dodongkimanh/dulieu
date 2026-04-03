package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.OffsetDateTime;

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

    @Column(name = "`Ngay_thang`")
    private LocalDate ngayThang;

    @Column(name = "`Khach_hang`")
    private String khachHang;

    @Column(name = "`Sdt`")
    private String sdt;

    @Column(name = "`Sale`")
    private String sale;

    @Column(name = "`Mess`")
    private String mess;

    @Column(name = "`Uid`")
    private String uid;

    @Column(name = "ad_id")
    private String adId;

    @Column(name = "`ID Trang`")
    private String idTrang;

    @Column(name = "`Page`")
    private String page;

    @Column(name = "loai_mess")
    private String loaiMess;

    @Column(name = "assigned_from")
    private String assignedFrom;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (status == null) status = "moi";
        if (loaiMess == null) loaiMess = "mess_moi";
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
