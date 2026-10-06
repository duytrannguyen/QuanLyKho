package com.qkshop.tonkho.log;

import com.qkshop.tonkho.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    /**
     * Ghi nhật ký hoạt động (không đồng bộ, không block luồng chính).
     * Không còn phụ thuộc Machine (V1).
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String serial, Object unused, User user, String details) {
        try {
            ActivityLog entry = ActivityLog.builder()
                    .action(action)
                    .serial(serial)
                    .user(user)
                    .status("Hoàn thành")
                    .details(details)
                    .build();
            activityLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write activity log: action={}, serial={}", action, serial, e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String serial, Object unused, User user, String status, String details) {
        try {
            ActivityLog entry = ActivityLog.builder()
                    .action(action)
                    .serial(serial)
                    .user(user)
                    .status(status)
                    .details(details)
                    .build();
            activityLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write activity log: action={}, serial={}", action, serial, e);
        }
    }

    public Page<ActivityLog> getLogs(Pageable pageable) {
        return activityLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<ActivityLog> getFilteredLogs(LocalDateTime from, LocalDateTime to,
                                              Long userId, String serial, Pageable pageable) {
        return activityLogRepository.findFiltered(from, to, userId, serial, pageable);
    }
}
