package com.qkshop.tonkho.analytics;

import com.qkshop.tonkho.log.ActivityLog;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import com.qkshop.tonkho.log.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DashboardService — đọc từ V2 (ActiveInventory, InspectionRequest).
 * Không còn phụ thuộc Machine (V1) hay Inspection (V1).
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ActiveInventoryRepository activeInventoryRepository;
    private final InspectionRequestRepository inspectionRequestRepository;
    private final ActivityLogRepository activityLogRepository;

    public Map<String, Object> getSummary() {
        long totalActive = activeInventoryRepository.count();
        long readyToSell = activeInventoryRepository.countByState(CycleState.READY);
        long needInspection = activeInventoryRepository.countByState(CycleState.NEEDS_INSPECTION);
        long withoutPrice = activeInventoryRepository.countWithoutPrice();
        long pendingInspections = inspectionRequestRepository.countByStatus(InspectionRequestStatus.OPEN);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalActive", totalActive);
        summary.put("readyToSell", readyToSell);
        summary.put("needInspection", needInspection);
        summary.put("errorCount", 0L);  // Dùng DataIssue nếu cần, không còn LOI status
        summary.put("withoutPrice", withoutPrice);
        summary.put("pendingInspections", pendingInspections);
        return summary;
    }

    public Map<String, Object> getPriorities() {
        long pendingInspections = inspectionRequestRepository.countByStatus(InspectionRequestStatus.OPEN);
        long withoutPrice = activeInventoryRepository.countWithoutPrice();

        Map<String, Object> priorities = new HashMap<>();
        priorities.put("p0_data_errors", 0L);
        priorities.put("p1_pending_inspections", pendingInspections);
        priorities.put("p2_without_price", withoutPrice);
        return priorities;
    }

    public List<ActivityLog> getRecentActivity() {
        return activityLogRepository.findTop20ByOrderByCreatedAtDesc();
    }
}
