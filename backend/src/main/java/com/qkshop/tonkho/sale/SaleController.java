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
    private final com.qkshop.tonkho.accessory.AccessoryOrderItemRepository accessoryOrderItemRepository;
    private final com.qkshop.tonkho.accessory.AccessoryOrderRepository accessoryOrderRepository;
    private final com.qkshop.tonkho.repair.RepairOrderItemRepository repairOrderItemRepository;
    private final com.qkshop.tonkho.repair.RepairOrderRepository repairOrderRepository;
    private final com.qkshop.tonkho.salesreport.SalesOrderRepository salesOrderRepository;
    private final com.qkshop.tonkho.inventory.ActiveInventoryRepository activeInventoryRepository;

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
        result.put("warrantyPeriod", ai.getWarrantyPeriod());
        result.put("warrantyExpiry", ai.getWarrantyExpiry());
        
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkWarranty(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("BAD_REQUEST", "Vui lòng nhập từ khóa"));
        }
        
        String cleanKeyword = keyword.trim();

        // 1. Máy móc từ ClosedCycle
        List<ClosedCycle> list = closedCycleRepository.searchWarranty(cleanKeyword);
        List<Map<String, Object>> machines = new java.util.ArrayList<>();
        for (ClosedCycle cc : list) {
            machines.add(mapClosedCycleToDetail(cc));
        }

        // 1b. Máy móc đang tồn kho (ActiveInventory) nếu tra cứu theo serial
        String normSerial = com.qkshop.tonkho.machine.SerialRegistry.normalizeSerialKey(cleanKeyword);
        activeInventoryRepository.findBySerialKey(normSerial).ifPresent(ai -> {
            boolean alreadyInList = machines.stream().anyMatch(m -> ai.getSerialKey().equalsIgnoreCase((String) m.get("serialKey")));
            if (!alreadyInList) {
                machines.add(0, mapActiveInventoryToWarrantyDetail(ai));
            }
        });

        // 2. Phụ kiện: Gom nhóm theo từng hóa đơn bán phụ kiện (AccessoryOrder)
        // Tìm kiếm cả theo thông tin hóa đơn (SĐT, tên, mã) và theo chi tiết món hàng (SKU, Serial, Tên phụ kiện)
        List<com.qkshop.tonkho.accessory.AccessoryOrder> directAccOrders = accessoryOrderRepository.searchOrders(cleanKeyword);
        List<com.qkshop.tonkho.accessory.AccessoryOrderItem> accItems = accessoryOrderItemRepository.searchWarrantyItems(cleanKeyword);

        Map<Long, com.qkshop.tonkho.accessory.AccessoryOrder> accOrderMap = new java.util.LinkedHashMap<>();
        if (directAccOrders != null) {
            for (com.qkshop.tonkho.accessory.AccessoryOrder o : directAccOrders) {
                if (o != null && o.getId() != null) {
                    accOrderMap.put(o.getId(), o);
                }
            }
        }
        if (accItems != null) {
            for (com.qkshop.tonkho.accessory.AccessoryOrderItem item : accItems) {
                if (item != null && item.getOrder() != null && item.getOrder().getId() != null) {
                    accOrderMap.putIfAbsent(item.getOrder().getId(), item.getOrder());
                }
            }
        }

        List<Map<String, Object>> accessories = new java.util.ArrayList<>();
        for (com.qkshop.tonkho.accessory.AccessoryOrder order : accOrderMap.values()) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", order.getId());
            m.put("orderCode", order.getOrderCode());
            m.put("saleDate", order.getSaleDate());
            m.put("customerName", order.getCustomerName());
            m.put("customerPhone", order.getCustomerPhone());
            m.put("salesperson", order.getSalesperson());
            m.put("totalAmount", order.getTotalAmount());
            m.put("discount", order.getDiscount());
            m.put("finalAmount", order.getFinalAmount());
            m.put("saleNote", order.getSaleNote());

            List<Map<String, Object>> itemList = new java.util.ArrayList<>();
            if (order.getItems() != null) {
                for (com.qkshop.tonkho.accessory.AccessoryOrderItem item : order.getItems()) {
                    Map<String, Object> itMap = new java.util.HashMap<>();
                    itMap.put("id", item.getId());
                    itMap.put("sku", item.getSku());
                    itMap.put("accessoryName", item.getAccessoryName());
                    itMap.put("quantity", item.getQuantity());
                    itMap.put("price", item.getPrice());
                    itMap.put("warrantyMonths", item.getWarrantyMonths());
                    itMap.put("warrantyPeriod", item.getWarrantyPeriod());
                    itMap.put("warrantyExpiry", item.getWarrantyExpiry());
                    itMap.put("serialNumber", item.getSerialNumber());
                    itMap.put("note", item.getNote());
                    itemList.add(itMap);
                }
            }
            m.put("items", itemList);
            accessories.add(m);
        }

        // 3. Dịch vụ sửa chữa: Gom nhóm theo từng hóa đơn sửa chữa (RepairOrder)
        // Tìm kiếm cả theo thông tin hóa đơn và theo tên dịch vụ con
        List<com.qkshop.tonkho.repair.RepairOrder> directOrders = repairOrderRepository.searchOrders(cleanKeyword);
        List<com.qkshop.tonkho.repair.RepairOrderItem> repairItems = repairOrderItemRepository.searchWarrantyItems(cleanKeyword);

        Map<Long, com.qkshop.tonkho.repair.RepairOrder> orderMap = new java.util.LinkedHashMap<>();
        if (directOrders != null) {
            for (com.qkshop.tonkho.repair.RepairOrder o : directOrders) {
                if (o != null && o.getId() != null) {
                    orderMap.put(o.getId(), o);
                }
            }
        }
        if (repairItems != null) {
            for (com.qkshop.tonkho.repair.RepairOrderItem item : repairItems) {
                if (item != null && item.getRepairOrder() != null && item.getRepairOrder().getId() != null) {
                    orderMap.putIfAbsent(item.getRepairOrder().getId(), item.getRepairOrder());
                }
            }
        }

        List<Map<String, Object>> repairs = new java.util.ArrayList<>();
        for (com.qkshop.tonkho.repair.RepairOrder order : orderMap.values()) {
            Map<String, Object> rMap = new java.util.HashMap<>();
            rMap.put("id", order.getId());
            rMap.put("orderCode", order.getOrderCode());
            rMap.put("customerName", order.getCustomerName());
            rMap.put("customerPhone", order.getCustomerPhone());
            rMap.put("deviceModel", order.getDeviceModel());
            rMap.put("createdDate", order.getCreatedDate());
            rMap.put("technicianName", order.getTechnicianName());
            rMap.put("totalAmount", order.getTotalAmount());
            rMap.put("note", order.getNote());

            List<Map<String, Object>> itemList = new java.util.ArrayList<>();
            if (order.getItems() != null) {
                for (com.qkshop.tonkho.repair.RepairOrderItem item : order.getItems()) {
                    Map<String, Object> itemMap = new java.util.HashMap<>();
                    itemMap.put("id", item.getId());
                    itemMap.put("serviceName", item.getServiceName());
                    itemMap.put("quantity", item.getQuantity());
                    itemMap.put("price", item.getPrice());
                    itemMap.put("warrantyMonths", item.getWarrantyMonths());
                    itemMap.put("warrantyPeriod", item.getWarrantyPeriod());
                    itemMap.put("warrantyExpiry", item.getWarrantyExpiry());
                    itemMap.put("note", item.getNote());
                    itemList.add(itemMap);
                }
            }
            rMap.put("items", itemList);

            repairs.add(rMap);
        }

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("keyword", cleanKeyword);
        data.put("machines", machines);
        data.put("accessories", accessories);
        data.put("repairs", repairs);

        return ResponseEntity.ok(ApiResponse.okWithMessage("Tra cứu bảo hành thành công", data));
    }

    @GetMapping("/order/{cycleId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOrderDetail(@PathVariable String cycleId) {
        ClosedCycle cc = closedCycleRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với mã chu kỳ: " + cycleId));
        return ResponseEntity.ok(ApiResponse.ok(mapClosedCycleToDetail(cc)));
    }

    @PutMapping("/order/{cycleId}")
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMachineOrder(
            @PathVariable String cycleId,
            @RequestBody Map<String, Object> payload) {
        ClosedCycle cc = closedCycleRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn máy với mã chu kỳ: " + cycleId));

        if (payload.containsKey("customerName")) {
            cc.setCustomerName((String) payload.get("customerName"));
        }
        if (payload.containsKey("customerPhone")) {
            cc.setCustomerPhone((String) payload.get("customerPhone"));
        }
        if (payload.containsKey("warrantyPeriod")) {
            String wp = (String) payload.get("warrantyPeriod");
            cc.setWarrantyPeriod(wp);
            if (!payload.containsKey("warrantyExpiry") && wp != null) {
                java.time.LocalDate baseDate = cc.getSaleDate() != null ? cc.getSaleDate().toLocalDate() : java.time.LocalDate.now();
                cc.setWarrantyExpiry(calculateExpiryFromPeriod(baseDate, wp));
            }
        }
        if (payload.containsKey("warrantyExpiry")) {
            Object expObj = payload.get("warrantyExpiry");
            if (expObj != null && !expObj.toString().trim().isEmpty()) {
                cc.setWarrantyExpiry(java.time.LocalDate.parse(expObj.toString().trim()));
            } else {
                cc.setWarrantyExpiry(null);
            }
        }

        if (payload.containsKey("saleNote")) {
            cc.setSaleNote((String) payload.get("saleNote"));
        }

        ClosedCycle saved = closedCycleRepository.save(cc);

        // Đồng bộ sang bảng SalesOrder để Dashboard Báo cáo Doanh số luôn khớp 100%
        try {
            salesOrderRepository.findByMatchedCycleId(cycleId)
                    .or(() -> salesOrderRepository.findBySerialKeysContaining(cc.getSerialKey()).stream().findFirst())
                    .ifPresent(so -> {
                        so.setCustomerName(cc.getCustomerName());
                        so.setCustomerPhone(cc.getCustomerPhone());
                        so.setWarrantyPeriod(cc.getWarrantyPeriod());
                        so.setWarrantyExpiry(cc.getWarrantyExpiry());
                        so.setNote(cc.getSaleNote());
                        if (payload.containsKey("paymentStatus")) {
                            so.setPaymentStatus((String) payload.get("paymentStatus"));
                        }
                        salesOrderRepository.save(so);
                    });
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(SaleController.class).warn("Không thể đồng bộ SalesOrder từ updateMachineOrder: {}", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật đơn máy thành công", mapClosedCycleToDetail(saved)));
    }

    @PutMapping("/accessory-order/{orderId}")
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateAccessoryOrder(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> payload) {
        com.qkshop.tonkho.accessory.AccessoryOrder order = accessoryOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hóa đơn phụ kiện ID: " + orderId));

        if (payload.containsKey("customerName")) {
            order.setCustomerName((String) payload.get("customerName"));
        }
        if (payload.containsKey("customerPhone")) {
            order.setCustomerPhone((String) payload.get("customerPhone"));
        }
        if (payload.containsKey("saleNote")) {
            order.setSaleNote((String) payload.get("saleNote"));
        }

        // Cập nhật bảo hành cho từng item con nếu có gửi lên
        if (payload.containsKey("items")) {
            List<Map<String, Object>> itemsReq = (List<Map<String, Object>>) payload.get("items");
            if (itemsReq != null && order.getItems() != null) {
                for (Map<String, Object> itReq : itemsReq) {
                    if (itReq.get("id") == null) continue;
                    Long itemId = Long.valueOf(itReq.get("id").toString());
                    for (com.qkshop.tonkho.accessory.AccessoryOrderItem item : order.getItems()) {
                        if (item.getId().equals(itemId)) {
                            String newPeriod = null;
                            if (itReq.containsKey("warrantyPeriod")) {
                                newPeriod = (String) itReq.get("warrantyPeriod");
                                item.setWarrantyPeriod(newPeriod);
                            }
                            if (itReq.containsKey("warrantyMonths")) {
                                Object wm = itReq.get("warrantyMonths");
                                if (wm != null && !wm.toString().trim().isEmpty()) {
                                    item.setWarrantyMonths(Integer.parseInt(wm.toString()));
                                }
                            }
                            if (itReq.containsKey("warrantyExpiry")) {
                                Object exp = itReq.get("warrantyExpiry");
                                if (exp != null && !exp.toString().trim().isEmpty()) {
                                    item.setWarrantyExpiry(java.time.LocalDate.parse(exp.toString().trim()));
                                } else {
                                    item.setWarrantyExpiry(null);
                                }
                            } else if (newPeriod != null) {
                                // Tự động tính hạn nếu không truyền trực tiếp warrantyExpiry
                                java.time.LocalDate baseDate = order.getSaleDate() != null ? order.getSaleDate().toLocalDate() : java.time.LocalDate.now();
                                item.setWarrantyExpiry(calculateExpiryFromPeriod(baseDate, newPeriod));
                            }
                            if (itReq.containsKey("note")) {
                                item.setNote((String) itReq.get("note"));
                            }
                            break;
                        }
                    }
                }
            }
        }

        accessoryOrderRepository.save(order);

        // Đồng bộ sang bảng SalesOrder nếu có đơn
        try {
            salesOrderRepository.findByTransactionId(order.getOrderCode())
                    .ifPresent(so -> {
                        so.setCustomerName(order.getCustomerName());
                        so.setCustomerPhone(order.getCustomerPhone());
                        so.setNote(order.getSaleNote());
                        salesOrderRepository.save(so);
                    });
        } catch (Exception ignored) {}

        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật hóa đơn phụ kiện thành công", Map.of("id", order.getId())));
    }

    private java.time.LocalDate calculateExpiryFromPeriod(java.time.LocalDate baseDate, String period) {
        if (baseDate == null) baseDate = java.time.LocalDate.now();
        if (period == null || period.trim().isEmpty()) return null;
        String text = period.trim().toLowerCase();
        if (text.contains("không bh") || text.contains("không bảo hành") || text.equals("0") || text.equals("0t")) {
            return null;
        }

        // Kiểm tra định dạng ngày cụ thể (DD/MM/YYYY)
        java.util.regex.Matcher dmyMatcher = java.util.regex.Pattern.compile("(\\d{1,2})[/-](\\d{1,2})[/-](\\d{4})").matcher(period);
        if (dmyMatcher.find()) {
            int d = Integer.parseInt(dmyMatcher.group(1));
            int m = Integer.parseInt(dmyMatcher.group(2));
            int y = Integer.parseInt(dmyMatcher.group(3));
            return java.time.LocalDate.of(y, m, d);
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


    @PutMapping("/repair-order/{orderId}")
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateRepairOrderWarranty(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> payload) {
        com.qkshop.tonkho.repair.RepairOrder order = repairOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu sửa chữa ID: " + orderId));

        if (payload.containsKey("customerName")) {
            order.setCustomerName((String) payload.get("customerName"));
        }
        if (payload.containsKey("customerPhone")) {
            order.setCustomerPhone((String) payload.get("customerPhone"));
        }
        if (payload.containsKey("deviceModel")) {
            order.setDeviceModel((String) payload.get("deviceModel"));
        }
        if (payload.containsKey("technicianName")) {
            order.setTechnicianName((String) payload.get("technicianName"));
        }
        if (payload.containsKey("note")) {
            order.setNote((String) payload.get("note"));
        }

        // Cập nhật bảo hành cho từng item dịch vụ nếu có gửi lên
        if (payload.containsKey("items")) {
            List<Map<String, Object>> itemsReq = (List<Map<String, Object>>) payload.get("items");
            if (itemsReq != null && order.getItems() != null) {
                java.time.LocalDate baseDate = order.getCreatedDate() != null ? order.getCreatedDate().toLocalDate() : java.time.LocalDate.now();
                for (Map<String, Object> itReq : itemsReq) {
                    if (itReq.get("id") == null) continue;
                    Long itemId = Long.valueOf(itReq.get("id").toString());
                    for (com.qkshop.tonkho.repair.RepairOrderItem item : order.getItems()) {
                        if (item.getId().equals(itemId)) {
                            String newPeriod = null;
                            if (itReq.containsKey("warrantyPeriod")) {
                                newPeriod = (String) itReq.get("warrantyPeriod");
                                item.setWarrantyPeriod(newPeriod);
                            }
                            if (itReq.containsKey("warrantyMonths")) {
                                Object wm = itReq.get("warrantyMonths");
                                if (wm != null && !wm.toString().trim().isEmpty()) {
                                    item.setWarrantyMonths(Integer.parseInt(wm.toString()));
                                }
                            }
                            if (itReq.containsKey("warrantyExpiry")) {
                                Object exp = itReq.get("warrantyExpiry");
                                if (exp != null && !exp.toString().trim().isEmpty()) {
                                    item.setWarrantyExpiry(java.time.LocalDate.parse(exp.toString().trim()));
                                } else {
                                    item.setWarrantyExpiry(null);
                                }
                            } else if (newPeriod != null) {
                                item.setWarrantyExpiry(calculateExpiryFromPeriod(baseDate, newPeriod));
                            }
                            if (itReq.containsKey("note")) {
                                item.setNote((String) itReq.get("note"));
                            }
                            break;
                        }
                    }
                }
            }
        }


        repairOrderRepository.save(order);

        // Đồng bộ sang bảng SalesOrder nếu có đơn
        try {
            salesOrderRepository.findByTransactionId(order.getOrderCode())
                    .ifPresent(so -> {
                        so.setCustomerName(order.getCustomerName());
                        so.setCustomerPhone(order.getCustomerPhone());
                        so.setNote(order.getNote());
                        so.setSalesperson(order.getTechnicianName());
                        salesOrderRepository.save(so);
                    });
        } catch (Exception ignored) {}

        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật phiếu dịch vụ sửa chữa thành công", Map.of("id", order.getId())));
    }

    private Map<String, Object> mapActiveInventoryToWarrantyDetail(ActiveInventory ai) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", ai.getId());
        map.put("cycleId", ai.getCycleId());
        map.put("serialKey", ai.getSerialKey());
        map.put("sourceModelText", ai.getSourceModelText());
        map.put("customerName", "Máy đang trong kho (Chưa bán)");
        map.put("customerPhone", "—");
        map.put("saleDate", null);
        map.put("closedAt", null);
        map.put("intakeAt", ai.getIntakeAt());
        map.put("readyAt", ai.getReadyAt());
        map.put("intakeType", ai.getIntakeType() != null ? ai.getIntakeType().name() : null);
        map.put("warrantyPeriod", ai.getWarrantyPeriod() != null ? ai.getWarrantyPeriod() : "Không BH");
        map.put("salePrice", ai.getSalePrice());
        map.put("discount", BigDecimal.ZERO);
        map.put("grossRevenue", ai.getSalePrice());
        map.put("paymentStatus", "TỒN KHO");
        map.put("warrantyExpiry", ai.getWarrantyExpiry());
        map.put("productFullName", ai.getSourceModelText());
        map.put("productSummary", ai.getConfig() != null ? ai.getConfig().getDisplayName() : "");
        map.put("sourceReference", ai.getIntakeReference());
        map.put("closeReason", null);
        map.put("upgradeNote", null);
        map.put("saleNote", ai.getNote());
        map.put("pausedDays", ai.getPausedDays());
        map.put("salesperson", "Kho");
        map.put("isVoided", false);
        map.put("isInStock", true);
        map.put("currentState", ai.getState() != null ? ai.getState().name() : "READY");

        if (ai.getConfig() != null) {
            com.qkshop.tonkho.sale.SalesConfig cfg = ai.getConfig();
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
            }
        }
        return map;
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
