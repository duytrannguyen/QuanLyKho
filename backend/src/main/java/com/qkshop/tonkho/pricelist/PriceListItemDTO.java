package com.qkshop.tonkho.pricelist;

import lombok.*;
import java.math.BigDecimal;

/**
 * DTO dùng để render bảng giá.
 * Gộp thông tin từ Platform → VariantV2 → SalesConfig + ActiveInventory (giá thực tế).
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PriceListItemDTO {

    // --- Thông tin cấu hình ---
    private String configId;
    private String platformId;
    private String platformCode;          // Mã/Tên máy ngắn gọn (VD: Laptop HP EliteBook 840 G8)
    private String platformName;          // Tên platform từ DB
    private String configName;            // Tên cấu hình đầy đủ (từ SalesConfig)
    private String cpuCode;               // Ví dụ: Core 5 - 210H
    private String gpuCode;               // Ví dụ: RTX 3050 - 6GB
    private String ramCode;               // Ví dụ: 16 GB DDR5 5600
    private String ssdCode;               // Ví dụ: 512 GB
    private String screenSpec;            // Ví dụ: 14" FHD
    private String weightKg;
    private String warrantyText;

    // --- Giá ---
    // Nguồn ưu tiên: ActiveInventory.salePrice (giá mới nhất thực tế trong kho)
    // Fallback: SalesConfig.defaultSalePrice
    private BigDecimal defaultSalePrice;

    // --- Tồn kho ---
    private long stockTotal;   // Tổng máy đang tồn (mọi trạng thái)
    private long stockReady;   // Số máy sẵn sàng bán (READY)
}
