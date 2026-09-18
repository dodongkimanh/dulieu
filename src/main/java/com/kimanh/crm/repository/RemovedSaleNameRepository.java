package com.kimanh.crm.repository;

import com.kimanh.crm.entity.RemovedSaleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RemovedSaleNameRepository extends JpaRepository<RemovedSaleName, Long> {
    boolean existsByFullName(String fullName);
    List<RemovedSaleName> findAll();
}
