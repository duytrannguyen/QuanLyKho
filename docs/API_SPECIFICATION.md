# 📡 ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API SPECIFICATION)
## QKSHOP WAREHOUSE MANAGEMENT SYSTEM

---

## 1. TIÊU CHUẨN GIAO THỨC CHUNG (GENERAL CONVENTIONS)

- **Base URL:** `/api`
- **Định dạng dữ liệu:** `application/json; charset=UTF-8`
- **Xác thực:** Bearer Token trong Header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
- **Chống trùng lặp (Idempotency):** Hỗ trợ Header `X-Request-Id: <uuid>` cho các API ghi nhận dữ liệu quan trọng (nhập máy, bán máy, đồng bộ).

---

## 2. ĐỊNH DẠNG PHẢN HỒI CHUẨN (STANDARD API RESPONSE)

Mọi API của hệ thống đều được chuẩn hóa qua đối tượng `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": { ... },
  "errors": null,
  "timestamp": "2026-10-24 18:30:00"
}
```

Trường hợp xảy ra lỗi nghiệp vụ hoặc validation:
```json
{
  "success": false,
  "message": "Số Serial 'SN-DELL-12345' đã tồn tại trong kho",
  "data": null,
  "errors": [
    "Trường 'giaBan' không được để trống",
    "Số lượng phụ kiện phải lớn hơn 0"
  ],
  "timestamp": "2026-10-24 18:30:00"
}
```

---

## 3. DANH SÁCH ENDPOINTS CHI TIẾT THEO MODULE

### 🔐 3.1. Xác Thực & Phiên Làm Việc (Authentication - `/api/auth`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `POST` | `/api/auth/login` | Public | Đăng nhập tài khoản, trả về Access Token + Refresh Token + User profile. |
| `POST` | `/api/auth/refresh-token` | Public | Cấp mới Access Token bằng Refresh Token khi hết hạn. |
| `GET` | `/api/auth/me` | Authenticated | Lấy thông tin tài khoản hiện tại kèm danh sách mã quyền được cấp. |
| `POST` | `/api/auth/logout` | Authenticated | Đăng xuất và vô hiệu hóa phiên làm việc. |

---

### 👥 3.2. Quản Lý Tài Khoản & Phân Quyền (Users - `/api/users`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `GET` | `/api/users` | `MANAGE_USERS` | Danh sách toàn bộ tài khoản trong hệ thống. |
| `POST` | `/api/users` | `MANAGE_USERS` | Tạo mới người dùng (chỉ định vai trò và quyền tùy biến). |
| `PUT` | `/api/users/{id}` | `MANAGE_USERS` | Cập nhật thông tin, trạng thái hoạt động, vai trò hoặc quyền. |
| `DELETE` | `/api/users/{id}` | `MANAGE_USERS` | Vô hiệu hóa hoặc xóa tài khoản nhân sự. |
| `PUT` | `/api/users/{id}/change-password` | Authenticated | Đổi mật khẩu cá nhân. |
| `GET` | `/api/users/permissions` | `MANAGE_USERS` | Lấy danh mục 17 mã quyền chi tiết của hệ thống. |

---

### 💻 3.3. Quản Lý Tồn Kho Máy Tính (Inventory - `/api/inventory`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `GET` | `/api/inventory/active` | `VIEW_INVENTORY` | Tìm kiếm và lọc danh sách máy đang tồn trong kho (`READY`, `NEEDS_INSPECTION`). |
| `GET` | `/api/inventory/active/{id}` | `VIEW_INVENTORY` | Xem chi tiết 1 máy tồn kho (cấu hình, giá nhập, ngày nhập, serial). |
| `PUT` | `/api/inventory/active/{id}` | `EDIT_INVENTORY` | Cập nhật thông tin máy, giá bán niêm yết, tình trạng bảo hành. |
| `DELETE` | `/api/inventory/active/{id}` | `DELETE_INVENTORY` | Hủy hoặc xóa máy khỏi kho tồn. |
| `GET` | `/api/inventory/closed` | `VIEW_INVENTORY` | Tra cứu lịch sử các máy đã xuất bán hoặc đóng vòng đời. |
| `GET` | `/api/inventory/summary` | `VIEW_DASHBOARD` | Tổng hợp số lượng tồn kho theo thương hiệu và phân khúc. |

---

### 📥 3.4. Nhập Kho & Quản Lý Số Máy (Machines - `/api/machines`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `POST` | `/api/machines/import` | `IMPORT_MACHINES` | Nhập một máy mới vào hệ thống kèm số Serial. |
| `POST` | `/api/machines/bulk-import` | `IMPORT_MACHINES` | Nhập máy hàng loạt qua danh sách hoặc nạp từ file Excel. |
| `GET` | `/api/machines/registry` | `MANAGE_MACHINES` | Tra cứu sổ đăng ký mã máy (`SerialRegistry`). |
| `GET` | `/api/machines/check-serial/{serial}` | `VIEW_INVENTORY` | Kiểm tra nhanh số Serial đã từng tồn tại trong hệ thống chưa. |

---

### 🔍 3.5. Kiểm Định Chất Lượng (Inspection - `/api/inspections`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `GET` | `/api/inspections/pending` | `INSPECT_MACHINES` | Danh sách máy đang chờ kỹ thuật kiểm định chất lượng. |
| `POST` | `/api/inspections/{id}/complete` | `INSPECT_MACHINES` | Hoàn thành kiểm định, đánh giá đạt yêu cầu và chuyển máy sang `READY`. |
| `POST` | `/api/inspections/{id}/reject` | `INSPECT_MACHINES` | Trả lại máy kiểm định lỗi hoặc yêu cầu thay thế linh kiện. |

---

### 🖱️ 3.6. Quản Lý & Xuất Bán Phụ Kiện (Accessories - `/api/accessories`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `GET` | `/api/accessories` | `MANAGE_ACCESSORIES` | Danh sách kho phụ kiện, số lượng tồn kho theo từng mã SKU. |
| `POST` | `/api/accessories` | `MANAGE_ACCESSORIES` | Thêm mới phụ kiện vào danh mục kho. |
| `PUT` | `/api/accessories/{id}` | `MANAGE_ACCESSORIES` | Cập nhật tên, danh mục, giá niêm yết phụ kiện. |
| `POST` | `/api/accessories/sale` | `CREATE_SALES` | Tạo đơn bán phụ kiện và tự động trừ số lượng trong kho. |
| `GET` | `/api/accessories/sales-history` | `VIEW_SALES` | Xem lịch sử các đơn hàng bán phụ kiện theo thời gian. |

---

### 💰 3.7. Bán Hàng & Xuất Báo Giá PDF (Sales & Pricing)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `POST` | `/api/sales/checkout` | `CREATE_SALES` | Lập hóa đơn bán máy, xuất kho và tự động đóng vòng đời tồn kho. |
| `GET` | `/api/sales/history` | `VIEW_SALES` | Danh sách lịch sử đơn hàng bán máy kèm thông tin khách hàng. |
| `GET` | `/api/pricelist/items` | `PRICE_LIST` | Danh sách máy sẵn sàng để tạo bảng giá chào hàng. |
| `POST` | `/api/pricelist/export-pdf` | `PRICE_LIST` | Kết xuất bảng báo giá ra file PDF theo mẫu in A4 hoặc A5. |

---

### 🔄 3.8. Đồng Bộ & Đối Soát (Sync & Reconciliation - `/api/sync`)

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `POST` | `/api/sync/trigger` | `SYNC_DATA` | Kích hoạt đồng bộ thủ công với Google Sheets ngay lập tức. |
| `GET` | `/api/sync/status` | `SYNC_DATA` | Lấy trạng thái tiến trình đồng bộ gần nhất. |
| `GET` | `/api/sync/reconciliation` | `RECONCILIATION` | Phân tích và hiển thị danh sách các điểm lệch kho giữa hệ thống và Google Sheets. |

---

### 🔔 3.9. Thông Báo & Cấu Hình Hệ Thống

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|:---:|:---|:---:|:---|
| `GET` | `/api/notifications` | Authenticated | Lấy danh sách thông báo hệ thống của người dùng. |
| `PUT` | `/api/notifications/{id}/read` | Authenticated | Đánh dấu một thông báo là đã đọc. |
| `PUT` | `/api/notifications/read-all` | Authenticated | Đánh dấu tất cả thông báo là đã đọc. |
| `GET` | `/api/system/config` | Authenticated | Lấy các cấu hình công khai (tên shop, hotline, địa chỉ). |
| `PUT` | `/api/system/config/{key}` | `ADMIN` | Cập nhật tham số cấu hình hệ thống. |
| `POST` | `/api/system/maintenance/cleanup` | `ADMIN` | Chuẩn hóa và làm sạch chuỗi dữ liệu rác. |
