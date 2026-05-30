package com.kimanh.crm.controller;

import com.kimanh.crm.service.ZaloChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/zalo-chat")
@RequiredArgsConstructor
public class ZaloChatController {

    private final ZaloChatService service;

    /** Danh bạ của một tài khoản Zalo, load từ Supabase (nhanh, không cần quét DOM) */
    @GetMapping("/contacts")
    public ResponseEntity<Map<String, Object>> getContacts(
        @RequestParam String session,
        @RequestParam(defaultValue = "") String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "1000") int size
    ) {
        return ResponseEntity.ok(service.getContacts(session, search, page, size));
    }

    /** Tìm conversationId từ zaloUid để load tin nhắn */
    @GetMapping("/conversation")
    public ResponseEntity<Map<String, Object>> findConversation(
        @RequestParam String session,
        @RequestParam String uid
    ) {
        return ResponseEntity.ok(service.findConversationByUid(session, uid));
    }

    /** Danh sách các tài khoản Zalo đang lưu tin nhắn */
    @GetMapping("/sessions")
    public List<Map<String, Object>> getSessions() {
        return service.getSessions();
    }

    /** Hộp thư đến: danh sách cuộc hội thoại theo tài khoản Zalo, sắp xếp mới nhất trước */
    @GetMapping("/inbox")
    public ResponseEntity<Map<String, Object>> getInbox(
        @RequestParam String session,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "30") int size
    ) {
        return ResponseEntity.ok(service.getInbox(session, page, size));
    }

    /** Tin nhắn trong một cuộc hội thoại, sắp xếp theo thứ tự thời gian tăng dần */
    @GetMapping("/messages/{conversationId}")
    public ResponseEntity<Map<String, Object>> getMessages(
        @PathVariable Long conversationId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(service.getMessages(conversationId, page, size));
    }
}
