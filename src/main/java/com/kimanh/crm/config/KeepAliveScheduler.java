package com.kimanh.crm.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Self-ping to prevent Render free tier from spinning down.
 * Pings the app's own public URL through Render's reverse proxy,
 * which counts as incoming HTTP traffic.
 */
@Slf4j
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.keep-alive.enabled", havingValue = "true")
public class KeepAliveScheduler {

    private final HttpClient httpClient;
    private final String healthUrl;

    public KeepAliveScheduler(@Value("${app.keep-alive.url}") String publicUrl) {
        String base = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        this.healthUrl = base + "/api/health";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        log.info("KeepAlive scheduler active → pinging {}", this.healthUrl);
    }

    @Scheduled(fixedDelay = 240_000, initialDelay = 120_000)
    public void keepAlive() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(healthUrl))
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.debug("Keep-alive ping: HTTP {}", response.statusCode());
        } catch (Exception e) {
            log.warn("Keep-alive ping failed: {}", e.getMessage());
        }
    }
}
