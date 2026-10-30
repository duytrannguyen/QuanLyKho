package com.qkshop.tonkho.accessory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessoryOrderItemRepository extends JpaRepository<AccessoryOrderItem, Long> {

    List<AccessoryOrderItem> findByOrderId(Long orderId);

    @Query("SELECT i FROM AccessoryOrderItem i JOIN FETCH i.order o " +
           "WHERE LOWER(o.customerPhone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(o.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(i.serialNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(i.sku) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY o.saleDate DESC")
    List<AccessoryOrderItem> searchWarrantyItems(@Param("keyword") String keyword);
}
