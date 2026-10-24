package com.qkshop.tonkho.sync;

import com.qkshop.tonkho.sync.gsheet.GoogleSheetClient;
import com.qkshop.tonkho.sync.gsheet.GoogleSheetClient.CellUpdate;
import com.qkshop.tonkho.sync.gsheet.GoogleSheetProperties;
import com.qkshop.tonkho.sync.gsheet.SheetRowParser;
import com.qkshop.tonkho.sync.gsheet.SheetRowParser.ColumnMap;
import com.qkshop.tonkho.sync.gsheet.SheetSaleRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Đồng bộ bán hàng từ Google Sheet "DATABASE_BÁN HÀNG" → trừ kho.
 *
 * <p>Luồng: đọc sheet → lọc đơn "Hoàn tất" chưa "Đã xuất kho" → xử lý từng dòng
 * ({@link SalesSyncRowProcessor}, transaction riêng) → gom kết quả ghi ngược về sheet bằng 1 batchUpdate.</p>
 *
 * <p>An toàn chạy lại: mỗi giao dịch chỉ trừ kho 1 lần nhờ {@code sales_sync_ledger.transaction_id} (unique)
 * và requestId {@code GSHEET-<transaction_ID>} trong command ledger.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SalesSyncService {

    private static final int WRITE_CHUNK = 500;

    private final SyncRunRepository syncRunRepo;
    private final SalesSyncRowProcessor rowProcessor;
    private final GoogleSheetClient sheetClient;
    private final GoogleSheetProperties props;
    private final com.qkshop.tonkho.system.SystemConfigService systemConfigService;
    private final com.qkshop.tonkho.log.ActivityLogService activityLogService;
    private final com.qkshop.tonkho.notification.NotificationService notificationService;

    /** Không cho 2 lượt đồng bộ (cron + bấm tay) chạy chồng nhau. */
    private final ReentrantLock runLock = new ReentrantLock();

    private record PendingWrite(SheetSaleRow row, String value) {}

    public SyncRun syncSalesWindow(LocalDateTime from, LocalDateTime to, String runMode) {
        boolean enabled = Boolean.parseBoolean(
                systemConfigService.getConfig("GSHEET_SYNC_ENABLED", String.valueOf(props.isEnabled())));
        if (!enabled) {
            throw new IllegalStateException("Đồng bộ Google Sheet đang TẮT. Vui lòng bật tính năng trong Cài đặt đồng bộ hoặc file cấu hình.");
        }
        if (!runLock.tryLock()) {
            throw new IllegalStateException("Đang có một lượt đồng bộ khác chạy, vui lòng thử lại sau.");
        }
        try {
            return doSync(from, to, runMode);
        } finally {
            runLock.unlock();
        }
    }

    private SyncRun doSync(LocalDateTime from, LocalDateTime to, String runMode) {
        String syncRunId = "SYNC-" + System.currentTimeMillis();
        SyncRun run = syncRunRepo.save(SyncRun.builder()
                .syncRunId(syncRunId)
                .windowFrom(from)
                .windowTo(to)
                .runMode(runMode)
                .startedAt(LocalDateTime.now())
                .runStatus("RUNNING")
                .build());

        try {
            List<List<String>> values = sheetClient.read(props.getReadRange());
            if (values.isEmpty()) {
                run.setRunStatus("COMPLETED");
                return run;
            }
            ColumnMap cols = SheetRowParser.mapHeaders(values.get(0), props.getColumns());
            List<SheetSaleRow> rows = SheetRowParser.parse(values, cols);
            run.setRowsRead(rows.size());

            String doneMarker = systemConfigService.getConfig("GSHEET_DONE_MARKER", props.getDoneMarker());
            int valid = 0, processed = 0, skipped = 0, error = 0;
            List<PendingWrite> pending = new ArrayList<>();

            for (SheetSaleRow row : rows) {
                boolean completed = SheetRowParser.equalsLoose(row.orderStatus(), props.getCompletedStatus());
                boolean alreadyDone = SheetRowParser.equalsLoose(row.syncStatus(), doneMarker);
                boolean cancelledOrReturned = isCancelledOrReturned(row.orderStatus());

                // Nếu là đơn hoàn tất và đã xuất kho rồi -> bỏ qua
                if (completed && alreadyDone) {
                    skipped++;
                    continue;
                }

                // Nếu đơn hoàn tất nhưng không có Serial và trên sheet đã đánh dấu "Lỗi: thiếu Serial" -> bỏ qua để tránh spam lỗi mỗi phút
                if (completed && row.serial().isBlank() && row.syncStatus().toLowerCase().contains("thiếu serial")) {
                    skipped++;
                    continue;
                }

                // Nếu không phải đơn hoàn tất và cũng không phải đơn hủy/trả hàng -> bỏ qua
                if (!completed && !cancelledOrReturned) {
                    skipped++;
                    continue;
                }

                valid++;

                SalesSyncRowProcessor.RowOutcome outcome;
                try {
                    outcome = rowProcessor.process(row, syncRunId);
                } catch (Exception e) {
                    log.error("[GSHEET] Lỗi xử lý dòng {} (txn {})", row.rowNumber(), row.transactionId(), e);
                    outcome = safeRecordFailure(row, syncRunId, rootMessage(e));
                }

                if (outcome.state() == SyncState.MATCHED) processed++;
                else if (outcome.state() == SyncState.SKIPPED) skipped++;
                else error++;

                if (!SheetRowParser.equalsLoose(outcome.sheetValue(), row.syncStatus())) {
                    pending.add(new PendingWrite(row, outcome.sheetValue()));
                }
            }

            run.setRowsValid(valid);
            run.setRowsProcessed(processed);
            run.setRowsSkipped(skipped);
            run.setRowsError(error);

            int written = writeBack(pending, cols);
            run.setRunStatus("COMPLETED");
            log.info("[GSHEET] {} xong: đọc={}, cần xử lý={}, khớp={}, lỗi={}, ghi sheet={}",
                    syncRunId, rows.size(), valid, processed, error, written);

        } catch (Exception e) {
            log.error("[GSHEET] Lượt đồng bộ {} thất bại", syncRunId, e);
            run.setRunStatus("FAILED");
            run.setErrorMessage(rootMessage(e));
        } finally {
            run.setFinishedAt(LocalDateTime.now());
            syncRunRepo.save(run);
            try {
                if (activityLogService != null) {
                    activityLogService.log("ĐỒNG BỘ GOOGLE SHEET", null, null, null, run.getRunStatus(),
                            String.format("Lượt %s (%s): Đã xuất kho %d máy, %d lỗi trên tổng %d dòng xử lý",
                                    syncRunId, runMode, run.getRowsProcessed(), run.getRowsError(), run.getRowsValid()));
                }
            } catch (Exception ex) {
                log.warn("[GSHEET] Không thể ghi activity log: {}", ex.getMessage());
            }

            try {
                if (notificationService != null) {
                    if ("FAILED".equals(run.getRunStatus())) {
                        notificationService.sendNotification(
                                "Đồng bộ Google Sheet thất bại",
                                "Lỗi: " + (run.getErrorMessage() != null ? run.getErrorMessage() : "Không rõ nguyên nhân"),
                                "SYNC_ERROR",
                                "/doi-soat"
                        );
                    } else if ("COMPLETED".equals(run.getRunStatus())) {
                        if (run.getRowsProcessed() > 0 && run.getRowsError() == 0) {
                            notificationService.sendNotification(
                                    "Đồng bộ Google Sheet thành công",
                                    String.format("Lượt %s: Đã xuất kho %d máy thành công từ Google Sheet.",
                                            syncRunId, run.getRowsProcessed()),
                                    "SYNC_SUCCESS",
                                    "/doi-soat"
                            );
                        } else if (run.getRowsError() > 0) {
                            notificationService.sendNotification(
                                    "Cảnh báo sai lệch Google Sheet",
                                    String.format("Lượt %s: Đã xuất kho %d máy, nhưng phát hiện %d lỗi sai lệch / đơn hủy cần kiểm tra đối soát!",
                                            syncRunId, run.getRowsProcessed(), run.getRowsError()),
                                    "SYNC_ERROR",
                                    "/doi-soat"
                            );
                        } else if ("ALL".equalsIgnoreCase(systemConfigService.getConfig("GSHEET_SYNC_NOTIFY_MODE", "CHANGES"))
                                || "MANUAL".equalsIgnoreCase(runMode)) {
                            notificationService.sendNotification(
                                    "Đồng bộ Google Sheet hoàn tất",
                                    String.format("Lượt %s: Kho hàng đã khớp hoàn toàn với Google Sheet.", syncRunId),
                                    "SYNC_INFO",
                                    "/doi-soat"
                            );
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("[GSHEET] Không thể gửi thông báo đồng bộ: {}", ex.getMessage());
            }
        }
        return run;
    }

    /**
     * Ghi trạng thái về sheet. Trước khi ghi, đọc lại cột transaction_ID để chắc chắn dòng không bị
     * chèn/xoá/sắp xếp trong lúc xử lý; nếu dòng đã dịch chuyển thì tìm lại theo transaction_ID.
     */
    private int writeBack(List<PendingWrite> pending, ColumnMap cols) throws Exception {
        if (pending.isEmpty()) return 0;

        String txnCol = GoogleSheetClient.columnLetter(cols.txn());
        String syncCol = GoogleSheetClient.columnLetter(cols.sync());
        List<List<String>> fresh = sheetClient.read(txnCol + "1:" + txnCol);

        Map<String, Integer> rowByTxn = new HashMap<>();
        Set<String> duplicated = new HashSet<>();
        for (int i = 1; i < fresh.size(); i++) {
            String t = fresh.get(i).isEmpty() ? "" : SheetRowParser.normalize(fresh.get(i).get(0));
            if (t.isEmpty()) continue;
            if (rowByTxn.putIfAbsent(t, i + 1) != null) duplicated.add(t);
        }

        List<CellUpdate> updates = new ArrayList<>();
        for (PendingWrite p : pending) {
            String txn = p.row().transactionId();
            Integer target;
            if (txn.isEmpty()) {
                target = p.row().rowNumber(); // không có txn để dò lại, giữ nguyên dòng nếu ô vẫn trống
                int idx = target - 1;
                boolean stillEmpty = idx < fresh.size() && (fresh.get(idx).isEmpty() || fresh.get(idx).get(0).isBlank());
                if (!stillEmpty && idx < fresh.size()) target = null;
            } else if (duplicated.contains(txn)) {
                log.warn("[GSHEET] transaction_ID {} bị trùng trên sheet, không ghi trạng thái", txn);
                target = null;
            } else {
                target = rowByTxn.get(txn);
                if (target != null && target != p.row().rowNumber()) {
                    log.info("[GSHEET] Txn {} đã dời từ dòng {} sang dòng {}", txn, p.row().rowNumber(), target);
                }
            }
            if (target == null) {
                log.warn("[GSHEET] Không xác định được dòng để ghi cho txn '{}' (dòng cũ {})", txn, p.row().rowNumber());
                continue;
            }
            updates.add(new CellUpdate(syncCol + target, p.value()));
        }

        for (int i = 0; i < updates.size(); i += WRITE_CHUNK) {
            sheetClient.batchWrite(updates.subList(i, Math.min(i + WRITE_CHUNK, updates.size())));
        }
        return updates.size();
    }

    private SalesSyncRowProcessor.RowOutcome safeRecordFailure(SheetSaleRow row, String runId, String msg) {
        try {
            return rowProcessor.recordFailure(row, runId, msg);
        } catch (Exception e) {
            log.error("[GSHEET] Không ghi được lỗi cho txn {}", row.transactionId(), e);
            return new SalesSyncRowProcessor.RowOutcome(SyncState.ERROR, props.getErrorPrefix() + msg);
        }
    }

    private static boolean isCancelledOrReturned(String status) {
        if (status == null || status.isBlank()) return false;
        String s = java.text.Normalizer.normalize(status, java.text.Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        return s.contains("hủy") || s.contains("huỷ") || s.contains("trả hàng")
                || s.contains("đổi trả") || s.contains("khách trả") || s.contains("cancelled") || s.contains("returned");
    }

    private static String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null && t.getCause() != t) t = t.getCause();
        String m = t.getMessage();
        return m == null ? t.getClass().getSimpleName() : m;
    }
}
