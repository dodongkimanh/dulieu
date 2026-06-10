package com.kimanh.crm.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kimanh.crm.entity.KhachHang;
import com.kimanh.crm.entity.User;
import com.kimanh.crm.entity.ZaloContact;
import com.kimanh.crm.repository.KhachHangRepository;
import com.kimanh.crm.repository.UserRepository;
import com.kimanh.crm.service.ZaloContactService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class ZaloAutoSyncScheduler {

    private final KhachHangRepository khachHangRepository;
    private final UserRepository userRepository;
    private final ZaloContactService zaloContactService;
    private final HttpClient httpClient;
    private final String zaloServiceUrl;
    private final ObjectMapper objectMapper;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public ZaloAutoSyncScheduler(
            KhachHangRepository khachHangRepository,
            UserRepository userRepository,
            ZaloContactService zaloContactService,
            @Value("${zalo.service.url:http://localhost:3001}") String zaloServiceUrl,
            ObjectMapper objectMapper) {
        this.khachHangRepository = khachHangRepository;
        this.userRepository = userRepository;
        this.zaloContactService = zaloContactService;
        this.zaloServiceUrl = zaloServiceUrl.endsWith("/")
                ? zaloServiceUrl.substring(0, zaloServiceUrl.length() - 1)
                : zaloServiceUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        log.info("ZaloAutoSync scheduler khởi động → Zalo service: {}", this.zaloServiceUrl);
    }

    // Chạy lúc 00:01 mỗi ngày (timezone VN), đồng bộ Zalo cho khách hàng ngày hôm trước
    @Scheduled(cron = "0 1 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void syncYesterdayCustomers() {
        LocalDate yesterday = LocalDate.now(VN_ZONE).minusDays(1);
        log.info("ZaloAutoSync: bắt đầu đồng bộ Zalo cho ngày {}", yesterday);

        List<KhachHang> customers = khachHangRepository.findByDateWithPhone(yesterday);
        if (customers.isEmpty()) {
            log.info("ZaloAutoSync: không có khách hàng nào ngày {}", yesterday);
            return;
        }

        // fullName → username map để xác định sessionId từ tên sale
        Map<String, String> nameToUsername = userRepository.findAll().stream()
                .filter(u -> u.getFullName() != null)
                .collect(Collectors.toMap(
                        u -> normalizeStr(u.getFullName()),
                        User::getUsername,
                        (a, b) -> a
                ));

        List<ZaloContact> batch = new ArrayList<>();
        int found = 0;

        for (KhachHang customer : customers) {
            String sessionId = resolveSessionId(customer, nameToUsername);
            try {
                String url = zaloServiceUrl + "/search?session=" +
                        URLEncoder.encode(sessionId, StandardCharsets.UTF_8) +
                        "&q=" + URLEncoder.encode(customer.getSdt(), StandardCharsets.UTF_8);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(15))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) continue;

                JsonNode contacts = objectMapper.readTree(response.body());
                if (!contacts.isArray() || contacts.isEmpty()) continue;

                JsonNode first = contacts.get(0);
                ZaloContact contact = new ZaloContact();
                contact.setKhachHangId(customer.getId());
                contact.setSessionId(sessionId);
                contact.setZaloId(nullIfBlank(first.path("id").asText(null)));
                contact.setDisplayName(nullIfBlank(first.path("name").asText(null)));
                contact.setAvatar(nullIfBlank(first.path("avatar").asText(null)));
                batch.add(contact);
                found++;
            } catch (Exception e) {
                log.debug("ZaloAutoSync: lỗi khách {} ({}): {}", customer.getId(), customer.getSdt(), e.getMessage());
            }
        }

        if (!batch.isEmpty()) {
            zaloContactService.upsertBatch(batch);
        }

        log.info("ZaloAutoSync: hoàn tất ngày {} — tìm thấy {}/{} khách hàng trên Zalo",
                yesterday, found, customers.size());
    }

    private String resolveSessionId(KhachHang customer, Map<String, String> nameToUsername) {
        if (customer.getSale() != null && !customer.getSale().isBlank()) {
            String username = nameToUsername.get(normalizeStr(customer.getSale()));
            if (username != null) return username;
            return customer.getSale().trim();
        }
        return "default";
    }

    private static String normalizeStr(String s) {
        return s == null ? "" : s.replaceAll("\\s+", " ").trim();
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
