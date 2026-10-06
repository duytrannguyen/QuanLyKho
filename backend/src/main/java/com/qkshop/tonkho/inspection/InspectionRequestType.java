package com.qkshop.tonkho.inspection;

/**
 * Loại yêu cầu kiểm tra.
 * Theo Blueprint §4.9 — INSPECTION_REQUESTS.request_type
 */
public enum InspectionRequestType {
    INITIAL("Kiểm tra đầu vào"),
    RECHECK("Kiểm tra lại"),
    CUSTOMER_RETURN("Kiểm tra đổi/trả");

    private final String displayName;

    InspectionRequestType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
