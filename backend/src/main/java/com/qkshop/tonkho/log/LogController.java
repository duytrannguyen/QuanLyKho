package com.qkshop.tonkho.log;

import com.qkshop.tonkho.core.dto.ApiResponse;
import com.qkshop.tonkho.log.EventLog;
import com.qkshop.tonkho.log.EventLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogController {

    private final EventLogRepository eventLogRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventLog>>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        
        // Hiện tại chỉ hỗ trợ lấy tất cả hoặc search đơn giản
        // Nếu cần, có thể mở rộng search bằng Specification
        Page<EventLog> logs;
        if (search != null && !search.trim().isEmpty()) {
            logs = eventLogRepository.findBySerialKeyOrderByEventAtDesc(search, PageRequest.of(page, size));
            if (logs.isEmpty()) {
                logs = eventLogRepository.findByActorOrderByEventAtDesc(search, PageRequest.of(page, size));
            }
        } else {
            logs = eventLogRepository.findAllByOrderByEventAtDesc(PageRequest.of(page, size));
        }
        
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
