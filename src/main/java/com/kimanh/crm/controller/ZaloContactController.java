package com.kimanh.crm.controller;

import com.kimanh.crm.entity.ZaloContact;
import com.kimanh.crm.service.ZaloContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/zalo-contacts")
@RequiredArgsConstructor
public class ZaloContactController {

    private final ZaloContactService service;

    @GetMapping
    public List<ZaloContact> getByIds(@RequestParam(required = false) String ids) {
        if (ids == null || ids.isBlank()) return List.of();
        List<Long> idList = Arrays.stream(ids.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Long::parseLong)
            .collect(Collectors.toList());
        return service.findByKhachHangIds(idList);
    }

    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync(@RequestBody List<ZaloContact> contacts) {
        if (contacts == null || contacts.isEmpty()) {
            return ResponseEntity.ok(Map.of("saved", 0));
        }
        service.upsertBatch(contacts);
        return ResponseEntity.ok(Map.of("saved", contacts.size()));
    }
}
