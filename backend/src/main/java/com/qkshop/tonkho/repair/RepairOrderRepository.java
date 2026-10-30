package com.qkshop.tonkho.repair;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepairOrderRepository extends JpaRepository<RepairOrder, Long> {

    Optional<RepairOrder> findByOrderCode(String orderCode);

    List<RepairOrder> findAllByOrderByCreatedDateDesc();

    @Query("SELECT r FROM RepairOrder r WHERE LOWER(r.customerPhone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.deviceModel) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY r.createdDate DESC")
    List<RepairOrder> searchOrders(@Param("keyword") String keyword);
}
