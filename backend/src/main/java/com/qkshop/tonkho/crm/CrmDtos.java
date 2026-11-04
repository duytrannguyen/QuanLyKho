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
            Boolean isWarrantyVoided) {

        public static OrderItem from(SalesOrder s) {
            return from(s, null, false);
        }

        public static OrderItem from(SalesOrder s, OrderItem accompanyingOrder) {
            return from(s, accompanyingOrder, false);
        }

        public static OrderItem from(SalesOrder s, OrderItem accompanyingOrder, boolean isWarrantyVoided) {
            BigDecimal baseNet = s.getNetRevenue() != null ? s.getNetRevenue() : BigDecimal.ZERO;
            BigDecimal combined = baseNet;
            if (accompanyingOrder != null && accompanyingOrder.netRevenue() != null) {
                combined = combined.add(accompanyingOrder.netRevenue());
            }
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
                    s.getSalesperson(),
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
                    isWarrantyVoided);
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
