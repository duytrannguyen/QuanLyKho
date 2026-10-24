package com.qkshop.tonkho.sync.gsheet;

import com.qkshop.tonkho.sync.SalesSyncService;
import com.qkshop.tonkho.sync.SyncRun;
import com.qkshop.tonkho.system.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Chạy đồng bộ Google Sheet → kho theo tần suất động lưu trong SystemConfig.
 * Quản trị viên có thể tùy chỉnh số phút hoặc bật/tắt trực tiếp trên UI mà không cần restart server.
 */
@Slf4j
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
        name = "gsheet.scheduler.enabled",
        havingValue = "true",
        matchIfMissing = true
)
@RequiredArgsConstructor
public class GoogleSheetSyncScheduler {

    private final SalesSyncService salesSyncService;
    private final GoogleSheetProperties props;
    private final SystemConfigService systemConfigService;

    private LocalDateTime lastRunTime;

    @Scheduled(fixedDelay = 60000) // Kiểm tra mỗi phút
    public void runDynamicSchedule() {
        boolean enabled = Boolean.parseBoolean(
                systemConfigService.getConfig("GSHEET_SYNC_ENABLED", String.valueOf(props.isEnabled())));

        if (!enabled) {
            return;
        }

        int intervalMinutes = 15;
        try {
            intervalMinutes = Integer.parseInt(
                    systemConfigService.getConfig("GSHEET_SYNC_INTERVAL_MINUTES", "15"));
        } catch (Exception ignored) {}

        if (intervalMinutes <= 0) {
            return; // 0 hoặc âm coi như tạm dừng
        }

        LocalDateTime now = LocalDateTime.now();
        if (lastRunTime != null && Duration.between(lastRunTime, now).toSeconds() < (intervalMinutes * 60L - 5L)) {
            return; // Chưa đến chu kỳ
        }

        try {
            log.info("[GSHEET] Bắt đầu lượt đồng bộ tự động theo chu kỳ {} phút", intervalMinutes);
            SyncRun run = salesSyncService.syncSalesWindow(now.minusDays(30), now, "AUTO_" + intervalMinutes + "M");
            lastRunTime = now;
            log.info("[GSHEET] Hoàn thành lượt tự động {}: {}", run.getSyncRunId(), run.getRunStatus());
        } catch (IllegalStateException e) {
            log.warn("[GSHEET] Bỏ qua lượt tự động: {}", e.getMessage());
        } catch (Exception e) {
            log.error("[GSHEET] Lỗi trong lượt đồng bộ tự động", e);
        }
    }
}
