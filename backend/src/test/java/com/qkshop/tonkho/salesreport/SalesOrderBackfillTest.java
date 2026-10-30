package com.qkshop.tonkho.salesreport;

import com.qkshop.tonkho.salesreport.dto.SalesDashboardResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.task.scheduling.enabled=false",
        "gsheet.enabled=false",
        "gsheet.cron-enabled=false",
        "gsheet.scheduler.enabled=false"
})
class SalesOrderBackfillTest {

    @Autowired
    private SalesOrderBackfillService backfillService;

    @Autowired
    private SalesOrderRepository salesOrderRepo;

    @Autowired
    private SalesReportService salesReportService;

    @Test
    void testBackfillAndReport() {
        // 1. Chạy nạp dữ liệu từ qk_migration_sales
        int count = backfillService.backfillAllSales();
        System.out.println("=== NẠP THÀNH CÔNG " + count + " ĐƠN HÀNG VÀO SALES_ORDERS ===");
        assertTrue(count > 0, "Phải nạp được ít nhất 1 đơn hàng");

        long totalInDb = salesOrderRepo.count();
        System.out.println("=== TỔNG SỐ ĐƠN TRONG SALES_ORDERS: " + totalInDb + " ===");
        assertTrue(totalInDb >= count, "Tổng số đơn trong DB phải lớn hơn hoặc bằng số đơn nạp từ migration");

        // 2. Kiểm tra truy vấn Dashboard toàn bộ thời gian
        SalesDashboardResponse dashboard = salesReportService.getDashboardData("ALL_TIME", null, null);
        assertNotNull(dashboard, "Dashboard response không được null");
        assertNotNull(dashboard.getKpis(), "KPI không được null");

        System.out.println("=== KẾT QUẢ KPI DASHBOARD ===");
        System.out.println("Doanh thu thực tế (Actual): " + dashboard.getKpis().getActualRevenue().getCurrent());
        System.out.println("Tổng doanh số (Gross): " + dashboard.getKpis().getGrossRevenue().getCurrent());
        System.out.println("Số máy đã bán: " + dashboard.getKpis().getSoldUnits().getCurrent());
        System.out.println("Giá trị đơn TB (AOV): " + dashboard.getKpis().getAov().getCurrent());
        System.out.println("Tỷ lệ giảm giá: " + dashboard.getKpis().getDiscountRate().getCurrent() + "%");
        System.out.println("Doanh thu TikTok: " + dashboard.getKpis().getTiktokRevenue().getCurrent());
        System.out.println("Doanh thu Facebook: " + dashboard.getKpis().getFacebookRevenue().getCurrent());
        System.out.println("Doanh thu Zalo: " + dashboard.getKpis().getZaloRevenue().getCurrent());
        System.out.println("Khách mua lần đầu: " + dashboard.getKpis().getFirstTimeCustomers().getCurrent());
        System.out.println("Khách cũ: " + dashboard.getKpis().getReturningCustomers().getCurrent());
        System.out.println("Đơn SV: " + dashboard.getKpis().getStudentOrders().getCurrent());

        // Kiểm tra biểu đồ
        assertNotNull(dashboard.getDailyRevenue(), "Daily revenue không được null");
        System.out.println("Số điểm dữ liệu doanh thu theo ngày: " + dashboard.getDailyRevenue().size());

        assertNotNull(dashboard.getRevenueBySource(), "Doanh thu theo nguồn không được null");
        System.out.println("Số kênh bán hàng: " + dashboard.getRevenueBySource().size());

        assertNotNull(dashboard.getBrandMix(), "Phân bố hãng không được null");
        System.out.println("Số hãng laptop: " + dashboard.getBrandMix().size());
        assertFalse(dashboard.getBrandMix().isEmpty());

        assertNotNull(dashboard.getTopModels(), "Top model không được null");
        System.out.println("Số top model: " + dashboard.getTopModels().size());
    }
}
