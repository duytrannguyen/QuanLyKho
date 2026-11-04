package com.qkshop.tonkho.crm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CrmCustomerRepository extends JpaRepository<CrmCustomer, Long> {

    Optional<CrmCustomer> findByPhoneNormalized(String phoneNormalized);

    List<CrmCustomer> findByPhoneNormalizedIn(Collection<String> phones);

    /** Tìm theo SĐT hoặc tên; kw rỗng nghĩa là lấy tất cả. */
    @Query("""
        SELECT c FROM CrmCustomer c
        WHERE :kw = ''
           OR c.phoneNormalized LIKE CONCAT('%', :kw, '%')
           OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :kw, '%'))
        """)
    Page<CrmCustomer> search(@Param("kw") String kw, Pageable pageable);

    /**
     * Tìm kiếm nâng cao kết hợp phễu trạng thái chăm sóc khách hàng:
     * - CARE_DUE / MAINTENANCE_DUE: Khách có đơn đến hạn CS (Máy đến hạn vệ sinh định kỳ HOẶC Phụ kiện/Sửa chữa 7-14 ngày).
     * - APPOINTMENT_SET: Khách đang có lịch hẹn ghé shop hoặc hẹn gọi lại (careStatus = 'DANG_HEN').
     * - CARE_COMPLETED: Khách đã hoàn thành chăm sóc (đơn máy đã vệ sinh, đơn phụ kiện đã xong 1 lần và không có đơn nào đến hạn).
     * - WARRANTY_EXPIRING: Khách có máy sắp hết hạn bảo hành trong vòng 30 ngày.
     */
    @Query("""
        SELECT DISTINCT c FROM CrmCustomer c
        WHERE (:kw = '' OR c.phoneNormalized LIKE CONCAT('%', :kw, '%') OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :kw, '%')))
          AND (
            :filterType = '' OR :filterType = 'ALL'
            OR (:filterType = 'WARRANTY_EXPIRING' AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
                  AND s.warrantyExpiry IS NOT NULL 
                  AND s.warrantyExpiry >= CURRENT_DATE 
                  AND s.warrantyExpiry <= :expiringBefore
                  AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ))
            OR (:filterType = 'WARRANTY_EXPIRED' AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
                  AND s.warrantyExpiry IS NOT NULL 
                  AND s.warrantyExpiry < CURRENT_DATE
                  AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ))
            OR ((:filterType = 'CARE_DUE' OR :filterType = 'MAINTENANCE_DUE') AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND (
                      ( (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
                        AND (
                            (s.nextCareDate IS NOT NULL AND s.nextCareDate <= CURRENT_DATE)
                            OR
                            (s.nextCareDate IS NULL 
                             AND (s.careStatus IS NULL OR s.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_VE_SINH', 'DA_BAN_LAI', 'VOIDED'))
                             AND (
                                 ( (LOWER(s.segment) LIKE '%văn phòng%' OR LOWER(s.segment) LIKE '%van phong%') AND s.saleDate <= :twelveMonthsAgo )
                                 OR
                                 ( (s.segment IS NULL OR (LOWER(s.segment) NOT LIKE '%văn phòng%' AND LOWER(s.segment) NOT LIKE '%van phong%')) AND s.saleDate <= :sixMonthsAgo )
                             )
                            )
                        )
                      )
                      OR
                      ( (s.orderCategory IN ('ACCESSORY', 'REPAIR'))
                        AND (s.careStatus IS NULL OR s.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_BAN_LAI', 'VOIDED'))
                        AND s.saleDate <= :sevenDaysAgo
                        AND s.saleDate >= :fourteenDaysAgo
                      )
                  )
                  AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ))
            OR (:filterType = 'APPOINTMENT_SET' AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND s.careStatus = 'DANG_HEN'
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ))
            OR (:filterType = 'CARE_COMPLETED' AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND (s.careStatus = 'DA_VE_SINH' OR s.careStatus = 'HOAN_TAT_1_LAN')
                  AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ) AND NOT EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s2 
                WHERE s2.crmCustomerId = c.id 
                  AND (
                      ( (s2.orderCategory = 'MACHINE' OR s2.orderCategory IS NULL)
                        AND (
                            (s2.nextCareDate IS NOT NULL AND s2.nextCareDate <= CURRENT_DATE)
                            OR
                            (s2.nextCareDate IS NULL 
                             AND (s2.careStatus IS NULL OR s2.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_VE_SINH', 'DA_BAN_LAI', 'VOIDED'))
                             AND (s2.saleDate <= :sixMonthsAgo)
                            )
                        )
                      )
                      OR
                      ( (s2.orderCategory IN ('ACCESSORY', 'REPAIR'))
                        AND (s2.careStatus IS NULL OR s2.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_BAN_LAI', 'VOIDED'))
                        AND s2.saleDate <= :sevenDaysAgo AND s2.saleDate >= :fourteenDaysAgo
                      )
                  )
                  AND (s2.careStatus IS NULL OR s2.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
                  AND LOWER(s2.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s2.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s2.orderStatus) NOT LIKE '%trả%'
            ))
          )
        """)
    Page<CrmCustomer> searchWithFilter(
            @Param("kw") String kw,
            @Param("filterType") String filterType,
            @Param("expiringBefore") LocalDate expiringBefore,
            @Param("sixMonthsAgo") LocalDateTime sixMonthsAgo,
            @Param("twelveMonthsAgo") LocalDateTime twelveMonthsAgo,
            @Param("sevenDaysAgo") LocalDateTime sevenDaysAgo,
            @Param("fourteenDaysAgo") LocalDateTime fourteenDaysAgo,
            Pageable pageable);

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
              AND s.warrantyExpiry IS NOT NULL 
              AND s.warrantyExpiry >= CURRENT_DATE 
              AND s.warrantyExpiry <= :expiringBefore
              AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countWarrantyExpiring(@Param("expiringBefore") LocalDate expiringBefore);

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
              AND s.warrantyExpiry IS NOT NULL 
              AND s.warrantyExpiry < CURRENT_DATE
              AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countWarrantyExpired();

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND (
                  ( (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
                    AND (
                        (s.nextCareDate IS NOT NULL AND s.nextCareDate <= CURRENT_DATE)
                        OR
                        (s.nextCareDate IS NULL 
                         AND (s.careStatus IS NULL OR s.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_VE_SINH', 'DA_BAN_LAI', 'VOIDED'))
                         AND (
                             ( (LOWER(s.segment) LIKE '%văn phòng%' OR LOWER(s.segment) LIKE '%van phong%') AND s.saleDate <= :twelveMonthsAgo )
                             OR
                             ( (s.segment IS NULL OR (LOWER(s.segment) NOT LIKE '%văn phòng%' AND LOWER(s.segment) NOT LIKE '%van phong%')) AND s.saleDate <= :sixMonthsAgo )
                         )
                        )
                    )
                  )
                  OR
                  ( (s.orderCategory IN ('ACCESSORY', 'REPAIR'))
                    AND (s.careStatus IS NULL OR s.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_BAN_LAI', 'VOIDED'))
                    AND s.saleDate <= :sevenDaysAgo
                    AND s.saleDate >= :fourteenDaysAgo
                  )
              )
              AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countCareDue(
            @Param("sixMonthsAgo") LocalDateTime sixMonthsAgo,
            @Param("twelveMonthsAgo") LocalDateTime twelveMonthsAgo,
            @Param("sevenDaysAgo") LocalDateTime sevenDaysAgo,
            @Param("fourteenDaysAgo") LocalDateTime fourteenDaysAgo);

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND s.careStatus = 'DANG_HEN'
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countAppointments();

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND (s.careStatus = 'DA_VE_SINH' OR s.careStatus = 'HOAN_TAT_1_LAN')
              AND (s.careStatus IS NULL OR s.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        ) AND NOT EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s2 
            WHERE s2.crmCustomerId = c.id 
              AND (
                  ( (s2.orderCategory = 'MACHINE' OR s2.orderCategory IS NULL)
                    AND (
                        (s2.nextCareDate IS NOT NULL AND s2.nextCareDate <= CURRENT_DATE)
                        OR
                        (s2.nextCareDate IS NULL 
                         AND (s2.careStatus IS NULL OR s2.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_VE_SINH', 'DA_BAN_LAI', 'VOIDED'))
                         AND (s2.saleDate <= :sixMonthsAgo)
                        )
                    )
                  )
                  OR
                  ( (s2.orderCategory IN ('ACCESSORY', 'REPAIR'))
                    AND (s2.careStatus IS NULL OR s2.careStatus NOT IN ('HOAN_TAT_1_LAN', 'DA_BAN_LAI', 'VOIDED'))
                    AND s2.saleDate <= :sevenDaysAgo AND s2.saleDate >= :fourteenDaysAgo
                  )
              )
              AND (s2.careStatus IS NULL OR s2.careStatus NOT IN ('DA_BAN_LAI', 'VOIDED'))
              AND LOWER(s2.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s2.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s2.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countCareCompleted(
            @Param("sixMonthsAgo") LocalDateTime sixMonthsAgo,
            @Param("sevenDaysAgo") LocalDateTime sevenDaysAgo,
            @Param("fourteenDaysAgo") LocalDateTime fourteenDaysAgo);
}
