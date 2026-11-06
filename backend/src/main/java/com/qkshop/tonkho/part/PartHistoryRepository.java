package com.qkshop.tonkho.part;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PartHistoryRepository extends JpaRepository<PartHistory, Long> {

    List<PartHistory> findAllByOrderByCreatedAtDesc();

    List<PartHistory> findBySkuOrderByCreatedAtDesc(String sku);

    List<PartHistory> findByOrderCodeOrderByCreatedAtDesc(String orderCode);

    List<PartHistory> findByOrderCode(String orderCode);

    List<PartHistory> findByCreatedAtBetween(LocalDateTime fromDate, LocalDateTime toDate);
}
