package com.kimanh.crm.repository;

import com.kimanh.crm.entity.DonHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface DonHangRepository extends JpaRepository<DonHang, Long> {

    @Query(value = "SELECT d.* FROM public.don_hang d WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(d.ma_hoa_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ma_dat_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.khach_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ma_van_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:tinhTrang AS text) IS NULL OR d.tinh_trang = CAST(:tinhTrang AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR d.sale = CAST(:sale AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR d.page = CAST(:page AS text)) " +
           "AND (CAST(:maIdQuangCao AS text) IS NULL OR d.ma_id_quang_cao = CAST(:maIdQuangCao AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date)) " +
           "ORDER BY d.ngay DESC, d.id DESC",
           countQuery = "SELECT COUNT(*) FROM public.don_hang d WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(d.ma_hoa_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ma_dat_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.khach_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ma_van_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:tinhTrang AS text) IS NULL OR d.tinh_trang = CAST(:tinhTrang AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR d.sale = CAST(:sale AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR d.page = CAST(:page AS text)) " +
           "AND (CAST(:maIdQuangCao AS text) IS NULL OR d.ma_id_quang_cao = CAST(:maIdQuangCao AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date))",
           nativeQuery = true)
    Page<DonHang> findWithFilters(
            @Param("keyword") String keyword,
            @Param("tinhTrang") String tinhTrang,
            @Param("sale") String sale,
            @Param("page") String page,
            @Param("maIdQuangCao") String maIdQuangCao,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);

    // Export (no paging)
    @Query(value = "SELECT d.* FROM public.don_hang d WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(d.ma_hoa_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ma_dat_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.khach_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ma_van_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:tinhTrang AS text) IS NULL OR d.tinh_trang = CAST(:tinhTrang AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR d.sale = CAST(:sale AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR d.page = CAST(:page AS text)) " +
           "AND (CAST(:maIdQuangCao AS text) IS NULL OR d.ma_id_quang_cao = CAST(:maIdQuangCao AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date)) " +
           "ORDER BY d.ngay DESC, d.id DESC",
           nativeQuery = true)
    List<DonHang> findAllWithFilters(
            @Param("keyword") String keyword,
            @Param("tinhTrang") String tinhTrang,
            @Param("sale") String sale,
            @Param("page") String page,
            @Param("maIdQuangCao") String maIdQuangCao,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    long count();

    @Query("SELECT COALESCE(COUNT(d), 0) FROM DonHang d WHERE " +
           "(CAST(:fromDate AS date) IS NULL OR d.ngay >= :fromDate) AND " +
           "(CAST(:toDate AS date) IS NULL OR d.ngay <= :toDate)")
    long countByDateRange(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("SELECT COALESCE(SUM(d.giaThuThucTe), 0) FROM DonHang d WHERE " +
           "(CAST(:fromDate AS date) IS NULL OR d.ngay >= :fromDate) AND " +
           "(CAST(:toDate AS date) IS NULL OR d.ngay <= :toDate)")
    BigDecimal sumTotalRevenueByDateRange(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("SELECT COALESCE(COUNT(d), 0) FROM DonHang d WHERE d.tinhTrang = 'Đã Giao Thành Công' AND " +
           "(CAST(:fromDate AS date) IS NULL OR d.ngay >= :fromDate) AND " +
           "(CAST(:toDate AS date) IS NULL OR d.ngay <= :toDate)")
    long countCompletedByDateRange(@Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("SELECT COALESCE(SUM(d.giaThuThucTe), 0) FROM DonHang d")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COUNT(d) FROM DonHang d WHERE d.ngay = :today")
    long countTodayOrders(@Param("today") LocalDate today);

    @Query("SELECT COUNT(d) FROM DonHang d WHERE d.tinhTrang = 'Đã Giao Thành Công'")
    long countCompleted();

    @Query(value = "SELECT TO_CHAR(ngay, 'YYYY-MM') as month, COALESCE(SUM(gia_thu_thuc_te), 0) as revenue " +
                   "FROM don_hang WHERE ngay >= :startDate " +
                   "GROUP BY TO_CHAR(ngay, 'YYYY-MM') ORDER BY month", nativeQuery = true)
    List<Object[]> revenueByMonth(@Param("startDate") LocalDate startDate);

    @Query(value = "SELECT TO_CHAR(ngay, 'YYYY-MM-DD') as day, COUNT(*) as total " +
                   "FROM don_hang WHERE ngay >= :startDate " +
                   "GROUP BY TO_CHAR(ngay, 'YYYY-MM-DD') ORDER BY day", nativeQuery = true)
    List<Object[]> ordersByDay(@Param("startDate") LocalDate startDate);

    @Query("SELECT d.tinhTrang, COUNT(d) FROM DonHang d GROUP BY d.tinhTrang")
    List<Object[]> orderStatusDistribution();

    List<DonHang> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT d.sale FROM DonHang d WHERE d.sale IS NOT NULL ORDER BY d.sale")
    List<String> findDistinctSales();

    @Query("SELECT DISTINCT d.page FROM DonHang d WHERE d.page IS NOT NULL ORDER BY d.page")
    List<String> findDistinctPages();

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(ma_hoa_don FROM '[0-9]+$') AS INTEGER)), 0) " +
                   "FROM don_hang WHERE ma_hoa_don LIKE :prefix || '%'", nativeQuery = true)
    int findMaxInvoiceSeq(@Param("prefix") String prefix);

    // Analytics: aggregate by sale + tinhTrang
    @Query(value = "SELECT d.sale, d.tinh_trang, " +
           "COUNT(*) as cnt, " +
           "COALESCE(SUM(d.gia_ban_len_don), 0) as sum_gia_ban, " +
           "COALESCE(SUM(d.gia_thu_thuc_te), 0) as sum_gia_thu, " +
           "COALESCE(SUM(d.loi_nhuan_uoc_tinh), 0) as sum_loi_nhuan, " +
           "COALESCE(SUM(d.gia_von), 0) as sum_gia_von, " +
           "COALESCE(SUM(d.chi_phi_van_chuyen), 0) as sum_cpvc " +
           "FROM don_hang d WHERE " +
           "(CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date)) " +
           "GROUP BY d.sale, d.tinh_trang " +
           "ORDER BY d.sale, d.tinh_trang", nativeQuery = true)
    List<Object[]> aggregateBySaleAndStatus(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Analytics: aggregate by date
    @Query(value = "SELECT TO_CHAR(d.ngay, 'YYYY-MM-DD') as day, " +
           "COUNT(*) as cnt, " +
           "COALESCE(SUM(d.gia_ban_len_don), 0) as sum_gia_ban, " +
           "COALESCE(SUM(d.gia_thu_thuc_te), 0) as sum_gia_thu, " +
           "COALESCE(SUM(d.loi_nhuan_uoc_tinh), 0) as sum_loi_nhuan " +
           "FROM don_hang d WHERE " +
           "(CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date)) " +
           "GROUP BY TO_CHAR(d.ngay, 'YYYY-MM-DD') " +
           "ORDER BY day", nativeQuery = true)
    List<Object[]> aggregateByDate(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Analytics: totals
    @Query(value = "SELECT " +
           "COUNT(*) as cnt, " +
           "COALESCE(SUM(d.gia_ban_len_don), 0) as sum_gia_ban, " +
           "COALESCE(SUM(d.gia_thu_thuc_te), 0) as sum_gia_thu, " +
           "COALESCE(SUM(d.loi_nhuan_uoc_tinh), 0) as sum_loi_nhuan, " +
           "COALESCE(SUM(d.gia_von), 0) as sum_gia_von, " +
           "COALESCE(SUM(d.chi_phi_van_chuyen), 0) as sum_cpvc, " +
           "COALESCE(SUM(d.loi_nhuan_sau_tru), 0) as sum_ln_sau_tru " +
           "FROM don_hang d WHERE " +
           "(CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date))",
           nativeQuery = true)
    List<Object[]> aggregateTotals(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Sale dashboard: total revenue for a sale
    @Query(value = "SELECT COALESCE(SUM(d.gia_thu_thuc_te), 0) FROM don_hang d " +
           "WHERE d.sale = :sale " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date))",
           nativeQuery = true)
    BigDecimal sumRevenueBySale(
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Sale dashboard: qualified revenue (delivered/shipping statuses) for mess calculation
    @Query(value = "SELECT COALESCE(SUM(d.gia_thu_thuc_te), 0) FROM don_hang d " +
           "WHERE d.sale = :sale " +
           "AND d.tinh_trang IN ('Đã Giao Thành Công', 'Đang giao', 'Đang vận chuyển', 'Khách Đặt Cọc', 'KH Showroom') " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date))",
           nativeQuery = true)
    BigDecimal sumQualifiedRevenueBySale(
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Sale dashboard: orders by status for a specific sale
    @Query(value = "SELECT d.tinh_trang, COUNT(*), COALESCE(SUM(d.gia_thu_thuc_te), 0) " +
           "FROM don_hang d WHERE d.sale = :sale " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay <= CAST(:toDate AS date)) " +
           "GROUP BY d.tinh_trang ORDER BY d.tinh_trang",
           nativeQuery = true)
    List<Object[]> ordersByStatusForSale(
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
