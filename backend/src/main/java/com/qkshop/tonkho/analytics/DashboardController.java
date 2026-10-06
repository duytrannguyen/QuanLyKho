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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ActiveInventoryRepository activeInventoryRepo;
    private final DataIssueRepository dataIssueRepo;
    private final EventLogRepository eventLogRepo;
    private final InspectionRequestRepository inspectionRequestRepo;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary() {
        long totalActive = activeInventoryRepo.count();
        long readyToSell = activeInventoryRepo.countByState(CycleState.READY);
        long needInspection = activeInventoryRepo.countByState(CycleState.NEEDS_INSPECTION);
        long errorCount = dataIssueRepo.countByStatusIn(List.of(IssueStatus.OPEN, IssueStatus.IN_REVIEW));
        long withoutPrice = activeInventoryRepo.countWithoutPrice();
        long pendingInspections = inspectionRequestRepo.countByStatus(InspectionRequestStatus.OPEN);

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalActive", totalActive,
                "readyToSell", readyToSell,
                "needInspection", needInspection,
                "errorCount", errorCount,
                "withoutPrice", withoutPrice,
                "pendingInspections", pendingInspections
        )));
    }

    @GetMapping("/priorities")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPriorities() {
        long pendingInspections = inspectionRequestRepo.countByStatus(InspectionRequestStatus.OPEN);
        long withoutPrice = activeInventoryRepo.countWithoutPrice();
        long errorCount = dataIssueRepo.countByStatusIn(List.of(IssueStatus.OPEN, IssueStatus.IN_REVIEW));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "p0_data_errors", errorCount,
            "p1_pending_inspections", pendingInspections,
            "p2_without_price", withoutPrice
        )));
    }

    @GetMapping("/recent-activity")
    public ResponseEntity<ApiResponse<List<EventLog>>> getRecentActivity() {
        List<EventLog> logs = eventLogRepo.findAllByOrderByEventAtDesc(PageRequest.of(0, 20)).getContent();
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
