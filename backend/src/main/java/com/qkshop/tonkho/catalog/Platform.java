package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.core.enums.ApprovalStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Danh mục Platform (Model/Nền tảng).
 * Theo Blueprint §4.3 — CAT_PLATFORMS
 * Ví dụ: AN515-58, A415EA, X1 Carbon Gen 6
 */
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "cat_platforms", indexes = {
    @Index(name = "idx_pf_key", columnList = "platform_key"),
    @Index(name = "idx_pf_ml", columnList = "model_line_id")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Platform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "platform_id", unique = true, nullable = false, length = 30)
    private String platformId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_line_id", referencedColumnName = "model_line_id", nullable = false)
    private ModelLine modelLine;

    @Column(name = "platform_code", nullable = false, length = 100)
    private String platformCode;

    @Column(name = "platform_key", nullable = false, length = 100)
    private String platformKey;

    @Column(name = "display_name", nullable = false, length = 200)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    @Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.APPROVED;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
