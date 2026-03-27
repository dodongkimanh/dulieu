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
           "(CAST(:keyword AS text) IS NULL OR LOWER(d.ma_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ten_khach) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.san_pham) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:trangThai AS text) IS NULL OR d.trang_thai = CAST(:trangThai AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR d.sale = CAST(:sale AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay_dat >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay_dat <= CAST(:toDate AS date)) " +
           "ORDER BY d.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM public.don_hang d WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(d.ma_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ten_khach) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.san_pham) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:trangThai AS text) IS NULL OR d.trang_thai = CAST(:trangThai AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR d.sale = CAST(:sale AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay_dat >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay_dat <= CAST(:toDate AS date))",
           nativeQuery = true)
    Page<DonHang> findWithFilters(
            @Param("keyword") String keyword,
            @Param("trangThai") String trangThai,
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);

    long count();

    @Query("SELECT COALESCE(SUM(d.thanhToan), 0) FROM DonHang d")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COUNT(d) FROM DonHang d WHERE d.ngayDat = :today")
    long countTodayOrders(@Param("today") LocalDate today);

    @Query("SELECT COUNT(d) FROM DonHang d WHERE d.trangThai = 'Hoàn thành'")
    long countCompleted();

    // Revenue by month (last 12 months)
    @Query(value = "SELECT TO_CHAR(ngay_dat, 'YYYY-MM') as month, COALESCE(SUM(thanh_toan), 0) as revenue " +
                   "FROM don_hang WHERE ngay_dat >= :startDate " +
                   "GROUP BY TO_CHAR(ngay_dat, 'YYYY-MM') ORDER BY month", nativeQuery = true)
    List<Object[]> revenueByMonth(@Param("startDate") LocalDate startDate);

    // Orders by day (last 30 days)
    @Query(value = "SELECT TO_CHAR(ngay_dat, 'YYYY-MM-DD') as day, COUNT(*) as total " +
                   "FROM don_hang WHERE ngay_dat >= :startDate " +
                   "GROUP BY TO_CHAR(ngay_dat, 'YYYY-MM-DD') ORDER BY day", nativeQuery = true)
    List<Object[]> ordersByDay(@Param("startDate") LocalDate startDate);

    // Order status distribution
    @Query("SELECT d.trangThai, COUNT(d) FROM DonHang d GROUP BY d.trangThai")
    List<Object[]> orderStatusDistribution();

    // Recent orders
    List<DonHang> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT d.sale FROM DonHang d WHERE d.sale IS NOT NULL")
    List<String> findDistinctSales();

    // All orders for export (no paging)
    @Query(value = "SELECT d.* FROM public.don_hang d WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(d.ma_don) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.ten_khach) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(d.san_pham) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:trangThai AS text) IS NULL OR d.trang_thai = CAST(:trangThai AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR d.sale = CAST(:sale AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR d.ngay_dat >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR d.ngay_dat <= CAST(:toDate AS date)) " +
           "ORDER BY d.created_at DESC",
           nativeQuery = true)
    List<DonHang> findAllWithFilters(
            @Param("keyword") String keyword,
            @Param("trangThai") String trangThai,
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
