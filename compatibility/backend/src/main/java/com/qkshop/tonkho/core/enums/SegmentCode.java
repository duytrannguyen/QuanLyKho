package com.qkshop.tonkho.core.enums;

/**
 * Phân khúc sản phẩm. UNCLASSIFIED preserves source records without a segment.
 */
public enum SegmentCode {
    OFFICE("Văn phòng"),
    GAMING("Gaming"),
    WORKSTATION("Máy trạm"),
    MACBOOK("MacBook"),
    UNCLASSIFIED("Chưa phân loại");

    private final String displayName;

    SegmentCode(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
