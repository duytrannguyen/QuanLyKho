package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.sync.SyncRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SyncRunRepository extends JpaRepository<SyncRun, Long> {
    Optional<SyncRun> findBySyncRunId(String syncRunId);
    Optional<SyncRun> findTopByOrderByStartedAtDesc();
}
