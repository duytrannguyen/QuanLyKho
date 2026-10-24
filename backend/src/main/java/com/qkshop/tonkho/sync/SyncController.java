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
    private final com.qkshop.tonkho.system.SystemConfigService systemConfigService;
    private final com.qkshop.tonkho.sync.gsheet.GoogleSheetProperties googleSheetProperties;
    private final SyncRunRepository syncRunRepo;
    private final com.qkshop.tonkho.issue.DataIssueRepository dataIssueRepo;

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

    @GetMapping("/latest-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLatestStatus() {
        Map<String, Object> res = new java.util.HashMap<>();
        SyncRun latest = syncRunRepo.findTopByOrderByStartedAtDesc().orElse(null);
        long openIssues = dataIssueRepo.countByStatusIn(List.of(
                com.qkshop.tonkho.issue.IssueStatus.OPEN,
                com.qkshop.tonkho.issue.IssueStatus.IN_REVIEW,
                com.qkshop.tonkho.issue.IssueStatus.FIXED_WAIT_RESCAN));
        boolean enabled = Boolean.parseBoolean(systemConfigService.getConfig("GSHEET_SYNC_ENABLED", String.valueOf(googleSheetProperties.isEnabled())));
        int intervalMinutes = 15;
        try {
            intervalMinutes = Integer.parseInt(systemConfigService.getConfig("GSHEET_SYNC_INTERVAL_MINUTES", "15"));
        } catch (Exception ignored) {}
        String notifyMode = systemConfigService.getConfig("GSHEET_SYNC_NOTIFY_MODE", "CHANGES");

        res.put("latestRun", latest);
        res.put("openIssuesCount", openIssues);
        res.put("enabled", enabled);
        res.put("intervalMinutes", intervalMinutes);
        res.put("notifyMode", notifyMode);
        return ResponseEntity.ok(ApiResponse.ok(res));
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

    @PostMapping("/issues/resolve-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resolveAllIssues(
            @RequestBody(required = false) Map<String, String> payload) {
        String issueType = payload != null ? payload.get("issueType") : null;
        String note = payload != null ? payload.getOrDefault("note", "Người dùng đóng hàng loạt") : "Người dùng đóng hàng loạt";
        int count = reconciliationService.resolveIssuesByType(issueType, note);
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã đóng " + count + " lỗi thành công!", Map.of("resolvedCount", count)));
    }

    @PostMapping("/issues/{issueId}/approve-return")
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSyncSettings() {
        Map<String, Object> settings = new java.util.HashMap<>();
        settings.put("enabled", Boolean.parseBoolean(systemConfigService.getConfig("GSHEET_SYNC_ENABLED", String.valueOf(googleSheetProperties.isEnabled()))));
        settings.put("intervalMinutes", Integer.parseInt(systemConfigService.getConfig("GSHEET_SYNC_INTERVAL_MINUTES", "15")));
        settings.put("doneMarker", systemConfigService.getConfig("GSHEET_DONE_MARKER", googleSheetProperties.getDoneMarker()));
        settings.put("spreadsheetId", systemConfigService.getConfig("GSHEET_SPREADSHEET_ID", googleSheetProperties.getSpreadsheetId() != null ? googleSheetProperties.getSpreadsheetId() : ""));
        settings.put("notifyMode", systemConfigService.getConfig("GSHEET_SYNC_NOTIFY_MODE", "CHANGES"));
        return ResponseEntity.ok(ApiResponse.ok(settings));
    }

    @PostMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSyncSettings(
            @RequestBody Map<String, Object> payload) {
        if (payload.containsKey("enabled")) {
            systemConfigService.upsertConfig("GSHEET_SYNC_ENABLED", String.valueOf(payload.get("enabled")), "Bật/Tắt đồng bộ Google Sheet tự động");
        }
        if (payload.containsKey("intervalMinutes")) {
            systemConfigService.upsertConfig("GSHEET_SYNC_INTERVAL_MINUTES", String.valueOf(payload.get("intervalMinutes")), "Tần suất đồng bộ Google Sheet (phút)");
        }
        if (payload.containsKey("doneMarker")) {
            systemConfigService.upsertConfig("GSHEET_DONE_MARKER", String.valueOf(payload.get("doneMarker")), "Ký hiệu đánh dấu đã xuất kho trên Sheet");
        }
        if (payload.containsKey("spreadsheetId")) {
            systemConfigService.upsertConfig("GSHEET_SPREADSHEET_ID", String.valueOf(payload.get("spreadsheetId")), "Google Spreadsheet ID");
        }
        if (payload.containsKey("notifyMode")) {
            systemConfigService.upsertConfig("GSHEET_SYNC_NOTIFY_MODE", String.valueOf(payload.get("notifyMode")), "Chế độ thông báo sau khi đồng bộ");
        }
        return ResponseEntity.ok(ApiResponse.okWithMessage("Đã lưu cấu hình đồng bộ thành công!", payload));
    }
}
