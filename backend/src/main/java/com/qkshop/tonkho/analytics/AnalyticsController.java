package com.qkshop.tonkho.analytics;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.analytics.AnalyticsService;
import com.qkshop.tonkho.analytics.dto.AnalyticsFilterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getSummary(filter)));
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrend(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getTrend(filter)));
    }

    @GetMapping("/value-structure")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getValueStructure(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getValueStructure(filter)));
    }

    @GetMapping("/inventory-age")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInventoryAge(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getInventoryAge(filter)));
    }

    @GetMapping("/turnover-rate")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTurnoverRate(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getTurnoverRate(filter)));
    }

    @GetMapping("/highlights")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHighlights(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getHighlights(filter)));
    }

    @GetMapping("/insights")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInsights(AnalyticsFilterRequest filter) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getInsights(filter)));
    }
}
