package com.qkshop.tonkho.crm;

import com.qkshop.tonkho.salesreport.SalesOrder;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Các DTO của module CRM. */
public final class CrmDtos {

    private CrmDtos() {
    }

    public record CustomerItem(
            Long id,
            String phone,
            String fullName,
            String customerType,
            String address,
            LocalDate birthDate,
            String email,
            String preferenceNote,
            int totalOrders,
            BigDecimal totalSpent,
            LocalDateTime firstOrderAt,
            LocalDateTime lastOrderAt,
            String careStatusTag,
            String careStatusLabel,
            LocalDate nextAppointmentDate) {

        public static CustomerItem from(CrmCustomer c) {
            return from(c, "NORMAL", null, null);
        }

        public static CustomerItem from(CrmCustomer c, String careStatusTag, String careStatusLabel, LocalDate nextAppointmentDate) {
            return new CustomerItem(
                    c.getId(),
                    c.getPhoneNormalized(),
                    c.getFullName(),
                    c.getCustomerType(),
                    c.getAddress(),
                    c.getBirthDate(),
                    c.getEmail(),
                    c.getPreferenceNote(),
                    c.getTotalOrders() == null ? 0 : c.getTotalOrders(),
                    c.getTotalSpent() == null ? BigDecimal.ZERO : c.getTotalSpent(),
                    c.getFirstOrderAt(),
                    c.getLastOrderAt(),
                    careStatusTag,
                    careStatusLabel,
                    nextAppointmentDate);
        }
    }

    public record OrderDetailLineItem(
            String name,
            String skuOrSerial,
            Integer quantity,
            BigDecimal price,
            String warrantyPeriod,
            LocalDate warrantyExpiry,
            String note) {
    }

    public record OrderEnrichment(
            Boolean isShipping,
            Boolean isDelivered,
            LocalDate deliveryDate,
            String shippingCarrier,
            String trackingCode,
            String shippingAddress,
            BigDecimal depositAmount,
            BigDecimal codAmount,
            String upgradeNote,
            String deviceSerial,
            String intakeCondition,
            String accessoriesReceived,
            LocalDate promisedDate,
            String repairStatus,
            String fallbackSalesperson,
            java.util.List<OrderDetailLineItem> detailItems) {
        public static OrderEnrichment empty() {
            return new OrderEnrichment(null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null, java.util.List.of());
        }
    }

    public record OrderItem(
            Long id,
            String transactionId,
            LocalDateTime saleDate,
            String orderCategory,
            String productName,
            String serialKeys,
            String orderStatus,
            String paymentStatus,
            BigDecimal grossRevenue,
            BigDecimal discount,
            BigDecimal netRevenue,
            String warrantyPeriod,
            LocalDate warrantyExpiry,
            String salesperson,
            String customerName,
            String customerPhone,
            String note,
            String matchedCycleId,
            OrderItem accompanyingOrder,
            BigDecimal combinedNetRevenue,
            String brand,
            String series,
            String segment,
            String modelName,
            String configSummary,
            String customerType,
            String firstSource,
            String lastSource,
            Boolean isStudent,
            String careStatus,
            LocalDate lastCareDate,
            LocalDate lastMaintenanceDate,
            LocalDate nextCareDate,
            Integer careCount,
            Boolean isWarrantyVoided,
            Boolean isShipping,
            Boolean isDelivered,
            LocalDate deliveryDate,
            String shippingCarrier,
            String trackingCode,
            String shippingAddress,
            BigDecimal depositAmount,
            BigDecimal codAmount,
            String upgradeNote,
            String deviceSerial,
            String intakeCondition,
            String accessoriesReceived,
            LocalDate promisedDate,
            String repairStatus,
            java.util.List<OrderDetailLineItem> detailItems) {

        public static OrderItem from(SalesOrder s) {
            return from(s, null, false, null);
        }

        public static OrderItem from(SalesOrder s, OrderItem accompanyingOrder) {
            return from(s, accompanyingOrder, false, null);
        }

        public static OrderItem from(SalesOrder s, OrderItem accompanyingOrder, boolean isWarrantyVoided) {
            return from(s, accompanyingOrder, isWarrantyVoided, null);
        }

        public static OrderItem from(SalesOrder s, OrderItem accompanyingOrder, boolean isWarrantyVoided, OrderEnrichment enrichment) {
            BigDecimal baseNet = s.getNetRevenue() != null ? s.getNetRevenue() : BigDecimal.ZERO;
            BigDecimal combined = baseNet;
            if (accompanyingOrder != null && accompanyingOrder.netRevenue() != null) {
                combined = combined.add(accompanyingOrder.netRevenue());
            }
            boolean shipping = Boolean.TRUE.equals(s.getIsShipping())
                    || (enrichment != null && Boolean.TRUE.equals(enrichment.isShipping()));
            boolean delivered = Boolean.TRUE.equals(s.getIsDelivered())
                    || (enrichment != null && Boolean.TRUE.equals(enrichment.isDelivered()));
            LocalDate deliveryDate = s.getDeliveryDate() != null
                    ? s.getDeliveryDate()
                    : (enrichment != null ? enrichment.deliveryDate() : null);
            String carrier = firstNonBlank(s.getShippingCarrier(), enrichment != null ? enrichment.shippingCarrier() : null);
            String tracking = firstNonBlank(s.getTrackingCode(), enrichment != null ? enrichment.trackingCode() : null);
            String address = firstNonBlank(s.getShippingAddress(), enrichment != null ? enrichment.shippingAddress() : null);
            BigDecimal deposit = firstPositiveOrNonNull(s.getDepositAmount(), enrichment != null ? enrichment.depositAmount() : null);
            BigDecimal cod = firstPositiveOrNonNull(s.getCodAmount(), enrichment != null ? enrichment.codAmount() : null);
            String resolvedSalesperson = firstNonBlank(s.getSalesperson(), enrichment != null ? enrichment.fallbackSalesperson() : null);
            java.util.List<OrderDetailLineItem> items = enrichment != null && enrichment.detailItems() != null
                    ? enrichment.detailItems()
                    : java.util.List.of();

            return new OrderItem(
                    s.getId(),
                    s.getTransactionId(),
                    s.getSaleDate(),
                    s.getOrderCategory() == null ? "MACHINE" : s.getOrderCategory(),
                    s.getProductName(),
                    s.getSerialKeys(),
                    s.getOrderStatus(),
                    s.getPaymentStatus(),
                    s.getGrossRevenue(),
                    s.getDiscount(),
                    s.getNetRevenue(),
                    s.getWarrantyPeriod(),
                    s.getWarrantyExpiry(),
                    resolvedSalesperson,
                    s.getCustomerName(),
                    s.getCustomerPhone(),
                    s.getNote(),
                    s.getMatchedCycleId(),
                    accompanyingOrder,
                    combined,
                    s.getBrand(),
                    s.getSeries(),
                    s.getSegment(),
                    s.getModelName(),
                    s.getConfigSummary(),
                    s.getCustomerType(),
                    s.getFirstSource(),
                    s.getLastSource(),
                    s.getIsStudent(),
                    s.getCareStatus(),
                    s.getLastCareDate(),
                    s.getLastMaintenanceDate(),
                    s.getNextCareDate(),
                    s.getCareCount() == null ? 0 : s.getCareCount(),
                    isWarrantyVoided,
                    shipping,
                    delivered,
                    deliveryDate,
                    carrier,
                    tracking,
                    address,
                    deposit,
                    cod,
                    enrichment != null ? enrichment.upgradeNote() : null,
                    enrichment != null ? enrichment.deviceSerial() : null,
                    enrichment != null ? enrichment.intakeCondition() : null,
                    enrichment != null ? enrichment.accessoriesReceived() : null,
                    enrichment != null ? enrichment.promisedDate() : null,
                    enrichment != null ? enrichment.repairStatus() : null,
                    items);
        }

        private static String firstNonBlank(String primary, String fallback) {
            if (primary != null && !primary.isBlank()) {
                return primary;
            }
            return (fallback != null && !fallback.isBlank()) ? fallback : null;
        }

        private static BigDecimal firstPositiveOrNonNull(BigDecimal primary, BigDecimal fallback) {
            if (primary != null && primary.compareTo(BigDecimal.ZERO) > 0) {
                return primary;
            }
            if (fallback != null && fallback.compareTo(BigDecimal.ZERO) > 0) {
                return fallback;
            }
            return primary != null ? primary : fallback;
        }
    }

    public record PageResult<T>(
            java.util.List<T> items,
            long totalElements,
            int totalPages,
            int page,
            int size) {
    }

    public record CrmSummary(
            long totalCustomers, 
            long unlinkedOrders,
            long warrantyExpiringCount,
            long warrantyExpiredCount,
            long maintenanceDueCount,
            long careDueCount,
            long appointmentCount,
            long completedCount) {
    }

    public record AssignOrderRequest(
            @NotNull(message = "Thiếu mã đơn hàng")
            Long orderId,
            @NotBlank(message = "Vui lòng nhập số điện thoại khách hàng")
            String phone,
            String customerName) {
    }

    public record UpdateCustomerRequest(
            @NotBlank(message = "Tên khách hàng không được để trống")
            String fullName,
            String address,
            LocalDate birthDate,
            String email,
            String preferenceNote) {
    }

    public record CareNoteItem(
            Long id,
            Long customerId,
            String interactionType,
            String content,
            LocalDate followUpDate,
            String createdBy,
            LocalDateTime createdAt,
            Long orderId,
            String orderTransactionId,
            String orderProductName,
            String careOutcome,
            LocalDate nextCycleDate) {

        public static CareNoteItem from(CrmCareNote n) {
            return new CareNoteItem(
                    n.getId(),
                    n.getCustomer() != null ? n.getCustomer().getId() : null,
                    n.getInteractionType(),
                    n.getContent(),
                    n.getFollowUpDate(),
                    n.getCreatedBy(),
                    n.getCreatedAt(),
                    n.getOrderId(),
                    n.getOrderTransactionId(),
                    n.getOrderProductName(),
                    n.getCareOutcome(),
                    n.getNextCycleDate());
        }
    }

    public record CreateCareNoteRequest(
            @NotBlank(message = "Loại tương tác không được để trống")
            String interactionType,
            @NotBlank(message = "Nội dung ghi chú không được để trống")
            String content,
            LocalDate followUpDate,
            @NotNull(message = "Mục hóa đơn / thiết bị cần chăm sóc là bắt buộc")
            Long orderId,
            String orderTransactionId,
            String orderProductName,
            String careOutcome,
            LocalDate nextCycleDate) {
    }

    public record ExpiredWarrantyOrderItem(
            Long id,
            String transactionId,
            LocalDateTime saleDate,
            Long crmCustomerId,
            String customerName,
            String customerPhone,
            String productName,
            String brand,
            String modelName,
            String configSummary,
            String serialKeys,
            String warrantyPeriod,
            LocalDate warrantyExpiry,
            long daysExpired,
            BigDecimal netRevenue,
            String salesperson,
            String orderStatus,
            String careStatus,
            LocalDate lastCareDate,
            boolean isWarrantyVoided
    ) {}

    public record ExpiredWarrantySummary(
            long totalExpired,
            long expiredWithin30Days,
            long expired1To3Months,
            long expiredOver3Months
    ) {}
}
