package com.qkshop.tonkho.core.enums;

public enum RequestType {
    KIEM_TRA_DAU_VAO("Kiểm tra đầu vào"),
    KHACH_DOI_TRA("Khách đổi/trả"),
    BAO_HANH("Bảo hành"),
    KIEM_TRA_LAI("Kiểm tra lại");

    private final String displayName;

    RequestType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
