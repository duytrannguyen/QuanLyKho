package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.catalog.ModelLine;
import com.qkshop.tonkho.core.enums.SegmentCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ModelLineRepository extends JpaRepository<ModelLine, Long> {
    Optional<ModelLine> findByModelLineId(String modelLineId);
    Optional<ModelLine> findByModelLineKey(String modelLineKey);
    List<ModelLine> findByBrand_BrandIdAndActiveTrue(String brandId);
    List<ModelLine> findBySegmentCodeAndActiveTrue(SegmentCode segmentCode);
    List<ModelLine> findByActiveTrue();
    List<ModelLine> findByModelLineNameContainingIgnoreCaseAndActiveTrue(String keyword);
}
