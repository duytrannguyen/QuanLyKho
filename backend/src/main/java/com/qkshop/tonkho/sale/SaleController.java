package com.qkshop.tonkho.sale;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final com.qkshop.tonkho.accessory.AccessoryRepository accessoryRepository;
    private final com.qkshop.tonkho.accessory.AccessoryHistoryRepository accessoryHistoryRepository;
    private final com.qkshop.tonkho.part.PartRepository partRepository;
    private final com.qkshop.tonkho.part.PartHistoryRepository partHistoryRepository;
    private final com.qkshop.tonkho.crm.CrmQueryService crmQueryService;

    @PostMapping("/lookup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> lookupSaleCandidate(@RequestBody Map<String, String> payload) {
        String query = payload.get("keyword");
        if (query == null || query.trim().isEmpty()) {
            query = payload.get("serial");
        }
        if (query == null || query.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập tên máy hoặc số Serial.");
        }

        ActiveInventory ai = inventoryCycleService.lookupSaleCandidate(query);
        Map<String, Object> result = mapActiveInventoryToSaleDTO(ai);

        ApiResponse<Map<String, Object>> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search-candidates")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> searchCandidates(
            @RequestParam(required = false, defaultValue = "") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(java.util.Collections.emptyList()));
        }
        List<ActiveInventory> list = inventoryCycleService.searchSaleCandidates(query.trim());
        List<Map<String, Object>> results = list.stream()
                .map(this::mapActiveInventoryToSaleDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    private Map<String, Object> mapActiveInventoryToSaleDTO(ActiveInventory ai) {
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
            com.qkshop.tonkho.sale.SalesConfig cfg = ai.getConfig();
            result.put("ram", cfg.getRamCode());
            result.put("ssd", cfg.getSsdCode());
            result.put("configDisplayName", cfg.getDisplayName());

            if (cfg.getVariant() != null) {
                com.qkshop.tonkho.catalog.VariantV2 var = cfg.getVariant();
                result.put("cpuCode", var.getCpuCode());
                result.put("gpuCode", var.getGpuCode());
                result.put("screenSize", var.getScreenSize());
                result.put("touchFlag", var.getTouchFlag());
                result.put("variantName", var.getVariantName());

                if (var.getPlatform() != null) {
                    com.qkshop.tonkho.catalog.Platform pf = var.getPlatform();
                    result.put("platformCode", pf.getPlatformCode());
                    result.put("platformDisplayName", pf.getDisplayName());

                    if (pf.getModelLine() != null) {
                        com.qkshop.tonkho.catalog.ModelLine ml = pf.getModelLine();
                        result.put("modelLineName", ml.getModelLineName());
                        result.put("segmentCode", ml.getSegmentCode() != null ? ml.getSegmentCode().name() : null);

                        if (ml.getBrand() != null) {
                            result.put("brandName", ml.getBrand().getBrandName());
                        }
                    }
                }
            }
        }
        return result;
    }

    @PostMapping("/submit")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SALE_MACHINE')")
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
        if (salesperson == null) salesperson = "SYSTEM";

        ClosedCycle closed = inventoryCycleService.submitSale(requestId, serialKey, finalPrice, salesperson, payload);

        ApiResponse<ClosedCycle> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(closed);
        response.setRequestId(requestId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/shipping-orders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getShippingOrders(
            @RequestParam(required = false, defaultValue = "all") String status,
            @RequestParam(required = false) String keyword) {

        Boolean isDelivered = null;
        if ("pending".equalsIgnoreCase(status)) {
            isDelivered = false;
        } else if ("delivered".equalsIgnoreCase(status)) {
            isDelivered = true;
        }

        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        List<ClosedCycle> list = closedCycleRepository.findShippingOrders(isDelivered, cleanKeyword);
        List<Map<String, Object>> mappedOrders = mapClosedCyclesBatch(list);

        long total = closedCycleRepository.countByIsShippingTrue();
        long pending = closedCycleRepository.countByIsShippingTrueAndIsDeliveredFalse();
        long delivered = closedCycleRepository.countByIsShippingTrueAndIsDeliveredTrue();

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("total", total);
        data.put("pending", pending);
        data.put("delivered", delivered);
        data.put("orders", mappedOrders);

        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy danh sách đơn ship thành công", data));
    }

    @GetMapping("/warranty")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkWarranty(
            @RequestParam(required = false, defaultValue = "") String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            Map<String, Object> emptyData = new java.util.HashMap<>();
            emptyData.put("machines", java.util.Collections.emptyList());
            emptyData.put("accessories", java.util.Collections.emptyList());
            emptyData.put("repairs", java.util.Collections.emptyList());
            emptyData.put("keyword", "");
            return ResponseEntity.ok(ApiResponse.okWithMessage("Vui lòng nhập từ khóa tra cứu", emptyData));
        }

        String cleanKeyword = keyword.trim();

        // 1. Máy móc từ ClosedCycle
        List<ClosedCycle> list = closedCycleRepository.searchWarranty(cleanKeyword);
        List<Map<String, Object>> machines = mapClosedCyclesBatch(list);

        // 1b. Máy móc đang tồn kho (ActiveInventory) nếu tra cứu theo serial
        String normSerial = com.qkshop.tonkho.machine.SerialRegistry.normalizeSerialKey(cleanKeyword);
        activeInventoryRepository.findBySerialKey(normSerial).ifPresent(ai -> {
            boolean alreadySameCycle = machines.stream().anyMatch(m -> ai.getCycleId().equals(m.get("cycleId")));
            if (!alreadySameCycle) {
                machines.add(0, mapActiveInventoryToWarrantyDetail(ai));
            }
        });

        // 2. Phụ kiện: Gom nhóm theo từng hóa đơn bán phụ kiện (AccessoryOrder)
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
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDER_EDIT')")
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
        if (payload.containsKey("paymentStatus")) {
            cc.setPaymentStatus((String) payload.get("paymentStatus"));
        }

        if (payload.containsKey("isShipping")) {
            Object sObj = payload.get("isShipping");
            boolean isShip = sObj instanceof Boolean b ? b : "true".equalsIgnoreCase(String.valueOf(sObj));
            cc.setIsShipping(isShip);
        }
        if (payload.containsKey("isDelivered")) {
            Object dObj = payload.get("isDelivered");
            boolean isDeliv = dObj instanceof Boolean b ? b : "true".equalsIgnoreCase(String.valueOf(dObj));
            cc.setIsDelivered(isDeliv);
        }
        if (payload.containsKey("deliveryDate")) {
            Object dtObj = payload.get("deliveryDate");
            if (dtObj != null && !dtObj.toString().trim().isEmpty()) {
                cc.setDeliveryDate(java.time.LocalDate.parse(dtObj.toString().trim()));
            } else {
                cc.setDeliveryDate(null);
            }
        }

        if (payload.containsKey("warrantyPeriod")) {
            String wp = (String) payload.get("warrantyPeriod");
            cc.setWarrantyPeriod(wp);
            if (!payload.containsKey("warrantyExpiry") && wp != null) {
                java.time.LocalDate baseDate = cc.getDeliveryDate() != null 
                        ? cc.getDeliveryDate() 
                        : (cc.getSaleDate() != null ? cc.getSaleDate().toLocalDate() : java.time.LocalDate.now());
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

        if (payload.containsKey("shippingCarrier")) {
            cc.setShippingCarrier((String) payload.get("shippingCarrier"));
        }
        if (payload.containsKey("trackingCode")) {
            cc.setTrackingCode((String) payload.get("trackingCode"));
        }
        if (payload.containsKey("shippingAddress")) {
            cc.setShippingAddress((String) payload.get("shippingAddress"));
        }
        if (payload.containsKey("depositAmount") && payload.get("depositAmount") != null) {
            try {
                cc.setDepositAmount(new BigDecimal(payload.get("depositAmount").toString().replaceAll("[^0-9.]", "")));
            } catch (Exception ignored) {}
        }
        if (payload.containsKey("codAmount") && payload.get("codAmount") != null) {
            try {
                cc.setCodAmount(new BigDecimal(payload.get("codAmount").toString().replaceAll("[^0-9.]", "")));
            } catch (Exception ignored) {}
        }

        boolean isCompanyWarranty = cc.getWarrantyPeriod() != null && (cc.getWarrantyPeriod().equalsIgnoreCase("Bảo hành hãng") || cc.getWarrantyPeriod().toLowerCase().contains("hãng"));
        // Nếu là đơn ship nhưng chưa giao hàng đến khách: CHƯA kích hoạt bảo hành cửa hàng (hạn BH để trống), nhưng bảo hành hãng thì giữ nguyên!
        if (Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered()) && !isCompanyWarranty) {
            cc.setWarrantyExpiry(null);
        } else if (Boolean.TRUE.equals(cc.getIsDelivered()) && cc.getWarrantyExpiry() == null && cc.getWarrantyPeriod() != null) {
            java.time.LocalDate baseDate = cc.getDeliveryDate() != null ? cc.getDeliveryDate() : (cc.getSaleDate() != null ? cc.getSaleDate().toLocalDate() : java.time.LocalDate.now());
            cc.setWarrantyExpiry(calculateExpiryFromPeriod(baseDate, cc.getWarrantyPeriod()));
        }

        if (payload.containsKey("saleNote")) {
            cc.setSaleNote((String) payload.get("saleNote"));
        }

        ClosedCycle saved = closedCycleRepository.save(cc);

        // Đồng bộ sang bảng SalesOrder và đơn phụ kiện bán kèm (PK-KEM-) nếu có
        try {
            salesOrderRepository.findByMatchedCycleId(cycleId)
                    .or(() -> salesOrderRepository.findBySerialKeysContaining(cc.getSerialKey()).stream().findFirst())
                    .ifPresent(so -> {
                        so.setCustomerName(cc.getCustomerName());
                        so.setCustomerPhone(cc.getCustomerPhone());
                        so.setWarrantyPeriod(cc.getWarrantyPeriod());
                        so.setWarrantyExpiry(cc.getWarrantyExpiry());
                        so.setIsShipping(cc.getIsShipping());
                        so.setIsDelivered(cc.getIsDelivered());
                        so.setDeliveryDate(cc.getDeliveryDate());
                        so.setShippingCarrier(cc.getShippingCarrier());
                        so.setTrackingCode(cc.getTrackingCode());
                        so.setShippingAddress(cc.getShippingAddress());
                        so.setDepositAmount(cc.getDepositAmount());
                        so.setCodAmount(cc.getCodAmount());
                        if (Boolean.TRUE.equals(cc.getIsShipping()) && !Boolean.TRUE.equals(cc.getIsDelivered())) {
                            so.setOrderStatus("Chờ giao hàng");
                        } else {
                            so.setOrderStatus("Hoàn tất");
                        }
                        so.setNote(cc.getSaleNote());
                        if (payload.containsKey("paymentStatus")) {
                            so.setPaymentStatus((String) payload.get("paymentStatus"));
                        }
                        salesOrderRepository.save(so);
                    });

            if (payload.containsKey("customerName") || payload.containsKey("customerPhone") || payload.containsKey("paymentStatus")) {
                String pkKemCode = "PK-KEM-" + cycleId.replace("CYC-", "");
                accessoryOrderRepository.findByOrderCode(pkKemCode).ifPresent(accOrder -> {
                    if (payload.containsKey("customerName")) {
                        accOrder.setCustomerName(cc.getCustomerName());
                    }
                    if (payload.containsKey("customerPhone")) {
                        accOrder.setCustomerPhone(cc.getCustomerPhone());
                    }
                    accessoryOrderRepository.save(accOrder);
                });
                salesOrderRepository.findByTransactionId(pkKemCode).ifPresent(accSo -> {
                    if (payload.containsKey("customerName")) {
                        accSo.setCustomerName(cc.getCustomerName());
                    }
                    if (payload.containsKey("customerPhone")) {
                        accSo.setCustomerPhone(cc.getCustomerPhone());
                    }
                    if (payload.containsKey("paymentStatus")) {
                        accSo.setPaymentStatus((String) payload.get("paymentStatus"));
                    }
                    salesOrderRepository.save(accSo);
                });
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(SaleController.class).warn("Không thể đồng bộ SalesOrder từ updateMachineOrder: {}", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật đơn máy thành công", mapClosedCycleToDetail(saved)));
    }

    @PutMapping("/order/{cycleId}/confirm-delivery")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHIP_MANAGE')")
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> confirmDelivery(
            @PathVariable String cycleId,
            @RequestBody(required = false) Map<String, Object> payload) {
        ClosedCycle cc = closedCycleRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn máy với mã chu kỳ: " + cycleId));

        java.time.LocalDate delDate = java.time.LocalDate.now();
        if (payload != null && payload.containsKey("deliveryDate") && payload.get("deliveryDate") != null && !payload.get("deliveryDate").toString().isBlank()) {
            try {
                delDate = java.time.LocalDate.parse(payload.get("deliveryDate").toString().trim());
            } catch (Exception e) {
                delDate = java.time.LocalDate.now();
            }
        }

        cc.setIsShipping(true);
        cc.setIsDelivered(true);
        cc.setDeliveryDate(delDate);
        cc.setPaymentStatus("Đã thanh toán");

        boolean isCompanyWarranty = cc.getWarrantyPeriod() != null && (cc.getWarrantyPeriod().equalsIgnoreCase("Bảo hành hãng") || cc.getWarrantyPeriod().toLowerCase().contains("hãng"));
        if (!isCompanyWarranty) {
            // Kích hoạt tính hạn bảo hành từ ngày nhận hàng nếu là bảo hành cửa hàng
            if (cc.getWarrantyPeriod() != null && !cc.getWarrantyPeriod().isBlank()) {
                cc.setWarrantyExpiry(calculateExpiryFromPeriod(delDate, cc.getWarrantyPeriod()));
            }
        }

        ClosedCycle saved = closedCycleRepository.save(cc);

        // Đồng bộ SalesOrder máy và đơn phụ kiện kèm PK-KEM-
        try {
            final java.time.LocalDate finalDelDate = delDate;
            salesOrderRepository.findByMatchedCycleId(cycleId)
                    .or(() -> salesOrderRepository.findBySerialKeysContaining(cc.getSerialKey()).stream().findFirst())
                    .ifPresent(so -> {
                        so.setIsShipping(true);
                        so.setIsDelivered(true);
                        so.setDeliveryDate(finalDelDate);
                        so.setOrderStatus("Hoàn tất");
                        so.setPaymentStatus("Đã thanh toán");
                        so.setWarrantyExpiry(saved.getWarrantyExpiry());
                        salesOrderRepository.save(so);
                    });

            String pkKemCode = "PK-KEM-" + cycleId.replace("CYC-", "");
            accessoryOrderRepository.findByOrderCode(pkKemCode).ifPresent(accOrder -> {
                accOrder.setIsShipping(true);
                accOrder.setIsDelivered(true);
                accOrder.setDeliveryDate(finalDelDate);
                accOrder.setStatus("COMPLETED");
                if (accOrder.getItems() != null) {
                    for (var item : accOrder.getItems()) {
                        if (item.getWarrantyMonths() != null && item.getWarrantyMonths() > 0) {
                            item.setWarrantyExpiry(finalDelDate.plusMonths(item.getWarrantyMonths()));
                        }
                    }
                }
                accessoryOrderRepository.save(accOrder);
            });
            salesOrderRepository.findByTransactionId(pkKemCode).ifPresent(accSo -> {
                accSo.setIsShipping(true);
                accSo.setIsDelivered(true);
                accSo.setDeliveryDate(finalDelDate);
                accSo.setOrderStatus("Hoàn tất");
                accSo.setPaymentStatus("Đã thanh toán");
                salesOrderRepository.save(accSo);
            });

            if (crmQueryService != null) {
                crmQueryService.clearCache();
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(SaleController.class).warn("Không thể đồng bộ SalesOrder từ confirmDelivery: {}", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.okWithMessage("Xác nhận khách đã nhận hàng & kích hoạt bảo hành thành công", mapClosedCycleToDetail(saved)));
    }

    @PostMapping({"/order/{cycleId}/return-shipping", "/order/{cycleId}/return-order"})
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDER_RETURN')")
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> returnShippingOrder(
            @PathVariable String cycleId,
            @RequestBody(required = false) Map<String, Object> payload) {
        ClosedCycle cc = closedCycleRepository.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn máy với mã chu kỳ: " + cycleId));

        String reason = payload != null && payload.get("reason") != null ? payload.get("reason").toString().trim() : "Khách từ chối nhận hàng / Hoàn hàng về kho";
        String returnStateStr = payload != null && payload.get("returnState") != null ? payload.get("returnState").toString().trim() : "READY";
        boolean restoreAccessories = payload == null || !Boolean.FALSE.equals(payload.get("restoreAccessories"));
        boolean restoreUpgradeParts = payload == null || !Boolean.FALSE.equals(payload.get("restoreUpgradeParts"));

        // 1. Cập nhật ClosedCycle
        cc.setCloseType(com.qkshop.tonkho.core.enums.CloseType.CUSTOMER_RETURN);
        cc.setCloseReason(reason);
        cc.setSaleNote((cc.getSaleNote() != null ? cc.getSaleNote() + " | " : "") + "[HOÀN HÀNG/TRẢ MÁY]: " + reason);
        ClosedCycle savedCc = closedCycleRepository.save(cc);

        // 2. Tái tạo ActiveInventory
        com.qkshop.tonkho.inventory.CycleState nextState = "NEEDS_INSPECTION".equalsIgnoreCase(returnStateStr)
                ? com.qkshop.tonkho.inventory.CycleState.NEEDS_INSPECTION
                : com.qkshop.tonkho.inventory.CycleState.READY;
        String newCycleId = "CYC-" + System.currentTimeMillis() + "-" + java.util.UUID.randomUUID().toString().substring(0, 8);

        com.qkshop.tonkho.inventory.ActiveInventory ai = com.qkshop.tonkho.inventory.ActiveInventory.builder()
                .cycleId(newCycleId)
                .serialKey(cc.getSerialKey())
                .config(cc.getConfig())
                .sourceModelText(cc.getSourceModelText())
                .intakeType(com.qkshop.tonkho.intake.IntakeType.CUSTOMER_RETURN)
                .intakeAt(LocalDateTime.now())
                .state(nextState)
                .readyAt(nextState == com.qkshop.tonkho.inventory.CycleState.READY ? LocalDateTime.now() : null)
                .salePrice(cc.getSalePriceSnapshot() != null ? cc.getSalePriceSnapshot() : cc.getGrossRevenue())
                .note("Nhập lại từ đơn hoàn " + cc.getCycleId() + ": " + reason)
                .warrantyPeriod(cc.getWarrantyPeriod())
                .warrantyExpiry(cc.getWarrantyExpiry())
                .build();
        activeInventoryRepository.save(ai);

        // Cập nhật SerialRegistry
        serialRegistryRepository.findBySerialKey(cc.getSerialKey()).ifPresent(reg -> {
            reg.setCurrentCycleId(newCycleId);
            reg.setCurrentState(nextState);
            serialRegistryRepository.save(reg);
        });

        // 3. Hoàn phụ kiện kèm (PK-KEM-)
        if (restoreAccessories) {
            String pkKemCode = "PK-KEM-" + cycleId.replace("CYC-", "");
            accessoryOrderRepository.findByOrderCode(pkKemCode).ifPresent(accOrder -> {
                accOrder.setStatus("CANCELLED");
                if (accOrder.getItems() != null) {
                    for (var item : accOrder.getItems()) {
                        accessoryRepository.findBySku(item.getSku()).ifPresent(acc -> {
                            acc.setQuantity((acc.getQuantity() != null ? acc.getQuantity() : 0) + item.getQuantity());
                            accessoryRepository.save(acc);

                            com.qkshop.tonkho.accessory.AccessoryHistory hist = new com.qkshop.tonkho.accessory.AccessoryHistory();
                            hist.setSku(acc.getSku());
                            hist.setName(acc.getName());
                            hist.setQuantity(item.getQuantity());
                            hist.setPrice(item.getPrice());
                            hist.setAction("RETURN");
                            hist.setNote("Hoàn kho phụ kiện do hủy/trả đơn máy " + cycleId);
                            hist.setCustomerName(cc.getCustomerName());
                            hist.setCustomerPhone(cc.getCustomerPhone());
                            accessoryHistoryRepository.save(hist);
                        });
                    }
                }
                accessoryOrderRepository.save(accOrder);
            });
            salesOrderRepository.findByTransactionId(pkKemCode).ifPresent(accSo -> {
                accSo.setOrderStatus("Trả hàng");
                accSo.setNetRevenue(BigDecimal.ZERO);
                salesOrderRepository.save(accSo);
            });
        }

        // 4. Hoàn linh kiện nâng cấp
        if (restoreUpgradeParts) {
            var upgradeHistories = partHistoryRepository.findByOrderCodeOrderByCreatedAtDesc(cycleId).stream()
                    .filter(h -> "UPGRADE_USE".equals(h.getAction()))
                    .toList();
            for (var ph : upgradeHistories) {
                partRepository.findBySku(ph.getSku()).ifPresent(p -> {
                    p.setQuantity((p.getQuantity() != null ? p.getQuantity() : 0) + Math.abs(ph.getQuantity()));
                    partRepository.save(p);

                    com.qkshop.tonkho.part.PartHistory rh = com.qkshop.tonkho.part.PartHistory.builder()
                            .sku(p.getSku())
                            .name(p.getName())
                            .quantity(Math.abs(ph.getQuantity()))
                            .price(ph.getPrice())
                            .action("RETURN")
                            .orderCode(cycleId)
                            .customerName(cc.getCustomerName())
                            .customerPhone(cc.getCustomerPhone())
                            .note("Hoàn kho linh kiện nâng cấp do hủy/trả đơn máy " + cycleId)
                            .createdBy("SYSTEM")
                            .build();
                    partHistoryRepository.save(rh);
                });
            }
        }

        // 5. Cập nhật SalesOrder máy
        salesOrderRepository.findByMatchedCycleId(cycleId)
                .or(() -> salesOrderRepository.findBySerialKeysContaining(cc.getSerialKey()).stream().findFirst())
                .ifPresent(so -> {
                    so.setOrderStatus("Trả hàng");
                    so.setNetRevenue(BigDecimal.ZERO);
                    salesOrderRepository.save(so);
                });

        if (crmQueryService != null) {
            crmQueryService.clearCache();
        }

        return ResponseEntity.ok(ApiResponse.okWithMessage("Hoàn hàng và nhập lại kho thành công", Map.of(
                "cycleId", cycleId,
                "newCycleId", newCycleId,
                "serialKey", cc.getSerialKey(),
                "state", nextState.name()
        )));
    }

    @PutMapping("/accessory-order/{orderId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDER_EDIT')")
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
        return com.qkshop.tonkho.salesreport.SourceNormalizer.calculateWarrantyExpiry(baseDate, period);
    }

    @PutMapping("/repair-order/{orderId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ORDER_EDIT')")
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
                        if (payload.containsKey("deviceModel") && order.getDeviceModel() != null) {
                            so.setModelName(order.getDeviceModel());
                            so.setProductName("Sửa chữa: " + order.getDeviceModel());
                        }
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

        String customerName = "Máy đang trong kho (Chưa bán)";
        String customerPhone = "—";
        if (ai.getIntakeType() == com.qkshop.tonkho.intake.IntakeType.CUSTOMER_RETURN
                || ai.getIntakeType() == com.qkshop.tonkho.intake.IntakeType.CUSTOMER_BUYBACK) {
            java.util.Optional<ClosedCycle> lastCcOpt = closedCycleRepository.findTopBySerialKeyOrderByClosedAtDesc(ai.getSerialKey());
            if (lastCcOpt.isPresent() && lastCcOpt.get().getCustomerName() != null) {
                ClosedCycle lastCc = lastCcOpt.get();
                map.put("previousCustomerName", lastCc.getCustomerName());
                map.put("previousCustomerPhone", lastCc.getCustomerPhone());
                map.put("previousSaleDate", lastCc.getSaleDate());
                map.put("previousOrderCode", lastCc.getSourceReference());
                customerName = "Máy trong kho (Đã thu lại từ: " + lastCc.getCustomerName() + ")";
                customerPhone = lastCc.getCustomerPhone();
            } else {
                customerName = "Máy đang trong kho (Đã thu lại)";
            }
        }
        map.put("customerName", customerName);
        map.put("customerPhone", customerPhone);
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
        map.put("isInStockNow", true);
        map.put("currentState", ai.getState() != null ? ai.getState().name() : "READY");
        map.put("currentInventoryState", ai.getState() != null ? ai.getState().name() : "READY");
        String stateDesc = (ai.getState() == CycleState.READY)
                ? "Đang tồn kho (Sẵn sàng bán)"
                : "Đang tồn kho (Chờ kiểm định)";
        map.put("currentMachineStateText", stateDesc);

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

    private List<Map<String, Object>> mapClosedCyclesBatch(List<ClosedCycle> list) {
        if (list == null || list.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        java.util.Set<String> eventIds = list.stream()
                .map(ClosedCycle::getCloseEventId)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        Map<String, String> actorByEventId = eventIds.isEmpty()
                ? java.util.Collections.emptyMap()
                : eventLogRepository.findByEventIdIn(eventIds).stream()
                        .filter(ev -> ev.getEventId() != null && ev.getActor() != null)
                        .collect(java.util.stream.Collectors.toMap(
                                com.qkshop.tonkho.log.EventLog::getEventId,
                                com.qkshop.tonkho.log.EventLog::getActor,
                                (a, b) -> a));

        java.util.List<String> serialKeys = list.stream()
                .map(ClosedCycle::getSerialKey)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
        Map<String, String> currentCycleBySerial = serialKeys.isEmpty()
                ? java.util.Collections.emptyMap()
                : serialRegistryRepository.findBySerialKeyIn(serialKeys).stream()
                        .filter(sr -> sr.getSerialKey() != null && sr.getCurrentCycleId() != null)
                        .collect(java.util.stream.Collectors.toMap(
                                com.qkshop.tonkho.machine.SerialRegistry::getSerialKey,
                                com.qkshop.tonkho.machine.SerialRegistry::getCurrentCycleId,
                                (a, b) -> a));

        Map<String, ActiveInventory> activeInvBySerial = serialKeys.isEmpty()
                ? java.util.Collections.emptyMap()
                : activeInventoryRepository.findBySerialKeyIn(serialKeys).stream()
                        .filter(ai -> ai.getSerialKey() != null)
                        .collect(java.util.stream.Collectors.toMap(
                                ActiveInventory::getSerialKey,
                                ai -> ai,
                                (a, b) -> a));

        List<Map<String, Object>> result = new java.util.ArrayList<>(list.size());
        for (ClosedCycle cc : list) {
            result.add(mapClosedCycleToDetail(cc, actorByEventId, currentCycleBySerial, activeInvBySerial));
        }
        return result;
    }

    private Map<String, Object> mapClosedCycleToDetail(ClosedCycle cc) {
        return mapClosedCycleToDetail(cc, null, null, null);
    }

    private Map<String, Object> mapClosedCycleToDetail(
            ClosedCycle cc,
            Map<String, String> actorByEventId,
            Map<String, String> currentCycleBySerial,
            Map<String, ActiveInventory> activeInvBySerial) {
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
        map.put("orderCode", cc.getSourceReference());
        map.put("closeReason", cc.getCloseReason());
        map.put("upgradeNote", cc.getUpgradeNote());
        map.put("saleNote", cc.getSaleNote());
        map.put("pausedDays", cc.getPausedDays());

        String salesperson = "Không rõ";
        if (cc.getCloseEventId() != null) {
            if (actorByEventId != null) {
                salesperson = actorByEventId.getOrDefault(cc.getCloseEventId(), "Không rõ");
            } else {
                java.util.Optional<com.qkshop.tonkho.log.EventLog> eventOpt = eventLogRepository.findByEventId(cc.getCloseEventId());
                if (eventOpt.isPresent() && eventOpt.get().getActor() != null) {
                    salesperson = eventOpt.get().getActor();
                }
            }
        }
        map.put("salesperson", salesperson);

        boolean isCustomerReturn = cc.getCloseType() == com.qkshop.tonkho.core.enums.CloseType.CUSTOMER_RETURN;
        boolean isVoided = isCustomerReturn;

        String currentCycle = null;
        if (currentCycleBySerial != null) {
            currentCycle = currentCycleBySerial.get(cc.getSerialKey());
        } else if (serialRegistryRepository != null) {
            java.util.Optional<com.qkshop.tonkho.machine.SerialRegistry> regOpt = serialRegistryRepository.findBySerialKey(cc.getSerialKey());
            if (regOpt.isPresent()) {
                currentCycle = regOpt.get().getCurrentCycleId();
            }
        }
        if (currentCycle != null && !currentCycle.equals(cc.getCycleId())) {
            isVoided = true;
        }

        ActiveInventory ai = activeInvBySerial != null ? activeInvBySerial.get(cc.getSerialKey()) : null;
        if (ai == null && activeInventoryRepository != null) {
            ai = activeInventoryRepository.findBySerialKey(cc.getSerialKey()).orElse(null);
        }

        if (ai != null) {
            isVoided = true;
            map.put("isInStockNow", true);
            map.put("currentInventoryState", ai.getState() != null ? ai.getState().name() : null);
            map.put("currentCycleId", ai.getCycleId());
            String stateDesc = (ai.getState() == CycleState.READY)
                    ? "Đang tồn kho (Sẵn sàng bán)"
                    : "Đang tồn kho (Chờ kiểm định)";
            map.put("currentMachineStateText", stateDesc);
        } else if (currentCycle != null && !currentCycle.equals(cc.getCycleId())) {
            map.put("isInStockNow", false);
            map.put("currentCycleId", currentCycle);
            map.put("currentMachineStateText", "Đã xuất bán chu kỳ mới (" + currentCycle + ")");
        } else {
            map.put("isInStockNow", false);
            map.put("currentCycleId", cc.getCycleId());
            map.put("currentMachineStateText", isCustomerReturn ? "Đã thu lại / Khách trả máy" : "Đã xuất bán cho khách");
        }

        map.put("isVoided", isVoided);
        map.put("closeType", cc.getCloseType() != null ? cc.getCloseType().name() : "SALE");
        map.put("closeTypeName", isCustomerReturn ? "Khách đổi trả" : "Bán hàng");
        map.put("isShipping", Boolean.TRUE.equals(cc.getIsShipping()));
        map.put("isDelivered", Boolean.TRUE.equals(cc.getIsDelivered()));
        map.put("deliveryDate", cc.getDeliveryDate());

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
