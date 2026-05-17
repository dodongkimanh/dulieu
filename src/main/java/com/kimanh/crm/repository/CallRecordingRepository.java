package com.kimanh.crm.repository;

import com.kimanh.crm.entity.CallRecording;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CallRecordingRepository extends JpaRepository<CallRecording, Long> {
    List<CallRecording> findByKhachHangIdOrderByRecordedAtDesc(Long khachHangId);
    void deleteByKhachHangId(Long khachHangId);
}
