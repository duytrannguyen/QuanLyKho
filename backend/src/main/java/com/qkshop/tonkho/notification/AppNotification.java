package com.qkshop.tonkho.notification;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông báo hệ thống và đồng bộ thời gian thực.
 */
@Entity
@Table(name = "app_notifications", indexes = {
    @Index(name = "idx_noti_created", columnList = "created_at"),
    @Index(name = "idx_noti_read", columnList = "is_read")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(length = 50)
    @Builder.Default
    private String type = "INFO"; // SYNC_SUCCESS, SYNC_ERROR, SYNC_INFO, ISSUE_ALERT, INVENTORY, SYSTEM

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(length = 255)
    private String link;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
