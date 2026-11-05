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
                AND (s.transactionId IS NULL OR s.transactionId NOT LIKE 'PK-KEM-%')
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

    List<SalesOrder> findByCrmCustomerIdInOrderBySaleDateDescIdDesc(Collection<Long> customerIds);

    long countByCrmCustomerId(Long customerId);

    long countByCrmCustomerIdIsNull();

    Optional<SalesOrder> findFirstByCrmCustomerIdAndCustomerNameIsNotNullAndCustomerNameNotOrderBySaleDateDescIdDesc(
            Long customerId, String emptyName);

    Optional<SalesOrder> findFirstByCrmCustomerIdAndCustomerTypeIsNotNullAndCustomerTypeNotOrderBySaleDateDescIdDesc(
            Long customerId, String emptyType);

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

    @Query("SELECT s.id FROM SalesOrder s WHERE s.crmCustomerId IS NULL AND s.customerPhone IS NOT NULL AND TRIM(s.customerPhone) <> ''")
    List<Long> findUnlinkedCandidateOrders();

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

    @Query("""
        SELECT s FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < CURRENT_DATE
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
          AND (:kw = '' OR LOWER(s.transactionId) LIKE LOWER(CONCAT('%', :kw, '%'))
                        OR LOWER(s.customerName) LIKE LOWER(CONCAT('%', :kw, '%'))
                        OR s.customerPhone LIKE CONCAT('%', :kw, '%')
                        OR LOWER(s.serialKeys) LIKE LOWER(CONCAT('%', :kw, '%'))
                        OR LOWER(s.productName) LIKE LOWER(CONCAT('%', :kw, '%')))
          AND (:brand = '' OR LOWER(s.brand) = LOWER(:brand))
          AND (
               :range = '' OR :range = 'ALL'
               OR (:range = 'LAST_30_DAYS' AND s.warrantyExpiry >= :thirtyDaysAgo)
               OR (:range = '1_TO_3_MONTHS' AND s.warrantyExpiry < :thirtyDaysAgo AND s.warrantyExpiry >= :threeMonthsAgo)
               OR (:range = '3_TO_6_MONTHS' AND s.warrantyExpiry < :threeMonthsAgo AND s.warrantyExpiry >= :sixMonthsAgo)
               OR (:range = 'OVER_6_MONTHS' AND s.warrantyExpiry < :sixMonthsAgo)
          )
        ORDER BY s.warrantyExpiry DESC, s.id DESC
        """)
    Page<SalesOrder> findExpiredWarrantyOrders(
            @Param("kw") String kw,
            @Param("brand") String brand,
            @Param("range") String range,
            @Param("thirtyDaysAgo") java.time.LocalDate thirtyDaysAgo,
            @Param("threeMonthsAgo") java.time.LocalDate threeMonthsAgo,
            @Param("sixMonthsAgo") java.time.LocalDate sixMonthsAgo,
            Pageable pageable);

    @Query("""
        SELECT s FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < CURRENT_DATE
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
          AND (:kw = '' OR LOWER(s.transactionId) LIKE LOWER(CONCAT('%', :kw, '%'))
                        OR LOWER(s.customerName) LIKE LOWER(CONCAT('%', :kw, '%'))
                        OR s.customerPhone LIKE CONCAT('%', :kw, '%')
                        OR LOWER(s.serialKeys) LIKE LOWER(CONCAT('%', :kw, '%'))
                        OR LOWER(s.productName) LIKE LOWER(CONCAT('%', :kw, '%')))
          AND (:brand = '' OR LOWER(s.brand) = LOWER(:brand))
          AND (
               :range = '' OR :range = 'ALL'
               OR (:range = 'LAST_30_DAYS' AND s.warrantyExpiry >= :thirtyDaysAgo)
               OR (:range = '1_TO_3_MONTHS' AND s.warrantyExpiry < :thirtyDaysAgo AND s.warrantyExpiry >= :threeMonthsAgo)
               OR (:range = '3_TO_6_MONTHS' AND s.warrantyExpiry < :threeMonthsAgo AND s.warrantyExpiry >= :sixMonthsAgo)
               OR (:range = 'OVER_6_MONTHS' AND s.warrantyExpiry < :sixMonthsAgo)
          )
        ORDER BY s.warrantyExpiry DESC, s.id DESC
        """)
    List<SalesOrder> findAllExpiredWarrantyOrders(
            @Param("kw") String kw,
            @Param("brand") String brand,
            @Param("range") String range,
            @Param("thirtyDaysAgo") java.time.LocalDate thirtyDaysAgo,
            @Param("threeMonthsAgo") java.time.LocalDate threeMonthsAgo,
            @Param("sixMonthsAgo") java.time.LocalDate sixMonthsAgo);

    @Query("""
        SELECT COUNT(s) FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < CURRENT_DATE
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
        """)
    long countTotalExpiredWarranty();

    @Query("""
        SELECT COUNT(s) FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < CURRENT_DATE
          AND s.warrantyExpiry >= :thirtyDaysAgo
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
        """)
    long countExpiredWithin30Days(@Param("thirtyDaysAgo") java.time.LocalDate thirtyDaysAgo);

    @Query("""
        SELECT COUNT(s) FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < :thirtyDaysAgo
          AND s.warrantyExpiry >= :threeMonthsAgo
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
        """)
    long countExpired1To3Months(@Param("thirtyDaysAgo") java.time.LocalDate thirtyDaysAgo,
                                @Param("threeMonthsAgo") java.time.LocalDate threeMonthsAgo);

    @Query("""
        SELECT COUNT(s) FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < :threeMonthsAgo
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
        """)
    long countExpiredOver3Months(@Param("threeMonthsAgo") java.time.LocalDate threeMonthsAgo);

    @Query("""
        SELECT DISTINCT s.brand FROM SalesOrder s
        WHERE (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
          AND s.warrantyExpiry IS NOT NULL
          AND s.warrantyExpiry < CURRENT_DATE
          AND s.brand IS NOT NULL AND TRIM(s.brand) <> ''
          AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
          AND (s.orderStatus IS NULL OR (
                LOWER(s.orderStatus) NOT LIKE '%hủy%' 
            AND LOWER(s.orderStatus) NOT LIKE '%huỷ%' 
            AND LOWER(s.orderStatus) NOT LIKE '%trả%' 
            AND LOWER(s.orderStatus) NOT LIKE '%cancel%'))
        ORDER BY s.brand ASC
        """)
    List<String> findExpiredWarrantyBrands();
}
