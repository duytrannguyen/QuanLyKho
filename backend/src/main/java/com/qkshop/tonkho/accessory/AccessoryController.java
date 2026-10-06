package com.qkshop.tonkho.accessory;

import com.qkshop.tonkho.core.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accessory")
@RequiredArgsConstructor
public class AccessoryController {

    private final AccessoryRepository accessoryRepository;
    private final AccessoryService accessoryService;
    private final AccessoryHistoryRepository accessoryHistoryRepository;

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AccessoryHistory>>> getAccessoryHistory() {
        List<AccessoryHistory> history = accessoryHistoryRepository.findAllByOrderByCreatedAtDesc();
        ApiResponse<List<AccessoryHistory>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(history);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Accessory>>> getAvailableAccessories() {
        List<Accessory> accessories = accessoryRepository.findByQuantityGreaterThan(0);
        
        ApiResponse<List<Accessory>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(accessories);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<Accessory>>> getAllAccessories() {
        List<Accessory> accessories = accessoryRepository.findAll();
        
        ApiResponse<List<Accessory>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(accessories);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sell-standalone")
    public ResponseEntity<ApiResponse<String>> sellStandalone(@RequestBody Map<String, Object> payload) {
        List<Map<String, Object>> accessories = (List<Map<String, Object>>) payload.get("accessories");
        if (accessories == null || accessories.isEmpty()) {
            throw new IllegalArgumentException("Không có phụ kiện nào để xuất");
        }
        
        String customerName = (String) payload.get("customerName");
        String customerPhone = (String) payload.get("customerPhone");
        
        accessoryService.deductAccessories(accessories, customerName, customerPhone);
        
        ApiResponse<String> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData("Xuất phụ kiện thành công");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Accessory>> submitAccessory(@RequestBody Map<String, Object> payload) {
        String sku = (String) payload.get("sku");
        String category = (String) payload.get("category");
        String name = (String) payload.get("name");
        Integer quantity = (Integer) payload.get("quantity");
        Object priceObj = payload.get("price");
        java.math.BigDecimal price = null;
        if (priceObj != null && !priceObj.toString().trim().isEmpty()) {
            price = new java.math.BigDecimal(priceObj.toString());
        }

        Accessory accessory = accessoryRepository.findBySku(sku).orElse(new Accessory());
        accessory.setSku(sku);
        accessory.setCategory(category);
        accessory.setName(name);
        
        if (accessory.getId() != null) {
            accessory.setQuantity(accessory.getQuantity() + quantity);
        } else {
            accessory.setQuantity(quantity);
        }
        
        if (price != null) {
            accessory.setPrice(price);
        }

        Accessory saved = accessoryRepository.save(accessory);
        
        // Ghi lại lịch sử nhập
        AccessoryHistory history = new AccessoryHistory();
        history.setSku(saved.getSku());
        history.setName(saved.getName());
        history.setQuantity(quantity);
        history.setPrice(saved.getPrice());
        history.setAction("IMPORT");
        history.setNote("Nhập phụ kiện");
        accessoryHistoryRepository.save(history);
        
        ApiResponse<Accessory> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(saved);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/migrate-skus")
    public ResponseEntity<ApiResponse<String>> migrateSkus() {
        accessoryService.migrateSkus();
        ApiResponse<String> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData("Migrate SKU thành công");
        return ResponseEntity.ok(response);
    }
}
