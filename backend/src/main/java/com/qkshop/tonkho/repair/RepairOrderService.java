package com.qkshop.tonkho.repair;

import com.qkshop.tonkho.salesreport.SourceNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final com.qkshop.tonkho.part.PartService partService;
    private final com.qkshop.tonkho.part.PartRepository partRepository;
    private final com.qkshop.tonkho.part.PartHistoryRepository partHistoryRepository;
    private final com.qkshop.tonkho.core.service.InvoiceCodeService invoiceCodeService;

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

        // Sinh mã hóa đơn chuẩn 10 ký tự: SC + STT 4 số trong tháng + ddMM 4 số (Ví dụ: SC00010111)
        String orderCode = invoiceCodeService.generateRepairInvoiceCode(createdDate);

        String initialStatus = payload.get("status") != null && !payload.get("status").toString().trim().isEmpty()
                ? payload.get("status").toString().trim().toUpperCase()
                : "RECEIVED";

        String deviceSerial = payload.get("deviceSerial") != null ? payload.get("deviceSerial").toString().trim() : null;
        String intakeCondition = payload.get("intakeCondition") != null ? payload.get("intakeCondition").toString().trim() : null;
        String accessoriesReceived = payload.get("accessoriesReceived") != null ? payload.get("accessoriesReceived").toString().trim() : null;
        LocalDate promisedDate = null;
        if (payload.get("promisedDate") != null && !payload.get("promisedDate").toString().trim().isEmpty()) {
            try {
                promisedDate = LocalDate.parse(payload.get("promisedDate").toString().trim());
            } catch (Exception ignored) {}
        }

        RepairOrder order = RepairOrder.builder()
                .orderCode(orderCode)
                .customerName(customerName.trim())
                .customerPhone(customerPhone.trim())
                .deviceModel(deviceModel.trim())
                .deviceSerial(deviceSerial)
                .intakeCondition(intakeCondition)
                .accessoriesReceived(accessoriesReceived)
                .promisedDate(promisedDate)
                .createdDate(createdDate)
                .technicianName(payload.get("technicianName") != null ? payload.get("technicianName").toString().trim() : null)
                .note(payload.get("note") != null ? payload.get("note").toString().trim() : null)
                .status(initialStatus)
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
                deductItemStock(sku.trim(), quantity, price, orderCode, customerName.trim(), customerPhone.trim(), deviceModel.trim(), order.getTechnicianName());
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
        boolean wasCancelled = "CANCELLED".equalsIgnoreCase(order.getStatus());

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
        if (payload.containsKey("deviceSerial")) {
            order.setDeviceSerial((String) payload.get("deviceSerial"));
        }
        if (payload.containsKey("intakeCondition")) {
            order.setIntakeCondition((String) payload.get("intakeCondition"));
        }
        if (payload.containsKey("accessoriesReceived")) {
            order.setAccessoriesReceived((String) payload.get("accessoriesReceived"));
        }
        if (payload.containsKey("promisedDate")) {
            Object pdObj = payload.get("promisedDate");
            if (pdObj != null && !pdObj.toString().trim().isEmpty()) {
                try {
                    order.setPromisedDate(LocalDate.parse(pdObj.toString().trim()));
                } catch (Exception ignored) {}
            } else {
                order.setPromisedDate(null);
            }
        }
        if (payload.containsKey("status") && payload.get("status") != null) {
            String newStatus = payload.get("status").toString().trim().toUpperCase();
            if (!newStatus.equals(order.getStatus())) {
                updateOrderStatus(order.getId(), newStatus);
            }
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
            // 1. Hoàn kho các linh kiện / phụ kiện của danh sách cũ trước khi xóa (nếu đơn chưa bị hủy)
            if (!wasCancelled && order.getItems() != null) {
                for (RepairOrderItem oldItem : order.getItems()) {
                    if (oldItem.getSku() != null && !oldItem.getSku().trim().isEmpty()) {
                        int oldQty = oldItem.getQuantity() != null ? oldItem.getQuantity() : 1;
                        restoreItemStock(
                                oldItem.getSku().trim(),
                                oldQty,
                                oldItem.getPrice(),
                                order.getOrderCode(),
                                order.getCustomerName(),
                                order.getCustomerPhone(),
                                "Hoàn kho do cập nhật phiếu sửa chữa " + order.getOrderCode(),
                                order.getTechnicianName()
                        );
                    }
                }
            }

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

                String itemSku = (String) itemReq.get("sku");
                if (!wasCancelled && itemSku != null && !itemSku.trim().isEmpty()) {
                    deductItemStock(
                            itemSku.trim(),
                            quantity,
                            price,
                            order.getOrderCode(),
                            order.getCustomerName(),
                            order.getCustomerPhone(),
                            order.getDeviceModel(),
                            order.getTechnicianName()
                    );
                }

                RepairOrderItem item = RepairOrderItem.builder()
                        .serviceName(serviceName.trim())
                        .sku(itemSku != null && !itemSku.trim().isEmpty() ? itemSku.trim() : null)
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

    @Transactional(rollbackFor = Exception.class)
    public RepairOrder updateOrderStatus(Long id, String newStatus) {
        if (newStatus == null || newStatus.trim().isEmpty()) {
            throw new IllegalArgumentException("Trạng thái đơn sửa chữa không được để trống");
        }
        RepairOrder order = getOrderById(id);
        String cleanNewStatus = newStatus.trim().toUpperCase();
        String currentStatus = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "COMPLETED";

        if (cleanNewStatus.equals(currentStatus)) {
            return order;
        }

        if ("CANCELLED".equals(cleanNewStatus) && !"CANCELLED".equals(currentStatus)) {
            // Chuyển sang CANCELLED -> hoàn kho toàn bộ linh kiện/phụ kiện
            if (order.getItems() != null) {
                for (RepairOrderItem item : order.getItems()) {
                    if (item.getSku() != null && !item.getSku().trim().isEmpty()) {
                        int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                        restoreItemStock(
                                item.getSku().trim(),
                                qty,
                                item.getPrice(),
                                order.getOrderCode(),
                                order.getCustomerName(),
                                order.getCustomerPhone(),
                                "Hoàn kho do hủy phiếu sửa chữa " + order.getOrderCode(),
                                order.getTechnicianName()
                        );
                    }
                }
            }
        } else if (!"CANCELLED".equals(cleanNewStatus) && "CANCELLED".equals(currentStatus)) {
            // Khôi phục từ CANCELLED sang trạng thái hoạt động/hoàn tất -> trừ kho lại
            if (order.getItems() != null) {
                for (RepairOrderItem item : order.getItems()) {
                    if (item.getSku() != null && !item.getSku().trim().isEmpty()) {
                        int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                        deductItemStock(
                                item.getSku().trim(),
                                qty,
                                item.getPrice(),
                                order.getOrderCode(),
                                order.getCustomerName(),
                                order.getCustomerPhone(),
                                order.getDeviceModel(),
                                order.getTechnicianName()
                        );
                    }
                }
            }
        }

        order.setStatus(cleanNewStatus);
        RepairOrder saved = repairOrderRepository.save(order);
        syncRepairOrderToSalesOrder(saved);
        return saved;
    }

    private void deductItemStock(String cleanSku, int quantity, BigDecimal price, String orderCode,
                                 String customerName, String customerPhone, String deviceModel, String technicianName) {
        boolean deductedInParts = partService.deductForRepair(
                cleanSku, quantity, price, orderCode, customerName, customerPhone, deviceModel, technicianName);
        if (!deductedInParts) {
            var accOpt = accessoryRepository.findBySku(cleanSku);
            if (accOpt.isPresent()) {
                var acc = accOpt.get();
                if (acc.getQuantity() < quantity) {
                    throw new IllegalStateException("Linh kiện/phụ kiện " + acc.getName() + " (SKU: " + cleanSku
                            + ") không đủ số lượng tồn kho (Còn: " + acc.getQuantity() + ", Yêu cầu: " + quantity + ")");
                }
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
                log.warn("Không tìm thấy linh kiện/phụ kiện với SKU {} khi xử lý đơn sửa chữa", cleanSku);
            }
        }
    }

    private void restoreItemStock(String cleanSku, int oldQty, BigDecimal price, String orderCode,
                                  String customerName, String customerPhone, String note, String technicianName) {
        var partOpt = partRepository.findBySku(cleanSku);
        if (partOpt.isPresent()) {
            var part = partOpt.get();
            part.setQuantity((part.getQuantity() != null ? part.getQuantity() : 0) + oldQty);
            partRepository.save(part);

            if (partHistoryRepository != null) {
                com.qkshop.tonkho.part.PartHistory ph = com.qkshop.tonkho.part.PartHistory.builder()
                        .sku(cleanSku)
                        .name(part.getName())
                        .quantity(oldQty)
                        .price(price)
                        .action("RETURN")
                        .orderCode(orderCode)
                        .customerName(customerName)
                        .customerPhone(customerPhone)
                        .note(note)
                        .createdBy(technicianName != null ? technicianName : "Hệ thống")
                        .build();
                partHistoryRepository.save(ph);
            }
            return;
        }

        var accOpt = accessoryRepository.findBySku(cleanSku);
        if (accOpt.isPresent()) {
            var acc = accOpt.get();
            acc.setQuantity(acc.getQuantity() + oldQty);
            accessoryRepository.save(acc);

            com.qkshop.tonkho.accessory.AccessoryHistory hist = new com.qkshop.tonkho.accessory.AccessoryHistory();
            hist.setSku(cleanSku);
            hist.setName(acc.getName());
            hist.setQuantity(oldQty);
            hist.setPrice(price);
            hist.setAction("RETURN");
            hist.setNote(note);
            hist.setCustomerName(customerName);
            hist.setCustomerPhone(customerPhone);
            accessoryHistoryRepository.save(hist);
        }
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

            boolean isCancelled = "CANCELLED".equalsIgnoreCase(order.getStatus());
            boolean isCompleted = "COMPLETED".equalsIgnoreCase(order.getStatus());

            so.setSaleDate(sDate);
            so.setMonthDate(sDate.toLocalDate().withDayOfMonth(1));
            so.setCustomerName(order.getCustomerName());
            so.setCustomerPhone(order.getCustomerPhone());
            so.setCustomerType("Khách sửa chữa");
            so.setFirstSource("Cửa hàng");
            so.setLastSource("Khách mang máy đến");
            so.setNormalizedSource(SourceNormalizer.normalizeSource("Cửa hàng", "Khách mang máy đến"));
            so.setInboxType("Đơn mua thẳng");
            so.setIsStudent(false);
            if (isCancelled) {
                so.setOrderStatus("Đã hủy");
                so.setPaymentStatus("Đã hủy");
                so.setNetRevenue(BigDecimal.ZERO);
            } else if (isCompleted) {
                so.setOrderStatus("Hoàn tất");
                so.setPaymentStatus("Đã thanh toán");
                so.setNetRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            } else {
                so.setOrderStatus("Đang tiếp nhận/sửa");
                so.setPaymentStatus("Chưa thanh toán");
                so.setNetRevenue(BigDecimal.ZERO);
            }
            so.setProductName("Sửa chữa " + order.getDeviceModel() + ": " + servicesSummary);
            so.setBrand("SỬA CHỮA");
            so.setSeries("Dịch vụ sửa chữa");
            so.setSegment("SUA_CHUA");
            so.setModelName(order.getDeviceModel());
            so.setSerialKeys(order.getDeviceSerial());
            so.setConfigSummary(servicesSummary);
            so.setGrossRevenue(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            so.setDiscount(BigDecimal.ZERO);
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
        return com.qkshop.tonkho.salesreport.SourceNormalizer.calculateWarrantyExpiry(baseDate, period);
    }

    public List<RepairOrder> getOrdersBySerial(String serial) {
        if (serial == null || serial.trim().isEmpty()) return java.util.Collections.emptyList();
        return repairOrderRepository.findByDeviceSerialIgnoreCaseOrderByCreatedDateDesc(serial.trim());
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
