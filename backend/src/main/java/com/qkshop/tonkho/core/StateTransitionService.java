package com.qkshop.tonkho.core;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.log.EventLog;
import com.qkshop.tonkho.machine.SerialRegistry;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.core.enums.EventType;
import com.qkshop.tonkho.core.enums.SourceType;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.log.EventLogRepository;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.time.LocalDateTime;

/**
 * Service quản lý chuyển đổi trạng thái của vòng đời máy (CycleState).
 * Đảm bảo tính nhất quán giữa ActiveInventory, SerialRegistry và EventLog.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StateTransitionService {

    private final ActiveInventoryRepository activeInventoryRepo;
    private final SerialRegistryRepository serialRegistryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final EventLogRepository eventLogRepo;
    private final ObjectMapper objectMapper;

    /**
     * Chuyển từ NEEDS_INSPECTION -> READY
     */
    @Transactional
    public ActiveInventory transitionToReady(String cycleId, String actor, String notes) {
        ActiveInventory inventory = getActiveInventory(cycleId);
        
        if (inventory.getState() != CycleState.NEEDS_INSPECTION) {
            throw new IllegalStateException("Chỉ có thể chuyển sang READY từ trạng thái NEEDS_INSPECTION");
        }

        inventory.setState(CycleState.READY);
        if (inventory.getLastPausedAt() != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(inventory.getLastPausedAt(), LocalDateTime.now());
            inventory.setPausedDays((inventory.getPausedDays() != null ? inventory.getPausedDays() : 0) + days);
            inventory.setLastPausedAt(null);
        }
        inventory = activeInventoryRepo.save(inventory);

        // Update SerialRegistry
        SerialRegistry registry = getRegistry(inventory.getSerialKey());
        registry.setCurrentState(CycleState.READY);

        // Ghi EventLog
        logEvent(inventory, EventType.INSPECTION_PASSED, actor, notes, registry);

        return inventory;
    }

    /**
     * Chuyển từ NEEDS_INSPECTION / READY -> CLOSED (Đóng vòng đời)
     */
    @Transactional
    public ClosedCycle transitionToClosed(String cycleId, CloseType closeType, String externalRefId, String actor, String notes) {
        ActiveInventory inventory = getActiveInventory(cycleId);
        
        // Tạo EventLog trước để lấy eventId
        EventLog event = EventLog.builder()
                .eventId("EVT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8))
                .idempotencyKey(UUID.randomUUID().toString())
                .eventType(closeType == CloseType.SALE ? EventType.CYCLE_CLOSED_SOLD : EventType.CYCLE_CLOSED_RETURNED)
                .entityType("CLOSED_CYCLE")
                .entityId(cycleId)
                .serialKey(inventory.getSerialKey())
                .cycleId(cycleId)
                .sourceType(SourceType.WEB_APP)
                .actor(actor)
                .notes(notes)
                .build();
                
        // Tính chốt pausedDays nếu đang paused
        Long finalPausedDays = inventory.getPausedDays() != null ? inventory.getPausedDays() : 0L;
        if (inventory.getState() == CycleState.NEEDS_INSPECTION && inventory.getLastPausedAt() != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(inventory.getLastPausedAt(), LocalDateTime.now());
            finalPausedDays += days;
        }

        // Tạo ClosedCycle từ ActiveInventory
        ClosedCycle closedCycle = ClosedCycle.builder()
                .cycleId(inventory.getCycleId())
                .serialKey(inventory.getSerialKey())
                .config(inventory.getConfig())
                .sourceModelText(inventory.getSourceModelText())
                .intakeType(inventory.getIntakeType())
                .intakeAt(inventory.getIntakeAt())
                .readyAt(inventory.getReadyAt())
                .closeType(closeType)
                .salePriceSnapshot(inventory.getSalePrice())
                .sourceReference(externalRefId)
                .closeEventId(event.getEventId())
                .closeReason(notes)
                .pausedDays(finalPausedDays)
                .build();
        
        closedCycle = closedCycleRepo.save(closedCycle);

        // Xóa khỏi ActiveInventory
        activeInventoryRepo.delete(inventory);

        // Update SerialRegistry
        SerialRegistry registry = getRegistry(inventory.getSerialKey());
        registry.setCurrentState(CycleState.CLOSED);
        registry.setLastEventId(event.getEventId());
        serialRegistryRepo.save(registry);

        // Cập nhật snapshot và lưu EventLog
        try {
            event.setAfterSnapshot(objectMapper.writeValueAsString(closedCycle));
            eventLogRepo.save(event);
        } catch (Exception e) {
            log.error("Lỗi khi ghi event log snapshot", e);
        }

        return closedCycle;
    }

    private ActiveInventory getActiveInventory(String cycleId) {
        return activeInventoryRepo.findByCycleId(cycleId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ActiveInventory với cycleId: " + cycleId));
    }

    private SerialRegistry getRegistry(String serialKey) {
        return serialRegistryRepo.findBySerialKey(serialKey)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy SerialRegistry với serialKey: " + serialKey));
    }

    private void logEvent(ActiveInventory inventory, EventType eventType, String actor, String notes, SerialRegistry registry) {
        try {
            EventLog event = EventLog.builder()
                    .eventId("EVT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8))
                    .idempotencyKey(UUID.randomUUID().toString())
                    .eventType(eventType)
                    .entityType("ACTIVE_INVENTORY")
                    .entityId(inventory.getCycleId())
                    .serialKey(inventory.getSerialKey())
                    .cycleId(inventory.getCycleId())
                    .afterSnapshot(objectMapper.writeValueAsString(inventory))
                    .sourceType(SourceType.WEB_APP)
                    .actor(actor)
                    .notes(notes)
                    .build();
            eventLogRepo.save(event);

            registry.setLastEventId(event.getEventId());
            serialRegistryRepo.save(registry);
        } catch (Exception e) {
            log.error("Lỗi khi ghi event log", e);
        }
    }
}
