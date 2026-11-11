package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.core.enums.CloseType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ClosedCycleRepository extends JpaRepository<ClosedCycle, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<ClosedCycle> {
    Optional<ClosedCycle> findByCycleId(String cycleId);
    List<ClosedCycle> findBySerialKey(String serialKey);
    List<ClosedCycle> findBySerialKeyOrderByClosedAtDesc(String serialKey);
    Optional<ClosedCycle> findTopBySerialKeyOrderByClosedAtDesc(String serialKey);
    List<ClosedCycle> findBySerialKeyInOrderByClosedAtDesc(java.util.Collection<String> serialKeys);
    List<ClosedCycle> findByCloseType(CloseType closeType);

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN FETCH cc.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m LEFT JOIN FETCH m.brand b")
    List<ClosedCycle> findAllWithHierarchy();

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN FETCH cc.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m LEFT JOIN FETCH m.brand b " +
           "WHERE cc.closeType = :closeType")
    List<ClosedCycle> findByCloseTypeWithHierarchy(@Param("closeType") CloseType closeType);

    boolean existsBySourceReference(String sourceReference);

    @Query("SELECT cc.sourceReference FROM ClosedCycle cc WHERE (cc.saleDate >= :startOfMonth AND cc.saleDate < :endOfMonth OR (cc.saleDate IS NULL AND cc.closedAt >= :startOfMonth AND cc.closedAt < :endOfMonth)) AND cc.sourceReference LIKE 'BM%'")
    List<String> findMachineInvoiceCodesInMonth(@Param("startOfMonth") LocalDateTime startOfMonth, @Param("endOfMonth") LocalDateTime endOfMonth);

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN FETCH cc.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m LEFT JOIN FETCH m.brand b " +
           "WHERE (LOWER(cc.serialKey) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR cc.customerPhone LIKE CONCAT('%', :keyword, '%') " +
           "OR LOWER(cc.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(cc.cycleId) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(cc.sourceReference) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND cc.closeType IN (com.qkshop.tonkho.core.enums.CloseType.SALE, com.qkshop.tonkho.core.enums.CloseType.CUSTOMER_RETURN) " +
           "ORDER BY cc.saleDate DESC, cc.id DESC")
    List<ClosedCycle> searchWarranty(@Param("keyword") String keyword);

    @Query("SELECT cc FROM ClosedCycle cc WHERE cc.closedAt BETWEEN :from AND :to")
    List<ClosedCycle> findByClosedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT cc FROM ClosedCycle cc WHERE cc.closeType = :type AND cc.closedAt BETWEEN :from AND :to")
    List<ClosedCycle> findByCloseTypeAndClosedAtBetween(
            @Param("type") CloseType type, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    long countByCloseType(CloseType closeType);

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN FETCH cc.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m " +
           "LEFT JOIN FETCH m.brand b " +
           "WHERE cc.closedAt >= :from AND cc.closedAt <= :to " +
           "  AND (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ClosedCycle> findFilteredExported(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN FETCH cc.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m " +
           "LEFT JOIN FETCH m.brand b " +
           "WHERE cc.intakeAt >= :from AND cc.intakeAt <= :to " +
           "  AND (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ClosedCycle> findFilteredImported(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN FETCH cc.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m LEFT JOIN FETCH m.brand b " +
           "WHERE cc.isShipping = true " +
           "AND cc.closeType = com.qkshop.tonkho.core.enums.CloseType.SALE " +
           "AND (:isDelivered IS NULL OR cc.isDelivered = :isDelivered) " +
           "AND (:keyword IS NULL OR :keyword = '' OR " +
           "     LOWER(cc.serialKey) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     cc.customerPhone LIKE CONCAT('%', :keyword, '%') OR " +
           "     LOWER(cc.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(cc.sourceReference) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(cc.cycleId) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY cc.saleDate DESC, cc.id DESC")
    List<ClosedCycle> findShippingOrders(@Param("isDelivered") Boolean isDelivered, @Param("keyword") String keyword);

    long countByIsShippingTrueAndCloseType(CloseType closeType);
    long countByIsShippingTrueAndIsDeliveredFalseAndCloseType(CloseType closeType);
    long countByIsShippingTrueAndIsDeliveredTrueAndCloseType(CloseType closeType);

    default long countByIsShippingTrue() {
        return countByIsShippingTrueAndCloseType(CloseType.SALE);
    }

    default long countByIsShippingTrueAndIsDeliveredFalse() {
        return countByIsShippingTrueAndIsDeliveredFalseAndCloseType(CloseType.SALE);
    }

    default long countByIsShippingTrueAndIsDeliveredTrue() {
        return countByIsShippingTrueAndIsDeliveredTrueAndCloseType(CloseType.SALE);
    }

    List<ClosedCycle> findAll(org.springframework.data.domain.Sort sort);
}
