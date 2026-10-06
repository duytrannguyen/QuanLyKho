package com.qkshop.tonkho.intake;
import com.qkshop.tonkho.machine.dto.BulkMachineImportRequest;

import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.sync.CommandLedger;
import com.qkshop.tonkho.sync.IdempotencyService;
import com.qkshop.tonkho.intake.IntakeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/intake")
@RequiredArgsConstructor
public class IntakeController {

    private final IntakeService intakeService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @PostMapping("/single/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'NHAP_LIEU')")
    public ResponseEntity<ApiResponse<ActiveInventory>> submitSingleIntake(
            @RequestHeader(value = "X-Request-Id", required = true) String requestId,
            @Valid @RequestBody MachineImportRequest request,
            Authentication authentication) {
        
        Optional<CommandLedger> existingCommand = idempotencyService.checkAndGet(requestId);
        if (existingCommand.isPresent()) {
            if (!idempotencyService.payloadMatches(existingCommand.get(), request)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("IDEMPOTENCY_CONFLICT", "Request ID đã được sử dụng cho payload khác"));
            }
            try {
                ActiveInventory result = objectMapper.readValue(existingCommand.get().getResultData(), ActiveInventory.class);
                return ResponseEntity.ok(ApiResponse.idempotentReplay(result, requestId));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(ApiResponse.error("PARSE_ERROR", "Lỗi đọc kết quả cũ"));
            }
        }

        try {
            ActiveInventory inventory = intakeService.createInventoryCycle(request, requestId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.okWithMessage("Nhập máy thành công", inventory));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("INTERNAL_ERROR", e.getMessage()));
        }
    }

    @PostMapping("/batch/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'NHAP_LIEU')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> submitBatchIntake(
            @RequestHeader(value = "X-Request-Id", required = true) String requestId,
            @Valid @RequestBody BulkMachineImportRequest request,
            Authentication authentication) {
        
        Optional<CommandLedger> existingCommand = idempotencyService.checkAndGet(requestId);
        if (existingCommand.isPresent()) {
            if (!idempotencyService.payloadMatches(existingCommand.get(), request)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("IDEMPOTENCY_CONFLICT", "Request ID đã được sử dụng cho payload khác"));
            }
            try {
                java.util.Map<String, Object> result = objectMapper.readValue(existingCommand.get().getResultData(), java.util.Map.class);
                return ResponseEntity.ok(ApiResponse.idempotentReplay(result, requestId));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(ApiResponse.error("PARSE_ERROR", "Lỗi đọc kết quả cũ"));
            }
        }

        try {
            java.util.Map<String, Object> result = intakeService.createInventoryCyclesBatch(request, requestId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.okWithMessage("Nhập lô hoàn tất", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("INTERNAL_ERROR", e.getMessage()));
        }
    }
}
