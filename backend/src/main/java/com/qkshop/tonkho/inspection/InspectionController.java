package com.qkshop.tonkho.inspection;

import com.qkshop.tonkho.inspection.dto.UpdateInspectionProgressRequest;
import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inspection.dto.InspectionDTO;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.InventoryDurationHelper;
import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inspection.InspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inspections")
@RequiredArgsConstructor
public class InspectionController {

    private final InspectionService inspectionService;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;

    /** Lấy danh sách phiếu kiểm tra, lọc theo status */
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<List<InspectionDTO>>> getInspections(
            @RequestParam(required = false) String status) {
        List<InspectionRequest> requests = inspectionService.getActiveRequests(status);
        CycleLookupContext ctx = preloadCycles(requests);
        List<InspectionDTO> result = requests.stream()
                .map(req -> toDTO(req, ctx.activeMap().get(req.getCycleId()), ctx.closedMap().get(req.getCycleId())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Lấy tất cả có phân trang */
    @GetMapping("/all")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<Page<InspectionDTO>>> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<InspectionRequest> paged = inspectionService.getAllRequests(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        CycleLookupContext ctx = preloadCycles(paged.getContent());
        Page<InspectionDTO> dtoPaged = paged.map(
                req -> toDTO(req, ctx.activeMap().get(req.getCycleId()), ctx.closedMap().get(req.getCycleId())));
        return ResponseEntity.ok(ApiResponse.ok(dtoPaged));
    }

    /** Lưu tiến độ kiểm tra */
    @PutMapping("/{id}/progress")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<InspectionRequest>> updateProgress(
            @PathVariable String id,
            @RequestBody UpdateInspectionProgressRequest request,
            Authentication authentication) {
        InspectionRequest updated = inspectionService.updateProgress(
                id, request.getProgressNotes(), request.isRequiredDataComplete(), authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã lưu tiến độ", updated));
    }

    /** Gửi kiểm tra lại */
    @PostMapping("/{id}/recheck")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<InspectionRequest>> sendToRecheck(
            @PathVariable String id, Authentication authentication) {
        InspectionRequest updated = inspectionService.sendToRecheck(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã gửi kiểm tra lại", updated));
    }

    /** Bắt đầu kiểm tra */
    @PostMapping("/{id}/start")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<InspectionRequest>> startInspection(
            @PathVariable String id, Authentication authentication) {
        InspectionRequest updated = inspectionService.startInspection(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Bắt đầu kiểm tra", updated));
    }

    /** Xác nhận Đạt */
    @PostMapping("/{id}/approve")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<InspectionRequest>> approveInspection(
            @PathVariable String id, 
            @RequestBody(required = false) java.util.Map<String, String> payload,
            Authentication authentication) {
        String notes = payload != null ? payload.getOrDefault("notes", "") : "";
        InspectionRequest updated = inspectionService.approveInspection(id, authentication.getName(), notes);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xác nhận Đạt", updated));
    }

    /** Hủy/Trả máy */
    @PostMapping("/{id}/reject")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN') or hasAuthority('INSPECTION')")
    public ResponseEntity<ApiResponse<InspectionRequest>> rejectInspection(
            @PathVariable String id, 
            @RequestBody(required = false) java.util.Map<String, String> payload,
            Authentication authentication) {
        String notes = payload != null ? payload.getOrDefault("notes", "") : "";
        InspectionRequest updated = inspectionService.rejectInspection(id, authentication.getName(), notes);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã Hủy/Trả máy", updated));
    }

    // ==================== MAPPER ====================

    private record CycleLookupContext(Map<String, ActiveInventory> activeMap, Map<String, ClosedCycle> closedMap) {}

    private CycleLookupContext preloadCycles(List<InspectionRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return new CycleLookupContext(Collections.emptyMap(), Collections.emptyMap());
        }
        Set<String> cycleIds = requests.stream()
                .map(InspectionRequest::getCycleId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (cycleIds.isEmpty()) {
            return new CycleLookupContext(Collections.emptyMap(), Collections.emptyMap());
        }
        Map<String, ActiveInventory> activeMap = activeInventoryRepo.findByCycleIdIn(cycleIds).stream()
                .collect(Collectors.toMap(ActiveInventory::getCycleId, ai -> ai, (a, b) -> a));

        Set<String> missingIds = cycleIds.stream()
                .filter(id -> !activeMap.containsKey(id))
                .collect(Collectors.toSet());
        Map<String, ClosedCycle> closedMap = missingIds.isEmpty()
                ? Collections.emptyMap()
                : closedCycleRepo.findByCycleIdIn(missingIds).stream()
                        .collect(Collectors.toMap(ClosedCycle::getCycleId, cc -> cc, (a, b) -> a));
        return new CycleLookupContext(activeMap, closedMap);
    }

    private InspectionDTO toDTO(InspectionRequest req, ActiveInventory inventory, ClosedCycle closedCycle) {
        String machineName = "-";
        String config = "-";
        LocalDateTime intakeAt = null;

        if (inventory != null) {
            if (inventory.getSourceModelText() != null && !inventory.getSourceModelText().isBlank()) {
                machineName = inventory.getSourceModelText();
            }
            if (inventory.getConfig() != null) {
                config = inventory.getConfig().getDisplayName() != null
                        ? inventory.getConfig().getDisplayName()
                        : inventory.getConfig().getConfigKey();
            }
            intakeAt = inventory.getIntakeAt();
        } else if (closedCycle != null) {
            if (closedCycle.getSourceModelText() != null && !closedCycle.getSourceModelText().isBlank()) {
                machineName = closedCycle.getSourceModelText();
            } else if (closedCycle.getProductFullName() != null && !closedCycle.getProductFullName().isBlank()) {
                machineName = closedCycle.getProductFullName();
            }
            if (closedCycle.getConfig() != null) {
                config = closedCycle.getConfig().getDisplayName() != null
                        ? closedCycle.getConfig().getDisplayName()
                        : closedCycle.getConfig().getConfigKey();
            } else if (closedCycle.getProductSummary() != null && !closedCycle.getProductSummary().isBlank()) {
                config = closedCycle.getProductSummary();
            }
            intakeAt = closedCycle.getIntakeAt();
        }

        LocalDateTime now = LocalDateTime.now();
        boolean isCompletedTicket = req.getCompletedAt() != null
                && (req.getStatus() == InspectionRequestStatus.PASSED
                    || req.getStatus() == InspectionRequestStatus.REJECTED_RETURNED);
        LocalDateTime waitEnd = isCompletedTicket ? req.getCompletedAt() : now;
        long waitDays = InventoryDurationHelper.calculateDaysBetween(req.getCreatedAt(), waitEnd);

        long storageDays = 0;
        long pausedDays = 0;
        long sellableDays = 0;
        if (inventory != null) {
            storageDays = InventoryDurationHelper.calculateStorageDays(inventory, now);
            pausedDays = InventoryDurationHelper.calculateTotalPausedDays(inventory, now, req.getCreatedAt());
            sellableDays = InventoryDurationHelper.calculateSellableDays(storageDays, pausedDays);
        } else if (closedCycle != null) {
            storageDays = InventoryDurationHelper.calculateStorageDays(closedCycle);
            pausedDays = InventoryDurationHelper.calculateTotalPausedDays(closedCycle);
            sellableDays = InventoryDurationHelper.calculateSellableDays(storageDays, pausedDays);
        }

        return InspectionDTO.builder()
                .id(req.getInspectionRequestId())
                .serial(req.getSerialKey() != null ? req.getSerialKey() : "-")
                .name(machineName)
                .config(config)
                .type(req.getRequestType() != null ? req.getRequestType().getDisplayName() : "-")
                .waitDays(waitDays + " ngày")
                .inventoryDays(storageDays + " ngày")
                .sellableDays(sellableDays + " ngày")
                .pausedDays(pausedDays + " ngày")
                .dataStatus(Boolean.TRUE.equals(req.getRequiredDataComplete()) ? "Đã đủ" : "Chưa đủ")
                .progressNotes(req.getProgressNotes())
                .status(req.getStatus().name())
                .reason(req.getReason())
                .note(req.getNote())
                .intakeAt(intakeAt)
                .createdAt(req.getCreatedAt())
                .completedAt(req.getCompletedAt())
                .build();
    }
}
