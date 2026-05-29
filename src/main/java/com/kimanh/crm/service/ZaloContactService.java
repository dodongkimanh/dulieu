package com.kimanh.crm.service;

import com.kimanh.crm.entity.ZaloContact;
import com.kimanh.crm.repository.ZaloContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ZaloContactService {

    private final ZaloContactRepository repo;
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public List<ZaloContact> findByKhachHangIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return repo.findByKhachHangIdIn(ids);
    }

    @Transactional
    public void upsertBatch(List<ZaloContact> contacts) {
        for (ZaloContact c : contacts) {
            repo.findByKhachHangIdAndSessionId(c.getKhachHangId(), c.getSessionId())
                .ifPresentOrElse(existing -> {
                    existing.setZaloId(c.getZaloId());
                    existing.setDisplayName(c.getDisplayName());
                    existing.setAvatar(c.getAvatar());
                    existing.setSyncedAt(OffsetDateTime.now(VN_ZONE));
                    repo.save(existing);
                }, () -> {
                    c.setSyncedAt(OffsetDateTime.now(VN_ZONE));
                    repo.save(c);
                });
        }
    }
}
