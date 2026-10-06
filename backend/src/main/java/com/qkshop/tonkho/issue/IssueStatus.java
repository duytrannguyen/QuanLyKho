package com.qkshop.tonkho.issue;

/**
 * Trạng thái lỗi dữ liệu.
 * Theo Blueprint §4.13 — DATA_ISSUES.status
 */
public enum IssueStatus {
    OPEN("Mới phát hiện"),
    IN_REVIEW("Chờ xử lý"),
    FIXED_WAIT_RESCAN("Đã sửa — Chờ quét lại"),
    RESOLVED("Đã giải quyết"),
    ACCEPTED_EXCEPTION("Chấp nhận ngoại lệ");

    private final String displayName;

    IssueStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
