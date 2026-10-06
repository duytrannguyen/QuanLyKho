package com.qkshop.tonkho.issue;

import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.issue.IssueSeverity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Lỗi dữ liệu đang được theo dõi.
 * Theo Blueprint §4.13 — DATA_ISSUES
 * Fingerprint unique — cùng một lỗi không sinh lặp vô hạn.
 */
@Entity
@Table(name = "data_issues", indexes = {
    @Index(name = "idx_di_fp", columnList = "issue_fingerprint", unique = true),
    @Index(name = "idx_di_status", columnList = "status"),
    @Index(name = "idx_di_severity", columnList = "severity"),
    @Index(name = "idx_di_type", columnList = "issue_type")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DataIssue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "issue_id", unique = true, nullable = false, length = 50)
    private String issueId;

    @Column(name = "issue_fingerprint", unique = true, nullable = false, length = 200)
    private String issueFingerprint;

    @Column(name = "issue_type", nullable = false, length = 50)
    private String issueType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private IssueSeverity severity = IssueSeverity.MEDIUM;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    @Column(name = "source_reference", length = 100)
    private String sourceReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private IssueStatus status = IssueStatus.OPEN;

    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "attempt_count")
    @Builder.Default
    private Integer attemptCount = 0;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "suggested_action", columnDefinition = "TEXT")
    private String suggestedAction;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (firstSeenAt == null) firstSeenAt = LocalDateTime.now();
        if (lastSeenAt == null) lastSeenAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
