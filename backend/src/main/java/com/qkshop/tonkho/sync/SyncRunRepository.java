package com.qkshop.tonkho.sync;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SyncRunRepository extends JpaRepository<SyncRun, Long> {
    Optional<SyncRun> findBySyncRunId(String syncRunId);
    Optional<SyncRun> findTopByOrderByStartedAtDesc();
    List<SyncRun> findTop5ByOrderByStartedAtDesc();
    List<SyncRun> findTop50ByOrderByStartedAtDesc();
}
