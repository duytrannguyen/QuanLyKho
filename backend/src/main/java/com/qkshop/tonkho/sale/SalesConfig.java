package com.qkshop.tonkho.sale;
import com.qkshop.tonkho.catalog.VariantV2;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Danh mục Cấu hình bán hàng.
 * Theo Blueprint §4.5 — CAT_CONFIGS
 * Cấu hình = Biến thể + RAM + SSD
 * Giá không tham gia khóa cấu hình.
 */
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "cat_configs", indexes = {
    @Index(name = "idx_cfg_key", columnList = "config_key", unique = true),
    @Index(name = "idx_cfg_var", columnList = "variant_id")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SalesConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_id", unique = true, nullable = false, length = 30)
    private String configId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", referencedColumnName = "variant_id", nullable = false)
    private VariantV2 variant;

    @Column(name = "ram_code", nullable = false, length = 30)
    private String ramCode;

    @Column(name = "ssd_code", nullable = false, length = 30)
    private String ssdCode;

    @Column(name = "config_key", nullable = false, length = 400)
    private String configKey;

    @Column(name = "display_name", nullable = false, length = 400)
    private String displayName;

    @Column(name = "default_sale_price", precision = 15, scale = 0)
    private BigDecimal defaultSalePrice;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Tạo config_key theo quy tắc: variant_key + ram + ssd
     */
    public static String buildConfigKey(String variantKey, String ram, String ssd) {
        return (variantKey + "|" + ram + "|" + ssd)
                .trim().toUpperCase().replaceAll("\\s+", " ");
    }
}
