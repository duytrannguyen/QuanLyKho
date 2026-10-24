package com.qkshop.tonkho.sync.gsheet;

import java.text.Normalizer;
import java.util.*;

/**
 * Chuyển ma trận giá trị đọc từ sheet thành danh sách {@link SheetSaleRow}.
 * Tìm cột theo tên header (không phân biệt hoa thường, chuẩn hoá Unicode NFC, bỏ khoảng trắng thừa).
 */
public final class SheetRowParser {

    private SheetRowParser() {}

    /** Vị trí các cột trong sheet. -1 = không có trong sheet. */
    public record ColumnMap(
            int txn,
            int orderDate,
            int customerName,
            int customerPhone,
            int status,
            int paymentStatus,
            int productFullName,
            int productSummary,
            int warrantyPeriod,
            int warrantyExpiry,
            int grossRevenue,
            int discount,
            int netRevenue,
            int sync,
            int note,
            int serial,
            int salesperson
    ) {}

    public static String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFC);
        return n.replace('\u00A0', ' ').trim().replaceAll("\\s+", " ");
    }

    private static String key(String s) {
        return normalize(s).toLowerCase(Locale.ROOT);
    }

    public static boolean equalsLoose(String a, String b) {
        return key(a).equals(key(b));
    }

    public static ColumnMap mapHeaders(List<String> headers, GoogleSheetProperties.Columns cfg) {
        Map<String, Integer> idx = new HashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            idx.putIfAbsent(key(headers.get(i)), i);
        }
        List<String> missing = new ArrayList<>();
        int txn = required(idx, cfg.getTransactionId(), missing);
        int status = required(idx, cfg.getOrderStatus(), missing);
        int serial = required(idx, cfg.getSerial(), missing);
        int sync = required(idx, cfg.getSyncStatus(), missing);
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Sheet thiếu cột bắt buộc: " + String.join(", ", missing)
                    + ". Header hiện có: " + headers);
        }
        return new ColumnMap(
                txn,
                optional(idx, cfg.getOrderDate(), "ngày bán", "ngày mua", "thời gian bán"),
                optional(idx, cfg.getCustomerName(), "tên khách", "khách hàng", "tên khách hàng"),
                optional(idx, cfg.getCustomerPhone(), "SĐT", "số điện thoại", "điện thoại", "sdt"),
                status,
                optional(idx, cfg.getPaymentStatus(), "trạng thái thanh toán", "thanh toán"),
                optional(idx, cfg.getProductFullName(), "sản phẩm chính", "tên sản phẩm", "dòng máy"),
                optional(idx, cfg.getProductSummary(), "cấu hình tóm tắt", "cấu hình", "thông số"),
                optional(idx, cfg.getWarrantyPeriod(), "mức bảo hành", "thời hạn bảo hành", "bảo hành"),
                optional(idx, cfg.getWarrantyExpiry(), "bảo hành đến ngày", "hạn bảo hành", "ngày hết hạn"),
                optional(idx, cfg.getGrossRevenue(), "doanh thu", "giá bán", "tổng tiền"),
                optional(idx, cfg.getDiscount(), "giảm giá", "chiết khấu", "ưu đãi"),
                optional(idx, cfg.getNetRevenue(), "doanh thu thuần", "tiền thực nhận"),
                sync,
                optional(idx, cfg.getNote(), "ghi chú", "note"),
                serial,
                optional(idx, cfg.getSalesperson(), "nhân viên bán", "người bán", "sale", "nhân viên")
        );
    }

    private static int required(Map<String, Integer> idx, String name, List<String> missing) {
        if (name == null || name.isBlank()) return -1;
        Integer i = idx.get(key(name));
        if (i == null) {
            missing.add("'" + name + "'");
            return -1;
        }
        return i;
    }

    private static int optional(Map<String, Integer> idx, String name, String... fallbacks) {
        if (name != null && !name.isBlank()) {
            Integer i = idx.get(key(name));
            if (i != null) return i;
        }
        for (String fb : fallbacks) {
            if (fb != null && !fb.isBlank()) {
                Integer i = idx.get(key(fb));
                if (i != null) return i;
            }
        }
        return -1;
    }

    private static String cell(List<String> row, int i) {
        if (i < 0 || i >= row.size()) return "";
        return normalize(row.get(i));
    }

    /** Bỏ qua dòng header (index 0). rowNumber = số dòng thực trên sheet (1-based). */
    public static List<SheetSaleRow> parse(List<List<String>> values, ColumnMap m) {
        List<SheetSaleRow> out = new ArrayList<>();
        for (int i = 1; i < values.size(); i++) {
            List<String> row = values.get(i);
            String txn = cell(row, m.txn());
            String serial = cell(row, m.serial());
            if (txn.isEmpty() && serial.isEmpty()) continue; // dòng trống
            out.add(new SheetSaleRow(
                    i + 1,
                    txn,
                    cell(row, m.orderDate()),
                    cell(row, m.customerName()),
                    cell(row, m.customerPhone()),
                    cell(row, m.status()),
                    cell(row, m.paymentStatus()),
                    cell(row, m.productFullName()),
                    cell(row, m.productSummary()),
                    cell(row, m.warrantyPeriod()),
                    cell(row, m.warrantyExpiry()),
                    cell(row, m.grossRevenue()),
                    cell(row, m.discount()),
                    cell(row, m.netRevenue()),
                    cell(row, m.sync()),
                    cell(row, m.note()),
                    serial,
                    cell(row, m.salesperson()),
                    String.join("\u001F", row)
            ));
        }
        return out;
    }
}
