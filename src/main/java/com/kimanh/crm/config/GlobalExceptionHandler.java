package com.kimanh.crm.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.sql.SQLException;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        // Log DB connection errors for monitoring
        if (isDbConnectionError(ex)) {
            log.error("Database connection error detected: {}", ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Hệ thống đang kết nối lại cơ sở dữ liệu, vui lòng thử lại sau vài giây."));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        if (isDbConnectionError(ex)) {
            log.error("Database connection error detected: {}", ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Hệ thống đang kết nối lại cơ sở dữ liệu, vui lòng thử lại sau vài giây."));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Lỗi hệ thống: " + ex.getMessage()));
    }

    private boolean isDbConnectionError(Throwable ex) {
        Throwable cause = ex;
        while (cause != null) {
            String msg = cause.getMessage();
            if (msg != null) {
                String lower = msg.toLowerCase();
                if (lower.contains("connection") && (lower.contains("closed") || lower.contains("refused") || lower.contains("timed out") || lower.contains("reset"))
                    || lower.contains("hikaripool") || lower.contains("unable to acquire")
                    || cause instanceof SQLException) {
                    return true;
                }
            }
            cause = cause.getCause();
        }
        return false;
    }
}
