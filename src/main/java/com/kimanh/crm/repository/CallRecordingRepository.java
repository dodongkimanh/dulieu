package com.kimanh.crm.repository;

import com.kimanh.crm.entity.CallRecording;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

public interface CallRecordingRepository extends JpaRepository<CallRecording, Long> {
    List<CallRecording> findByKhachHangIdOrderByRecordedAtDesc(Long khachHangId);
    void deleteByKhachHangId(Long khachHangId);

    @Query("SELECT r.khachHangId AS khachHangId, COUNT(r) AS count FROM CallRecording r WHERE r.khachHangId IN :ids GROUP BY r.khachHangId")
    List<Map<String, Object>> countByKhachHangIds(@Param("ids") List<Long> ids);
}
