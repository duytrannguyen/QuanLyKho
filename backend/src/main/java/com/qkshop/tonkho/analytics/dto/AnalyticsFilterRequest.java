package com.qkshop.tonkho.analytics.dto;

import lombok.Data;

@Data
public class AnalyticsFilterRequest {
    private String period;
    private String brandId;
    private String segmentCode;
    private String modelLineId;
    private String priceRange;
    private String productType; // "ALL", "LAPTOP", "ACCESSORY"
    private String category; // Cho phụ kiện
}
