package com.qkshop.tonkho.inspection;

import com.qkshop.tonkho.inspection.dto.UpdateInspectionProgressRequest;
import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inspection.dto.InspectionDTO;
import com.qkshop.tonkho.inventory.ActiveInventory;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inspections")
@RequiredArgsConstructor
public class InspectionController {

    private final InspectionService inspectionService;
    private final ActiveInventoryRepository activeInventoryRepo;

    /** Lấy danh sách phiếu kiểm tra, lọc theo status */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InspectionDTO>>> getInspections(
            @RequestParam(required = false) String status) {
        List<InspectionRequest> requests = inspectionService.getActiveRequests(status);
        List<InspectionDTO> result = requests.stream().map(this::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Lấy tất cả có phân trang */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<Page<InspectionDTO>>> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<InspectionRequest> paged = inspectionService.getAllRequests(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        Page<InspectionDTO> dtoPaged = paged.map(this::toDTO);
        return ResponseEntity.ok(ApiResponse.ok(dtoPaged));
    }

    /** Lưu tiến độ kiểm tra */
    @PutMapping("/{id}/progress")
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
    public ResponseEntity<ApiResponse<InspectionRequest>> sendToRecheck(
            @PathVariable String id, Authentication authentication) {
        InspectionRequest updated = inspectionService.sendToRecheck(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã gửi kiểm tra lại", updated));
    }

    /** Bắt đầu kiểm tra */
    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<InspectionRequest>> startInspection(
            @PathVariable String id, Authentication authentication) {
        InspectionRequest updated = inspectionService.startInspection(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Bắt đầu kiểm tra", updated));
    }

    /** Xác nhận Đạt */
    @PostMapping("/{id}/approve")
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
    public ResponseEntity<ApiResponse<InspectionRequest>> rejectInspection(
            @PathVariable String id, 
            @RequestBody(required = false) java.util.Map<String, String> payload,
            Authentication authentication) {
        String notes = payload != null ? payload.getOrDefault("notes", "") : "";
        InspectionRequest updated = inspectionService.rejectInspection(id, authentication.getName(), notes);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã Hủy/Trả máy", updated));
    }

    // ==================== MAPPER ====================

    private InspectionDTO toDTO(InspectionRequest req) {
        ActiveInventory inventory = activeInventoryRepo.findByCycleId(req.getCycleId()).orElse(null);
        
        String machineName = inventory != null && inventory.getSourceModelText() != null ? inventory.getSourceModelText() : "-";
        String config = "-";
        if (inventory != null && inventory.getConfig() != null) {
            config = inventory.getConfig().getDisplayName() != null ? inventory.getConfig().getDisplayName() : inventory.getConfig().getConfigKey();
        }
        
        long waitDays = 0;
        if (req.getCreatedAt() != null) {
            waitDays = ChronoUnit.DAYS.between(req.getCreatedAt(), LocalDateTime.now());
        }

        long inventoryDays = 0;
        if (inventory != null && inventory.getIntakeAt() != null) {
            inventoryDays = ChronoUnit.DAYS.between(inventory.getIntakeAt(), LocalDateTime.now());
            long paused = inventory.getPausedDays() != null ? inventory.getPausedDays() : 0;
            if (inventory.getLastPausedAt() != null) {
                paused += ChronoUnit.DAYS.between(inventory.getLastPausedAt(), LocalDateTime.now());
            }
            inventoryDays = Math.max(0, inventoryDays - paused);
        }

        return InspectionDTO.builder()
                .id(req.getInspectionRequestId())
                .serial(req.getSerialKey() != null ? req.getSerialKey() : "-")
                .name(machineName)
                .config(config)
                .type(req.getRequestType() != null ? req.getRequestType().getDisplayName() : "-")
                .waitDays(waitDays + " ngày")
                .inventoryDays(inventoryDays + " ngày")
                .dataStatus(Boolean.TRUE.equals(req.getRequiredDataComplete()) ? "Đã đủ" : "Chưa đủ")
                .progressNotes(req.getProgressNotes())
                .status(req.getStatus().name())
                .reason(req.getReason())
                .note(req.getNote())
                .createdAt(req.getCreatedAt())
                .build();
    }
}
