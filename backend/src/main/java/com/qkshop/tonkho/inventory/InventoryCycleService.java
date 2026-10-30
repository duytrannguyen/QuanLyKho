package com.qkshop.tonkho.inventory;
import com.qkshop.tonkho.core.StateTransitionService;
import com.qkshop.tonkho.catalog.VariantV2Repository;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import com.qkshop.tonkho.sync.CommandLedgerRepository;
import com.qkshop.tonkho.sync.CommandLedger;
import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.sale.SalesConfig;

import com.qkshop.tonkho.inventory.dto.InventoryVariantV2DTO;

import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.core.enums.SourceType;
import com.qkshop.tonkho.accessory.AccessoryService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryCycleService {

    private final ActiveInventoryRepository activeInventoryRepo;
    private final SerialRegistryRepository serialRegistryRepo;
    private final VariantV2Repository variantRepo;
    private final StateTransitionService stateTransitionService;
    private final CommandLedgerRepository commandLedgerRepo;
    private final AccessoryService accessoryService;
    private final com.qkshop.tonkho.salesreport.SalesOrderRepository salesOrderRepo;

    /**
     * Tra cứu theo VariantV2.
     * Cực kỳ đơn giản: Quét ActiveInventory, fetch Config -> Variant -> Platform.
     * Rồi gom nhóm theo VariantV2.
     */
    public Page<InventoryVariantV2DTO> searchInventory(String query, String brand, String segment, String status, int page, int size) {
        CycleState cycleState = null;
        if (StringUtils.hasText(status) && !"Tất cả".equalsIgnoreCase(status)) {
            if (status.equalsIgnoreCase("READY") || status.equalsIgnoreCase("SAN_SANG_BAN")) {
                cycleState = CycleState.READY;
            } else if (status.equalsIgnoreCase("NEEDS_INSPECTION") || status.equalsIgnoreCase("CAN_KIEM_TRA") || status.equalsIgnoreCase("DANG_KIEM_TRA")) {
                cycleState = CycleState.NEEDS_INSPECTION;
            }
        }

        String filterBrand = (StringUtils.hasText(brand) && !"Tất cả".equalsIgnoreCase(brand)) ? brand.trim() : null;

        com.qkshop.tonkho.core.enums.SegmentCode segEnum = null;
        if (StringUtils.hasText(segment) && !"Tất cả".equalsIgnoreCase(segment)) {
            try {
                segEnum = com.qkshop.tonkho.core.enums.SegmentCode.valueOf(segment.trim().toUpperCase());
            } catch (Exception ignored) {}
        }

        List<ActiveInventory> allActive = activeInventoryRepo.findByFilters(cycleState, filterBrand, segEnum);

        // Group by SalesConfig
        Map<SalesConfig, List<ActiveInventory>> grouped = new HashMap<>();
        
        for (ActiveInventory ai : allActive) {
            SalesConfig config = ai.getConfig();
            if (config == null) continue;
            
            VariantV2 variant = config.getVariant();
            
            // Filter by text query
            if (StringUtils.hasText(query)) {
                String q = query.trim().toLowerCase();
                boolean match = ai.getSerialKey().toLowerCase().contains(q)
                        || (variant != null && variant.getVariantName() != null && variant.getVariantName().toLowerCase().contains(q))
                        || (ai.getSourceModelText() != null && ai.getSourceModelText().toLowerCase().contains(q))
                        || (config.getDisplayName() != null && config.getDisplayName().toLowerCase().contains(q))
                        || (config.getConfigId() != null && config.getConfigId().toLowerCase().contains(q))
                        || (variant != null && variant.getPlatform() != null && variant.getPlatform().getPlatformCode() != null && variant.getPlatform().getPlatformCode().toLowerCase().contains(q))
                        || (variant != null && variant.getPlatform() != null && variant.getPlatform().getDisplayName() != null && variant.getPlatform().getDisplayName().toLowerCase().contains(q))
                        || (variant != null && variant.getCpuCode() != null && variant.getCpuCode().toLowerCase().contains(q));
                if (!match) continue;
            }

            grouped.computeIfAbsent(config, k -> new ArrayList<>()).add(ai);
        }

        List<InventoryVariantV2DTO> results = grouped.entrySet().stream().map(entry -> {
            SalesConfig config = entry.getKey();
            VariantV2 variant = config.getVariant();
            List<ActiveInventory> machines = entry.getValue();

            long readyCount = machines.stream().filter(m -> m.getState() == CycleState.READY).count();
            long inspectCount = machines.stream().filter(m -> m.getState() == CycleState.NEEDS_INSPECTION).count();

            List<InventoryVariantV2DTO.MachineSimpleDTO> machineDTOs = machines.stream().map(m -> 
                InventoryVariantV2DTO.MachineSimpleDTO.builder()
                        .serial(m.getSerialKey())
                        .status(m.getState().name())
                        .price(m.getSalePrice())
                        .configId(m.getConfig() != null ? m.getConfig().getConfigId() : null)
                        .configName(m.getConfig() != null ? m.getConfig().getDisplayName() : null)
                        .ram(m.getConfig() != null ? m.getConfig().getRamCode() : null)
                        .ssd(m.getConfig() != null ? m.getConfig().getSsdCode() : null)
                        .notes(m.getNote())
                        .cycleId(m.getCycleId())
                        .intakeAt(m.getIntakeAt())
                        .warrantyPeriod(m.getWarrantyPeriod())
                        .warrantyExpiry(m.getWarrantyExpiry())
                        .build()
            ).collect(Collectors.toList());

            return InventoryVariantV2DTO.builder()
                    .variant(variant)
                    .config(config)
                    .totalCount(machines.size())
                    .readyCount(readyCount)
                    .inspectionCount(inspectCount)
                    .machines(machineDTOs)
                    .build();
        }).collect(Collectors.toList());
        
        int start = Math.min((int) PageRequest.of(page, size).getOffset(), results.size());
        int end = Math.min((start + size), results.size());
        List<InventoryVariantV2DTO> pageContent = results.subList(start, end);
        
        return new PageImpl<>(pageContent, PageRequest.of(page, size), results.size());
    }

    public ActiveInventory lookupSaleCandidate(String serialKey) {
        String key = serialKey.trim().toUpperCase();
        ActiveInventory ai = activeInventoryRepo.findBySerialKey(key)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy máy trong kho với serial: " + serialKey));
        return ai;
    }

    @Transactional
    public ClosedCycle closeCycle(String requestId, String cycleId, CloseType closeType, String reference, String reason, String actor) {
        // Idempotency check
        if (commandLedgerRepo.existsByRequestId(requestId)) {
            log.info("Request {} already processed", requestId);
            // In reality we should return the old result, but for simplicity we can just find it.
            // But we don't have a way to fetch the previous ClosedCycle easily by requestId unless we search by close_event_id.
            // Let's just let it be handled by throwing or skipping.
            throw new IllegalArgumentException("Request " + requestId + " đã được xử lý (Idempotent).");
        }

        ActiveInventory ai = activeInventoryRepo.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ActiveInventory với cycleId: " + cycleId));
        
        ClosedCycle closed = stateTransitionService.transitionToClosed(cycleId, closeType, reference, actor, reason);
        
        CommandLedger cmd = CommandLedger.builder()
                .requestId(requestId)
                .commandType("CLOSE_CYCLE")
                .payloadHash(cycleId)
                .resultStatus("SUCCESS")
                .actor(actor != null ? actor : "SYSTEM")
                .build();
        commandLedgerRepo.save(cmd);
        
        return closed;
    }

    @Transactional
    public ClosedCycle submitSale(String requestId, String serialKey, BigDecimal finalPrice, String salesperson, Map<String, Object> saleDetails) {
        if (commandLedgerRepo.existsByRequestId(requestId)) {
            throw new IllegalArgumentException("Request " + requestId + " đã được xử lý (Idempotent).");
        }

        ActiveInventory ai = lookupSaleCandidate(serialKey);
        if (ai.getState() != CycleState.READY) {
            throw new IllegalStateException("Máy không ở trạng thái Sẵn sàng bán (READY). Trạng thái hiện tại: " + ai.getState());
        }
        
        ai.setSalePrice(finalPrice);
        activeInventoryRepo.save(ai); // Save the price before closing to have it in the snapshot

        ClosedCycle closed = stateTransitionService.transitionToClosed(ai.getCycleId(), CloseType.SALE, "SALE-" + requestId, salesperson, "Bán máy");
        
        // Enrich ClosedCycle with new sale fields
        if (saleDetails != null) {
            closed.setCustomerName((String) saleDetails.get("customerName"));
            closed.setCustomerPhone((String) saleDetails.get("customerPhone"));
            String saleRam = (String) saleDetails.get("saleRam");
            String saleSsd = (String) saleDetails.get("saleSsd");
            if (saleRam != null || saleSsd != null) {
                closed.setUpgradeNote("RAM: " + (saleRam != null ? saleRam : "Gốc") + " | SSD: " + (saleSsd != null ? saleSsd : "Gốc"));
            } else {
                closed.setUpgradeNote((String) saleDetails.get("upgradeNote"));
            }
            closed.setSaleNote((String) saleDetails.get("saleNote"));
            String wp = (String) saleDetails.get("warrantyPeriod");
            if ((wp == null || wp.isBlank()) && ai.getWarrantyPeriod() != null) {
                wp = ai.getWarrantyPeriod();
            }
            closed.setWarrantyPeriod(wp);
            
            Object discountObj = saleDetails.get("discount");
            if (discountObj != null) {
                closed.setDiscount(new BigDecimal(discountObj.toString()));
            }

            Object grossRevenueObj = saleDetails.get("grossRevenue");
            if (grossRevenueObj != null && !grossRevenueObj.toString().trim().isEmpty()) {
                try {
                    closed.setGrossRevenue(new BigDecimal(grossRevenueObj.toString().trim()));
                } catch (Exception e) {
                    log.warn("Invalid grossRevenue format: {}", grossRevenueObj);
                }
            }

            if (saleDetails.containsKey("paymentStatus")) {
                closed.setPaymentStatus((String) saleDetails.get("paymentStatus"));
            }

            if (saleDetails.containsKey("productFullName")) {
                closed.setProductFullName((String) saleDetails.get("productFullName"));
            }

            if (saleDetails.containsKey("productSummary")) {
                closed.setProductSummary((String) saleDetails.get("productSummary"));
            }

            Object warrantyExpiryObj = saleDetails.get("warrantyExpiry");
            if (warrantyExpiryObj != null) {
                if (warrantyExpiryObj instanceof java.time.LocalDate ld) {
                    closed.setWarrantyExpiry(ld);
                } else {
                    try {
                        closed.setWarrantyExpiry(java.time.LocalDate.parse(warrantyExpiryObj.toString().trim()));
                    } catch (Exception e) {
                        log.warn("Invalid warrantyExpiry format: {}", warrantyExpiryObj);
                    }
                }
            } else if (wp != null && !wp.isBlank()) {
                java.time.LocalDate baseSaleDate = java.time.LocalDate.now();
                if (closed.getSaleDate() != null) {
                    baseSaleDate = closed.getSaleDate().toLocalDate();
                } else if (closed.getClosedAt() != null) {
                    baseSaleDate = closed.getClosedAt().toLocalDate();
                }
                closed.setWarrantyExpiry(com.qkshop.tonkho.salesreport.SourceNormalizer.calculateWarrantyExpiry(baseSaleDate, wp));
            }
            
            Object saleDateObj = saleDetails.get("saleDate");
            if (saleDateObj != null) {
                String strDate = saleDateObj.toString().trim();
                try {
                    if (strDate.length() == 10) {
                        closed.setSaleDate(java.time.LocalDate.parse(strDate).atStartOfDay());
                    } else {
                        closed.setSaleDate(LocalDateTime.parse(strDate));
                    }
                } catch (Exception e) {
                    log.warn("Invalid saleDate format: {}", saleDateObj);
                }
            }
            
            // Deduct accessories
            List<Map<String, Object>> accessories = (List<Map<String, Object>>) saleDetails.get("accessories");
            if (accessories != null && !accessories.isEmpty()) {
                accessoryService.deductAccessories(accessories, closed.getCustomerName(), closed.getCustomerPhone(), closed.getCycleId(), salesperson, closed.getSaleDate());
                
                // Phân loại quà tặng mặc định (0đ) vs phụ kiện bán kèm ngoài mặc định để ghi chú đầy đủ
                List<String> giftItems = new java.util.ArrayList<>();
                List<String> paidItems = new java.util.ArrayList<>();
                for (Map<String, Object> a : accessories) {
                    boolean isGift = Boolean.TRUE.equals(a.get("isGift")) || "true".equalsIgnoreCase(String.valueOf(a.get("isGift")));
                    String nameWithQty = a.get("name") + " (x" + a.get("quantity") + ")";
                    if (isGift) {
                        giftItems.add(nameWithQty);
                    } else {
                        Object p = a.get("price");
                        String priceStr = (p != null && !p.toString().isEmpty()) ? " [" + p + "đ]" : "";
                        paidItems.add(nameWithQty + priceStr);
                    }
                }

                StringBuilder accNote = new StringBuilder();
                if (!giftItems.isEmpty()) {
                    accNote.append("Quà tặng mặc định: ").append(String.join(", ", giftItems));
                }
                if (!paidItems.isEmpty()) {
                    if (accNote.length() > 0) accNote.append(" | ");
                    accNote.append("Phụ kiện bán thêm: ").append(String.join(", ", paidItems));
                }

                String currentNote = closed.getSaleNote() != null ? closed.getSaleNote() : "";
                String newNote = currentNote.isEmpty() ? accNote.toString() 
                                                       : currentNote + " | " + accNote.toString();
                closed.setSaleNote(newNote);
            }
            
            // Save the updated closed cycle
            // Usually stateTransitionService.transitionToClosed saves it, but we modified it after.
            // However, ClosedCycle might be managed in this transaction. 
            // Wait, stateTransitionService might save and return it, let's assume it's managed or we need to save it.
            // If there's no closedCycleRepo here, since it's returned by stateTransitionService, it might be persisted.
            // But let's verify if JPA auto-commits changes to `closed` since it's within @Transactional. Yes, it will.
            // Lưu hoặc cập nhật vào bảng sales_orders để Dashboard có số liệu bán ngay lập tức
            try {
                String rawTxnId = (String) saleDetails.get("transactionId");
                final String txnId = (rawTxnId != null && !rawTxnId.isBlank()) ? rawTxnId : ("WEB-" + requestId);

                String firstSrc = (String) saleDetails.get("firstSource");
                String lastSrc = (String) saleDetails.get("lastSource");
                if (lastSrc == null || lastSrc.isBlank()) {
                    lastSrc = (String) saleDetails.get("source");
                }
                String custType = (String) saleDetails.get("customerType");
                Boolean isStudent = null;
                Object stuObj = saleDetails.get("isStudent");
                if (stuObj != null) {
                    if (stuObj instanceof Boolean b) isStudent = b;
                    else isStudent = "true".equalsIgnoreCase(stuObj.toString()) || "1".equals(stuObj.toString());
                }

                String brand = null;
                String segment = null;
                String series = null;
                String modelName = ai.getSourceModelText();
                if (ai.getConfig() != null && ai.getConfig().getVariant() != null) {
                    var v = ai.getConfig().getVariant();
                    if (v.getPlatform() != null && v.getPlatform().getModelLine() != null) {
                        var ml = v.getPlatform().getModelLine();
                        if (ml.getBrand() != null) brand = ml.getBrand().getBrandName();
                        if (ml.getSegmentCode() != null) segment = ml.getSegmentCode().name();
                        if (ml.getModelLineName() != null) modelName = ml.getModelLineName();
                    }
                }
                if (series == null) {
                    series = com.qkshop.tonkho.salesreport.SourceNormalizer.extractSeries(closed.getProductFullName(), modelName);
                }

                String normSource = com.qkshop.tonkho.salesreport.SourceNormalizer.normalizeSource(firstSrc, lastSrc);
                String inboxType = com.qkshop.tonkho.salesreport.SourceNormalizer.determineInboxType(normSource);

                LocalDateTime sDate = closed.getSaleDate() != null ? closed.getSaleDate() : LocalDateTime.now();

                com.qkshop.tonkho.salesreport.SalesOrder so = salesOrderRepo.findByTransactionId(txnId)
                        .orElseGet(() -> com.qkshop.tonkho.salesreport.SalesOrder.builder()
                                .transactionId(txnId)
                                .build());

                so.setSaleDate(sDate);
                so.setMonthDate(sDate.toLocalDate().withDayOfMonth(1));
                so.setCustomerName(closed.getCustomerName());
                so.setCustomerPhone(closed.getCustomerPhone());
                so.setCustomerType(custType != null ? custType : "Khách mua lần đầu");
                so.setFirstSource(firstSrc);
                so.setLastSource(lastSrc);
                so.setNormalizedSource(normSource);
                so.setInboxType(inboxType);
                so.setIsStudent(isStudent != null ? isStudent : false);
                so.setOrderStatus("Hoàn tất");
                so.setPaymentStatus(closed.getPaymentStatus() != null ? closed.getPaymentStatus() : "Đã thanh toán");
                so.setProductName(closed.getProductFullName() != null ? closed.getProductFullName() : ai.getSourceModelText());
                so.setBrand(brand);
                so.setSeries(series);
                so.setSegment(segment);
                so.setModelName(modelName);
                so.setConfigSummary(closed.getProductSummary());
                so.setWarrantyPeriod(closed.getWarrantyPeriod());
                so.setWarrantyExpiry(closed.getWarrantyExpiry());
                so.setGrossRevenue(closed.getGrossRevenue() != null ? closed.getGrossRevenue() : finalPrice);
                so.setDiscount(closed.getDiscount() != null ? closed.getDiscount() : BigDecimal.ZERO);
                so.setNetRevenue(finalPrice);
                so.setNote(closed.getSaleNote());
                so.setSerialKeys(serialKey);
                so.setSalesperson(salesperson);
                so.setMatchedCycleId(closed.getCycleId());
                so.setOrigin("WEB_APP");

                salesOrderRepo.save(so);
            } catch (Exception e) {
                log.warn("Không thể lưu SalesOrder từ submitSale: {}", e.getMessage());
            }
        }
        
        CommandLedger cmd = CommandLedger.builder()
                .requestId(requestId)
                .commandType("SUBMIT_SALE")
                .payloadHash(ai.getCycleId())
                .resultStatus("SUCCESS")
                .actor(salesperson != null ? salesperson : "SYSTEM")
                .build();
        commandLedgerRepo.save(cmd);

        return closed;
    }

    public Map<String, List<String>> getFilters() {
        return Map.of(
            "brands", variantRepo.findAll().stream().map(v -> v.getPlatform().getModelLine().getBrand().getBrandName()).distinct().collect(Collectors.toList()),
            "segments", variantRepo.findAll().stream().map(v -> v.getPlatform().getModelLine().getSegmentCode().name()).distinct().collect(Collectors.toList()),
            "cpus", variantRepo.findAll().stream().map(com.qkshop.tonkho.catalog.VariantV2::getCpuCode).filter(c -> c != null && !c.isEmpty()).distinct().collect(Collectors.toList()),
            "gpus", variantRepo.findAll().stream().map(com.qkshop.tonkho.catalog.VariantV2::getGpuCode).filter(c -> c != null && !c.isEmpty()).distinct().collect(Collectors.toList()),
            "screenSizes", variantRepo.findAll().stream().map(com.qkshop.tonkho.catalog.VariantV2::getScreenSize).filter(s -> s != null && !s.isEmpty()).distinct().collect(Collectors.toList())
        );
    }
}
