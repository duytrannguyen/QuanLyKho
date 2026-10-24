package com.qkshop.tonkho.sync.gsheet;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Một dòng đơn hàng trên sheet DATABASE_BÁN HÀNG với đầy đủ 16 trường nghiệp vụ.
 */
public record SheetSaleRow(
        int rowNumber,
        String transactionId,
        String orderDate,
        String customerName,
        String customerPhone,
        String orderStatus,
        String paymentStatus,
        String productFullName,
        String productSummary,
        String warrantyPeriod,
        String warrantyExpiry,
        String grossRevenue,
        String discount,
        String netRevenue,
        String syncStatus,
        String note,
        String serial,
        String salesperson,
        String rawJoined
) {
    /**
     * Tách danh sách serial từ chuỗi thô (hỗ trợ 1 dòng nhiều máy, phân cách bởi dấu phẩy, chấm phẩy, gạch chéo, xuống dòng...).
     */
    public List<String> getParsedSerials() {
        if (serial == null || serial.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String[] parts = serial.trim().split("[,;\\n/|]+");
        List<String> list = new ArrayList<>();
        for (String p : parts) {
            String s = p.trim().toUpperCase(Locale.ROOT);
            if (!s.isEmpty()) {
                list.add(s);
            }
        }
        return list;
    }
}
