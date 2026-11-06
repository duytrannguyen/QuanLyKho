package com.qkshop.tonkho.user;

import com.qkshop.tonkho.user.dto.PermissionDto;
import lombok.Getter;

import java.util.*;
import java.util.stream.Collectors;

@Getter
public enum AppPermission {
    // 1. TỔNG QUAN & BÁO CÁO
    DASHBOARD_VIEW("DASHBOARD_VIEW", "Tổng quan điều hành", "Tổng quan & Báo cáo", "Xem các chỉ số tổng quan, doanh số và cảnh báo kho"),
    SALES_REPORT_VIEW("SALES_REPORT_VIEW", "Báo cáo doanh số", "Tổng quan & Báo cáo", "Xem biểu đồ doanh thu, KPI và phân tích kênh bán theo Google Sheets"),
    ANALYTICS_VIEW("ANALYTICS_VIEW", "Thống kê phân tích kho", "Tổng quan & Báo cáo", "Xem biểu đồ chuyên sâu, tỷ lệ quay vòng, tuổi thọ tồn kho"),

    // 2. BÁN HÀNG & GIAO VẬN
    SALE_MACHINE("SALE_MACHINE", "Bán máy lẻ (POS)", "Bán hàng & Giao vận", "Lập đơn bán máy lẻ, xuất kho bán và in hóa đơn bán hàng"),
    SALE_ACCESSORY("SALE_ACCESSORY", "Bán phụ kiện lẻ", "Bán hàng & Giao vận", "Lập đơn bán phụ kiện lẻ, xuất hóa đơn bán lẻ"),
    SHIP_MANAGE("SHIP_MANAGE", "Đơn ship & Giao hàng", "Bán hàng & Giao vận", "Theo dõi đơn ship, cập nhật mã vận đơn COD, trạng thái giao vận và đối soát"),
    ORDER_EDIT("ORDER_EDIT", "Sửa hóa đơn & Đơn hàng", "Bán hàng & Giao vận", "Chỉnh sửa thông tin khách hàng, số điện thoại, giá bán, quà tặng trên đơn đã xuất"),
    ORDER_RETURN("ORDER_RETURN", "Đổi trả & Hoàn đơn hàng", "Bán hàng & Giao vận", "Tiếp nhận đổi trả, xác nhận hủy hoặc hoàn đơn hàng máy/phụ kiện về kho"),
    PRICING_VIEW("PRICING_VIEW", "Xem bảng giá niêm yết", "Bán hàng & Giao vận", "Xem và tra cứu danh mục bảng giá sản phẩm máy và phụ kiện"),
    PRICING_MANAGE("PRICING_MANAGE", "Quản lý & Cập nhật bảng giá", "Bán hàng & Giao vận", "Cấu hình, điều chỉnh giá bán niêm yết và in ấn bảng báo giá sản phẩm"),

    // 3. KHO MÁY & KIỂM ĐỊNH
    SEARCH_INVENTORY("SEARCH_INVENTORY", "Tra cứu tồn kho máy", "Kho máy & Kiểm định", "Tra cứu nhanh thông tin máy theo Serial, cấu hình, tình trạng tồn kho"),
    MANAGE_MACHINE_CODES("MANAGE_MACHINE_CODES", "Quản lý mã máy & Model", "Kho máy & Kiểm định", "Xem và cấu hình danh mục mã máy, model, quy chuẩn linh kiện"),
    IMPORT_MACHINE("IMPORT_MACHINE", "Nhập kho máy", "Kho máy & Kiểm định", "Nhập máy lẻ hoặc nhập hàng loạt từ file Excel, in tem mã máy"),
    MACHINE_UPDATE("MACHINE_UPDATE", "Sửa thông tin & Giá máy", "Kho máy & Kiểm định", "Chỉnh sửa thông tin cấu hình, tình trạng, ghi chú và cập nhật giá bán hàng loạt"),
    MACHINE_DELETE("MACHINE_DELETE", "Xóa máy khỏi kho", "Kho máy & Kiểm định", "Quyền xóa bỏ hoàn toàn serial máy khỏi kho hàng (thao tác rủi ro cao)"),
    INSPECTION("INSPECTION", "Kiểm định chất lượng máy", "Kho máy & Kiểm định", "Kiểm tra kỹ thuật máy, duyệt máy đạt chuẩn (READY) hoặc từ chối"),

    // 4. LINH KIỆN & PHỤ KIỆN
    IMPORT_ACCESSORY("IMPORT_ACCESSORY", "Nhập kho phụ kiện", "Linh kiện & Phụ kiện", "Nhập kho các mặt hàng phụ kiện mới và cập nhật số lượng nhập"),
    INVENTORY_ACCESSORY("INVENTORY_ACCESSORY", "Tồn kho phụ kiện", "Linh kiện & Phụ kiện", "Theo dõi tồn kho, cảnh báo số lượng và điều chỉnh tồn kho phụ kiện"),
    ACCESSORY_MANAGE("ACCESSORY_MANAGE", "Quản lý danh mục phụ kiện", "Linh kiện & Phụ kiện", "Thêm, sửa thông tin, xóa mã phụ kiện và cài đặt cấu hình quà tặng mặc định"),
    ACCESSORY_HISTORY("ACCESSORY_HISTORY", "Lịch sử xuất bán phụ kiện", "Linh kiện & Phụ kiện", "Xem nhật ký giao dịch và lịch sử xuất bán các loại phụ kiện"),
    IMPORT_PART("IMPORT_PART", "Nhập kho linh kiện", "Linh kiện & Phụ kiện", "Nhập kho các mặt hàng linh kiện sửa chữa, nâng cấp và thay thế máy"),
    INVENTORY_PART("INVENTORY_PART", "Tồn kho linh kiện", "Linh kiện & Phụ kiện", "Theo dõi tồn kho, vị trí lưu trữ và quản lý tồn kho linh kiện sửa chữa"),
    PART_MANAGE("PART_MANAGE", "Quản lý danh mục linh kiện", "Linh kiện & Phụ kiện", "Thêm mới, chỉnh sửa thông tin, danh mục và xóa linh kiện sửa chữa"),

    // 5. BẢO HÀNH & CRM
    WARRANTY_CHECK("WARRANTY_CHECK", "Tra cứu đơn & Bảo hành", "Bảo hành & CRM", "Tra cứu thông tin đơn hàng, lịch sử mua và thời hạn bảo hành của khách"),
    SERVICE_REPAIR("SERVICE_REPAIR", "Dịch vụ tiếp nhận sửa chữa", "Bảo hành & CRM", "Tiếp nhận máy sửa chữa, lập phiếu dịch vụ sửa chữa và thay thế linh kiện"),
    SERVICE_VIEW("SERVICE_VIEW", "Tra cứu phiếu sửa chữa", "Bảo hành & CRM", "Tra cứu tiến độ xử lý, danh sách phiếu dịch vụ và lịch sử bảo hành sửa chữa"),
    CRM_VIEW("CRM_VIEW", "Xem khách hàng (CRM)", "Bảo hành & CRM", "Tra cứu hồ sơ khách hàng, danh sách máy hết hạn bảo hành, tổng chi tiêu"),
    CRM_MANAGE("CRM_MANAGE", "Quản lý dữ liệu CRM", "Bảo hành & CRM", "Chỉnh sửa thông tin khách hàng, gán đơn khách lẻ và ghi chú chăm sóc khách hàng"),

    // 6. HỆ THỐNG & ĐỐI SOÁT
    SYNC_MANAGE("SYNC_MANAGE", "Đối soát & Đồng bộ Sheets", "Hệ thống & Đối soát", "Kích hoạt đồng bộ Google Sheets, kiểm tra trạng thái và xử lý sai lệch"),
    LOGS_VIEW("LOGS_VIEW", "Nhật ký hoạt động", "Hệ thống & Đối soát", "Xem lịch sử thao tác, thay đổi dữ liệu của người dùng trên toàn hệ thống"),
    EXPORT_DATA("EXPORT_DATA", "Xuất dữ liệu Excel", "Hệ thống & Đối soát", "Xuất danh sách tồn kho, khách hàng, bảo hành và báo cáo ra file Excel"),
    USER_MANAGE("USER_MANAGE", "Quản trị người dùng & Cấp quyền", "Hệ thống & Đối soát", "Tạo tài khoản, khóa/mở khóa tài khoản, phân quyền và đổi mật khẩu người dùng"),
    SYSTEM_MANAGE("SYSTEM_MANAGE", "Cấu hình hệ thống & Bảo trì", "Hệ thống & Đối soát", "Cấu hình tham số hệ thống, kết nối Google Sheets, dọn dẹp dữ liệu và bảo trì");

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
                        .filter(p -> p != SYSTEM_MANAGE && p != MACHINE_DELETE)
                        .map(AppPermission::getCode)
                        .collect(Collectors.toSet());
            case STAFF:
                return Set.of(
                        DASHBOARD_VIEW.getCode(),
                        SALES_REPORT_VIEW.getCode(),
                        SALE_MACHINE.getCode(),
                        SALE_ACCESSORY.getCode(),
                        SHIP_MANAGE.getCode(),
                        PRICING_VIEW.getCode(),
                        SEARCH_INVENTORY.getCode(),
                        INVENTORY_ACCESSORY.getCode(),
                        ACCESSORY_HISTORY.getCode(),
                        INVENTORY_PART.getCode(),
                        INSPECTION.getCode(),
                        WARRANTY_CHECK.getCode(),
                        SERVICE_REPAIR.getCode(),
                        SERVICE_VIEW.getCode(),
                        CRM_VIEW.getCode()
                );
            default:
                return Collections.emptySet();
        }
    }
}
