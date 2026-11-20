package com.qkshop.tonkho.inventory;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Tiện ích chuẩn hóa tính toán thời gian lưu kho, thời gian chờ kiểm định/sửa chữa
 * và tuổi tồn kho bán hàng trên toàn hệ thống.
 */
public final class InventoryDurationHelper {

    private InventoryDurationHelper() {
    }

    /**
     * Tính số ngày theo lịch (calendar days) giữa hai mốc thời gian, luôn trả về >= 0.
     * Dùng LocalDate để tránh sai lệch 1 ngày khi intakeAt là 00:00 (từ importDate)
     * còn các mốc sự kiện khác là LocalDateTime.now().
     */
    public static long calculateDaysBetween(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            return 0L;
        }
        long days = ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate());
        return Math.max(0L, days);
    }

    /**
     * Tổng số ngày thực tế máy nằm trong kho (từ intakeAt đến thời điểm hiện tại).
     */
    public static long calculateStorageDays(ActiveInventory ai, LocalDateTime now) {
        if (ai == null || ai.getIntakeAt() == null) {
            return 0L;
        }
        LocalDateTime referenceEnd = now != null ? now : LocalDateTime.now();
        return calculateDaysBetween(ai.getIntakeAt(), referenceEnd);
    }

    /**
     * Tổng số ngày thực tế máy đã nằm trong kho ở chu kỳ đóng (từ intakeAt đến closedAt).
     */
    public static long calculateStorageDays(ClosedCycle cc) {
        if (cc == null || cc.getIntakeAt() == null || cc.getClosedAt() == null) {
            return 0L;
        }
        return calculateDaysBetween(cc.getIntakeAt(), cc.getClosedAt());
    }

    /**
     * Tổng số ngày tạm dừng (chờ kiểm tra / sửa chữa) của máy đang tồn kho.
     */
    public static long calculateTotalPausedDays(ActiveInventory ai, LocalDateTime now) {
        return calculateTotalPausedDays(ai, now, null);
    }

    /**
     * Tổng số ngày tạm dừng của máy đang tồn kho, hỗ trợ fallback sang ngày tạo phiếu kiểm định
     * trong trường hợp dữ liệu cũ bị thiếu lastPausedAt khi đang ở trạng thái NEEDS_INSPECTION.
     */
    public static long calculateTotalPausedDays(ActiveInventory ai, LocalDateTime now, LocalDateTime fallbackPauseStart) {
        if (ai == null) {
            return 0L;
        }
        LocalDateTime referenceEnd = now != null ? now : LocalDateTime.now();
        long paused = ai.getPausedDays() != null ? Math.max(0L, ai.getPausedDays()) : 0L;

        if (ai.getState() == CycleState.NEEDS_INSPECTION) {
            LocalDateTime activePauseStart = ai.getLastPausedAt() != null ? ai.getLastPausedAt() : fallbackPauseStart;
            if (activePauseStart != null) {
                paused += calculateDaysBetween(activePauseStart, referenceEnd);
            }
        }

        long storageDays = calculateStorageDays(ai, referenceEnd);
        return Math.min(storageDays, paused);
    }

    /**
     * Tổng số ngày tạm dừng đã chốt của chu kỳ đã đóng.
     */
    public static long calculateTotalPausedDays(ClosedCycle cc) {
        if (cc == null) {
            return 0L;
        }
        long paused = cc.getPausedDays() != null ? Math.max(0L, cc.getPausedDays()) : 0L;
        long storageDays = calculateStorageDays(cc);
        return Math.min(storageDays, paused);
    }

    /**
     * Tuổi tồn kho bán hàng = Tổng ngày lưu kho - Tổng ngày tạm dừng (chờ QC/sửa chữa).
     */
    public static long calculateSellableDays(long storageDays, long pausedDays) {
        return Math.max(0L, storageDays - Math.max(0L, pausedDays));
    }

    public static long calculateSellableDays(ActiveInventory ai, LocalDateTime now) {
        LocalDateTime referenceEnd = now != null ? now : LocalDateTime.now();
        long storageDays = calculateStorageDays(ai, referenceEnd);
        long pausedDays = calculateTotalPausedDays(ai, referenceEnd);
        return calculateSellableDays(storageDays, pausedDays);
    }

    public static long calculateSellableDays(ClosedCycle cc) {
        long storageDays = calculateStorageDays(cc);
        long pausedDays = calculateTotalPausedDays(cc);
        return calculateSellableDays(storageDays, pausedDays);
    }

    /**
     * Cộng dồn thời gian tạm dừng hiện tại vào pausedDays và xóa lastPausedAt khi chuyển sang READY.
     */
    public static void accumulatePausedDays(ActiveInventory inventory, LocalDateTime now) {
        if (inventory == null || inventory.getLastPausedAt() == null) {
            return;
        }
        LocalDateTime referenceEnd = now != null ? now : LocalDateTime.now();
        long days = calculateDaysBetween(inventory.getLastPausedAt(), referenceEnd);
        long existingPaused = inventory.getPausedDays() != null ? Math.max(0L, inventory.getPausedDays()) : 0L;
        inventory.setPausedDays(existingPaused + days);
        inventory.setLastPausedAt(null);
    }
}
