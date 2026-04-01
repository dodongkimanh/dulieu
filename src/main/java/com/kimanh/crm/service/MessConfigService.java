package com.kimanh.crm.service;

import com.kimanh.crm.entity.MessConfig;
import com.kimanh.crm.repository.MessConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
@RequiredArgsConstructor
public class MessConfigService {

    private final MessConfigRepository repository;

    public long getCostPerMess() {
        return repository.findByConfigKey("COST_PER_MESS")
                .map(c -> Long.parseLong(c.getConfigValue()))
                .orElse(65000L);
    }

    public Map<String, Object> getConfig() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("costPerMess", getCostPerMess());
        return result;
    }

    public Map<String, Object> updateCostPerMess(long cost) {
        MessConfig config = repository.findByConfigKey("COST_PER_MESS")
                .orElseGet(() -> {
                    MessConfig c = new MessConfig();
                    c.setConfigKey("COST_PER_MESS");
                    c.setDescription("Chi phí trên mỗi mess (VNĐ)");
                    return c;
                });
        config.setConfigValue(String.valueOf(cost));
        repository.save(config);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("costPerMess", cost);
        return result;
    }
}
