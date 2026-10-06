package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.sync.SyncRun;
import com.qkshop.tonkho.sync.ReconciliationService;
import com.qkshop.tonkho.sync.SalesSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SalesSyncService salesSyncService;
    private final ReconciliationService reconciliationService;

    @PostMapping("/run")
    public ResponseEntity<ApiResponse<SyncRun>> runSync(@RequestBody(required = false) Map<String, String> payload) {
        String mode = (payload != null && payload.containsKey("mode")) ? payload.get("mode") : "MANUAL";
        SyncRun run = salesSyncService.syncSalesWindow(LocalDateTime.now().minusDays(30), LocalDateTime.now(), mode);
        return ResponseEntity.ok(ApiResponse.ok(run));
    }

    @GetMapping("/issues")
    public ResponseEntity<ApiResponse<List<DataIssue>>> getOpenIssues() {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.getAllOpenIssues()));
    }

    @GetMapping("/runs")
    public ResponseEntity<ApiResponse<List<SyncRun>>> getRecentRuns() {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.getRecentSyncRuns()));
    }

    @PostMapping("/issues/{issueId}/recheck")
    public ResponseEntity<ApiResponse<DataIssue>> recheckIssue(@PathVariable String issueId) {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.recheckIssue(issueId)));
    }

    @PostMapping("/issues/{issueId}/resolve")
    public ResponseEntity<ApiResponse<DataIssue>> resolveIssueManual(
            @PathVariable String issueId, 
            @RequestBody Map<String, String> payload) {
        String note = payload.getOrDefault("note", "");
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.resolveIssueManual(issueId, note)));
    }
}
