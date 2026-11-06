package com.qkshop.tonkho.accessory;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final com.qkshop.tonkho.core.service.InvoiceCodeService invoiceCodeService;

    public List<Accessory> getAllAccessories(String keyword, String category, String stockFilter) {
        List<Accessory> list = accessoryRepository.findAllByOrderByCreatedAtDesc();

        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim().toLowerCase();
            list = list.stream()
                    .filter(a -> (a.getName() != null && a.getName().toLowerCase().contains(kw))
                            || (a.getSku() != null && a.getSku().toLowerCase().contains(kw))
                            || (a.getCategory() != null && a.getCategory().toLowerCase().contains(kw)))
                    .toList();
        }

        if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category.trim()) && !"Tất cả".equalsIgnoreCase(category.trim())) {
            String cat = category.trim();
            list = list.stream()
                    .filter(a -> a.getCategory() != null && a.getCategory().equalsIgnoreCase(cat))
                    .toList();
        }

        if (stockFilter != null && !stockFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(stockFilter.trim())) {
            switch (stockFilter.trim().toUpperCase()) {
                case "IN_STOCK":
                    list = list.stream().filter(a -> a.getQuantity() != null && a.getQuantity() > 0).toList();
                    break;
                case "LOW_STOCK":
                    list = list.stream().filter(a -> a.getQuantity() != null && a.getQuantity() > 0 && a.getQuantity() <= 5).toList();
                    break;
                case "OUT_OF_STOCK":
                    list = list.stream().filter(a -> a.getQuantity() == null || a.getQuantity() <= 0).toList();
                    break;
                default:
                    break;
            }
        }

        return list;
    }

    public String generateNextSku(String category) {
        String cleanCat = normalizeCategoryCode(category);
        String prefix = "PK-" + cleanCat + "-";
        int maxSuffix = accessoryRepository.findAll().stream()
                .map(Accessory::getSku)
                .filter(s -> s != null && s.startsWith(prefix))
                .mapToInt(s -> {
                    try {
                        String numPart = s.substring(prefix.length()).trim();
                        if (numPart.matches("\\d{1,6}")) {
                            return Integer.parseInt(numPart);
                        }
                    } catch (Exception ignored) {}
                    return 0;
                })
                .max()
                .orElse(0);
        return String.format("%s%04d", prefix, maxSuffix + 1);
    }

    private String normalizeCategoryCode(String category) {
        if (category == null || category.trim().isEmpty()) {
            return "KHAC";
        }
        String clean = Normalizer.normalize(category.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd').replace('Đ', 'D')
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "");
        return clean.isEmpty() ? "KHAC" : clean;
    }

    @Transactional(rollbackFor = Exception.class)
    public Accessory updateAccessory(Long id, Map<String, Object> payload) {
        Accessory accessory = accessoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phụ kiện với ID: " + id));

        if (payload.containsKey("name")) {
            String name = payload.get("name") != null ? payload.get("name").toString().trim() : "";
            if (!name.isEmpty()) {
                accessory.setName(name);
            }
        }
        if (payload.containsKey("category")) {
            String category = payload.get("category") != null ? payload.get("category").toString().trim() : "";
            if (!category.isEmpty()) {
                accessory.setCategory(category.toUpperCase());
            }
        }
        if (payload.containsKey("price")) {
            Object priceObj = payload.get("price");
            if (priceObj != null && !priceObj.toString().trim().isEmpty()) {
                String cleanPrice = priceObj.toString().replaceAll("[^0-9.]", "").trim();
                if (!cleanPrice.isEmpty()) {
                    accessory.setPrice(new BigDecimal(cleanPrice));
                }
            }
        }
        if (payload.containsKey("defaultWarrantyMonths")) {
            Integer dwm = parseInteger(payload.get("defaultWarrantyMonths"), accessory.getDefaultWarrantyMonths());
            accessory.setDefaultWarrantyMonths(dwm != null ? dwm : 0);
        }

        if (payload.containsKey("quantity") && payload.get("quantity") != null) {
            int oldQty = accessory.getQuantity() != null ? accessory.getQuantity() : 0;
            int newQty = parseInteger(payload.get("quantity"), oldQty);
            if (newQty != oldQty) {
                int delta = newQty - oldQty;
                accessory.setQuantity(newQty);

                AccessoryHistory history = new AccessoryHistory();
                history.setSku(accessory.getSku());
                history.setName(accessory.getName());
                history.setQuantity(delta);
                history.setPrice(accessory.getPrice());
                history.setAction("ADJUST");
                String customNote = payload.get("note") != null ? payload.get("note").toString().trim() : "";
                history.setNote(!customNote.isEmpty() ? customNote : "Điều chỉnh tồn kho / Cập nhật thông tin");
                accessoryHistoryRepository.save(history);
            }
        }

        return accessoryRepository.save(accessory);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteAccessory(Long id) {
        Accessory accessory = accessoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phụ kiện với ID: " + id));

        AccessoryHistory history = new AccessoryHistory();
        history.setSku(accessory.getSku());
        history.setName(accessory.getName());
        history.setQuantity(accessory.getQuantity() != null ? accessory.getQuantity() : 0);
        history.setPrice(accessory.getPrice());
        history.setAction("DELETE");
        history.setNote("Xóa phụ kiện khỏi danh mục kho");
        accessoryHistoryRepository.save(history);

        accessoryRepository.delete(accessory);
    }

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

        // Sinh mã hóa đơn chuẩn 10 ký tự: PK + STT 4 số trong tháng + ddMM 4 số (Ví dụ: PK00010111)
        String orderCode = invoiceCodeService.generateAccessoryInvoiceCode(saleDate);

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
            if (Boolean.TRUE.equals(order.getIsShipping()) && !Boolean.TRUE.equals(order.getIsDelivered())) {
                so.setOrderStatus("Chờ giao hàng");
                so.setIsShipping(true);
                so.setIsDelivered(false);
                so.setDeliveryDate(null);
            } else {
                so.setOrderStatus("Hoàn tất");
                so.setIsShipping(order.getIsShipping());
                so.setIsDelivered(order.getIsDelivered());
                so.setDeliveryDate(order.getDeliveryDate());
            }
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
            if (txnId.startsWith("PK-KEM-")) {
                String rawCycle = txnId.substring("PK-KEM-".length());
                so.setMatchedCycleId(rawCycle.startsWith("CYC-") ? rawCycle : "CYC-" + rawCycle);
            }

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

    /**
     * Phân giải đơn giá thực tế của phụ kiện bán kèm (không phải quà tặng).
     * Nếu payload không gửi price hoặc price <= 0, fallback về giá niêm yết của phụ kiện trong kho.
     */
    public BigDecimal resolvePaidAccessoryPrice(Map<String, Object> req, Accessory accessory) {
        Object pObj = req != null ? req.get("price") : null;
        if (pObj != null && !pObj.toString().trim().isEmpty()) {
            try {
                String clean = pObj.toString().replaceAll("[^0-9.]", "").trim();
                if (!clean.isEmpty()) {
                    BigDecimal parsed = new BigDecimal(clean);
                    if (parsed.compareTo(BigDecimal.ZERO) > 0) {
                        return parsed;
                    }
                }
            } catch (Exception ignored) {}
        }
        if (accessory == null && req != null && req.get("sku") != null) {
            accessory = accessoryRepository.findBySku(req.get("sku").toString().trim()).orElse(null);
        }
        return (accessory != null && accessory.getPrice() != null) ? accessory.getPrice() : BigDecimal.ZERO;
    }

    @Transactional(rollbackFor = Exception.class)
    public void deductAccessories(List<Map<String, Object>> accessoriesToDeduct, String customerName, String customerPhone) {
        deductAccessories(accessoriesToDeduct, customerName, customerPhone, null, null, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deductAccessories(List<Map<String, Object>> accessoriesToDeduct, String customerName, String customerPhone, String cycleId, String salesperson, LocalDateTime saleDate) {
        deductAccessories(accessoriesToDeduct, customerName, customerPhone, cycleId, salesperson, saleDate, false, true, null, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deductAccessories(List<Map<String, Object>> accessoriesToDeduct, String customerName, String customerPhone, String cycleId, String salesperson, LocalDateTime saleDate,
                                  Boolean isShipping, Boolean isDelivered, LocalDate deliveryDate, String machineWarrantyPeriod) {
        if (accessoriesToDeduct == null || accessoriesToDeduct.isEmpty()) return;

        LocalDateTime actualSaleDate = saleDate != null ? saleDate : LocalDateTime.now();
        AccessoryOrder machineAccOrder = null;
        boolean pendingShipping = Boolean.TRUE.equals(isShipping) && !Boolean.TRUE.equals(isDelivered);

        if (cycleId != null) {
            String orderCode = "PK-KEM-" + cycleId.replace("CYC-", "");
            machineAccOrder = AccessoryOrder.builder()
                    .orderCode(orderCode)
                    .customerName(customerName != null ? customerName.trim() : "Khách mua máy")
                    .customerPhone(customerPhone != null ? customerPhone.trim() : "")
                    .salesperson(salesperson != null ? salesperson.trim() : null)
                    .saleDate(actualSaleDate)
                    .saleNote("Phụ kiện bán kèm theo đơn máy (Cycle: " + cycleId + ")")
                    .isShipping(isShipping != null ? isShipping : false)
                    .isDelivered(isDelivered != null ? isDelivered : !Boolean.TRUE.equals(isShipping))
                    .deliveryDate(deliveryDate)
                    .status(pendingShipping ? "PENDING" : "COMPLETED")
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
            BigDecimal price = isGift ? BigDecimal.ZERO : resolvePaidAccessoryPrice(req, accessory);

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
                LocalDate baseDate = deliveryDate != null ? deliveryDate : actualSaleDate.toLocalDate();
                LocalDate warrantyExpiry = (warrantyMonths > 0 && !pendingShipping) ? baseDate.plusMonths(warrantyMonths) : null;

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
            String category = normalizeCategoryCode(accessory.getCategory());
            
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
