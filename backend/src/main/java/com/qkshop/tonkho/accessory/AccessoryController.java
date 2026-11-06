package com.qkshop.tonkho.accessory;

import com.qkshop.tonkho.core.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accessory")
@RequiredArgsConstructor
public class AccessoryController {

    private final AccessoryRepository accessoryRepository;
    private final AccessoryService accessoryService;
    private final AccessoryHistoryRepository accessoryHistoryRepository;
    private final AccessoryOrderRepository accessoryOrderRepository;
    private final com.qkshop.tonkho.system.SystemConfigService systemConfigService;

    @GetMapping("/next-sku")
    public ResponseEntity<ApiResponse<String>> getNextSku(
            @RequestParam(defaultValue = "KHAC") String category) {
        return ResponseEntity.ok(ApiResponse.okWithMessage("Mã SKU gợi ý", accessoryService.generateNextSku(category)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AccessoryHistory>>> getAccessoryHistory(
            @RequestParam(required = false) String sku) {
        List<AccessoryHistory> history;
        if (sku != null && !sku.trim().isEmpty()) {
            history = accessoryHistoryRepository.findBySkuOrderByCreatedAtDesc(sku.trim());
        } else {
            history = accessoryHistoryRepository.findAllByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Accessory>>> getAvailableAccessories() {
        List<Accessory> accessories = accessoryRepository.findByQuantityGreaterThan(0);
        return ResponseEntity.ok(ApiResponse.ok(accessories));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<Accessory>>> getAllAccessories(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String stockFilter) {
        List<Accessory> accessories = accessoryService.getAllAccessories(keyword, category, stockFilter);
        return ResponseEntity.ok(ApiResponse.ok(accessories));
    }

    @PostMapping("/sell-standalone")
    public ResponseEntity<ApiResponse<AccessoryOrder>> sellStandalone(@RequestBody Map<String, Object> payload) {
        AccessoryOrder order = accessoryService.createAccessoryOrder(payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Xuất phụ kiện thành công", order));
    }

    @GetMapping("/default-gifts")
    public ResponseEntity<ApiResponse<String>> getDefaultGifts() {
        String giftsJson = systemConfigService.getConfig("DEFAULT_GIFT_BUNDLE", "[]");
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy danh sách bộ quà tặng mặc định thành công", giftsJson));
    }

    @PostMapping("/default-gifts/save")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ACCESSORY_MANAGE')")
    public ResponseEntity<ApiResponse<String>> saveDefaultGifts(@RequestBody Map<String, String> payload) {
        String giftsJson = payload.getOrDefault("bundleJson", "[]");
        systemConfigService.upsertConfig("DEFAULT_GIFT_BUNDLE", giftsJson, "Bộ quà tặng mặc định khi bán máy");
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật bộ quà tặng mặc định thành công", giftsJson));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<AccessoryOrder>>> getAllOrders() {
        List<AccessoryOrder> orders = accessoryOrderRepository.findAllByOrderBySaleDateDesc();
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy danh sách đơn phụ kiện thành công", orders));
    }

    @GetMapping("/order/{id}")
    public ResponseEntity<ApiResponse<AccessoryOrder>> getOrderById(@PathVariable Long id) {
        AccessoryOrder order = accessoryOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn phụ kiện với ID: " + id));
        return ResponseEntity.ok(ApiResponse.okWithMessage("Chi tiết đơn phụ kiện", order));
    }

    @PostMapping("/submit")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('IMPORT_ACCESSORY')")
    public ResponseEntity<ApiResponse<Accessory>> submitAccessory(@RequestBody Map<String, Object> payload) {
        String category = payload.get("category") != null ? payload.get("category").toString().trim() : "KHAC";
        if (category.isEmpty()) category = "KHAC";

        String sku = payload.get("sku") != null ? payload.get("sku").toString().trim() : "";
        if (sku.isEmpty()) {
            sku = accessoryService.generateNextSku(category);
        }

        String name = payload.get("name") != null ? payload.get("name").toString().trim() : "";
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập tên phụ kiện");
        }

        int quantity = 1;
        if (payload.get("quantity") != null) {
            try {
                quantity = Integer.parseInt(payload.get("quantity").toString().trim());
            } catch (Exception ignored) {}
        }

        BigDecimal price = null;
        Object priceObj = payload.get("price");
        if (priceObj != null && !priceObj.toString().trim().isEmpty()) {
            String cleanPrice = priceObj.toString().replaceAll("[^0-9.]", "").trim();
            if (!cleanPrice.isEmpty()) {
                price = new BigDecimal(cleanPrice);
            }
        }

        Integer defaultWarrantyMonths = null;
        Object dwmObj = payload.get("defaultWarrantyMonths");
        if (dwmObj != null && !dwmObj.toString().trim().isEmpty()) {
            try {
                defaultWarrantyMonths = Integer.parseInt(dwmObj.toString().trim());
            } catch (Exception ignored) {}
        }

        Accessory accessory = accessoryRepository.findBySku(sku).orElse(new Accessory());
        accessory.setSku(sku);
        accessory.setCategory(category.toUpperCase());
        accessory.setName(name);

        if (accessory.getId() != null) {
            accessory.setQuantity((accessory.getQuantity() != null ? accessory.getQuantity() : 0) + quantity);
        } else {
            accessory.setQuantity(quantity);
        }

        if (price != null) {
            accessory.setPrice(price);
        }
        if (defaultWarrantyMonths != null) {
            accessory.setDefaultWarrantyMonths(defaultWarrantyMonths);
        } else if (accessory.getDefaultWarrantyMonths() == null) {
            accessory.setDefaultWarrantyMonths(0);
        }

        Accessory saved = accessoryRepository.save(accessory);

        // Ghi lại lịch sử nhập
        AccessoryHistory history = new AccessoryHistory();
        history.setSku(saved.getSku());
        history.setName(saved.getName());
        history.setQuantity(quantity);
        history.setPrice(saved.getPrice());
        history.setAction("IMPORT");
        String note = payload.get("note") != null ? payload.get("note").toString().trim() : "";
        history.setNote(!note.isEmpty() ? note : "Nhập phụ kiện");
        accessoryHistoryRepository.save(history);

        return ResponseEntity.ok(ApiResponse.okWithMessage("Nhập phụ kiện thành công", saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ACCESSORY_MANAGE') or hasAuthority('IMPORT_ACCESSORY')")
    public ResponseEntity<ApiResponse<Accessory>> updateAccessory(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Accessory saved = accessoryService.updateAccessory(id, payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật phụ kiện thành công", saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ACCESSORY_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> deleteAccessory(@PathVariable Long id) {
        accessoryService.deleteAccessory(id);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xóa phụ kiện thành công", null));
    }

    @PostMapping("/migrate-skus")
    public ResponseEntity<ApiResponse<String>> migrateSkus() {
        accessoryService.migrateSkus();
        return ResponseEntity.ok(ApiResponse.okWithMessage("Migrate SKU thành công", "Migrate SKU thành công"));
    }
}
