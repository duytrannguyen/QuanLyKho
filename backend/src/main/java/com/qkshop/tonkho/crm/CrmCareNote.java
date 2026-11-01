package com.qkshop.tonkho.crm;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Nhật ký tương tác / chăm sóc khách hàng (Gọi điện, Zalo, tại cửa hàng, bảo hành...).
 */
@Entity
@Table(name = "crm_care_notes", indexes = {
        @Index(name = "idx_care_note_customer", columnList = "crm_customer_id"),
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
     * CALL (Gọi điện), ZALO (Nhắn tin Zalo), STORE_VISIT (Tại cửa hàng), WARRANTY (Bảo hành / Kỹ thuật)
     */
    @Column(name = "interaction_type", length = 50, nullable = false)
    private String interactionType;

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
