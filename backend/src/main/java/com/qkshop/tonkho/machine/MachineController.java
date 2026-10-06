package com.qkshop.tonkho.machine;

import com.qkshop.tonkho.machine.dto.BulkMachineImportRequest;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.dto.ClosedCycleDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/machines")
@RequiredArgsConstructor
public class MachineController {

    private final MachineService machineService;

    /** Tra cứu chi tiết 1 máy theo serial */
    @GetMapping("/{serial}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBySerial(@PathVariable String serial) {
        Map<String, Object> detail = machineService.getBySerial(serial);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /** Tìm kiếm lịch sử máy đã đóng (dã bán, đã trả), trả ClosedCycleDTO đầy đủ */
    @GetMapping("/searchHistory")
    public ResponseEntity<ApiResponse<Page<ClosedCycleDTO>>> searchHistory(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String segment,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(machineService.searchHistory(query, brand, segment, status, page, size)));
    }

    /** Nhập đơn 1 máy */
    @PostMapping
    public ResponseEntity<ApiResponse<ActiveInventory>> importSingleMachine(
            @Valid @RequestBody MachineImportRequest request,
            Authentication authentication) {
        ActiveInventory saved = machineService.importSingleMachine(request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Nhập máy thành công", saved));
    }

    /** Nhập lô nhiều máy cùng cấu hình (từ text form) */
    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importBulkMachines(
            @Valid @RequestBody BulkMachineImportRequest request,
            Authentication authentication) {
        Map<String, Object> result = machineService.importBulkMachines(request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Xử lý nhập lô hoàn tất", result));
    }

    /** Nhập lô từ file Excel */
    @PostMapping("/bulk/excel")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importBulkFromExcel(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            Authentication authentication) {
        Map<String, Object> result = machineService.importBulkFromExcel(file, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Xử lý file Excel hoàn tất", result));
    }

    /** Xem trước lô từ file Excel */
    @PostMapping("/bulk/preview-excel")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewBulkFromExcel(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        Map<String, Object> result = machineService.previewBulkFromExcel(file);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đọc file Excel hoàn tất", result));
    }

    /** Tải file Excel mẫu */
    @PostMapping("/bulk/excel-template")
    public ResponseEntity<org.springframework.core.io.Resource> downloadExcelTemplate(@RequestBody(required = false) java.util.List<MachineImportRequest> data) {
        org.springframework.core.io.ByteArrayResource resource = machineService.generateExcelTemplate(data);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Template_NhapMay.xlsx")
                .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(resource);
    }

    /** Cập nhật thông tin máy (giá, ghi chú, trạng thái) */
    @PutMapping("/{serial}")
    public ResponseEntity<ApiResponse<ActiveInventory>> updateMachine(
            @PathVariable String serial,
            @RequestBody Map<String, Object> updates,
            Authentication authentication) {
        ActiveInventory updated = machineService.updateMachine(serial, updates, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thành công", updated));
    }

    /** Xóa máy — chỉ ADMIN */
    @DeleteMapping("/{serial}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteMachine(
            @PathVariable String serial,
            Authentication authentication) {
        machineService.deleteMachine(serial, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xóa máy " + serial, null));
    }
}
