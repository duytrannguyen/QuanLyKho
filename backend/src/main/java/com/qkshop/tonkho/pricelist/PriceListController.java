package com.qkshop.tonkho.pricelist;

import com.qkshop.tonkho.catalog.PlatformRepository;
import com.qkshop.tonkho.catalog.Platform;
import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.catalog.VariantV2Repository;
import com.qkshop.tonkho.sale.SalesConfig;
import com.qkshop.tonkho.sale.SalesConfigRepository;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.core.dto.ApiResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * API phục vụ chức năng tạo & in bảng giá theo nhóm sản phẩm.
 *
 * Nguồn giá: ActiveInventory.salePrice (giá thực tế từ lần nhập gần nhất)
 * Nếu không có máy trong kho → fallback về SalesConfig.defaultSalePrice
 */
@RestController
@RequestMapping("/api/pricelist")
@RequiredArgsConstructor
@Slf4j
public class PriceListController {

    private final PlatformRepository platformRepo;
    private final VariantV2Repository variantRepo;
    private final SalesConfigRepository configRepo;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final JasperReportService jasperReportService;

    /**
     * Lấy danh sách các Model/Platform theo Dòng máy (ModelLine),
     * kèm danh sách mô tả cấu hình đầy đủ để hiển thị ngay tại Bước 1 chọn nhóm máy.
     */
    @GetMapping("/platforms")
    public ResponseEntity<ApiResponse<List<PlatformPriceListDTO>>> getPlatformsByModelLine(
            @RequestParam(required = false) String modelLineId) {

        List<Platform> platforms;
        if (modelLineId != null && !modelLineId.trim().isEmpty()) {
            platforms = platformRepo.findByModelLineIdWithHierarchy(modelLineId.trim());
        } else {
            platforms = platformRepo.findAllActiveWithHierarchy();
        }

        if (platforms.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(Collections.emptyList()));
        }

        Map<String, List<PriceListItemDTO>> itemsByPlatformId = buildConfigsForPlatformsBatch(platforms);

        List<PlatformPriceListDTO> result = new ArrayList<>();
        for (Platform platform : platforms) {
            List<PriceListItemDTO> items = itemsByPlatformId.getOrDefault(platform.getPlatformId(), Collections.emptyList());

            Set<String> configSummaries = new LinkedHashSet<>();
            List<PriceListItemDTO> validItems = new ArrayList<>();
            for (PriceListItemDTO item : items) {
                String summary = formatConfigSummary(item, platform.getDisplayName());
                if (summary != null && !summary.isBlank()) {
                    configSummaries.add(summary);
                    item.setConfigName(summary);
                }
                validItems.add(item);
            }

            List<String> finalConfigs = new ArrayList<>(configSummaries);
            if (finalConfigs.size() > 1) {
                finalConfigs.removeIf(c -> c.toUpperCase().contains("CHƯA GHI NHẬN") || c.toUpperCase().contains("CH?A GHI NH?N"));
            }

            PlatformPriceListDTO dto = PlatformPriceListDTO.builder()
                    .platformId(platform.getPlatformId())
                    .platformCode(platform.getPlatformCode())
                    .displayName(platform.getDisplayName())
                    .modelLineId(platform.getModelLine() != null ? platform.getModelLine().getModelLineId() : null)
                    .modelLineName(platform.getModelLine() != null ? platform.getModelLine().getModelLineName() : null)
                    .brandName(platform.getModelLine() != null && platform.getModelLine().getBrand() != null 
                            ? platform.getModelLine().getBrand().getBrandName() : null)
                    .configs(finalConfigs)
                    .configItems(validItems)
                    .build();

            result.add(dto);
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * Lấy danh sách cấu hình-giá cho một hoặc nhiều Platform.
     * Frontend gửi: ?platformIds=PF-001,PF-002,...
     *
     * Nguồn giá (ưu tiên):
     *   1. Giá mới nhất từ ActiveInventory.salePrice (máy đang tồn kho)
     *   2. SalesConfig.defaultSalePrice (fallback)
     */
    @GetMapping("/configs-by-group")
    public ResponseEntity<ApiResponse<List<PriceListItemDTO>>> getConfigsByGroup(
            @RequestParam(required = false, defaultValue = "") String platformIds) {

        List<PriceListItemDTO> items = new ArrayList<>();
        if (platformIds == null || platformIds.trim().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(items));
        }

        List<String> requestedIds = Arrays.stream(platformIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());

        if (requestedIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(items));
        }

        List<Platform> platforms = platformRepo.findByPlatformIdInWithHierarchy(requestedIds);
        Map<String, Platform> platformById = platforms.stream()
                .collect(Collectors.toMap(Platform::getPlatformId, p -> p, (a, b) -> a));

        Map<String, List<PriceListItemDTO>> itemsByPlatformId = buildConfigsForPlatformsBatch(platforms);

        for (String platformId : requestedIds) {
            if (!platformById.containsKey(platformId)) {
                log.warn("[PriceList] Không tìm thấy platform: {}", platformId);
                continue;
            }
            items.addAll(itemsByPlatformId.getOrDefault(platformId, Collections.emptyList()));
        }

        log.info("[PriceList] Trả về {} items cho platformIds: {}", items.size(), platformIds);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    /**
     * Tải hàng loạt (Batch Load) toàn bộ cấu hình và tồn kho cho danh sách Platform chỉ trong 3 truy vấn SQL.
     */
    private Map<String, List<PriceListItemDTO>> buildConfigsForPlatformsBatch(List<Platform> platforms) {
        if (platforms == null || platforms.isEmpty()) {
            return Collections.emptyMap();
        }

        List<String> platformIds = platforms.stream()
                .map(Platform::getPlatformId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        List<ActiveInventory> allInventories = activeInventoryRepo.findByPlatformIds(platformIds);
        Map<String, List<ActiveInventory>> inventoriesByPlatformId = allInventories.stream()
                .filter(ai -> ai.getConfig() != null && ai.getConfig().getVariant() != null
                        && ai.getConfig().getVariant().getPlatform() != null)
                .collect(Collectors.groupingBy(ai -> ai.getConfig().getVariant().getPlatform().getPlatformId()));

        List<VariantV2> allVariants = variantRepo.findByPlatformIdsAndActiveTrue(platformIds);
        Map<String, List<VariantV2>> variantsByPlatformId = allVariants.stream()
                .filter(v -> v.getPlatform() != null)
                .collect(Collectors.groupingBy(v -> v.getPlatform().getPlatformId()));

        List<String> variantIds = allVariants.stream()
                .map(VariantV2::getVariantId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<String, List<SalesConfig>> configsByVariantId = variantIds.isEmpty()
                ? Collections.emptyMap()
                : configRepo.findByVariantIdsAndActiveTrue(variantIds).stream()
                        .filter(sc -> sc.getVariant() != null)
                        .collect(Collectors.groupingBy(sc -> sc.getVariant().getVariantId()));

        Map<String, List<PriceListItemDTO>> result = new HashMap<>();
        for (Platform platform : platforms) {
            String pid = platform.getPlatformId();
            List<ActiveInventory> inventories = inventoriesByPlatformId.getOrDefault(pid, Collections.emptyList());
            List<VariantV2> variants = variantsByPlatformId.getOrDefault(pid, Collections.emptyList());
            result.put(pid, assembleConfigsForPlatform(platform, inventories, variants, configsByVariantId));
        }
        return result;
    }

    /**
     * Lấy danh sách DTO cấu hình cho một Platform duy nhất.
     */
    public List<PriceListItemDTO> getConfigsForPlatform(Platform platform) {
        Map<String, List<PriceListItemDTO>> batch = buildConfigsForPlatformsBatch(List.of(platform));
        return batch.getOrDefault(platform.getPlatformId(), Collections.emptyList());
    }

    private List<PriceListItemDTO> assembleConfigsForPlatform(
            Platform platform,
            List<ActiveInventory> inventories,
            List<VariantV2> variants,
            Map<String, List<SalesConfig>> configsByVariantId) {
        List<PriceListItemDTO> items = new ArrayList<>();
        String platformId = platform.getPlatformId();

        // Gom nhóm theo configId → lấy giá mới nhất (intakeAt lớn nhất)
        Map<String, BigDecimal> latestPriceByConfigId = inventories.stream()
                .filter(ai -> ai.getConfig() != null && ai.getSalePrice() != null
                        && ai.getSalePrice().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(ActiveInventory::getIntakeAt,
                        Comparator.nullsFirst(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toMap(
                        ai -> ai.getConfig().getConfigId(),
                        ActiveInventory::getSalePrice,
                        (existing, replacement) -> existing
                ));

        // Đếm số máy READY theo configId
        Map<String, Long> readyCountByConfigId = inventories.stream()
                .filter(ai -> ai.getConfig() != null && CycleState.READY.equals(ai.getState()))
                .collect(Collectors.groupingBy(ai -> ai.getConfig().getConfigId(), Collectors.counting()));

        // Đếm tổng máy (mọi trạng thái) theo configId
        Map<String, Long> totalCountByConfigId = inventories.stream()
                .filter(ai -> ai.getConfig() != null)
                .collect(Collectors.groupingBy(ai -> ai.getConfig().getConfigId(), Collectors.counting()));

        for (VariantV2 variant : variants) {
            List<SalesConfig> configs = configsByVariantId.getOrDefault(variant.getVariantId(), Collections.emptyList());
            for (SalesConfig config : configs) {
                BigDecimal price = latestPriceByConfigId.get(config.getConfigId());
                if (price == null || price.compareTo(BigDecimal.ZERO) == 0) {
                    price = config.getDefaultSalePrice();
                }

                long readyCount = readyCountByConfigId.getOrDefault(config.getConfigId(), 0L);
                long totalCount = totalCountByConfigId.getOrDefault(config.getConfigId(), 0L);

                PriceListItemDTO dto = PriceListItemDTO.builder()
                        .configId(config.getConfigId())
                        .platformId(platform.getPlatformId())
                        .platformCode(platform.getPlatformCode())
                        .platformName(platform.getDisplayName())
                        .configName(config.getDisplayName())
                        .cpuCode(variant.getCpuCode())
                        .gpuCode(variant.getGpuCode())
                        .ramCode(config.getRamCode())
                        .ssdCode(config.getSsdCode())
                        .screenSpec(variant.getScreenSize())
                        .defaultSalePrice(price)
                        .stockTotal(totalCount)
                        .stockReady(readyCount)
                        .build();
                items.add(dto);
            }
        }

        // Xử lý trường hợp có máy trong kho nhưng chưa có SalesConfig đúng
        Set<String> handledConfigIds = items.stream()
                .map(PriceListItemDTO::getConfigId)
                .collect(Collectors.toSet());

        inventories.stream()
                .filter(ai -> ai.getConfig() != null && !handledConfigIds.contains(ai.getConfig().getConfigId()))
                .collect(Collectors.toMap(
                        ai -> ai.getConfig().getConfigId(),
                        ai -> ai,
                        (a, b) -> a.getIntakeAt() != null && b.getIntakeAt() != null && a.getIntakeAt().isAfter(b.getIntakeAt()) ? a : b
                ))
                .values()
                .forEach(ai -> {
                    BigDecimal price = latestPriceByConfigId.get(ai.getConfig().getConfigId());
                    long readyCount = readyCountByConfigId.getOrDefault(ai.getConfig().getConfigId(), 0L);
                    long totalCount = totalCountByConfigId.getOrDefault(ai.getConfig().getConfigId(), 0L);

                    PriceListItemDTO dto = PriceListItemDTO.builder()
                            .configId(ai.getConfig().getConfigId())
                            .platformId(platformId)
                            .platformCode(platform.getPlatformCode())
                            .platformName(platform.getDisplayName())
                            .configName(ai.getConfig().getDisplayName())
                            .cpuCode(ai.getConfig().getVariant() != null ? ai.getConfig().getVariant().getCpuCode() : null)
                            .gpuCode(ai.getConfig().getVariant() != null ? ai.getConfig().getVariant().getGpuCode() : null)
                            .ramCode(ai.getConfig().getRamCode())
                            .ssdCode(ai.getConfig().getSsdCode())
                            .screenSpec(ai.getConfig().getVariant() != null ? ai.getConfig().getVariant().getScreenSize() : null)
                            .defaultSalePrice(price)
                            .stockTotal(totalCount)
                            .stockReady(readyCount)
                            .build();
                    items.add(dto);
                });

        return items;
    }

    private String formatConfigSummary(PriceListItemDTO dto, String platformName) {
        String name = dto.getConfigName();
        if (name != null && !name.isBlank()) {
            String cleaned = name.trim();
            if (platformName != null && !platformName.isBlank()) {
                String pattern = "^" + java.util.regex.Pattern.quote(platformName) + "\\s*([·\\-\\–\\/]\\s*)?";
                cleaned = cleaned.replaceAll("(?i)" + pattern, "");
            }
            if (dto.getPlatformCode() != null && !dto.getPlatformCode().isBlank()) {
                String patternCode = "^" + java.util.regex.Pattern.quote(dto.getPlatformCode()) + "\\s*([·\\-\\–\\/]\\s*)?";
                cleaned = cleaned.replaceAll("(?i)" + patternCode, "");
            }
            cleaned = cleaned.trim();
            if (!cleaned.isEmpty() && !cleaned.equalsIgnoreCase(platformName)) {
                return cleaned;
            }
        }

        List<String> parts = new ArrayList<>();
        if (dto.getCpuCode() != null && !dto.getCpuCode().isBlank() && !dto.getCpuCode().equalsIgnoreCase("N/A")) {
            parts.add(dto.getCpuCode().trim());
        }
        if (dto.getRamCode() != null && !dto.getRamCode().isBlank() 
                && !dto.getRamCode().toUpperCase().contains("CHƯA") && !dto.getRamCode().toUpperCase().contains("CH?A")) {
            String ram = dto.getRamCode().trim();
            parts.add(ram.toUpperCase().startsWith("RAM") ? ram : "RAM " + ram);
        }
        if (dto.getSsdCode() != null && !dto.getSsdCode().isBlank() 
                && !dto.getSsdCode().toUpperCase().contains("CHƯA") && !dto.getSsdCode().toUpperCase().contains("CH?A")) {
            String ssd = dto.getSsdCode().trim();
            parts.add(ssd.toUpperCase().startsWith("SSD") ? ssd : "SSD " + ssd);
        }
        if (dto.getScreenSpec() != null && !dto.getScreenSpec().isBlank()) {
            parts.add(dto.getScreenSpec().trim());
        }
        if (dto.getGpuCode() != null && !dto.getGpuCode().isBlank() 
                && !dto.getGpuCode().equalsIgnoreCase("ONBOARD") && !dto.getGpuCode().equalsIgnoreCase("N/A")) {
            parts.add(dto.getGpuCode().trim());
        }
        return parts.isEmpty() ? null : String.join(" / ", parts);
    }

    /**
     * Export PDF bảng giá dùng JasperReports.
     * Nhận pageSize ("A4"/"A5") và danh sách items từ frontend.
     */
    @PostMapping(value = "/export-pdf", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportPdf(@RequestBody ExportPdfRequest request) {
        try {
            List<PriceListItemDTO> items = request.getItems();
            String pageSize = request.getPageSize() != null ? request.getPageSize().toUpperCase() : "A4";

            if (items == null || items.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            // Đường dẫn logo
            String logoPath;
            try {
                logoPath = new ClassPathResource("static/qkshop_logo.png").getURL().toString();
            } catch (Exception ex) {
                logoPath = null;
            }

            byte[] pdf = jasperReportService.exportPriceListPdf(items, logoPath, pageSize);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "bang_gia_qkshop.pdf");
            return ResponseEntity.ok().headers(headers).body(pdf);

        } catch (Exception e) {
            log.error("[PriceList] Lỗi khi tạo PDF: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
