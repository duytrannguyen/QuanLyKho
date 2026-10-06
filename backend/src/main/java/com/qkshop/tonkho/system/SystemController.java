package com.qkshop.tonkho.system;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.system.SystemConfig;
import com.qkshop.tonkho.system.SystemConfigService;
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

    /** Lấy tất cả cấu hình dạng key-value */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse<Map<String, String>>> getConfig() {
        return ResponseEntity.ok(ApiResponse.ok(systemConfigService.getAllConfig()));
    }

    /** Lấy tất cả thông tin config (kèm mô tả) */
    @GetMapping("/config/details")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemConfig>>> getConfigDetails() {
        return ResponseEntity.ok(ApiResponse.ok(systemConfigService.listAll()));
    }

    /** Cập nhật 1 cấu hình */
    @PutMapping("/config/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SystemConfig>> updateConfig(
            @PathVariable String key,
            @RequestBody Map<String, String> payload) {
        String value = payload.get("value");
        String description = payload.get("description");
        SystemConfig updated = systemConfigService.upsertConfig(key, value, description);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thành công", updated));
    }
}
