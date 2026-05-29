package com.kimanh.crm.controller;

import com.kimanh.crm.entity.ZaloMessage;
import com.kimanh.crm.service.SupabaseStorageService;
import com.kimanh.crm.service.ZaloMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/zalo-messages")
@RequiredArgsConstructor
public class ZaloMessageController {

    private final ZaloMessageService messageService;
    private final SupabaseStorageService storageService;

    /** Lấy lịch sử tin nhắn của 1 khách hàng */
    @GetMapping
    public ResponseEntity<List<ZaloMessage>> getMessages(
            @RequestParam(required = false) Long khachHangId,
            @RequestParam(required = false) Long contactId) {
        if (contactId != null) {
            return ResponseEntity.ok(messageService.getByContact(contactId));
        }
        if (khachHangId != null) {
            return ResponseEntity.ok(messageService.getByKhachHang(khachHangId));
        }
        return ResponseEntity.ok(List.of());
    }

    /** Lưu tin nhắn text */
    @PostMapping
    public ResponseEntity<ZaloMessage> addMessage(@RequestBody ZaloMessage msg) {
        if (msg.getKhachHangId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(messageService.save(msg));
    }

    /** Upload ảnh/video lên Supabase Storage, lưu URL vào zalo_messages */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam("khachHangId") Long khachHangId,
            @RequestParam(value = "contactId", required = false) Long contactId,
            @RequestParam(value = "sessionId", required = false) String sessionId,
            @RequestParam(value = "zaloId", required = false) String zaloId,
            @RequestParam(value = "sender", defaultValue = "staff") String sender) {
        try {
            String url = storageService.upload(file, khachHangId);

            String ct = file.getContentType() != null ? file.getContentType() : "";
            String msgType = ct.startsWith("image/") ? "image"
                           : ct.startsWith("video/") ? "video" : "file";

            ZaloMessage msg = ZaloMessage.builder()
                    .khachHangId(khachHangId)
                    .contactId(contactId)
                    .sessionId(sessionId)
                    .zaloId(zaloId)
                    .sender(sender)
                    .messageType(msgType)
                    .fileUrl(url)
                    .fileName(file.getOriginalFilename())
                    .fileSize(file.getSize())
                    .build();

            ZaloMessage saved = messageService.save(msg);
            return ResponseEntity.ok(Map.of("message", saved, "fileUrl", url));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** Xóa 1 tin nhắn */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        messageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
