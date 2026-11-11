package com.qkshop.tonkho.sale;

import com.qkshop.tonkho.sale.SalesConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SalesConfigRepository extends JpaRepository<SalesConfig, Long> {
    Optional<SalesConfig> findByConfigId(String configId);
    Optional<SalesConfig> findByConfigKey(String configKey);
    List<SalesConfig> findByVariant_VariantIdAndActiveTrue(String variantId);
    List<SalesConfig> findByActiveTrue();

    @Query("SELECT sc FROM SalesConfig sc JOIN FETCH sc.variant v WHERE v.variantId IN :variantIds AND sc.active = true")
    List<SalesConfig> findByVariantIdsAndActiveTrue(@Param("variantIds") Collection<String> variantIds);
}
