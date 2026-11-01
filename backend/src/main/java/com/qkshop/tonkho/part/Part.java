package com.qkshop.tonkho.part;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "parts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Part {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String sku; // Mã SKU linh kiện (VD: LK-RAM-0001, LK-SSD-0002...)

    @Column(nullable = false, length = 200)
    private String name; // Tên linh kiện (VD: RAM DDR4 8GB 3200MHz Kingston, SSD NVMe 512GB Samsung PM991...)

    @Column(nullable = false, length = 50)
    private String category; // Loại: RAM, SSD, HDD, PIN, MANHINH, BANPHIM, SAC, MAINBOARD, FAN_TANNHIET, BANLE, LOA, KHAC...

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0; // Số lượng tồn kho

    @Column(name = "retail_price", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal retailPrice = BigDecimal.ZERO; // Giá bán lẻ / giá thay thế niêm yết

    @Column(name = "upgrade_price", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal upgradePrice = BigDecimal.ZERO; // Giá ưu đãi khi khách nâng cấp theo máy lúc mua

    @Column(name = "import_price", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal importPrice = BigDecimal.ZERO; // Giá nhập vốn (tùy chọn)

    @Column(name = "warranty_period", length = 50)
    private String warrantyPeriod; // Chuỗi hiển thị BH: "1 Tháng", "3 Tháng", "6 Tháng", "12 Tháng", "24 Tháng", "36 Tháng"...

    @Column(name = "warranty_months")
    @Builder.Default
    private Integer warrantyMonths = 1; // Số tháng bảo hành mặc định để tự động tính ngày hết hạn

    @Column(columnDefinition = "TEXT")
    private String note; // Thông số kỹ thuật, ghi chú tương thích dòng máy

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.quantity == null) this.quantity = 0;
        if (this.retailPrice == null) this.retailPrice = BigDecimal.ZERO;
        if (this.upgradePrice == null) this.upgradePrice = BigDecimal.ZERO;
        if (this.importPrice == null) this.importPrice = BigDecimal.ZERO;
        if (this.warrantyMonths == null) this.warrantyMonths = 0;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
