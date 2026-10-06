package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.catalog.VariantV2;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VariantV2Repository extends JpaRepository<VariantV2, Long> {
    Optional<VariantV2> findByVariantId(String variantId);
    Optional<VariantV2> findByVariantKey(String variantKey);
    List<VariantV2> findByPlatform_PlatformIdAndActiveTrue(String platformId);
    List<VariantV2> findByActiveTrue();
    List<VariantV2> findByVariantNameContainingIgnoreCaseAndActiveTrue(String keyword);
}
