package com.qkshop.tonkho.machine;

import com.qkshop.tonkho.exception.ResourceNotFoundException;
import com.qkshop.tonkho.machine.dto.BulkMachineImportRequest;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.dto.ClosedCycleDTO;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.inspection.InspectionRequestType;
import com.qkshop.tonkho.inspection.dto.InspectionRequest;
import com.qkshop.tonkho.sale.SalesConfig;
import com.qkshop.tonkho.user.UserRepository;
import com.qkshop.tonkho.core.StateTransitionService;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.catalog.CatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * MachineService — API facade cho tất cả thao tác máy.
 * Nguồn dữ liệu DUY NHẤT: V2 (ActiveInventory, ClosedCycle, SerialRegistry).
 * Không còn bảng machines, variants (V1) trong logic nghiệp vụ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MachineService {

    private final ActiveInventoryRepository activeInventoryRepository;
    private final ClosedCycleRepository closedCycleRepository;
    private final SerialRegistryRepository serialRegistryRepository;
    private final InspectionRequestRepository inspectionRequestRepository;
    private final UserRepository userRepository;
    private final StateTransitionService stateTransitionService;
    private final CatalogService catalogService;
    @Lazy
    private final com.qkshop.tonkho.intake.IntakeService intakeService;

    // ==================== READ ====================

    /**
     * Tra cứu chi tiết máy theo serial.
     * Ưu tiên ActiveInventory (đang trong kho), fallback sang ClosedCycle (lịch sử).
     */
    public Map<String, Object> getBySerial(String serial) {
        String key = SerialRegistry.normalizeSerialKey(serial);

        // Tìm trong kho đang hoạt động
        Optional<ActiveInventory> aiOpt = activeInventoryRepository.findBySerialKey(key);
        if (aiOpt.isPresent()) {
            return buildDetailFromActiveInventory(aiOpt.get());
        }

        // Tìm trong lịch sử đã đóng
        List<ClosedCycle> history = closedCycleRepository.findBySerialKeyOrderByClosedAtDesc(key);
        if (!history.isEmpty()) {
            return buildDetailFromClosedCycle(history.get(0), history);
        }

        throw new ResourceNotFoundException("Không tìm thấy máy với serial: " + serial);
    }

    /**
     * Tìm kiếm lịch sử — tất cả ActiveInventory + ClosedCycle, trả DTO đầy đủ thông tin.
     */
    public Page<ClosedCycleDTO> searchHistory(String query, String brand, String segment, String status, int page, int size) {
        List<ClosedCycleDTO> combined = new ArrayList<>();

        // 1. Máy đang trong kho (Active)
        List<ActiveInventory> actives = activeInventoryRepository.findAll();
        for (ActiveInventory ai : actives) {
            String brandId = serialRegistryRepository.findBySerialKey(ai.getSerialKey())
                    .map(sr -> sr.getBrandId()).orElse(null);
            
            String configName = null;
            if (ai.getConfig() != null) {
                configName = ai.getConfig().getDisplayName();
            }
            
            long days = 0;
            if (ai.getIntakeAt() != null) {
                days = ChronoUnit.DAYS.between(ai.getIntakeAt(), LocalDateTime.now());
                long paused = ai.getPausedDays() != null ? ai.getPausedDays() : 0;
                if (ai.getLastPausedAt() != null) {
                    paused += ChronoUnit.DAYS.between(ai.getLastPausedAt(), LocalDateTime.now());
                }
                days = Math.max(0, days - paused);
            }

            combined.add(ClosedCycleDTO.builder()
                    .cycleId(ai.getCycleId())
                    .serialKey(ai.getSerialKey())
                    .sourceModelText(ai.getSourceModelText())
                    .configId(ai.getConfig() != null ? ai.getConfig().getConfigId() : null)
                    .configDisplayName(configName)
                    .intakeType(ai.getIntakeType() != null ? ai.getIntakeType().name() : null)
                    .state(ai.getState() != null ? ai.getState().name() : null)
                    .intakeAt(ai.getIntakeAt())
                    .salePriceSnapshot(ai.getSalePrice())
                    .note(ai.getNote())
                    .brandId(brandId)
                    .storageDays(days)
                    .build());
        }

        // 2. Máy đã đóng (Closed)
        List<ClosedCycle> closeds = closedCycleRepository.findAll();
        for (ClosedCycle cc : closeds) {
            String brandId = serialRegistryRepository.findBySerialKey(cc.getSerialKey())
                    .map(sr -> sr.getBrandId()).orElse(null);

            String configName = null;
            if (cc.getConfig() != null) {
                configName = cc.getConfig().getDisplayName();
            }

            long days = 0;
            if (cc.getIntakeAt() != null && cc.getClosedAt() != null) {
                days = ChronoUnit.DAYS.between(cc.getIntakeAt(), cc.getClosedAt());
                if (cc.getPausedDays() != null) {
                    days = Math.max(0, days - cc.getPausedDays());
                }
            }

            combined.add(ClosedCycleDTO.builder()
                    .cycleId(cc.getCycleId())
                    .serialKey(cc.getSerialKey())
                    .sourceModelText(cc.getSourceModelText())
                    .configId(cc.getConfig() != null ? cc.getConfig().getConfigId() : null)
                    .configDisplayName(configName)
                    .intakeType(cc.getIntakeType() != null ? cc.getIntakeType().name() : null)
                    .closeType(cc.getCloseType() != null ? cc.getCloseType().name() : null)
                    .intakeAt(cc.getIntakeAt())
                    .closedAt(cc.getClosedAt())
                    .salePriceSnapshot(cc.getSalePriceSnapshot())
                    .customerName(cc.getCustomerName())
                    .note(cc.getSaleNote())
                    .brandId(brandId)
                    .storageDays(days)
                    .build());
        }

        // 3. Sắp xếp: Ưu tiên closedAt (nếu có) giảm dần, sau đó đến intakeAt giảm dần
        combined.sort((a, b) -> {
            LocalDateTime timeA = a.getClosedAt() != null ? a.getClosedAt() : a.getIntakeAt();
            LocalDateTime timeB = b.getClosedAt() != null ? b.getClosedAt() : b.getIntakeAt();
            if (timeA == null && timeB == null) return 0;
            if (timeA == null) return 1;
            if (timeB == null) return -1;
            return timeB.compareTo(timeA);
        });

        // 4. Lọc
        List<ClosedCycleDTO> filtered = combined.stream()
            .filter(dto -> {
                if (StringUtils.hasText(query)) {
                    String q = query.toLowerCase();
                    boolean match = (dto.getSerialKey() != null && dto.getSerialKey().toLowerCase().contains(q))
                            || (dto.getSourceModelText() != null && dto.getSourceModelText().toLowerCase().contains(q))
                            || (dto.getConfigId() != null && dto.getConfigId().toLowerCase().contains(q));
                    if (!match) return false;
                }
                if (StringUtils.hasText(brand) && !"Tất cả".equalsIgnoreCase(brand)) {
                    // Cần match theo brandId (nếu brand passed from frontend là ID) 
                    // Tạm thời chưa filter chặt brand vì frontend truyền tên thay vì ID, có thể bỏ qua hoặc map
                }
                if (StringUtils.hasText(status) && !"Tất cả".equalsIgnoreCase(status)) {
                    if (status.equalsIgnoreCase("ACTIVE_ONLY")) {
                        return dto.getState() != null;
                    } else if (status.equalsIgnoreCase("CLOSED_ONLY")) {
                        return dto.getCloseType() != null;
                    }
                    
                    if (dto.getCloseType() == null && dto.getState() == null) return false;
                    boolean matchStatus = (dto.getCloseType() != null && dto.getCloseType().equalsIgnoreCase(status))
                                       || (dto.getState() != null && dto.getState().equalsIgnoreCase(status));
                    if (!matchStatus) return false;
                }
                return true;
            })
            .collect(Collectors.toList());

        int start = (int) PageRequest.of(page, size).getOffset();
        start = Math.min(start, filtered.size());
        int end = Math.min(start + size, filtered.size());
        return new PageImpl<>(filtered.subList(start, end), PageRequest.of(page, size), filtered.size());
    }

    // ==================== CREATE ====================

    /**
     * Nhập đơn 1 máy — delegate hoàn toàn sang IntakeService (V2).
     */
    @Transactional
    public ActiveInventory importSingleMachine(MachineImportRequest request, String username) {
        if (request.getSerial() == null || request.getSerial().trim().isEmpty()) {
            throw new IllegalArgumentException("Serial là bắt buộc khi nhập đơn lẻ.");
        }
        String serialKey = SerialRegistry.normalizeSerialKey(request.getSerial());
        if (activeInventoryRepository.existsBySerialKey(serialKey)) {
            throw new com.qkshop.tonkho.exception.DuplicateSerialException("Máy có serial '" + request.getSerial() + "' đã tồn tại trong kho.");
        }
        return intakeService.createInventoryCycle(request, UUID.randomUUID().toString(), username);
    }

    // ==================== UPDATE ====================

    /**
     * Cập nhật thông tin máy — chỉ thao tác trên ActiveInventory (V2).
     */
    @Transactional
    public ActiveInventory updateMachine(String serial, Map<String, Object> updates, String username) {
        String key = SerialRegistry.normalizeSerialKey(serial);
        ActiveInventory ai = activeInventoryRepository.findBySerialKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy máy trong kho: " + serial));

        if (updates.containsKey("price")) {
            Object priceObj = updates.get("price");
            if (priceObj != null && !priceObj.toString().trim().isEmpty()) {
                try { ai.setSalePrice(new BigDecimal(priceObj.toString())); }
                catch (NumberFormatException e) { throw new RuntimeException("Giá bán không hợp lệ"); }
            } else {
                ai.setSalePrice(null);
            }
        }

        if (updates.containsKey("notes")) {
            ai.setNote(updates.get("notes") != null ? updates.get("notes").toString() : "");
        }

        if (updates.containsKey("status")) {
            String statusStr = updates.get("status").toString();
            switch (statusStr) {
                case "SAN_SANG_BAN", "READY" -> {
                    ai.setState(CycleState.READY);
                    if (ai.getReadyAt() == null) ai.setReadyAt(LocalDateTime.now());
                    if (ai.getLastPausedAt() != null) {
                        long days = java.time.temporal.ChronoUnit.DAYS.between(ai.getLastPausedAt(), LocalDateTime.now());
                        ai.setPausedDays((ai.getPausedDays() != null ? ai.getPausedDays() : 0) + days);
                        ai.setLastPausedAt(null);
                    }
                    // Đóng các InspectionRequest đang mở
                    closeOpenInspectionRequests(ai.getCycleId(), username);
                }
                case "CAN_KIEM_TRA", "NEEDS_INSPECTION", "DANG_KIEM_TRA" -> {
                    ai.setState(CycleState.NEEDS_INSPECTION);
                    if (ai.getLastPausedAt() == null) {
                        ai.setLastPausedAt(LocalDateTime.now());
                    }
                    String notes = updates.get("notes") != null ? updates.get("notes").toString() : null;
                    ensureOpenInspectionRequest(ai, notes);
                }
                case "DA_BAN", "HUY_TRA", "CLOSED" -> {
                    CloseType type = CloseType.CANCEL;
                    if (statusStr.equals("DA_BAN")) type = CloseType.SALE;
                    stateTransitionService.transitionToClosed(ai.getCycleId(), type, "UPDATE_API", username, updates.get("notes") != null ? updates.get("notes").toString() : "");
                    return ai; // transitionToClosed already saves and handles everything, so we return here to avoid saving ActiveInventory again
                }
            }
        }

        if (updates.containsKey("brand") && updates.containsKey("modelFull") && updates.containsKey("cpu")) {
            String brandName = updates.get("brand") != null ? updates.get("brand").toString() : "";
            String productLine = updates.get("productLine") != null ? updates.get("productLine").toString() : "";
            String segmentStr = updates.get("segment") != null ? updates.get("segment").toString() : "";
            String modelFull = updates.get("modelFull") != null ? updates.get("modelFull").toString() : "";
            String cpu = updates.get("cpu") != null ? updates.get("cpu").toString() : "";
            String gpu = updates.get("gpu") != null ? updates.get("gpu").toString() : "";
            String ram = updates.get("ram") != null ? updates.get("ram").toString() : "";
            String ssd = updates.get("ssd") != null ? updates.get("ssd").toString() : "";
            String touch = updates.get("touchscreen") != null ? updates.get("touchscreen").toString() : "";
            String screenSize = updates.get("screenSize") != null ? updates.get("screenSize").toString() : "";

            com.qkshop.tonkho.catalog.Brand brandObj = catalogService.findOrCreateBrand(brandName);
            com.qkshop.tonkho.core.enums.SegmentCode segmentCode = com.qkshop.tonkho.core.enums.SegmentCode.OFFICE;
            if (!segmentStr.isEmpty()) {
                String segStr = segmentStr.toUpperCase();
                if (segStr.contains("VĂN PHÒNG") || segStr.equals("OFFICE")) segmentCode = com.qkshop.tonkho.core.enums.SegmentCode.OFFICE;
                else if (segStr.contains("GAMING")) segmentCode = com.qkshop.tonkho.core.enums.SegmentCode.GAMING;
                else if (segStr.contains("MÁY TRẠM") || segStr.contains("WORKSTATION") || segStr.contains("ĐỒ HỌA")) segmentCode = com.qkshop.tonkho.core.enums.SegmentCode.WORKSTATION;
                else if (segStr.contains("MACBOOK")) segmentCode = com.qkshop.tonkho.core.enums.SegmentCode.MACBOOK;
                else {
                    try { segmentCode = com.qkshop.tonkho.core.enums.SegmentCode.valueOf(segStr); } catch (Exception e) {}
                }
            }
            
            if (ai.getConfig() != null) {
                SalesConfig updatedCfg = catalogService.updateExistingConfig(ai.getConfig(), brandName, productLine, segmentCode, modelFull, cpu, gpu, touch, screenSize, ram, ssd);
                if (updatedCfg != null && !updatedCfg.getConfigId().equals(ai.getConfig().getConfigId())) {
                    ai.setConfig(updatedCfg);
                }
                ai.setSourceModelText(modelFull);
                
                // Đồng bộ tên Brand xuống SerialRegistry nếu brand thay đổi
                serialRegistryRepository.findBySerialKey(key).ifPresent(sr -> {
                    if (ai.getConfig().getVariant() != null && ai.getConfig().getVariant().getPlatform() != null 
                        && ai.getConfig().getVariant().getPlatform().getModelLine() != null 
                        && ai.getConfig().getVariant().getPlatform().getModelLine().getBrand() != null) {
                        sr.setBrandId(ai.getConfig().getVariant().getPlatform().getModelLine().getBrand().getBrandId());
                        serialRegistryRepository.save(sr);
                    }
                });
            } else {
                com.qkshop.tonkho.catalog.ModelLine mlObj = catalogService.findOrCreateModelLine(brandObj, productLine, segmentCode);
                com.qkshop.tonkho.catalog.Platform platObj = catalogService.findOrCreatePlatform(mlObj, modelFull);
                com.qkshop.tonkho.catalog.VariantV2 varObj = catalogService.findOrCreateVariant(platObj, cpu, gpu, touch, screenSize);
                com.qkshop.tonkho.sale.SalesConfig cfgObj = catalogService.findOrCreateConfig(varObj, ram, ssd);
                ai.setConfig(cfgObj);
                ai.setSourceModelText(modelFull);
                
                serialRegistryRepository.findBySerialKey(key).ifPresent(sr -> {
                    sr.setCurrentConfig(cfgObj);
                    sr.setBrandId(brandObj.getBrandId());
                    serialRegistryRepository.save(sr);
                });
            }
        }

        activeInventoryRepository.save(ai);
        return ai;
    }

    private void closeOpenInspectionRequests(String cycleId, String actor) {
        List<InspectionRequestStatus> openStatuses = List.of(
                InspectionRequestStatus.OPEN,
                InspectionRequestStatus.IN_PROGRESS,
                InspectionRequestStatus.RECHECK_REQUESTED);
        inspectionRequestRepository.findByCycleIdAndStatusIn(cycleId, openStatuses).ifPresent(req -> {
            req.setStatus(InspectionRequestStatus.PASSED);
            req.setCompletedAt(LocalDateTime.now());
            inspectionRequestRepository.save(req);
        });
    }

    private void ensureOpenInspectionRequest(ActiveInventory ai, String reason) {
        List<InspectionRequestStatus> openStatuses = List.of(
                InspectionRequestStatus.OPEN,
                InspectionRequestStatus.IN_PROGRESS,
                InspectionRequestStatus.RECHECK_REQUESTED);
        if (inspectionRequestRepository.findByCycleIdAndStatusIn(ai.getCycleId(), openStatuses).isEmpty()) {
            InspectionRequestType reqType = (ai.getIntakeType() == com.qkshop.tonkho.intake.IntakeType.CUSTOMER_RETURN)
                    ? InspectionRequestType.CUSTOMER_RETURN : InspectionRequestType.INITIAL;
            InspectionRequest req = InspectionRequest.builder()
                    .inspectionRequestId("INSP-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                    .cycleId(ai.getCycleId())
                    .serialKey(ai.getSerialKey())
                    .requestType(reqType)
                    .status(InspectionRequestStatus.OPEN)
                    .reason(reason)
                    .build();
            inspectionRequestRepository.save(req);
        }
    }

    // ==================== DELETE ====================

    /**
     * Xóa máy — xóa ActiveInventory + SerialRegistry.
     * Chỉ ADMIN mới được xóa (kiểm soát tại Controller).
     */
    @Transactional
    public void deleteMachine(String serial, String username) {
        String key = SerialRegistry.normalizeSerialKey(serial);

        // Xóa InspectionRequest liên quan
        List<InspectionRequest> requests = inspectionRequestRepository.findByCycleId(
                activeInventoryRepository.findBySerialKey(key)
                        .map(ActiveInventory::getCycleId).orElse("N/A"));
        inspectionRequestRepository.deleteAll(requests);

        // Xóa ActiveInventory
        activeInventoryRepository.findBySerialKey(key).ifPresent(activeInventoryRepository::delete);

        // Xóa SerialRegistry
        serialRegistryRepository.findBySerialKey(key).ifPresent(serialRegistryRepository::delete);

        log.info("Đã xóa máy {} bởi {}", serial, username);
    }

    // ==================== BULK ====================

    @Transactional
    public Map<String, Object> importBulkMachines(BulkMachineImportRequest bulkRequest, String username) {
        List<String> successSerials = new ArrayList<>();
        List<Map<String, String>> errorSerials = new ArrayList<>();

        for (String serial : bulkRequest.getSerials()) {
            String trimmedSerial = serial.trim();
            if (trimmedSerial.isEmpty()) continue;

            MachineImportRequest singleRequest = MachineImportRequest.builder()
                    .serial(trimmedSerial)
                    .brand(bulkRequest.getCommonConfig().getBrand())
                    .productLine(bulkRequest.getCommonConfig().getProductLine())
                    .modelFull(bulkRequest.getCommonConfig().getModelFull())
                    .segment(bulkRequest.getCommonConfig().getSegment())
                    .cpu(bulkRequest.getCommonConfig().getCpu())
                    .gpu(bulkRequest.getCommonConfig().getGpu())
                    .ram(bulkRequest.getCommonConfig().getRam())
                    .ssd(bulkRequest.getCommonConfig().getSsd())
                    .touchscreen(bulkRequest.getCommonConfig().getTouchscreen())
                    .screenSize(bulkRequest.getCommonConfig().getScreenSize())
                    .price(bulkRequest.getCommonConfig().getPrice())
                    .notes(bulkRequest.getCommonConfig().getNotes())
                    .importType(bulkRequest.getCommonConfig().getImportType())
                    .initialStatus(bulkRequest.getCommonConfig().getInitialStatus())
                    .build();

            try {
                importSingleMachine(singleRequest, username);
                successSerials.add(trimmedSerial);
            } catch (com.qkshop.tonkho.exception.DuplicateSerialException e) {
                errorSerials.add(Map.of("serial", trimmedSerial, "error", "Trùng lặp serial"));
            } catch (Exception e) {
                errorSerials.add(Map.of("serial", trimmedSerial, "error", e.getMessage() != null ? e.getMessage() : "Lỗi không xác định"));
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalProcessed", successSerials.size() + errorSerials.size());
        result.put("successCount", successSerials.size());
        result.put("errorCount", errorSerials.size());
        result.put("successSerials", successSerials);
        result.put("errorDetails", errorSerials);
        return result;
    }

    @Transactional
    public Map<String, Object> importBulkFromExcel(org.springframework.web.multipart.MultipartFile file, String username) {
        List<String> successSerials = new ArrayList<>();
        List<Map<String, String>> errorSerials = new ArrayList<>();

        try (java.io.InputStream is = file.getInputStream();
             org.apache.poi.ss.usermodel.Workbook workbook = org.apache.poi.ss.usermodel.WorkbookFactory.create(is)) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);
            java.util.Iterator<org.apache.poi.ss.usermodel.Row> rows = sheet.iterator();
            int rowNumber = 0;

            while (rows.hasNext()) {
                org.apache.poi.ss.usermodel.Row currentRow = rows.next();
                if (rowNumber == 0) { rowNumber++; continue; }

                try {
                    String serial = getCellValueAsString(currentRow.getCell(0));
                    if (serial == null || serial.trim().isEmpty()) continue;

                    MachineImportRequest req = MachineImportRequest.builder()
                            .serial(serial.trim())
                            .brand(getCellValueAsString(currentRow.getCell(1)))
                            .productLine(getCellValueAsString(currentRow.getCell(2)))
                            .modelFull(getCellValueAsString(currentRow.getCell(3)))
                            .segment(getCellValueAsString(currentRow.getCell(4)))
                            .cpu(getCellValueAsString(currentRow.getCell(5)))
                            .gpu(getCellValueAsString(currentRow.getCell(6)))
                            .ram(getCellValueAsString(currentRow.getCell(7)))
                            .ssd(getCellValueAsString(currentRow.getCell(8)))
                            .touchscreen(getCellValueAsString(currentRow.getCell(9)))
                            .importType(Optional.ofNullable(getCellValueAsString(currentRow.getCell(10))).filter(s -> !s.isEmpty()).orElse("MUA/NHẬP HÀNG"))
                            .initialStatus(Optional.ofNullable(getCellValueAsString(currentRow.getCell(11))).filter(s -> !s.isEmpty()).orElse("SẴN SÀNG BÁN"))
                            .price(parseBigDecimal(getCellValueAsString(currentRow.getCell(12))))
                            .importDate(getCellValueAsString(currentRow.getCell(13)))
                            .build();

                    importSingleMachine(req, username);
                    successSerials.add(serial.trim());

                } catch (com.qkshop.tonkho.exception.DuplicateSerialException e) {
                    errorSerials.add(Map.of("row", String.valueOf(rowNumber + 1), "error", "Trùng lặp serial"));
                } catch (Exception e) {
                    errorSerials.add(Map.of("row", String.valueOf(rowNumber + 1), "error", e.getMessage() != null ? e.getMessage() : "Lỗi dòng"));
                }
                rowNumber++;
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi đọc file Excel: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalProcessed", successSerials.size() + errorSerials.size());
        result.put("successCount", successSerials.size());
        result.put("errorCount", errorSerials.size());
        result.put("successSerials", successSerials);
        result.put("errorDetails", errorSerials);
        return result;
    }

    public Map<String, Object> previewBulkFromExcel(org.springframework.web.multipart.MultipartFile file) {
        List<Map<String, Object>> validMachines = new ArrayList<>();
        List<Map<String, String>> errorSerials = new ArrayList<>();
        Set<String> seenSerials = new HashSet<>();

        try (java.io.InputStream is = file.getInputStream();
             org.apache.poi.ss.usermodel.Workbook workbook = org.apache.poi.ss.usermodel.WorkbookFactory.create(is)) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);
            java.util.Iterator<org.apache.poi.ss.usermodel.Row> rows = sheet.iterator();
            int rowNumber = 0;

            while (rows.hasNext()) {
                org.apache.poi.ss.usermodel.Row currentRow = rows.next();
                if (rowNumber == 0) { rowNumber++; continue; }

                try {
                    String serial = getCellValueAsString(currentRow.getCell(0));
                    if (serial == null || serial.trim().isEmpty()) continue;
                    String trimmedSerial = serial.trim();

                    if (seenSerials.contains(trimmedSerial)) {
                        errorSerials.add(Map.of("row", String.valueOf(rowNumber + 1), "error", "Trùng lặp trong file (" + trimmedSerial + ")"));
                        rowNumber++;
                        continue;
                    }
                    seenSerials.add(trimmedSerial);

                    String brand = getCellValueAsString(currentRow.getCell(1));
                    String modelFull = getCellValueAsString(currentRow.getCell(3));
                    String cpu = getCellValueAsString(currentRow.getCell(5));
                    String gpu = getCellValueAsString(currentRow.getCell(6));
                    String ram = getCellValueAsString(currentRow.getCell(7));
                    String ssd = getCellValueAsString(currentRow.getCell(8));
                    String touchscreen = getCellValueAsString(currentRow.getCell(9));
                    String importType = Optional.ofNullable(getCellValueAsString(currentRow.getCell(10))).filter(s -> !s.isEmpty()).orElse("MUA/NHẬP HÀNG");
                    String initialStatus = Optional.ofNullable(getCellValueAsString(currentRow.getCell(11))).filter(s -> !s.isEmpty()).orElse("SẴN SÀNG BÁN");
                    BigDecimal price = parseBigDecimal(getCellValueAsString(currentRow.getCell(12)));
                    String importDate = getCellValueAsString(currentRow.getCell(13));

                    String configKey = String.format("%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
                            brand, modelFull, cpu, gpu, ram, ssd, touchscreen, price, initialStatus, importDate);

                    Map<String, Object> machine = new HashMap<>();
                    machine.put("serial", trimmedSerial);
                    machine.put("brand", brand);
                    machine.put("productLine", getCellValueAsString(currentRow.getCell(2)));
                    machine.put("modelFull", modelFull);
                    machine.put("segment", getCellValueAsString(currentRow.getCell(4)));
                    machine.put("cpu", cpu);
                    machine.put("gpu", gpu);
                    machine.put("ram", ram);
                    machine.put("ssd", ssd);
                    machine.put("touchscreen", touchscreen);
                    machine.put("importType", importType);
                    machine.put("initialStatus", initialStatus);
                    machine.put("price", price);
                    machine.put("importDate", importDate);
                    machine.put("configKey", configKey);
                    validMachines.add(machine);

                } catch (Exception e) {
                    errorSerials.add(Map.of("row", String.valueOf(rowNumber + 1), "error", e.getMessage() != null ? e.getMessage() : "Lỗi dòng"));
                }
                rowNumber++;
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi đọc file Excel: " + e.getMessage());
        }

        Map<String, List<Map<String, Object>>> grouped = new HashMap<>();
        for (Map<String, Object> m : validMachines) {
            grouped.computeIfAbsent((String) m.get("configKey"), k -> new ArrayList<>()).add(m);
        }

        List<Map<String, Object>> previewGroups = new ArrayList<>();
        for (List<Map<String, Object>> group : grouped.values()) {
            Map<String, Object> groupInfo = new HashMap<>(group.get(0));
            groupInfo.remove("serial");
            groupInfo.remove("configKey");
            List<String> serials = group.stream().map(m -> (String) m.get("serial")).toList();
            groupInfo.put("serials", serials);
            groupInfo.put("count", serials.size());
            previewGroups.add(groupInfo);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalValid", validMachines.size());
        result.put("groups", previewGroups);
        result.put("errorDetails", errorSerials);
        return result;
    }

    // ==================== HELPERS ====================

    private Map<String, Object> buildDetailFromActiveInventory(ActiveInventory ai) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("serial", ai.getSerialKey());
        detail.put("cycleId", ai.getCycleId());
        detail.put("state", ai.getState().name());
        detail.put("intakeType", ai.getIntakeType() != null ? ai.getIntakeType().name() : null);
        detail.put("intakeAt", ai.getIntakeAt());
        detail.put("readyAt", ai.getReadyAt());
        detail.put("salePrice", ai.getSalePrice());
        detail.put("note", ai.getNote());
        detail.put("sourceModelText", ai.getSourceModelText());
        detail.put("configId", ai.getConfig() != null ? ai.getConfig().getConfigId() : null);

        if (ai.getConfig() != null) {
            SalesConfig cfg = ai.getConfig();
            detail.put("ram", cfg.getRamCode());
            detail.put("ssd", cfg.getSsdCode());
            detail.put("configDisplayName", cfg.getDisplayName());
            if (cfg.getVariant() != null) {
                detail.put("cpu", cfg.getVariant().getCpuCode());
                detail.put("gpu", cfg.getVariant().getGpuCode());
                detail.put("touch", cfg.getVariant().getTouchFlag());
                detail.put("screenSize", cfg.getVariant().getScreenSize());
                if (cfg.getVariant().getPlatform() != null) {
                    detail.put("platform", cfg.getVariant().getPlatform().getDisplayName());
                    detail.put("platformCode", cfg.getVariant().getPlatform().getPlatformCode());
                    if (cfg.getVariant().getPlatform().getModelLine() != null) {
                        detail.put("productLine", cfg.getVariant().getPlatform().getModelLine().getModelLineName());
                        detail.put("segment", cfg.getVariant().getPlatform().getModelLine().getSegmentCode().name());
                        if (cfg.getVariant().getPlatform().getModelLine().getBrand() != null) {
                            detail.put("brand", cfg.getVariant().getPlatform().getModelLine().getBrand().getBrandName());
                        }
                    }
                }
            }
        }
        return detail;
    }

    private Map<String, Object> buildDetailFromClosedCycle(ClosedCycle cc, List<ClosedCycle> history) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("serial", cc.getSerialKey());
        detail.put("cycleId", cc.getCycleId());
        detail.put("state", "CLOSED");
        detail.put("closeType", cc.getCloseType().name());
        detail.put("closedAt", cc.getClosedAt());
        detail.put("intakeAt", cc.getIntakeAt());
        detail.put("salePrice", cc.getSalePriceSnapshot());
        detail.put("customerName", cc.getCustomerName());
        detail.put("customerPhone", cc.getCustomerPhone());
        detail.put("sourceModelText", cc.getSourceModelText());
        detail.put("configId", cc.getConfig() != null ? cc.getConfig().getConfigId() : null);

        if (cc.getConfig() != null) {
            SalesConfig cfg = cc.getConfig();
            detail.put("ram", cfg.getRamCode());
            detail.put("ssd", cfg.getSsdCode());
            detail.put("configDisplayName", cfg.getDisplayName());
            if (cfg.getVariant() != null) {
                detail.put("cpu", cfg.getVariant().getCpuCode());
                detail.put("gpu", cfg.getVariant().getGpuCode());
                detail.put("touch", cfg.getVariant().getTouchFlag());
                detail.put("screenSize", cfg.getVariant().getScreenSize());
                if (cfg.getVariant().getPlatform() != null) {
                    detail.put("platform", cfg.getVariant().getPlatform().getDisplayName());
                    detail.put("platformCode", cfg.getVariant().getPlatform().getPlatformCode());
                    if (cfg.getVariant().getPlatform().getModelLine() != null) {
                        detail.put("productLine", cfg.getVariant().getPlatform().getModelLine().getModelLineName());
                        detail.put("segment", cfg.getVariant().getPlatform().getModelLine().getSegmentCode().name());
                        if (cfg.getVariant().getPlatform().getModelLine().getBrand() != null) {
                            detail.put("brand", cfg.getVariant().getPlatform().getModelLine().getBrand().getBrandName());
                        }
                    }
                }
            }
        }

        detail.put("history", history);
        return detail;
    }

    private String getCellValueAsString(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    public org.springframework.core.io.ByteArrayResource generateExcelTemplate(List<MachineImportRequest> data) {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Template Nhập Máy");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            
            String[] headers = {"Serial", "Hãng", "Dòng máy", "Model đầy đủ", "Phân khúc", "CPU", "GPU", "RAM", "SSD", "Cảm ứng", "Nghiệp vụ nhập", "Trạng thái", "Giá bán", "Ngày nhập"};
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                org.apache.poi.ss.usermodel.CellStyle style = workbook.createCellStyle();
                org.apache.poi.ss.usermodel.Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                cell.setCellStyle(style);
            }

            if (data != null && !data.isEmpty()) {
                int rowIdx = 1;
                for (MachineImportRequest req : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(req.getSerial() != null ? req.getSerial() : "");
                    row.createCell(1).setCellValue(req.getBrand() != null ? req.getBrand() : "");
                    row.createCell(2).setCellValue(req.getProductLine() != null ? req.getProductLine() : "");
                    row.createCell(3).setCellValue(req.getModelFull() != null ? req.getModelFull() : "");
                    row.createCell(4).setCellValue(req.getSegment() != null ? req.getSegment() : "");
                    row.createCell(5).setCellValue(req.getCpu() != null ? req.getCpu() : "");
                    row.createCell(6).setCellValue(req.getGpu() != null ? req.getGpu() : "");
                    row.createCell(7).setCellValue(req.getRam() != null ? req.getRam() : "");
                    row.createCell(8).setCellValue(req.getSsd() != null ? req.getSsd() : "");
                    row.createCell(9).setCellValue(req.getTouchscreen() != null ? req.getTouchscreen() : "");
                    row.createCell(10).setCellValue(req.getImportType() != null ? req.getImportType() : "MUA/NHẬP HÀNG");
                    row.createCell(11).setCellValue(req.getInitialStatus() != null ? req.getInitialStatus() : "SẴN SÀNG BÁN");
                    if (req.getPrice() != null) {
                        row.createCell(12).setCellValue(req.getPrice().doubleValue());
                    } else {
                        row.createCell(12).setCellValue("");
                    }
                    row.createCell(13).setCellValue(req.getImportDate() != null ? req.getImportDate() : "");
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Add Data Validation (Dropdowns)
            addValidationToSheet(sheet, 4, new String[]{"Văn phòng (Office)", "Gaming", "Máy trạm (Workstation)", "MacBook"});
            addValidationToSheet(sheet, 7, new String[]{"4GB", "8GB", "16GB", "32GB", "64GB"});
            addValidationToSheet(sheet, 8, new String[]{"128GB", "256GB", "512GB", "1TB", "2TB"});
            addValidationToSheet(sheet, 9, new String[]{"Không cảm ứng", "Cảm ứng"});
            addValidationToSheet(sheet, 10, new String[]{"MUA/NHẬP HÀNG", "THU LẠI CỦA KHÁCH", "KHÁCH ĐỔI/TRẢ", "TỒN ĐẦU KỲ"});
            addValidationToSheet(sheet, 11, new String[]{"SẴN SÀNG BÁN", "CẦN KIỂM TRA"});

            workbook.write(out);
            return new org.springframework.core.io.ByteArrayResource(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo file Excel: " + e.getMessage());
        }
    }

    private void addValidationToSheet(org.apache.poi.ss.usermodel.Sheet sheet, int colIdx, String[] options) {
        org.apache.poi.ss.usermodel.DataValidationHelper validationHelper = sheet.getDataValidationHelper();
        org.apache.poi.ss.util.CellRangeAddressList addressList = new org.apache.poi.ss.util.CellRangeAddressList(1, 1000, colIdx, colIdx);
        org.apache.poi.ss.usermodel.DataValidationConstraint constraint = validationHelper.createExplicitListConstraint(options);
        org.apache.poi.ss.usermodel.DataValidation dataValidation = validationHelper.createValidation(constraint, addressList);
        dataValidation.setSuppressDropDownArrow(true);
        dataValidation.setShowErrorBox(true);
        sheet.addValidationData(dataValidation);
    }

    private BigDecimal parseBigDecimal(String val) {
        if (val == null || val.trim().isEmpty()) return null;
        try { return new BigDecimal(val.trim()); } catch (Exception e) { return null; }
    }
}
