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
            int totalOrders,
            BigDecimal totalSpent,
            LocalDateTime firstOrderAt,
            LocalDateTime lastOrderAt) {

        public static CustomerItem from(CrmCustomer c) {
            return new CustomerItem(
                    c.getId(),
                    c.getPhoneNormalized(),
                    c.getFullName(),
                    c.getCustomerType(),
                    c.getTotalOrders() == null ? 0 : c.getTotalOrders(),
                    c.getTotalSpent() == null ? BigDecimal.ZERO : c.getTotalSpent(),
                    c.getFirstOrderAt(),
                    c.getLastOrderAt());
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
            Boolean isStudent) {

        public static OrderItem from(SalesOrder s) {
            return from(s, null);
        }

        public static OrderItem from(SalesOrder s, OrderItem accompanyingOrder) {
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
                    s.getIsStudent());
        }
    }

    public record PageResult<T>(
            java.util.List<T> items,
            long totalElements,
            int totalPages,
            int page,
            int size) {
    }

    public record CrmSummary(long totalCustomers, long unlinkedOrders) {
    }

    public record AssignOrderRequest(
            @NotNull(message = "Thiếu mã đơn hàng")
            Long orderId,
            @NotBlank(message = "Vui lòng nhập số điện thoại khách hàng")
            String phone,
            String customerName) {
    }
}
