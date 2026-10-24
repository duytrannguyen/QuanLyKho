package com.qkshop.tonkho.user;

import com.qkshop.tonkho.user.dto.PermissionDto;
import lombok.Getter;

import java.util.*;
import java.util.stream.Collectors;

@Getter
public enum AppPermission {
    // Tổng quan
    DASHBOARD_VIEW("DASHBOARD_VIEW", "Tổng quan điều hành", "Tổng quan", "Xem các chỉ số tổng quan, doanh số và cảnh báo kho"),
    ANALYTICS_VIEW("ANALYTICS_VIEW", "Báo cáo phân tích", "Tổng quan", "Xem biểu đồ chuyên sâu, tỷ lệ quay vòng, tuổi thọ tồn kho"),

    // Bán hàng
    SALE_MACHINE("SALE_MACHINE", "Bán máy", "Bán hàng", "Lập đơn bán máy lẻ, xuất kho bán và in hóa đơn"),
    SALE_ACCESSORY("SALE_ACCESSORY", "Bán phụ kiện lẻ", "Bán hàng", "Lập đơn bán phụ kiện, xuất hóa đơn bán lẻ"),
    PRICING_VIEW("PRICING_VIEW", "Bảng giá", "Bán hàng", "Xem và tra cứu bảng giá sản phẩm máy và phụ kiện"),

    // Kho hàng
    MANAGE_MACHINE_CODES("MANAGE_MACHINE_CODES", "Quản lý mã máy", "Kho hàng", "Xem và cấu hình danh mục mã máy, model, quy chuẩn"),
    IMPORT_MACHINE("IMPORT_MACHINE", "Nhập máy", "Kho hàng", "Nhập máy lẻ hoặc nhập hàng loạt từ file Excel"),
    IMPORT_ACCESSORY("IMPORT_ACCESSORY", "Nhập phụ kiện", "Kho hàng", "Nhập kho các mặt hàng phụ kiện mới"),
    INVENTORY_ACCESSORY("INVENTORY_ACCESSORY", "Tồn kho phụ kiện", "Kho hàng", "Theo dõi và điều chỉnh số lượng tồn phụ kiện"),
    INSPECTION("INSPECTION", "Kiểm định máy", "Kho hàng", "Kiểm tra kỹ thuật máy, duyệt hoặc từ chối máy nhập kho"),

    // Hậu mãi & Tra cứu
    SEARCH_INVENTORY("SEARCH_INVENTORY", "Tra cứu kho máy", "Hậu mãi & Tra cứu", "Tra cứu nhanh thông tin máy theo Serial, cấu hình, tình trạng"),
    ACCESSORY_HISTORY("ACCESSORY_HISTORY", "Lịch sử phụ kiện", "Hậu mãi & Tra cứu", "Xem nhật ký giao dịch và lịch sử xuất bán phụ kiện"),
    WARRANTY_CHECK("WARRANTY_CHECK", "Bảo hành", "Hậu mãi & Tra cứu", "Tra cứu thông tin đơn hàng và thời hạn bảo hành của khách"),

    // Hệ thống
    SYNC_MANAGE("SYNC_MANAGE", "Đối soát & đồng bộ", "Hệ thống", "Đồng bộ dữ liệu Google Sheets / DataSale và giải quyết sai lệch"),
    LOGS_VIEW("LOGS_VIEW", "Nhật ký hoạt động", "Hệ thống", "Xem lịch sử tác vụ của người dùng trên toàn hệ thống"),
    SYSTEM_MANAGE("SYSTEM_MANAGE", "Quản trị hệ thống", "Hệ thống", "Cấu hình hệ thống, quản lý người dùng và phân quyền chi tiết");

    private final String code;
    private final String name;
    private final String group;
    private final String description;

    AppPermission(String code, String name, String group, String description) {
        this.code = code;
        this.name = name;
        this.group = group;
        this.description = description;
    }

    public static List<PermissionDto> getAllPermissionDtos() {
        return Arrays.stream(values())
                .map(p -> PermissionDto.builder()
                        .code(p.getCode())
                        .name(p.getName())
                        .group(p.getGroup())
                        .description(p.getDescription())
                        .build())
                .collect(Collectors.toList());
    }

    public static Set<String> allCodes() {
        return Arrays.stream(values())
                .map(AppPermission::getCode)
                .collect(Collectors.toSet());
    }

    public static Set<String> getDefaultPermissionsForRole(UserRole role) {
        if (role == null) return Collections.emptySet();
        switch (role) {
            case ADMIN:
                return allCodes();
            case MANAGER:
                return Arrays.stream(values())
                        .filter(p -> p != SYSTEM_MANAGE)
                        .map(AppPermission::getCode)
                        .collect(Collectors.toSet());
            case STAFF:
                return Set.of(
                        DASHBOARD_VIEW.getCode(),
                        SALE_MACHINE.getCode(),
                        SALE_ACCESSORY.getCode(),
                        PRICING_VIEW.getCode(),
                        SEARCH_INVENTORY.getCode(),
                        ACCESSORY_HISTORY.getCode(),
                        WARRANTY_CHECK.getCode(),
                        INSPECTION.getCode()
                );
            default:
                return Collections.emptySet();
        }
    }
}
