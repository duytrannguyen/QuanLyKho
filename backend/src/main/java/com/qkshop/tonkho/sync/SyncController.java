package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.sync.SyncRun;
import com.qkshop.tonkho.sync.ReconciliationService;
import com.qkshop.tonkho.sync.SalesSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final com.qkshop.tonkho.system.SystemConfigService systemConfigService;
    private final com.qkshop.tonkho.sync.gsheet.GoogleSheetProperties googleSheetProperties;
    private final SyncRunRepository syncRunRepo;
    private final com.qkshop.tonkho.issue.DataIssueRepository dataIssueRepo;

    @PostMapping("/run")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYNC_MANAGE')")
    public ResponseEntity<ApiResponse<SyncRun>> runSync(@RequestBody(required = false) Map<String, String> payload) {
        throw new IllegalStateException("Chức năng đồng bộ Google Sheet đã được tắt theo cấu hình hệ thống.");
    }

    @GetMapping("/issues")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('SYNC_VIEW', 'SYNC_MANAGE', 'DASHBOARD_VIEW')")
    public ResponseEntity<ApiResponse<List<DataIssue>>> getOpenIssues() {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.getAllOpenIssues()));
    }

    @GetMapping("/runs")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('SYNC_VIEW', 'SYNC_MANAGE', 'DASHBOARD_VIEW')")
    public ResponseEntity<ApiResponse<List<SyncRun>>> getRecentRuns() {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.getRecentSyncRuns()));
    }

    @GetMapping("/latest-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLatestStatus() {
        Map<String, Object> res = new java.util.HashMap<>();
        SyncRun latest = syncRunRepo.findTopByOrderByStartedAtDesc().orElse(null);
        long openIssues = dataIssueRepo.countByStatusIn(List.of(
                com.qkshop.tonkho.issue.IssueStatus.OPEN,
                com.qkshop.tonkho.issue.IssueStatus.IN_REVIEW,
                com.qkshop.tonkho.issue.IssueStatus.FIXED_WAIT_RESCAN));
        res.put("latestRun", latest);
        res.put("openIssuesCount", openIssues);
        res.put("enabled", false);
        res.put("intervalMinutes", 0);
        res.put("notifyMode", "DISABLED");
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    @PostMapping("/issues/{issueId}/recheck")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYNC_MANAGE')")
    public ResponseEntity<ApiResponse<DataIssue>> recheckIssue(@PathVariable String issueId) {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.recheckIssue(issueId)));
    }

    @PostMapping("/issues/{issueId}/resolve")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYNC_MANAGE')")
    public ResponseEntity<ApiResponse<DataIssue>> resolveIssueManual(
            @PathVariable String issueId, 
            @RequestBody Map<String, String> payload) {
        String note = payload.getOrDefault("note", "");
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.resolveIssueManual(issueId, note)));
    }

    @PostMapping("/issues/resolve-all")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYNC_MANAGE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resolveAllIssues(
            @RequestBody(required = false) Map<String, String> payload) {
        String issueType = payload != null ? payload.get("issueType") : null;
        String note = payload != null ? payload.getOrDefault("note", "Người dùng đóng hàng loạt") : "Người dùng đóng hàng loạt";
        int count = reconciliationService.resolveIssuesByType(issueType, note);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã đóng " + count + " lỗi thành công!", Map.of("resolvedCount", count)));
    }

    @PostMapping("/issues/{issueId}/approve-return")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYNC_MANAGE') or hasAuthority('ORDER_RETURN')")
    public ResponseEntity<ApiResponse<DataIssue>> approveReturn(
            @PathVariable String issueId,
            @RequestBody(required = false) Map<String, String> payload,
            java.security.Principal principal) {
        String note = payload != null ? payload.getOrDefault("note", "") : "";
        String actor = principal != null ? principal.getName() : "ADMIN";
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã xác nhận nhập máy lại kho thành công!",
                reconciliationService.approveReturn(issueId, actor, note)));
    }

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('SYNC_VIEW', 'SYNC_MANAGE', 'DASHBOARD_VIEW')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSyncSettings() {
        Map<String, Object> settings = new java.util.HashMap<>();
        settings.put("enabled", false);
        settings.put("intervalMinutes", 0);
        settings.put("doneMarker", "");
        settings.put("spreadsheetId", "");
        settings.put("notifyMode", "DISABLED");
        return ResponseEntity.ok(ApiResponse.ok(settings));
    }

    @PostMapping("/settings")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SYNC_MANAGE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSyncSettings(
            @RequestBody Map<String, Object> payload) {
        throw new IllegalStateException("Chức năng đồng bộ Google Sheet đã được tắt theo cấu hình hệ thống.");
    }
}
