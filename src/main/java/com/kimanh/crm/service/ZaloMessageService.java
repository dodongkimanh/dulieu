package com.kimanh.crm.service;

import com.kimanh.crm.entity.ZaloMessage;
import com.kimanh.crm.repository.ZaloMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ZaloMessageService {

    private final ZaloMessageRepository repo;
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public List<ZaloMessage> getByKhachHang(Long khachHangId) {
        return repo.findByKhachHangIdOrderBySentAtAsc(khachHangId);
    }

    public List<ZaloMessage> getByContact(Long contactId) {
        return repo.findByContactIdOrderBySentAtAsc(contactId);
    }

    @Transactional
    public ZaloMessage save(ZaloMessage msg) {
        if (msg.getSentAt() == null) msg.setSentAt(OffsetDateTime.now(VN_ZONE));
        if (msg.getCreatedAt() == null) msg.setCreatedAt(OffsetDateTime.now(VN_ZONE));
        return repo.save(msg);
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }
}
