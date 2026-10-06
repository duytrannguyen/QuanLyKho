package com.qkshop.tonkho.machine;

import com.qkshop.tonkho.machine.SerialRegistry;
import com.qkshop.tonkho.inventory.CycleState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SerialRegistryRepository extends JpaRepository<SerialRegistry, Long> {
    Optional<SerialRegistry> findBySerialKey(String serialKey);
    boolean existsBySerialKey(String serialKey);
    List<SerialRegistry> findByCurrentState(CycleState state);
    List<SerialRegistry> findByBrandId(String brandId);
    long countByCurrentState(CycleState state);
    List<SerialRegistry> findBySerialKeyIn(List<String> serialKeys);
}
