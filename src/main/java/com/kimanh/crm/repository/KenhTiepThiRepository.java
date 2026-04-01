package com.kimanh.crm.repository;

import com.kimanh.crm.entity.KenhTiepThi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KenhTiepThiRepository extends JpaRepository<KenhTiepThi, Long> {

    List<KenhTiepThi> findByActiveTrueOrderByCategoryAscSortOrderAscNameAsc();

    @Query("SELECT DISTINCT k.category FROM KenhTiepThi k WHERE k.active = true ORDER BY k.category")
    List<String> findDistinctCategories();

    boolean existsByNameIgnoreCase(String name);
}
