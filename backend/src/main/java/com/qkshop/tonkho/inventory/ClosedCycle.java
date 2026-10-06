package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.intake.IntakeType;
import com.qkshop.tonkho.sale.SalesConfig;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Vòng tồn đã đóng — snapshot tại thời điểm đóng.
 * Theo Blueprint §4.8 — CLOSED_CYCLES
 * Không mở lại hoặc ghi đè. Máy quay lại tạo cycle_id mới.
 */
@Entity
@Table(name = "closed_cycles", indexes = {
    @Index(name = "idx_cc_serial", columnList = "serial_key"),
    @Index(name = "idx_cc_close_type", columnList = "close_type"),
    @Index(name = "idx_cc_closed_at", columnList = "closed_at")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ClosedCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cycle_id", unique = true, nullable = false, length = 50)
    private String cycleId;

    @Column(name = "serial_key", nullable = false, length = 100)
    private String serialKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id")
    private SalesConfig config;

    @Column(name = "source_model_text", length = 200)
    private String sourceModelText;

    @Enumerated(EnumType.STRING)
    @Column(name = "intake_type", length = 30)
    private IntakeType intakeType;

    @Column(name = "intake_at")
    private LocalDateTime intakeAt;

    @Column(name = "ready_at")
    private LocalDateTime readyAt;

    @Column(name = "closed_at", nullable = false)
    private LocalDateTime closedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "close_type", nullable = false, length = 30)
    private CloseType closeType;

    @Column(name = "source_reference", length = 100)
    private String sourceReference;

    @Column(name = "sale_price_snapshot", precision = 15, scale = 0)
    private BigDecimal salePriceSnapshot;

    @Column(name = "close_event_id", nullable = false, length = 50)
    private String closeEventId;

    @Column(name = "close_reason", columnDefinition = "TEXT")
    private String closeReason;

    @Column(name = "paused_days")
    @Builder.Default
    private Long pausedDays = 0L;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "customer_phone", length = 50)
    private String customerPhone;

    @Column(name = "upgrade_note", columnDefinition = "TEXT")
    private String upgradeNote;

    @Column(name = "sale_note", columnDefinition = "TEXT")
    private String saleNote;

    @Column(name = "discount", precision = 15, scale = 0)
    private BigDecimal discount;

    @Column(name = "warranty_period", length = 100)
    private String warrantyPeriod;

    @Column(name = "sale_date")
    private LocalDateTime saleDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (closedAt == null) closedAt = LocalDateTime.now();
    }
}
