package com.qkshop.tonkho.config;
import com.qkshop.tonkho.log.ActivityLogService;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Bật xử lý bất đồng bộ (@Async) cho toàn hệ thống.
 * ActivityLogService sử dụng @Async để ghi log không block luồng chính.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
