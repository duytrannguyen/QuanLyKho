package com.qkshop.tonkho.sync;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.issue.DataIssue;




import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private final DataIssueRepository dataIssueRepo;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final SalesSyncLedgerRepository ledgerRepo;
    private final SyncRunRepository syncRunRepo;

    @Transactional
    public DataIssue recheckIssue(String issueId) {
        DataIssue issue = dataIssueRepo.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy DataIssue với ID: " + issueId));
        
        if (issue.getStatus() == IssueStatus.RESOLVED || issue.getStatus() == IssueStatus.ACCEPTED_EXCEPTION) {
            return issue; // Already resolved
        }

        boolean isResolved = false;

        // Logic kiểm tra lại tùy theo loại lỗi
        if ("MISSING_SALE_RECORD".equals(issue.getIssueType()) || "SOLD_WHILE_INSPECTING".equals(issue.getIssueType())) {
            // Kiểm tra xem máy đã được đóng (bán) chưa
            // issue.getEntityId() đang chứa cycleId
            boolean inActive = activeInventoryRepo.findByCycleId(issue.getEntityId()).isPresent();
            if (!inActive) {
                // Đã không còn trong kho -> có thể đã đóng
                isResolved = true;
            }
        } else if ("UNKNOWN_SERIAL_SOLD".equals(issue.getIssueType())) {
            // Kiểm tra xem serial đã được nhập vào kho chưa
            String serial = issue.getEntityId();
            boolean found = activeInventoryRepo.findBySerialKey(serial).isPresent() ||
                            closedCycleRepo.findAll().stream().anyMatch(c -> c.getSerialKey().equals(serial));
            if (found) {
                isResolved = true;
            }
        } else {
            // Các lỗi khác mặc định quét lại coi như đã fix (demo)
            isResolved = true;
        }

        if (isResolved) {
            issue.setStatus(IssueStatus.RESOLVED);
            issue.setResolvedAt(LocalDateTime.now());
            issue.setMessage(issue.getMessage() + "\n(Đã được khắc phục tự động sau khi quét lại)");
            dataIssueRepo.save(issue);
        }

        return issue;
    }

    @Transactional
    public DataIssue resolveIssueManual(String issueId, String note) {
        DataIssue issue = dataIssueRepo.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy DataIssue với ID: " + issueId));
        
        issue.setStatus(IssueStatus.ACCEPTED_EXCEPTION);
        issue.setResolvedAt(LocalDateTime.now());
        issue.setMessage(issue.getMessage() + "\n[ĐÓNG THỦ CÔNG]: " + note);
        
        return dataIssueRepo.save(issue);
    }

    public java.util.List<DataIssue> getAllOpenIssues() {
        return dataIssueRepo.findByStatusIn(java.util.List.of(IssueStatus.OPEN, IssueStatus.IN_REVIEW, IssueStatus.FIXED_WAIT_RESCAN));
    }
    
    public java.util.List<SyncRun> getRecentSyncRuns() {
        java.util.List<SyncRun> all = new java.util.ArrayList<>(syncRunRepo.findAll());
        all.sort((a,b) -> b.getStartedAt().compareTo(a.getStartedAt()));
        return all;
    }
}
