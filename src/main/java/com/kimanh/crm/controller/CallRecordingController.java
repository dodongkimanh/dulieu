package com.kimanh.crm.controller;

import com.kimanh.crm.entity.CallRecording;
import com.kimanh.crm.service.CallRecordingService;
import com.kimanh.crm.service.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/call-recordings")
@RequiredArgsConstructor
public class CallRecordingController {

    private final CallRecordingService recordingService;
    private final SupabaseStorageService storageService;

    @GetMapping
    public ResponseEntity<List<CallRecording>> getRecordings(
            @RequestParam Long khachHangId) {
        return ResponseEntity.ok(recordingService.getByKhachHang(khachHangId));
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<Long, Long>> getCounts(@RequestParam List<Long> ids) {
        return ResponseEntity.ok(recordingService.countByKhachHangIds(ids));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadRecording(
            @RequestParam("file") MultipartFile file,
            @RequestParam("khachHangId") Long khachHangId,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds) {
        try {
            String url = storageService.uploadRecording(file, khachHangId);

            CallRecording recording = CallRecording.builder()
                    .khachHangId(khachHangId)
                    .fileUrl(url)
                    .fileName(file.getOriginalFilename())
                    .fileSize(file.getSize())
                    .durationSeconds(durationSeconds)
                    .note(note)
                    .build();

            CallRecording saved = recordingService.save(recording);
            return ResponseEntity.ok(Map.of("recording", saved, "fileUrl", url));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        recordingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
