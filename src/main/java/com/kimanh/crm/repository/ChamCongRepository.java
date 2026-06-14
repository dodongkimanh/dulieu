package com.kimanh.crm.repository;

import com.kimanh.crm.entity.ChamCong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ChamCongRepository extends JpaRepository<ChamCong, Long> {

    List<ChamCong> findByNgayBetweenOrderByNhanVienIdAscNgayAsc(LocalDate from, LocalDate to);

    List<ChamCong> findByNhanVienIdAndNgayBetween(Long nhanVienId, LocalDate from, LocalDate to);

    Optional<ChamCong> findByNhanVienIdAndNgay(Long nhanVienId, LocalDate ngay);

    @Modifying
    @Query("UPDATE ChamCong c SET c.duocDuyet = true WHERE c.ngay BETWEEN :from AND :to")
    int duyetThang(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Thống kê tháng: [0]nhan_vien_id, [1]sum_cong, [2]sum_phut_tre, [3]sum_phut_ve_som,
    //   [4]sum_phut_bi_phat, [5]tang_ca_sang, [6]tang_ca_chieu, [7]tien_tang_ca,
    //   [8]phat_khong_cham_cong, [9]phu_cap_giao_hang, [10]phi_lap_dat_tranh, [11]chi_mua_vat_tu, [12]tien_an
    @Query(value = "SELECT c.nhan_vien_id, " +
        "COALESCE(SUM(c.so_cong), 0), " +
        "COALESCE(SUM(c.phut_tre), 0), " +
        "COALESCE(SUM(c.phut_ve_som), 0), " +
        "COALESCE(SUM(CASE WHEN NOT c.duyet_khong_phat THEN c.phut_tre + c.phut_ve_som ELSE 0 END), 0), " +
        "COALESCE(SUM(c.tang_ca_sang), 0), " +
        "COALESCE(SUM(c.tang_ca_chieu), 0), " +
        "COALESCE(SUM(c.tien_tang_ca), 0), " +
        "COALESCE(SUM(CASE WHEN NOT c.duyet_khong_phat THEN c.phat_khong_cham_cong ELSE 0 END), 0), " +
        "COALESCE(SUM(c.phu_cap_giao_hang), 0), " +
        "COALESCE(SUM(c.phi_lap_dat_tranh), 0), " +
        "COALESCE(SUM(c.chi_mua_vat_tu), 0), " +
        "COALESCE(SUM(c.tien_an), 0) " +
        "FROM cham_cong c WHERE c.ngay BETWEEN :from AND :to GROUP BY c.nhan_vien_id",
        nativeQuery = true)
    List<Object[]> monthlyStats(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
