package com.kimanh.crm.config;

import com.kimanh.crm.repository.KhachHangRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
@Slf4j
public class KhoSoNoiScheduler {

    private final KhachHangRepository khachHangRepository;

    // Chạy lúc 00:05 sáng mỗi ngày (timezone VN)
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void returnExpiredClaimsToPool() {
        OffsetDateTime expiredBefore = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(7);
        int count = khachHangRepository.returnExpiredKhoNoiToPool(expiredBefore);
        if (count > 0) {
            log.info("KhoSoNoi: trả {} số về kho do quá 7 ngày chưa chuyển trạng thái", count);
        }
    }
}
