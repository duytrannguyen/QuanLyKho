package com.qkshop.tonkho.core.enums;

/**
 * Loại đóng vòng tồn.
 * Theo Blueprint §4.8 — CLOSED_CYCLES.close_type
 */
public enum CloseType {
    SALE("Giao dịch bán"),
    GIFT("Xuất tặng"),
    SUPPLIER_RETURN("Trả nhà cung cấp"),
    INTERNAL("Dùng nội bộ"),
    CANCEL("Hủy"),
    OTHER("Xuất khác");

    private final String displayName;

    CloseType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
