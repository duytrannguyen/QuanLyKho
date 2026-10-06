package com.qkshop.tonkho.machine.dto;
import com.qkshop.tonkho.catalog.Brand;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MachineImportRequest {
    private String serial;

    @NotBlank(message = "Brand is required")
    private String brand;

    @NotBlank(message = "Product line is required")
    private String productLine;

    @NotBlank(message = "Model is required")
    private String modelFull;

    private String segment;

    @NotBlank(message = "CPU is required")
    private String cpu;

    private String gpu;

    @NotBlank(message = "RAM is required")
    private String ram;

    @NotBlank(message = "SSD is required")
    private String ssd;

    private String touchscreen;
    private String screenSize;
    private BigDecimal price;
    private String notes;

    @NotNull(message = "Import type is required")
    private String importType;

    @NotNull(message = "Initial status is required")
    private String initialStatus;

    private String importDate;
}
