package com.qkshop.tonkho.accessory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface AccessoryRepository extends JpaRepository<Accessory, Long> {
    Optional<Accessory> findBySku(String sku);

    @Query("SELECT MAX(a.sku) FROM Accessory a WHERE a.sku LIKE CONCAT(:prefix, '%')")
    Optional<String> findMaxSkuByPrefix(@Param("prefix") String prefix);

    // Tìm các phụ kiện còn hàng
    List<Accessory> findByQuantityGreaterThan(Integer quantity);

    List<Accessory> findAllByOrderByCreatedAtDesc();
}
