package com.qkshop.tonkho.crm;

/**
 * Sự kiện phát ra mỗi khi một SalesOrder được thêm hoặc cập nhật.
 */
public record SalesOrderChangedEvent(Long orderId) {
}
