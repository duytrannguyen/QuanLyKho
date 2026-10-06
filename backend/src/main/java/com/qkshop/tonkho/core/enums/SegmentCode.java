package com.qkshop.tonkho.core.enums;

/**
 * Phân khúc sản phẩm.
 * Theo Master Brief D-022: Văn phòng, Gaming, Máy trạm
 */
public enum SegmentCode {
    OFFICE("Văn phòng"),
    GAMING("Gaming"),
    WORKSTATION("Máy trạm"),
    MACBOOK("MacBook");

    private final String displayName;

    SegmentCode(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
