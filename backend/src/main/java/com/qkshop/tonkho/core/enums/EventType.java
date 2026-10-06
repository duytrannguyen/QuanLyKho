package com.qkshop.tonkho.core.enums;

/**
 * Loại sự kiện trong Nhật ký biến động.
 * Theo Blueprint §4.10 — EVENT_LOG.event_type
 */
public enum EventType {
    // Nhập máy
    INTAKE_CREATED("Nhập máy"),
    INTAKE_BATCH_CREATED("Nhập lô máy"),

    // Kiểm tra
    INSPECTION_CREATED("Tạo yêu cầu kiểm tra"),
    INSPECTION_PROGRESS_SAVED("Lưu tiến độ kiểm tra"),
    INSPECTION_PASSED("Duyệt đạt kiểm tra"),
    INSPECTION_REJECTED("Hủy/Trả kiểm tra"),
    SENT_BACK_TO_INSPECTION("Đưa về kiểm tra lại"),

    // Bán hàng
    SALE_COMPLETED("Giao dịch bán"),
    SALE_SYNC_MATCHED("Đồng bộ bán hàng"),
    SALE_SYNC_RETURN("Đồng bộ đổi/trả"),
    SALE_SYNC_CANCEL("Đồng bộ hủy đơn"),
    CYCLE_CLOSED_SOLD("Đã bán"),
    CYCLE_CLOSED_RETURNED("Trả lại khách/NCC"),

    // Xuất khác
    CYCLE_CLOSED_GIFT("Xuất tặng"),
    CYCLE_CLOSED_SUPPLIER_RETURN("Trả nhà cung cấp"),
    CYCLE_CLOSED_INTERNAL("Dùng nội bộ"),
    CYCLE_CLOSED_OTHER("Xuất khác"),

    // Cập nhật
    CONFIG_UPDATED("Cập nhật cấu hình"),
    PRICE_UPDATED("Cập nhật giá"),
    NOTE_UPDATED("Cập nhật ghi chú"),

    // Hệ thống
    MIGRATION("Migration dữ liệu"),
    CORRECTION("Sửa lỗi dữ liệu"),
    SYSTEM("Thao tác hệ thống");

    private final String displayName;

    EventType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
