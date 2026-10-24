package com.qkshop.tonkho.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Đăng ký nhận thông báo thời gian thực qua Server-Sent Events (SSE).
     */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 giờ
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError((e) -> {
            emitter.complete();
            emitters.remove(emitter);
        });

        // Gửi thông điệp kết nối ban đầu
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Đã kết nối thành công đến luồng thông báo thời gian thực"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Gửi và lưu thông báo mới, đồng thời phát sóng tức thì tới các client đang kết nối.
     */
    @Transactional(rollbackFor = Exception.class)
    public AppNotification sendNotification(String title, String message, String type, String link) {
        AppNotification noti = AppNotification.builder()
                .title(title)
                .message(message)
                .type(type != null ? type : "INFO")
                .link(link)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        AppNotification saved = notificationRepository.save(noti);

        // Phát sóng thời gian thực qua SSE
        broadcast(saved);

        return saved;
    }

    private void broadcast(AppNotification noti) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("NOTIFICATION")
                        .data(noti));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<AppNotification> getNotifications(Boolean unreadOnly) {
        if (Boolean.TRUE.equals(unreadOnly)) {
            return notificationRepository.findByIsReadFalseOrderByCreatedAtDesc();
        }
        return notificationRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return notificationRepository.countByIsReadFalse();
    }

    @Transactional(rollbackFor = Exception.class)
    public AppNotification markAsRead(Long id) {
        AppNotification noti = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo ID: " + id));
        if (!Boolean.TRUE.equals(noti.getIsRead())) {
            noti.setIsRead(true);
            noti.setReadAt(LocalDateTime.now());
            noti = notificationRepository.save(noti);
        }
        return noti;
    }

    @Transactional(rollbackFor = Exception.class)
    public int markAllAsRead() {
        return notificationRepository.markAllAsRead();
    }

    /**
     * Xóa thông báo: Theo yêu cầu nghiệp vụ, chỉ cho phép xóa thông báo ĐÃ ĐỌC.
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteNotification(Long id) {
        AppNotification noti = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo ID: " + id));

        if (!Boolean.TRUE.equals(noti.getIsRead())) {
            throw new IllegalArgumentException("Chỉ có thể xóa thông báo đã đọc. Vui lòng đánh dấu đã đọc trước khi xóa.");
        }

        notificationRepository.delete(noti);
    }

    /**
     * Dọn sạch tất cả thông báo đã đọc.
     */
    @Transactional(rollbackFor = Exception.class)
    public int deleteAllRead() {
        return notificationRepository.deleteAllRead();
    }
}
