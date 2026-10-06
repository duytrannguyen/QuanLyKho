package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.core.enums.SegmentCode;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Danh mục Dòng máy.
 * Theo Blueprint §4.2 — CAT_MODEL_LINES
 * Ví dụ: Acer Nitro 5, HP EliteBook, Dell Latitude
 */
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "cat_model_lines", indexes = {
    @Index(name = "idx_ml_key", columnList = "model_line_key"),
    @Index(name = "idx_ml_brand", columnList = "brand_id")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ModelLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_line_id", unique = true, nullable = false, length = 30)
    private String modelLineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", referencedColumnName = "brand_id", nullable = false)
    private Brand brand;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment_code", nullable = false, length = 20)
    private SegmentCode segmentCode;

    @Column(name = "model_line_name", nullable = false, length = 200)
    private String modelLineName;

    @Column(name = "model_line_key", nullable = false, length = 200)
    private String modelLineKey;

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
