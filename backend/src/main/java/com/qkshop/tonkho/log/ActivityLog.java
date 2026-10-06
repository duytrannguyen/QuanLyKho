package com.qkshop.tonkho.log;
import com.qkshop.tonkho.user.User;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * ActivityLog — ghi nhật ký hoạt động người dùng.
 * Không còn FK tới Machine (V1). Chỉ lưu serial_key dạng text.
 */
@Entity
@Table(name = "activity_logs", indexes = {
    @Index(name = "idx_log_created", columnList = "created_at"),
    @Index(name = "idx_log_serial", columnList = "serial")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String action;

    @Column(length = 100)
    private String serial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 50)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
