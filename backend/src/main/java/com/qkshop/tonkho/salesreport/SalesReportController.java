package com.qkshop.tonkho.salesreport;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.salesreport.dto.SalesDashboardResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Controller cung cấp dữ liệu báo cáo bán hàng cho Dashboard Sales,
 * mô phỏng thẻ DASHBOARD SALES và DATABASE_BÁN HÀNG từ dữ liệu thực tế trong MySQL.
 */
@Slf4j
@RestController
@RequestMapping("/api/sales-report")
@RequiredArgsConstructor
public class SalesReportController {

    private final SalesReportService salesReportService;
    private final SalesOrderBackfillService backfillService;

    /**
     * Lấy dữ liệu tổng hợp Dashboard Báo Cáo Bán Hàng theo bộ lọc thời gian.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<SalesDashboardResponse>> getDashboard(
            @RequestParam(defaultValue = "THIS_MONTH") String preset,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        SalesDashboardResponse response = salesReportService.getDashboardData(preset, from, to);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Đồng bộ lại dữ liệu lịch sử từ bảng qk_migration_sales vào sales_orders.
     */
    @PostMapping("/rebuild")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rebuildData() {
        log.info("[SALES_REPORT] Yêu cầu nạp lại toàn bộ dữ liệu đơn hàng sales_orders.");
        int count = backfillService.backfillAllSales();
        return ResponseEntity.ok(ApiResponse.okWithMessage(
                "Đã làm mới và đồng bộ thành công " + count + " đơn hàng vào hệ thống báo cáo.",
                Map.of("totalImported", count)
        ));
    }
}
