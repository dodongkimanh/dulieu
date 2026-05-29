package com.kimanh.crm.controller;

import com.kimanh.crm.entity.KenhTiepThi;
import com.kimanh.crm.service.KenhTiepThiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kenh-tiep-thi")
@RequiredArgsConstructor
public class KenhTiepThiController {

    private final KenhTiepThiService service;

    @GetMapping
    public List<KenhTiepThi> getAll() {
        return service.findAll();
    }

    @GetMapping("/active")
    public List<KenhTiepThi> getActive() {
        return service.findAllActive();
    }

    @GetMapping("/grouped")
    public Map<String, List<Map<String, Object>>> getGrouped() {
        return service.getGroupedChannels();
    }

    @GetMapping("/flat")
    public List<String> getFlat() {
        return service.getFlatNames();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public KenhTiepThi create(@RequestBody KenhTiepThi entity) {
        return service.create(entity);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public KenhTiepThi update(@PathVariable Long id, @RequestBody KenhTiepThi entity) {
        return service.update(id, entity);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
