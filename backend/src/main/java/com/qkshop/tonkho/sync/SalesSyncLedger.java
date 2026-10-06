package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.sync.SyncState;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Đối soát bán hàng — ledger theo Transaction ID.
 * Theo Blueprint §4.11 — SALES_SYNC_LEDGER
 * Một transaction_id chỉ được liên kết một serial và một sự kiện bán.
 */
@Entity
@Table(name = "sales_sync_ledger", indexes = {
    @Index(name = "idx_ssl_txn", columnList = "transaction_id", unique = true),
    @Index(name = "idx_ssl_serial", columnList = "serial_key"),
    @Index(name = "idx_ssl_state", columnList = "sync_state"),
    @Index(name = "idx_ssl_run", columnList = "last_sync_run_id")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SalesSyncLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", unique = true, nullable = false, length = 100)
    private String transactionId;

    @Column(name = "source_row_key", nullable = false, length = 100)
    private String sourceRowKey;

    @Column(name = "source_status", nullable = false, length = 50)
    private String sourceStatus;

    @Column(name = "source_revision_hash", nullable = false, length = 64)
    private String sourceRevisionHash;

    @Column(name = "serial_source", length = 100)
    private String serialSource;

    @Column(name = "serial_key", length = 100)
    private String serialKey;

    @Column(name = "matched_cycle_id", length = 50)
    private String matchedCycleId;

    @Column(name = "sale_event_id", length = 50)
    private String saleEventId;

    @Column(name = "return_cycle_id", length = 50)
    private String returnCycleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_state", nullable = false, length = 20)
    private SyncState syncState;

    @Column(name = "last_sync_run_id", nullable = false, length = 50)
    private String lastSyncRunId;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (lastSeenAt == null) lastSeenAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
