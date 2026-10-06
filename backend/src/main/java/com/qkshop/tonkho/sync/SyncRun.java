package com.qkshop.tonkho.sync;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Lịch sử lượt đồng bộ.
 * Theo Blueprint §4.12 — SYNC_RUNS
 */
@Entity
@Table(name = "sync_runs", indexes = {
    @Index(name = "idx_sr_started", columnList = "started_at")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SyncRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sync_run_id", unique = true, nullable = false, length = 50)
    private String syncRunId;

    @Column(name = "window_from")
    private LocalDateTime windowFrom;

    @Column(name = "window_to")
    private LocalDateTime windowTo;

    @Column(name = "run_mode", length = 30)
    private String runMode;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "rows_read")
    @Builder.Default
    private Integer rowsRead = 0;

    @Column(name = "rows_valid")
    @Builder.Default
    private Integer rowsValid = 0;

    @Column(name = "rows_processed")
    @Builder.Default
    private Integer rowsProcessed = 0;

    @Column(name = "rows_skipped")
    @Builder.Default
    private Integer rowsSkipped = 0;

    @Column(name = "rows_error")
    @Builder.Default
    private Integer rowsError = 0;

    @Column(name = "run_status", nullable = false, length = 20)
    @Builder.Default
    private String runStatus = "RUNNING";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) startedAt = LocalDateTime.now();
    }
}
