package com.qkshop.tonkho.core.enums;

/**
 * Nguồn tạo sự kiện.
 * Theo Blueprint §4.10 — EVENT_LOG.source_type
 */
public enum SourceType {
    WEB_APP("Web App"),
    SALE_SYNC("Đồng bộ bán hàng"),
    MIGRATION("Migration"),
    SYSTEM("Hệ thống");

    private final String displayName;

    SourceType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
