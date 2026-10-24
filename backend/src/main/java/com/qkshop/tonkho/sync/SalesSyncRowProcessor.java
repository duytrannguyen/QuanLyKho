package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.core.enums.CloseType;
import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.ActiveInventoryRepository;
import com.qkshop.tonkho.inventory.ClosedCycle;
import com.qkshop.tonkho.inventory.ClosedCycleRepository;
import com.qkshop.tonkho.inventory.CycleState;
import com.qkshop.tonkho.inventory.InventoryCycleService;
import com.qkshop.tonkho.issue.DataIssue;
import com.qkshop.tonkho.issue.DataIssueRepository;
import com.qkshop.tonkho.issue.IssueSeverity;
import com.qkshop.tonkho.issue.IssueStatus;
import com.qkshop.tonkho.sync.gsheet.GoogleSheetProperties;
import com.qkshop.tonkho.sync.gsheet.SheetRowParser;
import com.qkshop.tonkho.sync.gsheet.SheetSaleRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Xử lý 1 dòng bán hàng từ Google Sheet trong transaction riêng (REQUIRES_NEW):
 * Hỗ trợ 1 dòng nhiều Serial, đơn Hủy/Trả hàng tạo yêu cầu duyệt nhập kho,
 * và lưu đầy đủ 16 trường vào hệ thống.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SalesSyncRowProcessor {

    public static final String REQUEST_PREFIX = "GSHEET-";
    private static final String SERIAL_SOURCE = "GSHEET";
    private static final String DEFAULT_ACTOR = "GSHEET-SYNC";

    private final SalesSyncLedgerRepository ledgerRepo;
    private final ActiveInventoryRepository activeInventoryRepo;
    private final ClosedCycleRepository closedCycleRepo;
    private final DataIssueRepository dataIssueRepo;
    private final CommandLedgerRepository commandLedgerRepo;
    private final InventoryCycleService inventoryCycleService;
    private final GoogleSheetProperties props;
    private final com.qkshop.tonkho.system.SystemConfigService systemConfigService;

    /** Lấy ký hiệu đánh dấu hoàn tất động từ SystemConfig (mặc định từ props). */
    private String getDoneMarker() {
        if (systemConfigService != null) {
            String marker = systemConfigService.getConfig("GSHEET_DONE_MARKER", props.getDoneMarker());
            if (marker != null && !marker.isBlank()) return marker.trim();
        }
        return props.getDoneMarker();
    }

    /** Kết quả xử lý 1 dòng + nội dung sẽ ghi lại vào sheet. */
    public record RowOutcome(SyncState state, String sheetValue) {}

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public RowOutcome process(SheetSaleRow row, String syncRunId) {
        String txnId = row.transactionId();
        List<String> serials = row.getParsedSerials();

        if (txnId.isEmpty()) {
            return new RowOutcome(SyncState.ERROR, errorText("thiếu transaction_ID"));
        }

        // 1. Kiểm tra nếu đơn hàng ở trạng thái HỦY / TRẢ HÀNG
        if (isCancelledOrReturned(row.orderStatus())) {
            return handleCancelledOrReturnedOrder(row, serials, syncRunId);
        }

        // 2. Kiểm tra nếu đơn không phải trạng thái HOÀN TẤT
        if (!SheetRowParser.equalsLoose(row.orderStatus(), props.getCompletedStatus())) {
            return new RowOutcome(SyncState.SKIPPED, row.syncStatus());
        }

        if (serials.isEmpty()) {
            SalesSyncLedger ledger = getOrCreateLedger(txnId, null);
            return fail(ledger, row, syncRunId, "MISSING_SERIAL", "Transaction", txnId,
                    "Giao dịch " + txnId + " (dòng " + row.rowNumber() + ") đã Hoàn tất nhưng không có Serial.",
                    "Bổ sung Serial trên Google Sheet.", "thiếu Serial");
        }

        // 3. Phân bổ giá bán, giảm giá nếu một dòng có nhiều máy (Multi-Serial)
        int machineCount = serials.size();
        BigDecimal totalNet = parseMoney(row.netRevenue());
        BigDecimal totalGross = parseMoney(row.grossRevenue());
        BigDecimal totalDiscount = parseMoney(row.discount());

        BigDecimal netPerItem = totalNet != null ? totalNet.divide(new BigDecimal(machineCount), 0, RoundingMode.HALF_UP) : null;
        BigDecimal grossPerItem = totalGross != null ? totalGross.divide(new BigDecimal(machineCount), 0, RoundingMode.HALF_UP) : null;
        BigDecimal discountPerItem = totalDiscount != null ? totalDiscount.divide(new BigDecimal(machineCount), 0, RoundingMode.HALF_UP) : null;

        List<String> errors = new ArrayList<>();
        int successCount = 0;

        for (int i = 0; i < machineCount; i++) {
            String serial = serials.get(i);
            String subTxnId = machineCount == 1 ? txnId : (txnId + "#" + (i + 1));
            String subRequestId = machineCount == 1 ? (REQUEST_PREFIX + txnId) : (REQUEST_PREFIX + txnId + "-" + serial);

            try {
                RowOutcome singleOutcome = processSingleMachine(
                        row, subTxnId, serial, subRequestId, netPerItem, grossPerItem, discountPerItem, syncRunId);

                if (singleOutcome.state() == SyncState.MATCHED) {
                    successCount++;
                } else {
                    String reason = singleOutcome.sheetValue();
                    if (reason != null && reason.startsWith(props.getErrorPrefix())) {
                        reason = reason.substring(props.getErrorPrefix().length()).trim();
                    }
                    errors.add(serial + ": " + reason);
                }
            } catch (Exception e) {
                log.error("[GSHEET] Lỗi trừ kho máy {} thuộc đơn {}", serial, txnId, e);
                errors.add(serial + ": " + e.getMessage());
            }
        }

        if (successCount == machineCount) {
            return new RowOutcome(SyncState.MATCHED, getDoneMarker());
        } else if (successCount > 0) {
            return new RowOutcome(SyncState.ERROR, errorText("Đã trừ " + successCount + "/" + machineCount + " máy. Lỗi: " + String.join("; ", errors)));
        } else {
            return new RowOutcome(SyncState.ERROR, errorText(String.join("; ", errors)));
        }
    }

    private RowOutcome processSingleMachine(
            SheetSaleRow row,
            String subTxnId,
            String serial,
            String subRequestId,
            BigDecimal netPrice,
            BigDecimal grossPrice,
            BigDecimal discount,
            String syncRunId) {

        SalesSyncLedger ledger = getOrCreateLedger(subTxnId, serial);

        // Đã khớp trước đó
        if (ledger.getSyncState() == SyncState.MATCHED) {
            if (!Objects.equals(ledger.getSerialKey(), serial)) {
                return new RowOutcome(SyncState.ERROR, "Serial đã bị thay đổi (cũ: " + ledger.getSerialKey() + ", mới: " + serial + ")");
            }
            touch(ledger, row, syncRunId);
            return new RowOutcome(SyncState.MATCHED, getDoneMarker());
        }

        // Kiểm tra serial có bị trùng bán ở giao dịch khác không
        for (SalesSyncLedger other : ledgerRepo.findBySerialKey(serial)) {
            if (!other.getTransactionId().equals(subTxnId) && other.getSyncState() == SyncState.MATCHED
                    && other.getReturnCycleId() == null) {
                return fail(ledger, row, syncRunId, "DUPLICATE_SERIAL_SALE", "Transaction", subTxnId,
                        "Serial " + serial + " đã được trừ kho bởi giao dịch " + other.getTransactionId()
                                + ", nay lại xuất hiện ở giao dịch " + row.transactionId() + ".",
                        "Kiểm tra lại đơn trùng hoặc sai serial trên sheet.",
                        "serial đã xuất kho ở giao dịch " + other.getTransactionId());
            }
        }

        // Đã submit trước đó (Idempotency)
        if (commandLedgerRepo.existsByRequestId(subRequestId)) {
            ClosedCycle cc = latestSale(serial);
            return matched(ledger, row, syncRunId, cc);
        }

        Optional<ActiveInventory> activeOpt = activeInventoryRepo.findBySerialKey(serial);
        if (activeOpt.isPresent()) {
            ActiveInventory ai = activeOpt.get();
            if (ai.getState() == CycleState.READY) {
                BigDecimal finalPrice = netPrice != null ? netPrice : (ai.getSalePrice() != null ? ai.getSalePrice() : BigDecimal.ZERO);
                String actor = row.salesperson().isEmpty() ? DEFAULT_ACTOR : row.salesperson();

                Map<String, Object> saleDetails = buildSaleDetails(row, grossPrice, discount);
                ClosedCycle closed = inventoryCycleService.submitSale(subRequestId, serial, finalPrice, actor, saleDetails);
                log.info("[GSHEET] Đã trừ kho máy {} theo đơn {} (dòng {})", serial, subTxnId, row.rowNumber());
                return matched(ledger, row, syncRunId, closed);
            }
            return fail(ledger, row, syncRunId, "SOLD_WHILE_INSPECTING", "ActiveInventory", ai.getCycleId(),
                    "Máy " + serial + " đã bán trên Google Sheet (Txn: " + row.transactionId() + ") nhưng trong kho đang ở trạng thái "
                            + ai.getState() + ".",
                    "Duyệt nhanh máy về Sẵn sàng, đồng bộ sẽ tự trừ kho ở lượt sau.",
                    "máy đang ở trạng thái " + ai.getState() + ", chưa trừ kho");
        }

        // Máy không ở trong kho: Đã bán thủ công trước đó?
        ClosedCycle cc = latestSale(serial);
        if (cc != null) {
            return matched(ledger, row, syncRunId, cc);
        }

        return fail(ledger, row, syncRunId, "UNKNOWN_SERIAL_SOLD", "Serial", serial,
                "Serial " + serial + " được bán (Txn: " + row.transactionId() + ") nhưng không tồn tại trong hệ thống kho.",
                "Nhập bổ sung máy vào kho hoặc sửa lại serial trên Google Sheet.",
                "serial không có trong kho");
    }

    /**
     * Xử lý khi đơn hàng bị HỦY hoặc TRẢ HÀNG trên Sheet:
     * Tạo thông báo yêu cầu xác nhận trước khi nhập kho.
     */
    private RowOutcome handleCancelledOrReturnedOrder(SheetSaleRow row, List<String> serials, String syncRunId) {
        String txnId = row.transactionId();
        int pendingCount = 0;

        for (String serial : serials) {
            // Kiểm tra máy này đã từng được chốt bán chưa
            boolean hasSoldLedger = ledgerRepo.findBySerialKey(serial).stream()
                    .anyMatch(l -> l.getSyncState() == SyncState.MATCHED);
            boolean isClosedSale = latestSale(serial) != null;

            // Kiểm tra xem máy đã được hoàn lại kho chưa
            boolean alreadyReturned = ledgerRepo.findBySerialKey(serial).stream()
                    .anyMatch(l -> l.getReturnCycleId() != null)
                    || activeInventoryRepo.existsBySerialKey(serial);

            if ((hasSoldLedger || isClosedSale) && !alreadyReturned) {
                // Tạo DataIssue để thủ kho xác nhận
                String message = String.format("Đơn hàng %s (Serial: %s, Khách: %s) đã bị HỦY/TRẢ HÀNG trên Google Sheet. Cần thủ kho xác nhận kiểm tra và nhập lại kho.",
                        txnId, serial, row.customerName().isEmpty() ? "Không rõ" : row.customerName());
                String action = "Kiểm tra máy thực tế và bấm [Xác nhận nhập lại kho] để đưa máy về kiểm tra đầu vào.";

                recordDataIssue("ORDER_CANCELLED_PENDING_RETURN", "Serial", serial, txnId, message, action);
                pendingCount++;
            }
        }

        if (pendingCount > 0) {
            return new RowOutcome(SyncState.SKIPPED, "Chờ duyệt hoàn kho (" + pendingCount + " máy)");
        }
        return new RowOutcome(SyncState.SKIPPED, "Đã hủy/hoàn tất");
    }

    private SalesSyncLedger getOrCreateLedger(String subTxnId, String serial) {
        return ledgerRepo.findByTransactionId(subTxnId).orElseGet(() -> SalesSyncLedger.builder()
                .transactionId(subTxnId)
                .sourceRowKey(subTxnId)
                .serialSource(SERIAL_SOURCE)
                .serialKey(serial)
                .build());
    }

    /** Ghi nhận lỗi bất ngờ (exception) cho 1 dòng, trong transaction riêng. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public RowOutcome recordFailure(SheetSaleRow row, String syncRunId, String message) {
        String txnId = row.transactionId();
        if (txnId.isEmpty()) return new RowOutcome(SyncState.ERROR, errorText(message));
        SalesSyncLedger ledger = getOrCreateLedger(txnId, row.serial());
        if (ledger.getSyncState() == SyncState.MATCHED) {
            return new RowOutcome(SyncState.MATCHED, getDoneMarker());
        }
        return fail(ledger, row, syncRunId, "SYNC_PROCESSING_ERROR", "Transaction", txnId,
                "Lỗi xử lý giao dịch " + txnId + " (serial " + row.serial() + "): " + message,
                "Kiểm tra log hệ thống / trạng thái máy.", message);
    }

    private RowOutcome matched(SalesSyncLedger ledger, SheetSaleRow row, String runId, ClosedCycle cc) {
        if (cc != null) {
            ledger.setMatchedCycleId(cc.getCycleId());
            ledger.setSaleEventId(cc.getCloseEventId());
        }
        ledger.setSyncState(SyncState.MATCHED);
        touch(ledger, row, runId);
        return new RowOutcome(SyncState.MATCHED, getDoneMarker());
    }

    private RowOutcome fail(SalesSyncLedger ledger, SheetSaleRow row, String runId,
                            String issueType, String entityType, String entityId,
                            String message, String action, String sheetReason) {
        ledger.setSyncState(SyncState.ERROR);
        touch(ledger, row, runId);
        recordDataIssue(issueType, entityType, entityId, row.transactionId(), message, action);
        return new RowOutcome(SyncState.ERROR, errorText(sheetReason));
    }

    private void touch(SalesSyncLedger ledger, SheetSaleRow row, String runId) {
        ledger.setSourceStatus(truncate(row.orderStatus().isEmpty() ? "UNKNOWN" : row.orderStatus(), 50));
        ledger.setSourceRevisionHash(sha256(row.rawJoined()));
        ledger.setLastSyncRunId(runId);
        ledger.setLastSeenAt(LocalDateTime.now());
        ledgerRepo.save(ledger);
    }

    private ClosedCycle latestSale(String serial) {
        return closedCycleRepo.findBySerialKeyOrderByClosedAtDesc(serial).stream()
                .filter(c -> c.getCloseType() == CloseType.SALE)
                .findFirst().orElse(null);
    }

    private Map<String, Object> buildSaleDetails(SheetSaleRow row, BigDecimal grossPrice, BigDecimal discount) {
        Map<String, Object> d = new HashMap<>();
        if (!row.customerName().isEmpty()) d.put("customerName", row.customerName());
        if (!row.customerPhone().isEmpty()) d.put("customerPhone", row.customerPhone());
        if (!row.warrantyPeriod().isEmpty()) d.put("warrantyPeriod", row.warrantyPeriod());
        
        LocalDate expiry = parseLocalDate(row.warrantyExpiry());
        if (expiry != null) {
            d.put("warrantyExpiry", expiry);
        }

        if (!row.paymentStatus().isEmpty()) d.put("paymentStatus", row.paymentStatus());
        if (!row.productFullName().isEmpty()) d.put("productFullName", row.productFullName());
        if (!row.productSummary().isEmpty()) {
            d.put("productSummary", row.productSummary());
            d.put("upgradeNote", row.productSummary());
        }

        if (grossPrice != null) d.put("grossRevenue", grossPrice);
        if (discount != null) d.put("discount", discount);

        LocalDateTime saleDate = parseDate(row.orderDate());
        if (saleDate != null) d.put("saleDate", saleDate.toString());

        String note = "Đồng bộ từ Google Sheet - Txn: " + row.transactionId();
        if (!row.note().isEmpty()) {
            note += " | " + row.note();
        }
        d.put("saleNote", note);

        return d;
    }

    private void recordDataIssue(String issueType, String entityType, String entityId,
                                 String sourceRef, String message, String suggestedAction) {
        String fingerprint = truncate(issueType + "_" + entityId, 200);
        try {
            Optional<DataIssue> existingOpt = dataIssueRepo.findByIssueFingerprint(fingerprint);
            if (existingOpt.isPresent()) {
                DataIssue existing = existingOpt.get();
                existing.setLastSeenAt(LocalDateTime.now());
                Integer attempts = existing.getAttemptCount();
                existing.setAttemptCount(attempts == null ? 1 : attempts + 1);
                // Nếu đã được người dùng đóng hoặc chấp nhận ngoại lệ thì không tự ý mở lại
                if (existing.getStatus() == IssueStatus.RESOLVED || existing.getStatus() == IssueStatus.ACCEPTED_EXCEPTION) {
                    return;
                }
                dataIssueRepo.save(existing);
                return;
            }
            DataIssue issue = DataIssue.builder()
                    .issueId("ISSUE-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(100000, 999999))
                    .issueFingerprint(fingerprint)
                    .issueType(issueType)
                    .entityType(entityType)
                    .entityId(truncate(entityId, 100))
                    .sourceReference(truncate(sourceRef, 100))
                    .severity(IssueSeverity.HIGH)
                    .status(IssueStatus.OPEN)
                    .message(message)
                    .suggestedAction(suggestedAction)
                    .build();
            dataIssueRepo.save(issue);
        } catch (Exception e) {
            log.warn("[GSHEET] Không thể lưu DataIssue cho {}: {}", fingerprint, e.getMessage());
        }
    }

    private boolean isCancelledOrReturned(String status) {
        if (status == null || status.isBlank()) return false;
        String s = Normalizer.normalize(status, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        return s.contains("hủy") || s.contains("huỷ") || s.contains("trả hàng")
                || s.contains("đổi trả") || s.contains("khách trả") || s.contains("cancelled") || s.contains("returned");
    }

    private String errorText(String reason) {
        if (reason == null || reason.isBlank()) return props.getErrorPrefix();
        String trimmed = reason.trim();
        if (trimmed.toLowerCase(Locale.ROOT).startsWith("lỗi:") ||
            trimmed.toLowerCase(Locale.ROOT).startsWith("loi:")) {
            return trimmed;
        }
        return props.getErrorPrefix() + trimmed;
    }

    // ---------------- helpers (package-visible for tests) ----------------

    /** "15.990.000 đ" / "15,990,000" / "15990000" -> 15990000. Rỗng -> null. */
    static BigDecimal parseMoney(String s) {
        if (s == null) return null;
        String clean = s.trim().replaceAll("([.,]00)\\s*(đ|VND|vnd)?$", "");
        String digits = clean.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        try {
            return new BigDecimal(digits);
        } catch (Exception e) {
            return null;
        }
    }

    private static final List<DateTimeFormatter> DATE_TIME_FORMATS = List.of(
            DateTimeFormatter.ofPattern("d/M/yyyy H:mm:ss"),
            DateTimeFormatter.ofPattern("d/M/yyyy H:mm"),
            DateTimeFormatter.ofPattern("d-M-yyyy H:mm:ss"),
            DateTimeFormatter.ofPattern("d-M-yyyy H:mm"),
            DateTimeFormatter.ofPattern("d.M.yyyy H:mm:ss"),
            DateTimeFormatter.ofPattern("d.M.yyyy H:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd H:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'H:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd H:mm"));
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("d.M.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"));

    static LocalDateTime parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        String v = s.trim();

        // Hỗ trợ số serial ngày của Excel / Google Sheet (VD: 46163)
        if (v.matches("^\\d{4,5}(\\.\\d+)?$")) {
            try {
                double days = Double.parseDouble(v);
                if (days > 30000 && days < 80000) {
                    long wholeDays = (long) days;
                    double fractionalDay = days - wholeDays;
                    long secondsInDay = Math.round(fractionalDay * 86400);
                    return LocalDate.of(1899, 12, 30).plusDays(wholeDays).atStartOfDay().plusSeconds(secondsInDay);
                }
            } catch (Exception ignored) {}
        }

        for (DateTimeFormatter f : DATE_TIME_FORMATS) {
            try { return LocalDateTime.parse(v, f); } catch (Exception ignored) {}
        }
        for (DateTimeFormatter f : DATE_FORMATS) {
            try { return LocalDate.parse(v, f).atStartOfDay(); } catch (Exception ignored) {}
        }
        return null;
    }

    static LocalDate parseLocalDate(String s) {
        if (s == null || s.isBlank()) return null;
        LocalDateTime dt = parseDate(s);
        return dt != null ? dt.toLocalDate() : null;
    }

    private static String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest((s == null ? "" : s).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return String.format("%064x", Objects.hashCode(s));
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
