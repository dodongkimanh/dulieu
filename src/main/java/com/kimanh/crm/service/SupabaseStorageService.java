package com.kimanh.crm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class SupabaseStorageService {

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-key:}")
    private String serviceKey;

    private static final String BUCKET = "zalo-media";

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isConfigured() {
        return supabaseUrl != null && !supabaseUrl.isBlank()
            && serviceKey != null && !serviceKey.isBlank();
    }

    /**
     * Uploads a file to Supabase Storage bucket "zalo-media".
     * Returns the public URL of the uploaded file.
     */
    public String upload(MultipartFile file, Long khachHangId) throws IOException {
        if (!isConfigured()) {
            throw new RuntimeException("Supabase Storage chưa được cấu hình (SUPABASE_URL / SUPABASE_SERVICE_KEY)");
        }

        String ext = getExtension(file.getOriginalFilename());
        String path = "kh-" + khachHangId + "/" + UUID.randomUUID() + ext;
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + BUCKET + "/" + path;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + serviceKey);
        headers.setContentType(MediaType.parseMediaType(
            file.getContentType() != null ? file.getContentType() : "application/octet-stream"
        ));
        headers.set("x-upsert", "true");

        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
        try {
            restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            log.error("Supabase Storage upload failed: {}", e.getMessage());
            throw new RuntimeException("Upload lên Supabase Storage thất bại: " + e.getMessage());
        }

        return supabaseUrl + "/storage/v1/object/public/" + BUCKET + "/" + path;
    }

    /**
     * Uploads an audio recording to Supabase Storage under recordings/kh-{id}/.
     * Returns the public URL of the uploaded file.
     */
    public String uploadRecording(MultipartFile file, Long khachHangId) throws IOException {
        if (!isConfigured()) {
            throw new RuntimeException("Supabase Storage chưa được cấu hình (SUPABASE_URL / SUPABASE_SERVICE_KEY)");
        }

        String ext = getExtension(file.getOriginalFilename());
        String path = "recordings/kh-" + khachHangId + "/" + UUID.randomUUID() + ext;
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + BUCKET + "/" + path;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + serviceKey);
        headers.setContentType(MediaType.parseMediaType(
            file.getContentType() != null ? file.getContentType() : "audio/mpeg"
        ));
        headers.set("x-upsert", "true");

        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
        try {
            restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            log.error("Supabase Storage recording upload failed: {}", e.getMessage());
            throw new RuntimeException("Upload bản ghi âm lên Supabase Storage thất bại: " + e.getMessage());
        }

        return supabaseUrl + "/storage/v1/object/public/" + BUCKET + "/" + path;
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
