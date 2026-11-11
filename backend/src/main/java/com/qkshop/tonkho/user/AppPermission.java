package com.qkshop.tonkho.user;

import com.qkshop.tonkho.user.dto.PermissionDto;
import lombok.Getter;

import java.util.*;
import java.util.stream.Collectors;

@Getter
public enum AppPermission {
    // 1. TỔNG QUAN & BÁO CÁO
    DASHBOARD_VIEW("DASHBOARD_VIEW", "Tổng quan điều hành", "Tổng quan & Báo cáo",
            "Xem các chỉ số tổng quan, doanh số, cảnh báo kho và lối tắt điều hành", "VIEW", "Menu Bàn điều hành (/)"),
    SALES_REPORT_VIEW("SALES_REPORT_VIEW", "Báo cáo doanh số", "Tổng quan & Báo cáo",
            "Xem biểu đồ doanh thu, KPI và phân tích kênh bán theo Google Sheets", "VIEW", "Menu Báo cáo doanh số (/bao-cao-ban-hang)"),
    ANALYTICS_VIEW("ANALYTICS_VIEW", "Thống kê phân tích kho", "Tổng quan & Báo cáo",
            "Xem biểu đồ chuyên sâu, tỷ lệ quay vòng, tuổi thọ tồn kho và xuất nhập", "VIEW", "Menu Thống kê phân tích (/phan-tich)"),

    // 2. BÁN HÀNG & GIAO VẬN
    SALE_MACHINE("SALE_MACHINE", "Bán máy lẻ (POS)", "Bán hàng & Giao vận",
            "Truy cập màn hình Bán máy, quét serial máy, chọn quà tặng và lập hóa đơn xuất bán", "ACTION", "Menu Bán máy (/ban-may)"),
    SALE_ACCESSORY("SALE_ACCESSORY", "Bán phụ kiện lẻ", "Bán hàng & Giao vận",
            "Truy cập màn hình Bán phụ kiện lẻ, chọn số lượng và lập hóa đơn bán phụ kiện", "ACTION", "Menu Bán phụ kiện lẻ (/ban-phu-kien)"),
    SHIP_MANAGE("SHIP_MANAGE", "Xem & Xác nhận giao đơn ship", "Bán hàng & Giao vận",
            "Truy cập danh sách Đơn ship đang giao, theo dõi vận đơn COD và xác nhận giao thành công", "ACTION", "Menu Đơn ship (/don-ship) & Modal Đơn hàng"),
    ORDER_EDIT("ORDER_EDIT", "Sửa hóa đơn & Đơn hàng đã xuất", "Bán hàng & Giao vận",
            "Thao tác chỉnh sửa thông tin khách hàng, SĐT, giá bán, bảo hành trên đơn máy/phụ kiện/sửa chữa đã xuất", "ACTION", "Nút Sửa đơn tại Đơn ship & Tra cứu bảo hành"),
    ORDER_RETURN("ORDER_RETURN", "Đổi trả & Hoàn đơn hàng về kho", "Bán hàng & Giao vận",
            "Thao tác xác nhận hoàn hàng đơn ship, đổi trả máy hoặc thu hồi phụ kiện về lại tồn kho", "ACTION", "Nút Hoàn hàng tại Đơn ship & Duyệt hoàn Đối soát"),
    PRICING_VIEW("PRICING_VIEW", "Xem bảng giá niêm yết", "Bán hàng & Giao vận",
            "Truy cập màn hình Bảng giá, tra cứu giá bán lẻ niêm yết theo danh mục và xem trước thẻ giá", "VIEW", "Menu Bảng giá niêm yết (/bang-gia)"),
    PRICING_MANAGE("PRICING_MANAGE", "Quản lý & Chỉnh sửa bảng giá in", "Bán hàng & Giao vận",
            "Thao tác tùy chỉnh thông số, điều chỉnh giá niêm yết trên thẻ giá và xuất PDF / in bảng báo giá", "ACTION", "Bước Chỉnh sửa & Xuất PDF tại Bảng giá (/bang-gia)"),

    // 3. KHO MÁY & KIỂM ĐỊNH
    SEARCH_INVENTORY("SEARCH_INVENTORY", "Tra cứu tồn kho máy", "Kho máy & Kiểm định",
            "Truy cập màn hình Tồn kho máy theo Serial, cấu hình, tình trạng và xem chi tiết máy", "VIEW", "Menu Tồn kho máy (/tra-cuu)"),
    MANAGE_MACHINE_CODES("MANAGE_MACHINE_CODES", "Quản lý mã máy & Lịch sử Serial", "Kho máy & Kiểm định",
            "Truy cập màn hình Quản lý mã máy (Serial) để tra cứu sổ lưu trữ mã máy đang tồn và lịch sử máy đã xuất/bán", "VIEW", "Menu Quản lý mã máy (/quan-ly-ma-may)"),
    IMPORT_MACHINE("IMPORT_MACHINE", "Nhập kho máy", "Kho máy & Kiểm định",
            "Truy cập màn hình Nhập kho máy, nhập máy lẻ hoặc nhập hàng loạt từ Excel", "ACTION", "Menu Nhập kho máy (/nhap-may)"),
    MACHINE_UPDATE("MACHINE_UPDATE", "Sửa giá bán & Bảo hành máy tồn kho", "Kho máy & Kiểm định",
            "Thao tác cập nhật giá bán lẻ từng máy, cập nhật giá hàng loạt theo cấu hình và sửa gói bảo hành", "ACTION", "Nút Sửa giá / Sửa bảo hành tại Tồn kho máy (/tra-cuu)"),
    MACHINE_EXPORT_OTHER("MACHINE_EXPORT_OTHER", "Xuất máy khác & Đưa về kiểm tra", "Kho máy & Kiểm định",
            "Thao tác xuất kho máy nội bộ (xuất khác không doanh thu) hoặc chuyển máy từ Sẵn sàng về Cần kiểm tra", "ACTION", "Nút Xuất khác / Đưa về kiểm tra tại Tồn kho máy (/tra-cuu)"),
    MACHINE_DELETE("MACHINE_DELETE", "Xóa máy khỏi kho", "Kho máy & Kiểm định",
            "Thao tác xóa vĩnh viễn serial máy chưa phát sinh giao dịch khỏi cơ sở dữ liệu kho (rủi ro cao)", "ACTION", "Nút Xóa serial máy tại Tồn kho máy (/tra-cuu)"),
    INSPECTION("INSPECTION", "Kiểm định chất lượng máy", "Kho máy & Kiểm định",
            "Truy cập màn hình Kiểm định chất lượng, bắt đầu kiểm tra, lưu tiến độ và duyệt Đạt hoặc Hủy/Trả máy", "ACTION", "Menu Kiểm định chất lượng (/kiem-tra)"),

    // 4. LINH KIỆN & PHỤ KIỆN
    IMPORT_ACCESSORY("IMPORT_ACCESSORY", "Nhập kho phụ kiện", "Linh kiện & Phụ kiện",
            "Truy cập màn hình Nhập kho phụ kiện, tạo mã phụ kiện mới và ghi nhận phiếu nhập thêm số lượng", "ACTION", "Menu Nhập kho phụ kiện (/nhap-phu-kien)"),
    INVENTORY_ACCESSORY("INVENTORY_ACCESSORY", "Xem tồn kho phụ kiện", "Linh kiện & Phụ kiện",
            "Truy cập màn hình Kho phụ kiện, tra cứu số lượng tồn, giá bán và cảnh báo sắp hết hàng", "VIEW", "Menu Kho phụ kiện (/ton-kho-phu-kien)"),
    ACCESSORY_MANAGE("ACCESSORY_MANAGE", "Sửa / Xóa phụ kiện & Cấu hình quà tặng", "Linh kiện & Phụ kiện",
            "Thao tác chỉnh sửa tên/giá phụ kiện, xóa mã phụ kiện và lưu bộ quà tặng mặc định khi bán máy", "ACTION", "Nút Sửa / Xóa tại Kho PK & Cấu hình quà tặng"),
    ACCESSORY_HISTORY("ACCESSORY_HISTORY", "Xem lịch sử xuất bán phụ kiện", "Linh kiện & Phụ kiện",
            "Truy cập màn hình Lịch sử bán phụ kiện và xem nhật ký biến động của từng mã phụ kiện", "VIEW", "Menu Lịch sử bán phụ kiện (/lich-su-ban-phu-kien)"),
    IMPORT_PART("IMPORT_PART", "Nhập kho linh kiện", "Linh kiện & Phụ kiện",
            "Truy cập màn hình Nhập kho linh kiện sửa chữa (RAM, SSD, Màn hình, Pin...) và ghi nhận số lượng nhập", "ACTION", "Menu Nhập kho linh kiện (/nhap-linh-kien)"),
    INVENTORY_PART("INVENTORY_PART", "Xem tồn kho linh kiện", "Linh kiện & Phụ kiện",
            "Truy cập màn hình Kho linh kiện, theo dõi số lượng tồn, dòng máy tương thích và lịch sử xuất dùng", "VIEW", "Menu Kho linh kiện (/ton-kho-linh-kien)"),
    PART_MANAGE("PART_MANAGE", "Sửa / Xóa danh mục linh kiện", "Linh kiện & Phụ kiện",
            "Thao tác chỉnh sửa thông tin loại linh kiện, giá vốn, nhà cung cấp hoặc xóa mã linh kiện khỏi kho", "ACTION", "Nút Sửa / Xóa tại Kho linh kiện (/ton-kho-linh-kien)"),

    // 5. BẢO HÀNH & CRM
    WARRANTY_CHECK("WARRANTY_CHECK", "Tra cứu đơn hàng & Bảo hành", "Bảo hành & CRM",
            "Truy cập màn hình Tra cứu đơn & Bảo hành theo SĐT, Mã đơn, Serial máy và xem chi tiết hóa đơn", "VIEW", "Menu Tra cứu đơn & Bảo hành (/bao-hanh)"),
    SERVICE_REPAIR("SERVICE_REPAIR", "Tiếp nhận & Xử lý phiếu sửa chữa", "Bảo hành & CRM",
            "Truy cập màn hình Tiếp nhận sửa chữa, lập phiếu mới, sửa phiếu và cập nhật trạng thái hoàn thành/trả máy", "ACTION", "Menu Tiếp nhận sửa chữa (/dich-vu-sua-chua)"),
    SERVICE_VIEW("SERVICE_VIEW", "Xem danh sách phiếu sửa chữa", "Bảo hành & CRM",
            "Truy cập màn hình Tra cứu phiếu sửa chữa để xem tiến độ xử lý, chi phí và lịch sử sửa chữa", "VIEW", "Menu Tra cứu phiếu sửa chữa (/tra-cuu-sua-chua)"),
    CRM_VIEW("CRM_VIEW", "Xem hồ sơ khách hàng & Máy hết bảo hành", "Bảo hành & CRM",
            "Truy cập danh sách Khách hàng (CRM), xem hồ sơ chi tiết, lịch sử mua hàng và danh sách máy hết bảo hành", "VIEW", "Menu Khách hàng (/khach-hang) & Máy hết BH"),
    CRM_CARE("CRM_CARE", "Ghi nhận chăm sóc khách hàng (CSKH)", "Bảo hành & CRM",
            "Thao tác thêm nhật ký cuộc gọi/Zalo chăm sóc khách hàng, đặt lịch hẹn gọi lại tại hồ sơ khách hàng", "ACTION", "Tab Nhật ký CSKH & Trang Máy hết hạn bảo hành"),
    CRM_MANAGE("CRM_MANAGE", "Quản lý hồ sơ CRM & Gán đơn khách lẻ", "Bảo hành & CRM",
            "Thao tác sửa thông tin hồ sơ khách hàng, gán hóa đơn chưa xác định vào khách hàng và đồng bộ lại dữ liệu CRM", "ACTION", "Nút Sửa hồ sơ / Gán đơn / Đồng bộ lại tại CRM"),

    // 6. HỆ THỐNG & ĐỐI SOÁT
    SYNC_VIEW("SYNC_VIEW", "Xem Đối soát & Lịch sử đồng bộ", "Hệ thống & Đối soát",
            "Truy cập màn hình Đối soát Google Sheet để xem trạng thái kết nối, danh sách sai lệch và lịch sử phiên chạy", "VIEW", "Menu Đối soát Google Sheet (/doi-soat)"),
    SYNC_MANAGE("SYNC_MANAGE", "Thực thi Đồng bộ & Xử lý sai lệch", "Hệ thống & Đối soát",
            "Thao tác chạy đồng bộ thủ công, xử lý/đóng cảnh báo sai lệch, duyệt hoàn hàng từ Sheet và cấu hình đồng bộ", "ACTION", "Nút Chạy đồng bộ / Xử lý sai lệch tại Đối soát"),
    LOGS_VIEW("LOGS_VIEW", "Xem Nhật ký hoạt động hệ thống", "Hệ thống & Đối soát",
            "Truy cập màn hình Nhật ký hoạt động để tra cứu lịch sử thao tác của mọi tài khoản theo thời gian", "VIEW", "Menu Nhật ký hoạt động (/nhat-ky)"),
    EXPORT_DATA("EXPORT_DATA", "Xuất dữ liệu báo cáo ra file Excel", "Hệ thống & Đối soát",
            "Thao tác tải xuống file Excel danh sách mã máy, hồ sơ khách hàng CRM và danh sách máy hết hạn bảo hành", "ACTION", "Nút Xuất Excel tại Quản lý mã máy & CRM"),
    USER_MANAGE("USER_MANAGE", "Quản trị người dùng & Phân quyền", "Hệ thống & Đối soát",
            "Truy cập quản lý tài khoản nhân sự: tạo tài khoản mới, cấp/thu hồi quyền chi tiết, đổi mật khẩu và khóa tài khoản", "ACTION", "Menu Cấu hình & Phân quyền - Tab Người dùng (/he-thong)"),
    SYSTEM_MANAGE("SYSTEM_MANAGE", "Cấu hình hệ thống & Bảo trì máy chủ", "Hệ thống & Đối soát",
            "Thao tác cấu hình thông số hệ thống, đồng bộ Google Sheets và thực thi bảo trì làm sạch dữ liệu", "ACTION", "Menu Cấu hình & Phân quyền - Tab Hệ thống (/he-thong)");

    private final String code;
    private final String name;
    private final String group;
    private final String description;
    private final String type;
    private final String module;

    AppPermission(String code, String name, String group, String description, String type, String module) {
        this.code = code;
        this.name = name;
        this.group = group;
        this.description = description;
        this.type = type;
        this.module = module;
    }

    public static List<PermissionDto> getAllPermissionDtos() {
        return Arrays.stream(values())
                .map(p -> PermissionDto.builder()
                        .code(p.getCode())
                        .name(p.getName())
                        .group(p.getGroup())
                        .description(p.getDescription())
                        .type(p.getType())
                        .module(p.getModule())
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
                        MANAGE_MACHINE_CODES.getCode(),
                        INVENTORY_ACCESSORY.getCode(),
                        ACCESSORY_HISTORY.getCode(),
                        INVENTORY_PART.getCode(),
                        INSPECTION.getCode(),
                        WARRANTY_CHECK.getCode(),
                        SERVICE_REPAIR.getCode(),
                        SERVICE_VIEW.getCode(),
                        CRM_VIEW.getCode(),
                        CRM_CARE.getCode(),
                        SYNC_VIEW.getCode()
                );
            default:
                return Collections.emptySet();
        }
    }
}
