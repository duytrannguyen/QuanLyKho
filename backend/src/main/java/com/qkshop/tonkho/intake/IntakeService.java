package com.qkshop.tonkho.intake;
import com.qkshop.tonkho.inspection.InspectionService;
import com.qkshop.tonkho.sync.IdempotencyService;
import com.qkshop.tonkho.catalog.CatalogService;
import com.qkshop.tonkho.machine.SerialRegistryRepository;
import com.qkshop.tonkho.log.EventLogRepository;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.core.enums.SourceType;
import com.qkshop.tonkho.core.enums.SegmentCode;
import com.qkshop.tonkho.inspection.InspectionRequestType;
import com.qkshop.tonkho.core.enums.EventType;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.machine.SerialRegistry;
import com.qkshop.tonkho.sale.SalesConfig;
import com.qkshop.tonkho.catalog.Platform;
import com.qkshop.tonkho.catalog.ModelLine;
import com.qkshop.tonkho.log.EventLog;
import com.qkshop.tonkho.sync.CommandLedger;
import com.qkshop.tonkho.catalog.Brand;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.machine.dto.BulkMachineImportRequest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

/**
 * Service xử lý Nhập máy theo Blueprint §4.7 và §7.
 * Nguồn dữ liệu DUY NHẤT: active_inventory (V2). Không còn ghi V1 (machines).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IntakeService {

    private final IdempotencyService idempotencyService;
    private final CatalogService catalogService;
    private final SerialRegistryRepository serialRegistryRepo;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final EventLogRepository eventLogRepo;
    private final ObjectMapper objectMapper;
    private final InspectionService inspectionService;

    /**
     * Nhập một máy mới.
     * Kiểm tra idempotency, validate khóa ngoại và serial.
     */
    @Transactional
    public ActiveInventory createInventoryCycle(MachineImportRequest payload, String requestId, String actor) {
        // 1. Idempotency check
        Optional<CommandLedger> existingCommand = idempotencyService.checkAndGet(requestId);
        if (existingCommand.isPresent()) {
            if (!idempotencyService.payloadMatches(existingCommand.get(), payload)) {
                throw new IllegalArgumentException("IDEMPOTENCY_CONFLICT: Request ID đã được dùng cho payload khác");
            }
            try {
                // Return previous result
                String resultJson = existingCommand.get().getResultData();
                ActiveInventory result = objectMapper.readValue(resultJson, ActiveInventory.class);
                return result; // Or handle idempotent replay correctly in controller
            } catch (Exception e) {
                log.error("Lỗi parse idempotent result", e);
            }
        }

        try {
            // 2. Validate Serial
            String serialKey = SerialRegistry.normalizeSerialKey(payload.getSerial());
            if (serialKey == null || serialKey.isEmpty()) {
                throw new IllegalArgumentException("Serial không hợp lệ");
            }
            if (activeInventoryRepo.existsBySerialKey(serialKey)) {
                throw new IllegalArgumentException("Serial đang có một vòng tồn mở (đã trong kho)");
            }

            // 3. Resolve Catalog
            Brand brand = catalogService.findOrCreateBrand(payload.getBrand());
            SegmentCode segmentCode = SegmentCode.OFFICE;
            if (payload.getSegment() != null && !payload.getSegment().trim().isEmpty()) {
                String segStr = payload.getSegment().trim().toUpperCase();
                if (segStr.contains("VĂN PHÒNG") || segStr.equals("OFFICE")) segmentCode = SegmentCode.OFFICE;
                else if (segStr.contains("GAMING")) segmentCode = SegmentCode.GAMING;
                else if (segStr.contains("MÁY TRẠM") || segStr.contains("WORKSTATION") || segStr.contains("ĐỒ HỌA")) segmentCode = SegmentCode.WORKSTATION;
                else if (segStr.contains("MACBOOK")) segmentCode = SegmentCode.MACBOOK;
                else {
                    try { segmentCode = SegmentCode.valueOf(segStr); } catch (Exception e) {}
                }
            }
            ModelLine modelLine = catalogService.findOrCreateModelLine(brand, payload.getProductLine(), segmentCode);
            Platform platform = catalogService.findOrCreatePlatform(modelLine, payload.getModelFull());
            VariantV2 variant = catalogService.findOrCreateVariant(platform, payload.getCpu(), payload.getGpu(), payload.getTouchscreen(), payload.getScreenSize());
            SalesConfig config = catalogService.findOrCreateConfig(variant, payload.getRam(), payload.getSsd());

            // 4. Update/Create Serial Registry
            SerialRegistry registry = serialRegistryRepo.findBySerialKey(serialKey)
                    .orElseGet(() -> SerialRegistry.builder()
                            .serialKey(serialKey)
                            .serialDisplay(payload.getSerial().trim())
                            .brandId(brand.getBrandId())
                            .build());
            
            String cycleId = "CYC-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
            CycleState initialState = CycleState.NEEDS_INSPECTION;
            LocalDateTime readyAt = null;

            if (payload.getInitialStatus() != null) {
                String statusStr = payload.getInitialStatus().trim().toUpperCase();
                if (statusStr.equals("SẴN SÀNG BÁN") || statusStr.equals("SAN_SANG_BAN") || statusStr.equals("READY")) {
                    initialState = CycleState.READY;
                    readyAt = LocalDateTime.now();
                }
            }

            // Resolve IntakeType từ string input
            IntakeType intakeType = IntakeType.PURCHASE;
            if (payload.getImportType() != null) {
                switch (payload.getImportType().trim().toUpperCase()) {
                    case "MUA/NHẬP HÀNG", "MUA NHẬP HÀNG", "MUA_NHAP_HANG", "PURCHASE" -> intakeType = IntakeType.PURCHASE;
                    case "KHÁCH ĐỔI/TRẢ", "KHACH_DOI_TRA", "CUSTOMER_RETURN" -> intakeType = IntakeType.CUSTOMER_RETURN;
                    case "THU LẠI CỦA KHÁCH", "THU_LAI_CUA_KHACH", "CUSTOMER_BUYBACK", "KHÁCH BÁN LẠI" -> intakeType = IntakeType.CUSTOMER_BUYBACK;
                    case "TỒN ĐẦU KỲ", "TON_DAU_KY", "OPENING_BALANCE" -> intakeType = IntakeType.OPENING_BALANCE;
                    default -> {
                        try { intakeType = IntakeType.valueOf(payload.getImportType().trim()); }
                        catch (Exception e) { intakeType = IntakeType.PURCHASE; }
                    }
                }
            }

            // Validate logic: Nếu máy đã có trong hệ thống và đã CLOSED, chỉ được phép Thu lại hoặc Đổi trả
            if (registry.getId() != null && registry.getCurrentState() == CycleState.CLOSED) {
                if (intakeType == IntakeType.PURCHASE || intakeType == IntakeType.OPENING_BALANCE) {
                    throw new IllegalArgumentException("Máy có số Serial này đã từng được bán/xuất kho. Vui lòng chọn nghiệp vụ nhập là 'Khách đổi/trả' hoặc 'Thu lại của khách' để nhập lại kho.");
                }
            }

            registry.setCurrentCycleId(cycleId);
            registry.setCurrentConfig(config);
            registry.setCurrentState(initialState);
            registry = serialRegistryRepo.save(registry);




            LocalDateTime intakeAt = LocalDateTime.now();
            if (payload.getImportDate() != null && !payload.getImportDate().trim().isEmpty()) {
                try {
                    intakeAt = java.time.LocalDate.parse(payload.getImportDate().trim()).atStartOfDay();
                } catch (Exception e) {
                    log.warn("Invalid importDate format: {}", payload.getImportDate());
                }
            }

            ActiveInventory inventory = ActiveInventory.builder()
                    .cycleId(cycleId)
                    .serialKey(serialKey)
                    .config(config)
                    .sourceModelText(catalogService.cleanModelString(payload.getModelFull()))
                    .intakeType(intakeType)
                    .intakeAt(intakeAt)
                    .state(initialState)
                    .readyAt(readyAt)
                    .lastPausedAt(initialState == CycleState.NEEDS_INSPECTION ? LocalDateTime.now() : null)
                    .salePrice(payload.getPrice())
                    .note(payload.getNotes())
                    .build();
            inventory = activeInventoryRepo.save(inventory);

            // Tự động tạo yêu cầu kiểm tra
            if (initialState == CycleState.NEEDS_INSPECTION) {
                InspectionRequestType reqType = InspectionRequestType.INITIAL;
                if (intakeType == IntakeType.CUSTOMER_RETURN || intakeType == IntakeType.CUSTOMER_BUYBACK) {
                    reqType = InspectionRequestType.CUSTOMER_RETURN;
                }
                inspectionService.createInspectionRequest(cycleId, reqType);
            }

            // 6. Ghi Event Log
            EventLog event = EventLog.builder()
                    .eventId("EVT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8))
                    .idempotencyKey(requestId)
                    .eventType(EventType.INTAKE_CREATED)
                    .entityType("ACTIVE_INVENTORY")
                    .entityId(cycleId)
                    .serialKey(serialKey)
                    .cycleId(cycleId)
                    .afterSnapshot(objectMapper.writeValueAsString(inventory))
                    .sourceType(SourceType.WEB_APP)
                    .actor(actor)
                    .build();
            eventLogRepo.save(event);

            registry.setLastEventId(event.getEventId());
            serialRegistryRepo.save(registry);

            // 7. Ghi nhận Idempotency
            idempotencyService.recordSuccess(requestId, "INTAKE_SINGLE", payload, objectMapper.writeValueAsString(inventory), actor);

            return inventory;
        } catch (IllegalArgumentException e) {
            idempotencyService.recordFailure(requestId, "INTAKE_SINGLE", payload, e.getMessage(), actor);
            throw e;
        } catch (Exception e) {
            idempotencyService.recordFailure(requestId, "INTAKE_SINGLE", payload, e.getMessage(), actor);
            throw new RuntimeException("Nhập máy thất bại: " + e.getMessage(), e);
        }
    }

    /**
     * Nhập lô nhiều máy cùng cấu hình.
     */
    @Transactional
    public java.util.Map<String, Object> createInventoryCyclesBatch(BulkMachineImportRequest payload, String batchRequestId, String actor) {
        // Idempotency check cho cả lô
        Optional<CommandLedger> existingCommand = idempotencyService.checkAndGet(batchRequestId);
        if (existingCommand.isPresent()) {
            if (!idempotencyService.payloadMatches(existingCommand.get(), payload)) {
                throw new IllegalArgumentException("IDEMPOTENCY_CONFLICT: Batch Request ID đã được dùng cho payload khác");
            }
            try {
                return objectMapper.readValue(existingCommand.get().getResultData(), java.util.Map.class);
            } catch (Exception e) {
                log.error("Lỗi parse idempotent result batch", e);
            }
        }

        List<String> success = new ArrayList<>();
        List<String> failed = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (String rawSerial : payload.getSerials()) {
            try {
                MachineImportRequest singleReq = payload.getCommonConfig();
                // Copy properties from commonConfig
                MachineImportRequest req = MachineImportRequest.builder()
                        .serial(rawSerial.trim())
                        .brand(singleReq.getBrand())
                        .productLine(singleReq.getProductLine())
                        .modelFull(singleReq.getModelFull())
                        .segment(singleReq.getSegment())
                        .cpu(singleReq.getCpu())
                        .gpu(singleReq.getGpu())
                        .ram(singleReq.getRam())
                        .ssd(singleReq.getSsd())
                        .touchscreen(singleReq.getTouchscreen())
                        .screenSize(singleReq.getScreenSize())
                        .price(singleReq.getPrice())
                        .notes(singleReq.getNotes())
                        .importType(singleReq.getImportType())
                        .initialStatus(singleReq.getInitialStatus())
                        .importDate(singleReq.getImportDate())
                        .build();

                // Tạo sub-requestId cho từng máy để tracking, nhưng vẫn trong 1 transaction lớn
                String subRequestId = batchRequestId + "-" + rawSerial.trim();
                createInventoryCycle(req, subRequestId, actor);
                success.add(rawSerial);
            } catch (Exception e) {
                failed.add(rawSerial);
                errors.add(rawSerial + ": " + e.getMessage());
                // Không throw exception để tiếp tục các máy khác
            }
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("total", payload.getSerials().size());
        result.put("successCount", success.size());
        result.put("failedCount", failed.size());
        result.put("successList", success);
        result.put("failedList", failed);
        result.put("errors", errors);

        try {
            idempotencyService.recordSuccess(batchRequestId, "INTAKE_BATCH", payload, objectMapper.writeValueAsString(result), actor);
        } catch (Exception e) {
            log.error("Không thể lưu idempotency cho batch", e);
        }

        return result;
    }
}
