package com.qkshop.tonkho.crm;

import com.qkshop.tonkho.salesreport.SalesOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Truy vấn SalesOrder dành riêng cho CRM (tách khỏi SalesOrderRepository của module báo cáo).
 * Đơn "hợp lệ" = không phải Hủy / Trả hàng.
 */
@Repository
public interface CrmOrderRepository extends JpaRepository<SalesOrder, Long> {

    interface OrderAggregate {
        Long getTotalOrders();
        BigDecimal getTotalSpent();
        LocalDateTime getFirstOrderAt();
        LocalDateTime getLastOrderAt();
    }

    @Query("""
        SELECT
            COALESCE(SUM(CASE WHEN (s.orderStatus IS NULL OR (
                    LOWER(s.orderStatus) NOT LIKE '%hủy%' AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                    AND LOWER(s.orderStatus) NOT LIKE '%trả%' AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
                AND (s.transactionId NOT LIKE 'PK-KEM-%')
                THEN 1 ELSE 0 END), 0) AS totalOrders,
            COALESCE(SUM(CASE WHEN (s.orderStatus IS NULL OR (
                    LOWER(s.orderStatus) NOT LIKE '%hủy%' AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                    AND LOWER(s.orderStatus) NOT LIKE '%trả%' AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
                THEN s.netRevenue ELSE 0 END), 0) AS totalSpent,
            MIN(CASE WHEN (s.orderStatus IS NULL OR (
                    LOWER(s.orderStatus) NOT LIKE '%hủy%' AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                    AND LOWER(s.orderStatus) NOT LIKE '%trả%' AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
                THEN s.saleDate ELSE NULL END) AS firstOrderAt,
            MAX(CASE WHEN (s.orderStatus IS NULL OR (
                    LOWER(s.orderStatus) NOT LIKE '%hủy%' AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                    AND LOWER(s.orderStatus) NOT LIKE '%trả%' AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
                THEN s.saleDate ELSE NULL END) AS lastOrderAt
        FROM SalesOrder s
        WHERE s.crmCustomerId = :customerId
        """)
    OrderAggregate aggregateByCustomer(@Param("customerId") Long customerId);

    List<SalesOrder> findByCrmCustomerIdOrderBySaleDateDescIdDesc(Long customerId);

    long countByCrmCustomerId(Long customerId);

    long countByCrmCustomerIdIsNull();

    /** Đơn mới nhất của khách có tên (dùng làm tên hiển thị hồ sơ). */
    Optional<SalesOrder> findFirstByCrmCustomerIdAndCustomerNameIsNotNullAndCustomerNameNotOrderBySaleDateDescIdDesc(
            Long customerId, String emptyName);

    Optional<SalesOrder> findFirstByCrmCustomerIdAndCustomerTypeIsNotNullAndCustomerTypeNotOrderBySaleDateDescIdDesc(
            Long customerId, String emptyType);

    /** Danh sách hóa đơn của khách, lọc tùy chọn theo loại đơn (cat rỗng = tất cả). */
    @Query("""
        SELECT s FROM SalesOrder s
        WHERE s.crmCustomerId = :customerId
          AND (:cat = '' OR s.orderCategory = :cat OR (:cat = 'MACHINE' AND s.orderCategory IS NULL))
        ORDER BY s.saleDate DESC, s.id DESC
        """)
    Page<SalesOrder> findOrdersOfCustomer(@Param("customerId") Long customerId,
                                          @Param("cat") String category,
                                          Pageable pageable);

    @Query("""
        SELECT s FROM SalesOrder s
        WHERE s.crmCustomerId IS NULL
        ORDER BY s.saleDate DESC, s.id DESC
        """)
    Page<SalesOrder> findUnlinkedOrders(Pageable pageable);

    @Query("SELECT s.id FROM SalesOrder s WHERE s.crmCustomerId = :customerId")
    List<Long> findOrderIdsByCustomer(@Param("customerId") Long customerId);

    @Query("SELECT DISTINCT s.crmCustomerId FROM SalesOrder s WHERE s.crmCustomerId IS NOT NULL")
    List<Long> findAllLinkedCustomerIds();

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE sales_orders SET crm_customer_id = :customerId WHERE id IN (:ids)", nativeQuery = true)
    int assignCustomer(@Param("customerId") Long customerId, @Param("ids") Collection<Long> ids);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE sales_orders SET crm_customer_id = NULL WHERE id IN (:ids)", nativeQuery = true)
    int clearCustomer(@Param("ids") Collection<Long> ids);
}
