package com.qkshop.tonkho.catalog;

import com.qkshop.tonkho.catalog.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BrandRepository extends JpaRepository<Brand, Long> {
    Optional<Brand> findByBrandId(String brandId);
    Optional<Brand> findByBrandKey(String brandKey);
    List<Brand> findByActiveTrue();
    List<Brand> findByBrandNameContainingIgnoreCaseAndActiveTrue(String keyword);
}
