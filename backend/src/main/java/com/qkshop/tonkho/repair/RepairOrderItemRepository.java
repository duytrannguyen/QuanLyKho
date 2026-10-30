package com.qkshop.tonkho.repair;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepairOrderItemRepository extends JpaRepository<RepairOrderItem, Long> {

    List<RepairOrderItem> findByRepairOrderId(Long repairOrderId);

    @Query("SELECT i FROM RepairOrderItem i JOIN FETCH i.repairOrder r " +
           "WHERE LOWER(r.customerPhone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.deviceModel) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(i.serviceName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY r.createdDate DESC")
    List<RepairOrderItem> searchWarrantyItems(@Param("keyword") String keyword);
}
