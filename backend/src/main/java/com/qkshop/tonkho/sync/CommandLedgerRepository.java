package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.sync.CommandLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommandLedgerRepository extends JpaRepository<CommandLedger, Long> {
    Optional<CommandLedger> findByRequestId(String requestId);
    boolean existsByRequestId(String requestId);
}
