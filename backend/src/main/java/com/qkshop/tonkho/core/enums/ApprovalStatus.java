package com.qkshop.tonkho.core.enums;

/**
 * Trạng thái duyệt danh mục.
 * Theo Blueprint §4.3, §4.4 — approval_status
 */
public enum ApprovalStatus {
    APPROVED("Đã duyệt"),
    PENDING("Chờ xác nhận");

    private final String displayName;

    ApprovalStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
