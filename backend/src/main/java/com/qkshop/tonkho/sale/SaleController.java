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
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("serialKey", cc.getSerialKey());
            map.put("sourceModelText", cc.getSourceModelText());
            map.put("customerName", cc.getCustomerName());
            map.put("customerPhone", cc.getCustomerPhone());
            map.put("saleDate", cc.getSaleDate() != null ? cc.getSaleDate() : cc.getClosedAt());
            map.put("warrantyPeriod", cc.getWarrantyPeriod());
            map.put("salePrice", cc.getSalePriceSnapshot());
            map.put("discount", cc.getDiscount());
            
            boolean isVoided = false;
            java.util.Optional<com.qkshop.tonkho.machine.SerialRegistry> regOpt = serialRegistryRepository.findBySerialKey(cc.getSerialKey());
            if (regOpt.isPresent()) {
                String currentCycle = regOpt.get().getCurrentCycleId();
                if (currentCycle != null && !currentCycle.equals(cc.getCycleId())) {
                    isVoided = true;
                }
            }
            map.put("isVoided", isVoided);
            
            String configInfo = "";
            if (cc.getConfig() != null) {
                configInfo = cc.getConfig().getDisplayName();
            }
            if (cc.getUpgradeNote() != null && !cc.getUpgradeNote().isEmpty()) {
                configInfo += " (Nâng cấp: " + cc.getUpgradeNote() + ")";
            }
            map.put("configInfo", configInfo.isEmpty() ? "Không rõ cấu hình" : configInfo);
            
            result.add(map);
        }
        
        ApiResponse<List<Map<String, Object>>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(result);
        return ResponseEntity.ok(response);
    }
}
