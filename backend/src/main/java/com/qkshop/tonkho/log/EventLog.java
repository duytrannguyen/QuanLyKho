package com.qkshop.tonkho.log;

import com.qkshop.tonkho.core.enums.EventType;
import com.qkshop.tonkho.core.enums.SourceType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Nhật ký biến động — append-only, không update/xóa.
 * Theo Blueprint §4.10 — EVENT_LOG
 */
@Entity
@Table(name = "event_log", indexes = {
    @Index(name = "idx_el_idem", columnList = "idempotency_key", unique = true),
    @Index(name = "idx_el_serial", columnList = "serial_key"),
    @Index(name = "idx_el_cycle", columnList = "cycle_id"),
    @Index(name = "idx_el_type", columnList = "event_type"),
    @Index(name = "idx_el_at", columnList = "event_at"),
    @Index(name = "idx_el_actor", columnList = "actor")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class EventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", unique = true, nullable = false, length = 50)
    private String eventId;

    @Column(name = "idempotency_key", unique = true, nullable = false, length = 100)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false, length = 100)
    private String entityId;

    @Column(name = "serial_key", length = 100)
    private String serialKey;

    @Column(name = "cycle_id", length = 50)
    private String cycleId;

    @Column(name = "before_snapshot", columnDefinition = "JSON")
    private String beforeSnapshot;

    @Column(name = "after_snapshot", columnDefinition = "JSON")
    private String afterSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private SourceType sourceType;

    @Column(name = "source_reference", length = 100)
    private String sourceReference;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(name = "event_at", nullable = false)
    private LocalDateTime eventAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (eventAt == null) eventAt = LocalDateTime.now();
    }
}
