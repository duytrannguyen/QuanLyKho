package com.qkshop.tonkho.sync;
import com.qkshop.tonkho.system.SystemConfigService;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.core.enums.CloseType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SyncService — đã loại bỏ phụ thuộc Machine/MachineRepository (V1).
 * Chỉ đọc từ V2: ActiveInventory, ClosedCycle.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService {

    private final SystemConfigService systemConfigService;
    private final ActiveInventoryRepository activeInventoryRepository;
    private final ClosedCycleRepository closedCycleRepository;

    public Map<String, Object> reconcileDataSale(String period) {
        Map<String, Object> result = new HashMap<>();

        long soldInSystem = closedCycleRepository.countByCloseType(CloseType.SALE);
        long activeInSystem = activeInventoryRepository.count();

        result.put("found", soldInSystem);
        result.put("activeInventory", activeInSystem);
        result.put("classified", soldInSystem);
        result.put("actionRequired", 0);
        result.put("errors", 0);

        List<Map<String, Object>> details = List.of();
        result.put("details", details);

        return result;
    }
}
