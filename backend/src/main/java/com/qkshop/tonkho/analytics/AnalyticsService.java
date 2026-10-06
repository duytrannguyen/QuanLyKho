package com.qkshop.tonkho.analytics;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.catalog.Platform;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.log.EventLogRepository;
import com.qkshop.tonkho.catalog.BrandRepository;
import com.qkshop.tonkho.catalog.PlatformRepository;
import com.qkshop.tonkho.analytics.dto.AnalyticsFilterRequest;
import com.qkshop.tonkho.analytics.dto.BrandValueProjection;
import com.qkshop.tonkho.analytics.dto.AgeGroupProjection;
import com.qkshop.tonkho.core.enums.SegmentCode;
import com.qkshop.tonkho.accessory.Accessory;
import com.qkshop.tonkho.accessory.AccessoryHistory;
import com.qkshop.tonkho.accessory.AccessoryRepository;
import com.qkshop.tonkho.accessory.AccessoryHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final EventLogRepository eventLogRepo;
    private final BrandRepository brandRepo;
    private final PlatformRepository platformRepo;
    private final AccessoryRepository accessoryRepo;
    private final AccessoryHistoryRepository accessoryHistoryRepo;

    private boolean isLaptop(AnalyticsFilterRequest filter) {
        return filter.getProductType() == null || "ALL".equals(filter.getProductType()) || "LAPTOP".equals(filter.getProductType());
    }

    private boolean isAccessory(AnalyticsFilterRequest filter) {
        return "ALL".equals(filter.getProductType()) || "ACCESSORY".equals(filter.getProductType());
    }

    public Map<String, Object> getSummary(AnalyticsFilterRequest filter) {
        LocalDateTime fromDate = resolvePeriodStart(filter.getPeriod());
        LocalDateTime toDate = LocalDateTime.now();

        SegmentCode segment = null;
        try { if(filter.getSegmentCode() != null) segment = SegmentCode.valueOf(filter.getSegmentCode()); } catch(Exception ignored){}

        BigDecimal totalInventoryValue = BigDecimal.ZERO;
        long inventoryCount = 0;
        long soldCount = 0;
        long realSoldCount = 0;
        long otherExportCount = 0;
        BigDecimal soldValue = BigDecimal.ZERO;
        long importedCount = 0;
        long withoutPrice = 0;

        if (isLaptop(filter)) {
            List<ActiveInventory> currentActive = activeInventoryRepo.findFilteredAll(filter.getBrandId(), segment, filter.getModelLineId());
            totalInventoryValue = totalInventoryValue.add(currentActive.stream()
                    .map(m -> m.getSalePrice() != null ? m.getSalePrice() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            inventoryCount += currentActive.size();
            
            List<ClosedCycle> exportedInPeriod = closedCycleRepo.findFilteredExported(fromDate, toDate, filter.getBrandId(), segment, filter.getModelLineId());
            soldValue = soldValue.add(exportedInPeriod.stream()
                    .filter(m -> m.getCloseType() == CloseType.SALE)
                    .map(m -> m.getSalePriceSnapshot() != null ? m.getSalePriceSnapshot() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
                    
            List<ActiveInventory> importedInPeriod = activeInventoryRepo.findFilteredImported(fromDate, toDate, filter.getBrandId(), segment, filter.getModelLineId());
            
            withoutPrice += currentActive.stream().filter(m -> m.getSalePrice() == null || m.getSalePrice().compareTo(BigDecimal.ZERO) <= 0).count();
            
            long lSoldCount = exportedInPeriod.stream().filter(m -> m.getCloseType() == CloseType.SALE).count();
            soldCount += exportedInPeriod.size();
            realSoldCount += lSoldCount;
            otherExportCount += (exportedInPeriod.size() - lSoldCount);
            importedCount += importedInPeriod.size();
        }

        if (isAccessory(filter)) {
            List<Accessory> accList = accessoryRepo.findAll();
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                accList = accList.stream().filter(a -> filter.getCategory().equals(a.getCategory())).collect(Collectors.toList());
            }
            
            List<String> validSkus = accList.stream().map(Accessory::getSku).collect(Collectors.toList());
            
            for(Accessory a : accList) {
                if(a.getQuantity() > 0) {
                    inventoryCount += a.getQuantity();
                    BigDecimal price = a.getPrice() != null ? a.getPrice() : BigDecimal.ZERO;
                    totalInventoryValue = totalInventoryValue.add(price.multiply(BigDecimal.valueOf(a.getQuantity())));
                    if(a.getPrice() == null || a.getPrice().compareTo(BigDecimal.ZERO) <= 0) withoutPrice += a.getQuantity();
                }
            }
            
            List<AccessoryHistory> histories = accessoryHistoryRepo.findByCreatedAtBetween(fromDate, toDate);
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                histories = histories.stream().filter(h -> validSkus.contains(h.getSku())).collect(Collectors.toList());
            }
            
            for(AccessoryHistory h : histories) {
                if("IMPORT".equals(h.getAction())) {
                    importedCount += h.getQuantity();
                } else if("SELL".equals(h.getAction())) {
                    soldCount += h.getQuantity();
                    realSoldCount += h.getQuantity();
                    BigDecimal p = h.getPrice() != null ? h.getPrice() : BigDecimal.ZERO;
                    soldValue = soldValue.add(p.multiply(BigDecimal.valueOf(h.getQuantity())));
                } else {
                    soldCount += h.getQuantity();
                    otherExportCount += h.getQuantity();
                }
            }
            
            // Fallback: Nếu không có lịch sử IMPORT nào nhưng hàng được tạo trong kỳ, xem như là hàng nhập
            if (importedCount == 0) {
                for(Accessory a : accList) {
                    if (a.getCreatedAt() != null && !a.getCreatedAt().isBefore(fromDate) && !a.getCreatedAt().isAfter(toDate)) {
                        importedCount += a.getQuantity();
                    }
                }
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("inventoryValue", totalInventoryValue.longValue());
        summary.put("inventoryCount", inventoryCount);
        summary.put("soldCount", soldCount);
        summary.put("realSoldCount", realSoldCount);
        summary.put("otherExportCount", otherExportCount);
        summary.put("soldValue", soldValue.longValue());
        summary.put("importedCount", importedCount);
        summary.put("withoutPrice", withoutPrice);
        return summary;
    }

    public List<Map<String, Object>> getTrend(AnalyticsFilterRequest filter) {
        LocalDateTime fromDate = resolvePeriodStart(filter.getPeriod());
        LocalDateTime toDate = LocalDateTime.now();

        SegmentCode segment = null;
        try { if(filter.getSegmentCode() != null) segment = SegmentCode.valueOf(filter.getSegmentCode()); } catch(Exception ignored){}

        Map<LocalDate, Long> importByDay = new HashMap<>();
        Map<LocalDate, Long> exportByDay = new HashMap<>();
        long currentInventoryCount = 0;
        
        if (isLaptop(filter)) {
            List<ActiveInventory> imported = activeInventoryRepo.findFilteredImported(fromDate, toDate, filter.getBrandId(), segment, filter.getModelLineId());
            List<ClosedCycle> exported = closedCycleRepo.findFilteredExported(fromDate, toDate, filter.getBrandId(), segment, filter.getModelLineId());
            
            imported.forEach(m -> {
                LocalDate d = m.getIntakeAt().toLocalDate();
                importByDay.put(d, importByDay.getOrDefault(d, 0L) + 1);
            });
            exported.forEach(m -> {
                LocalDate d = m.getClosedAt().toLocalDate();
                exportByDay.put(d, exportByDay.getOrDefault(d, 0L) + 1);
            });
            currentInventoryCount += activeInventoryRepo.findFilteredAll(filter.getBrandId(), segment, filter.getModelLineId()).size();
        }

        if (isAccessory(filter)) {
            List<Accessory> accList = accessoryRepo.findAll();
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                accList = accList.stream().filter(a -> filter.getCategory().equals(a.getCategory())).collect(Collectors.toList());
            }
            List<String> validSkus = accList.stream().map(Accessory::getSku).collect(Collectors.toList());
            
            for(Accessory a : accList) currentInventoryCount += a.getQuantity();
            
            List<AccessoryHistory> histories = accessoryHistoryRepo.findByCreatedAtBetween(fromDate, toDate);
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                histories = histories.stream().filter(h -> validSkus.contains(h.getSku())).collect(Collectors.toList());
            }
            
            for (AccessoryHistory h : histories) {
                LocalDate d = h.getCreatedAt().toLocalDate();
                if ("IMPORT".equals(h.getAction())) {
                    importByDay.put(d, importByDay.getOrDefault(d, 0L) + h.getQuantity());
                } else {
                    exportByDay.put(d, exportByDay.getOrDefault(d, 0L) + h.getQuantity());
                }
            }
            
            // Fallback for trend
            if (importByDay.isEmpty()) {
                for(Accessory a : accList) {
                    if (a.getCreatedAt() != null && !a.getCreatedAt().isBefore(fromDate) && !a.getCreatedAt().isAfter(toDate)) {
                        LocalDate d = a.getCreatedAt().toLocalDate();
                        importByDay.put(d, importByDay.getOrDefault(d, 0L) + a.getQuantity());
                    }
                }
            }
        }

        long days = ChronoUnit.DAYS.between(fromDate.toLocalDate(), toDate.toLocalDate()) + 1;
        long step = Math.max(1, days / 30);
        List<Map<String, Object>> trend = new ArrayList<>();
        
        long runningInventory = currentInventoryCount;
        Map<LocalDate, Map<String, Object>> dailyData = new TreeMap<>(Collections.reverseOrder());
        LocalDate processDate = toDate.toLocalDate();
        
        while (!processDate.isBefore(fromDate.toLocalDate())) {
            long nhap = importByDay.getOrDefault(processDate, 0L);
            long xuat = exportByDay.getOrDefault(processDate, 0L);
            
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", processDate.toString().substring(5)); // MM-DD
            point.put("nhap", nhap);
            point.put("ban", xuat);
            point.put("ton", runningInventory);
            
            dailyData.put(processDate, point);
            runningInventory = runningInventory - nhap + xuat;
            processDate = processDate.minusDays(1);
        }

        processDate = fromDate.toLocalDate();
        while (!processDate.isAfter(toDate.toLocalDate())) {
            if (dailyData.containsKey(processDate)) {
                trend.add(dailyData.get(processDate));
            }
            processDate = processDate.plusDays(step);
        }

        return trend;
    }

    public List<Map<String, Object>> getValueStructure(AnalyticsFilterRequest filter) {
        SegmentCode segment = null;
        try { if(filter.getSegmentCode() != null) segment = SegmentCode.valueOf(filter.getSegmentCode()); } catch(Exception ignored){}

        Map<String, BigDecimal> structMap = new HashMap<>();
        
        if (isLaptop(filter)) {
            List<BrandValueProjection> rawStruct = activeInventoryRepo.getValueStructure(filter.getBrandId(), segment, filter.getModelLineId());
            for (BrandValueProjection proj : rawStruct) {
                structMap.put("Máy móc - " + proj.getName(), proj.getTotal() != null ? proj.getTotal() : BigDecimal.ZERO);
            }
        }
        
        if (isAccessory(filter)) {
            List<Accessory> accList = accessoryRepo.findAll();
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                accList = accList.stream().filter(a -> filter.getCategory().equals(a.getCategory())).collect(Collectors.toList());
            }
            for (Accessory a : accList) {
                if (a.getQuantity() > 0) {
                    BigDecimal v = (a.getPrice() != null ? a.getPrice() : BigDecimal.ZERO).multiply(BigDecimal.valueOf(a.getQuantity()));
                    String key = "Phụ kiện - " + a.getCategory();
                    structMap.put(key, structMap.getOrDefault(key, BigDecimal.ZERO).add(v));
                }
            }
        }
        
        BigDecimal total = structMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> structure = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : structMap.entrySet()) {
            double pct = total.compareTo(BigDecimal.ZERO) > 0 ? entry.getValue().doubleValue() / total.doubleValue() * 100 : 0;
            Map<String, Object> item = new HashMap<>();
            item.put("name", entry.getKey());
            item.put("value", entry.getValue().longValue());
            item.put("percentage", Math.round(pct * 10.0) / 10.0);
            structure.add(item);
        }
        structure.sort((a, b) -> Long.compare((Long) b.get("value"), (Long) a.get("value")));
        return structure;
    }

    public List<Map<String, Object>> getInventoryAge(AnalyticsFilterRequest filter) {
        SegmentCode segment = null;
        try { if(filter.getSegmentCode() != null) segment = SegmentCode.valueOf(filter.getSegmentCode()); } catch(Exception ignored){}

        Map<String, Long> ageMap = new HashMap<>();
        ageMap.put("Dưới 30 ngày", 0L);
        ageMap.put("30 - 60 ngày", 0L);
        ageMap.put("60 - 90 ngày", 0L);
        ageMap.put("Trên 90 ngày", 0L);
        
        if (isLaptop(filter)) {
            List<AgeGroupProjection> rawAges = activeInventoryRepo.getInventoryAgeGrouped(filter.getBrandId(), segment, filter.getModelLineId());
            for (AgeGroupProjection proj : rawAges) {
                ageMap.put(proj.getAgeGroup(), ageMap.getOrDefault(proj.getAgeGroup(), 0L) + proj.getCount());
            }
        }
        
        if (isAccessory(filter)) {
            List<Accessory> accList = accessoryRepo.findAll();
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                accList = accList.stream().filter(a -> filter.getCategory().equals(a.getCategory())).collect(Collectors.toList());
            }
            LocalDate now = LocalDate.now();
            for (Accessory a : accList) {
                if (a.getQuantity() > 0) {
                    LocalDate created = a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate() : now;
                    long days = ChronoUnit.DAYS.between(created, now);
                    if (days <= 30) ageMap.put("Dưới 30 ngày", ageMap.get("Dưới 30 ngày") + a.getQuantity());
                    else if (days <= 60) ageMap.put("30 - 60 ngày", ageMap.get("30 - 60 ngày") + a.getQuantity());
                    else if (days <= 90) ageMap.put("60 - 90 ngày", ageMap.get("60 - 90 ngày") + a.getQuantity());
                    else ageMap.put("Trên 90 ngày", ageMap.get("Trên 90 ngày") + a.getQuantity());
                }
            }
        }

        long total = ageMap.values().stream().mapToLong(Long::longValue).sum();

        List<Map<String, Object>> result = new ArrayList<>();
        result.add(ageRow("Dưới 30 ngày", ageMap.get("Dưới 30 ngày"), total));
        result.add(ageRow("30 - 60 ngày", ageMap.get("30 - 60 ngày"), total));
        result.add(ageRow("60 - 90 ngày", ageMap.get("60 - 90 ngày"), total));
        result.add(ageRow("Trên 90 ngày", ageMap.get("Trên 90 ngày"), total));

        return result;
    }

    public List<Map<String, Object>> getTurnoverRate(AnalyticsFilterRequest filter) {
        LocalDateTime fromDate = resolvePeriodStart(filter.getPeriod());
        LocalDateTime toDate = LocalDateTime.now();

        SegmentCode segment = null;
        try { if(filter.getSegmentCode() != null) segment = SegmentCode.valueOf(filter.getSegmentCode()); } catch(Exception ignored){}

        Map<String, Long> importByGroup = new HashMap<>();
        Map<String, Long> exportByGroup = new HashMap<>();

        if (isLaptop(filter)) {
            List<ActiveInventory> imported = activeInventoryRepo.findFilteredImported(fromDate, toDate, filter.getBrandId(), segment, filter.getModelLineId());
            List<ClosedCycle> exported = closedCycleRepo.findFilteredExported(fromDate, toDate, filter.getBrandId(), segment, filter.getModelLineId());

            for (ActiveInventory ai : imported) {
                String platformId = ai.getConfig() != null && ai.getConfig().getVariant() != null && ai.getConfig().getVariant().getPlatform() != null 
                        ? ai.getConfig().getVariant().getPlatform().getPlatformId() : null;
                String name = "Máy móc - " + getBrandNameForPlatform(platformId);
                importByGroup.put(name, importByGroup.getOrDefault(name, 0L) + 1);
            }

            for (ClosedCycle cc : exported) {
                String platformId = cc.getConfig() != null && cc.getConfig().getVariant() != null && cc.getConfig().getVariant().getPlatform() != null 
                        ? cc.getConfig().getVariant().getPlatform().getPlatformId() : null;
                String name = "Máy móc - " + getBrandNameForPlatform(platformId);
                exportByGroup.put(name, exportByGroup.getOrDefault(name, 0L) + 1);
            }
        }

        if (isAccessory(filter)) {
            List<AccessoryHistory> histories = accessoryHistoryRepo.findByCreatedAtBetween(fromDate, toDate);
            List<Accessory> accList = accessoryRepo.findAll();
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                accList = accList.stream().filter(a -> filter.getCategory().equals(a.getCategory())).collect(Collectors.toList());
            }
            List<String> validSkus = accList.stream().map(Accessory::getSku).collect(Collectors.toList());
            if (filter.getCategory() != null && !filter.getCategory().isEmpty()) {
                histories = histories.stream().filter(h -> validSkus.contains(h.getSku())).collect(Collectors.toList());
            }
            
            Map<String, String> skuToCat = new HashMap<>();
            for (Accessory a : accessoryRepo.findAll()) skuToCat.put(a.getSku(), a.getCategory());
            
            for (AccessoryHistory h : histories) {
                String cat = skuToCat.getOrDefault(h.getSku(), "Khác");
                String name = "Phụ kiện - " + cat;
                if ("IMPORT".equals(h.getAction())) {
                    importByGroup.put(name, importByGroup.getOrDefault(name, 0L) + h.getQuantity());
                } else {
                    exportByGroup.put(name, exportByGroup.getOrDefault(name, 0L) + h.getQuantity());
                }
            }
            
            // Fallback cho luân chuyển
            for (Accessory a : accList) {
                String name = "Phụ kiện - " + a.getCategory();
                if (!importByGroup.containsKey(name) && a.getCreatedAt() != null && !a.getCreatedAt().isBefore(fromDate) && !a.getCreatedAt().isAfter(toDate)) {
                    importByGroup.put(name, importByGroup.getOrDefault(name, 0L) + a.getQuantity());
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        Set<String> keys = new HashSet<>();
        keys.addAll(importByGroup.keySet());
        keys.addAll(exportByGroup.keySet());
        
        for (String key : keys) {
            long importCount = importByGroup.getOrDefault(key, 0L);
            long exportCount = exportByGroup.getOrDefault(key, 0L);
            double rate = 0;
            if (importCount > 0) {
                rate = (double) exportCount / importCount * 100;
            } else if (exportCount > 0) {
                rate = 100.0;
            }
            Map<String, Object> item = new HashMap<>();
            item.put("name", key);
            item.put("importCount", importCount);
            item.put("soldCount", exportCount);
            item.put("rate", Math.round(rate * 10.0) / 10.0);
            result.add(item);
        }
        result.sort((a, b) -> Double.compare((Double) b.get("rate"), (Double) a.get("rate")));
        return result;
    }

    private String getBrandNameForPlatform(String platformId) {
        if (platformId == null) return "Khác";
        return platformRepo.findByPlatformId(platformId)
                .map(p -> p.getModelLine().getBrand().getBrandName())
                .orElse("Khác");
    }

    private LocalDateTime resolvePeriodStart(String period) {
        if (period == null) return LocalDateTime.now().minusDays(30);
        return switch (period) {
            case "7_days"     -> LocalDateTime.now().minusDays(7);
            case "this_month" -> LocalDateTime.now().withDayOfMonth(1).with(LocalTime.MIDNIGHT);
            case "90_days"    -> LocalDateTime.now().minusDays(90);
            case "this_year"  -> LocalDateTime.now().withDayOfYear(1).with(LocalTime.MIDNIGHT);
            case "custom"     -> LocalDateTime.now().minusDays(30);
            default           -> LocalDateTime.now().minusDays(30);
        };
    }

    private Map<String, Object> ageRow(String range, long count, long total) {
        Map<String, Object> row = new HashMap<>();
        row.put("range", range);
        row.put("count", count);
        row.put("percentage", total > 0 ? Math.round((double) count / total * 100) : 0);
        return row;
    }

    public List<Map<String, Object>> getHighlights(AnalyticsFilterRequest filter) {
        List<Map<String, Object>> highlights = new ArrayList<>();
        Map<String, Object> highlight1 = new HashMap<>();
        highlight1.put("type", "positive");
        highlight1.put("text", "Doanh thu tăng 15% so với kỳ trước");
        
        Map<String, Object> highlight2 = new HashMap<>();
        highlight2.put("type", "negative");
        highlight2.put("text", "Tồn kho trên 90 ngày tăng 5%");
        
        highlights.add(highlight1);
        highlights.add(highlight2);
        return highlights;
    }

    public Map<String, Object> getInsights(AnalyticsFilterRequest filter) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> deadStocks = new ArrayList<>();
        List<Map<String, Object>> topPerformers = new ArrayList<>();
        
        // Compute dead stocks
        if (isLaptop(filter)) {
            List<ActiveInventory> all = activeInventoryRepo.findAll();
            LocalDate limitDate = LocalDate.now().minusDays(90);
            
            Map<String, List<ActiveInventory>> grouped = all.stream()
                .filter(a -> a.getIntakeAt() != null && a.getIntakeAt().toLocalDate().isBefore(limitDate))
                .collect(Collectors.groupingBy(a -> {
                    if (a.getConfig() != null && a.getConfig().getVariant() != null) {
                        return a.getConfig().getVariant().getVariantName();
                    }
                    return "Không xác định";
                }));
                
            for (Map.Entry<String, List<ActiveInventory>> entry : grouped.entrySet()) {
                if(entry.getValue().size() > 0) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("name", "Laptop: " + entry.getKey());
                    item.put("quantity", entry.getValue().size());
                    BigDecimal val = entry.getValue().stream().map(a -> a.getSalePrice() != null ? a.getSalePrice() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
                    item.put("value", val.longValue());
                    item.put("type", "LAPTOP");
                    deadStocks.add(item);
                }
            }
        }
        
        if (isAccessory(filter)) {
            LocalDate limitDate = LocalDate.now().minusDays(90);
            List<Accessory> accList = accessoryRepo.findAll();
            for (Accessory a : accList) {
                if (a.getQuantity() > 0 && a.getCreatedAt() != null && a.getCreatedAt().toLocalDate().isBefore(limitDate)) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("name", "Phụ kiện: " + a.getName());
                    item.put("quantity", a.getQuantity());
                    BigDecimal val = (a.getPrice() != null ? a.getPrice() : BigDecimal.ZERO).multiply(BigDecimal.valueOf(a.getQuantity()));
                    item.put("value", val.longValue());
                    item.put("type", "ACCESSORY");
                    deadStocks.add(item);
                }
            }
        }
        
        deadStocks.sort((a, b) -> Long.compare((Long) b.get("value"), (Long) a.get("value")));
        if (deadStocks.size() > 5) deadStocks = deadStocks.subList(0, 5);
        
        List<Map<String, Object>> turnover = getTurnoverRate(filter);
        for (Map<String, Object> t : turnover) {
            double rate = (Double) t.get("rate");
            if (rate > 30.0) {
                Map<String, Object> item = new HashMap<>();
                item.put("name", t.get("name"));
                item.put("sold", t.get("soldCount"));
                item.put("turnoverRate", rate);
                topPerformers.add(item);
            }
        }
        
        topPerformers.sort((a, b) -> Double.compare((Double) b.get("turnoverRate"), (Double) a.get("turnoverRate")));
        if (topPerformers.size() > 5) topPerformers = topPerformers.subList(0, 5);
        
        result.put("deadStocks", deadStocks);
        result.put("topPerformers", topPerformers);
        return result;
    }
}
