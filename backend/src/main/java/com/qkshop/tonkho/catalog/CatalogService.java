package com.qkshop.tonkho.catalog;
import com.qkshop.tonkho.sale.SalesConfigRepository;
import com.qkshop.tonkho.sale.SalesConfig;


import com.qkshop.tonkho.core.enums.SegmentCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service quản lý danh mục (Brand, ModelLine, Platform, Variant, Config).
 * Sử dụng pattern findOrCreate để đảm bảo luôn có khóa chuẩn.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogService {

    private final BrandRepository brandRepo;
    private final ModelLineRepository modelLineRepo;
    private final PlatformRepository platformRepo;
    private final VariantV2Repository variantRepo;
    private final SalesConfigRepository configRepo;

    private String appendConfigPart(String base, String part) {
        if (part == null || part.trim().isEmpty()) return base;
        String p = part.trim();
        if (p.equalsIgnoreCase("N/A") || p.equalsIgnoreCase("NA") || p.equalsIgnoreCase("ONBOARD")) return base;
        
        String normalizedBase = base.toLowerCase().replaceAll("\\s+", "");
        String normalizedPart = p.toLowerCase().replaceAll("\\s+", "");
        
        if (normalizedBase.contains(normalizedPart)) return base;
        return base + " | " + p;
    }

    private String appendTouch(String base, String touchStr) {
        if (touchStr == null || touchStr.trim().isEmpty()) return base;
        if (base.toLowerCase().replaceAll("\\s+", "").contains("cảmứng")) return base;
        return base + touchStr;
    }

    /**
     * Dọn dẹp chuỗi cấu hình dính liền trong tên máy
     */
    public String cleanModelString(String input) {
        if (input == null) return "";
        String lower = input.toLowerCase();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i) (core|ryzen|ram|ssd|intel|amd|/|- \\d{4})").matcher(lower);
        if (m.find() && m.start() > 0) {
            return input.substring(0, m.start()).trim();
        }
        return input.trim();
    }


    /**
     * Tìm hoặc tạo hãng.
     */
    @Transactional
    public Brand findOrCreateBrand(String brandName) {
        String key = brandName.trim().toUpperCase().replaceAll("\\s+", "");
        if (key.length() > 100) key = key.substring(0, 100);
        Optional<Brand> existing = brandRepo.findByBrandKey(key);
        if (existing.isPresent()) {
            return existing.get();
        }

        String safeBrandName = brandName.trim();
        if (safeBrandName.length() > 100) safeBrandName = safeBrandName.substring(0, 100);

        Brand newBrand = Brand.builder()
                .brandId("BRD-" + System.currentTimeMillis() + "-" + java.util.UUID.randomUUID().toString().substring(0, 4))
                .brandName(safeBrandName)
                .brandKey(key)
                .build();
        return brandRepo.save(newBrand);
    }

    /**
     * Tìm hoặc tạo dòng máy (Model Line).
     */
    @Transactional
    public ModelLine findOrCreateModelLine(Brand brand, String modelLineName, SegmentCode segmentCode) {
        String key = (brand.getBrandKey() + "-" + modelLineName).trim().toUpperCase().replaceAll("\\s+", "");
        if (key.length() > 200) key = key.substring(0, 200);
        Optional<ModelLine> existing = modelLineRepo.findByModelLineKey(key);
        if (existing.isPresent()) {
            return existing.get();
        }

        String safeModelLineName = modelLineName.trim();
        if (safeModelLineName.length() > 200) safeModelLineName = safeModelLineName.substring(0, 200);

        ModelLine newLine = ModelLine.builder()
                .modelLineId("ML-" + System.currentTimeMillis() + "-" + java.util.UUID.randomUUID().toString().substring(0, 4))
                .brand(brand)
                .segmentCode(segmentCode)
                .modelLineName(safeModelLineName)
                .modelLineKey(key)
                .build();
        return modelLineRepo.save(newLine);
    }

    /**
     * Tìm hoặc tạo Platform.
     */
    @Transactional
    public Platform findOrCreatePlatform(ModelLine modelLine, String platformCode) {
        String key = (modelLine.getModelLineKey() + "-" + platformCode).trim().toUpperCase().replaceAll("\\s+", "");
        if (key.length() > 100) key = key.substring(0, 100);
        Optional<Platform> existing = platformRepo.findByPlatformKey(key);
        if (existing.isPresent()) {
            return existing.get();
        }

        String safePlatformCode = cleanModelString(platformCode);
        if (safePlatformCode.length() > 100) safePlatformCode = safePlatformCode.substring(0, 100);
        
        String prefix = modelLine.getBrand().getBrandName() + " " + modelLine.getModelLineName();
        String displayName = safePlatformCode;
        // Nếu platformCode chưa chứa tên brand/model thì mới ghép vào để tránh lặp (VD: "Dell Latitude 7400" không bị thành "Dell Latitude Dell Latitude 7400")
        if (!displayName.toLowerCase().contains(modelLine.getBrand().getBrandName().toLowerCase()) && 
            !displayName.toLowerCase().contains(modelLine.getModelLineName().toLowerCase())) {
            displayName = prefix + " " + displayName;
        } else if (!displayName.toLowerCase().contains(modelLine.getBrand().getBrandName().toLowerCase())) {
            displayName = modelLine.getBrand().getBrandName() + " " + displayName;
        }
        
        if (displayName.length() > 200) displayName = displayName.substring(0, 200);

        Platform newPlatform = Platform.builder()
                .platformId("PF-" + System.currentTimeMillis() + "-" + java.util.UUID.randomUUID().toString().substring(0, 4))
                .modelLine(modelLine)
                .platformCode(safePlatformCode)
                .platformKey(key)
                .displayName(displayName)
                .build();
        return platformRepo.save(newPlatform);
    }

    /**
     * Tìm hoặc tạo Biến thể kỹ thuật (Variant).
     */
    @Transactional
    public VariantV2 findOrCreateVariant(Platform platform, String cpu, String gpu, String touch, String screenSize) {
        String t = touch != null ? touch.trim().toUpperCase() : "";
        String safeTouch = (t.equals("YES") || (t.contains("CẢM ỨNG") && !t.contains("KHÔNG"))) ? "YES" : "NO";
        String touchStr = "YES".equals(safeTouch) ? " Cảm ứng" : "";
        String safeCpu = cpu != null ? cpu.trim() : "";
        if ("N/A".equalsIgnoreCase(safeCpu)) safeCpu = "";
        
        String safeGpu = gpu != null ? gpu.trim() : "";
        if ("N/A".equalsIgnoreCase(safeGpu) || "ONBOARD".equalsIgnoreCase(safeGpu)) safeGpu = "";
        
        String safeScreen = screenSize != null ? screenSize.trim() : "";

        String key = VariantV2.buildVariantKey(platform.getPlatformKey(), safeCpu, safeGpu, safeTouch, safeScreen);
        if (key.length() > 300) key = key.substring(0, 300);
        Optional<VariantV2> existing = variantRepo.findByVariantKey(key);
        if (existing.isPresent()) {
            return existing.get();
        }
        
        if (safeCpu.length() > 100) safeCpu = safeCpu.substring(0, 100);
        if (safeGpu.length() > 100) safeGpu = safeGpu.substring(0, 100);
        
        String variantName = platform.getDisplayName();
        variantName = appendConfigPart(variantName, safeCpu);
        variantName = appendConfigPart(variantName, safeGpu);
        variantName = appendTouch(variantName, touchStr);
        variantName = appendConfigPart(variantName, safeScreen);
        if (variantName.length() > 300) variantName = variantName.substring(0, 300);

        VariantV2 newVariant = VariantV2.builder()
                .variantId("VAR-" + System.currentTimeMillis())
                .platform(platform)
                .cpuCode(safeCpu)
                .gpuCode(safeGpu)
                .touchFlag(safeTouch)
                .screenSize(safeScreen)
                .variantKey(key)
                .variantName(variantName)
                .build();
        return variantRepo.save(newVariant);
    }

    /**
     * Tìm hoặc tạo Cấu hình bán hàng (SalesConfig).
     */
    @Transactional
    public SalesConfig findOrCreateConfig(VariantV2 variant, String ram, String ssd) {
        String key = SalesConfig.buildConfigKey(variant.getVariantKey(), ram, ssd);
        if (key.length() > 300) key = key.substring(0, 300);
        Optional<SalesConfig> existing = configRepo.findByConfigKey(key);
        if (existing.isPresent()) {
            return existing.get();
        }

        String safeRam = ram.trim();
        if (safeRam.length() > 50) safeRam = safeRam.substring(0, 50);
        String safeSsd = ssd.trim();
        if (safeSsd.length() > 50) safeSsd = safeSsd.substring(0, 50);

        String displayName = variant.getVariantName();
        displayName = appendConfigPart(displayName, safeRam);
        displayName = appendConfigPart(displayName, safeSsd);
        if (displayName.length() > 300) displayName = displayName.substring(0, 300);

        SalesConfig newConfig = SalesConfig.builder()
                .configId("CFG-" + System.currentTimeMillis())
                .variant(variant)
                .ramCode(safeRam)
                .ssdCode(safeSsd)
                .configKey(key)
                .displayName(displayName)
                .build();
        return configRepo.save(newConfig);
    }

    /**
     * Cập nhật thông tin bổ sung cho một cấu hình đã tồn tại, không đổi nhóm (không tạo mới nếu không cần thiết).
     */
    @Transactional
    public SalesConfig updateExistingConfig(SalesConfig cfg, String brandName, String productLine, SegmentCode segmentCode, 
                                            String modelFull, String cpu, String gpu, String touch, String screenSize, 
                                            String ram, String ssd) {
        if (cfg == null) return null;
        VariantV2 varObj = cfg.getVariant();
        Platform platObj = varObj != null ? varObj.getPlatform() : null;
        ModelLine mlObj = platObj != null ? platObj.getModelLine() : null;
        Brand brandObj = mlObj != null ? mlObj.getBrand() : null;
        
        // 1. Cập nhật Brand
        if (brandObj != null && brandName != null && !brandName.isEmpty()) {
            brandObj.setBrandName(brandName);
            brandRepo.save(brandObj);
        }
        
        // 2. Cập nhật ModelLine
        if (mlObj != null && productLine != null && !productLine.isEmpty()) {
            mlObj.setModelLineName(productLine);
            if (segmentCode != null) mlObj.setSegmentCode(segmentCode);
            modelLineRepo.save(mlObj);
        }
        
        // 3. Cập nhật Platform
        if (platObj != null && modelFull != null && !modelFull.isEmpty()) {
            String safeModelFull = cleanModelString(modelFull);
            platObj.setPlatformCode(safeModelFull);
            String prefix = brandObj.getBrandName() + " " + mlObj.getModelLineName();
            String displayName = safeModelFull;
            if (!displayName.toLowerCase().contains(brandObj.getBrandName().toLowerCase()) && 
                !displayName.toLowerCase().contains(mlObj.getModelLineName().toLowerCase())) {
                displayName = prefix + " " + displayName;
            } else if (!displayName.toLowerCase().contains(brandObj.getBrandName().toLowerCase())) {
                displayName = brandObj.getBrandName() + " " + displayName;
            }
            if (displayName.length() > 200) displayName = displayName.substring(0, 200);
            platObj.setDisplayName(displayName);
            platformRepo.save(platObj);
        }
        
        // 4. Cập nhật VariantV2
        if (varObj != null) {
            String safeCpu = cpu != null ? cpu.trim() : varObj.getCpuCode();
            if ("N/A".equalsIgnoreCase(safeCpu)) safeCpu = "";
            
            String safeGpu = gpu != null ? gpu.trim() : varObj.getGpuCode();
            if ("N/A".equalsIgnoreCase(safeGpu) || "ONBOARD".equalsIgnoreCase(safeGpu)) safeGpu = "";
            
            String t = touch != null ? touch.trim().toUpperCase() : varObj.getTouchFlag();
            String safeTouch = (t.equals("YES") || (t.contains("CẢM ỨNG") && !t.contains("KHÔNG"))) ? "YES" : "NO";
            String safeScreen = screenSize != null ? screenSize.trim() : varObj.getScreenSize();
            if (safeScreen == null) safeScreen = "";
            
            varObj.setCpuCode(safeCpu);
            varObj.setGpuCode(safeGpu);
            varObj.setTouchFlag(safeTouch);
            varObj.setScreenSize(safeScreen);
            
            String touchStr = "YES".equals(safeTouch) ? " Cảm ứng" : "";
            String variantName = platObj.getDisplayName();
            variantName = appendConfigPart(variantName, safeCpu);
            variantName = appendConfigPart(variantName, safeGpu);
            variantName = appendTouch(variantName, touchStr);
            variantName = appendConfigPart(variantName, safeScreen);
            if (variantName.length() > 300) variantName = variantName.substring(0, 300);
            varObj.setVariantName(variantName);
            
            String newVarKey = VariantV2.buildVariantKey(platObj.getPlatformKey(), safeCpu, safeGpu, safeTouch, safeScreen);
            if (newVarKey.length() > 300) newVarKey = newVarKey.substring(0, 300);
            if (!newVarKey.equals(varObj.getVariantKey())) {
                Optional<VariantV2> existingVar = variantRepo.findByVariantKey(newVarKey);
                if (existingVar.isEmpty()) {
                    varObj.setVariantKey(newVarKey);
                    variantRepo.save(varObj);
                } else if (!existingVar.get().getId().equals(varObj.getId())) {
                    // Trùng key với 1 Variant khác đã tồn tại!
                    // Thay vì để Variant hiện tại bị sai key, ta chuyển Config sang Variant kia.
                    cfg.setVariant(existingVar.get());
                    varObj = existingVar.get(); // Dùng Variant mới để tiếp tục xử lý Config
                } else {
                    variantRepo.save(varObj);
                }
            } else {
                variantRepo.save(varObj);
            }
        }
        
        // 5. Cập nhật SalesConfig
        String safeRam = ram != null ? ram.trim() : cfg.getRamCode();
        if (safeRam.length() > 50) safeRam = safeRam.substring(0, 50);
        String safeSsd = ssd != null ? ssd.trim() : cfg.getSsdCode();
        if (safeSsd.length() > 50) safeSsd = safeSsd.substring(0, 50);
        
        cfg.setRamCode(safeRam);
        cfg.setSsdCode(safeSsd);
        
        String displayName = varObj.getVariantName();
        displayName = appendConfigPart(displayName, safeRam);
        displayName = appendConfigPart(displayName, safeSsd);
        if (displayName.length() > 300) displayName = displayName.substring(0, 300);
        cfg.setDisplayName(displayName);
        
        String newConfigKey = SalesConfig.buildConfigKey(varObj.getVariantKey(), safeRam, safeSsd);
        if (newConfigKey.length() > 300) newConfigKey = newConfigKey.substring(0, 300);
        if (!newConfigKey.equals(cfg.getConfigKey())) {
            Optional<SalesConfig> existingCfg = configRepo.findByConfigKey(newConfigKey);
            if (existingCfg.isEmpty()) {
                cfg.setConfigKey(newConfigKey);
                return configRepo.save(cfg);
            } else if (!existingCfg.get().getId().equals(cfg.getId())) {
                // Trùng config_key với một config khác. Return config đó để thay thế!
                return existingCfg.get();
            } else {
                return configRepo.save(cfg);
            }
        }
        
        return configRepo.save(cfg);
    }

    /**
     * Chạy một lần để sửa lại toàn bộ tên cấu hình bị lặp trên hệ thống
     */
    @Transactional
    public void fixAllDisplayNames() {
        java.util.List<Platform> platforms = platformRepo.findAll();
        for (Platform platObj : platforms) {
            ModelLine mlObj = platObj.getModelLine();
            Brand brandObj = mlObj.getBrand();
            String prefix = brandObj.getBrandName() + " " + mlObj.getModelLineName();
            String displayName = platObj.getPlatformCode();
            if (!displayName.toLowerCase().contains(brandObj.getBrandName().toLowerCase()) && 
                !displayName.toLowerCase().contains(mlObj.getModelLineName().toLowerCase())) {
                displayName = prefix + " " + displayName;
            } else if (!displayName.toLowerCase().contains(brandObj.getBrandName().toLowerCase())) {
                displayName = brandObj.getBrandName() + " " + displayName;
            }
            if (displayName.length() > 200) displayName = displayName.substring(0, 200);
            platObj.setDisplayName(displayName);
        }
        platformRepo.saveAll(platforms);
        
        java.util.List<VariantV2> variants = variantRepo.findAll();
        for (VariantV2 varObj : variants) {
            String variantName = varObj.getPlatform().getDisplayName();
            variantName = appendConfigPart(variantName, varObj.getCpuCode());
            variantName = appendConfigPart(variantName, varObj.getGpuCode());
            String touchStr = "YES".equals(varObj.getTouchFlag()) ? " Cảm ứng" : "";
            variantName = appendTouch(variantName, touchStr);
            variantName = appendConfigPart(variantName, varObj.getScreenSize());
            if (variantName.length() > 300) variantName = variantName.substring(0, 300);
            varObj.setVariantName(variantName);
        }
        variantRepo.saveAll(variants);
        
        java.util.List<SalesConfig> configs = configRepo.findAll();
        for (SalesConfig cfg : configs) {
            String displayName = cfg.getVariant().getVariantName();
            displayName = appendConfigPart(displayName, cfg.getRamCode());
            displayName = appendConfigPart(displayName, cfg.getSsdCode());
            if (displayName.length() > 300) displayName = displayName.substring(0, 300);
            cfg.setDisplayName(displayName);
        }
        configRepo.saveAll(configs);
    }
}
