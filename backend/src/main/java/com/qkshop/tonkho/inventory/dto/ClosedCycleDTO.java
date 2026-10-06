package com.qkshop.tonkho.inventory.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO cho searchHistory — gộp ClosedCycle + metadata (brand, modelName từ sourceModelText).
 * Dùng cho endpoint GET /api/machines/searchHistory.
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ClosedCycleDTO {
    private String cycleId;
    private String serialKey;

    // Metadata từ ClosedCycle
    private String sourceModelText;   // Tên máy đầy đủ
    private String configId;
    private String configDisplayName; // Chuỗi mô tả cấu hình đầy đủ
    private String intakeType;        // PURCHASE, CUSTOMER_RETURN, v.v.
    private String closeType;         // SALE, RETURN, CANCEL, TRANSFER
    private String state;             // READY, NEEDS_INSPECTION (cho máy active)
    private LocalDateTime intakeAt;
    private LocalDateTime closedAt;
    private BigDecimal salePriceSnapshot;
    private String customerName;
    private String note;

    // Metadata từ SerialRegistry (brand)
    private String brandId;

    // Computed
    private long storageDays;         // Số ngày lưu kho = closedAt - intakeAt
}
