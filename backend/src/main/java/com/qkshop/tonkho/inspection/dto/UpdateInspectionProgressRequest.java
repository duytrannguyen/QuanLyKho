package com.qkshop.tonkho.inspection.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateInspectionProgressRequest {
    private String progressNotes;
    private boolean requiredDataComplete;
}
