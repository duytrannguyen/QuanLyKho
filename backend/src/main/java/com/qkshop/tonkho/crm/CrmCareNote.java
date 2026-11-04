package com.qkshop.tonkho.crm;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Nhật ký tương tác / chăm sóc khách hàng (Gọi điện, Zalo, tại cửa hàng, bảo hành...).
 * Bắt buộc gắn trực tiếp với 1 đơn hàng cụ thể của khách để theo dõi chu kỳ chăm sóc.
 */
@Entity
@Table(name = "crm_care_notes", indexes = {
        @Index(name = "idx_care_note_customer", columnList = "crm_customer_id"),
        @Index(name = "idx_care_note_order", columnList = "order_id"),
        @Index(name = "idx_care_note_follow_up", columnList = "follow_up_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrmCareNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crm_customer_id", nullable = false)
    private CrmCustomer customer;

    /**
     * Mã ID của đơn hàng liên quan đến lần chăm sóc này (bắt buộc).
     */
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /**
     * Mã giao dịch/hóa đơn (VD: DH20261027-01, CYC-..., PK-...).
     */
    @Column(name = "order_transaction_id", length = 100)
    private String orderTransactionId;

    /**
     * Tên thiết bị / sản phẩm chính trong hóa đơn được chăm sóc.
     */
    @Column(name = "order_product_name", length = 255)
    private String orderProductName;

    /**
     * CALL (Gọi điện), ZALO (Nhắn tin Zalo), STORE_VISIT (Tại cửa hàng), WARRANTY (Bảo hành / Kỹ thuật)
     */
    @Column(name = "interaction_type", length = 50, nullable = false)
    private String interactionType;

    /**
     * Kết quả / Hành động tiến trình:
     * - MAINTENANCE_COMPLETED: Khách đã đến vệ sinh máy tại shop (bắt đầu tính chu kỳ lặp lại tiếp theo)
     * - ONE_TIME_COMPLETED: Đã hoàn tất chăm sóc 7-14 ngày sau mua (phụ kiện / sửa chữa, không lặp lại)
     * - APPOINTMENT_SET: Đang hẹn ngày liên hệ lại
     * - GENERAL_NOTE: Ghi chú trao đổi
     */
    @Column(name = "care_outcome", length = 50)
    private String careOutcome;

    /** Ngày chu kỳ tiếp theo được thiết lập (chỉ áp dụng khi MAINTENANCE_COMPLETED) */
    @Column(name = "next_cycle_date")
    private LocalDate nextCycleDate;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
