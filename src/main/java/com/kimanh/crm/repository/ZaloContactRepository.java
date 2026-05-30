package com.kimanh.crm.repository;

import com.kimanh.crm.entity.ZaloContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ZaloContactRepository extends JpaRepository<ZaloContact, Long> {

    List<ZaloContact> findByKhachHangIdIn(List<Long> khachHangIds);

    Optional<ZaloContact> findByKhachHangIdAndSessionId(Long khachHangId, String sessionId);

    Optional<ZaloContact> findBySessionIdAndZaloId(String sessionId, String zaloId);
}
