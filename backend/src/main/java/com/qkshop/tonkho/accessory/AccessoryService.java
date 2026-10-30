package com.qkshop.tonkho.accessory;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AccessoryService {

    private final AccessoryRepository accessoryRepository;
    private final AccessoryHistoryRepository accessoryHistoryRepository;
    private final AccessoryOrderRepository accessoryOrderRepository;
    private final AccessoryOrderItemRepository accessoryOrderItemRepository;
    private final com.qkshop.tonkho.salesreport.SalesOrderRepository salesOrderRepo;

    /**
     * Tạo đơn xuất bán phụ kiện (hỗ trợ nhiều loại, mỗi loại thời hạn bảo hành riêng)
     */
    @Transactional(rollbackFor = Exception.class)
    public AccessoryOrder createAccessoryOrder(Map<String, Object> payload) {
        List<Map<String, Object>> itemsReq = (List<Map<String, Object>>) payload.get("accessories");
        if (itemsReq == null || itemsReq.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất 1 phụ kiện để xuất bán");
        }

        String customerName = (String) payload.get("customerName");
        String customerPhone = (String) payload.get("customerPhone");
        if (customerName == null || customerName.trim().isEmpty() ||
            customerPhone == null || customerPhone.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập Tên khách hàng và Số điện thoại");
        }

        String salesperson = (String) payload.get("salesperson");
        String saleNote = (String) payload.get("saleNote");
        
        LocalDateTime saleDate = LocalDateTime.now();
        Object saleDateObj = payload.get("saleDate");
        if (saleDateObj != null && !saleDateObj.toString().trim().isEmpty()) {
            String strDate = saleDateObj.toString().trim();
            try {
                if (strDate.length() == 10) {
                    saleDate = java.time.LocalDate.parse(strDate).atStartOfDay();
                } else {
                    saleDate = LocalDateTime.parse(strDate);
                }
            } catch (Exception ignored) {
                // Giữ mặc định LocalDateTime.now() nếu parse lỗi
            }
        }

        // Sinh mã đơn hàng dạng PK-yyyyMMdd-XXXX
        String datePrefix = saleDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long countToday = accessoryOrderRepository.count();
        String orderCode = String.format("PK-%s-%04d", datePrefix, (countToday % 10000) + 1);

        AccessoryOrder order = AccessoryOrder.builder()
                .orderCode(orderCode)
                .customerName(customerName.trim())
                .customerPhone(customerPhone.trim())
                .salesperson(salesperson != null ? salesperson.trim() : null)
                .saleDate(saleDate)
                .saleNote(saleNote)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Map<String, Object> itemReq : itemsReq) {
            String sku = (String) itemReq.get("sku");
            Integer quantity = parseInteger(itemReq.get("quantity"), 1);
            if (sku == null || quantity <= 0) continue;

            Accessory accessory = accessoryRepository.findBySku(sku)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phụ kiện với mã: " + sku));

            if (accessory.getQuantity() < quantity) {
                throw new IllegalStateException("Số lượng tồn kho không đủ cho phụ kiện: " + accessory.getName() + " (Còn: " + accessory.getQuantity() + ")");
            }

            // Trừ tồn kho
            accessory.setQuantity(accessory.getQuantity() - quantity);
            accessoryRepository.save(accessory);

            // Đơn giá
            BigDecimal price = accessory.getPrice();
            Object priceObj = itemReq.get("price");
            if (priceObj != null && !priceObj.toString().trim().isEmpty()) {
                price = new BigDecimal(priceObj.toString().replaceAll("[^0-9.]", ""));
            }
            if (price == null) price = BigDecimal.ZERO;

            // Thời hạn bảo hành riêng cho món này
            Object wValueObj = itemReq.get("warrantyValue");
            Object wUnitObj = itemReq.get("warrantyUnit");
            Object wPeriodObj = itemReq.get("warrantyPeriod");

            Integer warrantyValue = null;
            if (wValueObj != null && !wValueObj.toString().trim().isEmpty()) {
                warrantyValue = parseInteger(wValueObj, null);
            }

            Integer warrantyMonths = parseInteger(itemReq.get("warrantyMonths"), 
                    accessory.getDefaultWarrantyMonths() != null ? accessory.getDefaultWarrantyMonths() : 0);

            String warrantyUnit = wUnitObj != null ? wUnitObj.toString().trim().toUpperCase() : "THANG";
            String warrantyPeriod = wPeriodObj != null ? wPeriodObj.toString().trim() : null;

            LocalDate warrantyExpiry = null;
            LocalDate baseDate = saleDate.toLocalDate();

            if (warrantyValue != null && warrantyValue > 0) {
                if ("NGAY".equals(warrantyUnit)) {
                    warrantyExpiry = baseDate.plusDays(warrantyValue);
                    if (warrantyPeriod == null) warrantyPeriod = warrantyValue + " Ngày";
                } else if ("NAM".equals(warrantyUnit)) {
                    warrantyExpiry = baseDate.plusYears(warrantyValue);
                    if (warrantyPeriod == null) warrantyPeriod = warrantyValue + " Năm";
                } else {
                    warrantyExpiry = baseDate.plusMonths(warrantyValue);
                    if (warrantyPeriod == null) warrantyPeriod = warrantyValue + " Tháng";
                }
            } else if (warrantyMonths != null && warrantyMonths > 0) {
                warrantyExpiry = baseDate.plusMonths(warrantyMonths);
                if (warrantyPeriod == null) warrantyPeriod = warrantyMonths + " Tháng";
            } else {
                warrantyPeriod = "Không BH";
            }

            String serialNumber = (String) itemReq.get("serialNumber");
            String note = (String) itemReq.get("note");

            AccessoryOrderItem item = AccessoryOrderItem.builder()
                    .accessoryId(accessory.getId())
                    .sku(accessory.getSku())
                    .accessoryName(accessory.getName())
                    .quantity(quantity)
                    .price(price)
                    .warrantyMonths(warrantyMonths)
                    .warrantyPeriod(warrantyPeriod)
                    .warrantyExpiry(warrantyExpiry)
                    .serialNumber(serialNumber != null ? serialNumber.trim() : null)
                    .note(note)
                    .build();

            order.addItem(item);
            totalAmount = totalAmount.add(price.multiply(BigDecimal.valueOf(quantity)));

            // Ghi vào AccessoryHistory để giữ tương thích lịch sử xuất kho
            AccessoryHistory history = new AccessoryHistory();
            history.setSku(accessory.getSku());
            history.setName(accessory.getName());
            history.setQuantity(quantity);
            history.setPrice(price);
            history.setAction("SELL");
            history.setNote("Đơn: " + orderCode + (note != null ? " - " + note : ""));
            history.setCustomerName(customerName);
            history.setCustomerPhone(customerPhone);
            accessoryHistoryRepository.save(history);
        }

        BigDecimal discount = BigDecimal.ZERO;
        Object discountObj = payload.get("discount");
        if (discountObj != null && !discountObj.toString().trim().isEmpty()) {
            try {
                discount = new BigDecimal(discountObj.toString().replaceAll("[^0-9.]", ""));
            } catch (Exception ignored) {}
        }

        BigDecimal finalAmount = totalAmount.subtract(discount);
        if (finalAmount.compareTo(BigDecimal.ZERO) < 0) {
            finalAmount = BigDecimal.ZERO;
        }

        order.setTotalAmount(totalAmount);
        order.setDiscount(discount);
        order.setFinalAmount(finalAmount);
        AccessoryOrder saved = accessoryOrderRepository.save(order);

        // Tự động đồng bộ sang sổ cái SalesOrder để Báo cáo Doanh số ghi nhận đầy đủ
        syncAccessoryOrderToSalesOrder(saved);

        return saved;
    }

    private void syncAccessoryOrderToSalesOrder(AccessoryOrder order) {
        if (salesOrderRepo == null) return;
        try {
            LocalDateTime sDate = order.getSaleDate() != null ? order.getSaleDate() : LocalDateTime.now();
            String txnId = order.getOrderCode();

            String itemsSummary = (order.getItems() != null && !order.getItems().isEmpty())
                    ? order.getItems().stream()
                            .map(it -> it.getAccessoryName() + " (x" + it.getQuantity() + ")")
                            .collect(java.util.stream.Collectors.joining(", "))
                    : "Phụ kiện";

            com.qkshop.tonkho.salesreport.SalesOrder so = salesOrderRepo.findByTransactionId(txnId)
                    .orElseGet(() -> com.qkshop.tonkho.salesreport.SalesOrder.builder()
                            .transactionId(txnId)
                            .build());

            so.setSaleDate(sDate);
            so.setMonthDate(sDate.toLocalDate().withDayOfMonth(1));
            so.setCustomerName(order.getCustomerName());
            so.setCustomerPhone(order.getCustomerPhone());
            so.setCustomerType("Khách mua phụ kiện");
            so.setFirstSource("Cửa hàng");
            so.setLastSource("Cửa hàng");
            so.setNormalizedSource("Mua tại cửa hàng");
            so.setInboxType("Đơn mua thẳng");
            so.setIsStudent(false);
            so.setOrderStatus("Hoàn tất");
            so.setPaymentStatus("Đã thanh toán");
            so.setProductName("Phụ kiện: " + itemsSummary);
            so.setBrand("PHỤ KIỆN");
            so.setSeries("Phụ kiện");
            so.setSegment("PHU_KIEN");
            so.setModelName("Phụ kiện");
            so.setConfigSummary(itemsSummary);
            so.setGrossRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            so.setDiscount(order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO);
            so.setNetRevenue(order.getFinalAmount() != null ? order.getFinalAmount() : BigDecimal.ZERO);
            so.setNote(order.getSaleNote());
            so.setSalesperson(order.getSalesperson());
            so.setOrigin("WEB_APP");
            so.setOrderCategory("ACCESSORY");

            salesOrderRepo.save(so);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AccessoryService.class).warn("Không thể đồng bộ SalesOrder từ AccessoryOrder: {}", e.getMessage());
        }
    }

    private Integer parseInteger(Object val, Integer defaultValue) {
        if (val == null) return defaultValue;
        try {
            return Integer.parseInt(val.toString().trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void deductAccessories(List<Map<String, Object>> accessoriesToDeduct, String customerName, String customerPhone) {
        deductAccessories(accessoriesToDeduct, customerName, customerPhone, null, null, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deductAccessories(List<Map<String, Object>> accessoriesToDeduct, String customerName, String customerPhone, String cycleId, String salesperson, LocalDateTime saleDate) {
        if (accessoriesToDeduct == null || accessoriesToDeduct.isEmpty()) return;

        LocalDateTime actualSaleDate = saleDate != null ? saleDate : LocalDateTime.now();
        AccessoryOrder machineAccOrder = null;

        if (cycleId != null) {
            String orderCode = "PK-KEM-" + cycleId.replace("CYC-", "");
            machineAccOrder = AccessoryOrder.builder()
                    .orderCode(orderCode)
                    .customerName(customerName != null ? customerName.trim() : "Khách mua máy")
                    .customerPhone(customerPhone != null ? customerPhone.trim() : "")
                    .salesperson(salesperson != null ? salesperson.trim() : null)
                    .saleDate(actualSaleDate)
                    .saleNote("Phụ kiện bán kèm theo đơn máy (Cycle: " + cycleId + ")")
                    .totalAmount(BigDecimal.ZERO)
                    .discount(BigDecimal.ZERO)
                    .finalAmount(BigDecimal.ZERO)
                    .build();
        }

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Map<String, Object> req : accessoriesToDeduct) {
            String sku = (String) req.get("sku");
            Integer quantity = parseInteger(req.get("quantity"), 1);
            if (quantity <= 0) continue;

            Accessory accessory = accessoryRepository.findBySku(sku)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phụ kiện: " + sku));

            if (accessory.getQuantity() < quantity) {
                throw new IllegalStateException("Số lượng tồn kho không đủ cho phụ kiện: " + accessory.getName());
            }

            accessory.setQuantity(accessory.getQuantity() - quantity);
            accessoryRepository.save(accessory);

            // Phân biệt 2 loại: Quà tặng mặc định (0đ) vs Phụ kiện bán kèm ngoài mặc định (Có tính phí)
            boolean isGift = Boolean.TRUE.equals(req.get("isGift")) || "true".equalsIgnoreCase(String.valueOf(req.get("isGift")));
            BigDecimal price = BigDecimal.ZERO;

            if (!isGift) {
                Object pObj = req.get("price");
                if (pObj != null) {
                    try {
                        price = new BigDecimal(pObj.toString().replaceAll("[^0-9.]", ""));
                    } catch (Exception e) {
                        price = accessory.getPrice() != null ? accessory.getPrice() : BigDecimal.ZERO;
                    }
                } else {
                    price = accessory.getPrice() != null ? accessory.getPrice() : BigDecimal.ZERO;
                }
            }

            // Ghi lại lịch sử bán
            AccessoryHistory history = new AccessoryHistory();
            history.setSku(accessory.getSku());
            history.setName(accessory.getName());
            history.setQuantity(quantity);
            history.setPrice(price);
            history.setAction("SELL");
            if (isGift) {
                history.setNote("Quà tặng mặc định kèm máy" + (cycleId != null ? " (" + cycleId + ")" : ""));
            } else {
                history.setNote("Phụ kiện bán kèm ngoài mặc định" + (cycleId != null ? " (" + cycleId + ")" : ""));
            }
            history.setCustomerName(customerName);
            history.setCustomerPhone(customerPhone);
            accessoryHistoryRepository.save(history);

            if (machineAccOrder != null) {
                int warrantyMonths = accessory.getDefaultWarrantyMonths() != null ? accessory.getDefaultWarrantyMonths() : 0;
                String warrantyPeriod = warrantyMonths > 0 ? warrantyMonths + " Tháng" : "Không BH";
                LocalDate warrantyExpiry = warrantyMonths > 0 ? actualSaleDate.toLocalDate().plusMonths(warrantyMonths) : null;

                AccessoryOrderItem item = AccessoryOrderItem.builder()
                        .accessoryId(accessory.getId())
                        .sku(accessory.getSku())
                        .accessoryName(accessory.getName())
                        .quantity(quantity)
                        .price(price)
                        .warrantyMonths(warrantyMonths)
                        .warrantyPeriod(warrantyPeriod)
                        .warrantyExpiry(warrantyExpiry)
                        .serialNumber((String) req.get("serialNumber"))
                        .note(isGift ? "[Quà mặc định - 0đ] Kèm máy " + (cycleId != null ? cycleId : "")
                                     : "[Bán ngoài mặc định] Kèm máy " + (cycleId != null ? cycleId : ""))
                        .build();

                machineAccOrder.addItem(item);
                if (!isGift && price.compareTo(BigDecimal.ZERO) > 0) {
                    totalAmount = totalAmount.add(price.multiply(BigDecimal.valueOf(quantity)));
                }
            }
        }

        if (machineAccOrder != null && machineAccOrder.getItems() != null && !machineAccOrder.getItems().isEmpty()) {
            machineAccOrder.setTotalAmount(totalAmount);
            machineAccOrder.setFinalAmount(totalAmount);
            AccessoryOrder saved = accessoryOrderRepository.save(machineAccOrder);

            // Chỉ đồng bộ sang SalesOrder (doanh thu phụ kiện) khi có phụ kiện bán kèm ngoài mặc định tính phí (totalAmount > 0)
            if (totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                syncAccessoryOrderToSalesOrder(saved);
            }
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void migrateSkus() {
        List<Accessory> accessories = accessoryRepository.findAll();
        Map<String, Integer> categoryCounters = new java.util.HashMap<>();
        
        for (Accessory accessory : accessories) {
            String category = accessory.getCategory();
            if (category == null || category.trim().isEmpty()) {
                category = "KHAC";
            }
            category = category.toUpperCase().replaceAll("[^A-Z0-9]", "");
            
            categoryCounters.put(category, categoryCounters.getOrDefault(category, 0) + 1);
            int count = categoryCounters.get(category);
            String newSku = String.format("PK-%s-%04d", category, count);
            
            String oldSku = accessory.getSku();
            
            if (!oldSku.equals(newSku)) {
                List<AccessoryHistory> historyList = accessoryHistoryRepository.findBySku(oldSku);
                for (AccessoryHistory history : historyList) {
                    history.setSku(newSku);
                    accessoryHistoryRepository.save(history);
                }
                
                accessory.setSku(newSku);
                accessoryRepository.save(accessory);
            }
        }
    }
}
