package com.qkshop.tonkho.sync;

/**
 * Trạng thái đồng bộ bán hàng.
 * Theo Blueprint §4.11 — SALES_SYNC_LEDGER.sync_state
 */
public enum SyncState {
    MATCHED("Đã khớp"),
    SKIPPED("Bỏ qua"),
    ERROR("Lỗi"),
    SEEDED("Dữ liệu gốc");

    private final String displayName;

    SyncState(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
