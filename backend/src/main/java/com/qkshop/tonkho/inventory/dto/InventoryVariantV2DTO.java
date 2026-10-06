package com.qkshop.tonkho.inventory.dto;

import com.qkshop.tonkho.catalog.VariantV2;
import com.qkshop.tonkho.sale.SalesConfig;
import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InventoryVariantV2DTO {
    private VariantV2 variant;
    private SalesConfig config;
    private long totalCount;
    private long readyCount;
    private long inspectionCount;
    private List<MachineSimpleDTO> machines;

    @Getter @Setter
    @NoArgsConstructor @AllArgsConstructor
    @Builder
    public static class MachineSimpleDTO {
        private String serial;
        private String status;
        private java.math.BigDecimal price;
        private String configId;
        private String configName;
        private String ram;
        private String ssd;
        private String notes;
        private String cycleId;
        private java.time.LocalDateTime intakeAt;
    }
}
