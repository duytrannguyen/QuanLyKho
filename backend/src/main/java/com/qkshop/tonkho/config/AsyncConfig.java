package com.qkshop.tonkho.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Bật xử lý bất đồng bộ (@Async) và lập lịch định kỳ (@Scheduled) cho toàn hệ thống.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
