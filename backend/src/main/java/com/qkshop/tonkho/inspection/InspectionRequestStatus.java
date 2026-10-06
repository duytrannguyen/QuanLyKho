package com.qkshop.tonkho.inspection;

/**
 * Trạng thái yêu cầu kiểm tra.
 * Theo Blueprint §4.9 — INSPECTION_REQUESTS.status
 */
public enum InspectionRequestStatus {
    OPEN("Đang mở"),
    IN_PROGRESS("Đang xử lý"),
    RECHECK_REQUESTED("Yêu cầu kiểm tra lại"),
    PASSED("Đạt"),
    REJECTED_RETURNED("Hủy/Trả");

    private final String displayName;

    InspectionRequestStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
