package com.kimanh.crm.repository;

import com.kimanh.crm.entity.BangLuongAdjust;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BangLuongAdjustRepository extends JpaRepository<BangLuongAdjust, Long> {

    Optional<BangLuongAdjust> findByNhanVienIdAndThangAndNam(Long nhanVienId, int thang, int nam);

    List<BangLuongAdjust> findByThangAndNam(int thang, int nam);
}
