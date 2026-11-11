package com.qkshop.tonkho.pricelist;

import lombok.*;
import java.util.List;

/**
 * DTO đại diện cho model/platform kèm danh sách mô tả cấu hình đầy đủ.
 * Phục vụ hiển thị trực quan tại Bước 1 chọn nhóm máy in bảng giá.
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PlatformPriceListDTO {
    private String platformId;
    private String platformCode;
    private String displayName;
    private String modelLineId;
    private String modelLineName;
    private String brandName;
    private List<String> configs;
    private List<PriceListItemDTO> configItems;
}

