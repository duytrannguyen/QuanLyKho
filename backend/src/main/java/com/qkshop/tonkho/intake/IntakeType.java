package com.qkshop.tonkho.intake;

/**
 * Loại nghiệp vụ nhập máy.
 * Theo Blueprint §4.7 — ACTIVE_INVENTORY.intake_type
 */
public enum IntakeType {
    PURCHASE("Mua nhập hàng"),
    CUSTOMER_BUYBACK("Khách bán lại"),
    CUSTOMER_RETURN("Khách đổi/trả"),
    OPENING_BALANCE("Tồn đầu kỳ"),
    SALE_CANCELLATION("Hủy đơn bán");

    private final String displayName;

    IntakeType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
