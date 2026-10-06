package com.qkshop.tonkho.accessory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AccessoryHistoryRepository extends JpaRepository<AccessoryHistory, Long> {
    List<AccessoryHistory> findByActionOrderByCreatedAtDesc(String action);
    List<AccessoryHistory> findAllByOrderByCreatedAtDesc();
    List<AccessoryHistory> findByCreatedAtBetween(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    List<AccessoryHistory> findByActionAndCreatedAtBetween(String action, java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    List<AccessoryHistory> findBySku(String sku);
}
