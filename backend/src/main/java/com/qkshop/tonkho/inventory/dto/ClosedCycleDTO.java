package com.qkshop.tonkho.inventory.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    private LocalDateTime saleDate;
    private BigDecimal grossRevenue;
    private BigDecimal discount;
    private BigDecimal salePriceSnapshot;
    private String paymentStatus;
    private String customerName;
    private String customerPhone;
    private String productFullName;
    private String productSummary;
    private String upgradeNote;
    private String chargerName;
    private String chargerSku;
    private String note;
    private String sourceReference;   // Mã phiếu xuất hoặc mã tham chiếu
    private String closeReason;        // Lý do xuất khác / hủy
    private String closedBy;           // Người thực hiện xuất
    private String salesperson;        // Nhân viên chốt đơn / Sale
    private String warrantyPeriod;
    private LocalDate warrantyExpiry;

    // Shipping info
    private Boolean isShipping;
    private Boolean isDelivered;
    private LocalDate deliveryDate;
    private String shippingCarrier;
    private String trackingCode;
    private String shippingAddress;
    private BigDecimal depositAmount;
    private BigDecimal codAmount;

    // Metadata từ SerialRegistry / Catalog
    private String brandId;
    private String brandName;
    private String segment;

    // Computed
    private long storageDays;         // Số ngày lưu kho = closedAt - intakeAt
}
