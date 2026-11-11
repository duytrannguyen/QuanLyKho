package com.qkshop.tonkho.analytics;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.log.EventLog;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.log.EventLogRepository;
import com.qkshop.tonkho.inspection.InspectionRequestRepository;
import com.qkshop.tonkho.inspection.InspectionRequestStatus;
import org.springframework.data.domain.PageRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private static final long SNAPSHOT_TTL_MS = 8_000L;

    private final ActiveInventoryRepository activeInventoryRepo;
    private final DataIssueRepository dataIssueRepo;
    private final EventLogRepository eventLogRepo;
    private final InspectionRequestRepository inspectionRequestRepo;

    private record DashboardCounts(
            long totalActive,
            long readyToSell,
            long needInspection,
            long errorCount,
            long withoutPrice,
            long pendingInspections,
            long expiresAt
    ) {}

    private volatile DashboardCounts cachedCounts;

    private DashboardCounts getCountsSnapshot() {
        long now = System.currentTimeMillis();
        DashboardCounts current = cachedCounts;
        if (current != null && now < current.expiresAt()) {
            return current;
        }
        long totalActive = activeInventoryRepo.count();
        long readyToSell = activeInventoryRepo.countByState(CycleState.READY);
        long needInspection = activeInventoryRepo.countByState(CycleState.NEEDS_INSPECTION);
        long errorCount = dataIssueRepo.countByStatusIn(List.of(IssueStatus.OPEN, IssueStatus.IN_REVIEW));
        long withoutPrice = activeInventoryRepo.countWithoutPrice();
        long pendingInspections = inspectionRequestRepo.countByStatus(InspectionRequestStatus.OPEN);

        DashboardCounts fresh = new DashboardCounts(
                totalActive, readyToSell, needInspection, errorCount, withoutPrice, pendingInspections, now + SNAPSHOT_TTL_MS
        );
        cachedCounts = fresh;
        return fresh;
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary() {
        DashboardCounts c = getCountsSnapshot();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalActive", c.totalActive(),
                "readyToSell", c.readyToSell(),
                "needInspection", c.needInspection(),
                "errorCount", c.errorCount(),
                "withoutPrice", c.withoutPrice(),
                "pendingInspections", c.pendingInspections()
        )));
    }

    @GetMapping("/priorities")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPriorities() {
        DashboardCounts c = getCountsSnapshot();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "p0_data_errors", c.errorCount(),
            "p1_pending_inspections", c.pendingInspections(),
            "p2_without_price", c.withoutPrice()
        )));
    }

    @GetMapping("/recent-activity")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<EventLog>>> getRecentActivity() {
        List<EventLog> logs = eventLogRepo.findAllByOrderByEventAtDesc(PageRequest.of(0, 20)).getContent();
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
