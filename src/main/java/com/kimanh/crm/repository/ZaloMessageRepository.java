package com.kimanh.crm.repository;

import com.kimanh.crm.entity.ZaloMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ZaloMessageRepository extends JpaRepository<ZaloMessage, Long> {

    List<ZaloMessage> findByKhachHangIdOrderBySentAtAsc(Long khachHangId);

    List<ZaloMessage> findByContactIdOrderBySentAtAsc(Long contactId);

    void deleteByKhachHangId(Long khachHangId);
}
