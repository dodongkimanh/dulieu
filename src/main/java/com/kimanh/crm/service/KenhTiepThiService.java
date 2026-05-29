package com.kimanh.crm.service;

import com.kimanh.crm.entity.KenhTiepThi;
import com.kimanh.crm.repository.KenhTiepThiRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KenhTiepThiService {

    private final KenhTiepThiRepository repository;

    public List<KenhTiepThi> findAllActive() {
        return repository.findByActiveTrueOrderByCategoryAscSortOrderAscNameAsc();
    }

    public List<KenhTiepThi> findAll() {
        return repository.findAll();
    }

    public Map<String, List<Map<String, Object>>> getGroupedChannels() {
        List<KenhTiepThi> channels = findAllActive();
        Map<String, List<Map<String, Object>>> grouped = new LinkedHashMap<>();
        for (KenhTiepThi ch : channels) {
            grouped.computeIfAbsent(ch.getCategory(), k -> new ArrayList<>())
                    .add(Map.of("id", ch.getId(), "name", ch.getName()));
        }
        return grouped;
    }

    public List<String> getFlatNames() {
        return findAllActive().stream()
                .map(KenhTiepThi::getName)
                .collect(Collectors.toList());
    }

    public KenhTiepThi create(KenhTiepThi entity) {
        return repository.save(entity);
    }

    public KenhTiepThi update(Long id, KenhTiepThi data) {
        KenhTiepThi existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kênh tiếp thị không tồn tại: " + id));
        existing.setName(data.getName());
        existing.setCategory(data.getCategory());
        existing.setSortOrder(data.getSortOrder());
        existing.setActive(data.getActive());
        return repository.save(existing);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public void seedDefaults() {
        if (repository.count() > 0) return;

        List<KenhTiepThi> defaults = new ArrayList<>();
        int order = 0;

        // KÊNH GIAO TIẾP
        for (String name : List.of("Khách Zalo", "Hotline", "Khách cũ, khách giới thiệu, tìm kiếm", "Kh Showroom")) {
            defaults.add(KenhTiepThi.builder().name(name).category("KÊNH GIAO TIẾP").sortOrder(order++).build());
        }

        // CÁC XƯỞNG/SHOWROOM
        order = 0;
        for (String name : List.of(
                "Tranh Đồng Kim Ánh Nam Định(576414695535724)",
                "Xưởng Chế Tác Đồ Thờ Kim Ánh(516517308218764)",
                "Kim Ánh Đúc Đỉnh Đồng Nam Định(560584423798299)",
                "Xưởng Đúc Đồng Kim Ánh(647496405105905)",
                "Xưởng Đồng Gia Truyền Nam Định(101435218182393)",
                "Xưởng Đúc Đồng Gia Truyền Kim Ánh(579540361901590)",
                "Đúc Đỉnh Thờ Kim Ánh(576614052193406)",
                "Kim Ánh Đỉnh Đồng Nam Định(585239897998547)",
                "Xưởng Đồng Kim Ánh(530886750113441)",
                "Xưởng Đúc Đồng Kim Ánh Gia Truyền Nam Định(567376346452543)",
                "Đúc Đồng Làng Nghề Truyền Thống Nam Định(578286328693026)",
                "Xưởng Đúc Đồng Nam Định(134583069730624)",
                "Đồ Đồng Kim Ánh Nam Định(110027362001260)"
        )) {
            defaults.add(KenhTiepThi.builder().name(name).category("CÁC XƯỞNG/SHOWROOM").sortOrder(order++).build());
        }

        repository.saveAll(defaults);
    }
}
