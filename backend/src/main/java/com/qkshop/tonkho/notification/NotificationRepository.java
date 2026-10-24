package com.qkshop.tonkho.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findTop50ByOrderByCreatedAtDesc();

    List<AppNotification> findByIsReadFalseOrderByCreatedAtDesc();

    long countByIsReadFalse();

    @Modifying
    @Query("UPDATE AppNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.isRead = false")
    int markAllAsRead();

    @Modifying
    @Query("DELETE FROM AppNotification n WHERE n.isRead = true")
    int deleteAllRead();
}
