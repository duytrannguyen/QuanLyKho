package com.qkshop.tonkho.core.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Response envelope chuẩn theo Blueprint §6.3.
 * Mọi API đều trả cùng cấu trúc.
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private String requestId;
    private T data;

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    private String errorCode;
    private String userMessage;
    private boolean retryable;
    private LocalDateTime freshnessAt;

    // --- Factory methods ---

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> ok(T data, String requestId) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .requestId(requestId)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    /**
     * Factory with user message: okWithMessage("message", data).
     * userMessage dùng để hiển thị toast trên UI.
     */
    public static <T> ApiResponse<T> okWithMessage(String userMessage, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .userMessage(userMessage)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> okWithWarnings(T data, String requestId, List<String> warnings) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .requestId(requestId)
                .warnings(warnings)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String errorCode, String userMessage) {
        return ApiResponse.<T>builder()
                .success(false)
                .errorCode(errorCode)
                .userMessage(userMessage)
                .retryable(false)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String errorCode, String userMessage, String requestId) {
        return ApiResponse.<T>builder()
                .success(false)
                .errorCode(errorCode)
                .userMessage(userMessage)
                .requestId(requestId)
                .retryable(false)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> retryableError(String errorCode, String userMessage, String requestId) {
        return ApiResponse.<T>builder()
                .success(false)
                .errorCode(errorCode)
                .userMessage(userMessage)
                .requestId(requestId)
                .retryable(true)
                .freshnessAt(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> idempotentReplay(T data, String requestId) {
        List<String> warnings = new ArrayList<>();
        warnings.add("Yêu cầu này đã được xử lý trước đó. Kết quả trả về từ lần xử lý đầu tiên.");
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .requestId(requestId)
                .warnings(warnings)
                .freshnessAt(LocalDateTime.now())
                .build();
    }
}
