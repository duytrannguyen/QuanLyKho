package com.qkshop.tonkho.salesreport;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity lưu thông tin đầy đủ của một đơn hàng / giao dịch bán hàng,
 * ánh xạ 1:1 với 31 cột của sheet DATABASE_BÁN HÀNG.
 */
@Entity
@Table(name = "sales_orders", indexes = {
        @Index(name = "idx_so_date", columnList = "sale_date"),
        @Index(name = "idx_so_source", columnList = "normalized_source"),
        @Index(name = "idx_so_brand", columnList = "brand"),
        @Index(name = "idx_so_status", columnList = "order_status, payment_status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Cột A: transaction_ID duy nhất */
    @Column(name = "transaction_id", length = 100, nullable = false, unique = true)
    private String transactionId;

    /** Cột B: ngày bán */
    @Column(name = "sale_date")
    private LocalDateTime saleDate;

    /** Cột C: tháng bán (dạng ngày đầu tháng) */
    @Column(name = "month_date")
    private LocalDate monthDate;

    /** Cột D: customer_ID */
    @Column(name = "customer_id", length = 100)
    private String customerId;

    /** Cột E: lead_ID */
    @Column(name = "lead_id", length = 100)
    private String leadId;

    /** Cột F: tên khách */
    @Column(name = "customer_name", length = 200)
    private String customerName;

    /** Cột G: SĐT */
    @Column(name = "customer_phone", length = 50)
    private String customerPhone;

    /** Cột H: phân loại khách (Khách mua lần đầu, Khách cũ...) */
    @Column(name = "customer_type", length = 100)
    private String customerType;

    /** Cột I: nguồn đầu tiên biết đến */
    @Column(name = "first_source", length = 100)
    private String firstSource;

    /** Cột J: nguồn thứ 2 tham khảo */
    @Column(name = "second_source", length = 100)
    private String secondSource;

    /** Cột K: nguồn chốt cuối cùng */
    @Column(name = "last_source", length = 100)
    private String lastSource;

    /** Nguồn chốt chuẩn hoá (TikTok, Facebook, Zalo, Google, Người quen giới thiệu, Khác, Chưa rõ) */
    @Column(name = "normalized_source", length = 100)
    private String normalizedSource;

    /** Loại đơn: Đơn có inbox (Facebook/TikTok/Zalo) vs Đơn mua thẳng */
    @Column(name = "inbox_type", length = 50)
    private String inboxType;

    /** Cột L: sinh viên? */
    @Column(name = "is_student")
    private Boolean isStudent;

    /** Cột M: trạng thái đơn (Hoàn tất, Đang xử lý, Huỷ, Trả hàng...) */
    @Column(name = "order_status", length = 50)
    private String orderStatus;

    /** Cột N: trạng thái thanh toán (Đã thanh toán, Cọc, Công nợ...) */
    @Column(name = "payment_status", length = 50)
    private String paymentStatus;

    /** Cột O: sản phẩm chính */
    @Column(name = "product_name", length = 500)
    private String productName;

    /** Cột P: hãng (Dell, HP, Lenovo, ASUS, Acer, Apple, Surface, MSI...) */
    @Column(name = "brand", length = 100)
    private String brand;

    /** Cột Q: series (Latitude, ThinkPad, XPS, ZBook, TUF, Nitro...) */
    @Column(name = "series", length = 100)
    private String series;

    /** Cột R: phân khúc (Văn phòng, Gaming, Máy trạm, Cao cấp...) */
    @Column(name = "segment", length = 100)
    private String segment;

    /** Cột S: dòng máy */
    @Column(name = "model_name", length = 255)
    private String modelName;

    /** Cột T: cấu hình tóm tắt */
    @Column(name = "config_summary", columnDefinition = "TEXT")
    private String configSummary;

    /** Cột U: mức bảo hành (1 tháng, 3 tháng, 6 tháng...) */
    @Column(name = "warranty_period", length = 100)
    private String warrantyPeriod;

    /** Cột V: bảo hành đến ngày */
    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;

    /** Cột W: doanh thu gộp / trước giảm (VNĐ) */
    @Column(name = "gross_revenue", precision = 15, scale = 0)
    private BigDecimal grossRevenue;

    /** Cột X: giảm giá / chiết khấu (VNĐ) */
    @Column(name = "discount", precision = 15, scale = 0)
    private BigDecimal discount;

    /** Cột Y: doanh thu thuần / thực nhận (VNĐ) */
    @Column(name = "net_revenue", precision = 15, scale = 0)
    private BigDecimal netRevenue;

    /** Cột Z: trạng thái khớp CRM */
    @Column(name = "crm_sync_status", length = 100)
    private String crmSyncStatus;

    /** Cột AA: trạng thái khớp tin nhắn */
    @Column(name = "message_sync_status", length = 100)
    private String messageSyncStatus;

    /** Cột AB: trạng thái chất lượng dữ liệu */
    @Column(name = "data_quality_status", length = 255)
    private String dataQualityStatus;

    /** Cột AC: ngày nạp đơn */
    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    /** Cột AD: ghi chú đơn */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** Cột AE: số Serial máy (hỗ trợ nhiều serial cách nhau bởi dấu phẩy) */
    @Column(name = "serial_keys", length = 500)
    private String serialKeys;

    /** Nhân viên chốt đơn / Sale */
    @Column(name = "salesperson", length = 100)
    private String salesperson;

    /** Chu kỳ kho liên kết (nếu có) */
    @Column(name = "matched_cycle_id", length = 50)
    private String matchedCycleId;

    /** Nguồn dữ liệu: DATASALE, GSHEET, WEB_APP */
    @Column(name = "origin", length = 50)
    private String origin;

    /** Phân loại danh mục đơn hàng: MACHINE (Mặc định), ACCESSORY (Phụ kiện), REPAIR (Sửa chữa) */
    @Column(name = "order_category", length = 50)
    @Builder.Default
    private String orderCategory = "MACHINE";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
