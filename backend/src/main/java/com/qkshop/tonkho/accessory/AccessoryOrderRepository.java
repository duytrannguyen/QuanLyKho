package com.qkshop.tonkho.accessory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccessoryOrderRepository extends JpaRepository<AccessoryOrder, Long> {

    Optional<AccessoryOrder> findByOrderCode(String orderCode);

    List<AccessoryOrder> findAllByOrderBySaleDateDesc();

    @Query("SELECT o FROM AccessoryOrder o WHERE LOWER(o.customerPhone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(o.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY o.saleDate DESC")
    List<AccessoryOrder> searchOrders(@Param("keyword") String keyword);

    boolean existsByOrderCode(String orderCode);

    @Query("SELECT o.orderCode FROM AccessoryOrder o WHERE o.saleDate >= :startOfMonth AND o.saleDate < :endOfMonth AND o.orderCode LIKE 'PK%'")
    List<String> findOrderCodesInMonth(@Param("startOfMonth") java.time.LocalDateTime startOfMonth, @Param("endOfMonth") java.time.LocalDateTime endOfMonth);

    @Query("SELECT o FROM AccessoryOrder o JOIN FETCH o.items WHERE LOWER(o.customerPhone) = LOWER(:phone) ORDER BY o.saleDate DESC")
    List<AccessoryOrder> findByCustomerPhoneWithItems(@Param("phone") String phone);
}
