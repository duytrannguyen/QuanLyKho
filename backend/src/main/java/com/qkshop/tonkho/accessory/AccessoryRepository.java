package com.qkshop.tonkho.accessory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface AccessoryRepository extends JpaRepository<Accessory, Long> {
    Optional<Accessory> findBySku(String sku);
    
    // Tìm các phụ kiện còn hàng
    List<Accessory> findByQuantityGreaterThan(Integer quantity);
}
