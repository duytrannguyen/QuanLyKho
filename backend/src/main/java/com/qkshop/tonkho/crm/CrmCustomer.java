package com.qkshop.tonkho.crm;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Hồ sơ khách hàng CRM. Định danh duy nhất theo số điện thoại đã chuẩn hóa.
 * Các chỉ số tổng hợp luôn được tính lại từ bảng sales_orders (không cộng dồn).
 */
@Entity
@Table(name = "crm_customers", indexes = {
        @Index(name = "idx_crm_last_order", columnList = "last_order_at"),
        @Index(name = "idx_crm_total_orders", columnList = "total_orders"),
        @Index(name = "idx_crm_name", columnList = "full_name")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_crm_phone", columnNames = "phone_normalized")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrmCustomer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SĐT chuẩn hóa dạng 0xxxxxxxxx (10 số). */
    @Column(name = "phone_normalized", nullable = false, length = 20)
    private String phoneNormalized;

    @Column(name = "full_name", length = 200)
    private String fullName;

    /** Phân loại khách theo đơn gần nhất (Khách mua lần đầu, Khách cũ...). */
    @Column(name = "customer_type", length = 100)
    private String customerType;

    /** Địa chỉ khách hàng. */
    @Column(name = "address", length = 255)
    private String address;

    /** Ngày sinh của khách. */
    @Column(name = "birth_date")
    private java.time.LocalDate birthDate;

    /** Email liên hệ. */
    @Column(name = "email", length = 100)
    private String email;

    /** Ghi chú sở thích, nhu cầu đặc thù của khách. */
    @Column(name = "preference_note", columnDefinition = "TEXT")
    private String preferenceNote;

    /** Số giao dịch hợp lệ (không tính đơn Hủy / Trả hàng). */
    @Column(name = "total_orders", nullable = false)
    @Builder.Default
    private Integer totalOrders = 0;

    /** Tổng doanh thu thuần của các giao dịch hợp lệ (VNĐ). */
    @Column(name = "total_spent", nullable = false, precision = 18, scale = 0)
    @Builder.Default
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @Column(name = "first_order_at")
    private LocalDateTime firstOrderAt;

    @Column(name = "last_order_at")
    private LocalDateTime lastOrderAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
