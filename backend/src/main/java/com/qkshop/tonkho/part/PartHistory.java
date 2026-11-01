package com.qkshop.tonkho.part;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "part_histories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private Integer quantity; // Số lượng biến động (dương khi nhập, âm hoặc dương kèm action khi xuất)

    @Column(precision = 15, scale = 2)
    private BigDecimal price; // Đơn giá tại thời điểm phát sinh

    @Column(nullable = false, length = 50)
    private String action; // IMPORT, REPAIR_USE, UPGRADE_USE, MANUAL_ADJUST, RETURN

    @Column(name = "order_code", length = 50)
    private String orderCode; // Mã đơn sửa chữa SC-... hoặc mã chu kỳ máy CYC-...

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
