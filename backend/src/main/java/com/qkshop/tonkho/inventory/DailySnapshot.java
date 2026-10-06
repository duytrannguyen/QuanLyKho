package com.qkshop.tonkho.inventory;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Snapshot tồn kho hàng ngày — phục vụ Dashboard và xu hướng.
 * Theo Blueprint §4.14 — INVENTORY_DAILY_SNAPSHOT
 * Snapshot không thay thế Event Log hoặc vòng tồn.
 */
@Entity
@Table(name = "daily_snapshot", indexes = {
    @Index(name = "idx_ds_date", columnList = "snapshot_date"),
    @Index(name = "idx_ds_brand", columnList = "brand_id"),
    @Index(name = "idx_ds_segment", columnList = "segment_code")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DailySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "brand_id", length = 30)
    private String brandId;

    @Column(name = "segment_code", length = 20)
    private String segmentCode;

    @Column(name = "model_line_id", length = 30)
    private String modelLineId;

    @Column(name = "platform_id", length = 30)
    private String platformId;

    @Column(name = "variant_id", length = 30)
    private String variantId;

    @Column(name = "config_id", length = 30)
    private String configId;

    @Column(name = "price_band", length = 30)
    private String priceBand;

    @Column(name = "end_of_day_count")
    @Builder.Default
    private Integer endOfDayCount = 0;

    @Column(name = "end_of_day_value", precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal endOfDayValue = BigDecimal.ZERO;

    @Column(name = "intake_count")
    @Builder.Default
    private Integer intakeCount = 0;

    @Column(name = "sale_count")
    @Builder.Default
    private Integer saleCount = 0;

    @Column(name = "other_output_count")
    @Builder.Default
    private Integer otherOutputCount = 0;

    @Column(name = "return_count")
    @Builder.Default
    private Integer returnCount = 0;

    @Column(name = "age_bucket", length = 30)
    private String ageBucket;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDate.now();
    }
}
