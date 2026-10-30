package com.qkshop.tonkho.accessory;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "accessory_order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessoryOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private AccessoryOrder order;

    @Column(name = "accessory_id")
    private Long accessoryId;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(name = "accessory_name", nullable = false)
    private String accessoryName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "warranty_months")
    @Builder.Default
    private Integer warrantyMonths = 0; // Số tháng bảo hành quy đổi (0 nếu không bảo hành)

    @Column(name = "warranty_period", length = 50)
    private String warrantyPeriod; // Chuỗi hiển thị bảo hành gốc (VD: "1 Ngày", "3 Tháng", "1 Năm")

    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry; // Ngày hết hạn bảo hành

    @Column(name = "serial_number", length = 100)
    private String serialNumber; // Mã số serial / tem bảo hành riêng (nếu có)

    private String note;
}
