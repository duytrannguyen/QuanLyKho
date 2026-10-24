package com.qkshop.tonkho.sync;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.issue.DataIssue;




import com.qkshop.tonkho.catalog.ModelLine;
import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.intake.IntakeService;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.machine.dto.MachineImportRequest;
import com.qkshop.tonkho.sale.SalesConfig;

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
    private final IntakeService intakeService;

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
            // Kiểm tra xem serial đã được nhập vào kho chưa (dùng truy vấn có index)
            String serial = issue.getEntityId();
            boolean found = activeInventoryRepo.findBySerialKey(serial).isPresent() ||
                            !closedCycleRepo.findBySerialKeyOrderByClosedAtDesc(serial).isEmpty();
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
        return dataIssueRepo.save(issue);
    }

    @Transactional
    public DataIssue approveReturn(String issueId, String actor, String note) {
        DataIssue issue = dataIssueRepo.findByIssueId(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy DataIssue với ID: " + issueId));

        if (issue.getStatus() == IssueStatus.RESOLVED) {
            return issue;
        }

        String serial = issue.getEntityId();
        if (activeInventoryRepo.existsBySerialKey(serial)) {
            throw new IllegalStateException("Máy " + serial + " hiện đã có trong kho ở trạng thái hoạt động!");
        }

        ClosedCycle cc = closedCycleRepo.findBySerialKeyOrderByClosedAtDesc(serial).stream()
                .filter(c -> c.getCloseType() == CloseType.SALE)
                .findFirst()
                .orElse(null);

        String brandName = "KHÁC";
        String productLine = "Chưa phân loại";
        String modelFull = "Laptop";
        String ram = "Chưa rõ";
        String ssd = "Chưa rõ";
        String cpu = "";
        String gpu = "";
        String screenSize = "";
        String touchscreen = "KHÔNG";

        if (cc != null) {
            if (cc.getSourceModelText() != null && !cc.getSourceModelText().isBlank()) {
                modelFull = cc.getSourceModelText();
            }
            if (cc.getConfig() != null) {
                SalesConfig cfg = cc.getConfig();
                if (cfg.getRamCode() != null && !cfg.getRamCode().isBlank()) ram = cfg.getRamCode();
                if (cfg.getSsdCode() != null && !cfg.getSsdCode().isBlank()) ssd = cfg.getSsdCode();
                if (cfg.getVariant() != null) {
                    VariantV2 v = cfg.getVariant();
                    if (v.getCpuCode() != null) cpu = v.getCpuCode();
                    if (v.getGpuCode() != null) gpu = v.getGpuCode();
                    if (v.getScreenSize() != null) screenSize = v.getScreenSize();
                    touchscreen = "YES".equalsIgnoreCase(v.getTouchFlag()) ? "CÓ" : "KHÔNG";
                    if (v.getPlatform() != null && v.getPlatform().getModelLine() != null) {
                        ModelLine ml = v.getPlatform().getModelLine();
                        if (ml.getModelLineName() != null && !ml.getModelLineName().isBlank()) productLine = ml.getModelLineName();
                        if (ml.getBrand() != null && ml.getBrand().getBrandName() != null) brandName = ml.getBrand().getBrandName();
                    }
                }
            }
        }

        MachineImportRequest req = MachineImportRequest.builder()
                .serial(serial)
                .importType("KHÁCH ĐỔI/TRẢ")
                .initialStatus("CHỜ KIỂM TRA")
                .brand(brandName)
                .productLine(productLine)
                .modelFull(modelFull)
                .cpu(cpu)
                .gpu(gpu)
                .ram(ram)
                .ssd(ssd)
                .screenSize(screenSize)
                .touchscreen(touchscreen)
                .notes("Nhập lại kho từ đơn hủy/trả " + issue.getSourceReference() + (note != null && !note.isBlank() ? " | " + note : ""))
                .build();

        String requestId = "RETURN-" + System.currentTimeMillis() + "-" + serial;
        ActiveInventory newInv = intakeService.createInventoryCycle(req, requestId, actor != null ? actor : "ADMIN");

        // Cập nhật returnCycleId trong SalesSyncLedger nếu có
        for (SalesSyncLedger ledger : ledgerRepo.findBySerialKey(serial)) {
            if (ledger.getReturnCycleId() == null) {
                ledger.setReturnCycleId(newInv.getCycleId());
                ledgerRepo.save(ledger);
            }
        }

        issue.setStatus(IssueStatus.RESOLVED);
        issue.setResolvedAt(LocalDateTime.now());
        issue.setMessage(issue.getMessage() + "\n[ĐÃ NHẬP KHO LẠI]: Vòng tồn mới " + newInv.getCycleId() + " (Chờ kiểm tra đầu vào)");
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

    @Transactional
    public int resolveIssuesByType(String issueType, String note) {
        java.util.List<IssueStatus> activeStatuses = java.util.List.of(
                IssueStatus.OPEN,
                IssueStatus.IN_REVIEW,
                IssueStatus.FIXED_WAIT_RESCAN
        );
        java.util.List<DataIssue> list;
        if (issueType != null && !issueType.isBlank() && !"ALL".equalsIgnoreCase(issueType)) {
            list = dataIssueRepo.findByIssueType(issueType).stream()
                    .filter(i -> activeStatuses.contains(i.getStatus()))
                    .toList();
        } else {
            list = dataIssueRepo.findByStatusIn(activeStatuses);
        }
        for (DataIssue issue : list) {
            issue.setStatus(IssueStatus.RESOLVED);
            issue.setResolvedAt(LocalDateTime.now());
            issue.setMessage(issue.getMessage() + "\n(Đã đóng hàng loạt: " + (note != null ? note : "Người dùng đóng") + ")");
        }
        dataIssueRepo.saveAll(list);
        return list.size();
    }
}
