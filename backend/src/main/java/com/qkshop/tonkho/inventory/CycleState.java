package com.qkshop.tonkho.inventory;

/**
 * Trạng thái vòng tồn (state machine chính).
 * Theo Blueprint §5.1:
 *   TẠO → NEEDS_INSPECTION → PASSED → READY
 *                           → REJECTED → CLOSED
 *         READY → RECHECK → NEEDS_INSPECTION
 *               → SALE/OTHER → CLOSED
 */
public enum CycleState {
    NEEDS_INSPECTION("Cần kiểm tra"),
    READY("Sẵn sàng bán"),
    CLOSED("Đã đóng");

    private final String displayName;

    CycleState(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
