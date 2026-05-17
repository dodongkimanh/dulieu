package com.kimanh.crm.service;

import com.kimanh.crm.entity.CallRecording;
import com.kimanh.crm.repository.CallRecordingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
}
