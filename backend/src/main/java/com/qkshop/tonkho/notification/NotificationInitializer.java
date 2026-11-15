package com.qkshop.tonkho.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Khởi tạo dữ liệu thông báo mẫu dựa trên lịch sử đồng bộ thực tế nếu hệ thống chưa có thông báo nào.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationInitializer implements ApplicationRunner {

    private final NotificationRepository notificationRepository;

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (notificationRepository.count() == 0) {
                log.info("[NOTIFICATION] Khởi tạo thông báo chào mừng hệ thống...");
                notificationRepository.save(AppNotification.builder()
                        .title("Chào mừng đến với Hệ Thống Quản Lý Kho QKShop")
                        .message("Hệ thống thông báo thời gian thực và đồng bộ dữ liệu kho đã sẵn sàng hoạt động.")
                        .type("SYSTEM")
                        .link("/")
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build());
            }
        } catch (Exception e) {
            log.warn("[NOTIFICATION] Không thể khởi tạo thông báo mẫu: {}", e.getMessage());
        }
    }
}
