package com.kimanh.crm.service;

import com.kimanh.crm.entity.CallRecording;
import com.kimanh.crm.repository.CallRecordingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CallRecordingService {

    private final CallRecordingRepository repo;

    public List<CallRecording> getByKhachHang(Long khachHangId) {
        return repo.findByKhachHangIdOrderByRecordedAtDesc(khachHangId);
    }

    @Transactional
    public CallRecording save(CallRecording recording) {
        return repo.save(recording);
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }

    public Map<Long, Long> countByKhachHangIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return Map.of();
        List<Map<String, Object>> rows = repo.countByKhachHangIds(ids);
        Map<Long, Long> result = new java.util.HashMap<>();
        for (Map<String, Object> row : rows) {
            Object khId = row.get("khachHangId");
            Object cnt = row.get("count");
            if (khId != null && cnt != null) {
                result.put(((Number) khId).longValue(), ((Number) cnt).longValue());
            }
        }
        return result;
    }
}
