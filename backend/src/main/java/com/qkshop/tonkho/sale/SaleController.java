package com.qkshop.tonkho.sale;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.sale.SalesConfig;
import com.qkshop.tonkho.sale.SalesConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/sale")
@RequiredArgsConstructor
public class SaleController {

    private final InventoryCycleService inventoryCycleService;
    private final SalesConfigRepository salesConfigRepo;
    private final ClosedCycleRepository closedCycleRepository;
    private final com.qkshop.tonkho.machine.SerialRegistryRepository serialRegistryRepository;
    private final com.qkshop.tonkho.log.EventLogRepository eventLogRepository;

    @PostMapping("/lookup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> lookupSaleCandidate(@RequestBody Map<String, String> payload) {
        String serialKey = payload.get("serial");
        if (serialKey == null || serialKey.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập số Serial.");
        }
        
        ActiveInventory ai = inventoryCycleService.lookupSaleCandidate(serialKey);
        
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", ai.getId());
        result.put("cycleId", ai.getCycleId());
        result.put("serialKey", ai.getSerialKey());
        result.put("configId", ai.getConfig() != null ? ai.getConfig().getConfigId() : null);
        result.put("sourceModelText", ai.getSourceModelText());
        result.put("state", ai.getState().name());
        result.put("salePrice", ai.getSalePrice());
        result.put("intakeAt", ai.getIntakeAt());
        
        if (ai.getConfig() != null) {
            result.put("ram", ai.getConfig().getRamCode());
            result.put("ssd", ai.getConfig().getSsdCode());
        }
        
        ApiResponse<Map<String, Object>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(result);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<ClosedCycle>> submitSale(
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @RequestBody Map<String, Object> payload) {
        
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }

        String serialKey = (String) payload.get("serial");
        Object priceObj = payload.get("finalPrice");
        BigDecimal finalPrice = BigDecimal.ZERO;
        if (priceObj != null && !priceObj.toString().trim().isEmpty()) {
            finalPrice = new BigDecimal(priceObj.toString());
        }
        String salesperson = (String) payload.get("salesperson");
        if (salesperson == null) salesperson = "SYSTEM"; // Mock user

        ClosedCycle closed = inventoryCycleService.submitSale(requestId, serialKey, finalPrice, salesperson, payload);

        ApiResponse<ClosedCycle> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(closed);
        response.setRequestId(requestId);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/warranty")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> checkWarranty(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("BAD_REQUEST", "Vui lòng nhập từ khóa"));
        }
        
        List<ClosedCycle> list = closedCycleRepository.searchWarranty(keyword.trim());
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (ClosedCycle cc : list) {
            result.add(mapClosedCycleToDetail(cc));
        }
        
        ApiResponse<List<Map<String, Object>>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/order/{cycleId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOrderDetail(@PathVariable String cycleId) {
        ClosedCycle cc = closedCycleRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với mã chu kỳ: " + cycleId));
        return ResponseEntity.ok(ApiResponse.ok(mapClosedCycleToDetail(cc)));
    }

    private Map<String, Object> mapClosedCycleToDetail(ClosedCycle cc) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", cc.getId());
        map.put("cycleId", cc.getCycleId());
        map.put("serialKey", cc.getSerialKey());
        map.put("sourceModelText", cc.getSourceModelText());
        map.put("customerName", cc.getCustomerName());
        map.put("customerPhone", cc.getCustomerPhone());
        map.put("saleDate", cc.getSaleDate() != null ? cc.getSaleDate() : cc.getClosedAt());
        map.put("closedAt", cc.getClosedAt());
        map.put("intakeAt", cc.getIntakeAt());
        map.put("readyAt", cc.getReadyAt());
        map.put("intakeType", cc.getIntakeType() != null ? cc.getIntakeType().name() : null);
        map.put("warrantyPeriod", cc.getWarrantyPeriod());
        map.put("salePrice", cc.getSalePriceSnapshot());
        map.put("discount", cc.getDiscount());
        map.put("grossRevenue", cc.getGrossRevenue());
        map.put("paymentStatus", cc.getPaymentStatus());
        map.put("warrantyExpiry", cc.getWarrantyExpiry());
        map.put("productFullName", cc.getProductFullName());
        map.put("productSummary", cc.getProductSummary());
        map.put("sourceReference", cc.getSourceReference());
        map.put("closeReason", cc.getCloseReason());
        map.put("upgradeNote", cc.getUpgradeNote());
        map.put("saleNote", cc.getSaleNote());
        map.put("pausedDays", cc.getPausedDays());

        // Get salesperson from EventLog
        String salesperson = "Không rõ";
        if (cc.getCloseEventId() != null) {
            java.util.Optional<com.qkshop.tonkho.log.EventLog> eventOpt = eventLogRepository.findByEventId(cc.getCloseEventId());
            if (eventOpt.isPresent() && eventOpt.get().getActor() != null) {
                salesperson = eventOpt.get().getActor();
            }
        }
        map.put("salesperson", salesperson);

        // Check if voided/returned
        boolean isVoided = false;
        java.util.Optional<com.qkshop.tonkho.machine.SerialRegistry> regOpt = serialRegistryRepository.findBySerialKey(cc.getSerialKey());
        if (regOpt.isPresent()) {
            String currentCycle = regOpt.get().getCurrentCycleId();
            if (currentCycle != null && !currentCycle.equals(cc.getCycleId())) {
                isVoided = true;
            }
        }
        map.put("isVoided", isVoided);
        
        // Detailed laptop specifications
        String configInfo = "";
        if (cc.getConfig() != null) {
            com.qkshop.tonkho.sale.SalesConfig cfg = cc.getConfig();
            configInfo = cfg.getDisplayName();
            map.put("configId", cfg.getConfigId());
            map.put("configDisplayName", cfg.getDisplayName());
            map.put("ramCode", cfg.getRamCode());
            map.put("ssdCode", cfg.getSsdCode());
            map.put("defaultSalePrice", cfg.getDefaultSalePrice());

            if (cfg.getVariant() != null) {
                com.qkshop.tonkho.catalog.VariantV2 var = cfg.getVariant();
                map.put("cpuCode", var.getCpuCode());
                map.put("gpuCode", var.getGpuCode());
                map.put("screenSize", var.getScreenSize());
                map.put("touchFlag", var.getTouchFlag());
                map.put("variantName", var.getVariantName());

                if (var.getPlatform() != null) {
                    com.qkshop.tonkho.catalog.Platform pf = var.getPlatform();
                    map.put("platformCode", pf.getPlatformCode());
                    map.put("platformDisplayName", pf.getDisplayName());

                    if (pf.getModelLine() != null) {
                        com.qkshop.tonkho.catalog.ModelLine ml = pf.getModelLine();
                        map.put("modelLineName", ml.getModelLineName());
                        map.put("segmentCode", ml.getSegmentCode() != null ? ml.getSegmentCode().name() : null);

                        if (ml.getBrand() != null) {
                            map.put("brandName", ml.getBrand().getBrandName());
                        }
                    }
                }
            }
        }
        if (cc.getUpgradeNote() != null && !cc.getUpgradeNote().isEmpty()) {
            configInfo += " (Nâng cấp: " + cc.getUpgradeNote() + ")";
        }
        map.put("configInfo", configInfo.isEmpty() ? "Không rõ cấu hình" : configInfo);
        
        return map;
    }
}
