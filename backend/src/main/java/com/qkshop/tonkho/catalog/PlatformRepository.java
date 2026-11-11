package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.catalog.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PlatformRepository extends JpaRepository<Platform, Long> {
    Optional<Platform> findByPlatformId(String platformId);
    Optional<Platform> findByPlatformKey(String platformKey);
    List<Platform> findByModelLine_ModelLineIdAndActiveTrue(String modelLineId);
    List<Platform> findByActiveTrue();
    List<Platform> findByDisplayNameContainingIgnoreCaseAndActiveTrue(String keyword);

    @Query("SELECT p FROM Platform p LEFT JOIN FETCH p.modelLine ml LEFT JOIN FETCH ml.brand WHERE p.active = true")
    List<Platform> findAllActiveWithHierarchy();

    @Query("SELECT p FROM Platform p LEFT JOIN FETCH p.modelLine ml LEFT JOIN FETCH ml.brand WHERE ml.modelLineId = :modelLineId AND p.active = true")
    List<Platform> findByModelLineIdWithHierarchy(@Param("modelLineId") String modelLineId);

    @Query("SELECT p FROM Platform p LEFT JOIN FETCH p.modelLine ml LEFT JOIN FETCH ml.brand WHERE p.platformId IN :platformIds")
    List<Platform> findByPlatformIdInWithHierarchy(@Param("platformIds") Collection<String> platformIds);
}
