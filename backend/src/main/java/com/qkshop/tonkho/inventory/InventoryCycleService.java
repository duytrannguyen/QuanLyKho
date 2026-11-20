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
    private final ClosedCycleRepository closedCycleRepo;
    private final SerialRegistryRepository serialRegistryRepo;
    private final VariantV2Repository variantRepo;
    private final StateTransitionService stateTransitionService;
    private final CommandLedgerRepository commandLedgerRepo;
    private final AccessoryService accessoryService;
    private final com.qkshop.tonkho.part.PartService partService;
    private final com.qkshop.tonkho.salesreport.OrderDataSyncService orderDataSyncService;
    private final com.qkshop.tonkho.core.service.InvoiceCodeService invoiceCodeService;

    /**
     * Tra cứu theo VariantV2.
     * Quét ActiveInventory (với JOIN FETCH), gom nhóm theo SalesConfig bằng LinkedHashMap để thứ tự trang luôn cố định.
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

        // Group by SalesConfig with deterministic order
        Map<String, SalesConfig> configMap = new LinkedHashMap<>();
        Map<String, List<ActiveInventory>> grouped = new LinkedHashMap<>();

        for (ActiveInventory ai : allActive) {
            SalesConfig config = ai.getConfig();
            VariantV2 variant = config != null ? config.getVariant() : null;

            // Filter by text query
            if (StringUtils.hasText(query)) {
                String q = query.trim().toLowerCase();
                boolean match = ai.getSerialKey().toLowerCase().contains(q)
                        || (variant != null && variant.getVariantName() != null && variant.getVariantName().toLowerCase().contains(q))
                        || (ai.getSourceModelText() != null && ai.getSourceModelText().toLowerCase().contains(q))
                        || (config != null && config.getDisplayName() != null && config.getDisplayName().toLowerCase().contains(q))
                        || (config != null && config.getConfigId() != null && config.getConfigId().toLowerCase().contains(q))
                        || (variant != null && variant.getPlatform() != null && variant.getPlatform().getPlatformCode() != null && variant.getPlatform().getPlatformCode().toLowerCase().contains(q))
                        || (variant != null && variant.getPlatform() != null && variant.getPlatform().getDisplayName() != null && variant.getPlatform().getDisplayName().toLowerCase().contains(q))
                        || (variant != null && variant.getCpuCode() != null && variant.getCpuCode().toLowerCase().contains(q));
                if (!match) continue;
            }

            String key = (config != null && config.getConfigId() != null)
                    ? config.getConfigId()
                    : (config != null ? String.valueOf(config.getId()) : "CHUA_CAU_HINH");
            SalesConfig groupConfig = config != null
                    ? config
                    : SalesConfig.builder()
                            .configId("CHUA_CAU_HINH")
                            .displayName("Máy chưa gắn cấu hình")
                            .ramCode("-")
                            .ssdCode("-")
                            .build();
            configMap.putIfAbsent(key, groupConfig);
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(ai);
        }

        List<InventoryVariantV2DTO> results = grouped.entrySet().stream().map(entry -> {
            SalesConfig config = configMap.get(entry.getKey());
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

    public ActiveInventory lookupSaleCandidate(String keyword) {
        String clean = keyword.trim();
        String upper = clean.toUpperCase();

        // 1. Tìm chính xác theo serial (viết hoa chuẩn)
        Optional<ActiveInventory> aiOpt = activeInventoryRepo.findBySerialKey(upper);
        if (aiOpt.isPresent()) {
            return aiOpt.get();
        }

        // 2. Tìm theo cycleId hoặc serial nguyên bản
        aiOpt = activeInventoryRepo.findBySerialKeyIgnoreCaseOrCycleId(clean, clean);
        if (aiOpt.isPresent()) {
            return aiOpt.get();
        }

        // 3. Tìm theo từ khóa (serial chứa từ khóa hoặc tên model chứa từ khóa)
        List<ActiveInventory> matches = activeInventoryRepo.searchSaleCandidates(clean);
        if (!matches.isEmpty()) {
            return matches.stream()
                    .filter(m -> m.getState() == CycleState.READY)
                    .findFirst()
                    .orElse(matches.get(0));
        }

        throw new IllegalArgumentException("Không tìm thấy máy trong kho với từ khóa/serial: " + keyword);
    }

    public ActiveInventory lookupSaleCandidateForUpdate(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            throw new IllegalArgumentException("Từ khóa tìm kiếm serial máy không được để trống");
        }
        String clean = keyword.trim();
        String upper = clean.toUpperCase();

        Optional<ActiveInventory> aiOpt = activeInventoryRepo.findBySerialKeyOrCycleIdForUpdate(upper);
        if (aiOpt.isPresent()) {
            return aiOpt.get();
        }

        aiOpt = activeInventoryRepo.findBySerialKeyOrCycleIdForUpdate(clean);
        if (aiOpt.isPresent()) {
            return aiOpt.get();
        }

        return lookupSaleCandidate(keyword);
    }

    public List<ActiveInventory> searchSaleCandidates(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return List.of();
        }
        return activeInventoryRepo.searchSaleCandidates(keyword.trim());
    }

    @Transactional
    public ClosedCycle closeCycle(String requestId, String cycleId, CloseType closeType, String reference, String reason, String actor) {
        if (commandLedgerRepo.existsByRequestId(requestId)) {
            log.info("Request {} already processed", requestId);
            throw new IllegalArgumentException("Request " + requestId + " đã được xử lý (Idempotent).");
        }

        activeInventoryRepo.findByCycleId(cycleId)
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

    @Transactional(rollbackFor = Exception.class)
    public ClosedCycle submitSale(String requestId, String serialKey, BigDecimal finalPrice, String salesperson, Map<String, Object> saleDetails) {
        if (commandLedgerRepo.existsByRequestId(requestId)) {
            throw new IllegalArgumentException("Request " + requestId + " đã được xử lý (Idempotent).");
        }

        ActiveInventory ai = lookupSaleCandidateForUpdate(serialKey);
        if (ai.getState() != CycleState.READY) {
            throw new IllegalStateException("Máy " + serialKey + " không ở trạng thái Sẵn sàng bán (READY) hoặc vừa được bán bởi nhân viên khác. Trạng thái hiện tại: " + ai.getState());
        }

        BigDecimal originalListedPrice = ai.getSalePrice();
        if ((originalListedPrice == null || originalListedPrice.compareTo(BigDecimal.ZERO) <= 0) && ai.getConfig() != null) {
            originalListedPrice = ai.getConfig().getDefaultSalePrice();
        }

        LocalDateTime sDate = LocalDateTime.now();
        if (saleDetails != null && saleDetails.containsKey("saleDate") && saleDetails.get("saleDate") != null) {
            String strDate = saleDetails.get("saleDate").toString().trim();
            try {
                if (strDate.length() == 10) {
                    sDate = java.time.LocalDate.parse(strDate).atStartOfDay();
                } else {
                    sDate = LocalDateTime.parse(strDate);
                }
            } catch (Exception e) {
                log.warn("Invalid saleDate format: {}", saleDetails.get("saleDate"));
            }
        }

        String rawTxnId = saleDetails != null ? (String) saleDetails.get("transactionId") : null;
        if (rawTxnId == null || rawTxnId.isBlank()) {
            rawTxnId = saleDetails != null ? (String) saleDetails.get("orderCode") : null;
        }
        final String txnId = (rawTxnId != null && !rawTxnId.isBlank())
                ? rawTxnId
                : invoiceCodeService.generateMachineInvoiceCode(sDate);

        ClosedCycle closed = stateTransitionService.transitionToClosed(ai.getCycleId(), CloseType.SALE, txnId, salesperson, "Bán máy");
        closed.setSourceReference(txnId);
        closed.setSaleDate(sDate);

        if (saleDetails != null) {
            closed.setCustomerName((String) saleDetails.get("customerName"));
            closed.setCustomerPhone((String) saleDetails.get("customerPhone"));
            String saleRam = (String) saleDetails.get("saleRam");
            String saleSsd = (String) saleDetails.get("saleSsd");
            String customUpgradeNote = (String) saleDetails.get("upgradeNote");

            if (customUpgradeNote != null && !customUpgradeNote.isBlank()) {
                closed.setUpgradeNote(customUpgradeNote.trim());
            } else if (saleRam != null || saleSsd != null) {
                closed.setUpgradeNote("RAM: " + (saleRam != null ? saleRam : "Gốc") + " | SSD: " + (saleSsd != null ? saleSsd : "Gốc"));
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
            } else if (originalListedPrice != null) {
                closed.setGrossRevenue(originalListedPrice);
            }

            if (saleDetails.containsKey("paymentStatus")) {
                closed.setPaymentStatus((String) saleDetails.get("paymentStatus"));
            }

            String prodFullName = (String) saleDetails.get("productFullName");
            if (prodFullName == null || prodFullName.isBlank()) {
                prodFullName = ai.getSourceModelText();
            }
            closed.setProductFullName(prodFullName);

            String prodSummary = (String) saleDetails.get("productSummary");
            if (prodSummary == null || prodSummary.isBlank()) {
                List<String> specs = new java.util.ArrayList<>();
                if (ai.getConfig() != null) {
                    if (ai.getConfig().getRamCode() != null) specs.add("RAM " + ai.getConfig().getRamCode());
                    if (ai.getConfig().getSsdCode() != null) specs.add("SSD " + ai.getConfig().getSsdCode());
                    if (ai.getConfig().getVariant() != null) {
                        if (ai.getConfig().getVariant().getCpuCode() != null) specs.add(ai.getConfig().getVariant().getCpuCode());
                        if (ai.getConfig().getVariant().getGpuCode() != null) specs.add(ai.getConfig().getVariant().getGpuCode());
                        if (ai.getConfig().getVariant().getScreenSize() != null) specs.add(ai.getConfig().getVariant().getScreenSize());
                    }
                }
                prodSummary = String.join(" | ", specs);
            }
            closed.setProductSummary(prodSummary);

            // Xử lý đơn ship và kích hoạt bảo hành
            boolean isShipping = false;
            if (saleDetails.containsKey("isShipping") && saleDetails.get("isShipping") != null) {
                Object sObj = saleDetails.get("isShipping");
                if (sObj instanceof Boolean b) isShipping = b;
                else isShipping = "true".equalsIgnoreCase(sObj.toString()) || "1".equals(sObj.toString());
            }

            boolean isDelivered = !isShipping;
            if (isShipping && saleDetails.containsKey("isDelivered") && saleDetails.get("isDelivered") != null) {
                Object dObj = saleDetails.get("isDelivered");
                if (dObj instanceof Boolean b) isDelivered = b;
                else isDelivered = "true".equalsIgnoreCase(dObj.toString()) || "1".equals(dObj.toString());
            }

            java.time.LocalDate delDate = null;
            if (isDelivered) {
                if (saleDetails.containsKey("deliveryDate") && saleDetails.get("deliveryDate") != null && !saleDetails.get("deliveryDate").toString().isBlank()) {
                    try {
                        delDate = java.time.LocalDate.parse(saleDetails.get("deliveryDate").toString().trim());
                    } catch (Exception e) {
                        log.warn("Invalid deliveryDate format: {}", saleDetails.get("deliveryDate"));
                    }
                }
                if (delDate == null) {
                    delDate = closed.getSaleDate() != null ? closed.getSaleDate().toLocalDate() : java.time.LocalDate.now();
                }
            }

            closed.setIsShipping(isShipping);
            closed.setIsDelivered(isDelivered);
            closed.setDeliveryDate(delDate);

            if (saleDetails.containsKey("shippingCarrier")) {
                closed.setShippingCarrier((String) saleDetails.get("shippingCarrier"));
            }
            if (saleDetails.containsKey("trackingCode")) {
                closed.setTrackingCode((String) saleDetails.get("trackingCode"));
            }
            if (saleDetails.containsKey("shippingAddress")) {
                closed.setShippingAddress((String) saleDetails.get("shippingAddress"));
            }
            if (saleDetails.containsKey("depositAmount") && saleDetails.get("depositAmount") != null) {
                try {
                    closed.setDepositAmount(new BigDecimal(saleDetails.get("depositAmount").toString().replaceAll("[^0-9.]", "")));
                } catch (Exception ignored) {}
            }
            if (saleDetails.containsKey("codAmount") && saleDetails.get("codAmount") != null) {
                try {
                    closed.setCodAmount(new BigDecimal(saleDetails.get("codAmount").toString().replaceAll("[^0-9.]", "")));
                } catch (Exception ignored) {}
            }

            boolean isCompanyWarranty = wp != null && (wp.equalsIgnoreCase("Bảo hành hãng") || wp.toLowerCase().contains("hãng"));
            if (isShipping && !isDelivered && !isCompanyWarranty) {
                // Đơn ship đang gửi đi: Chưa kích hoạt bảo hành cửa hàng cho đến khi khách nhận được hàng
                closed.setWarrantyExpiry(null);
            } else {
                Object warrantyExpiryObj = saleDetails.get("warrantyExpiry");
                if (warrantyExpiryObj != null && !warrantyExpiryObj.toString().trim().isEmpty()) {
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
                    java.time.LocalDate baseDate = delDate != null ? delDate : (closed.getSaleDate() != null ? closed.getSaleDate().toLocalDate() : java.time.LocalDate.now());
                    closed.setWarrantyExpiry(com.qkshop.tonkho.salesreport.SourceNormalizer.calculateWarrantyExpiry(baseDate, wp));
                }
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

            // Deduct accessories, bundled charger & upgrade parts
            List<Map<String, Object>> accessories = (List<Map<String, Object>>) saleDetails.get("accessories");
            BigDecimal totalPaidAccessoriesAmount = BigDecimal.ZERO;

            String chargerName = saleDetails.get("chargerName") != null ? saleDetails.get("chargerName").toString().trim() : null;
            String chargerSku = saleDetails.get("chargerSku") != null ? saleDetails.get("chargerSku").toString().trim() : null;
            if (chargerName != null && chargerName.isEmpty()) chargerName = null;
            if (chargerSku != null && chargerSku.isEmpty()) chargerSku = null;

            List<Map<String, Object>> generalAccessories = new java.util.ArrayList<>();
            List<String> giftItems = new java.util.ArrayList<>();
            List<String> paidItems = new java.util.ArrayList<>();
            List<String> upgradeItems = new java.util.ArrayList<>();

            if (accessories != null && !accessories.isEmpty()) {
                for (Map<String, Object> a : accessories) {
                    boolean isChargerItem = Boolean.TRUE.equals(a.get("isCharger")) || "true".equalsIgnoreCase(String.valueOf(a.get("isCharger")));
                    boolean isGift = Boolean.TRUE.equals(a.get("isGift")) || "true".equalsIgnoreCase(String.valueOf(a.get("isGift")));
                    boolean isUpgrade = Boolean.TRUE.equals(a.get("isUpgrade")) || "true".equalsIgnoreCase(String.valueOf(a.get("isUpgrade")));
                    String sku = (String) a.get("sku");

                    if (isChargerItem) {
                        if (chargerSku == null && sku != null && !sku.trim().isEmpty()) {
                            chargerSku = sku.trim();
                        }
                        if (chargerName == null && a.get("name") != null && !a.get("name").toString().trim().isEmpty()) {
                            chargerName = a.get("name").toString().trim();
                        }
                        continue;
                    }

                    String nameWithQty = a.get("name") + " (x" + a.get("quantity") + ")";
                    int qty = a.get("quantity") != null ? Integer.parseInt(a.get("quantity").toString()) : 1;
                    BigDecimal price = BigDecimal.ZERO;
                    Object p = a.get("price");
                    if (p != null && !p.toString().isEmpty()) {
                        try {
                            price = new BigDecimal(p.toString().replaceAll("[^0-9.]", ""));
                        } catch (Exception ignored) {}
                    }

                    if (isUpgrade) {
                        String priceStr = price.compareTo(BigDecimal.ZERO) > 0 ? " [+" + price + "đ]" : "";
                        upgradeItems.add(nameWithQty + priceStr);
                        boolean deducted = (sku != null && !sku.trim().isEmpty())
                                && partService.deductForUpgrade(sku.trim(), qty, price, closed.getCycleId(),
                                closed.getCustomerName(), closed.getCustomerPhone(), salesperson, closed.getWarrantyPeriod());
                        if (!deducted) {
                            generalAccessories.add(a);
                        }
                    } else if (isGift) {
                        giftItems.add(nameWithQty);
                        generalAccessories.add(a);
                    } else {
                        // Phụ kiện mua thêm có tính phí - đồng nhất logic lấy giá với AccessoryService.deductAccessories
                        BigDecimal resolvedPrice = accessoryService.resolvePaidAccessoryPrice(a, null);
                        Map<String, Object> mutableAcc = new java.util.HashMap<>(a);
                        mutableAcc.put("price", resolvedPrice);
                        BigDecimal itemTotal = resolvedPrice.multiply(BigDecimal.valueOf(qty));
                        totalPaidAccessoriesAmount = totalPaidAccessoriesAmount.add(itemTotal);
                        String priceStr = resolvedPrice.compareTo(BigDecimal.ZERO) > 0 ? " [" + resolvedPrice + "đ]" : "";
                        paidItems.add(nameWithQty + priceStr);
                        generalAccessories.add(mutableAcc);
                    }
                }
            }

            if (chargerSku != null) {
                if (chargerName == null) {
                    chargerName = accessoryService.findBySku(chargerSku)
                            .map(com.qkshop.tonkho.accessory.Accessory::getName)
                            .orElse(chargerSku);
                }
                Map<String, Object> chargerItem = new java.util.HashMap<>();
                chargerItem.put("sku", chargerSku);
                chargerItem.put("name", chargerName);
                chargerItem.put("quantity", 1);
                chargerItem.put("isGift", true);
                chargerItem.put("isCharger", true);
                chargerItem.put("price", BigDecimal.ZERO);
                generalAccessories.add(chargerItem);
            }

            closed.setChargerName(chargerName);
            closed.setChargerSku(chargerSku);

            if (!generalAccessories.isEmpty()) {
                accessoryService.deductAccessories(
                        generalAccessories,
                        closed.getCustomerName(),
                        closed.getCustomerPhone(),
                        closed.getCycleId(),
                        salesperson,
                        closed.getSaleDate(),
                        isShipping,
                        isDelivered,
                        delDate,
                        wp,
                        closed.getWarrantyExpiry()
                );
            }

            StringBuilder accNote = new StringBuilder();
            if (chargerName != null) {
                accNote.append("Sạc kèm theo máy: ").append(chargerName);
                if (chargerSku == null) {
                    accNote.append(" (Ngoài kho)");
                }
            }
            if (!upgradeItems.isEmpty()) {
                if (accNote.length() > 0) accNote.append(" | ");
                accNote.append("Linh kiện nâng cấp: ").append(String.join(", ", upgradeItems));
            }
            if (!giftItems.isEmpty()) {
                if (accNote.length() > 0) accNote.append(" | ");
                accNote.append("Quà tặng mặc định: ").append(String.join(", ", giftItems));
            }
            if (!paidItems.isEmpty()) {
                if (accNote.length() > 0) accNote.append(" | ");
                accNote.append("Phụ kiện bán thêm: ").append(String.join(", ", paidItems));
            }

            if (!accNote.isEmpty()) {
                String currentNote = closed.getSaleNote() != null ? closed.getSaleNote() : "";
                String newNote = currentNote.isEmpty() ? accNote.toString()
                                                       : currentNote + " | " + accNote.toString();
                closed.setSaleNote(newNote);
            }

            // Thu hồi linh kiện zin tháo máy (swapParts: RAM, SSD zin của khách để lại khi nâng cấp)
            Object swapPartsObj = saleDetails.get("swapParts");
            if (swapPartsObj instanceof List<?> swapList && !swapList.isEmpty()) {
                List<String> swappedItems = new java.util.ArrayList<>();
                for (Object itemObj : swapList) {
                    if (itemObj instanceof Map<?, ?> itemMap) {
                        String sku = (String) itemMap.get("sku");
                        int qty = 1;
                        if (itemMap.get("quantity") != null) {
                            try {
                                qty = Integer.parseInt(itemMap.get("quantity").toString());
                            } catch (Exception ignored) {}
                        }
                        String reason = (String) itemMap.get("reason");
                        if (sku != null && !sku.trim().isEmpty()) {
                            boolean swapped = partService.swapInPart(
                                    sku.trim(),
                                    qty,
                                    closed.getCycleId(),
                                    closed.getCustomerName(),
                                    closed.getCustomerPhone(),
                                    salesperson,
                                    reason != null ? reason : ("Thu hồi linh kiện tháo máy nâng cấp chu kỳ " + closed.getCycleId())
                            );
                            if (swapped) {
                                swappedItems.add(sku.trim() + " (x" + qty + ")");
                            }
                        }
                    }
                }
                if (!swappedItems.isEmpty()) {
                    String swapNote = "Thu hồi linh kiện swap: " + String.join(", ", swappedItems);
                    String curNote = closed.getSaleNote() != null ? closed.getSaleNote() : "";
                    closed.setSaleNote(curNote.isEmpty() ? swapNote : curNote + " | " + swapNote);
                }
            }

            BigDecimal machineNetRevenue = finalPrice.subtract(totalPaidAccessoriesAmount);
            if (machineNetRevenue.compareTo(BigDecimal.ZERO) < 0) {
                machineNetRevenue = BigDecimal.ZERO;
            }
            closed.setSalePriceSnapshot(machineNetRevenue);

            closed = closedCycleRepo.save(closed);

            try {
                Map<String, Object> extraMeta = new HashMap<>(saleDetails);
                extraMeta.put("salesperson", salesperson);
                orderDataSyncService.syncClosedCycleToSalesOrder(closed, extraMeta, true);
            } catch (Exception e) {
                log.warn("Không thể lưu SalesOrder từ submitSale: {}", e.getMessage());
            }
        } else {
            closed = closedCycleRepo.save(closed);
            try {
                Map<String, Object> extraMeta = salesperson != null ? Map.of("salesperson", salesperson) : null;
                orderDataSyncService.syncClosedCycleToSalesOrder(closed, extraMeta, false);
            } catch (Exception e) {
                log.warn("Không thể lưu SalesOrder mặc định từ submitSale: {}", e.getMessage());
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
        List<VariantV2> variants = variantRepo.findAllWithHierarchy();
        return Map.of(
            "brands", variants.stream()
                    .filter(v -> v.getPlatform() != null && v.getPlatform().getModelLine() != null && v.getPlatform().getModelLine().getBrand() != null)
                    .map(v -> v.getPlatform().getModelLine().getBrand().getBrandName())
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList()),
            "segments", variants.stream()
                    .filter(v -> v.getPlatform() != null && v.getPlatform().getModelLine() != null && v.getPlatform().getModelLine().getSegmentCode() != null)
                    .map(v -> v.getPlatform().getModelLine().getSegmentCode().name())
                    .distinct()
                    .collect(Collectors.toList()),
            "cpus", variants.stream()
                    .map(VariantV2::getCpuCode)
                    .filter(c -> c != null && !c.isEmpty())
                    .distinct()
                    .collect(Collectors.toList()),
            "gpus", variants.stream()
                    .map(VariantV2::getGpuCode)
                    .filter(g -> g != null && !g.isEmpty())
                    .distinct()
                    .collect(Collectors.toList()),
            "screenSizes", variants.stream()
                    .map(VariantV2::getScreenSize)
                    .filter(s -> s != null && !s.isEmpty())
                    .distinct()
                    .collect(Collectors.toList())
        );
    }
}
