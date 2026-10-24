package com.qkshop.tonkho.notification;

import com.qkshop.tonkho.sync.SyncRun;
import com.qkshop.tonkho.sync.SyncRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Khởi tạo dữ liệu thông báo mẫu dựa trên lịch sử đồng bộ thực tế nếu hệ thống chưa có thông báo nào.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationInitializer implements ApplicationRunner {

    private final NotificationRepository notificationRepository;
    private final SyncRunRepository syncRunRepository;

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (notificationRepository.count() == 0) {
                log.info("[NOTIFICATION] Khởi tạo dữ liệu thông báo từ các lượt đồng bộ gần nhất...");

                List<SyncRun> recentRuns = syncRunRepository.findAll().stream()
                        .sorted((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()))
                        .limit(5)
                        .toList();

                if (!recentRuns.isEmpty()) {
                    for (SyncRun run : recentRuns) {
                        String type = "SYNC_INFO";
                        String title = "Đồng bộ Google Sheet";
                        String msg;

                        if ("COMPLETED".equals(run.getRunStatus())) {
                            if (run.getRowsError() > 0) {
                                type = "SYNC_ERROR";
                                title = "Cảnh báo sai lệch Google Sheet";
                                msg = String.format("Lượt %s: Xuất kho %d máy, phát hiện %d lỗi sai lệch / đơn hủy cần đối soát.",
                                        run.getSyncRunId(), run.getRowsProcessed(), run.getRowsError());
                            } else if (run.getRowsProcessed() > 0) {
                                type = "SYNC_SUCCESS";
                                title = "Đồng bộ Google Sheet thành công";
                                msg = String.format("Lượt %s: Đã xuất kho %d máy thành công từ Google Sheet.",
                                        run.getSyncRunId(), run.getRowsProcessed());
                            } else {
                                type = "SYNC_INFO";
                                title = "Đồng bộ Google Sheet hoàn tất";
                                msg = String.format("Lượt %s: Kho hàng đã khớp với Google Sheet (0 máy thay đổi).",
                                        run.getSyncRunId());
                            }
                        } else {
                            type = "SYNC_ERROR";
                            title = "Đồng bộ Google Sheet thất bại";
                            msg = String.format("Lượt %s thất bại: %s",
                                    run.getSyncRunId(), run.getErrorMessage() != null ? run.getErrorMessage() : "Lỗi hệ thống");
                        }

                        notificationRepository.save(AppNotification.builder()
                                .title(title)
                                .message(msg)
                                .type(type)
                                .link("/doi-soat")
                                .isRead(false)
                                .createdAt(run.getFinishedAt() != null ? run.getFinishedAt() : run.getStartedAt())
                                .build());
                    }
                } else {
                    // Tạo thông báo chào mừng hệ thống
                    notificationRepository.save(AppNotification.builder()
                            .title("Chào mừng đến với Hệ Thống Quản Lý Kho QKShop")
                            .message("Hệ thống thông báo thời gian thực và đồng bộ dữ liệu kho đã sẵn sàng hoạt động.")
                            .type("SYSTEM")
                            .link("/")
                            .isRead(false)
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("[NOTIFICATION] Không thể khởi tạo thông báo mẫu: {}", e.getMessage());
        }
    }
}
