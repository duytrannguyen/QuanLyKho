package com.qkshop.tonkho.user;

public enum UserRole {
    ADMIN("Admin"),
    MANAGER("Quản lý"),
    STAFF("Nhân viên");

    private final String displayName;

    UserRole(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
