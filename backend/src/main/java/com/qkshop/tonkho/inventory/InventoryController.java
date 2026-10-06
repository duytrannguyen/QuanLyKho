package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.inventory.dto.InventoryVariantV2DTO;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryCycleService inventoryCycleService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<InventoryVariantV2DTO>>> searchInventory(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String segment,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        org.springframework.data.domain.Page<InventoryVariantV2DTO> results = inventoryCycleService.searchInventory(query, brand, segment, status, page, size);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/filters")
    public ResponseEntity<ApiResponse<java.util.Map<String, List<String>>>> getFilters() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryCycleService.getFilters()));
    }
}
