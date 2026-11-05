package com.qkshop.tonkho.system;

import com.qkshop.tonkho.core.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {

    private final SystemConfigService systemConfigService;
    private final DataMaintenanceService dataMaintenanceService;

    /** Lấy tất cả cấu hình dạng key-value */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse<Map<String, String>>> getConfig() {
        return ResponseEntity.ok(ApiResponse.ok(systemConfigService.getAllConfig()));
    }

    /** Lấy tất cả thông tin config (kèm mô tả) */
    @GetMapping("/config/details")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<List<SystemConfig>>> getConfigDetails() {
        return ResponseEntity.ok(ApiResponse.ok(systemConfigService.listAll()));
    }

    /** Cập nhật 1 cấu hình */
    @PutMapping("/config/{key}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<SystemConfig>> updateConfig(
            @PathVariable String key,
            @RequestBody Map<String, String> payload) {
        String value = payload.get("value");
        String description = payload.get("description");
        SystemConfig updated = systemConfigService.upsertConfig(key, value, description);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thành công", updated));
    }

    /** Chuẩn hóa và làm sạch dữ liệu danh mục & kho máy (Chỉ Admin hoặc quyền quản trị hệ thống) */
    @PostMapping("/maintenance/cleanup")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYSTEM_MANAGE')")
    public ResponseEntity<ApiResponse<String>> cleanUpDirtyData() {
        String result = dataMaintenanceService.cleanUpDirtyData();
        return ResponseEntity.ok(ApiResponse.okWithMessage(result, result));
    }
}
