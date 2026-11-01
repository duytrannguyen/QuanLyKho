package com.qkshop.tonkho.crm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    /** Tìm kiếm nâng cao kết hợp bộ lọc (Bảo hành sắp hết trong 30 ngày, Bảo dưỡng định kỳ: Văn phòng 12 tháng, Dòng khác 6 tháng). */
    @Query("""
        SELECT DISTINCT c FROM CrmCustomer c
        WHERE (:kw = '' OR c.phoneNormalized LIKE CONCAT('%', :kw, '%') OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :kw, '%')))
          AND (
            :filterType = '' OR :filterType = 'ALL'
            OR (:filterType = 'WARRANTY_EXPIRING' AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND s.warrantyExpiry IS NOT NULL 
                  AND s.warrantyExpiry >= CURRENT_DATE 
                  AND s.warrantyExpiry <= :expiringBefore
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ))
            OR (:filterType = 'MAINTENANCE_DUE' AND EXISTS (
                SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
                WHERE s.crmCustomerId = c.id 
                  AND (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
                  AND (
                      ( (LOWER(s.segment) LIKE '%văn phòng%' OR LOWER(s.segment) LIKE '%van phong%') AND s.saleDate <= :twelveMonthsAgo )
                      OR
                      ( (s.segment IS NULL OR (LOWER(s.segment) NOT LIKE '%văn phòng%' AND LOWER(s.segment) NOT LIKE '%van phong%')) AND s.saleDate <= :sixMonthsAgo )
                  )
                  AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
                  AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
                  AND LOWER(s.orderStatus) NOT LIKE '%trả%'
            ))
          )
        """)
    Page<CrmCustomer> searchWithFilter(
            @Param("kw") String kw,
            @Param("filterType") String filterType,
            @Param("expiringBefore") java.time.LocalDate expiringBefore,
            @Param("sixMonthsAgo") java.time.LocalDateTime sixMonthsAgo,
            @Param("twelveMonthsAgo") java.time.LocalDateTime twelveMonthsAgo,
            Pageable pageable);

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND s.warrantyExpiry IS NOT NULL 
              AND s.warrantyExpiry >= CURRENT_DATE 
              AND s.warrantyExpiry <= :expiringBefore
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countWarrantyExpiring(@Param("expiringBefore") java.time.LocalDate expiringBefore);

    @Query("""
        SELECT COUNT(DISTINCT c.id) FROM CrmCustomer c
        WHERE EXISTS (
            SELECT 1 FROM com.qkshop.tonkho.salesreport.SalesOrder s 
            WHERE s.crmCustomerId = c.id 
              AND (s.orderCategory = 'MACHINE' OR s.orderCategory IS NULL)
              AND (
                  ( (LOWER(s.segment) LIKE '%văn phòng%' OR LOWER(s.segment) LIKE '%van phong%') AND s.saleDate <= :twelveMonthsAgo )
                  OR
                  ( (s.segment IS NULL OR (LOWER(s.segment) NOT LIKE '%văn phòng%' AND LOWER(s.segment) NOT LIKE '%van phong%')) AND s.saleDate <= :sixMonthsAgo )
              )
              AND LOWER(s.orderStatus) NOT LIKE '%hủy%'
              AND LOWER(s.orderStatus) NOT LIKE '%huỷ%'
              AND LOWER(s.orderStatus) NOT LIKE '%trả%'
        )
        """)
    long countMaintenanceDue(
            @Param("sixMonthsAgo") java.time.LocalDateTime sixMonthsAgo,
            @Param("twelveMonthsAgo") java.time.LocalDateTime twelveMonthsAgo);
}
