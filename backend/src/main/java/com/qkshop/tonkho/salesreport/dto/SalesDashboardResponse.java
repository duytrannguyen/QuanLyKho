package com.qkshop.tonkho.salesreport.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesDashboardResponse {

    private String preset;
    private String periodLabel;
    private String previousPeriodLabel;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate prevStartDate;
    private LocalDate prevEndDate;

    private KpiSection kpis;

    @Builder.Default
    private List<DailyRevenuePoint> dailyRevenue = new ArrayList<>();

    @Builder.Default
    private List<TopModelItem> topModels = new ArrayList<>();

    @Builder.Default
    private List<SourceRevenueItem> revenueBySource = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> brandMix = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> seriesMix = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> segmentMix = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> firstSourceMix = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> inboxVsDirect = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> customerTypeMix = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> studentMix = new ArrayList<>();

    @Builder.Default
    private List<ChartSlice> categoryMix = new ArrayList<>();

    private DataQualitySummary dataQuality;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class KpiSection {
        private KpiMetric actualRevenue;       // Doanh thu thực tế (Y)
        private KpiMetric grossRevenue;        // Doanh thu trước giảm (W)
        private KpiMetric soldUnits;           // Số máy đã bán / số đơn
        private KpiMetric aov;                 // Giá trị đơn TB

        private KpiMetric zaloRevenue;         // Doanh thu Zalo
        private KpiMetric tiktokRevenue;       // Doanh thu TikTok
        private KpiMetric facebookRevenue;     // Doanh thu Facebook
        private KpiMetric googleRevenue;       // Doanh thu Google
        private KpiMetric referralRevenue;     // Doanh thu Giới thiệu

        // Phân tách doanh thu riêng biệt theo Ngành hàng
        private KpiMetric machineRevenue;      // Doanh thu Máy móc (Laptop, PC)
        private KpiMetric accessoryRevenue;    // Doanh thu Phụ kiện bán lẻ
        private KpiMetric repairRevenue;       // Doanh thu Dịch vụ sửa chữa
        private KpiMetric machineOrders;       // Số máy bán hoàn tất
        private KpiMetric accessoryOrders;     // Số đơn phụ kiện
        private KpiMetric repairOrders;        // Số đơn dịch vụ sửa chữa

        private KpiMetric discountRate;        // Tỷ lệ giảm giá (%)
        private KpiMetric totalDiscount;       // Tổng tiền giảm giá (X)
        private KpiMetric firstTimeCustomers;  // Khách mua lần đầu
        private KpiMetric returningCustomers;  // Khách cũ
        private KpiMetric returningRate;       // Tỷ lệ khách cũ (%)
        private KpiMetric studentOrders;       // Số đơn sinh viên
        private KpiMetric studentRate;         // Tỷ lệ đơn sinh viên (%)
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class KpiMetric {
        private double current;
        private double previous;
        private double changePct;       // % tăng giảm so với kỳ trước
        private String changeText;      // VD: "Tăng 12% so với tháng trước"
        private String trend;           // "UP", "DOWN", "FLAT"
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyRevenuePoint {
        private String dateStr;         // yyyy-MM-dd
        private String displayDate;     // dd/MM
        private long orderCount;
        private double revenue;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopModelItem {
        private int rank;
        private String modelName;
        private long orderCount;
        private double revenue;
        private double aov;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SourceRevenueItem {
        private String source;
        private long orderCount;
        private double revenue;
        private double aov;
        private double sharePct;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChartSlice {
        private String name;
        private double value;
        private long count;
        private double percentage;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DataQualitySummary {
        private long totalOrdersInPeriod;
        private long issuesCount;
        private long unknownSourceCount;
    }
}
