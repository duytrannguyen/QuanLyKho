package com.qkshop.tonkho.system;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private static final long CACHE_TTL_MS = 60_000L;

    private final SystemConfigRepository systemConfigRepository;
    private final Map<String, String> configCache = new ConcurrentHashMap<>();
    private volatile long cacheExpiresAt = 0L;

    private void ensureCacheLoaded() {
        long now = System.currentTimeMillis();
        if (now < cacheExpiresAt && !configCache.isEmpty()) {
            return;
        }
        synchronized (this) {
            if (System.currentTimeMillis() < cacheExpiresAt && !configCache.isEmpty()) {
                return;
            }
            List<SystemConfig> configs = systemConfigRepository.findAll();
            configCache.clear();
            for (SystemConfig cfg : configs) {
                if (cfg.getConfigKey() != null && cfg.getConfigValue() != null) {
                    configCache.put(cfg.getConfigKey(), cfg.getConfigValue());
                }
            }
            cacheExpiresAt = System.currentTimeMillis() + CACHE_TTL_MS;
        }
    }

    /** Lấy tất cả config dưới dạng Map key→value */
    @Transactional(readOnly = true)
    public Map<String, String> getAllConfig() {
        ensureCacheLoaded();
        return configCache.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** Lấy giá trị 1 config theo key (đọc từ RAM cache O(1), giảm tải truy vấn DB lặp lại) */
    @Transactional(readOnly = true)
    public String getConfig(String key, String defaultValue) {
        ensureCacheLoaded();
        String cachedVal = configCache.get(key);
        return cachedVal != null ? cachedVal : defaultValue;
    }

    /** Cập nhật hoặc tạo mới 1 config */
    @Transactional(rollbackFor = Exception.class)
    public SystemConfig upsertConfig(String key, String value, String description) {
        SystemConfig config = systemConfigRepository.findByConfigKey(key)
                .orElse(SystemConfig.builder()
                        .configKey(key)
                        .description(description)
                        .build());
        config.setConfigValue(value);
        SystemConfig saved = systemConfigRepository.save(config);
        if (key != null && value != null) {
            configCache.put(key, value);
        }
        return saved;
    }

    /** Lấy list tất cả config entities */
    @Transactional(readOnly = true)
    public List<SystemConfig> listAll() {
        return systemConfigRepository.findAll();
    }
}
