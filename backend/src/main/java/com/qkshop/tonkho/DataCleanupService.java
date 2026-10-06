package com.qkshop.tonkho;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.catalog.PlatformRepository;
import com.qkshop.tonkho.catalog.VariantV2Repository;
import com.qkshop.tonkho.catalog.Platform;
import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.catalog.CatalogService;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;

@org.springframework.web.bind.annotation.RestController
@RequiredArgsConstructor
public class DataCleanupService {
    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final PlatformRepository platformRepo;
    private final VariantV2Repository variantRepo;
    private final CatalogService catalogService;

    @org.springframework.web.bind.annotation.GetMapping("/api/test/cleanup")
    @Transactional
    public String cleanUpDirtyData() {
        java.util.List<ActiveInventory> actives = activeInventoryRepo.findAll();
        for (ActiveInventory a : actives) {
            String raw = a.getSourceModelText();
            if (raw != null) {
                String clean = cleanModelString(raw);
                if (!raw.equals(clean)) {
                    a.setSourceModelText(clean);
                }
            }
        }
        activeInventoryRepo.saveAll(actives);

        java.util.List<ClosedCycle> closeds = closedCycleRepo.findAll();
        for (ClosedCycle c : closeds) {
            String raw = c.getSourceModelText();
            if (raw != null) {
                String clean = cleanModelString(raw);
                if (!raw.equals(clean)) {
                    c.setSourceModelText(clean);
                }
            }
        }
        closedCycleRepo.saveAll(closeds);

        java.util.List<Platform> platforms = platformRepo.findAll();
        for (Platform p : platforms) {
            String raw = p.getPlatformCode();
            if (raw != null) {
                String clean = cleanModelString(raw);
                if (!raw.equals(clean)) {
                    p.setPlatformCode(clean);
                }
            }
        }
        platformRepo.saveAll(platforms);

        java.util.List<VariantV2> variants = variantRepo.findAll();
        for (VariantV2 v : variants) {
            boolean changed = false;
            if ("N/A".equalsIgnoreCase(v.getCpuCode())) { v.setCpuCode(""); changed = true; }
            if ("N/A".equalsIgnoreCase(v.getGpuCode()) || "ONBOARD".equalsIgnoreCase(v.getGpuCode())) { v.setGpuCode(""); changed = true; }
            if (changed) variantRepo.save(v);
        }
        
        catalogService.fixAllDisplayNames();
        return "Cleanup successful! You can now close this tab.";
    }

    private String cleanModelString(String input) {
        if (input == null) return "";
        String lower = input.toLowerCase();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i) (core|ryzen|ram|ssd|intel|amd|/|- \\d{4})").matcher(lower);
        if (m.find() && m.start() > 0) {
            return input.substring(0, m.start()).trim();
        }
        return input;
    }
}
