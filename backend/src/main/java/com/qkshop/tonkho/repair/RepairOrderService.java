package com.qkshop.tonkho.repair;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RepairOrderService {

    private final RepairOrderRepository repairOrderRepository;
    private final RepairOrderItemRepository repairOrderItemRepository;
    private final com.qkshop.tonkho.accessory.AccessoryRepository accessoryRepository;
    private final com.qkshop.tonkho.accessory.AccessoryHistoryRepository accessoryHistoryRepository;
    private final com.qkshop.tonkho.salesreport.SalesOrderRepository salesOrderRepository;

    public List<RepairOrder> getAllOrders(String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return repairOrderRepository.searchOrders(keyword.trim());
        }
        return repairOrderRepository.findAllByOrderByCreatedDateDesc();
    }

    public RepairOrder getOrderById(Long id) {
        return repairOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn dịch vụ sửa chữa với ID: " + id));
    }

    @Transactional(rollbackFor = Exception.class)
    public RepairOrder createRepairOrder(Map<String, Object> payload) {
        String customerName = (String) payload.get("customerName");
        String customerPhone = (String) payload.get("customerPhone");
        String deviceModel = (String) payload.get("deviceModel");

        if (customerName == null || customerName.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập tên khách hàng");
        }
        if (customerPhone == null || customerPhone.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập số điện thoại khách");
        }
        if (deviceModel == null || deviceModel.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập tên máy của khách (VD: Dell XPS 9500)");
        }

        List<Map<String, Object>> itemsReq = (List<Map<String, Object>>) payload.get("services");
        if (itemsReq == null || itemsReq.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập ít nhất 1 dịch vụ hoặc linh kiện sửa chữa");
        }

        LocalDateTime createdDate = LocalDateTime.now();
        Object dateObj = payload.get("createdDate");
        if (dateObj != null && !dateObj.toString().trim().isEmpty()) {
            String strDate = dateObj.toString().trim();
            try {
                if (strDate.length() == 10) {
                    createdDate = java.time.LocalDate.parse(strDate).atStartOfDay();
                } else {
                    createdDate = LocalDateTime.parse(strDate);
                }
            } catch (Exception ignored) {}
        }

        // Sinh mã SC-yyyyMMdd-XXXX
        String datePrefix = createdDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long countToday = repairOrderRepository.count();
        String orderCode = String.format("SC-%s-%04d", datePrefix, (countToday % 10000) + 1);

        RepairOrder order = RepairOrder.builder()
                .orderCode(orderCode)
                .customerName(customerName.trim())
                .customerPhone(customerPhone.trim())
                .deviceModel(deviceModel.trim())
                .createdDate(createdDate)
                .technicianName(payload.get("technicianName") != null ? payload.get("technicianName").toString().trim() : null)
                .note(payload.get("note") != null ? payload.get("note").toString().trim() : null)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        LocalDate baseDate = createdDate.toLocalDate();

        for (Map<String, Object> itemReq : itemsReq) {
            String serviceName = (String) itemReq.get("serviceName");
            if (serviceName == null || serviceName.trim().isEmpty()) continue;

            int quantity = parseInteger(itemReq.get("quantity"), 1);
            BigDecimal price = parseBigDecimal(itemReq.get("price"), BigDecimal.ZERO);
            int warrantyMonths = parseInteger(itemReq.get("warrantyMonths"), 0);

            String warrantyPeriod = null;
            if (itemReq.get("warrantyPeriod") != null) {
                warrantyPeriod = itemReq.get("warrantyPeriod").toString().trim();
            }

            LocalDate warrantyExpiry = null;
            if (itemReq.get("warrantyExpiry") != null && !itemReq.get("warrantyExpiry").toString().trim().isEmpty()) {
                try {
                    warrantyExpiry = LocalDate.parse(itemReq.get("warrantyExpiry").toString().trim());
                } catch (Exception ignored) {}
            }

            if (warrantyExpiry == null) {
                if (warrantyPeriod != null && !warrantyPeriod.isEmpty()) {
                    warrantyExpiry = calculateExpiryFromPeriod(baseDate, warrantyPeriod);
                } else if (warrantyMonths > 0) {
                    warrantyExpiry = baseDate.plusMonths(warrantyMonths);
                    warrantyPeriod = warrantyMonths + " Tháng";
                }
            }

            String sku = (String) itemReq.get("sku");
            if (sku != null && !sku.trim().isEmpty()) {
                String cleanSku = sku.trim();
                accessoryRepository.findBySku(cleanSku).ifPresent(acc -> {
                    if (acc.getQuantity() >= quantity) {
                        acc.setQuantity(acc.getQuantity() - quantity);
                        accessoryRepository.save(acc);

                        com.qkshop.tonkho.accessory.AccessoryHistory hist = new com.qkshop.tonkho.accessory.AccessoryHistory();
                        hist.setSku(cleanSku);
                        hist.setName(acc.getName());
                        hist.setQuantity(quantity);
                        hist.setPrice(price);
                        hist.setAction("REPAIR_USE");
                        hist.setNote("Sử dụng cho đơn sửa chữa: " + orderCode + " (" + deviceModel + ")");
                        hist.setCustomerName(customerName);
                        hist.setCustomerPhone(customerPhone);
                        accessoryHistoryRepository.save(hist);
                    } else {
                        log.warn("Tồn kho không đủ cho linh kiện {} khi tạo đơn sửa chữa", cleanSku);
                    }
                });
            }

            RepairOrderItem item = RepairOrderItem.builder()
                    .serviceName(serviceName.trim())
                    .sku(sku != null && !sku.trim().isEmpty() ? sku.trim() : null)
                    .quantity(quantity)
                    .price(price)
                    .warrantyMonths(warrantyMonths)
                    .warrantyPeriod(warrantyPeriod)
                    .warrantyExpiry(warrantyExpiry)
                    .note((String) itemReq.get("note"))
                    .build();

            order.addItem(item);
            totalAmount = totalAmount.add(price.multiply(BigDecimal.valueOf(quantity)));
        }

        order.setTotalAmount(totalAmount);
        RepairOrder saved = repairOrderRepository.save(order);

        // Tự động đồng bộ sang sổ cái SalesOrder để Báo cáo Doanh số ghi nhận đầy đủ
        syncRepairOrderToSalesOrder(saved);

        return saved;
    }

    @Transactional(rollbackFor = Exception.class)
    public RepairOrder updateRepairOrder(Long id, Map<String, Object> payload) {
        RepairOrder order = getOrderById(id);

        String customerName = (String) payload.get("customerName");
        String customerPhone = (String) payload.get("customerPhone");
        String deviceModel = (String) payload.get("deviceModel");

        if (customerName != null && !customerName.trim().isEmpty()) {
            order.setCustomerName(customerName.trim());
        }
        if (customerPhone != null && !customerPhone.trim().isEmpty()) {
            order.setCustomerPhone(customerPhone.trim());
        }
        if (deviceModel != null && !deviceModel.trim().isEmpty()) {
            order.setDeviceModel(deviceModel.trim());
        }

        if (payload.containsKey("technicianName")) {
            order.setTechnicianName((String) payload.get("technicianName"));
        }
        if (payload.containsKey("note")) {
            order.setNote((String) payload.get("note"));
        }

        Object dateObj = payload.get("createdDate");
        if (dateObj != null && !dateObj.toString().trim().isEmpty()) {
            String strDate = dateObj.toString().trim();
            try {
                if (strDate.length() == 10) {
                    order.setCreatedDate(java.time.LocalDate.parse(strDate).atStartOfDay());
                } else {
                    order.setCreatedDate(LocalDateTime.parse(strDate));
                }
            } catch (Exception ignored) {}
        }

        List<Map<String, Object>> itemsReq = (List<Map<String, Object>>) payload.get("services");
        if (itemsReq != null) {
            order.getItems().clear();
            BigDecimal totalAmount = BigDecimal.ZERO;
            LocalDate baseDate = order.getCreatedDate().toLocalDate();

            for (Map<String, Object> itemReq : itemsReq) {
                String serviceName = (String) itemReq.get("serviceName");
                if (serviceName == null || serviceName.trim().isEmpty()) continue;

                int quantity = parseInteger(itemReq.get("quantity"), 1);
                BigDecimal price = parseBigDecimal(itemReq.get("price"), BigDecimal.ZERO);
                int warrantyMonths = parseInteger(itemReq.get("warrantyMonths"), 0);

                String warrantyPeriod = null;
                if (itemReq.get("warrantyPeriod") != null) {
                    warrantyPeriod = itemReq.get("warrantyPeriod").toString().trim();
                }

                LocalDate warrantyExpiry = null;
                if (itemReq.get("warrantyExpiry") != null && !itemReq.get("warrantyExpiry").toString().trim().isEmpty()) {
                    try {
                        warrantyExpiry = LocalDate.parse(itemReq.get("warrantyExpiry").toString().trim());
                    } catch (Exception ignored) {}
                }

                if (warrantyExpiry == null) {
                    if (warrantyPeriod != null && !warrantyPeriod.isEmpty()) {
                        warrantyExpiry = calculateExpiryFromPeriod(baseDate, warrantyPeriod);
                    } else if (warrantyMonths > 0) {
                        warrantyExpiry = baseDate.plusMonths(warrantyMonths);
                        warrantyPeriod = warrantyMonths + " Tháng";
                    }
                }

                RepairOrderItem item = RepairOrderItem.builder()
                        .serviceName(serviceName.trim())
                        .quantity(quantity)
                        .price(price)
                        .warrantyMonths(warrantyMonths)
                        .warrantyPeriod(warrantyPeriod)
                        .warrantyExpiry(warrantyExpiry)
                        .note((String) itemReq.get("note"))
                        .build();

                order.addItem(item);
                totalAmount = totalAmount.add(price.multiply(BigDecimal.valueOf(quantity)));
            }
            order.setTotalAmount(totalAmount);
        }

        RepairOrder saved = repairOrderRepository.save(order);
        syncRepairOrderToSalesOrder(saved);
        return saved;
    }

    private void syncRepairOrderToSalesOrder(RepairOrder order) {
        if (salesOrderRepository == null) return;
        try {
            LocalDateTime sDate = order.getCreatedDate() != null ? order.getCreatedDate() : LocalDateTime.now();
            String txnId = order.getOrderCode();

            String servicesSummary = (order.getItems() != null && !order.getItems().isEmpty())
                    ? order.getItems().stream()
                            .map(RepairOrderItem::getServiceName)
                            .collect(java.util.stream.Collectors.joining(", "))
                    : order.getDeviceModel();

            com.qkshop.tonkho.salesreport.SalesOrder so = salesOrderRepository.findByTransactionId(txnId)
                    .orElseGet(() -> com.qkshop.tonkho.salesreport.SalesOrder.builder()
                            .transactionId(txnId)
                            .build());

            so.setSaleDate(sDate);
            so.setMonthDate(sDate.toLocalDate().withDayOfMonth(1));
            so.setCustomerName(order.getCustomerName());
            so.setCustomerPhone(order.getCustomerPhone());
            so.setCustomerType("Khách sửa chữa");
            so.setFirstSource("Cửa hàng");
            so.setLastSource("Cửa hàng");
            so.setNormalizedSource("Khách mang máy đến");
            so.setInboxType("Đơn mua thẳng");
            so.setIsStudent(false);
            so.setOrderStatus("Hoàn tất");
            so.setPaymentStatus("Đã thanh toán");
            so.setProductName("Sửa chữa " + order.getDeviceModel() + ": " + servicesSummary);
            so.setBrand("SỬA CHỮA");
            so.setSeries("Dịch vụ sửa chữa");
            so.setSegment("SUA_CHUA");
            so.setModelName(order.getDeviceModel());
            so.setConfigSummary(servicesSummary);
            so.setGrossRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            so.setDiscount(BigDecimal.ZERO);
            so.setNetRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            so.setNote(order.getNote());
            so.setSalesperson(order.getTechnicianName());
            so.setOrigin("WEB_APP");
            so.setOrderCategory("REPAIR");

            salesOrderRepository.save(so);
        } catch (Exception e) {
            log.warn("Không thể đồng bộ SalesOrder từ RepairOrder {}: {}", order.getOrderCode(), e.getMessage());
        }
    }

    public static LocalDate calculateExpiryFromPeriod(LocalDate baseDate, String period) {
        if (baseDate == null) baseDate = LocalDate.now();
        if (period == null || period.trim().isEmpty()) return null;
        String text = period.trim().toLowerCase();
        if (text.contains("không bh") || text.contains("không bảo hành") || text.equals("0") || text.equals("0t")) {
            return null;
        }

        java.util.regex.Matcher dmyMatcher = java.util.regex.Pattern.compile("(\\d{1,2})[/-](\\d{1,2})[/-](\\d{4})").matcher(period);
        if (dmyMatcher.find()) {
            int d = Integer.parseInt(dmyMatcher.group(1));
            int m = Integer.parseInt(dmyMatcher.group(2));
            int y = Integer.parseInt(dmyMatcher.group(3));
            return LocalDate.of(y, m, d);
        }

        java.util.regex.Matcher numMatcher = java.util.regex.Pattern.compile("(\\d+)").matcher(text);
        if (numMatcher.find()) {
            int val = Integer.parseInt(numMatcher.group(1));
            if (val <= 0) return null;
            if (text.contains("ngày") || text.contains("ngay") || text.contains("day")) {
                return baseDate.plusDays(val);
            } else if (text.contains("năm") || text.contains("nam") || text.contains("year")) {
                return baseDate.plusYears(val);
            } else {
                return baseDate.plusMonths(val);
            }
        }
        return null;
    }


    public List<RepairOrderItem> searchServiceItems(String keyword) {
        List<RepairOrderItem> list;
        if (keyword == null || keyword.trim().isEmpty()) {
            list = repairOrderItemRepository.findAll();
        } else {
            list = repairOrderItemRepository.searchWarrantyItems(keyword.trim());
        }
        for (RepairOrderItem item : list) {
            item.populateOrderDetails();
        }
        return list;
    }

    private Integer parseInteger(Object val, int defaultValue) {
        if (val == null) return defaultValue;
        try {
            return Integer.parseInt(val.toString().trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private BigDecimal parseBigDecimal(Object val, BigDecimal defaultValue) {
        if (val == null) return defaultValue;
        try {
            String clean = val.toString().replaceAll("[^0-9.]", "").trim();
            return clean.isEmpty() ? defaultValue : new BigDecimal(clean);
        } catch (Exception e) {
            return defaultValue;
        }
    }
}
