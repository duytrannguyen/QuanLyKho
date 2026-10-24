package com.qkshop.tonkho.notification;

import com.qkshop.tonkho.core.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Luồng SSE nhận thông báo thời gian thực.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return notificationService.subscribe();
    }

    /**
     * Lấy danh sách thông báo (tối đa 50 thông báo gần nhất hoặc lọc chỉ chưa đọc).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AppNotification>>> getNotifications(
            @RequestParam(required = false, defaultValue = "false") Boolean unreadOnly) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getNotifications(unreadOnly)));
    }

    /**
     * Lấy số lượng thông báo chưa đọc.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    /**
     * Đánh dấu 1 thông báo là đã đọc.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<AppNotification>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã đánh dấu thông báo là đã đọc",
                notificationService.markAsRead(id)));
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc.
     */
    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAllAsRead() {
        int updated = notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã đánh dấu tất cả thông báo là đã đọc",
                Map.of("updatedCount", updated)));
    }

    /**
     * Xóa 1 thông báo (chỉ cho phép xóa nếu đã đọc).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xóa thông báo thành công", null));
    }

    /**
     * Xóa tất cả các thông báo đã đọc.
     */
    @DeleteMapping("/read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAllRead() {
        int deleted = notificationService.deleteAllRead();
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xóa " + deleted + " thông báo đã đọc thành công",
                Map.of("deletedCount", deleted)));
    }

    /**
     * API tạo thông báo thử nghiệm (hỗ trợ kiểm thử thời gian thực).
     */
    @PostMapping("/test")
    public ResponseEntity<ApiResponse<AppNotification>> createTestNotification(
            @RequestBody Map<String, String> payload) {
        String title = payload.getOrDefault("title", "Thông báo thử nghiệm");
        String message = payload.getOrDefault("message", "Nội dung thông báo thời gian thực từ hệ thống QKShop.");
        String type = payload.getOrDefault("type", "SYNC_INFO");
        String link = payload.getOrDefault("link", "/doi-soat");
        return ResponseEntity.ok(ApiResponse.okWithMessage("Tạo thông báo thành công",
                notificationService.sendNotification(title, message, type, link)));
    }
}
