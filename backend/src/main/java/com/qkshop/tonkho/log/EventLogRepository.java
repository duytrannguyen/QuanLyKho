package com.qkshop.tonkho.log;

import com.qkshop.tonkho.log.EventLog;
import com.qkshop.tonkho.core.enums.EventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EventLogRepository extends JpaRepository<EventLog, Long> {
    Optional<EventLog> findByEventId(String eventId);
    Optional<EventLog> findByIdempotencyKey(String idempotencyKey);
    boolean existsByIdempotencyKey(String idempotencyKey);

    List<EventLog> findBySerialKey(String serialKey);
    List<EventLog> findByCycleId(String cycleId);
    List<EventLog> findByEventType(EventType eventType);

    Page<EventLog> findAllByOrderByEventAtDesc(Pageable pageable);
    Page<EventLog> findBySerialKeyOrderByEventAtDesc(String serialKey, Pageable pageable);
    Page<EventLog> findByActorOrderByEventAtDesc(String actor, Pageable pageable);

    List<EventLog> findByEventAtBetweenOrderByEventAtDesc(LocalDateTime from, LocalDateTime to);
}
