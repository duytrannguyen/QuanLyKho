package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.inventory.ClosedCycle;
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
    List<ClosedCycle> findByCloseType(CloseType closeType);

    @Query("SELECT cc FROM ClosedCycle cc WHERE (LOWER(cc.serialKey) LIKE LOWER(CONCAT('%', :keyword, '%')) OR cc.customerPhone LIKE CONCAT('%', :keyword, '%')) AND cc.closeType = 'SALE' ORDER BY cc.saleDate DESC")
    List<ClosedCycle> searchWarranty(@Param("keyword") String keyword);

    @Query("SELECT cc FROM ClosedCycle cc WHERE cc.closedAt BETWEEN :from AND :to")
    List<ClosedCycle> findByClosedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT cc FROM ClosedCycle cc WHERE cc.closeType = :type AND cc.closedAt BETWEEN :from AND :to")
    List<ClosedCycle> findByCloseTypeAndClosedAtBetween(
            @Param("type") CloseType type, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    long countByCloseType(CloseType closeType);

    @Query("SELECT cc FROM ClosedCycle cc " +
           "LEFT JOIN cc.config c LEFT JOIN c.variant v LEFT JOIN v.platform p " +
           "LEFT JOIN p.modelLine m " +
           "LEFT JOIN m.brand b " +
           "WHERE cc.closedAt >= :from AND cc.closedAt <= :to " +
           "  AND (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ClosedCycle> findFilteredExported(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    List<ClosedCycle> findAll(org.springframework.data.domain.Sort sort);
}
