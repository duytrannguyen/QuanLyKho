package com.qkshop.tonkho.sync;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Command Ledger — chống gửi trùng command.
 * Mỗi lệnh ghi có request_id hoặc idempotency_key duy nhất.
 */
@Entity
@Table(name = "command_ledger", indexes = {
    @Index(name = "idx_cl_req", columnList = "request_id", unique = true)
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CommandLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true, nullable = false, length = 100)
    private String requestId;

    @Column(name = "command_type", nullable = false, length = 50)
    private String commandType;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "result_status", nullable = false, length = 20)
    private String resultStatus;

    @Column(name = "result_data", columnDefinition = "JSON")
    private String resultData;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
