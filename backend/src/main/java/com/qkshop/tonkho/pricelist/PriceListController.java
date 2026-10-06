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
     * Lấy danh sách cấu hình-giá cho một hoặc nhiều Platform.
     * Frontend gửi: ?platformIds=PF-001,PF-002,...
     *
     * Nguồn giá (ưu tiên):
     *   1. Giá mới nhất từ ActiveInventory.salePrice (máy đang tồn kho)
     *   2. SalesConfig.defaultSalePrice (fallback)
     */
    @GetMapping("/configs-by-group")
    public ResponseEntity<ApiResponse<List<PriceListItemDTO>>> getConfigsByGroup(
            @RequestParam String platformIds) {

        List<PriceListItemDTO> items = new ArrayList<>();

        String[] ids = platformIds.split(",");
        for (String rawId : ids) {
            String platformId = rawId.trim();
            if (platformId.isEmpty()) continue;

            Platform platform = platformRepo.findByPlatformId(platformId).orElse(null);
            if (platform == null) {
                log.warn("[PriceList] Không tìm thấy platform: {}", platformId);
                continue;
            }

            // Lấy tất cả máy đang tồn kho của platform này (cả READY + NEEDS_INSPECTION)
            List<ActiveInventory> inventories = activeInventoryRepo.findByPlatformId(platformId);

            // Gom nhóm theo configId → lấy giá mới nhất (intakeAt lớn nhất)
            Map<String, BigDecimal> latestPriceByConfigId = inventories.stream()
                    .filter(ai -> ai.getConfig() != null && ai.getSalePrice() != null
                            && ai.getSalePrice().compareTo(BigDecimal.ZERO) > 0)
                    .sorted(Comparator.comparing(ActiveInventory::getIntakeAt,
                            Comparator.nullsFirst(Comparator.naturalOrder())).reversed())
                    .collect(Collectors.toMap(
                            ai -> ai.getConfig().getConfigId(),
                            ActiveInventory::getSalePrice,
                            (existing, replacement) -> existing // giữ giá mới nhất (đã sort desc)
                    ));

            // Đếm số máy READY theo configId
            Map<String, Long> readyCountByConfigId = inventories.stream()
                    .filter(ai -> ai.getConfig() != null && CycleState.READY.equals(ai.getState()))
                    .collect(Collectors.groupingBy(ai -> ai.getConfig().getConfigId(), Collectors.counting()));

            // Đếm tổng máy (mọi trạng thái) theo configId
            Map<String, Long> totalCountByConfigId = inventories.stream()
                    .filter(ai -> ai.getConfig() != null)
                    .collect(Collectors.groupingBy(ai -> ai.getConfig().getConfigId(), Collectors.counting()));

            // Lấy các variant của platform
            List<VariantV2> variants = variantRepo.findByPlatform_PlatformIdAndActiveTrue(platformId);
            for (VariantV2 variant : variants) {
                List<SalesConfig> configs = configRepo.findByVariant_VariantIdAndActiveTrue(variant.getVariantId());
                for (SalesConfig config : configs) {

                    // Ưu tiên 1: Giá từ ActiveInventory (thực tế)
                    BigDecimal price = latestPriceByConfigId.get(config.getConfigId());

                    // Ưu tiên 2: defaultSalePrice từ catalog
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
            // → thêm các configId từ inventory mà chưa có trong catalog
            Set<String> handledConfigIds = items.stream()
                    .map(PriceListItemDTO::getConfigId)
                    .collect(Collectors.toSet());

            inventories.stream()
                    .filter(ai -> ai.getConfig() != null && !handledConfigIds.contains(ai.getConfig().getConfigId()))
                    .collect(Collectors.toMap(
                            ai -> ai.getConfig().getConfigId(),
                            ai -> ai,
                            (a, b) -> a.getIntakeAt().isAfter(b.getIntakeAt()) ? a : b
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
        }

        log.info("[PriceList] Trả về {} items cho platformIds: {}", items.size(), platformIds);
        return ResponseEntity.ok(ApiResponse.ok(items));
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

    /**
     * Helper tái sử dụng: xây danh sách PriceListItemDTO từ platformIds.
     */
    private List<PriceListItemDTO> buildItems(String platformIds) {
        List<PriceListItemDTO> items = new ArrayList<>();
        String[] ids = platformIds.split(",");
        for (String rawId : ids) {
            String platformId = rawId.trim();
            if (platformId.isEmpty()) continue;

            Platform platform = platformRepo.findByPlatformId(platformId).orElse(null);
            if (platform == null) continue;

            List<ActiveInventory> inventories = activeInventoryRepo.findByPlatformId(platformId);

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

            Map<String, Long> readyCountByConfigId = inventories.stream()
                    .filter(ai -> ai.getConfig() != null && CycleState.READY.equals(ai.getState()))
                    .collect(Collectors.groupingBy(ai -> ai.getConfig().getConfigId(), Collectors.counting()));

            Map<String, Long> totalCountByConfigId = inventories.stream()
                    .filter(ai -> ai.getConfig() != null)
                    .collect(Collectors.groupingBy(ai -> ai.getConfig().getConfigId(), Collectors.counting()));

            List<VariantV2> variants = variantRepo.findByPlatform_PlatformIdAndActiveTrue(platformId);
            for (VariantV2 variant : variants) {
                List<SalesConfig> configs = configRepo.findByVariant_VariantIdAndActiveTrue(variant.getVariantId());
                for (SalesConfig config : configs) {
                    BigDecimal price = latestPriceByConfigId.get(config.getConfigId());
                    if (price == null || price.compareTo(BigDecimal.ZERO) == 0) {
                        price = config.getDefaultSalePrice();
                    }
                    items.add(PriceListItemDTO.builder()
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
                            .stockTotal(totalCountByConfigId.getOrDefault(config.getConfigId(), 0L))
                            .stockReady(readyCountByConfigId.getOrDefault(config.getConfigId(), 0L))
                            .build());
                }
            }
        }
        return items;
    }
}
