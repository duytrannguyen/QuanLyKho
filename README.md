# 🏬 QKShop Warehouse Management System (WMS)
> Hệ thống quản lý kho máy tính, phụ kiện và theo dõi vòng đời thiết bị theo Serial/IMEI.

## 📌 Tính Năng Cốt Lõi

- 💻 **Quản lý Serial & Vòng đời máy:** Theo dõi đường đi của từng máy tính từ lúc nhập kho, kiểm định (QC), bán hàng đến bảo hành và đóng vòng đời.
- 🖱️ **Quản lý & Bán phụ kiện:** Theo dõi tồn kho theo mã SKU, tự động trừ kho khi xuất bán, cảnh báo hàng sắp hết.
- 📋 **In bảng giá PDF tự động (JasperReports):** Xuất bảng báo giá chào hàng chuyên nghiệp chuẩn khổ in A4 / A5 chỉ với 1 click.
- 🔄 **Đồng bộ Google Sheets 2 chiều:** Tự động đồng bộ số liệu và đối soát lệch kho thời gian thực với bảng tính cửa hàng.
- 👥 **Phân quyền đa cấp (RBAC):** Phân chia 4 vai trò rõ ràng (`ADMIN`, `Kế toán`, `Kỹ thuật`, `Bán hàng`) với 17 mã quyền chi tiết.
- 🔔 **Thông báo & Nhật ký kiểm toán:** Nhận thông báo biến động kho tức thời và lưu trữ nhật ký thao tác người dùng minh bạch.

---

## 🛠️ Công Nghệ Sử Dụng

| Thành phần | Công nghệ chính |
|:---|:---|
| **Backend** | Java 21, Spring Boot 3.3.5, Spring Data JPA, Spring Security (JWT), JasperReports |
| **Frontend** | React 19, Vite 6, Bootstrap 5.3, Lucide Icons, Recharts, Axios |
| **Cơ sở dữ liệu** | MySQL 8.0 (InnoDB, UTF8MB4) |
| **Triển khai** | Docker, Docker Compose, Nginx Reverse Proxy (Alpine) |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
QuanLyKho/
├── backend/          # Mã nguồn Backend (Spring Boot 3 / Java 21)
├── frontend/         # Mã nguồn Frontend (React 19 / Vite 6)
├── database/         # Cơ sở dữ liệu: Schema tạo bảng & Dữ liệu mặc định
├── deploy/           # Trọn gói triển khai Docker & file nén ZIP chạy VPS
├── docs/             # Toàn bộ tài liệu chi tiết (Kiến trúc, API, HDSD, Deploy)
├── .env.example      # Mẫu biến môi trường an toàn
└── README.md         # Tài liệu tổng quan này
```

---

## ⚡ Hướng Dẫn Khởi Chạy Nhanh

### 1. Triển khai nhanh trên Server VPS (Docker)
Trọn gói chạy VPS đã được đóng gói sẵn trong thư mục [`deploy/`](./deploy). Trên server bạn chỉ cần:

```bash
# 1. Chuyển vào thư mục deploy
cd deploy

# 2. Tạo file cấu hình môi trường
cp .env.example .env

# 3. Khởi chạy toàn bộ hệ thống (MySQL tự nạp database & tạo admin)
docker compose up -d --build
```
*Truy cập:* `http://<IP_VPS>` (Cổng 80)

---

### 2. Chạy ở môi trường lập trình (Local Dev)

**Cách nhanh nhất (Windows):**  
Chỉ cần nhấp đúp chuột vào file: [`deploy/scripts/run-local.bat`](./deploy/scripts/run-local.bat) để tự động mở cả Backend và Frontend.

**Khởi chạy thủ công bằng lệnh:**
```bash
# Terminal 1: Chạy Backend (Cổng 8080)
cd backend && mvn spring-boot:run

# Terminal 2: Chạy Frontend (Cổng 5173)
cd frontend && npm install && npm run dev
```

---

## 🔑 Tài Khoản Quản Trị Mặc Định

Khi cài đặt mới, hệ thống tự động khởi tạo tài khoản Super Admin:
- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `admin123`

> ⚠️ *Lưu ý:* Sau khi đăng nhập lần đầu, hãy vào **Cài Đặt Hệ Thống -> Đổi Mật Khẩu** để đảm bảo an toàn.

---

## 📚 Trung Tâm Tài Liệu Chi Tiết (Docs Hub)

Tài liệu chuyên sâu được phân loại trong thư mục [`docs/`](./docs):

- 🏗️ **[Kiến Trúc Hệ Thống (docs/ARCHITECTURE.md)](./docs/ARCHITECTURE.md):** Thiết kế phân tầng, bảo mật JWT kép, luồng dữ liệu SPA.
- 📡 **[Đặc Tả API (docs/API_SPECIFICATION.md)](./docs/API_SPECIFICATION.md):** Danh mục 35+ REST Endpoints, format `ApiResponse<T>`, mã lỗi.
- 📖 **[Sổ Tay Sử Dụng (docs/USER_GUIDE.md)](./docs/USER_GUIDE.md):** Hướng dẫn chi tiết cho nhân viên kho, kỹ thuật, bán hàng.
- 🚀 **[Hướng Dẫn Triển Khai Server (docs/DEPLOYMENT_GUIDE.md)](./docs/DEPLOYMENT_GUIDE.md):** Cấu hình VPS, IP tĩnh, Nginx, SSL HTTPS.

---

## 🔒 Bản Quyền
Dự án được phát triển và sở hữu độc quyền bởi **QKShop** ([LICENSE](./LICENSE)).
