package com.qkshop.tonkho.part;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartHistoryRepository extends JpaRepository<PartHistory, Long> {

    List<PartHistory> findAllByOrderByCreatedAtDesc();

    List<PartHistory> findBySkuOrderByCreatedAtDesc(String sku);

    List<PartHistory> findByOrderCodeOrderByCreatedAtDesc(String orderCode);
}
