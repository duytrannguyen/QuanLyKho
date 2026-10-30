package com.qkshop.tonkho.repair;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "repair_order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepairOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_order_id", nullable = false)
    @JsonIgnore
    private RepairOrder repairOrder;

    // Các trường thuận tiện cho hiển thị tra cứu
    @Transient
    private Long orderId;

    @Transient
    private String orderCode;

    @Transient
    private String customerName;

    @Transient
    private String customerPhone;

    @Transient
    private String deviceModel;

    @Transient
    private java.time.LocalDateTime createdDate;

    @Transient
    private java.math.BigDecimal orderTotalAmount;

    @PostLoad
    public void populateOrderDetails() {
        if (repairOrder != null) {
            this.orderId = repairOrder.getId();
            this.orderCode = repairOrder.getOrderCode();
            this.customerName = repairOrder.getCustomerName();
            this.customerPhone = repairOrder.getCustomerPhone();
            this.deviceModel = repairOrder.getDeviceModel();
            this.createdDate = repairOrder.getCreatedDate();
            this.orderTotalAmount = repairOrder.getTotalAmount();
        }
    }

    @Column(name = "service_name", nullable = false)
    private String serviceName; // Tên dịch vụ hoặc linh kiện thay thế

    @Column(name = "sku", length = 50)
    private String sku; // Mã SKU linh kiện trong kho nếu có

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "warranty_months")
    @Builder.Default
    private Integer warrantyMonths = 0; // Số tháng bảo hành cho dịch vụ này

    @Column(name = "warranty_period")
    private String warrantyPeriod; // Chuỗi gói BH tùy ý: "1 Ngày", "15 Ngày", "1 Tháng", "1 Năm", v.v.

    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry; // Ngày hết hạn BH

    private String note;
}

