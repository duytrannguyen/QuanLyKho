package com.qkshop.tonkho.part;

import com.qkshop.tonkho.core.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/part")
@RequiredArgsConstructor
public class PartController {

    private final PartService partService;

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<Part>>> getAllParts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String stockFilter) {
        List<Part> list = partService.getAllParts(keyword, category, stockFilter);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy danh sách linh kiện thành công", list));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Part>>> getAvailableParts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category) {
        List<Part> list = partService.getAvailableParts(keyword, category);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy danh sách linh kiện có sẵn thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Part>> getPartById(@PathVariable Long id) {
        Part part = partService.getPartById(id);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Chi tiết linh kiện", part));
    }

    @GetMapping("/next-sku")
    public ResponseEntity<ApiResponse<String>> getNextSku(@RequestParam(defaultValue = "KHAC") String category) {
        String sku = partService.generateNextSku(category);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Mã SKU gợi ý", sku));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getCategories() {
        List<Map<String, String>> categories = List.of(
                Map.of("code", "RAM", "label", "RAM (Bộ nhớ trong)"),
                Map.of("code", "SSD", "label", "SSD (Ổ cứng thể rắn)"),
                Map.of("code", "HDD", "label", "HDD (Ổ cứng cơ)"),
                Map.of("code", "PIN", "label", "Pin (Battery)"),
                Map.of("code", "MAN", "label", "Màn hình (Screen/LCD)"),
                Map.of("code", "PHIM", "label", "Bàn phím (Keyboard)"),
                Map.of("code", "SAC", "label", "Sạc / Nguồn (Adapter)"),
                Map.of("code", "MAIN", "label", "Bo mạch chủ (Mainboard)"),
                Map.of("code", "FAN", "label", "Quạt tản nhiệt / Heatsink"),
                Map.of("code", "BANLE", "label", "Bản lề (Hinge)"),
                Map.of("code", "LOA", "label", "Loa (Speaker)"),
                Map.of("code", "KHAC", "label", "Linh kiện khác")
        );
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('IMPORT_PART')")
    public ResponseEntity<ApiResponse<Part>> importPart(
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        Part saved = partService.importPart(payload, username);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Nhập kho linh kiện thành công", saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PART_MANAGE') or hasAuthority('IMPORT_PART')")
    public ResponseEntity<ApiResponse<Part>> updatePart(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        Part updated = partService.updatePart(id, payload, username);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Cập nhật thông tin linh kiện thành công", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PART_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> deletePart(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        partService.deletePart(id, username);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xóa linh kiện thành công", null));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PartHistory>>> getHistories(
            @RequestParam(required = false) String sku) {
        List<PartHistory> list = partService.getHistories(sku);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Lấy lịch sử biến động linh kiện thành công", list));
    }
}
