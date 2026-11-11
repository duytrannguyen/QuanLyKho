package com.qkshop.tonkho.inventory;

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
    Optional<ActiveInventory> findBySerialKeyIgnoreCaseOrCycleId(String serialKey, String cycleId);
    boolean existsBySerialKey(String serialKey);

    @Query("SELECT ai.serialKey FROM ActiveInventory ai WHERE ai.serialKey IN (:serialKeys)")
    java.util.Set<String> findExistingSerialKeysIn(@Param("serialKeys") java.util.Collection<String> serialKeys);

    List<ActiveInventory> findBySerialKeyIn(java.util.Collection<String> serialKeys);

    @Query("SELECT ai FROM ActiveInventory ai LEFT JOIN FETCH ai.config WHERE ai.cycleId IN (:cycleIds)")
    List<ActiveInventory> findByCycleIdIn(@Param("cycleIds") java.util.Collection<String> cycleIds);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m LEFT JOIN FETCH m.brand b")
    List<ActiveInventory> findAllWithHierarchy();

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m LEFT JOIN FETCH m.brand b " +
           "WHERE ai.state = :state")
    List<ActiveInventory> findByStateWithHierarchy(@Param("state") CycleState state);

    List<ActiveInventory> findByState(CycleState state);
    long countByState(CycleState state);
    long count();

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c " +
           "WHERE (LOWER(ai.serialKey) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "   OR LOWER(ai.sourceModelText) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "   OR LOWER(c.configId) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "   OR LOWER(c.displayName) LIKE LOWER(CONCAT('%', :kw, '%')))")
    List<ActiveInventory> searchSaleCandidates(@Param("kw") String keyword);

    @Query("SELECT ai FROM ActiveInventory ai WHERE ai.config.configId = :configId AND ai.state = :state")
    List<ActiveInventory> findByConfigIdAndState(@Param("configId") String configId, @Param("state") CycleState state);

    Page<ActiveInventory> findByState(CycleState state, Pageable pageable);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "WHERE p.platformId = :platformId")
    List<ActiveInventory> findByPlatformId(@Param("platformId") String platformId);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "WHERE p.platformId IN :platformIds")
    List<ActiveInventory> findByPlatformIds(@Param("platformIds") java.util.Collection<String> platformIds);

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
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m " +
           "LEFT JOIN FETCH m.brand b " +
           "WHERE ai.intakeAt >= :from AND ai.intakeAt <= :to " +
           "  AND (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ActiveInventory> findFilteredImported(@Param("from") java.time.LocalDateTime from, @Param("to") java.time.LocalDateTime to, @Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m " +
           "LEFT JOIN FETCH m.brand b " +
           "WHERE (:brandId IS NULL OR b.brandId = :brandId) " +
           "  AND (:segmentCode IS NULL OR m.segmentCode = :segmentCode) " +
           "  AND (:modelLineId IS NULL OR m.modelLineId = :modelLineId)")
    List<ActiveInventory> findFilteredAll(@Param("brandId") String brandId, @Param("segmentCode") com.qkshop.tonkho.core.enums.SegmentCode segmentCode, @Param("modelLineId") String modelLineId);

    @Query("SELECT ai FROM ActiveInventory ai " +
           "LEFT JOIN FETCH ai.config c LEFT JOIN FETCH c.variant v LEFT JOIN FETCH v.platform p " +
           "LEFT JOIN FETCH p.modelLine m " +
           "LEFT JOIN FETCH m.brand b " +
           "WHERE (:state IS NULL OR ai.state = :state) " +
           "  AND (:brandName IS NULL OR LOWER(b.brandName) = LOWER(:brandName)) " +
           "  AND (:segment IS NULL OR m.segmentCode = :segment) " +
           "ORDER BY ai.intakeAt DESC, ai.id DESC")
    List<ActiveInventory> findByFilters(
            @Param("state") CycleState state,
            @Param("brandName") String brandName,
            @Param("segment") com.qkshop.tonkho.core.enums.SegmentCode segment);
}
