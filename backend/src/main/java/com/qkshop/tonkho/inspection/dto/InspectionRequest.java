package com.qkshop.tonkho.inspection.dto;

import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionRequestType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Yêu cầu kiểm tra máy.
 * Theo Blueprint §4.9 — INSPECTION_REQUESTS
 * Unique rule: một cycle_id chỉ có một yêu cầu kiểm tra mở.
 */
@Entity
@Table(name = "inspection_requests", indexes = {
    @Index(name = "idx_ir_cycle", columnList = "cycle_id"),
    @Index(name = "idx_ir_serial", columnList = "serial_key"),
    @Index(name = "idx_ir_status", columnList = "status"),
    @Index(name = "idx_ir_type", columnList = "request_type")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InspectionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inspection_request_id", unique = true, nullable = false, length = 50)
    private String inspectionRequestId;

    @Column(name = "cycle_id", nullable = false, length = 50)
    private String cycleId;

    @Column(name = "serial_key", nullable = false, length = 100)
    private String serialKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private InspectionRequestType requestType;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InspectionRequestStatus status = InspectionRequestStatus.OPEN;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "progress_notes", columnDefinition = "TEXT")
    private String progressNotes;

    @Column(name = "required_data_complete")
    @Builder.Default
    private Boolean requiredDataComplete = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
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
