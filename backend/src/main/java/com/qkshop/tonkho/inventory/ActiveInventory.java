package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.intake.IntakeType;
import com.qkshop.tonkho.sale.SalesConfig;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Vòng tồn đang hoạt động — mỗi serial chỉ có tối đa 1 dòng.
 * Theo Blueprint §4.7 — ACTIVE_INVENTORY
 * Unique rule: một serial_key chỉ được có một dòng ACTIVE_INVENTORY.
 */
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "active_inventory", indexes = {
    @Index(name = "idx_ai_serial", columnList = "serial_key", unique = true),
    @Index(name = "idx_ai_state", columnList = "state"),
    @Index(name = "idx_ai_config", columnList = "config_id"),
    @Index(name = "idx_ai_intake_at", columnList = "intake_at")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ActiveInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cycle_id", unique = true, nullable = false, length = 50)
    private String cycleId;

    @Column(name = "serial_key", unique = true, nullable = false, length = 100)
    private String serialKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id")
    private SalesConfig config;

    @Column(name = "source_model_text", nullable = false, length = 200)
    private String sourceModelText;

    @Enumerated(EnumType.STRING)
    @Column(name = "intake_type", nullable = false, length = 30)
    private IntakeType intakeType;

    @Column(name = "intake_reference", length = 100)
    private String intakeReference;

    @Column(name = "intake_at", nullable = false)
    private LocalDateTime intakeAt;

    @Column(name = "ready_at")
    private LocalDateTime readyAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private CycleState state = CycleState.NEEDS_INSPECTION;

    @Column(name = "sale_price", precision = 15, scale = 0)
    private BigDecimal salePrice;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "batch_id", length = 50)
    private String batchId;

    @Column(name = "paused_days")
    @Builder.Default
    private Long pausedDays = 0L;

    @Column(name = "last_paused_at")
    private LocalDateTime lastPausedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (intakeAt == null) intakeAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
