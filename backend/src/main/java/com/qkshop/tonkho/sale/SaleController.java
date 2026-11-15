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
import java.util.Set;
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
    private final com.qkshop.tonkho.repair.RepairOrderService repairOrderService;
    private final com.qkshop.tonkho.salesreport.OrderDataSyncService orderDataSyncService;

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

        Object rawPhoneObj = payload.get("customerPhone");
        if (rawPhoneObj != null && !rawPhoneObj.toString().trim().isEmpty()) {
            String normalizedPhone = com.qkshop.tonkho.crm.PhoneNormalizer.normalize(rawPhoneObj.toString());
            if (normalizedPhone == null) {
                throw new IllegalArgumentException("Số điện thoại không hợp lệ (Vui lòng nhập 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)");
            }
            payload.put("customerPhone", normalizedPhone);
        }

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

        // 1a. Bổ sung đơn máy lịch sử chỉ có trong SalesOrder (chưa có ClosedCycle tương ứng)
        Set<String> seenCycles = machines.stream()
                .map(m -> m.get("cycleId"))
                .filter(java.util.Objects::nonNull)
                .map(Object::toString)
                .collect(Collectors.toSet());
        Set<String> seenOrderCodes = machines.stream()
                .map(m -> m.get("sourceReference"))
                .filter(java.util.Objects::nonNull)
                .map(Object::toString)
                .collect(Collectors.toSet());
        for (com.qkshop.tonkho.salesreport.SalesOrder legacySo : salesOrderRepository.searchMachineOrders(cleanKeyword)) {
            boolean alreadyByCycle = legacySo.getMatchedCycleId() != null && seenCycles.contains(legacySo.getMatchedCycleId());
            boolean alreadyByCode = legacySo.getTransactionId() != null && seenOrderCodes.contains(legacySo.getTransactionId());
            if (!alreadyByCycle && !alreadyByCode) {
                machines.add(mapLegacyMachineSalesOrder(legacySo));
                if (legacySo.getMatchedCycleId() != null) seenCycles.add(legacySo.getMatchedCycleId());
                if (legacySo.getTransactionId() != null) seenOrderCodes.add(legacySo.getTransactionId());
            }
        }

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
            rMap.put("deviceSerial", order.getDeviceSerial());
            rMap.put("intakeCondition", order.getIntakeCondition());
            rMap.put("accessoriesReceived", order.getAccessoriesReceived());
            rMap.put("promisedDate", order.getPromisedDate());
            rMap.put("status", order.getStatus());
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
            String rawPhone = (String) payload.get("customerPhone");
            if (rawPhone != null && !rawPhone.trim().isEmpty()) {
                String normalizedPhone = com.qkshop.tonkho.crm.PhoneNormalizer.normalize(rawPhone);
                if (normalizedPhone == null) {
                    throw new IllegalArgumentException("Số điện thoại không hợp lệ (Vui lòng nhập 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)");
                }
                cc.setCustomerPhone(normalizedPhone);
            } else {
                cc.setCustomerPhone(rawPhone);
            }
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

        // Đồng bộ toàn diện sang SalesOrder, đơn phụ kiện kèm PK-KEM- và hồ sơ CRM
        try {
            orderDataSyncService.syncClosedCycleToSalesOrder(saved, payload, true);
            if (crmQueryService != null) {
                crmQueryService.clearCache();
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

        // Đồng bộ SalesOrder máy, đơn phụ kiện kèm PK-KEM- và CRM
        try {
            orderDataSyncService.syncClosedCycleToSalesOrder(saved);

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

        if (cc.getCloseType() == com.qkshop.tonkho.core.enums.CloseType.CUSTOMER_RETURN) {
            throw new IllegalStateException("Đơn máy với mã chu kỳ " + cycleId + " đã được hoàn trả về kho trước đó. Không thể thực hiện lại thao tác hoàn hàng.");
        }

        String reason = payload != null && payload.get("reason") != null ? payload.get("reason").toString().trim() : "Khách từ chối nhận hàng / Hoàn hàng về kho";
        String returnStateStr = payload != null && payload.get("returnState") != null ? payload.get("returnState").toString().trim() : "READY";
        boolean restoreAccessories = payload == null || !Boolean.FALSE.equals(payload.get("restoreAccessories"));
        boolean restoreUpgradeParts = payload == null || !Boolean.FALSE.equals(payload.get("restoreUpgradeParts"));

        // 1. Giữ lại thông tin bảo hành hãng gốc trước khi đóng chu kỳ trả hàng
        String originalWarrantyPeriod = cc.getWarrantyPeriod();
        java.time.LocalDate originalWarrantyExpiry = cc.getWarrantyExpiry();
        boolean isCompanyWarranty = originalWarrantyPeriod != null
                && originalWarrantyPeriod.toLowerCase().contains("hãng");
        String invWp = isCompanyWarranty ? originalWarrantyPeriod : null;
        java.time.LocalDate invExp = isCompanyWarranty ? originalWarrantyExpiry : null;

        // Xác định giá gốc niêm yết của máy (tránh lấy nhầm tổng hóa đơn thanh toán cũ)
        BigDecimal returnSalePrice = resolveOriginalMachinePrice(cc, payload, restoreUpgradeParts);

        // Cập nhật ClosedCycle
        cc.setCloseType(com.qkshop.tonkho.core.enums.CloseType.CUSTOMER_RETURN);
        cc.setCloseReason(reason);
        cc.setPaymentStatus("Đã hoàn tiền");
        cc.setSaleNote((cc.getSaleNote() != null ? cc.getSaleNote() + " | " : "") + "[HOÀN HÀNG/TRẢ MÁY]: " + reason);
        cc.setWarrantyExpiry(null);
        cc.setWarrantyPeriod("Đã hủy (Đã thu lại máy)");
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
                .salePrice(returnSalePrice)
                .note("Nhập lại từ đơn hoàn " + cc.getCycleId() + ": " + reason)
                .warrantyPeriod(invWp)
                .warrantyExpiry(invExp)
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
            for (String pkKemCode : com.qkshop.tonkho.salesreport.OrderDataSyncService.resolveBundledAccessoryCodes(cycleId)) {
                accessoryOrderRepository.findByOrderCode(pkKemCode).ifPresent(accOrder -> {
                    if (!"RETURNED".equalsIgnoreCase(accOrder.getStatus()) && !"CANCELLED".equalsIgnoreCase(accOrder.getStatus())) {
                        accOrder.setStatus("RETURNED");
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
                    }
                });
            }
        }

        // 4. Hoàn linh kiện nâng cấp
        if (restoreUpgradeParts) {
            boolean alreadyReturned = partHistoryRepository.findByOrderCodeOrderByCreatedAtDesc(cycleId).stream()
                    .anyMatch(h -> "RETURN".equals(h.getAction()));
            if (!alreadyReturned) {
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
        }

        // 5. Đồng bộ toàn diện SalesOrder máy + đơn phụ kiện PK-KEM- + bảo hành + CRM
        orderDataSyncService.syncClosedCycleToSalesOrder(savedCc);

        if (crmQueryService != null) {
            crmQueryService.clearCache();
        }

        return ResponseEntity.ok(ApiResponse.okWithMessage("Hoàn hàng và nhập lại kho thành công", Map.of(
                "cycleId", cycleId,
                "newCycleId", newCycleId,
                "serialKey", cc.getSerialKey(),
                "state", nextState.name(),
                "salePrice", returnSalePrice != null ? returnSalePrice : BigDecimal.ZERO
        )));
    }

    /**
     * Xác định giá máy gốc niêm yết để trả về kho khi hủy / hoàn đơn bán máy.
     * Tránh việc lấy nhầm tổng tiền thanh toán của hóa đơn (vốn đã bao gồm phụ kiện, phí nâng cấp và chiết khấu).
     */
    private BigDecimal resolveOriginalMachinePrice(ClosedCycle cc, Map<String, Object> payload, boolean restoreUpgradeParts) {
        // 1. Người dùng chỉ định giá cụ thể từ giao diện
        if (payload != null) {
            Object pObj = payload.get("salePrice");
            if (pObj == null) pObj = payload.get("price");
            if (pObj != null && !pObj.toString().trim().isEmpty()) {
                try {
                    String clean = pObj.toString().replaceAll("[^0-9]", "");
                    if (!clean.isEmpty()) {
                        BigDecimal p = new BigDecimal(clean);
                        if (p.compareTo(BigDecimal.ZERO) > 0) {
                            return p;
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // 2. Doanh thu gộp của thân máy lúc bán (grossRevenue - giá niêm yết tại thời điểm xuất kho chu kỳ đó)
        if (cc.getGrossRevenue() != null && cc.getGrossRevenue().compareTo(BigDecimal.ZERO) > 0) {
            return cc.getGrossRevenue();
        }

        // 3. Fallback giá niêm yết chuẩn theo cấu hình máy trong bảng giá hệ thống (SalesConfig.defaultSalePrice)
        if (cc.getConfig() != null && cc.getConfig().getDefaultSalePrice() != null
                && cc.getConfig().getDefaultSalePrice().compareTo(BigDecimal.ZERO) > 0) {
            return cc.getConfig().getDefaultSalePrice();
        }

        // 4. Khôi phục từ salePriceSnapshot: Giá gốc = salePriceSnapshot + discount - upgradeTotal (nếu đã hoàn linh kiện nâng cấp)
        BigDecimal basePrice = cc.getSalePriceSnapshot() != null ? cc.getSalePriceSnapshot() : BigDecimal.ZERO;
        BigDecimal discount = cc.getDiscount() != null ? cc.getDiscount() : BigDecimal.ZERO;
        BigDecimal upgradeTotal = BigDecimal.ZERO;

        if (restoreUpgradeParts && cc.getUpgradeNote() != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("[(\\[]\\+([0-9.,]+)[^)\\]]*[)\\]]").matcher(cc.getUpgradeNote());
            while (m.find()) {
                try {
                    String numStr = m.group(1).replaceAll("[^0-9]", "");
                    if (!numStr.isEmpty()) {
                        upgradeTotal = upgradeTotal.add(new BigDecimal(numStr));
                    }
                } catch (Exception ignored) {}
            }
        }

        BigDecimal calculatedOriginal = basePrice.add(discount).subtract(upgradeTotal);
        if (calculatedOriginal.compareTo(BigDecimal.ZERO) > 0) {
            return calculatedOriginal;
        } else if (basePrice.compareTo(BigDecimal.ZERO) > 0) {
            return basePrice;
        }

        return BigDecimal.ZERO;
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
            String rawPhone = (String) payload.get("customerPhone");
            if (rawPhone != null && !rawPhone.trim().isEmpty()) {
                String normalizedPhone = com.qkshop.tonkho.crm.PhoneNormalizer.normalize(rawPhone);
                if (normalizedPhone == null) {
                    throw new IllegalArgumentException("Số điện thoại không hợp lệ (Vui lòng nhập 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)");
                }
                order.setCustomerPhone(normalizedPhone);
            } else {
                order.setCustomerPhone(rawPhone);
            }
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

        com.qkshop.tonkho.accessory.AccessoryOrder savedAccOrder = accessoryOrderRepository.save(order);

        // Đồng bộ đầy đủ sang bảng SalesOrder (bảo hành, serial, thông tin khách) và CRM
        try {
            orderDataSyncService.syncAccessoryOrderToSalesOrder(savedAccOrder, null, true);
            if (crmQueryService != null) {
                crmQueryService.clearCache();
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(SaleController.class)
                    .warn("Không thể đồng bộ SalesOrder từ updateAccessoryOrder {}: {}", order.getOrderCode(), e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật hóa đơn phụ kiện thành công", Map.of("id", order.getId())));
    }

    private java.time.LocalDate calculateExpiryFromPeriod(java.time.LocalDate baseDate, String period) {
        if (baseDate == null) baseDate = java.time.LocalDate.now();
        return com.qkshop.tonkho.salesreport.SourceNormalizer.calculateWarrantyExpiry(baseDate, period);
    }

    @PutMapping("/repair-order/{orderId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('ORDER_EDIT', 'SERVICE_REPAIR')")
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
            String rawPhone = (String) payload.get("customerPhone");
            if (rawPhone != null && !rawPhone.trim().isEmpty()) {
                String normalizedPhone = com.qkshop.tonkho.crm.PhoneNormalizer.normalize(rawPhone);
                if (normalizedPhone == null) {
                    throw new IllegalArgumentException("Số điện thoại không hợp lệ (Vui lòng nhập 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)");
                }
                order.setCustomerPhone(normalizedPhone);
            } else {
                order.setCustomerPhone(rawPhone);
            }
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

        // Kiểm tra tính hợp lệ bảo hành: Nếu máy đã thu lại thì từ chối cập nhật thành gói bảo hành theo máy
        String deviceSerial = order.getDeviceSerial();
        boolean isReturned = false;
        if (deviceSerial != null && !deviceSerial.trim().isEmpty()) {
            Map<String, Object> eligibility = repairOrderService.checkWarrantyEligibility(deviceSerial.trim(), order.getCustomerPhone());
            isReturned = Boolean.TRUE.equals(eligibility.get("isReturned"));
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
                                if (isReturned && newPeriod != null) {
                                    String lp = newPeriod.toLowerCase();
                                    if (lp.contains("theo bh") || lp.contains("bảo hành máy") || lp.contains("rma")) {
                                        throw new IllegalArgumentException("Từ chối tiếp nhận bảo hành: Máy có số Serial " + deviceSerial
                                                + " đã được shop thu lại về kho. Toàn bộ gói bảo hành của khách hàng trước đó đã BỊ HỦY. Cửa hàng chỉ tiếp nhận sửa chữa dịch vụ tính phí!");
                                    }
                                }
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

        com.qkshop.tonkho.repair.RepairOrder savedRepairOrder = repairOrderRepository.save(order);

        // Đồng bộ đầy đủ sang bảng SalesOrder (bảo hành, serial, model, kỹ thuật viên) và CRM
        try {
            orderDataSyncService.syncRepairOrderToSalesOrder(savedRepairOrder, true);
            if (crmQueryService != null) {
                crmQueryService.clearCache();
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(SaleController.class)
                    .warn("Không thể đồng bộ SalesOrder từ updateRepairOrderWarranty {}: {}", order.getOrderCode(), e.getMessage());
        }

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

        java.util.List<String> cycleIds = list.stream()
                .map(ClosedCycle::getCycleId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
        java.util.List<String> sourceRefs = list.stream()
                .map(ClosedCycle::getSourceReference)
                .filter(ref -> ref != null && !ref.isBlank())
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        Map<String, com.qkshop.tonkho.salesreport.SalesOrder> salesOrderByKey = new java.util.HashMap<>();
        if (!cycleIds.isEmpty()) {
            salesOrderRepository.findMachineOrdersByMatchedCycleIdIn(cycleIds).forEach(so -> {
                if (so.getMatchedCycleId() != null) {
                    salesOrderByKey.putIfAbsent("CYC:" + so.getMatchedCycleId(), so);
                }
            });
        }
        if (!sourceRefs.isEmpty()) {
            salesOrderRepository.findByTransactionIdIn(sourceRefs).forEach(so -> {
                if (so.getTransactionId() != null
                        && (so.getOrderCategory() == null || "MACHINE".equalsIgnoreCase(so.getOrderCategory()))) {
                    salesOrderByKey.putIfAbsent("TXN:" + so.getTransactionId(), so);
                }
            });
        }

        List<Map<String, Object>> result = new java.util.ArrayList<>(list.size());
        for (ClosedCycle cc : list) {
            result.add(mapClosedCycleToDetail(cc, actorByEventId, currentCycleBySerial, activeInvBySerial, salesOrderByKey));
        }
        return result;
    }

    private Map<String, Object> mapClosedCycleToDetail(ClosedCycle cc) {
        return mapClosedCycleToDetail(cc, null, null, null, null);
    }

    private Map<String, Object> mapClosedCycleToDetail(
            ClosedCycle cc,
            Map<String, String> actorByEventId,
            Map<String, String> currentCycleBySerial,
            Map<String, ActiveInventory> activeInvBySerial,
            Map<String, com.qkshop.tonkho.salesreport.SalesOrder> salesOrderByKey) {
        com.qkshop.tonkho.salesreport.SalesOrder linkedSo = null;
        if (salesOrderByKey != null) {
            if (cc.getCycleId() != null) {
                linkedSo = salesOrderByKey.get("CYC:" + cc.getCycleId());
            }
            if (linkedSo == null && cc.getSourceReference() != null) {
                linkedSo = salesOrderByKey.get("TXN:" + cc.getSourceReference());
            }
        } else {
            linkedSo = orderDataSyncService.resolveMatchingSalesOrder(cc).orElse(null);
        }

        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", cc.getId());
        map.put("cycleId", cc.getCycleId());
        map.put("serialKey", cc.getSerialKey());
        map.put("sourceModelText", cc.getSourceModelText());
        map.put("customerName", hasText(cc.getCustomerName()) ? cc.getCustomerName() : (linkedSo != null ? linkedSo.getCustomerName() : null));
        map.put("customerPhone", hasText(cc.getCustomerPhone()) ? cc.getCustomerPhone() : (linkedSo != null ? linkedSo.getCustomerPhone() : null));
        LocalDateTime resolvedSaleDate = cc.getSaleDate() != null ? cc.getSaleDate()
                : (linkedSo != null && linkedSo.getSaleDate() != null ? linkedSo.getSaleDate() : cc.getClosedAt());
        map.put("saleDate", resolvedSaleDate);
        map.put("closedAt", cc.getClosedAt());
        map.put("intakeAt", cc.getIntakeAt());
        map.put("readyAt", cc.getReadyAt());
        map.put("intakeType", cc.getIntakeType() != null ? cc.getIntakeType().name() : null);
        map.put("warrantyPeriod", hasText(cc.getWarrantyPeriod()) ? cc.getWarrantyPeriod() : (linkedSo != null ? linkedSo.getWarrantyPeriod() : null));
        map.put("warrantyExpiry", cc.getWarrantyExpiry() != null ? cc.getWarrantyExpiry() : (linkedSo != null ? linkedSo.getWarrantyExpiry() : null));
        map.put("salePrice", cc.getSalePriceSnapshot() != null ? cc.getSalePriceSnapshot() : (linkedSo != null ? linkedSo.getNetRevenue() : null));
        map.put("discount", cc.getDiscount() != null ? cc.getDiscount() : (linkedSo != null ? linkedSo.getDiscount() : null));
        map.put("grossRevenue", cc.getGrossRevenue() != null ? cc.getGrossRevenue() : (linkedSo != null ? linkedSo.getGrossRevenue() : null));
        map.put("paymentStatus", hasText(cc.getPaymentStatus()) ? cc.getPaymentStatus() : (linkedSo != null ? linkedSo.getPaymentStatus() : null));
        map.put("productFullName", hasText(cc.getProductFullName()) ? cc.getProductFullName() : (linkedSo != null ? linkedSo.getProductName() : null));
        map.put("productSummary", hasText(cc.getProductSummary()) ? cc.getProductSummary() : (linkedSo != null ? linkedSo.getConfigSummary() : null));
        String resolvedRef = hasText(cc.getSourceReference()) ? cc.getSourceReference() : (linkedSo != null ? linkedSo.getTransactionId() : null);
        map.put("sourceReference", resolvedRef);
        map.put("orderCode", resolvedRef);
        map.put("closeReason", cc.getCloseReason());
        map.put("upgradeNote", cc.getUpgradeNote());
        map.put("saleNote", hasText(cc.getSaleNote()) ? cc.getSaleNote() : (linkedSo != null ? linkedSo.getNote() : null));
        map.put("pausedDays", cc.getPausedDays());

        String salesperson = (linkedSo != null && hasText(linkedSo.getSalesperson())) ? linkedSo.getSalesperson() : null;
        if (!hasText(salesperson) && cc.getCloseEventId() != null) {
            if (actorByEventId != null) {
                salesperson = actorByEventId.get(cc.getCloseEventId());
            } else {
                java.util.Optional<com.qkshop.tonkho.log.EventLog> eventOpt = eventLogRepository.findByEventId(cc.getCloseEventId());
                if (eventOpt.isPresent() && eventOpt.get().getActor() != null) {
                    salesperson = eventOpt.get().getActor();
                }
            }
        }
        if (!hasText(salesperson) || "SYSTEM".equalsIgnoreCase(salesperson) || "Không rõ".equalsIgnoreCase(salesperson)) {
            if (hasText(cc.getClosedBy())) {
                salesperson = cc.getClosedBy();
            } else {
                salesperson = "Không rõ";
            }
        }
        map.put("salesperson", salesperson);
        if (linkedSo != null) {
            map.put("salesOrderId", linkedSo.getId());
            map.put("crmCustomerId", linkedSo.getCrmCustomerId());
            map.put("customerType", linkedSo.getCustomerType());
            map.put("isStudent", linkedSo.getIsStudent());
            map.put("firstSource", linkedSo.getFirstSource());
            map.put("lastSource", linkedSo.getLastSource());
            map.put("normalizedSource", linkedSo.getNormalizedSource());
            map.put("careStatus", linkedSo.getCareStatus());
        }

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
        map.put("shippingCarrier", cc.getShippingCarrier());
        map.put("trackingCode", cc.getTrackingCode());
        map.put("shippingAddress", cc.getShippingAddress());
        map.put("depositAmount", cc.getDepositAmount());
        map.put("codAmount", cc.getCodAmount());

        if (isVoided) {
            map.put("warrantyCancelled", true);
            map.put("isWarrantyEligible", false);
            map.put("warrantyExpiry", null);
            map.put("warrantyPeriod", "Đã hủy (Đã thu lại máy)");
            map.put("warrantyStatus", "VOIDED");
            map.put("warrantyStatusText", "Đã hủy bảo hành (Đã thu máy)");
            map.put("warrantyDenialReason", "Máy đã được shop thu lại về kho. Toàn bộ chính sách và quyền lợi bảo hành cho khách hàng này đã chấm dứt.");
        } else {
            map.put("warrantyCancelled", false);
            map.put("isWarrantyEligible", true);
            map.put("warrantyStatus", "ACTIVE");
            map.put("warrantyStatusText", "Đang áp dụng bảo hành");
            map.put("warrantyDenialReason", null);
        }

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

    private Map<String, Object> mapLegacyMachineSalesOrder(com.qkshop.tonkho.salesreport.SalesOrder so) {
        Map<String, Object> map = new java.util.HashMap<>();
        String statusLower = so.getOrderStatus() != null ? so.getOrderStatus().toLowerCase() : "";
        boolean isReturned = statusLower.contains("trả") || statusLower.contains("hủy") || statusLower.contains("huỷ");
        String firstSerial = so.getSerialKeys();
        if (firstSerial != null && firstSerial.contains(",")) {
            firstSerial = firstSerial.split(",")[0].trim();
        }
        ActiveInventory ai = hasText(firstSerial)
                ? activeInventoryRepository.findBySerialKey(firstSerial.trim()).orElse(null)
                : null;
        boolean isVoided = isReturned || ai != null;

        map.put("id", so.getId());
        map.put("salesOrderId", so.getId());
        map.put("crmCustomerId", so.getCrmCustomerId());
        map.put("cycleId", so.getMatchedCycleId() != null ? so.getMatchedCycleId() : so.getTransactionId());
        map.put("serialKey", so.getSerialKeys());
        map.put("sourceModelText", hasText(so.getModelName()) ? so.getModelName() : so.getProductName());
        map.put("customerName", so.getCustomerName());
        map.put("customerPhone", so.getCustomerPhone());
        map.put("saleDate", so.getSaleDate());
        map.put("closedAt", so.getSaleDate());
        map.put("warrantyPeriod", isVoided ? "Đã hủy (Đã thu lại máy)" : so.getWarrantyPeriod());
        map.put("warrantyExpiry", isVoided ? null : so.getWarrantyExpiry());
        map.put("salePrice", so.getNetRevenue());
        map.put("discount", so.getDiscount());
        map.put("grossRevenue", so.getGrossRevenue());
        map.put("paymentStatus", so.getPaymentStatus());
        map.put("productFullName", so.getProductName());
        map.put("productSummary", so.getConfigSummary());
        map.put("configInfo", hasText(so.getConfigSummary()) ? so.getConfigSummary() : so.getProductName());
        map.put("sourceReference", so.getTransactionId());
        map.put("orderCode", so.getTransactionId());
        map.put("saleNote", so.getNote());
        map.put("salesperson", hasText(so.getSalesperson()) ? so.getSalesperson() : "Không rõ");
        map.put("customerType", so.getCustomerType());
        map.put("isStudent", so.getIsStudent());
        map.put("firstSource", so.getFirstSource());
        map.put("lastSource", so.getLastSource());
        map.put("normalizedSource", so.getNormalizedSource());
        map.put("careStatus", so.getCareStatus());
        map.put("brandName", so.getBrand());
        map.put("modelLineName", so.getModelName());
        map.put("segmentCode", so.getSegment());
        map.put("isShipping", Boolean.TRUE.equals(so.getIsShipping()));
        map.put("isDelivered", Boolean.TRUE.equals(so.getIsDelivered()));
        map.put("deliveryDate", so.getDeliveryDate());
        map.put("shippingCarrier", so.getShippingCarrier());
        map.put("trackingCode", so.getTrackingCode());
        map.put("shippingAddress", so.getShippingAddress());
        map.put("depositAmount", so.getDepositAmount());
        map.put("codAmount", so.getCodAmount());
        map.put("closeType", isReturned ? "CUSTOMER_RETURN" : "SALE");
        map.put("closeTypeName", isReturned ? "Khách đổi trả" : "Bán hàng");
        map.put("isVoided", isVoided);
        map.put("warrantyCancelled", isVoided);
        map.put("isWarrantyEligible", !isVoided);
        map.put("warrantyStatus", isVoided ? "VOIDED" : "ACTIVE");
        map.put("warrantyStatusText", isVoided ? "Đã hủy bảo hành (Đã thu máy)" : "Đang áp dụng bảo hành");
        map.put("isInStockNow", ai != null);
        map.put("currentMachineStateText", ai != null ? "Đang tồn kho" : (isReturned ? "Đã thu lại / Khách trả máy" : "Đã xuất bán cho khách"));
        map.put("fromSalesOrderOnly", true);
        return map;
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
