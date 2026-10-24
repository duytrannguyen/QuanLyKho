package com.qkshop.tonkho.system;

import com.qkshop.tonkho.catalog.CatalogService;
import com.qkshop.tonkho.catalog.Platform;
import com.qkshop.tonkho.catalog.PlatformRepository;
import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.catalog.VariantV2Repository;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Dịch vụ bảo trì và chuẩn hóa dữ liệu kho, máy móc.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataMaintenanceService {

    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final PlatformRepository platformRepo;
    private final VariantV2Repository variantRepo;
    private final CatalogService catalogService;

    private static final Pattern CLEAN_PATTERN = Pattern.compile("(?i) (core|ryzen|ram|ssd|intel|amd|/|- \\d{4})");

    @Transactional(rollbackFor = Exception.class)
    public String cleanUpDirtyData() {
        log.info("Bắt đầu chuẩn hóa dữ liệu tồn kho và danh mục...");

        List<ActiveInventory> actives = activeInventoryRepo.findAll();
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

        List<ClosedCycle> closeds = closedCycleRepo.findAll();
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

        List<Platform> platforms = platformRepo.findAll();
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

        List<VariantV2> variants = variantRepo.findAll();
        for (VariantV2 v : variants) {
            boolean changed = false;
            if ("N/A".equalsIgnoreCase(v.getCpuCode())) {
                v.setCpuCode("");
                changed = true;
            }
            if ("N/A".equalsIgnoreCase(v.getGpuCode()) || "ONBOARD".equalsIgnoreCase(v.getGpuCode())) {
                v.setGpuCode("");
                changed = true;
            }
            if (changed) {
                variantRepo.save(v);
            }
        }

        catalogService.fixAllDisplayNames();
        log.info("Chuẩn hóa dữ liệu thành công!");
        return "Chuẩn hóa dữ liệu thành công!";
    }

    private String cleanModelString(String input) {
        if (input == null) return "";
        String lower = input.toLowerCase();
        Matcher m = CLEAN_PATTERN.matcher(lower);
        if (m.find() && m.start() > 0) {
            return input.substring(0, m.start()).trim();
        }
        return input;
    }
}
