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
import com.qkshop.tonkho.salesreport.SalesOrder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Optional;

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
    private final com.qkshop.tonkho.salesreport.SalesOrderRepository salesOrderRepo;

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
            boolean inActive = activeInventoryRepo.findByCycleId(issue.getEntityId()).isPresent();
            if (!inActive) {
                isResolved = true;
            }
        } else if ("UNKNOWN_SERIAL_SOLD".equals(issue.getIssueType())) {
            String serial = issue.getEntityId();
            boolean found = activeInventoryRepo.findBySerialKey(serial).isPresent() ||
                            !closedCycleRepo.findBySerialKeyOrderByClosedAtDesc(serial).isEmpty();
            if (found) {
                isResolved = true;
            }
        } else {
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

        ClosedCycle cc = closedCycleRepo.findTopBySerialKeyOrderByClosedAtDesc(serial)
                .orElseGet(() -> closedCycleRepo.findBySerialKeyOrderByClosedAtDesc(serial).stream()
                        .filter(c -> c.getCloseType() == CloseType.SALE)
                        .findFirst()
                        .orElse(null));

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

        // Cập nhật chu kỳ đóng cũ thành CUSTOMER_RETURN
        if (cc != null) {
            cc.setCloseType(CloseType.CUSTOMER_RETURN);
            cc.setCloseReason("Khách trả máy - duyệt nhập lại kho với chu kỳ " + newInv.getCycleId());
            closedCycleRepo.save(cc);
        }

        // Đồng bộ sổ cái SalesOrder của đúng chu kỳ vừa trả (không xóa/ghi đè lịch sử các vòng bán trước đó)
        try {
            Optional<SalesOrder> targetOrderOpt = Optional.empty();
            if (cc != null && cc.getCycleId() != null) {
                targetOrderOpt = salesOrderRepo.findByMatchedCycleId(cc.getCycleId());
            }
            if (targetOrderOpt.isEmpty()) {
                targetOrderOpt = salesOrderRepo.findBySerialKeysContaining(serial).stream()
                        .filter(s -> s.getOrderCategory() == null || "MACHINE".equalsIgnoreCase(s.getOrderCategory()))
                        .max(Comparator.comparing(
                                (SalesOrder s) -> s.getSaleDate() != null ? s.getSaleDate() : LocalDateTime.MIN)
                                .thenComparing(s -> s.getId() != null ? s.getId() : 0L));
            }

            targetOrderOpt.ifPresent(so -> {
                so.setOrderStatus("Trả hàng");
                so.setNetRevenue(BigDecimal.ZERO);
                so.setNote((so.getNote() != null ? so.getNote() + " | " : "") + "Khách trả máy - nhập lại kho " + newInv.getCycleId());
                salesOrderRepo.save(so);
            });

            if (cc != null && cc.getCycleId() != null) {
                String pkKemTxnId = "PK-KEM-" + cc.getCycleId().replace("CYC-", "");
                salesOrderRepo.findByTransactionId(pkKemTxnId).ifPresent(accSo -> {
                    accSo.setOrderStatus("Trả hàng");
                    accSo.setNetRevenue(BigDecimal.ZERO);
                    accSo.setNote((accSo.getNote() != null ? accSo.getNote() + " | " : "") + "Khách trả máy kèm phụ kiện - nhập lại kho " + newInv.getCycleId());
                    salesOrderRepo.save(accSo);
                });
            }
        } catch (Exception e) {
            log.warn("Không thể cập nhật SalesOrder khi duyệt trả máy {}: {}", serial, e.getMessage());
        }

        issue.setStatus(IssueStatus.RESOLVED);
        issue.setResolvedAt(LocalDateTime.now());
        issue.setMessage(issue.getMessage() + "\n[ĐÃ NHẬP KHO LẠI]: Vòng tồn mới " + newInv.getCycleId() + " (Chờ kiểm tra đầu vào)");
        return dataIssueRepo.save(issue);
    }

    @Transactional(readOnly = true)
    public java.util.List<DataIssue> getAllOpenIssues() {
        return dataIssueRepo.findByStatusIn(java.util.List.of(IssueStatus.OPEN, IssueStatus.IN_REVIEW, IssueStatus.FIXED_WAIT_RESCAN));
    }

    @Transactional(readOnly = true)
    public java.util.List<SyncRun> getRecentSyncRuns() {
        return syncRunRepo.findTop50ByOrderByStartedAtDesc();
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
