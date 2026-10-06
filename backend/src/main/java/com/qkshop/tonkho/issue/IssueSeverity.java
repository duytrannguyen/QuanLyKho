package com.qkshop.tonkho.issue;

/**
 * Mức độ nghiêm trọng của lỗi dữ liệu.
 */
public enum IssueSeverity {
    LOW("Thấp"),
    MEDIUM("Trung bình"),
    HIGH("Cao"),
    CRITICAL("Nghiêm trọng");

    private final String displayName;

    IssueSeverity(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
