package com.kimanh.crm.repository;

import com.kimanh.crm.entity.KhachHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface KhachHangRepository extends JpaRepository<KhachHang, Long> {

    @Query(value = "SELECT k.* FROM public.data_dulieukhach k WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(k.\"Khach_hang\") LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.\"Sdt\") LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.\"Uid\") LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:status AS text) IS NULL OR k.status = CAST(:status AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR k.\"Page\" = CAST(:page AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR REGEXP_REPLACE(TRIM(k.\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR k.\"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR k.\"Ngay_thang\" <= CAST(:toDate AS date)) " +
           "AND (:hasSdt IS NULL OR (CAST(:hasSdt AS boolean) = true AND k.\"Sdt\" IS NOT NULL AND k.\"Sdt\" <> '')) " +
           "AND (:assignedOnly IS NULL OR (CAST(:assignedOnly AS boolean) = true AND k.assigned_from IS NOT NULL AND k.assigned_from <> '' AND k.status = 'moi')) " +
           "ORDER BY k.created_at DESC",
           countQuery = "SELECT COUNT(k.id) FROM public.data_dulieukhach k WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(k.\"Khach_hang\") LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.\"Sdt\") LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.\"Uid\") LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:status AS text) IS NULL OR k.status = CAST(:status AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR k.\"Page\" = CAST(:page AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR REGEXP_REPLACE(TRIM(k.\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text)) " +
           "AND (CAST(:fromDate AS date) IS NULL OR k.\"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR k.\"Ngay_thang\" <= CAST(:toDate AS date)) " +
           "AND (:hasSdt IS NULL OR (CAST(:hasSdt AS boolean) = true AND k.\"Sdt\" IS NOT NULL AND k.\"Sdt\" <> '')) " +
           "AND (:assignedOnly IS NULL OR (CAST(:assignedOnly AS boolean) = true AND k.assigned_from IS NOT NULL AND k.assigned_from <> '' AND k.status = 'moi'))",
           nativeQuery = true)
    Page<KhachHang> findWithFilters(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("page") String page,
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("hasSdt") Boolean hasSdt,
            @Param("assignedOnly") Boolean assignedOnly,
            Pageable pageable);

    @Query("SELECT k FROM KhachHang k WHERE LOWER(k.khachHang) LIKE LOWER(CONCAT('%',:name,'%')) " +
           "OR LOWER(k.sdt) LIKE LOWER(CONCAT('%',:name,'%'))")
    List<KhachHang> searchByNameOrPhone(@Param("name") String name);

    long count();

    @Query("SELECT COUNT(k) FROM KhachHang k WHERE k.createdAt >= :startOfMonth")
    long countNewThisMonth(@Param("startOfMonth") OffsetDateTime startOfMonth);

    @Query("SELECT DISTINCT k.page FROM KhachHang k WHERE k.page IS NOT NULL")
    List<String> findDistinctPages();

    @Query("SELECT DISTINCT k.sale FROM KhachHang k WHERE k.sale IS NOT NULL")
    List<String> findDistinctSales();

    // Sale dashboard: total mess + distinct phones in a single query (excludes assigned/transferred customers, only mess_moi)
    @Query(value = "SELECT COUNT(*), COUNT(DISTINCT CASE WHEN \"Sdt\" IS NOT NULL AND \"Sdt\" <> '' THEN \"Sdt\" END) " +
           "FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text) " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date))", nativeQuery = true)
    Object[] countMessAndPhonesBySale(@Param("sale") String sale,
                                      @Param("fromDate") LocalDate fromDate,
                                      @Param("toDate") LocalDate toDate);

    // Sale dashboard: total mess_moi (records) for a sale in date range (excludes assigned/transferred + spam/cũ)
    @Query(value = "SELECT COUNT(*) FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text) " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date))", nativeQuery = true)
    long countMessBySale(@Param("sale") String sale,
                         @Param("fromDate") LocalDate fromDate,
                         @Param("toDate") LocalDate toDate);

    // Fallback: handles invisible chars, trailing/internal whitespace, Unicode mismatches
    @Query(value = "SELECT COUNT(*) FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = REGEXP_REPLACE(TRIM(CAST(:sale AS text)), '\\s+', ' ', 'g') " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date))", nativeQuery = true)
    long countMessBySaleTrimmed(@Param("sale") String sale,
                                @Param("fromDate") LocalDate fromDate,
                                @Param("toDate") LocalDate toDate);

    // Sale dashboard: distinct phone numbers for a sale in date range (excludes assigned/transferred + spam/cũ)
    @Query(value = "SELECT COUNT(DISTINCT \"Sdt\") FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text) AND \"Sdt\" IS NOT NULL AND \"Sdt\" <> '' " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date))", nativeQuery = true)
    long countDistinctSdtBySale(@Param("sale") String sale,
                                @Param("fromDate") LocalDate fromDate,
                                @Param("toDate") LocalDate toDate);

    // Fallback for phones with whitespace normalization
    @Query(value = "SELECT COUNT(DISTINCT \"Sdt\") FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = REGEXP_REPLACE(TRIM(CAST(:sale AS text)), '\\s+', ' ', 'g') AND \"Sdt\" IS NOT NULL AND \"Sdt\" <> '' " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date))", nativeQuery = true)
    long countDistinctSdtBySaleTrimmed(@Param("sale") String sale,
                                       @Param("fromDate") LocalDate fromDate,
                                       @Param("toDate") LocalDate toDate);

    // Sale dashboard: mess_moi count by day for a sale (excludes assigned/transferred + spam/cũ)
    @Query(value = "SELECT CAST(TO_CHAR(\"Ngay_thang\", 'DD') AS integer) as day_num, COUNT(*) as cnt " +
           "FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text) " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date)) " +
           "GROUP BY CAST(TO_CHAR(\"Ngay_thang\", 'DD') AS integer) ORDER BY day_num", nativeQuery = true)
    List<Object[]> countMessByDayForSale(
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Fallback for mess by day with whitespace normalization
    @Query(value = "SELECT CAST(TO_CHAR(\"Ngay_thang\", 'DD') AS integer) as day_num, COUNT(*) as cnt " +
           "FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = REGEXP_REPLACE(TRIM(CAST(:sale AS text)), '\\s+', ' ', 'g') " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date)) " +
           "GROUP BY CAST(TO_CHAR(\"Ngay_thang\", 'DD') AS integer) ORDER BY day_num", nativeQuery = true)
    List<Object[]> countMessByDayForSaleTrimmed(
            @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // Count pending assigned customers (status = 'moi' and has assigned_from)
    @Query(value = "SELECT COUNT(*) FROM data_dulieukhach WHERE " +
           "assigned_from IS NOT NULL AND assigned_from <> '' AND status = 'moi' " +
           "AND (CAST(:sale AS text) IS NULL OR REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text))",
           nativeQuery = true)
    long countPendingAssigned(@Param("sale") String sale);

    // Batch: mess_moi counts grouped by sale name (for sales-mess-overview, avoids N+1)
    @Query(value = "SELECT TRIM(\"Sale\") as sale_name, COUNT(*) as mess_count " +
           "FROM data_dulieukhach " +
           "WHERE (assigned_from IS NULL OR assigned_from = '') " +
           "AND (loai_mess IS NULL OR loai_mess = 'mess_moi') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date)) " +
           "AND \"Sale\" IS NOT NULL AND TRIM(\"Sale\") <> '' " +
           "GROUP BY TRIM(\"Sale\")", nativeQuery = true)
    List<Object[]> countMessGroupedBySale(@Param("fromDate") LocalDate fromDate,
                                          @Param("toDate") LocalDate toDate);

    // Breakdown: count by loai_mess type for a specific sale (for DoanhSo dashboard detail)
    @Query(value = "SELECT COALESCE(loai_mess, 'mess_moi') as loai, COUNT(*) as cnt " +
           "FROM data_dulieukhach WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = CAST(:sale AS text) " +
           "AND (assigned_from IS NULL OR assigned_from = '') " +
           "AND (CAST(:fromDate AS date) IS NULL OR \"Ngay_thang\" >= CAST(:fromDate AS date)) " +
           "AND (CAST(:toDate AS date) IS NULL OR \"Ngay_thang\" <= CAST(:toDate AS date)) " +
           "GROUP BY COALESCE(loai_mess, 'mess_moi')", nativeQuery = true)
    List<Object[]> countMessByLoaiMessForSale(@Param("sale") String sale,
                                              @Param("fromDate") LocalDate fromDate,
                                              @Param("toDate") LocalDate toDate);
}
