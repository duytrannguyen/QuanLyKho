package com.qkshop.tonkho.issue;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Lịch sử lỗi — append-only.
 * Theo Blueprint §4.13 — ISSUE_HISTORY
 * Ghi mỗi lần phát hiện, sửa, quét lại, giải quyết hoặc mở lại.
 */
@Entity
@Table(name = "issue_history", indexes = {
    @Index(name = "idx_ih_issue", columnList = "issue_id"),
    @Index(name = "idx_ih_at", columnList = "event_at")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class IssueHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "issue_id", nullable = false, length = 50)
    private String issueId;

    @Column(name = "action_type", nullable = false, length = 30)
    private String actionType;

    @Column(name = "old_status", length = 30)
    private String oldStatus;

    @Column(name = "new_status", length = 30)
    private String newStatus;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(length = 100)
    private String actor;

    @Column(name = "event_at", nullable = false)
    private LocalDateTime eventAt;

    @PrePersist
    protected void onCreate() {
        if (eventAt == null) eventAt = LocalDateTime.now();
    }
}
