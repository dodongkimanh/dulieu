package com.kimanh.crm.repository;

import com.kimanh.crm.entity.KhachHang;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface KhachHangRepository extends JpaRepository<KhachHang, Long> {

    @Query(value = "SELECT k.* FROM public.data_dulieukhach k WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(k.khach_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.uid) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:status AS text) IS NULL OR k.status = CAST(:status AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR k.page = CAST(:page AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR k.sale = CAST(:sale AS text)) " +
           "ORDER BY k.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM public.data_dulieukhach k WHERE " +
           "(CAST(:keyword AS text) IS NULL OR LOWER(k.khach_hang) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.sdt) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%')) " +
           "OR LOWER(k.uid) LIKE LOWER(CONCAT('%',CAST(:keyword AS text),'%'))) " +
           "AND (CAST(:status AS text) IS NULL OR k.status = CAST(:status AS text)) " +
           "AND (CAST(:page AS text) IS NULL OR k.page = CAST(:page AS text)) " +
           "AND (CAST(:sale AS text) IS NULL OR k.sale = CAST(:sale AS text))",
           nativeQuery = true)
    Page<KhachHang> findWithFilters(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("page") String page,
            @Param("sale") String sale,
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
}
