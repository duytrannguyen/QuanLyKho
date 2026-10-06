package com.qkshop.tonkho.machine.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BulkMachineImportRequest {
    
    @NotEmpty(message = "Serials list cannot be empty")
    private List<String> serials;
    
    @NotNull(message = "Common configuration is required")
    @Valid
    private MachineImportRequest commonConfig;
}
