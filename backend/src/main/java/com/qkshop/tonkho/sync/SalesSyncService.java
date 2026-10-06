package com.qkshop.tonkho.sync;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.issue.IssueSeverity;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ActiveInventory;




import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesSyncService {

    private final SyncRunRepository syncRunRepo;
    private final SalesSyncLedgerRepository ledgerRepo;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final DataIssueRepository dataIssueRepo;

    /**
     * Chạy đồng bộ bán hàng giả lập (Mocking DataSale).
     */
    @Transactional
    public SyncRun syncSalesWindow(LocalDateTime from, LocalDateTime to, String runMode) {
        String syncRunId = "SYNC-" + System.currentTimeMillis();
        
        SyncRun run = SyncRun.builder()
                .syncRunId(syncRunId)
                .windowFrom(from)
                .windowTo(to)
                .runMode(runMode)
                .startedAt(LocalDateTime.now())
                .runStatus("RUNNING")
                .build();
        run = syncRunRepo.save(run);

        try {
            // Mock DataSale Transactions
            // In a real scenario, this would call KiotViet/Nhanh.vn API
            List<Map<String, String>> mockTransactions = getMockDataSaleTransactions();
            
            run.setRowsRead(mockTransactions.size());
            int valid = 0, processed = 0, skipped = 0, error = 0;

            for (Map<String, String> txn : mockTransactions) {
                try {
                    boolean isOk = processTransaction(txn, syncRunId);
                    if (isOk) processed++; else skipped++;
                    valid++;
                } catch (Exception e) {
                    log.error("Error processing transaction {}", txn.get("transactionId"), e);
                    error++;
                    recordDataIssue("SYNC_PROCESSING_ERROR", "Transaction", txn.get("transactionId"), e.getMessage(), "Kiểm tra log hệ thống");
                }
            }

            run.setRowsValid(valid);
            run.setRowsProcessed(processed);
            run.setRowsSkipped(skipped);
            run.setRowsError(error);
            run.setRunStatus("COMPLETED");

        } catch (Exception e) {
            log.error("Sync run failed", e);
            run.setRunStatus("FAILED");
            run.setErrorMessage(e.getMessage());
        } finally {
            run.setFinishedAt(LocalDateTime.now());
            syncRunRepo.save(run);
        }

        return run;
    }

    private boolean processTransaction(Map<String, String> txn, String syncRunId) {
        String txnId = txn.get("transactionId");
        String serialKey = txn.get("serialKey");
        String status = txn.get("status");

        Optional<SalesSyncLedger> existingLedgerOpt = ledgerRepo.findByTransactionId(txnId);
        SalesSyncLedger ledger = existingLedgerOpt.orElseGet(() -> SalesSyncLedger.builder()
                .transactionId(txnId)
                .sourceRowKey(txnId)
                .sourceStatus(status)
                .sourceRevisionHash(String.valueOf(txn.hashCode()))
                .serialKey(serialKey)
                .serialSource("DATASALE")
                .build());

        ledger.setLastSyncRunId(syncRunId);
        ledger.setLastSeenAt(LocalDateTime.now());

        // Đối chiếu với kho
        Optional<ActiveInventory> activeOpt = activeInventoryRepo.findBySerialKey(serialKey);
        
        if (activeOpt.isPresent()) {
            ActiveInventory ai = activeOpt.get();
            if (ai.getState() == CycleState.READY) {
                // Đã bán trên DataSale nhưng kho vẫn READY -> Lỗi lệch kho
                ledger.setSyncState(SyncState.ERROR);
                recordDataIssue(
                        "MISSING_SALE_RECORD",
                        "ActiveInventory",
                        ai.getCycleId(),
                        "Máy " + serialKey + " đã bán trên DataSale (Txn: " + txnId + ") nhưng vẫn ở trạng thái Sẵn sàng trong kho.",
                        "Chốt bán thủ công trong kho hoặc xác minh lại hóa đơn."
                );
            } else if (ai.getState() == CycleState.NEEDS_INSPECTION) {
                ledger.setSyncState(SyncState.ERROR);
                recordDataIssue(
                        "SOLD_WHILE_INSPECTING",
                        "ActiveInventory",
                        ai.getCycleId(),
                        "Máy " + serialKey + " đã bán trên DataSale (Txn: " + txnId + ") nhưng đang được kiểm tra trong kho.",
                        "Yêu cầu hủy giao dịch bán hoặc duyệt nhanh máy."
                );
            }
        } else {
            // Máy không ở trạng thái Active. Có thể đã CLOSED.
            // Kiểm tra ClosedCycle
            boolean isClosed = closedCycleRepo.findAll().stream()
                    .anyMatch(c -> c.getSerialKey().equals(serialKey) && c.getCloseType() == CloseType.SALE);
            
            if (isClosed) {
                ledger.setSyncState(SyncState.MATCHED);
                // Nếu trước đây có lỗi, sẽ tự đóng nếu gọi logic recheck.
            } else {
                // Không thấy ở đâu cả
                ledger.setSyncState(SyncState.ERROR);
                recordDataIssue(
                        "UNKNOWN_SERIAL_SOLD",
                        "Serial",
                        serialKey,
                        "Serial " + serialKey + " được bán (Txn: " + txnId + ") nhưng không tồn tại trong hệ thống kho.",
                        "Nhập bổ sung máy vào kho hoặc sửa lại serial trên hóa đơn bán."
                );
            }
        }

        ledgerRepo.save(ledger);
        return ledger.getSyncState() == SyncState.MATCHED;
    }

    private void recordDataIssue(String issueType, String entityType, String entityId, String message, String suggestedAction) {
        String fingerprint = issueType + "_" + entityId;
        Optional<DataIssue> existingOpt = dataIssueRepo.findByIssueFingerprint(fingerprint);
        
        if (existingOpt.isPresent()) {
            DataIssue existing = existingOpt.get();
            existing.setLastSeenAt(LocalDateTime.now());
            existing.setAttemptCount(existing.getAttemptCount() + 1);
            if (existing.getStatus() == IssueStatus.RESOLVED) {
                // Lỗi tái phát
                existing.setStatus(IssueStatus.OPEN);
                existing.setMessage(message + " (Tái phát)");
            }
            dataIssueRepo.save(existing);
        } else {
            DataIssue issue = DataIssue.builder()
                    .issueId("ISSUE-" + System.currentTimeMillis())
                    .issueFingerprint(fingerprint)
                    .issueType(issueType)
                    .entityType(entityType)
                    .entityId(entityId)
                    .severity(IssueSeverity.HIGH)
                    .status(IssueStatus.OPEN)
                    .message(message)
                    .suggestedAction(suggestedAction)
                    .build();
            dataIssueRepo.save(issue);
        }
    }

    private List<Map<String, String>> getMockDataSaleTransactions() {
        // Trả về vài giao dịch mock để test
        List<Map<String, String>> list = new ArrayList<>();
        list.add(Map.of("transactionId", "TXN-001", "serialKey", "5CG1512PZX", "status", "COMPLETED"));
        // Giả sử 1 serial bị lệch:
        list.add(Map.of("transactionId", "TXN-002", "serialKey", "MOCK-SERIAL-ERR", "status", "COMPLETED"));
        return list;
    }
}
