package com.qkshop.tonkho.machine;

import com.qkshop.tonkho.machine.dto.BulkMachineImportRequest;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inventory.ActiveInventory;
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

    /** Tìm kiếm lịch sử máy đã đóng (đã bán, đã trả), trả ClosedCycleDTO đầy đủ */
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
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('IMPORT_MACHINE')")
    public ResponseEntity<ApiResponse<ActiveInventory>> importSingleMachine(
            @Valid @RequestBody MachineImportRequest request,
            Authentication authentication) {
        ActiveInventory saved = machineService.importSingleMachine(request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Nhập máy thành công", saved));
    }

    /** Nhập lô nhiều máy cùng cấu hình (từ text form) */
    @PostMapping("/bulk")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('IMPORT_MACHINE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importBulkMachines(
            @Valid @RequestBody BulkMachineImportRequest request,
            Authentication authentication) {
        Map<String, Object> result = machineService.importBulkMachines(request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Xử lý nhập lô hoàn tất", result));
    }

    /** Nhập lô từ file Excel */
    @PostMapping("/bulk/excel")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('IMPORT_MACHINE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importBulkFromExcel(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            Authentication authentication) {
        Map<String, Object> result = machineService.importBulkFromExcel(file, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Xử lý file Excel hoàn tất", result));
    }

    /** Xem trước lô từ file Excel */
    @PostMapping("/bulk/preview-excel")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('IMPORT_MACHINE')")
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

    /** Cập nhật giá hàng loạt cho danh sách serial */
    @PutMapping("/bulk-price")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MACHINE_UPDATE')")
    public ResponseEntity<ApiResponse<Integer>> updateBulkPrice(@RequestBody Map<String, Object> payload) {
        int updatedCount = machineService.updateBulkPrice(payload);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật giá hàng loạt thành công", updatedCount));
    }

    /** Cập nhật thông tin máy (giá, ghi chú, trạng thái) */
    @PutMapping("/{serial}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('MACHINE_UPDATE', 'MACHINE_EXPORT_OTHER', 'IMPORT_MACHINE', 'INSPECTION')")
    public ResponseEntity<ApiResponse<ActiveInventory>> updateMachine(
            @PathVariable String serial,
            @RequestBody Map<String, Object> updates,
            Authentication authentication) {
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!isAdmin && updates != null) {
            var authSet = authentication != null
                    ? authentication.getAuthorities().stream().map(org.springframework.security.core.GrantedAuthority::getAuthority).collect(java.util.stream.Collectors.toSet())
                    : java.util.Collections.<String>emptySet();
            if (updates.containsKey("status")) {
                String statusStr = String.valueOf(updates.get("status"));
                if ("NEEDS_INSPECTION".equalsIgnoreCase(statusStr) || "DANG_KIEM_TRA".equalsIgnoreCase(statusStr)
                        || "CAN_KIEM_TRA".equalsIgnoreCase(statusStr) || "CLOSED".equalsIgnoreCase(statusStr)
                        || "HUY_TRA".equalsIgnoreCase(statusStr)) {
                    if (!authSet.contains("MACHINE_EXPORT_OTHER")) {
                        throw new org.springframework.security.access.AccessDeniedException("Không có quyền xuất khác hoặc đưa máy về kiểm tra");
                    }
                }
            }
            if ((updates.containsKey("price") || updates.containsKey("warrantyPeriod") || updates.containsKey("warrantyExpiry"))
                    && !updates.containsKey("status")) {
                if (!authSet.contains("MACHINE_UPDATE") && !authSet.contains("IMPORT_MACHINE")) {
                    throw new org.springframework.security.access.AccessDeniedException("Không có quyền sửa giá bán hoặc bảo hành máy");
                }
            }
        }
        ActiveInventory updated = machineService.updateMachine(serial, updates, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thành công", updated));
    }

    /** Xóa máy — ADMIN hoặc người có quyền MACHINE_DELETE */
    @DeleteMapping("/{serial}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MACHINE_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteMachine(
            @PathVariable String serial,
            Authentication authentication) {
        machineService.deleteMachine(serial, authentication.getName());
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xóa máy " + serial, null));
    }
}
