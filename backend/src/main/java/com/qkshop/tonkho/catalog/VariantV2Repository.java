package com.qkshop.tonkho.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface VariantV2Repository extends JpaRepository<VariantV2, Long> {
    Optional<VariantV2> findByVariantId(String variantId);
    Optional<VariantV2> findByVariantKey(String variantKey);
    List<VariantV2> findByPlatform_PlatformIdAndActiveTrue(String platformId);
    List<VariantV2> findByActiveTrue();
    List<VariantV2> findByVariantNameContainingIgnoreCaseAndActiveTrue(String keyword);

    @Query("SELECT v FROM VariantV2 v LEFT JOIN FETCH v.platform p LEFT JOIN FETCH p.modelLine ml LEFT JOIN FETCH ml.brand")
    List<VariantV2> findAllWithHierarchy();
}
