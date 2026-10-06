package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.catalog.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlatformRepository extends JpaRepository<Platform, Long> {
    Optional<Platform> findByPlatformId(String platformId);
    Optional<Platform> findByPlatformKey(String platformKey);
    List<Platform> findByModelLine_ModelLineIdAndActiveTrue(String modelLineId);
    List<Platform> findByActiveTrue();
    List<Platform> findByDisplayNameContainingIgnoreCaseAndActiveTrue(String keyword);
}
