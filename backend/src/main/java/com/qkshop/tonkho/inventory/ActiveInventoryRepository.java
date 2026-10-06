package com.qkshop.tonkho.inventory;

import com.qkshop.tonkho.inventory.ActiveInventory;
import com.qkshop.tonkho.inventory.CycleState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ActiveInventoryRepository extends JpaRepository<ActiveInventory, Long> {
    Optional<ActiveInventory> findByCycleId(String cycleId);
    Optional<ActiveInventory> findBySerialKey(String serialKey);
    boolean existsBySerialKey(String serialKey);
    List<ActiveInventory> findByState(CycleState state);
    long countByState(CycleState state);
    long count();

    @Query("SELECT ai FROM ActiveInventory ai WHERE ai.config.configId = :configId AND ai.state = :state")
    List<ActiveInventory> findByConfigIdAndState(@Param("configId") String configId, @Param("state") CycleState state);

    Page<ActiveInventory> findByState(CycleState state, Pageable pageable);

    @Query("SELECT ai FROM ActiveInventory ai WHERE ai.config.variant.platform.platformId = :platformId")
    List<ActiveInventory> findByPlatformId(@Param("platformId") String platformId);

    List<ActiveInventory> findByIntakeAtBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);

    @Query("SELECT sum(ai.salePrice) FROM ActiveInventory ai WHERE ai.salePrice IS NOT NULL")
    java.math.BigDecimal sumTotalInventoryValue();

    @Query("SELECT COUNT(ai) FROM ActiveInventory ai WHERE ai.salePrice IS NULL OR ai.salePrice <= 0")
    long countWithoutPrice();

    @Query("SELECT COALESCE(b.brandName, 'Khác') AS name, SUM(ai.salePrice) AS total " +
           "FROM ActiveInventory ai " +
           "LEFT JOIN ai.config c LEFT JOIN c.variant v LEFT JOIN v.platform p " +
           "LEFT JOIN p.modelLine m " +
           "LEFT JOIN m.brand b " +
           "WHERE (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId) " +
           "GROUP BY COALESCE(b.brandName, 'Khác')")
    List<com.qkshop.tonkho.analytics.dto.BrandValueProjection> getValueStructure(@Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT CASE " +
           "  WHEN DATEDIFF(CURRENT_DATE, ai.intakeAt) < 30 THEN 'Dưới 30 ngày' " +
           "  WHEN DATEDIFF(CURRENT_DATE, ai.intakeAt) < 60 THEN '30 - 60 ngày' " +
           "  WHEN DATEDIFF(CURRENT_DATE, ai.intakeAt) < 90 THEN '60 - 90 ngày' " +
           "  ELSE 'Trên 90 ngày' END AS ageGroup, " +
           "COUNT(ai) AS count " +
           "FROM ActiveInventory ai " +
           "LEFT JOIN ai.config c LEFT JOIN c.variant v LEFT JOIN v.platform p " +
           "LEFT JOIN p.modelLine m " +
           "LEFT JOIN m.brand b " +
           "WHERE (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId) " +
           "GROUP BY CASE " +
           "  WHEN DATEDIFF(CURRENT_DATE, ai.intakeAt) < 30 THEN 'Dưới 30 ngày' " +
           "  WHEN DATEDIFF(CURRENT_DATE, ai.intakeAt) < 60 THEN '30 - 60 ngày' " +
           "  WHEN DATEDIFF(CURRENT_DATE, ai.intakeAt) < 90 THEN '60 - 90 ngày' " +
           "  ELSE 'Trên 90 ngày' END")
    List<com.qkshop.tonkho.analytics.dto.AgeGroupProjection> getInventoryAgeGrouped(@Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN ai.config c LEFT JOIN c.variant v LEFT JOIN v.platform p " +
           "LEFT JOIN p.modelLine m " +
           "LEFT JOIN m.brand b " +
           "WHERE ai.intakeAt >= :from AND ai.intakeAt <= :to " +
           "  AND (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ActiveInventory> findFilteredImported(@Param("from") java.time.LocalDateTime from, @Param("to") java.time.LocalDateTime to, @Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN ai.config c LEFT JOIN c.variant v LEFT JOIN v.platform p " +
           "LEFT JOIN p.modelLine m " +
           "LEFT JOIN m.brand b " +
           "WHERE (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ActiveInventory> findFilteredAll(@Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);
}
