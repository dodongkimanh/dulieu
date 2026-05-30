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
            // Ưu tiên tìm theo (sessionId, zaloId): tránh map cùng 1 Zalo user vào 2 khách khác nhau
            boolean hasZaloId = c.getZaloId() != null && !c.getZaloId().isBlank();
            java.util.Optional<ZaloContact> existing = hasZaloId
                ? repo.findBySessionIdAndZaloId(c.getSessionId(), c.getZaloId())
                : repo.findByKhachHangIdAndSessionId(c.getKhachHangId(), c.getSessionId());

            // Fallback: nếu không tìm thấy theo zaloId, thử theo khachHangId+sessionId
            if (existing.isEmpty() && hasZaloId) {
                existing = repo.findByKhachHangIdAndSessionId(c.getKhachHangId(), c.getSessionId());
            }

            existing.ifPresentOrElse(e -> {
                e.setKhachHangId(c.getKhachHangId());
                e.setZaloId(c.getZaloId());
                e.setDisplayName(c.getDisplayName());
                e.setAvatar(c.getAvatar());
                e.setSyncedAt(OffsetDateTime.now(VN_ZONE));
                repo.save(e);
            }, () -> {
                c.setSyncedAt(OffsetDateTime.now(VN_ZONE));
                repo.save(c);
            });
        }
    }
}
