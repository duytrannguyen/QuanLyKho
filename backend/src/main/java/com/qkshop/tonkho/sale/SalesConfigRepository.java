package com.qkshop.tonkho.sale;

import com.qkshop.tonkho.sale.SalesConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SalesConfigRepository extends JpaRepository<SalesConfig, Long> {
    Optional<SalesConfig> findByConfigId(String configId);
    Optional<SalesConfig> findByConfigKey(String configKey);
    List<SalesConfig> findByVariant_VariantIdAndActiveTrue(String variantId);
    List<SalesConfig> findByActiveTrue();
}
