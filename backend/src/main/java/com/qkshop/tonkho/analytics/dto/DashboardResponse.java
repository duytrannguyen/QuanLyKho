package com.qkshop.tonkho.analytics.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DashboardResponse {
    private long totalActive;
    private long readyToSell;
    private long needInspection;
    private long errorCount;
    private long withoutPrice;
    private long pendingInspections;
    private long dataErrors;
}
