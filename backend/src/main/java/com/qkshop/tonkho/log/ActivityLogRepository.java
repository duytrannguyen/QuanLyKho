package com.qkshop.tonkho.log;

import com.qkshop.tonkho.log.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT a FROM ActivityLog a WHERE " +
           "(:from IS NULL OR a.createdAt >= :from) " +
           "AND (:to IS NULL OR a.createdAt <= :to) " +
           "AND (:userId IS NULL OR a.user.id = :userId) " +
           "AND (:serial IS NULL OR a.serial = :serial) " +
           "ORDER BY a.createdAt DESC")
    Page<ActivityLog> findFiltered(@Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to,
                                   @Param("userId") Long userId,
                                   @Param("serial") String serial,
                                   Pageable pageable);

    List<ActivityLog> findTop20ByOrderByCreatedAtDesc();
}
