package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.core.enums.ApprovalStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Danh mục Biến thể kỹ thuật.
 * Theo Blueprint §4.4 — CAT_VARIANTS
 * Biến thể = Platform + CPU + GPU + Cảm ứng
 * GPU khác nhau phải tạo variant_key khác nhau.
 */
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "cat_variants", indexes = {
    @Index(name = "idx_var_key", columnList = "variant_key", unique = true),
    @Index(name = "idx_var_pf", columnList = "platform_id")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class VariantV2 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variant_id", unique = true, nullable = false, length = 30)
    private String variantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", referencedColumnName = "platform_id", nullable = false)
    private Platform platform;

    @Column(name = "cpu_code", nullable = false, length = 100)
    private String cpuCode;

    @Column(name = "gpu_code", nullable = false, length = 100)
    private String gpuCode;

    @Column(name = "touch_flag", nullable = false, length = 10)
    @Builder.Default
    private String touchFlag = "NO";

    @Column(name = "screen_size", length = 50)
    private String screenSize;

    @Column(name = "variant_key", nullable = false, length = 300)
    private String variantKey;

    @Column(name = "variant_name", nullable = false, length = 300)
    private String variantName;

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

    /**
     * Tạo variant_key theo quy tắc: platform_key + cpu + gpu + touch (+ screenSize)
     */
    public static String buildVariantKey(String platformKey, String cpu, String gpu, String touch, String screenSize) {
        String base = platformKey + "|" + cpu + "|" + gpu + "|" + touch;
        if (screenSize != null && !screenSize.trim().isEmpty()) {
            base += "|" + screenSize;
        }
        return base.trim().toUpperCase().replaceAll("\\s+", " ");
    }
}
