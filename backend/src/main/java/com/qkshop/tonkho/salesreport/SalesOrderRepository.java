package com.qkshop.tonkho.salesreport;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {

    Optional<SalesOrder> findByTransactionId(String transactionId);

    Optional<SalesOrder> findByMatchedCycleId(String matchedCycleId);

    List<SalesOrder> findBySerialKeysContaining(String serialKey);

    boolean existsByTransactionId(String transactionId);

    /**
     * Interface projection cho các truy vấn tổng hợp nhóm.
     */
    interface GroupAggregate {
        String getGroupName();
        Long getOrderCount();
        Double getTotalRevenue();
        Double getGrossRevenue();
        Double getTotalDiscount();
    }

    interface DailyRevenueAggregate {
        String getSaleDateStr();
        Long getOrderCount();
        Double getTotalRevenue();
    }

    /**
     * Thống kê KPI tổng quan trong một khoảng thời gian cho các đơn hợp lệ
     * (order_status = 'Hoàn tất', payment_status = 'Đã thanh toán', net_revenue > 0)
     */
    @Query("""
        SELECT
            COUNT(s) AS totalOrders,
            COALESCE(SUM(s.netRevenue), 0) AS totalNetRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS totalGrossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount,
            COALESCE(SUM(CASE WHEN LOWER(s.customerType) LIKE '%đầu%' THEN 1 ELSE 0 END), 0) AS firstTimeCustomerCount,
            COALESCE(SUM(CASE WHEN LOWER(s.customerType) LIKE '%cũ%' OR LOWER(s.customerType) LIKE '%trước%' THEN 1 ELSE 0 END), 0) AS returningCustomerCount,
            COALESCE(SUM(CASE WHEN s.isStudent = true THEN 1 ELSE 0 END), 0) AS studentCount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
    """)
    Object[] getSummaryKpis(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Doanh thu và số đơn theo từng ngày trong kỳ.
     */
    @Query("""
        SELECT
            FUNCTION('DATE_FORMAT', s.saleDate, '%Y-%m-%d') AS saleDateStr,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY FUNCTION('DATE_FORMAT', s.saleDate, '%Y-%m-%d')
        ORDER BY saleDateStr ASC
    """)
    List<DailyRevenueAggregate> getDailyRevenue(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Top model bán chạy nhất theo doanh thu / số đơn.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(s.modelName, ''), 'Chưa rõ model') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY s.modelName
        ORDER BY totalRevenue DESC
    """)
    List<GroupAggregate> getTopModels(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Doanh thu và số đơn theo Nguồn chốt chuẩn hoá.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(s.normalizedSource, ''), 'Chưa rõ') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY s.normalizedSource
        ORDER BY totalRevenue DESC
    """)
    List<GroupAggregate> getRevenueBySource(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu theo Hãng máy.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(s.brand, ''), 'Khác') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY s.brand
        ORDER BY totalRevenue DESC
    """)
    List<GroupAggregate> getBrandMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu theo Series máy.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(s.series, ''), 'Khác') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY s.series
        ORDER BY orderCount DESC
    """)
    List<GroupAggregate> getSeriesMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu theo Phân khúc.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(s.segment, ''), 'Chưa xác định') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY s.segment
        ORDER BY totalRevenue DESC
    """)
    List<GroupAggregate> getSegmentMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu theo Nguồn tiếp cận đầu tiên.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(TRIM(s.firstSource), ''), 'Chưa rõ') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY COALESCE(NULLIF(TRIM(s.firstSource), ''), 'Chưa rõ')
        ORDER BY orderCount DESC
    """)
    List<GroupAggregate> getFirstSourceMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu Đơn có inbox vs Mua thẳng.
     */
    @Query("""
        SELECT
            COALESCE(NULLIF(TRIM(s.inboxType), ''), 'Đơn mua thẳng') AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY COALESCE(NULLIF(TRIM(s.inboxType), ''), 'Đơn mua thẳng')
        ORDER BY orderCount DESC
    """)
    List<GroupAggregate> getInboxTypeMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu Khách hàng mới vs Khách cũ.
     */
    @Query("""
        SELECT
            CASE 
                WHEN TRIM(LOWER(s.customerType)) LIKE '%lần đầu%' OR TRIM(LOWER(s.customerType)) LIKE '%mới%' THEN 'Khách mua lần đầu'
                WHEN TRIM(LOWER(s.customerType)) LIKE '%cũ%' OR TRIM(LOWER(s.customerType)) LIKE '%quen%' THEN 'Khách cũ'
                ELSE 'Chưa rõ'
            END AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY 
            CASE 
                WHEN TRIM(LOWER(s.customerType)) LIKE '%lần đầu%' OR TRIM(LOWER(s.customerType)) LIKE '%mới%' THEN 'Khách mua lần đầu'
                WHEN TRIM(LOWER(s.customerType)) LIKE '%cũ%' OR TRIM(LOWER(s.customerType)) LIKE '%quen%' THEN 'Khách cũ'
                ELSE 'Chưa rõ'
            END
        ORDER BY orderCount DESC
    """)
    List<GroupAggregate> getCustomerTypeMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu Học sinh/sinh viên vs Người đi làm.
     */
    @Query("""
        SELECT
            CASE 
                WHEN s.isStudent = true THEN 'Học sinh / Sinh viên'
                WHEN s.isStudent = false THEN 'Đi làm / Khác'
                ELSE 'Chưa rõ'
            END AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY 
            CASE 
                WHEN s.isStudent = true THEN 'Học sinh / Sinh viên'
                WHEN s.isStudent = false THEN 'Đi làm / Khác'
                ELSE 'Chưa rõ'
            END
        ORDER BY orderCount DESC
    """)
    List<GroupAggregate> getStudentMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Cơ cấu theo Ngành hàng (Máy móc / Phụ kiện / Sửa chữa).
     */
    @Query("""
        SELECT
            CASE 
                WHEN s.orderCategory = 'ACCESSORY' THEN 'Phụ kiện'
                WHEN s.orderCategory = 'REPAIR' THEN 'Dịch vụ sửa chữa'
                ELSE 'Máy móc'
            END AS groupName,
            COUNT(s) AS orderCount,
            COALESCE(SUM(s.netRevenue), 0) AS totalRevenue,
            COALESCE(SUM(s.grossRevenue), 0) AS grossRevenue,
            COALESCE(SUM(s.discount), 0) AS totalDiscount
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND s.orderStatus = 'Hoàn tất'
          AND (s.paymentStatus = 'Đã thanh toán' OR s.paymentStatus IS NULL)
          AND s.netRevenue > 0
        GROUP BY 
            CASE 
                WHEN s.orderCategory = 'ACCESSORY' THEN 'Phụ kiện'
                WHEN s.orderCategory = 'REPAIR' THEN 'Dịch vụ sửa chữa'
                ELSE 'Máy móc'
            END
        ORDER BY totalRevenue DESC
    """)
    List<GroupAggregate> getCategoryMix(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Đếm số đơn cần kiểm tra chất lượng dữ liệu (thiếu nguồn, thiếu hãng...).
     */
    @Query("""
        SELECT COUNT(s)
        FROM SalesOrder s
        WHERE s.saleDate >= :start AND s.saleDate <= :end
          AND (s.dataQualityStatus IS NOT NULL AND s.dataQualityStatus <> 'OK')
    """)
    long countDataIssuesInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
