package com.qkshop.tonkho.machine;

import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.sale.SalesConfig;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Hồ sơ Serial — danh tính và trạng thái mới nhất của mỗi serial.
 * Theo Blueprint §4.6 — SERIAL_REGISTRY
 * Bảng kỹ thuật, chỉ service được ghi. Người dùng không chỉnh trực tiếp.
 */
@Entity
@Table(name = "serial_registry", indexes = {
    @Index(name = "idx_sr_display", columnList = "serial_display"),
    @Index(name = "idx_sr_brand", columnList = "brand_id"),
    @Index(name = "idx_sr_state", columnList = "current_state")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SerialRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serial_key", unique = true, nullable = false, length = 100)
    private String serialKey;

    @Column(name = "serial_display", nullable = false, length = 100)
    private String serialDisplay;

    @Column(name = "brand_id", nullable = false, length = 30)
    private String brandId;

    @Column(name = "current_cycle_id", length = 50)
    private String currentCycleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_config_id")
    private SalesConfig currentConfig;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_state", nullable = false, length = 30)
    @Builder.Default
    private CycleState currentState = CycleState.NEEDS_INSPECTION;

    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(name = "last_event_id", length = 50)
    private String lastEventId;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (firstSeenAt == null) firstSeenAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Chuẩn hóa serial thành serial_key.
     * Trim khoảng trắng + uppercase. Không tự đoán hoặc tạo serial.
     */
    public static String normalizeSerialKey(String raw) {
        if (raw == null) return null;
        return raw.trim().toUpperCase();
    }
}
