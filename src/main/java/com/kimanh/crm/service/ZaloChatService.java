package com.kimanh.crm.service;

import com.kimanh.crm.entity.ZaloChatContact;
import com.kimanh.crm.entity.ZaloChatMessage;
import com.kimanh.crm.repository.ZaloChatContactRepository;
import com.kimanh.crm.repository.ZaloChatConversationRepository;
import com.kimanh.crm.repository.ZaloChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ZaloChatService {

    private final ZaloChatContactRepository contactRepo;
    private final ZaloChatConversationRepository convRepo;
    private final ZaloChatMessageRepository messageRepo;

    public List<Map<String, Object>> getSessions() {
        List<Object[]> rows = contactRepo.findDistinctSessions();
        Set<String> seen = new LinkedHashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            String sessionId = (String) row[0];
            if (seen.add(sessionId)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("sessionId", sessionId);
                m.put("contactCount", ((Number) row[1]).longValue());
                m.put("lastActivity", row[2]);
                result.add(m);
            }
        }
        return result;
    }

    public Map<String, Object> getInbox(String sessionId, int page, int size) {
        Page<Object[]> rows = convRepo.findInboxBySession(sessionId, PageRequest.of(page, size));
        List<Map<String, Object>> content = new ArrayList<>();
        for (Object[] row : rows.getContent()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("conversationId", ((Number) row[0]).longValue());
            m.put("contactId",      ((Number) row[1]).longValue());
            m.put("zaloUid",        row[2]);
            m.put("contactName",    row[3]);
            m.put("avatar",         row[4]);
            m.put("lastMessage",    row[5]);
            m.put("updatedAt",      row[6]);
            content.add(m);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", content);
        result.put("totalElements", rows.getTotalElements());
        result.put("totalPages", rows.getTotalPages());
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    public Map<String, Object> getContacts(String sessionId, String search, int page, int size) {
        Page<ZaloChatContact> contactPage = contactRepo.findBySessionWithSearch(
            sessionId, search, PageRequest.of(page, size, Sort.by("name").ascending())
        );
        List<Map<String, Object>> content = new ArrayList<>();
        for (ZaloChatContact c : contactPage.getContent()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",       c.getId());
            m.put("zaloUid",  c.getZaloUid());
            m.put("name",     c.getName());
            m.put("avatar",   c.getAvatar());
            content.add(m);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", contactPage.getTotalElements());
        result.put("totalPages",    contactPage.getTotalPages());
        result.put("page",          page);
        result.put("size",          size);
        return result;
    }

    public Map<String, Object> findConversationByUid(String sessionId, String uid) {
        Optional<Long> convId = convRepo.findConversationIdByUid(sessionId, uid);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("conversationId", convId.orElse(null));
        result.put("found", convId.isPresent());
        return result;
    }

    public Map<String, Object> getMessages(Long conversationId, int page, int size) {
        Page<ZaloChatMessage> msgPage = messageRepo.findByConversationIdOrderByTimestampAsc(
            conversationId, PageRequest.of(page, size)
        );
        List<Map<String, Object>> content = new ArrayList<>();
        for (ZaloChatMessage msg : msgPage.getContent()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",         msg.getId());
            m.put("senderId",   msg.getSenderId());
            m.put("text",       msg.getText());
            m.put("type",       msg.getType());
            m.put("timestamp",  msg.getTimestamp());
            m.put("isSelf",     msg.getIsSelf());
            m.put("imageUrl",   msg.getImageUrl());
            m.put("callInfo",   msg.getCallInfo());
            content.add(m);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", content);
        result.put("totalElements", msgPage.getTotalElements());
        result.put("totalPages", msgPage.getTotalPages());
        result.put("page", page);
        result.put("size", size);
        return result;
    }
}
