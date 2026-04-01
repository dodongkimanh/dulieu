package com.kimanh.crm.service;

import com.kimanh.crm.entity.MessConfig;
import com.kimanh.crm.repository.MessConfigRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class MessConfigService {

    private final MessConfigRepository repository;
    private final ObjectMapper objectMapper;

    // Default tiers (used when no DB config exists)
    private static final String DEFAULT_TIERS_JSON = "[" +
        "{\"min\":0,\"max\":49999999,\"budget\":6000000,\"label\":\"< 50 triệu\"}," +
        "{\"min\":50000000,\"max\":74999999,\"budget\":9000000,\"label\":\"50 triệu ≤ 75 triệu\"}," +
        "{\"min\":75000000,\"max\":99999999,\"budget\":12000000,\"label\":\"75 triệu ≤ 100 triệu\"}," +
        "{\"min\":100000000,\"max\":124999999,\"budget\":15000000,\"label\":\"100 triệu ≤ 125 triệu\"}," +
        "{\"min\":125000000,\"max\":149999999,\"budget\":18000000,\"label\":\"125 triệu ≤ 150 triệu\"}," +
        "{\"min\":150000000,\"max\":174999999,\"budget\":21000000,\"label\":\"150 triệu ≤ 175 triệu\"}," +
        "{\"min\":175000000,\"max\":199999999,\"budget\":24000000,\"label\":\"175 triệu ≤ 200 triệu\"}," +
        "{\"min\":200000000,\"max\":249999999,\"budget\":30000000,\"label\":\"200 triệu ≤ 250 triệu\"}," +
        "{\"min\":250000000,\"max\":299999999,\"budget\":36000000,\"label\":\"250 triệu ≤ 300 triệu\"}," +
        "{\"min\":300000000,\"max\":349999999,\"budget\":42000000,\"label\":\"300 triệu ≤ 350 triệu\"}," +
        "{\"min\":350000000,\"max\":399999999,\"budget\":48000000,\"label\":\"350 triệu ≤ 400 triệu\"}," +
        "{\"min\":400000000,\"max\":449999999,\"budget\":54000000,\"label\":\"400 triệu ≤ 450 triệu\"}," +
        "{\"min\":450000000,\"max\":499999999,\"budget\":60000000,\"label\":\"450 triệu ≤ 500 triệu\"}," +
        "{\"min\":500000000,\"max\":999999999999,\"budget\":64000000,\"label\":\"DS > 500 triệu\"}" +
    "]";

    public long getCostPerMess() {
        return repository.findByConfigKey("COST_PER_MESS")
                .map(c -> Long.parseLong(c.getConfigValue()))
                .orElse(65000L);
    }

    public Map<String, Object> getConfig() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("costPerMess", getCostPerMess());
        result.put("tiers", getMessTiers());
        return result;
    }

    public List<Map<String, Object>> getMessTiers() {
        try {
            String json = repository.findByConfigKey("MESS_TIERS")
                    .map(MessConfig::getConfigValue)
                    .orElse(DEFAULT_TIERS_JSON);
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            try {
                return objectMapper.readValue(DEFAULT_TIERS_JSON, new TypeReference<>() {});
            } catch (Exception ex) {
                return new ArrayList<>();
            }
        }
    }

    public int calculateMessAllocation(long qualifiedRevenue) {
        long costPerMess = getCostPerMess();
        List<Map<String, Object>> tiers = getMessTiers();
        for (Map<String, Object> tier : tiers) {
            long min = ((Number) tier.get("min")).longValue();
            long max = ((Number) tier.get("max")).longValue();
            long budget = ((Number) tier.get("budget")).longValue();
            if (qualifiedRevenue >= min && qualifiedRevenue <= max) {
                return (int) (budget / costPerMess);
            }
        }
        // Fallback: use last tier
        if (!tiers.isEmpty()) {
            long budget = ((Number) tiers.get(tiers.size() - 1).get("budget")).longValue();
            return (int) (budget / costPerMess);
        }
        return 92;
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
        result.put("tiers", getMessTiers());
        return result;
    }

    public Map<String, Object> updateMessTiers(List<Map<String, Object>> tiers) {
        try {
            String json = objectMapper.writeValueAsString(tiers);
            MessConfig config = repository.findByConfigKey("MESS_TIERS")
                    .orElseGet(() -> {
                        MessConfig c = new MessConfig();
                        c.setConfigKey("MESS_TIERS");
                        c.setDescription("Bảng mốc mess theo doanh số (JSON)");
                        return c;
                    });
            config.setConfigValue(json);
            repository.save(config);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi lưu cấu hình mốc mess", e);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("costPerMess", getCostPerMess());
        result.put("tiers", getMessTiers());
        return result;
    }
}
