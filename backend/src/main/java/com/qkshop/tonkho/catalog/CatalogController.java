package com.qkshop.tonkho.catalog;
import com.qkshop.tonkho.sale.SalesConfigRepository;
import com.qkshop.tonkho.sale.SalesConfig;

import com.qkshop.tonkho.core.dto.ApiResponse;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final BrandRepository brandRepo;
    private final ModelLineRepository modelLineRepo;
    private final PlatformRepository platformRepo;
    private final VariantV2Repository variantRepo;
    private final SalesConfigRepository configRepo;
    private final CatalogService catalogService;

    @GetMapping("/fix-display-names")
    public ResponseEntity<ApiResponse<String>> fixDisplayNames() {
        catalogService.fixAllDisplayNames();
        return ResponseEntity.ok(ApiResponse.ok("Fixed all display names"));
    }

    @GetMapping("/brands")
    public ResponseEntity<ApiResponse<List<Brand>>> getBrands() {
        return ResponseEntity.ok(ApiResponse.ok(brandRepo.findByActiveTrue()));
    }

    @GetMapping("/model-lines")
    public ResponseEntity<ApiResponse<List<ModelLine>>> getModelLines(@RequestParam(required = false) String brandId) {
        if (brandId != null) {
            return ResponseEntity.ok(ApiResponse.ok(modelLineRepo.findByBrand_BrandIdAndActiveTrue(brandId)));
        }
        return ResponseEntity.ok(ApiResponse.ok(modelLineRepo.findByActiveTrue()));
    }

    @GetMapping("/platforms")
    public ResponseEntity<ApiResponse<List<Platform>>> getPlatforms(@RequestParam(required = false) String modelLineId) {
        if (modelLineId != null) {
            return ResponseEntity.ok(ApiResponse.ok(platformRepo.findByModelLine_ModelLineIdAndActiveTrue(modelLineId)));
        }
        return ResponseEntity.ok(ApiResponse.ok(platformRepo.findByActiveTrue()));
    }

    @GetMapping("/variants")
    public ResponseEntity<ApiResponse<List<VariantV2>>> getVariants(@RequestParam(required = false) String platformId) {
        if (platformId != null) {
            return ResponseEntity.ok(ApiResponse.ok(variantRepo.findByPlatform_PlatformIdAndActiveTrue(platformId)));
        }
        return ResponseEntity.ok(ApiResponse.ok(variantRepo.findByActiveTrue()));
    }

    @GetMapping("/configs")
    public ResponseEntity<ApiResponse<List<SalesConfig>>> getConfigs(@RequestParam(required = false) String variantId) {
        if (variantId != null) {
            return ResponseEntity.ok(ApiResponse.ok(configRepo.findByVariant_VariantIdAndActiveTrue(variantId)));
        }
        return ResponseEntity.ok(ApiResponse.ok(configRepo.findByActiveTrue()));
    }
}
