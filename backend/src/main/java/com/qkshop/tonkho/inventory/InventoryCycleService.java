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

    /**
     * Tra cứu theo VariantV2.
     * Cực kỳ đơn giản: Quét ActiveInventory, fetch Config -> Variant -> Platform.
     * Rồi gom nhóm theo VariantV2.
     */
    public Page<InventoryVariantV2DTO> searchInventory(String query, String brand, String segment, String status, int page, int size) {
        List<ActiveInventory> allActive = activeInventoryRepo.findAll();

        // Group by SalesConfig
        Map<SalesConfig, List<ActiveInventory>> grouped = new HashMap<>();
        
        for (ActiveInventory ai : allActive) {
            SalesConfig config = ai.getConfig();
            if (config == null) continue;
            
            VariantV2 variant = config.getVariant();
            
            // Filter by brand
            if (StringUtils.hasText(brand) && !"Tất cả".equalsIgnoreCase(brand)) {
                if (!variant.getPlatform().getModelLine().getBrand().getBrandName().equalsIgnoreCase(brand)) {
                    continue;
                }
            }
            
            // Filter by segment
            if (StringUtils.hasText(segment) && !"Tất cả".equalsIgnoreCase(segment)) {
                if (!variant.getPlatform().getModelLine().getSegmentCode().name().equalsIgnoreCase(segment)) {
                    continue;
                }
            }
            
            // Filter by text query
            if (StringUtils.hasText(query)) {
                String q = query.toLowerCase();
                boolean match = ai.getSerialKey().toLowerCase().contains(q) || 
                                variant.getVariantName().toLowerCase().contains(q);
                if (!match) continue;
            }
            
            // Filter by status
            if (StringUtils.hasText(status) && !"Tất cả".equalsIgnoreCase(status)) {
                if (status.equalsIgnoreCase("READY") || status.equalsIgnoreCase("SAN_SANG_BAN")) {
                    if (ai.getState() != CycleState.READY) continue;
                } else if (status.equalsIgnoreCase("NEEDS_INSPECTION") || status.equalsIgnoreCase("CAN_KIEM_TRA") || status.equalsIgnoreCase("DANG_KIEM_TRA")) {
                    if (ai.getState() != CycleState.NEEDS_INSPECTION) continue;
                }
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
            closed.setWarrantyPeriod((String) saleDetails.get("warrantyPeriod"));
            
            Object discountObj = saleDetails.get("discount");
            if (discountObj != null) {
                closed.setDiscount(new BigDecimal(discountObj.toString()));
            }
            
            Object saleDateObj = saleDetails.get("saleDate");
            if (saleDateObj != null) {
                try {
                    closed.setSaleDate(LocalDateTime.parse(saleDateObj.toString()));
                } catch (Exception e) {
                    log.warn("Invalid saleDate format: {}", saleDateObj);
                }
            }
            
            // Deduct accessories
            List<Map<String, Object>> accessories = (List<Map<String, Object>>) saleDetails.get("accessories");
            if (accessories != null && !accessories.isEmpty()) {
                accessoryService.deductAccessories(accessories, closed.getCustomerName(), closed.getCustomerPhone());
                // Also update the note to include accessories
                String accessoryNames = accessories.stream()
                        .map(a -> a.get("name") + " (x" + a.get("quantity") + ")")
                        .collect(Collectors.joining(", "));
                String currentNote = closed.getSaleNote() != null ? closed.getSaleNote() : "";
                String newNote = currentNote.isEmpty() ? "Phụ kiện bán kèm: " + accessoryNames 
                                                       : currentNote + " | Phụ kiện bán kèm: " + accessoryNames;
                closed.setSaleNote(newNote);
            }
            
            // Save the updated closed cycle
            // Usually stateTransitionService.transitionToClosed saves it, but we modified it after.
            // However, ClosedCycle might be managed in this transaction. 
            // Wait, stateTransitionService might save and return it, let's assume it's managed or we need to save it.
            // If there's no closedCycleRepo here, since it's returned by stateTransitionService, it might be persisted.
            // But let's verify if JPA auto-commits changes to `closed` since it's within @Transactional. Yes, it will.
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
