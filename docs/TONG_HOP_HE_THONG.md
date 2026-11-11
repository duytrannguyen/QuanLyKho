# 📘 CẨM NANG TOÀN DIỆN HỆ THỐNG QUẢN LÝ KHO QKSHOP (V2)
## Tài Liệu Tổng Hợp Kiến Trúc, Toàn Bộ Luồng Xử Lý Logic Nghiệp Vụ, Hướng Dẫn Sử Dụng & Vận Hành Hệ Thống

> **Dự án:** QKShop Warehouse Management System (WMS V2)  
> **Phiên bản tài liệu:** 2.2.0 (Cập nhật toàn diện mới nhất)  
> **Nền tảng công nghệ:** Java 21 · Spring Boot 3.3.5 · React 19 · Vite 6 · MySQL 8.0 · Docker  
> **Nguyên tắc dữ liệu cốt lõi:** Một Nguồn Sự Thật Duy Nhất (Single Source of Truth - SSOT)  
> **Đối tượng áp dụng:** Ban Giám đốc, Quản lý cửa hàng, Kế toán, Nhân viên Bán hàng, Nhân viên Kho, Kỹ thuật viên & Quản trị hệ thống.

---

## 📑 MỤC LỤC TỔNG HỢP

- **PHẦN I: TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC DỮ LIỆU CỐT LÕI**
  - 1.1. Kiến trúc phân tầng hiện đại (N-Tier Decoupled Architecture)
  - 1.2. Ba kho hàng độc lập trong hệ thống (Kho Máy, Kho Phụ kiện, Kho Linh kiện)
  - 1.3. Ma trận Nguồn Sự Thật Duy Nhất (Single Source of Truth - SSOT)
  - 1.4. Quy chuẩn sinh Mã Hóa Đơn tự động 10 ký tự (`BM`, `PK`, `SC`) & Mã SKU
  - 1.5. Cơ chế Bảo mật JWT kép & Phân quyền RBAC 27 Mã quyền (Phân loại View, Action, Critical)

- **PHẦN II: GIẢI THÍCH CHI TIẾT 12 LUỒNG XỬ LÝ LOGIC NGHIỆP VỤ HỆ THỐNG**
  - Luồng 1: Vòng đời toàn diện của 1 chiếc máy tính (`Machine Lifecycle`) & Thuật toán `Re-link Config`
  - Luồng 2: Kiểm định chất lượng kỹ thuật (QC) & Cơ chế tính tuổi tồn kho trừ thời gian chờ (`pausedDays`)
  - Luồng 3: Bán máy tại quầy (POS) & Công thức bóc tách doanh thu chống tính trùng (`Anti-Double Counting`)
  - Luồng 4: Đơn Ship COD — Vận chuyển, Kích hoạt bảo hành khi giao thành công & Hoàn đơn ship 1 chạm
  - Luồng 5: Quản lý & Bán lẻ Phụ kiện (`PK-...`) kèm gói Quà tặng mặc định 0đ
  - Luồng 6: Quản lý Kho Linh kiện kỹ thuật (`LK-...`) phục vụ nâng cấp máy và sửa chữa
  - Luồng 7: Tiếp nhận Dịch vụ Sửa chữa (`SC...`), Tự động trừ/hoàn kho & Chống âm kho
  - Luồng 8: Cơ chế Chống gian lận bảo hành (`checkWarrantyEligibility`) & Hủy bảo hành khi thu mua/hoàn máy
  - Luồng 9: Tra cứu Bảo hành hợp nhất "3 trong 1" & Bộ Modal Chi tiết / Chỉnh sửa đơn chuyên biệt
  - Luồng 10: Khách hàng (CRM) — Chuẩn hóa SĐT, Gán đơn vãng lai, Nhật ký CSKH & Máy hết hạn bảo hành
  - Luồng 11: Báo cáo Doanh số đa chiều (4 Tabs: Tổng quan, Sản phẩm, Khách hàng, Chất lượng dữ liệu)
  - Luồng 12: Bảng giá Niêm yết, Thẻ giá trưng bày kệ (`PriceCard`) & Đồng bộ đối soát 2 chiều Google Sheets

- **PHẦN III: HƯỚNG DẪN THAO TÁC CHI TIẾT 24 MÀN HÌNH (THEO 6 NHÓM MENU)**
  - Nhóm 1: Tổng quan & Báo cáo (*Bàn điều hành, Báo cáo doanh số, Thống kê phân tích*)
  - Nhóm 2: Bán hàng & Dịch vụ (*Bán máy POS, Bán phụ kiện lẻ, Đơn ship, Sửa chữa, Tra cứu sửa chữa, Bảng giá*)
  - Nhóm 3: Kho máy & Kiểm định (*Tồn kho máy, Quản lý mã máy, Nhập kho máy, Kiểm định QC*)
  - Nhóm 4: Linh kiện & Phụ kiện (*Nhập/Kho/Lịch sử phụ kiện, Nhập/Kho linh kiện*)
  - Nhóm 5: Bảo hành & CRM (*Tra cứu bảo hành 3 trong 1, Khách hàng CRM, Chi tiết khách hàng, Máy hết hạn bảo hành*)
  - Nhóm 6: Hệ thống & Đối soát (*Đối soát Google Sheet, Nhật ký hoạt động, Cấu hình & Phân quyền*)

- **PHẦN IV: HƯỚNG DẪN TRIỂN KHAI, SAO LƯU DỮ LIỆU & VẬN HÀNH MÁY CHỦ / VPS**
  - 4.1. Khởi chạy trọn gói siêu tốc 3 bước trên VPS Ubuntu bằng Docker
  - 4.2. Quy trình Cập nhật phiên bản mới nóng (Hot-update) không gián đoạn Database
  - 4.3. Kế hoạch Sao lưu (Backup) & Khôi phục (Restore) MySQL định kỳ an toàn
  - 4.4. Cấu hình biến môi trường `.env` và thiết lập SSL/HTTPS qua Cloudflare

- **PHẦN V: CÂU HỎI THƯỜNG GẶP (FAQ) & CẨM NANG XỬ LÝ TÌNH HUỐNG THỰC TẾ**

---

# PHẦN I: TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC DỮ LIỆU CỐT LÕI

## 1.1. Kiến trúc phân tầng hiện đại (N-Tier Decoupled Architecture)

Hệ thống **QKShop WMS V2** được kiến tạo theo tiêu chuẩn kiến trúc doanh nghiệp phân tách triệt để giữa Giao diện người dùng (Single Page Application - React 19) và Tầng xử lý nghiệp vụ trung tâm (RESTful API - Spring Boot 3.3.5 / Java 21), liên kết chặt chẽ với cơ sở dữ liệu quan hệ MySQL 8.0 InnoDB:

```
[ TRÌNH DUYỆT NGƯỜI DÙNG (Desktop / Tablet / Mobile) ]
                         │
                         ▼ (HTTP Port 80 / 443)
       ┌────────────────────────────────────────────────────────┐
       │     NGINX REVERSE PROXY & WEB SERVER (Docker Alpine)   │
       │  - Phục vụ Static SPA Assets (HTML, CSS, Vite Bundles)  │
       │  - Chuyển tiếp Request API: /api/* -> Spring Boot      │
       └─────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│             BACKEND API SERVICE (Spring Boot 3.3.5 / Java 21)          │
│                                                                        │
│  [ Spring Security 6 ] ──> JWT Authentication Filter (Access + Refresh) │
│                                 │                                      │
│  [ Controllers ]      ──> Payload Validation (@Valid), ApiResponse<T>  │
│                                 │                                      │
│  [ Services ]         ──> Business Logic, @Transactional, Idempotency  │
│                                 │                                      │
│  [ Repositories ]     ──> Spring Data JPA, Hibernate, Criteria Queries │
│                                 │                                      │
│  [ Event System ]     ──> SalesOrderChangedEvent, CrmLinkEventListener │
│  [ JasperReports ]    ──> Render Bảng Báo Giá PDF A4 / A5 Chuẩn In Ấn  │
└─────────────────────────┬──────────────────────────────┬───────────────┘
                          │                              │
                          ▼                              ▼
          ┌──────────────────────────────┐ ┌─────────────────────────────┐
          │  DATABASE MYSQL 8.0 (InnoDB) │ │ TÍCH HỢP GOOGLE SHEETS API  │
          │   Nguồn Sự Thật Duy Nhất     │ │ - Service Account JSON      │
          │  32 Bảng & Sổ Cái Giao Dịch  │ │ - Đồng bộ định kỳ 15 phút   │
          └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 1.2. Ba kho hàng độc lập trong hệ thống

Một trong những cải tiến quan trọng nhất của QKShop V2 là việc **bóc tách thành 3 kho hàng độc lập**, giải quyết triệt để sự nhập nhằng giữa hàng bán chính, quà tặng khuyến mãi và vật tư sửa chữa:

| Tiêu chí | 1. Kho Máy Tính | 2. Kho Phụ Kiện | 3. Kho Linh Kiện |
|:---|:---|:---|:---|
| **Đơn vị quản lý** | Từng chiếc máy theo **Số Serial / Service Tag** duy nhất | Theo số lượng tồn kho của **Mã SKU Phụ kiện** | Theo số lượng tồn kho của **Mã SKU Linh kiện** |
| **Định dạng mã chuẩn** | Chuỗi Serial hãng (VD: `SN-DELL-8899`, `C02XG0...`) | `PK-<LOẠI>-<4 SỐ>`<br>*(VD: `PK-CHUOT-0001`, `PK-BALO-0002`)* | `LK-<LOẠI>-<4 SỐ>`<br>*(VD: `LK-RAM-0001`, `LK-SSD-0003`)* |
| **Danh mục phân loại** | Hãng (`Brand`) ➔ Dòng (`ModelLine`) ➔ Nền tảng ➔ Biến thể (`VariantV2`) | Chuột, Balo, Túi chống sốc, Bàn di chuột, Hub chuyển đổi, Sạc phụ... | 12 nhóm: `RAM`, `SSD`, `HDD`, `PIN`, `MAN`, `PHIM`, `SAC`, `MAIN`, `FAN`, `BANLE`, `LOA`, `KHAC` |
| **Mục đích sử dụng** | Bán lẻ máy tính tại quầy POS hoặc gửi Ship COD | • Xuất làm **Quà tặng mặc định (0đ)** kèm máy<br>• Xuất **Bán lẻ phụ kiện** cho khách | • Xuất **Nâng cấp máy** khi bán lẻ (`UPGRADE_USE`)<br>• Xuất **Thay thế sửa chữa** dịch vụ (`REPAIR_USE`) |
| **Bảng lưu trữ SSOT** | `active_inventory` (Đang tồn)<br>`closed_cycles` (Đã xuất bán) | `accessories` (Danh mục & số lượng)<br>`accessory_history` (Nhật ký xuất nhập) | `parts` (Danh mục, số lượng & vị trí ngăn)<br>`part_history` (Nhật ký biến động) |

---

## 1.3. Ma trận Nguồn Sự Thật Duy Nhất (Single Source of Truth - SSOT)

Để đảm bảo dữ liệu trên toàn bộ 24 màn hình không bao giờ bị vênh hoặc lệch số liệu, hệ thống quy định nghiêm ngặt **Bảng nguồn chuẩn duy nhất** cho từng thực thể:

```
                               ┌─────────────────────────┐
                               │     serial_registry     │  (Định danh duy nhất từng Serial)
                               └────────────┬────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │     active_inventory      │                 │       closed_cycles       │
       │ Máy đang nằm tại cửa hàng │                 │ Máy đã bán / xuất trả NCC │
       │ (NEEDS_INSPECTION, READY) │                 │ (SALE, CUSTOMER_RETURN)   │
       └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            │
                                            ▼ (Mọi giao dịch bán máy, phụ kiện, sửa chữa)
                               ┌─────────────────────────┐
                               │      sales_orders       │  (Sổ cái doanh thu hợp nhất)
                               └────────────┬────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Báo cáo Doanh số (KPI)  │                 │    Hồ sơ Khách hàng CRM   │
       │  Dashboard phân tích kênh │                 │   Tự động gom nhóm theo   │
       │  doanh thu & nhân viên    │                 │      Số điện thoại        │
       └───────────────────────────┘                 └───────────────────────────┘
```

1. **Serial máy tính:** Bảng `serial_registry` là gốc. Tại một thời điểm, máy chỉ có thể ở trong `active_inventory` (đang có trong kho) **hoặc** trong `closed_cycles` (đã xuất bán/đóng chu kỳ). Tuyệt đối không thể xuất hiện song song.
2. **Doanh thu toàn cửa hàng:** Bảng `sales_orders` là sổ cái trung tâm duy nhất. Mọi đơn **Bán máy (`MACHINE`)**, **Bán phụ kiện (`ACCESSORY`)**, và **Dịch vụ sửa chữa (`REPAIR`)** đều tự động kết chuyển về đây.
3. **Khách hàng:** Bảng `crm_customers` liên kết với `sales_orders` qua trường Số điện thoại chuẩn hóa (`normalized_phone`). Bất kỳ đơn hàng nào được tạo mới, chỉnh sửa hay hoàn trả đều lập tức phát sự kiện `SalesOrderChangedEvent` để CRM cập nhật ngay tức thì mà không cần nạp lại toàn bộ CSDL.

---

## 1.4. Quy chuẩn sinh Mã Hóa Đơn tự động 10 ký tự & Mã SKU

Hệ thống triển khai thuật toán sinh mã độc quyền thông qua `InvoiceCodeService`, tạo ra mã hóa đơn 10 ký tự đồng nhất, dễ đọc, mang tính định danh cao:

$$\mathbf{M\tilde{a}\ H\acute{o}a\ \DJ\uhorn n} = \mathbf{[Ti\grave{e}n\ t\acute{o}\ 2\ k\acute{y}\ t\uhorn]}\ +\ \mathbf{[STT\ trong\ th\acute{a}ng\ (4\ ch\tilde{u}\ s\acute{o})]}\ +\ \mathbf{[Ng\grave{a}y/Th\acute{a}ng\ ddMM\ (4\ ch\tilde{u}\ s\acute{o})]}$$

- **Đơn Bán Máy (`BM`):** `BM` + `0001` + `0611` $\rightarrow$ **`BM00010611`** (Đơn bán máy số 1 trong tháng, tạo ngày 06/11).
- **Đơn Bán Phụ Kiện Lẻ (`PK`):** `PK` + `0015` + `0611` $\rightarrow$ **`PK00150611`** (Đơn bán phụ kiện lẻ số 15 trong tháng).
- **Đơn Phụ Kiện Đi Kèm Máy:** Tự động sinh với tiền tố `PK-KEM-<Mã chu kỳ máy>` (Ví dụ: `PK-KEM-1730000000`).
- **Phiếu Dịch Vụ Sửa Chữa (`SC`):** `SC` + `0003` + `0611` $\rightarrow$ **`SC00030611`** (Phiếu sửa chữa số 3 trong tháng).
- **Mã SKU Phụ kiện:** `PK-<DANH_MỤC>-<4 SỐ>` (Ví dụ: `PK-CHUOT-0001`, `PK-BALO-0005`, `PK-BANPHIM-0002`).
- **Mã SKU Linh kiện:** `LK-<PHÂN_LOẠI>-<4 SỐ>` (Ví dụ: `LK-RAM-0001`, `LK-SSD-0002`, `LK-PIN-0004`, `LK-MAN-0001`).

---

## 1.5. Cơ chế Bảo mật JWT kép & Phân quyền RBAC 27 Mã quyền

Hệ thống bảo vệ nghiêm ngặt bằng cơ chế **Token kép (Dual-Token)** kết hợp **Spring Security 6 Method Security**:
- **Access Token:** Hết hạn sau 24 giờ, chứa thông tin `userId`, `username`, `role` và danh sách mảng quyền `permissions`.
- **Refresh Token:** Hết hạn sau 7 ngày, lưu trữ an toàn. Khi Access Token hết hạn, `axiosClient` trên Frontend tự động kích hoạt cuộc gọi ngầm tới `/api/auth/refresh` để nhận Access Token mới và gửi lại request ban đầu một cách trong suốt với người dùng.

### Hệ thống 27 Mã quyền chi tiết (`AppPermission`):
Mỗi quyền được gán kèm thuộc tính Phân loại (`VIEW` hoặc `ACTION`) và Cờ cảnh báo nguy hiểm (`critical = true` cho các thao tác xóa, hoàn tiền, cấp quyền):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ NHÓM 1: TỔNG QUAN & BÁO CÁO                                                            │
│  • DASHBOARD_VIEW    (VIEW)   : Xem Bàn điều hành (/), tổng tồn kho, cảnh báo ưu tiên  │
│  • SALES_REPORT_VIEW (VIEW)   : Xem Báo cáo doanh số (/bao-cao-ban-hang), phân tích KPI│
│  • ANALYTICS_VIEW    (VIEW)   : Xem Thống kê phân tích kho (/phan-tich), tuổi tồn kho  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NHÓM 2: BÁN HÀNG & GIAO VẬN                                                            │
│  • SALE_MACHINE      (ACTION) : Lập đơn xuất bán máy lẻ POS (/ban-may)                 │
│  • SALE_ACCESSORY    (ACTION) : Lập đơn bán lẻ phụ kiện (/ban-phu-kien)                │
│  • SHIP_MANAGE       (ACTION) : Quản lý đơn ship COD (/don-ship), xác nhận giao hàng   │
│  • ORDER_EDIT        (ACTION) [CRITICAL] : Sửa hóa đơn đã xuất (thông tin, bảo hành)   │
│  • ORDER_RETURN      (ACTION) [CRITICAL] : Đổi trả, hoàn đơn ship, thu hồi về kho      │
│  • PRICING_VIEW      (VIEW)   : Xem bảng giá niêm yết (/bang-gia)                      │
│  • PRICING_MANAGE    (ACTION) : Tùy chỉnh thẻ giá, điều chỉnh giá in, xuất PDF A4/A5   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NHÓM 3: KHO MÁY & KIỂM ĐỊNH                                                            │
│  • SEARCH_INVENTORY  (VIEW)   : Tra cứu tồn kho máy theo Serial, cấu hình (/tra-cuu)   │
│  • MANAGE_MACHINE_CODES (ACTION): Quản lý sổ mã máy, tra cứu lịch sử (/quan-ly-ma-may) │
│  • IMPORT_MACHINE    (ACTION) : Nhập kho máy lẻ, nhập lô, nhập Excel (/nhap-may)       │
│  • MACHINE_UPDATE    (ACTION) : Sửa thông tin cấu hình máy, cập nhật giá hàng loạt     │
│  • MACHINE_DELETE    (ACTION) [CRITICAL] : Xóa bỏ vĩnh viễn serial máy khỏi kho        │
│  • INSPECTION        (ACTION) : Kiểm định chất lượng QC, duyệt READY (/kiem-tra)       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NHÓM 4: LINH KIỆN & PHỤ KIỆN                                                           │
│  • IMPORT_ACCESSORY  (ACTION) : Nhập kho phụ kiện mới (/nhap-phu-kien)                  │
│  • INVENTORY_ACCESSORY (VIEW) : Xem tồn kho phụ kiện (/ton-kho-phu-kien)               │
│  • ACCESSORY_MANAGE  (ACTION) : Sửa giá, xóa phụ kiện, cài Bộ quà tặng mặc định        │
│  • ACCESSORY_HISTORY (VIEW)   : Xem lịch sử xuất bán phụ kiện (/lich-su-ban-phu-kien)   │
│  • IMPORT_PART       (ACTION) : Nhập kho linh kiện phần cứng (/nhap-linh-kien)         │
│  • INVENTORY_PART    (VIEW)   : Xem tồn kho linh kiện, vị trí tủ kệ (/ton-kho-linh-kien)│
│  • PART_MANAGE       (ACTION) : Sửa thông tin, đơn giá, xóa mã linh kiện              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NHÓM 5: BẢO HÀNH & CRM                                                                 │
│  • WARRANTY_CHECK    (VIEW)   : Tra cứu bảo hành 3 trong 1 (/bao-hanh)                 │
│  • SERVICE_REPAIR    (ACTION) : Lập phiếu tiếp nhận sửa chữa (/dich-vu-sua-chua)       │
│  • SERVICE_VIEW      (VIEW)   : Tra cứu tiến độ phiếu sửa chữa (/tra-cuu-sua-chua)     │
│  • CRM_VIEW          (VIEW)   : Tra cứu hồ sơ khách hàng, máy hết bảo hành (/khach-hang)│
│  • CRM_MANAGE        (ACTION) : Sửa hồ sơ khách, gán đơn vãng lai, thêm Care Notes     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NHÓM 6: HỆ THỐNG & ĐỐI SOÁT                                                            │
│  • SYNC_VIEW         (VIEW)   : Xem màn hình Đối soát Google Sheet (/doi-soat)         │
│  • SYNC_MANAGE       (ACTION) : Chạy đồng bộ thủ công, xử lý cảnh báo lệch kho         │
│  • LOGS_VIEW         (VIEW)   : Xem nhật ký kiểm toán hoạt động (/nhat-ky)             │
│  • EXPORT_DATA       (ACTION) : Xuất dữ liệu báo cáo ra file Excel                     │
│  • USER_MANAGE       (ACTION) [CRITICAL] : Quản trị tài khoản, cấp quyền, đổi mật khẩu │
│  • SYSTEM_MANAGE     (ACTION) [CRITICAL] : Cấu hình thông số hệ thống, bảo trì CSDL    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# PHẦN II: GIẢI THÍCH CHI TIẾT 12 LUỒNG XỬ LÝ LOGIC NGHIỆP VỤ HỆ THỐNG

---

## Luồng 1: Vòng đời toàn diện của 1 chiếc máy tính (`Machine Lifecycle`) & Thuật toán `Re-link Config`

Một chiếc máy tính khi nhập về kho sẽ trải qua các chặng trạng thái được kiểm soát chặt chẽ bởi `StateTransitionService`:

```
                  ┌──────────────────────────────────────────────┐
                  │ 1. NHẬP KHO MÁY (Trang /nhap-may)            │
                  │    Nhập lẻ / Nhập lô / Nhập file Excel       │
                  │    Sinh mã chu kỳ: CYC-<timestamp>-<hash>    │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
   ┌─────────────────────────────────┐       ┌─────────────────────────────────┐
   │ Trạng thái: NEEDS_INSPECTION    │       │ Trạng thái: READY               │
   │ (Máy cần kiểm tra chất lượng)   │       │ (Máy đã test sẵn từ trước)      │
   │ Tự động tạo InspectionRequest   │       │ Sẵn sàng bán ngay lập tức       │
   └────────────────┬────────────────┘       └────────────────┬────────────────┘
                    │                                         │
                    ▼                                         │
   ┌─────────────────────────────────┐                        │
   │ 2. KIỂM ĐỊNH QC (Trang /kiem-tra)│                       │
   │    KTV kiểm tra phần cứng       │                        │
   │    Duyệt ĐẠT (transitionToReady)│                        │
   └────────────────┬────────────────┘                        │
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 3. SẴN SÀNG BÁN & IN BẢNG GIÁ (Trang /tra-cuu, /bang-gia)    │
   │    Hiển thị trên POS Bán máy, hiện thẻ giá chào hàng        │
   └─────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 4. XUẤT BÁN CHO KHÁCH (Trang /ban-may)                      │
   │    transitionToClosed -> CloseType: SALE                    │
   │    Chuyển sang closed_cycles, sinh hóa đơn BMxxxxddMM       │
   └─────────────────────────────┬───────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
   │ 5A. KHÁCH ĐỔI/TRẢ MÁY           │   │ 5B. SHOP THU MUA LẠI MÁY        │
   │     IntakeType: CUSTOMER_RETURN │   │     IntakeType: CUSTOMER_BUYBACK│
   │     - Hủy bảo hành đơn cũ       │   │     - Hủy bảo hành đơn cũ       │
   │     - Tái tạo Active chu kỳ mới │   │     - Nhập lại kho chu kỳ mới   │
   └─────────────────────────────────┘   └─────────────────────────────────┘
```

### Thuật toán Re-link Config Pattern (Bảo toàn dữ liệu danh mục):
- Trong CSDL, cấu hình máy được quản lý theo mô hình cây: `Brand` $\rightarrow$ `ModelLine` $\rightarrow$ `Platform` $\rightarrow$ `VariantV2` $\rightarrow$ `SalesConfig`.
- **Vấn đề thực tế:** Nếu trong kho có 10 chiếc *ThinkPad T480 (Core i5, RAM 8GB)*. Khi nhân viên kho lấy 1 chiếc ra lắp thêm thanh RAM thành *16GB* và bấm sửa máy:
- **Thuật toán xử lý của QKShop:** `MachineService` **tuyệt đối không sửa đè** lên bản ghi `SalesConfig` đang dùng chung. Thay vào đó, hệ thống chạy chuỗi hàm an toàn `findOrCreateBrand` $\rightarrow$ `findOrCreatePlatform` $\rightarrow$ `findOrCreateVariant` $\rightarrow$ `findOrCreateConfig`. Nếu đã có cấu hình 16GB thì gán liên kết (`ai.setConfig(cfg16GB)`), nếu chưa có thì sinh nhánh mới. **9 chiếc máy 8GB còn lại trong kho được giữ nguyên 100%!**

---

## Luồng 2: Kiểm định chất lượng kỹ thuật (QC) & Cơ chế tính tuổi tồn kho (`pausedDays`)

1. **Khởi tạo tự động:** Khi máy nhập kho với trạng thái `NEEDS_INSPECTION`, hệ thống tự động sinh một bản ghi `InspectionRequest` ở trạng thái `OPEN`.
2. **Kỹ thuật viên thao tác (`/kiem-tra`):**
   - Bấm **"Bắt đầu"** $\rightarrow$ Trạng thái chuyển sang `IN_PROGRESS`, ghi nhận thời gian bắt đầu kiểm tra.
   - Nhập tiến độ: Đánh giá ngoại hình, bàn phím, màn hình, loa, mic, camera, pin, cổng kết nối, nhiệt độ. Bấm **"Lưu tiến độ"** để lưu tạm.
   - Bấm **"Xác nhận Đạt"** $\rightarrow$ Hệ thống gọi `StateTransitionService.transitionToReady`: Máy chuyển sang `READY`, `readyAt = now()`, cập nhật `serial_registry.currentState = READY`.
   - Bấm **"Hủy / Trả máy lỗi"** $\rightarrow$ Đóng vòng đời với loại `SUPPLIER_RETURN` hoặc `CANCEL`.
3. **Cơ chế tính tuổi tồn kho chính xác (`pausedDays`):**
   - Khi máy nằm ở trạng thái `NEEDS_INSPECTION`, thời gian này máy chưa thể bán được.
   - Hệ thống tự động đo đạc khoảng thời gian từ lúc nhập/tạm dừng đến khi được duyệt đạt và cộng vào trường `pausedDays`.
   - Khi hệ thống tính toán **Tuổi thọ tồn kho (Inventory Age)** trên Dashboard, công thức tính là:
     $$\mathbf{Tu\hat{o}i\ t\grave{o}n\ kho\ th\uhorn c\ t\acute{e}} = (\mathbf{Th\grave{o}i\ \dj i\hat{e}m\ hi\hat{e}n\ t\d{a}i} - \mathbf{Ng\grave{a}y\ nh\text{ậ}p\ intakeAt}) - \mathbf{pausedDays}$$
     Giúp quản lý đánh giá đúng tốc độ bán của đội ngũ Sales, không tính oan thời gian máy nằm chờ linh kiện hoặc chờ test.

---

## Luồng 3: Bán máy tại quầy (POS) & Công thức bóc tách doanh thu (`Anti-Double Counting`)

Khi bán 1 máy tính tại trang `/ban-may`, đơn hàng thực tế thường là một gói tổng hợp bao gồm: **Máy tính + Nâng cấp RAM/SSD + Quà tặng miễn phí + Phụ kiện mua thêm có tính tiền**.

```
                           TỔNG TIỀN THU TỪ KHÁCH (finalPrice)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
     DOANH THU THUẦN ĐƠN MÁY                                   DOANH THU ĐƠN PHỤ KIỆN
         (machineNetRevenue)                                   (totalPaidAccessoriesAmount)
  ┌─────────────────────────────────────┐               ┌─────────────────────────────────────┐
  │ • Giá máy gốc niêm yết              │               │ • Chuột Gaming mua thêm (+200k)     │
  │ • Tiền nâng cấp RAM/SSD (+300k)     │               │ • Bàn phím cơ mua thêm (+500k)      │
  │ • Quà tặng mặc định Balo, Chuột (0đ)│               │                                     │
  │ • Trừ tiền phụ kiện mua thêm (-700k)│               │                                     │
  └──────────────────┬──────────────────┘               └──────────────────┬──────────────────┘
                     │                                                     │
                     ▼                                                     ▼
     Hóa đơn Bán Máy (BMxxxxddMM)                       Hóa đơn Phụ Kiện Kèm (PK-KEM-...)
     orderCategory: MACHINE                             orderCategory: ACCESSORY
```

### Công thức bóc tách dòng tiền tự động:
1. **Khấu trừ phụ kiện tính phí:**
   $$\mathbf{machineNetRevenue} = \mathbf{finalPrice} - \mathbf{totalPaidAccessoriesAmount}$$
2. **Trừ kho Linh kiện nâng cấp:** Nếu khách nâng cấp RAM hoặc SSD, hệ thống gọi `partService.deductForUpgrade`:
   - Trừ trực tiếp số lượng trong bảng `parts` (Mã SKU `LK-...`).
   - Ghi nhật ký vào bảng `part_history` với hành động `UPGRADE_USE`, lưu rõ Serial máy và tên khách hàng.
3. **Trừ kho Phụ kiện:** Hệ thống gọi `accessoryService.deductAccessories`:
   - Các món quà tặng mặc định (Balo, túi chống sốc, chuột) được trừ kho với giá ghi nhận `0đ`.
   - Các món phụ kiện mua thêm được trừ kho với giá bán thực tế.
   - Tạo đơn hàng phụ kiện `PK-KEM-<cycleId>` đồng bộ vào `sales_orders` với `orderCategory = ACCESSORY`.
4. **Kết quả:** Tổng doanh thu báo cáo toàn cửa hàng luôn bằng chính xác số tiền thực thu, không bao giờ bị tính trùng tiền phụ kiện vào tiền máy!

---

## Luồng 4: Đơn Ship COD — Vận chuyển, Kích hoạt bảo hành khi giao thành công & Hoàn đơn ship

Đối với khách hàng mua máy từ xa qua các đơn vị chuyển phát (GHTK, ViettelPost, GHN, J&T):

```
[ Lập đơn tại /ban-may ] ──> Bật switch "Đơn Ship / Giao hàng"
                             - Nhập: Đơn vị vận chuyển, Mã vận đơn, Địa chỉ, Cọc, COD
                             - Trạng thái: Chờ giao hàng (isShipping = true, isDelivered = false)
                             - Hạn bảo hành cửa hàng: TẠM ĐỂ TRỐNG (warrantyExpiry = null)
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       [ TRƯỜNG HỢP 1: GIAO THÀNH CÔNG ]            [ TRƯỜNG HỢP 2: KHÁCH BOM / HOÀN HÀNG ]
       Thao tác tại /don-ship:                      Thao tác tại /don-ship:
       Bấm "Xác nhận đã giao"                       Bấm "Hoàn đơn Ship"
       - Chọn ngày khách nhận thực tế (delDate)     - Chọn trạng thái nhập lại: READY hoặc NEEDS_INSPECT
       - Trạng thái đơn: Hoàn tất                   - Máy tính tự động quay trở lại ActiveInventory
       - KÍCH HOẠT HẠN BẢO HÀNH CHÍNH XÁC:          - Quà tặng phụ kiện tự động CỘNG TRẢ VỀ KHO
         warrantyExpiry = delDate + warrantyPeriod  - Linh kiện nâng cấp tự động CỘNG TRẢ VỀ KHO
         (Áp dụng cho cả máy và phụ kiện kèm)      - Cập nhật doanh thu đơn thành 0đ (Trả hàng)
```

> **Quyền lợi khách hàng vượt trội:** Khách mua online hoàn toàn yên tâm vì thời hạn bảo hành 6 tháng hay 12 tháng chỉ bắt đầu tính từ ngày khách cầm máy trên tay, không bị trừ ngày máy nằm trên xe vận chuyển!

---

## Luồng 5: Quản lý & Bán lẻ Phụ kiện (`PK-...`) kèm gói Quà tặng mặc định 0đ

1. **Nhập kho phụ kiện (`/nhap-phu-kien`):**
   - Chọn loại danh mục $\rightarrow$ Hệ thống tự sinh SKU gợi ý `PK-<DANH_MỤC>-<4 SỐ>` qua hàm `generateNextSku`.
   - Điền tên sản phẩm, số lượng nhập, giá bán lẻ niêm yết và số tháng bảo hành mặc định (VD: Chuột 06 tháng, Balo 0 tháng).
   - Nếu nhập trùng SKU có sẵn: Hệ thống tự động **cộng dồn số lượng tồn kho** và ghi nhận lịch sử vào `accessory_history` (`action = IMPORT`).
2. **Cấu hình Bộ quà tặng mặc định khi bán máy (`/ton-kho-phu-kien`):**
   - Quản lý có thể cấu hình danh sách quà tặng cố định (ví dụ: 1 Balo QKShop + 1 Chuột không dây Fuhlen + 1 Bàn di chuột).
   - Cấu hình này được lưu trong `system_config` với khóa `DEFAULT_GIFT_BUNDLE`.
   - Mỗi khi nhân viên mở màn hình Bán máy POS, gói quà này tự động nạp sẵn vào giỏ hàng với giá `0đ`, giúp nhân viên thao tác nhanh chóng và kho phụ kiện được trừ tự động chuẩn xác từng món.
3. **Bán lẻ phụ kiện độc lập (`/ban-phu-kien`):**
   - Thêm nhiều phụ kiện vào giỏ hàng, cho phép chọn **thời hạn bảo hành riêng cho từng món** (Không BH, 1T, 3T, 6T, 12T, 24T...).
   - Bấm **"Hoàn tất xuất bán"**:
     - Sinh mã hóa đơn chuẩn `PKxxxxddMM` (Lưu vào bảng `accessory_orders` và `accessory_order_items`).
     - Tự động trừ tồn kho phụ kiện và ghi lịch sử `SALE_STANDALONE`.
     - Đồng bộ 1:1 sang sổ cái `sales_orders` để báo cáo doanh số ghi nhận doanh thu phụ kiện.
     - Hiển thị cửa sổ in phiếu biên nhận bảo hành giao cho khách.

---

## Luồng 6: Quản lý Kho Linh kiện kỹ thuật (`LK-...`) phục vụ nâng cấp máy và sửa chữa

Kho linh kiện phần cứng (`parts`) là trái tim của phòng kỹ thuật, quản lý nghiêm ngặt theo 12 nhóm danh mục:
- `RAM` (Bộ nhớ trong), `SSD` (Ổ cứng thể rắn), `HDD` (Ổ cứng cơ), `PIN` (Battery), `MAN` (Màn hình/LCD), `PHIM` (Bàn phím), `SAC` (Adapter), `MAIN` (Mainboard), `FAN` (Quạt tản nhiệt), `BANLE` (Bản lề), `LOA` (Speaker), `KHAC` (Linh kiện khác).

### Cơ chế luân chuyển kho linh kiện:
1. **Nhập kho linh kiện (`/nhap-linh-kien`):** Khai báo mã `LK-...`, tên thông số, đơn giá nhập/bán, số lượng và **vị trí ngăn tủ lưu trữ** (VD: *Ngăn A2 - Tủ RAM DDR4*).
2. **Xuất nâng cấp máy khi bán lẻ (`UPGRADE_USE`):**
   - Được gọi tự động từ màn hình Bán máy POS.
   - Trừ số lượng tồn kho trong `parts`, ghi nhận chi tiết số serial máy được nâng cấp.
3. **Xuất thay thế khi sửa chữa dịch vụ (`REPAIR_USE`):**
   - Được gọi tự động từ màn hình Tiếp nhận sửa chữa.
   - Ghi nhận mã phiếu sửa chữa `SC...` và số điện thoại khách hàng.
4. **Cơ chế Chống Âm Kho Tuyệt Đối:**
   - Trong `PartService.deductForRepair` và `deductForUpgrade`, hệ thống kiểm tra:
     ```java
     if (part.getQuantity() < requestedQuantity) {
         throw new IllegalStateException("Linh kiện '" + part.getName() + "' không đủ số lượng tồn kho (Cần: " 
                 + requestedQuantity + ", Tồn: " + part.getQuantity() + ")");
     }
     ```
   - Nhờ bọc trong `@Transactional`, nếu kho không đủ thì toàn bộ giao dịch lập tức bị hủy bỏ (Rollback), bảo vệ số liệu kho không bao giờ bị âm.

---

## Luồng 7: Tiếp nhận Dịch vụ Sửa chữa (`SC...`), Tự động trừ/hoàn kho & Chống âm kho

Quy trình quản lý dịch vụ sửa chữa chuyên nghiệp cho máy tính của khách mang tới:

```
[ KHÁCH MANG MÁY TỚI SỬA ] ──> Màn hình Tiếp nhận sửa chữa (/dich-vu-sua-chua)
                               - Nhập: Tên khách, SĐT, Tên máy, Serial máy
                               - Nhập: Tình trạng tiếp nhận, Phụ kiện nhận kèm (sạc, túi...)
                               - Chọn: Kỹ thuật viên phụ trách, Ngày hẹn trả khách
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         HẠNG MỤC LINH KIỆN THAY THẾ                        HẠNG MỤC CÔNG THỢ DỊCH VỤ
         (Chọn từ kho linh kiện LK-...)                     (Nhập tay nội dung công việc)
         - Hệ thống kiểm tra số lượng tồn kho               - Cài đặt Windows, vệ sinh máy tra keo
         - Tự động trừ kho parts                            - Hàn bản lề, sửa nguồn mainboard
         - Ghi lịch sử REPAIR_USE                           - Chọn thời hạn bảo hành riêng từng mục
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                             [ LƯU PHIẾU SỬA CHỮA SCxxxxddMM ]
                             - Tự động đồng bộ sang sales_orders (Loại REPAIR)
                             - In phiếu biên nhận dịch vụ giao cho khách
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
       [ NẾU CHỈNH SỬA PHIẾU SỬA CHỮA ]                  [ NẾU KHÁCH HỦY PHIẾU (CANCELLED) ]
       - Hoàn trả linh kiện cũ về kho parts              - Tự động hoàn trả toàn bộ linh kiện về kho
       - Trừ kho theo danh sách linh kiện mới            - Hủy doanh thu phiếu trên sổ cái sales_orders
```

---

## Luồng 8: Cơ chế Chống gian lận bảo hành (`checkWarrantyEligibility`) & Hủy bảo hành khi thu mua/hoàn máy

Đây là tính năng nghiệp vụ cao cấp vừa được hoàn thiện tại phiên bản V2, giải quyết triệt để rủi ro thất thoát trong bảo hành:

### 1. Vấn đề thực tế gặp phải:
Khách hàng mua máy tính tại shop được bảo hành 12 tháng. Sau 1 tháng, khách đem máy đến đổi trả hoặc bán lại máy cũ cho shop (Shop đã thanh toán tiền thu hồi máy). Sau đó, khách hàng này (hoặc người khác) lại dùng số Serial đó hoặc thông tin đơn cũ để yêu cầu shop bảo hành miễn phí!

### 2. Giải pháp kỹ thuật triệt để của QKShop:
Khi một chiếc máy được shop nhận lại (qua chức năng *Đổi trả đơn hàng* hoặc *Nhập kho loại `CUSTOMER_RETURN` / `CUSTOMER_BUYBACK`*):
1. **Hủy bỏ vĩnh viễn gói bảo hành cũ:**
   - Bản ghi `ClosedCycle` cũ được cập nhật: `warrantyPeriod = "Đã hủy (Đã thu lại máy)"`, `warrantyExpiry = null`.
   - Bản ghi trên sổ cái `sales_orders` được cập nhật: `orderStatus = "Trả hàng"`, `netRevenue = 0`, `warrantyExpiry = null`.
   - Cờ `isVoided = true`, `warrantyStatus = "VOIDED"`.
2. **Hàm thẩm định tính hợp lệ bảo hành (`checkWarrantyEligibility`):**
   - Khi tiếp nhận sửa chữa hoặc tra cứu bảo hành, hệ thống chạy kiểm tra:
     ```
     Nếu Serial đã từng có chu kỳ đóng và hiện đang tồn kho chu kỳ mới (hoặc loại thu hồi)
     ==> Trả về: { eligible: false, isReturned: true, warrantyCancelled: true, status: "VOIDED" }
     ```
   - **Chặn đứng tiếp nhận bảo hành 0đ:** Nếu phát hiện máy đã bị thu lại, hệ thống lập tức từ chối các hạng mục dịch vụ ghi giá `0đ` hoặc ghi *"Theo BH máy"*, thông báo rõ:
     > *"Máy có số Serial này đã được shop thu lại về kho từ khách hàng trước đó. Toàn bộ gói bảo hành của khách hàng cũ đã BỊ HỦY. Cửa hàng chỉ tiếp nhận sửa chữa dịch vụ tính phí!"*

---

## Luồng 9: Tra cứu Bảo hành hợp nhất "3 trong 1" & Bộ Modal Chi tiết / Chỉnh sửa đơn chuyên biệt

Tại trang **Tra cứu đơn & Bảo hành (`/bao-hanh`)**, người dùng chỉ cần nhập một thông tin bất kỳ vào 1 ô duy nhất:
- **Số điện thoại khách hàng**
- **Tên khách hàng**
- **Số Serial máy**
- **Mã hóa đơn (`BM...`, `PK...`, `SC...`)**

### Hệ thống trả về giao diện 3 Tab trực quan:
1. 💻 **Tab 1: Máy mua tại shop**
   - Hiển thị tên máy, cấu hình chi tiết, linh kiện nâng cấp, ngày mua, nhân viên bán, trạng thái vận chuyển.
   - Thước đo hạn bảo hành trực quan: Còn hạn bao nhiêu ngày (màu xanh) hoặc Đã hết hạn bao nhiêu ngày (màu đỏ).
   - Nếu máy đã bị thu hồi: Hiển thị badge màu xám đậm cảnh báo **"Đã hủy bảo hành (Đã thu máy)"**.
   - Bộ Modal chuyên biệt: `ModalChiTietDonHang` (xem chi tiết / in lại hóa đơn), `ModalSuaDonMay` (sửa thông tin đơn, điều chỉnh bảo hành), `ModalXacNhanGiaoHang` (xác nhận giao đơn ship).
2. 🎧 **Tab 2: Phụ kiện đã mua**
   - Gom nhóm theo từng hóa đơn bán phụ kiện, liệt kê từng món kèm thời hạn bảo hành riêng biệt.
   - Bộ Modal chuyên biệt: `ModalChiTietPhuKien`, `ModalSuaDonPhuKien`.
3. 🛠️ **Tab 3: Dịch vụ sửa chữa**
   - Hiển thị toàn bộ lịch sử các lần mang máy đến sửa, tình trạng lúc nhận, KTV phụ trách và hạn bảo hành từng hạng mục.
   - Bộ Modal chuyên biệt: `ModalChiTietSuaChua`, `ModalSuaDonSuaChua`.

---

## Luồng 10: Khách hàng (CRM) — Chuẩn hóa SĐT, Gán đơn vãng lai, Nhật ký CSKH & Máy hết hạn bảo hành

Hệ thống tích hợp sẵn phân hệ CRM tự động hóa hoàn toàn:

1. **Chuẩn hóa số điện thoại tự động (`PhoneNormalizer`):**
   - Mọi định dạng SĐT khách nhập vào như `+84 901 234 567`, `090.123.4567`, `84901234567` đều được tự động làm sạch thành định dạng 10 chữ số chuẩn: `0901234567`.
   - Tự động gom các đơn hàng phát sinh ở cả 3 phân hệ (Máy, Phụ kiện, Sửa chữa) vào cùng 1 hồ sơ khách hàng duy nhất.
2. **Gán đơn vãng lai (`DonChuaXacDinh.jsx`):**
   - Đối với các đơn hàng lịch sử hoặc đơn khách lẻ chưa ghi đúng SĐT, màn hình CRM cung cấp danh sách *Đơn chưa xác định khách* để nhân viên chọn và gán bổ sung vào hồ sơ khách hàng chỉ bằng 1 thao tác.
3. **Nhật ký chăm sóc khách hàng (`Care Notes`):**
   - Trong trang chi tiết khách hàng (`/khach-hang/:id`), nhân viên có thể lưu trữ lịch sử các cuộc gọi hỏi thăm, ý kiến phản hồi, đánh giá sự hài lòng và lịch hẹn bảo dưỡng định kỳ.
4. **Chăm sóc máy hết hạn bảo hành (`TrangMayHetBaoHanh.jsx`):**
   - Tự động lọc ra danh sách các khách hàng có máy tính vừa hết hạn bảo hành theo các mốc: *Vừa hết hạn trong 30 ngày qua*, *Hết hạn 1-3 tháng*, *Hết hạn trên 6 tháng*.
   - Cho phép lọc theo từng Thương hiệu (Dell, HP, ThinkPad, Asus...).
   - Hỗ trợ xuất dữ liệu ra file Excel chuẩn (`export-excel`) để chia danh sách cho nhân viên CSKH gọi điện mời vệ sinh tra keo tản nhiệt miễn phí, tư vấn nâng cấp RAM/SSD hoặc đổi máy mới.

---

## Luồng 11: Báo cáo Doanh số đa chiều (4 Tabs Chuyên Sâu)

Trang **Báo cáo doanh số (`/bao-cao-ban-hang`)** là trung tâm phân tích kinh doanh, chia thành 4 Tab phân tích:

1. **Tab 1: Tổng quan Doanh số (`TabTongQuan.jsx`)**
   - Thống kê Tổng doanh thu thuần, Tổng số đơn hàng, Giá trị đơn hàng trung bình (AOV), Doanh thu theo từng loại đơn (Máy, Phụ kiện lẻ, Sửa chữa).
   - Biểu đồ đường & cột biểu diễn xu hướng doanh thu theo từng ngày trong tháng, so sánh tỷ lệ tăng trưởng với tháng trước.
2. **Tab 2: Phân tích Sản phẩm (`TabSanPham.jsx`)**
   - Bảng xếp hạng Top các dòng máy tính bán chạy nhất cửa hàng.
   - Biểu đồ tròn cơ cấu doanh thu theo Thương hiệu (Dell, HP, Lenovo, Apple...) và Phân khúc (Văn phòng, Đồ họa, Gaming).
3. **Tab 3: Phân tích Khách hàng & Kênh Marketing (`TabKhachHang.jsx`)**
   - Phân tích hiệu quả các kênh tiếp cận khách hàng: Facebook, TikTok, Zalo, Google, Người quen giới thiệu, Khách vãng lai trực tiếp.
   - Tỷ lệ khách hàng quay lại mua tiếp (Khách mới vs Khách quen) và tỷ lệ khách hàng là Học sinh / Sinh viên.
4. **Tab 4: Kiểm tra Chất lượng Dữ liệu (`TabChatLuongDuLieu.jsx`)**
   - Đánh giá độ hoàn thiện của dữ liệu bán hàng: Tỷ lệ đơn có đầy đủ SĐT, đơn có gắn kênh Marketing.
   - Cảnh báo các đơn hàng thiếu thông tin để kế toán và bán hàng rà soát bổ sung kịp thời.

---

## Luồng 12: Bảng giá Niêm yết, Thẻ giá trưng bày kệ (`PriceCard`) & Đồng bộ đối soát Google Sheets

### A. Quy trình tạo Bảng giá & Thẻ giá 3 bước (`TrangBangGia.jsx`):
- **Bước 1: Chọn máy (`StepChonMay.jsx`):** Tìm kiếm và tích chọn các dòng máy đang có trạng thái `READY` trong kho.
- **Bước 2: Chỉnh sửa thông số (`StepChinhSua.jsx`):** Tinh chỉnh giá niêm yết, cấu hình vắn tắt (CPU, RAM, SSD, Màn hình, Card đồ họa), thời hạn bảo hành và quà tặng hiển thị trên thẻ giá.
- **Bước 3: Xem trước & In ấn (`StepXemTruocVaIn.jsx`):**
  - Xem trước mẫu thẻ giá `PriceCard` chuyên nghiệp mang thương hiệu QKShop.
  - Hỗ trợ 2 khổ in chuẩn: **Khổ A4 (9 thẻ/trang)** để phát tờ rơi hoặc gửi file cho khách; **Khổ A5 (4 thẻ/trang)** để in kẹp trực tiếp lên kệ máy trưng bày.
  - Kết xuất file PDF sắc nét qua dịch vụ JasperReports Backend.

### B. Cơ chế Đồng bộ & Đối soát Google Sheets 2 chiều (`/doi-soat`):
- Kết nối trực tiếp với Google Sheets thông qua Google Cloud Service Account.
- Chạy tự động ngầm định kỳ (mặc định 15 phút) hoặc chạy thủ công khi người dùng bấm nút.
- **Quy tắc khớp đơn chống trùng:** Nếu dòng trên Sheet mang số Serial đã được bán trên Web App, hệ thống chỉ cập nhật thông tin kênh bán từ Sheet vào đơn hàng hiện có, không sinh đơn thứ 2.
- **Bảng kê cảnh báo lệch kho (`DataIssue`):** Phát hiện các sai lệch giữa kho Web và Sheet để nhân viên kế toán xử lý:
  - Nút **"Kiểm tra lại (Recheck)"**: Quét lại dòng dữ liệu sau khi đã sửa chính tả trên Sheet.
  - Nút **"Duyệt nhập lại kho (Approve Return)"**: Nếu Sheet đánh dấu khách trả máy, hệ thống tự động đưa máy về lại kho.
  - Nút **"Đóng cảnh báo (Resolve)"**: Lưu ghi chú giải trình và đóng cảnh báo.

---

# PHẦN III: HƯỚNG DẪN THAO TÁC CHI TIẾT 24 MÀN HÌNH (THEO 6 NHÓM MENU)

Giao diện hệ thống được cấu trúc khoa học thành **6 nhóm nghiệp vụ chính** trên thanh điều hướng bên trái:

---

## NHÓM 1: TỔNG QUAN & BÁO CÁO

### 1. Bàn điều hành (`/`) — *Quyền: `DASHBOARD_VIEW`*
- **Ý nghĩa:** Trạm kiểm soát trung tâm hiển thị sức khỏe hoạt động của toàn bộ kho hàng trong ngày.
- **Thao tác:**
  - Theo dõi 4 thẻ chỉ số nhanh: Tổng số máy đang có trong kho, Số máy sẵn sàng bán (`READY`), Số máy đang chờ kiểm định kỹ thuật (`NEEDS_INSPECTION`), Số cảnh báo lệch dữ liệu cần xử lý.
  - Xem danh mục **Việc cần ưu tiên xử lý**: Các máy chờ test quá 3 ngày, các mặt hàng phụ kiện hoặc linh kiện sắp hết hàng (tồn kho $\le 2$).
  - Xem dòng thời gian **Hoạt động vừa diễn ra**: Ai vừa nhập máy, ai vừa bán đơn hàng nào.

### 2. Báo cáo doanh số (`/bao-cao-ban-hang`) — *Quyền: `SALES_REPORT_VIEW`*
- **Ý nghĩa:** Màn hình phân tích doanh số và hiệu quả bán hàng chi tiết của cửa hàng.
- **Thao tác:**
  - Chọn kỳ báo cáo: Lọc theo Tháng/Năm mong muốn.
  - Chuyển đổi giữa 4 tab phân tích: *Tổng quan doanh số*, *Phân tích sản phẩm*, *Phân tích khách hàng*, và *Chất lượng dữ liệu*.
  - Bấm nút **"Đồng bộ lại báo cáo (Rebuild)"** nếu cần hệ thống quét lại toàn bộ lịch sử đơn hàng.

### 3. Thống kê phân tích kho (`/phan-tich`) — *Quyền: `ANALYTICS_VIEW`*
- **Ý nghĩa:** Công cụ phân tích chuyên sâu giá trị vốn hàng tồn kho và tốc độ thanh khoản.
- **Thao tác:**
  - Xem biểu đồ cơ cấu giá trị tồn kho theo Thương hiệu (Dell, HP, ThinkPad...) và Phân khúc (Văn phòng, Gaming, Đồ họa).
  - Kiểm tra biểu đồ **Tuổi thọ hàng tồn kho**: Phát hiện các máy nằm trong kho quá lâu (>30 ngày, >60 ngày, >90 ngày) để kịp thời hạ giá hoặc đẩy mạnh quảng cáo xả hàng.

---

## NHÓM 2: BÁN HÀNG & DỊCH VỤ

### 4. Bán máy lẻ POS (`/ban-may`) — *Quyền: `SALE_MACHINE`*
- **Ý nghĩa:** Màn hình thu ngân lập hóa đơn xuất bán máy tính trực tiếp tại quầy hoặc gửi ship.
- **Thao tác từng bước:**
  1. **Chọn máy:** Nhập số Serial hoặc tên máy vào ô tìm kiếm. Hệ thống chỉ cho phép chọn các máy có trạng thái `READY`.
  2. **Thông tin khách hàng:** Nhập Tên khách, Số điện thoại, chọn Phân loại khách (Khách mới / Khách quen / Sinh viên) và Kênh tiếp cận (Facebook, TikTok, Zalo...).
  3. **Bảo hành & Nâng cấp:** Chọn gói thời hạn bảo hành. Nếu khách nâng cấp RAM hoặc SSD, chọn linh kiện tương ứng từ danh sách kho `LK-...`.
  4. **Quà tặng & Phụ kiện kèm:** Kiểm tra gói quà tặng mặc định (0đ). Nếu khách mua thêm phụ kiện, bấm thêm vào danh sách và kiểm tra đơn giá.
  5. **Đơn Ship (Nếu có):** Bật tùy chọn "Đơn Ship / Giao hàng", nhập thông tin Đơn vị vận chuyển, Mã vận đơn, Địa chỉ nhận, Tiền cọc và Tiền COD.
  6. **Hoàn tất:** Nhập chiết khấu giảm giá (nếu có) $\rightarrow$ Bấm **"Hoàn tất đơn hàng"** $\rightarrow$ Hệ thống sinh mã hóa đơn `BMxxxxddMM` và hiển thị bản in hóa đơn kiêm phiếu bảo hành.

### 5. Bán phụ kiện lẻ (`/ban-phu-kien`) — *Quyền: `SALE_ACCESSORY`*
- **Ý nghĩa:** Lập hóa đơn bán lẻ các món phụ kiện cho khách hàng không mua kèm máy.
- **Thao tác:** Chọn các phụ kiện còn hàng đưa vào giỏ $\rightarrow$ Điều chỉnh số lượng và chọn **thời hạn bảo hành riêng cho từng món** $\rightarrow$ Nhập Tên và SĐT khách $\rightarrow$ Bấm **"Hoàn tất xuất bán"** (sinh mã `PKxxxxddMM`) và in phiếu biên nhận.

### 6. Đơn ship & Giao hàng (`/don-ship`) — *Quyền: `SHIP_MANAGE`*
- **Ý nghĩa:** Theo dõi hành trình các đơn bán máy tính gửi chuyển phát COD đi tỉnh.
- **Thao tác:**
  - Lọc theo trạng thái: *Tất cả*, *Chờ giao hàng*, *Đã giao thành công*.
  - **Xác nhận giao thành công:** Khi bưu tá báo giao xong, bấm nút **"Xác nhận đã giao"** $\rightarrow$ Chọn ngày nhận máy thực tế của khách. Hệ thống sẽ kích hoạt tính hạn bảo hành bắt đầu từ ngày này.
  - **Hoàn đơn Ship:** Nếu khách bom hàng không nhận, bấm nút **"Hoàn đơn Ship"** $\rightarrow$ Máy tính, quà tặng và linh kiện nâng cấp sẽ tự động được cộng trả lại vào kho.

### 7. Tiếp nhận sửa chữa (`/dich-vu-sua-chua`) — *Quyền: `SERVICE_REPAIR`*
- **Ý nghĩa:** Lập phiếu nhận máy sửa chữa, vệ sinh, bảo dưỡng hoặc thay thế linh kiện cho khách.
- **Thao tác:**
  1. Nhập Tên khách, SĐT, Tên máy (Model), Số Serial.
  2. Ghi rõ **Tình trạng máy lúc nhận** (ví dụ: *Màn hình kẻ sọc, vỏ xước nhẹ*) và **Phụ kiện nhận kèm** (ví dụ: *Kèm sạc zin 65W*) để làm bằng chứng biên nhận.
  3. Chọn Ngày hẹn trả khách và Kỹ thuật viên phụ trách.
  4. Thêm các dòng dịch vụ: Chọn linh kiện từ kho `LK-...` (hệ thống tự trừ kho) hoặc gõ tay tiền công dịch vụ kỹ thuật.
  5. Bấm **"Lưu phiếu sửa chữa"** (sinh mã `SCxxxxddMM`) và in phiếu giao cho khách.

### 8. Tra cứu phiếu sửa chữa (`/tra-cuu-sua-chua`) — *Quyền: `SERVICE_VIEW`*
- **Ý nghĩa:** Màn hình quản lý tiến độ xử lý các phiếu dịch vụ sửa chữa đang thực hiện.
- **Thao tác:**
  - Tìm kiếm theo mã phiếu `SC...`, SĐT khách hoặc tên máy.
  - Cập nhật trạng thái phiếu: `RECEIVED` (Mới nhận) $\rightarrow$ `IN_PROGRESS` (Đang sửa) $\rightarrow$ `COMPLETED` (Đã sửa xong) $\rightarrow$ `DELIVERED` (Đã bàn giao cho khách) hoặc `CANCELLED` (Hủy phiếu — tự động hoàn trả linh kiện về kho).

### 9. Bảng giá niêm yết (`/bang-gia`) — *Quyền: `PRICING_VIEW`*
- **Ý nghĩa:** Xem bảng giá các dòng máy đang sẵn sàng bán và thiết kế, in ấn thẻ giá trưng bày.
- **Thao tác:**
  - Tích chọn các dòng máy cần làm bảng giá $\rightarrow$ Sang bước 2 điều chỉnh thông tin hiển thị trên thẻ giá $\rightarrow$ Sang bước 3 chọn khổ in A4 hoặc A5 để in ra giấy hoặc xuất file PDF gửi khách.

---

## NHÓM 3: KHO MÁY & KIỂM ĐỊNH

### 10. Tồn kho máy (`/tra-cuu`) — *Quyền: `SEARCH_INVENTORY`*
- **Ý nghĩa:** Tra cứu số lượng máy tính thực tế đang có trong kho theo từng nhóm cấu hình.
- **Thao tác:**
  - Nhập từ khóa (Serial, CPU, RAM, tên máy) hoặc lọc theo Thương hiệu, Phân khúc, Trạng thái (`READY` / `NEEDS_INSPECTION`).
  - Nhấp vào từng dòng cấu hình để mở rộng danh sách chi tiết từng chiếc máy (Số Serial cụ thể, ngày nhập, giá vốn, giá niêm yết, tình trạng).

### 11. Quản lý mã máy / Serial (`/quan-ly-ma-may`) — *Quyền: `MANAGE_MACHINE_CODES`*
- **Ý nghĩa:** Quản lý sâu vòng đời của từng số Serial và thực hiện các nghiệp vụ quản trị hàng loạt.
- **Thao tác:**
  - Tra cứu lịch sử của mọi số Serial (kể cả máy đang tồn trong kho lẫn máy đã bán từ trước).
  - **Sửa thông tin máy (`MACHINE_UPDATE`):** Nhấp vào máy để sửa cấu hình, giá niêm yết, ghi chú.
  - **Cập nhật giá hàng loạt:** Tích chọn nhiều máy $\rightarrow$ Nhập mức giá bán mới để hệ thống áp dụng đồng loạt trong 1 giây.
  - **Xóa máy (`MACHINE_DELETE`):** Chỉ cho phép xóa máy khi máy đó chưa từng phát sinh giao dịch bán hoặc chu kỳ đóng lịch sử.

### 12. Nhập kho máy (`/nhap-may`) — *Quyền: `IMPORT_MACHINE`*
- **Ý nghĩa:** Tiếp nhận máy tính mới về vào hệ thống kho.
- **3 Chế độ nhập kho:**
  - **Nhập đơn lẻ:** Nhập từng máy kèm Serial và cấu hình chi tiết.
  - **Nhập theo lô:** Chọn cấu hình chung một lần và dán danh sách nhiều số Serial (mỗi dòng 1 Serial).
  - **Nhập từ file Excel:** Bấm "Tải file mẫu Excel", điền danh sách máy vào bảng tính, tải file lên hệ thống $\rightarrow$ Bấm **Xem trước (Preview)** để kiểm tra lỗi/trùng lặp $\rightarrow$ Bấm **Xác nhận nhập kho**.

### 13. Kiểm định chất lượng QC (`/kiem-tra`) — *Quyền: `INSPECTION`*
- **Ý nghĩa:** Dành cho kỹ thuật viên kiểm tra toàn diện phần cứng của máy mới nhập trước khi bày bán.
- **Thao tác:**
  - Danh sách hiển thị các máy đang chờ kiểm tra kèm số ngày chờ đợi.
  - Bấm **"Bắt đầu"** trên máy cần kiểm tra.
  - Điền kết quả test vào ô ghi chú tiến độ $\rightarrow$ Bấm **"Lưu tiến độ"**.
  - Nếu máy đạt tiêu chuẩn: Bấm **"Xác nhận Đạt"** $\rightarrow$ Máy chuyển sang `READY` để nhân viên bán hàng có thể chốt đơn.
  - Nếu máy lỗi: Bấm **"Từ chối / Trả máy"** để đóng vòng đời và xuất trả nhà cung cấp.

---

## NHÓM 4: LINH KIỆN & PHỤ KIỆN

### 14. Nhập kho phụ kiện (`/nhap-phu-kien`) — *Quyền: `IMPORT_ACCESSORY`*
- **Ý nghĩa:** Khai báo và nhập kho các mặt hàng phụ kiện mới.
- **Thao tác:** Chọn danh mục phụ kiện $\rightarrow$ Hệ thống tự sinh mã SKU $\rightarrow$ Nhập tên phụ kiện, số lượng nhập, giá bán lẻ và thời hạn bảo hành mặc định $\rightarrow$ Bấm **"Nhập kho"**.

### 15. Kho phụ kiện (`/ton-kho-phu-kien`) — *Quyền: `INVENTORY_ACCESSORY`*
- **Ý nghĩa:** Quản lý số lượng tồn thực tế của từng mã phụ kiện và cài đặt quà tặng.
- **Thao tác:**
  - Theo dõi số lượng tồn kho, cảnh báo các mặt hàng sắp hết.
  - Chỉnh sửa tên, đơn giá bán của phụ kiện.
  - Bấm nút **"Cấu hình quà tặng mặc định"** để chọn sẵn các món quà tự động tặng kèm khi bán máy.

### 16. Lịch sử bán phụ kiện (`/lich-su-ban-phu-kien`) — *Quyền: `ACCESSORY_HISTORY`*
- **Ý nghĩa:** Tra cứu nhật ký toàn bộ các giao dịch nhập kho, xuất bán lẻ, xuất tặng kèm máy và hoàn kho phụ kiện theo thời gian.

### 17. Nhập kho linh kiện (`/nhap-linh-kien`) — *Quyền: `IMPORT_PART`*
- **Ý nghĩa:** Khai báo nhập kho các loại linh kiện phần cứng kỹ thuật.
- **Thao tác:** Chọn 1 trong 12 phân loại linh kiện (`RAM`, `SSD`, `PIN`, `MAN`...) $\rightarrow$ Hệ thống tự sinh mã `LK-...` $\rightarrow$ Nhập tên linh kiện, thông số kỹ thuật, số lượng, đơn giá và **vị trí ngăn tủ lưu trữ** $\rightarrow$ Bấm **"Nhập kho"**.

### 18. Kho linh kiện (`/ton-kho-linh-kien`) — *Quyền: `INVENTORY_PART`*
- **Ý nghĩa:** Theo dõi tồn kho linh kiện kỹ thuật và vị trí ngăn kệ trong kho.
- **Thao tác:** Tra cứu số lượng tồn của từng thanh RAM, ổ cứng SSD, màn hình; xem **Lịch sử biến động linh kiện** (đã xuất cho chiếc máy nào, cho phiếu sửa chữa nào hoặc lần nhập nào).

---

## NHÓM 5: BẢO HÀNH & CRM

### 19. Tra cứu đơn & Bảo hành (`/bao-hanh`) — *Quyền: `WARRANTY_CHECK`*
- **Ý nghĩa:** Cổng thông tin hợp nhất toàn bộ lịch sử mua sắm và bảo hành của khách hàng.
- **Thao tác:**
  - Nhập SĐT, Tên khách, Serial hoặc Mã đơn vào ô tìm kiếm.
  - Xem kết quả phân loại trên 3 Tab: *Máy mua tại shop*, *Phụ kiện đã mua*, *Dịch vụ sửa chữa*.
  - Bấm vào từng đơn để:
    - **Xem chi tiết & In lại phiếu:** Xem toàn bộ thông số đơn hàng.
    - **Sửa đơn hàng (`ORDER_EDIT`):** Sửa thông tin khách, gia hạn hoặc điều chỉnh thời hạn bảo hành.
    - **Đổi trả / Hoàn hàng (`ORDER_RETURN`):** Nhận lại máy vào kho, hủy bảo hành đơn cũ và hoàn trả linh kiện/phụ kiện về kho.

### 20. Khách hàng CRM (`/khach-hang`) — *Quyền: `CRM_VIEW`*
- **Ý nghĩa:** Quản lý danh bạ khách hàng, phân loại khách hàng và tổng giá trị chi tiêu.
- **Thao tác:**
  - Tìm kiếm khách hàng theo Tên hoặc Số điện thoại.
  - Sắp xếp theo: *Khách chi tiêu nhiều nhất*, *Khách mua gần nhất*, *Số lượng đơn hàng*.
  - Tab **Đơn chưa xác định khách:** Gán các đơn hàng vãng lai vào đúng hồ sơ khách hàng.
  - Bấm **"Xuất Excel"** để tải toàn bộ tệp dữ liệu khách hàng.

### 21. Chi tiết khách hàng (`/khach-hang/:id`) — *Quyền: `CRM_VIEW`*
- **Ý nghĩa:** Hồ sơ 360 độ của một khách hàng cụ thể.
- **Thao tác:**
  - Xem danh sách toàn bộ các hóa đơn máy, phụ kiện và phiếu sửa chữa mà khách hàng này từng giao dịch tại shop.
  - Thêm **Ghi chú chăm sóc (`Care Notes`)**: Lưu lại nội dung gọi điện chăm sóc, lịch hẹn bảo dưỡng, phản hồi của khách hàng.

### 22. Máy hết hạn bảo hành (`/khach-hang/het-han-bao-hanh`) — *Quyền: `CRM_VIEW`*
- **Ý nghĩa:** Danh sách các khách hàng có máy tính vừa hết hạn bảo hành để chủ động chăm sóc sau bán hàng.
- **Thao tác:** Lọc theo khoảng thời gian hết hạn (30 ngày, 90 ngày, 6 tháng...), lọc theo Thương hiệu máy $\rightarrow$ Bấm **"Xuất Excel"** để phân bổ cho nhân viên gọi điện mời bảo dưỡng vệ sinh máy hoặc tư vấn lên đời máy mới.

---

## NHÓM 6: HỆ THỐNG & ĐỐI SOÁT

### 23. Đối soát Google Sheet (`/doi-soat`) — *Quyền: `SYNC_VIEW` & `SYNC_MANAGE`*
- **Ý nghĩa:** Trung tâm kiểm soát đồng bộ dữ liệu giữa phần mềm và bảng tính Google Sheets của cửa hàng.
- **Thao tác:**
  - Bấm **"Chạy đồng bộ ngay"** để đối soát dữ liệu tức thì.
  - Xem danh sách **Cảnh báo lệch kho (`DataIssue`)**: Xử lý các dòng sai lệch qua các nút *Kiểm tra lại*, *Duyệt hoàn hàng về kho*, hoặc *Đóng cảnh báo*.
  - Bấm **"Cài đặt đồng bộ"** để chỉnh chu kỳ phút chạy ngầm tự động và mã `Spreadsheet ID`.

### 24. Nhật ký & Cấu hình (`/nhat-ky` & `/he-thong`) — *Quyền: `LOGS_VIEW` & `USER_MANAGE`*
- **Nhật ký hoạt động (`/nhat-ky`):** Tra cứu nhật ký kiểm toán ghi lại mọi thao tác của tất cả nhân viên (Ai đã sửa máy gì, bán đơn nào, đổi mật khẩu lúc nào).
- **Cấu hình & Phân quyền (`/he-thong`):**
  - **Tab Người dùng:** Tạo tài khoản nhân sự mới, gán vai trò (`ADMIN`, `MANAGER`, `STAFF`), mở bảng **Phân quyền chi tiết 27 mã quyền**, khóa/mở khóa tài khoản hoặc đặt lại mật khẩu.
  - **Tab Hệ thống:** Cập nhật thông tin cửa hàng hiển thị trên hóa đơn (Tên cửa hàng, Hotline, Địa chỉ showroom, Chân trang hóa đơn).

---

# PHẦN IV: HƯỚNG DẪN TRIỂN KHAI, SAO LƯU DỮ LIỆU & VẬN HÀNH MÁY CHỦ / VPS

## 4.1. Khởi chạy trọn gói siêu tốc 3 bước trên VPS Ubuntu bằng Docker

Thư mục `deploy/` đã chuẩn bị sẵn toàn bộ file thực thi đã biên dịch (`tonkho-2.0.0.jar` và `frontend/dist/`), tệp cấu hình Docker Compose và kịch bản khởi tạo CSDL MySQL 8.0 tự động:

```bash
# Bước 1: Di chuyển vào thư mục chứa bộ triển khai trên VPS
cd /opt/qkshop

# Bước 2: Tạo file cấu hình môi trường từ file mẫu
cp .env.example .env

# Bước 3: Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất
docker compose up -d --build
```
- **Truy cập Giao diện Web:** Mở trình duyệt truy cập: `http://<IP_CỦA_VPS>` (Cổng mặc định: 80).
- **Tài khoản Quản trị khởi tạo mặc định:** Tên đăng nhập: `admin` / Mật khẩu: `admin123`.

---

## 4.2. Quy trình Cập nhật phiên bản mới nóng (Hot-update) không gián đoạn Database

Khi có bản cập nhật code mới từ môi trường phát triển:
1. **Sao lưu dự phòng Database trước khi update:**
   ```bash
   docker exec qkshop_db mysqldump -uroot -pqkshop123@@ qkshop_tonkho > backup_truoc_khi_update_$(date +%Y%m%d_%H%M%S).sql
   ```
2. **Copy file mới đè lên thư mục server:**
   - Cập nhật Backend: Copy file `tonkho-2.0.0.jar` vào `/opt/qkshop/backend/target/`.
   - Cập nhật Frontend: Copy thư mục `dist/` vào `/opt/qkshop/frontend/dist/`.
3. **Kích hoạt phiên bản mới:**
   ```bash
   # Nếu chỉ cập nhật Backend:
   docker compose up -d --no-deps --build backend

   # Nếu chỉ cập nhật Frontend:
   docker compose up -d --no-deps --build frontend

   # Nếu cập nhật cả hai:
   docker compose up -d --build
   ```
4. **Xóa cache trình duyệt:** Nhấn tổ hợp phím **`Ctrl + Shift + R`** (hoặc `Cmd + Shift + R`) để nạp giao diện mới.

---

## 4.3. Kế hoạch Sao lưu (Backup) & Khôi phục (Restore) MySQL định kỳ an toàn

- **Xuất toàn bộ dữ liệu ra file backup `.sql`:**
  ```bash
  docker exec qkshop_db mysqldump -uroot -pqkshop123@@ qkshop_tonkho > backup_qkshop_$(date +%Y%m%d).sql
  ```
- **Khôi phục dữ liệu từ file backup `.sql` vào hệ thống:**
  ```bash
  docker exec -i qkshop_db mysql -uroot -pqkshop123@@ qkshop_tonkho < backup_qkshop_xxxxxx.sql
  ```
> ⚠️ **CẢNH BÁO TỐI QUAN TRỌNG VỀ AN TOÀN DỮ LIỆU:**  
> Tuyệt đối **KHÔNG** chạy lệnh `docker compose down -v` trên máy chủ đang hoạt động. Cờ `-v` (volumes) sẽ **xóa sạch toàn bộ ổ đĩa cứng ảo `mysql_data`** chứa cơ sở dữ liệu kho. Khi cần bảo trì máy chủ, chỉ dùng `docker compose stop`, `docker compose start` hoặc `docker compose restart`.

---

## 4.4. Cấu hình biến môi trường `.env` và thiết lập SSL/HTTPS qua Cloudflare

Nội dung chuẩn trong file `.env`:
```ini
# Lắng nghe trên tất cả các địa chỉ IP của VPS
BIND_IP=0.0.0.0

# Cổng truy cập Web công khai (để 80 để vào thẳng không cần gõ :port)
HTTP_PORT=80

# Cấu hình Cơ sở dữ liệu MySQL 8.0
DB_PASSWORD=qkshop123@@
DB_NAME=qkshop_tonkho
DB_PORT=3307

# Khóa bí mật ký mã hóa JWT Token
JWT_SECRET=357638792F423F4428472B4B6250655368566D597133743677397A2443264629
```

> 💡 **Mẹo cài đặt HTTPS miễn phí trong 1 phút:**  
> Trỏ bản ghi tên miền (ví dụ: `kho.qkshop.vn`) về địa chỉ IP của VPS thông qua **Cloudflare**, bật biểu tượng đám mây màu cam (*Proxied*). Hệ thống sẽ tự động có chứng chỉ bảo mật SSL `https://` chuẩn quốc tế mà không cần cài đặt Certbot phức tạp trên máy chủ.

---

# PHẦN V: CÂU HỎI THƯỜNG GẶP (FAQ) & CẨM NANG XỬ LÝ TÌNH HUỐNG THỰC TẾ

### ❓ 1. Tại sao máy có trong kho nhưng tìm ở màn hình Bán máy POS lại không thấy để chốt đơn?
- **Nguyên nhân:** Máy đó đang ở trạng thái **`NEEDS_INSPECTION` (Chờ kiểm định)**. Để đảm bảo uy tín chất lượng, hệ thống chỉ cho phép xuất bán các máy đã được kỹ thuật viên duyệt Đạt.
- **Cách xử lý:** Kỹ thuật viên truy cập menu **Kiểm định chất lượng (`/kiem-tra`)**, mở máy cần test và bấm **"Xác nhận Đạt"** để chuyển máy sang trạng thái **`READY` (Sẵn sàng bán)**.

### ❓ 2. Khách mua máy được 2 ngày muốn đổi sang chiếc máy khác thì quy trình thao tác như thế nào?
- **Quy trình chuẩn 2 bước:**
  1. Vào menu **Tra cứu đơn & Bảo hành (`/bao-hanh`)**, gõ SĐT khách để tìm đơn máy cũ $\rightarrow$ Bấm nút **"Đổi trả / Hoàn hàng"**. Chọn nhận máy về trạng thái `READY` hoặc `NEEDS_INSPECTION`. Hệ thống tự động thu máy cũ về kho, hoàn lại phụ kiện/linh kiện và hủy doanh thu đơn cũ về `0đ`.
  2. Vào menu **Bán máy (`/ban-may`)**, lập đơn bán mới cho chiếc máy mà khách muốn đổi sang.

### ❓ 3. Khi bán máy có nâng cấp thêm RAM/SSD thì chọn ở đâu để kho Linh kiện tự trừ tồn kho?
- **Cách xử lý:** Tại màn hình **Bán máy (`/ban-may`)**, trong phần **Bảo hành, Nâng cấp & Quà tặng**, bấm chọn linh kiện nâng cấp (mang mã `LK-...`). Hệ thống sẽ tự động trừ số lượng thanh RAM/SSD đó trong **Kho Linh kiện (`parts`)** và cộng tiền nâng cấp vào tổng giá trị đơn máy.

### ❓ 4. Nếu tôi sửa thông tin cấu hình của 1 chiếc máy trong kho thì có làm sai cấu hình của các máy khác cùng model không?
- **Trả lời:** **Hoàn toàn KHÔNG.** Hệ thống áp dụng cơ chế *Re-link Config Pattern*: Khi bạn sửa cấu hình của một chiếc máy cụ thể, hệ thống tự động tách chiếc máy đó sang nhánh cấu hình riêng biệt, bảo vệ nguyên vẹn 100% dữ liệu của các máy khác trong lô.

### ❓ 5. Nhân viên lỡ bấm đúp chuột 2 lần vào nút "Hoàn tất đơn hàng" khi mạng chập chờn thì có bị tạo 2 đơn trùng không?
- **Trả lời:** **Không bao giờ.** Mọi thao tác ghi nhận đơn hàng đều được cấp một khóa định danh duy nhất `X-Request-Id` kiểm soát bởi bảng `command_ledger`. Nếu có lệnh gửi trùng, hệ thống tự động nhận diện và chỉ thực thi duy nhất 1 lần.

### ❓ 6. Làm sao để phát hiện và ngăn chặn trường hợp khách mang máy đã bán lại cho shop đến yêu cầu bảo hành miễn phí?
- **Trả lời:** Hệ thống có tính năng tự động `checkWarrantyEligibility`. Khi máy được shop thu mua lại hoặc hoàn hàng, gói bảo hành cũ lập tức bị đánh dấu **`VOIDED` (Đã hủy bảo hành)**. Khi tạo phiếu sửa chữa, nếu nhân viên chọn dịch vụ giá 0đ hoặc ghi "Theo BH máy", hệ thống sẽ lập tức chặn lại và cảnh báo rõ máy đã bị thu hồi, chỉ chấp nhận sửa chữa tính phí.
