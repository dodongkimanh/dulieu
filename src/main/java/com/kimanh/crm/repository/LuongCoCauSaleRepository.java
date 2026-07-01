package com.kimanh.crm.repository;

import com.kimanh.crm.entity.LuongCoCauSale;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LuongCoCauSaleRepository extends JpaRepository<LuongCoCauSale, Long> {
    List<LuongCoCauSale> findAllByOrderByThuTuAsc();
}
