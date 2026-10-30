package com.qkshop.tonkho.sync.gsheet;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình đồng bộ Google Sheet "DATABASE_BÁN HÀNG" → trừ kho.
 * Xem block {@code gsheet.*} trong application.yml.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "gsheet")
public class GoogleSheetProperties {

    /** Bật/tắt toàn bộ tính năng (kể cả chạy tay). */
    private boolean enabled = false;

    /** Bật chạy tự động theo cron. */
    private boolean cronEnabled = false;

    private String cron = "0 */15 * * * *";
    private String spreadsheetId;
    private String sheetName = "DATABASE_BÁN HÀNG";
    private String readRange = "A1:AE";
    private String credentialsPath = "secrets/service_account.json";

    /** Giá trị cột trạng thái đơn được coi là đã bán xong. */
    private String completedStatus = "Hoàn tất";

    /** Giá trị ghi vào cột trạng thái khi đã trừ kho thành công. */
    private String doneMarker = "Đã xuất kho";

    /** Tiền tố khi ghi lỗi ngược lại sheet. */
    private String errorPrefix = "Lỗi: ";

    private Columns columns = new Columns();

    @Getter
    @Setter
    public static class Columns {
        private String transactionId = "transaction_ID";
        private String orderDate = "ngày bán";
        private String customerName = "tên khách";
        private String customerPhone = "SĐT";
        private String orderStatus = "trạng thái đơn";
        private String paymentStatus = "trạng thái thanh toán";
        private String productFullName = "sản phẩm chính";
        private String productSummary = "cấu hình tóm tắt";
        private String warrantyPeriod = "mức bảo hành";
        private String warrantyExpiry = "bảo hành đến ngày";
        private String grossRevenue = "doanh thu";
        private String discount = "giảm giá";
        private String netRevenue = "doanh thu thuần";
        private String syncStatus = "trạng thái khớp CRM";
        private String note = "ghi chú";
        private String serial = "Serial";
        private String salesperson = "nhân viên bán";
        private String customerId = "customer_ID";
        private String leadId = "lead_ID";
        private String customerType = "phân loại khách";
        private String firstSource = "nguồn đầu tiên biết đến";
        private String secondSource = "nguồn thứ 2 tham khảo";
        private String lastSource = "nguồn chốt cuối cùng";
        private String isStudent = "sinh viên?";
        private String brand = "hãng";
        private String series = "series";
        private String segment = "phân khúc";
        private String modelName = "dòng máy";
        private String messageSyncStatus = "trạng thái khớp tin nhắn";
        private String dataQualityStatus = "trạng thái chất lượng dữ liệu";
        private String importDate = "ngày nạp";
    }

    /** Tên sheet đã được bọc nháy đơn, dùng trong A1 notation (sheet có dấu cách / tiếng Việt). */
    public String quotedSheetName() {
        return "'" + sheetName.replace("'", "''") + "'";
    }
}
