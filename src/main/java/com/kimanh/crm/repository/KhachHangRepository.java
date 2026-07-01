package com.kimanh.crm.repository;

import com.kimanh.crm.entity.KhachHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
           "ORDER BY CASE WHEN k.status = 'uu_tien' THEN 0 ELSE 1 END ASC, k.created_at DESC",
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

    // Paginated list with explicit LIMIT/OFFSET to guarantee uu_tien ORDER BY is respected
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
           "ORDER BY CASE WHEN k.status = 'uu_tien' THEN 0 ELSE 1 END ASC, k.created_at DESC " +
           "LIMIT :lim OFFSET :off",
           nativeQuery = true)
    List<KhachHang> findWithFiltersRaw(
            @Param("keyword") String keyword, @Param("status") String status,
            @Param("page") String page, @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate,
            @Param("hasSdt") Boolean hasSdt, @Param("assignedOnly") Boolean assignedOnly,
            @Param("lim") int lim, @Param("off") int off);

    @Query(value = "SELECT COUNT(k.id) FROM public.data_dulieukhach k WHERE " +
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
    long countWithFilters(
            @Param("keyword") String keyword, @Param("status") String status,
            @Param("page") String page, @Param("sale") String sale,
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate,
            @Param("hasSdt") Boolean hasSdt, @Param("assignedOnly") Boolean assignedOnly);

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

    @Modifying
    @Query(value = "UPDATE data_dulieukhach SET \"Sale\" = :newSale " +
           "WHERE REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g') = REGEXP_REPLACE(TRIM(CAST(:oldSale AS text)), '\\s+', ' ', 'g')",
           nativeQuery = true)
    int updateSaleByName(@Param("oldSale") String oldSale, @Param("newSale") String newSale);

    // Kho Số Nổi: lấy 100 số từ 7 ngày trước, phân bổ đều theo sale, loại trừ uu_tien, da_chot_don và số không có SĐT
    @Query(value = "WITH sale_count AS ( " +
           "  SELECT COUNT(DISTINCT REGEXP_REPLACE(TRIM(\"Sale\"), '\\s+', ' ', 'g')) AS cnt " +
           "  FROM data_dulieukhach " +
           "  WHERE \"Ngay_thang\" >= :fromDate " +
           "    AND status NOT IN ('uu_tien', 'da_chot_don') " +
           "    AND kho_noi_claimed_by IS NULL " +
           "    AND \"Sale\" IS NOT NULL AND TRIM(\"Sale\") <> '' " +
           "    AND \"Sdt\" IS NOT NULL AND TRIM(\"Sdt\") <> '' " +
           "), " +
           "ranked AS ( " +
           "  SELECT d.*, " +
           "    ROW_NUMBER() OVER (PARTITION BY REGEXP_REPLACE(TRIM(d.\"Sale\"), '\\s+', ' ', 'g') ORDER BY d.\"Ngay_thang\" ASC, d.created_at ASC) AS rn " +
           "  FROM data_dulieukhach d " +
           "  WHERE d.\"Ngay_thang\" >= :fromDate " +
           "    AND d.status NOT IN ('uu_tien', 'da_chot_don') " +
           "    AND d.kho_noi_claimed_by IS NULL " +
           "    AND d.\"Sale\" IS NOT NULL AND TRIM(d.\"Sale\") <> '' " +
           "    AND d.\"Sdt\" IS NOT NULL AND TRIM(d.\"Sdt\") <> '' " +
           ") " +
           "SELECT r.id, r.\"Ngay_thang\", r.\"Khach_hang\", r.\"Sdt\", r.\"Sale\", r.\"Mess\", r.\"Uid\", r.ad_id, r.\"ID Trang\", r.\"Page\", r.loai_mess, r.assigned_from, r.status, r.created_at, r.kho_noi_claimed_by, r.kho_noi_claimed_at, r.from_kho_noi " +
           "FROM ranked r, sale_count s " +
           "WHERE r.rn <= GREATEST(1, CEIL(100.0 / GREATEST(s.cnt, 1))) " +
           "ORDER BY RANDOM() " +
           "LIMIT 100",
           nativeQuery = true)
    List<KhachHang> findKhoSoNoiPool(@Param("fromDate") LocalDate fromDate);

    // Thống kê số lượng đã nhận từ kho nổi theo từng sale trong ngày hôm nay (cho admin)
    @Query(value = "SELECT kho_noi_claimed_by AS sale, COUNT(*) AS claimed " +
           "FROM data_dulieukhach " +
           "WHERE kho_noi_claimed_by IS NOT NULL AND kho_noi_claimed_by <> '' " +
           "AND kho_noi_claimed_at >= :startOfDay " +
           "GROUP BY kho_noi_claimed_by " +
           "ORDER BY claimed DESC",
           nativeQuery = true)
    List<Object[]> findKhoNoiClaimStats(@Param("startOfDay") java.time.OffsetDateTime startOfDay);

    // Đếm số số đã nhận từ kho nổi bởi 1 sale trong ngày hôm nay
    @Query(value = "SELECT COUNT(*) FROM data_dulieukhach " +
           "WHERE kho_noi_claimed_by = CAST(:sale AS text) " +
           "AND kho_noi_claimed_at >= :startOfDay",
           nativeQuery = true)
    long countClaimedByUserToday(@Param("sale") String sale, @Param("startOfDay") java.time.OffsetDateTime startOfDay);

    // Trả số về kho nổi nếu quá 7 ngày chưa chuyển sang uu_tien hoặc da_chot_don
    @Modifying
    @Query(value = "UPDATE data_dulieukhach " +
           "SET \"Sale\" = assigned_from, " +
           "    assigned_from = NULL, " +
           "    status = 'moi', " +
           "    kho_noi_claimed_by = NULL, " +
           "    kho_noi_claimed_at = NULL " +
           "WHERE from_kho_noi = TRUE " +
           "  AND kho_noi_claimed_by IS NOT NULL " +
           "  AND kho_noi_claimed_at <= :expiredBefore " +
           "  AND status NOT IN ('uu_tien', 'da_chot_don') " +
           "  AND assigned_from IS NOT NULL AND assigned_from <> ''",
           nativeQuery = true)
    int returnExpiredKhoNoiToPool(@Param("expiredBefore") java.time.OffsetDateTime expiredBefore);

    // Lấy tất cả khách hàng theo ngày có SĐT (dùng cho auto sync Zalo)
    @Query(value = "SELECT * FROM data_dulieukhach WHERE \"Ngay_thang\" = :date AND \"Sdt\" IS NOT NULL AND \"Sdt\" <> ''",
           nativeQuery = true)
    List<KhachHang> findByDateWithPhone(@Param("date") LocalDate date);
}
