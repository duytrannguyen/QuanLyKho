package com.qkshop.tonkho.accessory;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AccessoryService {

    private final AccessoryRepository accessoryRepository;
    private final AccessoryHistoryRepository accessoryHistoryRepository;

    @Transactional
    public void deductAccessories(List<Map<String, Object>> accessoriesToDeduct, String customerName, String customerPhone) {
        if (accessoriesToDeduct == null || accessoriesToDeduct.isEmpty()) return;

        for (Map<String, Object> req : accessoriesToDeduct) {
            String sku = (String) req.get("sku");
            Integer quantity = (Integer) req.get("quantity");
            if (quantity == null || quantity <= 0) continue;

            Accessory accessory = accessoryRepository.findBySku(sku)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phụ kiện: " + sku));

            if (accessory.getQuantity() < quantity) {
                throw new IllegalStateException("Số lượng tồn kho không đủ cho phụ kiện: " + accessory.getName());
            }

            accessory.setQuantity(accessory.getQuantity() - quantity);
            accessoryRepository.save(accessory);

            // Ghi lại lịch sử bán
            AccessoryHistory history = new AccessoryHistory();
            history.setSku(accessory.getSku());
            history.setName(accessory.getName());
            history.setQuantity(quantity);
            history.setPrice(accessory.getPrice()); // Lưu lại giá bán lúc đó
            history.setAction("SELL");
            history.setNote("Bán phụ kiện lẻ");
            history.setCustomerName(customerName);
            history.setCustomerPhone(customerPhone);
            accessoryHistoryRepository.save(history);
        }
    }

    @Transactional
    public void migrateSkus() {
        List<Accessory> accessories = accessoryRepository.findAll();
        Map<String, Integer> categoryCounters = new java.util.HashMap<>();
        
        for (Accessory accessory : accessories) {
            String category = accessory.getCategory();
            if (category == null || category.trim().isEmpty()) {
                category = "KHAC";
            }
            // Chuẩn hóa category (loại bỏ dấu nếu cần, nhưng giả định category đã chuẩn: CHUOT, BANPHIM...)
            category = category.toUpperCase().replaceAll("[^A-Z0-9]", "");
            
            categoryCounters.put(category, categoryCounters.getOrDefault(category, 0) + 1);
            int count = categoryCounters.get(category);
            String newSku = String.format("PK-%s-%04d", category, count);
            
            String oldSku = accessory.getSku();
            
            if (!oldSku.equals(newSku)) {
                // Update history
                List<AccessoryHistory> historyList = accessoryHistoryRepository.findBySku(oldSku);
                for (AccessoryHistory history : historyList) {
                    history.setSku(newSku);
                    accessoryHistoryRepository.save(history);
                }
                
                // Update accessory
                accessory.setSku(newSku);
                accessoryRepository.save(accessory);
            }
        }
    }
}
