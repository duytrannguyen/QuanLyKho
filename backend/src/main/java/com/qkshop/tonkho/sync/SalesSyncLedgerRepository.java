package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.sync.SalesSyncLedger;
import com.qkshop.tonkho.sync.SyncState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SalesSyncLedgerRepository extends JpaRepository<SalesSyncLedger, Long> {
    Optional<SalesSyncLedger> findByTransactionId(String transactionId);
    boolean existsByTransactionId(String transactionId);
    List<SalesSyncLedger> findBySyncState(SyncState syncState);
    List<SalesSyncLedger> findBySerialKey(String serialKey);
    long countBySyncState(SyncState syncState);
}
