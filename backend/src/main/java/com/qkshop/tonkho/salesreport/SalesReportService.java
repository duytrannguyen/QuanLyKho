package com.qkshop.tonkho.salesreport;

import com.qkshop.tonkho.salesreport.dto.SalesDashboardResponse;
import com.qkshop.tonkho.salesreport.dto.SalesDashboardResponse.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesReportService {

    private final SalesOrderRepository salesOrderRepo;

    private static final DateTimeFormatter DISPLAY_DATE_FMT = DateTimeFormatter.ofPattern("dd/MM");

    @Transactional(readOnly = true)
    public SalesDashboardResponse getDashboardData(String preset, LocalDate customFrom, LocalDate customTo) {
        // 1. Xác định khoảng thời gian kỳ hiện tại và kỳ trước để so sánh
        PeriodWindow window = resolvePeriodWindow(preset, customFrom, customTo);

        LocalDateTime currentStart = window.startDate.atStartOfDay();
        LocalDateTime currentEnd = window.endDate.atTime(23, 59, 59, 999999999);

        LocalDateTime prevStart = window.prevStartDate.atStartOfDay();
        LocalDateTime prevEnd = window.prevEndDate.atTime(23, 59, 59, 999999999);

        // 2. Lấy dữ liệu KPI tổng quan cho cả 2 kỳ
        Object[] curKpiRow = salesOrderRepo.getSummaryKpis(currentStart, currentEnd);
        Object[] prevKpiRow = salesOrderRepo.getSummaryKpis(prevStart, prevEnd);

        KpiData curKpi = parseKpiRow(curKpiRow);
        KpiData prevKpi = parseKpiRow(prevKpiRow);

        // Doanh thu theo nguồn cho 2 kỳ để tính KPI nguồn
        Map<String, Double> curSourceMap = getSourceRevenueMap(currentStart, currentEnd);
        Map<String, Double> prevSourceMap = getSourceRevenueMap(prevStart, prevEnd);

        // Doanh thu & sản lượng theo ngành hàng (Máy móc, Phụ kiện, Sửa chữa)
        Map<String, CategoryStats> curCategoryMap = getCategoryStatsMap(currentStart, currentEnd);
        Map<String, CategoryStats> prevCategoryMap = getCategoryStatsMap(prevStart, prevEnd);

        // 3. Xây dựng KpiSection
        KpiSection kpis = buildKpiSection(curKpi, prevKpi, curSourceMap, prevSourceMap, curCategoryMap, prevCategoryMap, window.periodUnit);

        // 4. Doanh thu theo ngày trong kỳ
        List<DailyRevenuePoint> dailyRevenue = buildDailyRevenue(currentStart, currentEnd, window.startDate, window.endDate);

        // 5. Top 10 Model bán chạy nhất
        List<TopModelItem> topModels = buildTopModels(currentStart, currentEnd);

        // 6. Doanh thu theo Nguồn chốt chuẩn hoá
        List<SourceRevenueItem> revenueBySource = buildRevenueBySource(currentStart, currentEnd, curKpi.netRevenue);

        // 7. Các lát cắt biểu đồ cơ cấu (Donut / Pie)
        List<ChartSlice> brandMix = buildBrandMix(currentStart, currentEnd, curKpi.netRevenue);
        List<ChartSlice> seriesMix = buildSeriesMix(currentStart, currentEnd, curKpi.totalOrders);
        List<ChartSlice> segmentMix = buildSegmentMix(currentStart, currentEnd, curKpi.netRevenue);
        List<ChartSlice> firstSourceMix = buildFirstSourceMix(currentStart, currentEnd, curKpi.totalOrders);
        List<ChartSlice> inboxVsDirect = buildInboxVsDirect(currentStart, currentEnd, curKpi.netRevenue);
        List<ChartSlice> customerTypeMix = buildCustomerTypeMix(currentStart, currentEnd, curKpi.totalOrders);
        List<ChartSlice> studentMix = buildStudentMix(currentStart, currentEnd, curKpi.totalOrders);
        List<ChartSlice> categoryMix = buildCategoryMix(currentStart, currentEnd, curKpi.netRevenue);

        // 8. Thống kê chất lượng dữ liệu
        long issuesCount = salesOrderRepo.countDataIssuesInPeriod(currentStart, currentEnd);
        long unknownSourceCount = curSourceMap.getOrDefault("Chưa rõ", 0.0) > 0 ? 
                revenueBySource.stream().filter(s -> "Chưa rõ".equals(s.getSource())).mapToLong(SourceRevenueItem::getOrderCount).findFirst().orElse(0L) : 0L;

        DataQualitySummary dq = DataQualitySummary.builder()
                .totalOrdersInPeriod(curKpi.totalOrders)
                .issuesCount(issuesCount)
                .unknownSourceCount(unknownSourceCount)
                .build();

        return SalesDashboardResponse.builder()
                .preset(preset)
                .periodLabel(window.periodLabel)
                .previousPeriodLabel(window.prevPeriodLabel)
                .startDate(window.startDate)
                .endDate(window.endDate)
                .prevStartDate(window.prevStartDate)
                .prevEndDate(window.prevEndDate)
                .kpis(kpis)
                .dailyRevenue(dailyRevenue)
                .topModels(topModels)
                .revenueBySource(revenueBySource)
                .brandMix(brandMix)
                .seriesMix(seriesMix)
                .segmentMix(segmentMix)
                .firstSourceMix(firstSourceMix)
                .inboxVsDirect(inboxVsDirect)
                .customerTypeMix(customerTypeMix)
                .studentMix(studentMix)
                .categoryMix(categoryMix)
                .dataQuality(dq)
                .build();
    }

    private Map<String, Double> getSourceRevenueMap(LocalDateTime start, LocalDateTime end) {
        Map<String, Double> map = new HashMap<>();
        List<SalesOrderRepository.GroupAggregate> list = salesOrderRepo.getRevenueBySource(start, end);
        for (SalesOrderRepository.GroupAggregate item : list) {
            map.put(item.getGroupName(), item.getTotalRevenue());
        }
        return map;
    }

    private record CategoryStats(double netRevenue, long orderCount) {}

    private Map<String, CategoryStats> getCategoryStatsMap(LocalDateTime start, LocalDateTime end) {
        Map<String, CategoryStats> map = new HashMap<>();
        List<SalesOrderRepository.GroupAggregate> list = salesOrderRepo.getCategoryMix(start, end);
        for (SalesOrderRepository.GroupAggregate item : list) {
            map.put(item.getGroupName(), new CategoryStats(item.getTotalRevenue(), item.getOrderCount()));
        }
        return map;
    }

    private KpiSection buildKpiSection(KpiData cur, KpiData prev,
                                       Map<String, Double> curSources, Map<String, Double> prevSources,
                                       Map<String, CategoryStats> curCats, Map<String, CategoryStats> prevCats,
                                       String unit) {
        double curAov = cur.totalOrders > 0 ? Math.round(cur.netRevenue / cur.totalOrders) : 0;
        double prevAov = prev.totalOrders > 0 ? Math.round(prev.netRevenue / prev.totalOrders) : 0;

        double curDiscRate = cur.grossRevenue > 0 ? (cur.totalDiscount / cur.grossRevenue) * 100 : 0;
        double prevDiscRate = prev.grossRevenue > 0 ? (prev.totalDiscount / prev.grossRevenue) * 100 : 0;

        double curRetRate = cur.totalOrders > 0 ? ((double) cur.returningCustomers / cur.totalOrders) * 100 : 0;
        double prevRetRate = prev.totalOrders > 0 ? ((double) prev.returningCustomers / prev.totalOrders) * 100 : 0;

        double curStudentRate = cur.totalOrders > 0 ? ((double) cur.studentOrders / cur.totalOrders) * 100 : 0;
        double prevStudentRate = prev.totalOrders > 0 ? ((double) prev.studentOrders / prev.totalOrders) * 100 : 0;

        CategoryStats curMach = curCats.getOrDefault("Máy móc", new CategoryStats(0, 0));
        CategoryStats prevMach = prevCats.getOrDefault("Máy móc", new CategoryStats(0, 0));

        CategoryStats curAcc = curCats.getOrDefault("Phụ kiện", new CategoryStats(0, 0));
        CategoryStats prevAcc = prevCats.getOrDefault("Phụ kiện", new CategoryStats(0, 0));

        CategoryStats curRep = curCats.getOrDefault("Dịch vụ sửa chữa", new CategoryStats(0, 0));
        CategoryStats prevRep = prevCats.getOrDefault("Dịch vụ sửa chữa", new CategoryStats(0, 0));

        return KpiSection.builder()
                .actualRevenue(createMetric(cur.netRevenue, prev.netRevenue, unit, true))
                .grossRevenue(createMetric(cur.grossRevenue, prev.grossRevenue, unit, true))
                .soldUnits(createMetric(cur.totalOrders, prev.totalOrders, unit, false))
                .aov(createMetric(curAov, prevAov, unit, true))

                // KPI riêng biệt theo Ngành hàng
                .machineRevenue(createMetric(curMach.netRevenue(), prevMach.netRevenue(), unit, true))
                .machineOrders(createMetric((double) curMach.orderCount(), (double) prevMach.orderCount(), unit, false))
                .accessoryRevenue(createMetric(curAcc.netRevenue(), prevAcc.netRevenue(), unit, true))
                .accessoryOrders(createMetric((double) curAcc.orderCount(), (double) prevAcc.orderCount(), unit, false))
                .repairRevenue(createMetric(curRep.netRevenue(), prevRep.netRevenue(), unit, true))
                .repairOrders(createMetric((double) curRep.orderCount(), (double) prevRep.orderCount(), unit, false))

                .zaloRevenue(createMetric(curSources.getOrDefault("Zalo", 0.0), prevSources.getOrDefault("Zalo", 0.0), unit, true))
                .tiktokRevenue(createMetric(curSources.getOrDefault("TikTok", 0.0), prevSources.getOrDefault("TikTok", 0.0), unit, true))
                .facebookRevenue(createMetric(curSources.getOrDefault("Facebook", 0.0), prevSources.getOrDefault("Facebook", 0.0), unit, true))
                .googleRevenue(createMetric(curSources.getOrDefault("Google", 0.0), prevSources.getOrDefault("Google", 0.0), unit, true))
                .referralRevenue(createMetric(curSources.getOrDefault("Người quen giới thiệu", 0.0), prevSources.getOrDefault("Người quen giới thiệu", 0.0), unit, true))

                .discountRate(createMetric(curDiscRate, prevDiscRate, unit, false))
                .totalDiscount(createMetric(cur.totalDiscount, prev.totalDiscount, unit, true))
                .firstTimeCustomers(createMetric(cur.firstTimeCustomers, prev.firstTimeCustomers, unit, false))
                .returningCustomers(createMetric(cur.returningCustomers, prev.returningCustomers, unit, false))
                .returningRate(createMetric(curRetRate, prevRetRate, unit, false))
                .studentOrders(createMetric(cur.studentOrders, prev.studentOrders, unit, false))
                .studentRate(createMetric(curStudentRate, prevStudentRate, unit, false))
                .build();
    }

    private KpiMetric createMetric(double current, double previous, String unit, boolean isMoney) {
        double changePct = 0.0;
        String trend = "FLAT";
        String changeText;

        if (previous > 0) {
            changePct = ((current - previous) / previous) * 100;
            if (changePct > 0.05) {
                trend = "UP";
                changeText = String.format("Tăng %.0f%% so với %s trước", Math.abs(changePct), unit);
            } else if (changePct < -0.05) {
                trend = "DOWN";
                changeText = String.format("Giảm %.0f%% so với %s trước", Math.abs(changePct), unit);
            } else {
                changeText = "Không đổi so với " + unit + " trước";
            }
        } else if (current > 0) {
            trend = "UP";
            changeText = "Mới phát sinh so với " + unit + " trước";
        } else {
            changeText = "Không đổi so với " + unit + " trước";
        }

        return KpiMetric.builder()
                .current(current)
                .previous(previous)
                .changePct(Math.round(changePct * 10.0) / 10.0)
                .changeText(changeText)
                .trend(trend)
                .build();
    }

    private List<DailyRevenuePoint> buildDailyRevenue(LocalDateTime start, LocalDateTime end, LocalDate sDate, LocalDate eDate) {
        List<SalesOrderRepository.DailyRevenueAggregate> rows = salesOrderRepo.getDailyRevenue(start, end);
        Map<String, SalesOrderRepository.DailyRevenueAggregate> map = rows.stream()
                .collect(Collectors.toMap(SalesOrderRepository.DailyRevenueAggregate::getSaleDateStr, r -> r, (a, b) -> a));

        List<DailyRevenuePoint> result = new ArrayList<>();
        // Nếu khoảng cách ngày <= 60 ngày thì fill đầy đủ các ngày để biểu đồ liên tục
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(sDate, eDate);
        if (daysBetween <= 62) {
            LocalDate curr = sDate;
            while (!curr.isAfter(eDate)) {
                String dStr = curr.toString();
                SalesOrderRepository.DailyRevenueAggregate agg = map.get(dStr);
                result.add(DailyRevenuePoint.builder()
                        .dateStr(dStr)
                        .displayDate(curr.format(DISPLAY_DATE_FMT))
                        .orderCount(agg != null ? agg.getOrderCount() : 0L)
                        .revenue(agg != null ? agg.getTotalRevenue() : 0.0)
                        .build());
                curr = curr.plusDays(1);
            }
        } else {
            for (SalesOrderRepository.DailyRevenueAggregate r : rows) {
                LocalDate d = LocalDate.parse(r.getSaleDateStr());
                result.add(DailyRevenuePoint.builder()
                        .dateStr(r.getSaleDateStr())
                        .displayDate(d.format(DISPLAY_DATE_FMT))
                        .orderCount(r.getOrderCount())
                        .revenue(r.getTotalRevenue())
                        .build());
            }
        }
        return result;
    }

    private List<TopModelItem> buildTopModels(LocalDateTime start, LocalDateTime end) {
        List<SalesOrderRepository.GroupAggregate> rows = salesOrderRepo.getTopModels(start, end);
        List<TopModelItem> list = new ArrayList<>();
        int rank = 1;
        for (SalesOrderRepository.GroupAggregate r : rows) {
            if (rank > 10) break;
            double aov = r.getOrderCount() > 0 ? Math.round(r.getTotalRevenue() / r.getOrderCount()) : 0;
            list.add(TopModelItem.builder()
                    .rank(rank++)
                    .modelName(r.getGroupName())
                    .orderCount(r.getOrderCount())
                    .revenue(r.getTotalRevenue())
                    .aov(aov)
                    .build());
        }
        return list;
    }

    private List<SourceRevenueItem> buildRevenueBySource(LocalDateTime start, LocalDateTime end, double totalRevenue) {
        List<SalesOrderRepository.GroupAggregate> rows = salesOrderRepo.getRevenueBySource(start, end);
        List<SourceRevenueItem> list = new ArrayList<>();
        for (SalesOrderRepository.GroupAggregate r : rows) {
            double aov = r.getOrderCount() > 0 ? Math.round(r.getTotalRevenue() / r.getOrderCount()) : 0;
            double share = totalRevenue > 0 ? (r.getTotalRevenue() / totalRevenue) * 100 : 0;
            list.add(SourceRevenueItem.builder()
                    .source(r.getGroupName())
                    .orderCount(r.getOrderCount())
                    .revenue(r.getTotalRevenue())
                    .aov(aov)
                    .sharePct(Math.round(share * 10.0) / 10.0)
                    .build());
        }
        return list;
    }

    private List<ChartSlice> buildBrandMix(LocalDateTime start, LocalDateTime end, double totalRevenue) {
        return buildSlices(salesOrderRepo.getBrandMix(start, end), totalRevenue, true);
    }

    private List<ChartSlice> buildSeriesMix(LocalDateTime start, LocalDateTime end, long totalOrders) {
        return buildSlices(salesOrderRepo.getSeriesMix(start, end), (double) totalOrders, false);
    }

    private List<ChartSlice> buildSegmentMix(LocalDateTime start, LocalDateTime end, double totalRevenue) {
        return buildSlices(salesOrderRepo.getSegmentMix(start, end), totalRevenue, true);
    }

    private List<ChartSlice> buildFirstSourceMix(LocalDateTime start, LocalDateTime end, long totalOrders) {
        return buildSlices(salesOrderRepo.getFirstSourceMix(start, end), (double) totalOrders, false);
    }

    private List<ChartSlice> buildInboxVsDirect(LocalDateTime start, LocalDateTime end, double totalRevenue) {
        return buildSlices(salesOrderRepo.getInboxTypeMix(start, end), totalRevenue, true);
    }

    private List<ChartSlice> buildCustomerTypeMix(LocalDateTime start, LocalDateTime end, long totalOrders) {
        return buildSlices(salesOrderRepo.getCustomerTypeMix(start, end), (double) totalOrders, false);
    }

    private List<ChartSlice> buildStudentMix(LocalDateTime start, LocalDateTime end, long totalOrders) {
        return buildSlices(salesOrderRepo.getStudentMix(start, end), (double) totalOrders, false);
    }

    private List<ChartSlice> buildCategoryMix(LocalDateTime start, LocalDateTime end, double totalRevenue) {
        return buildSlices(salesOrderRepo.getCategoryMix(start, end), totalRevenue, true);
    }

    private List<ChartSlice> buildSlices(List<SalesOrderRepository.GroupAggregate> rows, double total, boolean useRevenue) {
        Map<String, ChartSlice> map = new LinkedHashMap<>();
        for (SalesOrderRepository.GroupAggregate r : rows) {
            String name = (r.getGroupName() == null || r.getGroupName().isBlank()) ? "Chưa rõ" : r.getGroupName().trim();
            double val = useRevenue ? r.getTotalRevenue() : (double) r.getOrderCount();
            long count = r.getOrderCount();

            if (map.containsKey(name)) {
                ChartSlice existing = map.get(name);
                double newVal = existing.getValue() + val;
                long newCount = existing.getCount() + count;
                double newPct = total > 0 ? (newVal / total) * 100 : 0;
                map.put(name, ChartSlice.builder()
                        .name(name)
                        .value(newVal)
                        .count(newCount)
                        .percentage(Math.round(newPct * 10.0) / 10.0)
                        .build());
            } else {
                double pct = total > 0 ? (val / total) * 100 : 0;
                map.put(name, ChartSlice.builder()
                        .name(name)
                        .value(val)
                        .count(count)
                        .percentage(Math.round(pct * 10.0) / 10.0)
                        .build());
            }
        }
        return new ArrayList<>(map.values());
    }

    private record KpiData(
            long totalOrders,
            double netRevenue,
            double grossRevenue,
            double totalDiscount,
            long firstTimeCustomers,
            long returningCustomers,
            long studentOrders
    ) {}

    private KpiData parseKpiRow(Object[] row) {
        if (row == null || row.length == 0 || row[0] == null) {
            return new KpiData(0, 0, 0, 0, 0, 0, 0);
        }
        Object[] cols = (row[0] instanceof Object[]) ? (Object[]) row[0] : row;
        long totalOrders = cols.length > 0 && cols[0] != null ? ((Number) cols[0]).longValue() : 0L;
        double netRev = cols.length > 1 && cols[1] != null ? ((Number) cols[1]).doubleValue() : 0.0;
        double grossRev = cols.length > 2 && cols[2] != null ? ((Number) cols[2]).doubleValue() : 0.0;
        double disc = cols.length > 3 && cols[3] != null ? ((Number) cols[3]).doubleValue() : 0.0;
        long firstTime = cols.length > 4 && cols[4] != null ? ((Number) cols[4]).longValue() : 0L;
        long returning = cols.length > 5 && cols[5] != null ? ((Number) cols[5]).longValue() : 0L;
        long student = cols.length > 6 && cols[6] != null ? ((Number) cols[6]).longValue() : 0L;

        return new KpiData(totalOrders, netRev, grossRev, disc, firstTime, returning, student);
    }

    private record PeriodWindow(
            LocalDate startDate,
            LocalDate endDate,
            LocalDate prevStartDate,
            LocalDate prevEndDate,
            String periodLabel,
            String prevPeriodLabel,
            String periodUnit
    ) {}

    private PeriodWindow resolvePeriodWindow(String preset, LocalDate customFrom, LocalDate customTo) {
        LocalDate today = LocalDate.now();
        String p = preset != null ? preset.toUpperCase(Locale.ROOT) : "THIS_MONTH";

        LocalDate start;
        LocalDate end;
        LocalDate prevStart;
        LocalDate prevEnd;
        String label;
        String prevLabel;
        String unit = "tháng";

        switch (p) {
            case "TODAY" -> {
                start = today;
                end = today;
                prevStart = today.minusDays(1);
                prevEnd = today.minusDays(1);
                label = "Hôm nay (" + today.format(DISPLAY_DATE_FMT) + ")";
                prevLabel = "Hôm qua";
                unit = "ngày";
            }
            case "YESTERDAY" -> {
                LocalDate yesterday = today.minusDays(1);
                start = yesterday;
                end = yesterday;
                prevStart = today.minusDays(2);
                prevEnd = today.minusDays(2);
                label = "Hôm qua (" + yesterday.format(DISPLAY_DATE_FMT) + ")";
                prevLabel = "Hôm kia";
                unit = "ngày";
            }
            case "THIS_WEEK" -> {
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
                prevStart = start.minusWeeks(1);
                prevEnd = end.minusWeeks(1);
                label = "Tuần này (" + start.format(DISPLAY_DATE_FMT) + " - " + end.format(DISPLAY_DATE_FMT) + ")";
                prevLabel = "Tuần trước (" + prevStart.format(DISPLAY_DATE_FMT) + " - " + prevEnd.format(DISPLAY_DATE_FMT) + ")";
                unit = "tuần";
            }
            case "LAST_WEEK" -> {
                LocalDate lastMonday = today.minusWeeks(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                start = lastMonday;
                end = lastMonday.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
                prevStart = start.minusWeeks(1);
                prevEnd = end.minusWeeks(1);
                label = "Tuần trước (" + start.format(DISPLAY_DATE_FMT) + " - " + end.format(DISPLAY_DATE_FMT) + ")";
                prevLabel = "Tuần trước đó (" + prevStart.format(DISPLAY_DATE_FMT) + " - " + prevEnd.format(DISPLAY_DATE_FMT) + ")";
                unit = "tuần";
            }
            case "LAST_MONTH" -> {
                LocalDate lastMonth = today.minusMonths(1);
                start = lastMonth.with(TemporalAdjusters.firstDayOfMonth());
                end = lastMonth.with(TemporalAdjusters.lastDayOfMonth());
                LocalDate monthBefore = today.minusMonths(2);
                prevStart = monthBefore.with(TemporalAdjusters.firstDayOfMonth());
                prevEnd = monthBefore.with(TemporalAdjusters.lastDayOfMonth());
                label = "Tháng trước (" + start.getMonthValue() + "/" + start.getYear() + ")";
                prevLabel = "Tháng " + prevStart.getMonthValue() + "/" + prevStart.getYear();
                unit = "tháng";
            }
            case "ALL_TIME" -> {
                start = LocalDate.of(2026, 1, 1);
                end = today.plusDays(1);
                prevStart = start.minusYears(1);
                prevEnd = start.minusDays(1);
                label = "Toàn thời gian";
                prevLabel = "Kỳ trước";
                unit = "kỳ";
            }
            case "CUSTOM" -> {
                start = (customFrom != null) ? customFrom : today.with(TemporalAdjusters.firstDayOfMonth());
                end = (customTo != null) ? customTo : today;
                long len = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
                prevEnd = start.minusDays(1);
                prevStart = prevEnd.minusDays(len - 1);
                label = start.format(DISPLAY_DATE_FMT) + " - " + end.format(DISPLAY_DATE_FMT);
                prevLabel = prevStart.format(DISPLAY_DATE_FMT) + " - " + prevEnd.format(DISPLAY_DATE_FMT);
                unit = "kỳ";
            }
            case "THIS_MONTH" -> {
                start = today.with(TemporalAdjusters.firstDayOfMonth());
                end = today.with(TemporalAdjusters.lastDayOfMonth());
                LocalDate lastMonth = today.minusMonths(1);
                prevStart = lastMonth.with(TemporalAdjusters.firstDayOfMonth());
                prevEnd = lastMonth.with(TemporalAdjusters.lastDayOfMonth());
                label = "Tháng này (" + start.getMonthValue() + "/" + start.getYear() + ")";
                prevLabel = "Tháng trước (" + prevStart.getMonthValue() + "/" + prevStart.getYear() + ")";
                unit = "tháng";
            }
            default -> { // Mặc định tháng hiện tại
                start = today.with(TemporalAdjusters.firstDayOfMonth());
                end = today.with(TemporalAdjusters.lastDayOfMonth());
                LocalDate lastMonth = today.minusMonths(1);
                prevStart = lastMonth.with(TemporalAdjusters.firstDayOfMonth());
                prevEnd = lastMonth.with(TemporalAdjusters.lastDayOfMonth());
                label = "Tháng này (" + start.getMonthValue() + "/" + start.getYear() + ")";
                prevLabel = "Tháng trước (" + prevStart.getMonthValue() + "/" + prevStart.getYear() + ")";
                unit = "tháng";
            }
        }

        return new PeriodWindow(start, end, prevStart, prevEnd, label, prevLabel, unit);
    }
}
