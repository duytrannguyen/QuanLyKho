package com.qkshop.tonkho.system;

import com.qkshop.tonkho.system.SystemConfig;
import com.qkshop.tonkho.system.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigRepository systemConfigRepository;

    /** Lấy tất cả config dưới dạng Map key→value */
    public Map<String, String> getAllConfig() {
        List<SystemConfig> configs = systemConfigRepository.findAll();
        return configs.stream()
                .collect(Collectors.toMap(SystemConfig::getConfigKey, SystemConfig::getConfigValue));
    }

    /** Lấy giá trị 1 config theo key */
    public String getConfig(String key, String defaultValue) {
        return systemConfigRepository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .orElse(defaultValue);
    }

    /** Cập nhật hoặc tạo mới 1 config */
    @Transactional
    public SystemConfig upsertConfig(String key, String value, String description) {
        SystemConfig config = systemConfigRepository.findByConfigKey(key)
                .orElse(SystemConfig.builder()
                        .configKey(key)
                        .description(description)
                        .build());
        config.setConfigValue(value);
        return systemConfigRepository.save(config);
    }

    /** Lấy list tất cả config entities */
    public List<SystemConfig> listAll() {
        return systemConfigRepository.findAll();
    }
}
