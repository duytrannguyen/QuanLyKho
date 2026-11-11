package com.qkshop.tonkho.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionDto {
    private String code;
    private String name;
    private String group;
    private String description;
    private String type; // "VIEW" (Chức năng / Xem màn hình) hoặc "ACTION" (Thao tác nghiệp vụ cụ thể)
    private String module; // Màn hình hoặc khu vực chức năng tương ứng trên giao diện
}
