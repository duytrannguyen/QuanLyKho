# 🏬 QKShop Warehouse Management System (WMS)
> Hệ thống quản lý kho máy tính, phụ kiện và theo dõi vòng đời thiết bị theo Serial/IMEI.

## 📌 Tính Năng Cốt Lõi

- 💻 **Quản lý Serial & Vòng đời máy:** Theo dõi đường đi của từng máy tính từ lúc nhập kho, kiểm định (QC), bán hàng (POS / Ship COD) đến bảo hành, đổi trả và đóng vòng đời.
- 🖱️ **Quản lý Kho Phụ kiện (`PK-...`) & Kho Linh kiện (`LK-...`):** Tách bạch phụ kiện tặng kèm/bán lẻ và linh kiện phần cứng phục vụ nâng cấp máy hoặc sửa chữa dịch vụ.
- 🛠️ **Dịch vụ Sửa chữa & Tra cứu Bảo hành 3 trong 1:** Tiếp nhận phiếu sửa chữa (`SC...`), tự động trừ/hoàn kho linh kiện và tra cứu bảo hành hợp nhất (Máy + Phụ kiện + Sửa chữa) chỉ với 1 ô tìm kiếm.
- 👥 **Khách hàng (CRM) & Chăm sóc sau bán:** Tự động gom hồ sơ khách hàng theo số điện thoại, ghi chú chăm sóc và lọc danh sách máy hết hạn bảo hành.
- 📋 **In bảng giá PDF tự động (JasperReports):** Xuất bảng báo giá chào hàng chuyên nghiệp chuẩn khổ in A4 / A5 chỉ với 1 click.
- 🔄 **Đồng bộ Google Sheets 2 chiều:** Tự động đồng bộ số liệu, chống tạo đơn trùng và đối soát lệch kho thời gian thực với bảng tính cửa hàng.
- 🛡️ **Phân quyền đa cấp (RBAC):** Phân chia 3 vai trò (`ADMIN`, `MANAGER`, `STAFF`) kết hợp tùy biến 27 mã quyền chi tiết.

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

## 📚 Tài Liệu Tổng Hợp Hệ Thống (Docs)

Toàn bộ giải thích luồng xử lý nghiệp vụ, hướng dẫn sử dụng 24 màn hình và cẩm nang vận hành VPS được tổng hợp duy nhất tại thư mục [`docs/`](./docs):

- 📕 **[Bản PDF Trực Quan (docs/TONG_HOP_HE_THONG.pdf)](./docs/TONG_HOP_HE_THONG.pdf):** Tài liệu PDF trình bày màu kèm sơ đồ luồng xử lý trực quan, dễ đọc và in ấn.
- 📘 **[Bản Markdown (docs/TONG_HOP_HE_THONG.md)](./docs/TONG_HOP_HE_THONG.md):** Bản gốc Markdown để xem trực tiếp trên trình soạn thảo code.

---

## 🔒 Bản Quyền
Dự án được phát triển và sở hữu độc quyền bởi **QKShop** ([LICENSE](./LICENSE)).
