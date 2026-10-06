package com.qkshop.tonkho.inspection.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InspectionDTO {
    private String id;
    private String serial;
    private String name;
    private String config;
    private String type;
    private String waitDays;
    private String inventoryDays;
    private String dataStatus;
    private String progressNotes;
    private String status;
    private String reason;
    private String note;
    private LocalDateTime createdAt;   // Ngày tạo yêu cầu kiểm tra
}
