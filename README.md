# 🏬 QKShop Warehouse Management System (WMS)
> Hệ thống quản lý kho máy tính, phụ kiện, linh kiện và theo dõi vòng đời thiết bị theo Serial/IMEI.

---

## 📌 Tính Năng Cốt Lõi

- 💻 **Quản lý Serial & Vòng đời máy:** Theo dõi đường đi của từng máy tính từ lúc nhập kho, kiểm định (QC), bán hàng (POS / Ship COD) đến bảo hành, đổi trả và đóng vòng đời.
- 🖱️ **Quản lý Kho Phụ kiện (`PK-...`) & Kho Linh kiện (`LK-...`):** Tách bạch phụ kiện tặng kèm/bán lẻ và linh kiện phần cứng phục vụ nâng cấp máy hoặc sửa chữa dịch vụ.
- 🛠️ **Dịch vụ Sửa chữa & Tra cứu Bảo hành 3 trong 1:** Tiếp nhận phiếu sửa chữa (`SC...`), tự động trừ/hoàn kho linh kiện và tra cứu bảo hành hợp nhất (Máy + Phụ kiện + Sửa chữa) chỉ với 1 ô tìm kiếm.
- 👥 **Khách hàng (CRM) & Chăm sóc sau bán:** Tự động gom hồ sơ khách hàng theo số điện thoại, ghi chú chăm sóc và lọc danh sách máy hết hạn bảo hành.
- 📋 **In bảng giá PDF tự động (JasperReports):** Xuất bảng báo giá chào hàng chuyên nghiệp chuẩn khổ in A4 / A5 chỉ với 1 click.
- 🔄 **Đồng bộ Google Sheets 2 chiều:** Tự động đồng bộ số liệu, chống tạo đơn trùng và đối soát lệch kho thời gian thực với bảng tính cửa hàng.
- 🛡️ **Phân quyền đa cấp (RBAC):** Phân chia 3 vai trò (`ADMIN`, `MANAGER`, `STAFF`) kết hợp tùy biến 27 mã quyền chi tiết.

---

## 🛠️ Công Nghệ & Môi Trường Tối Ưu

| Thành phần | Công nghệ & Phiên bản khuyên dùng |
|:---|:---|
| **Backend** | Java 21 LTS (`eclipse-temurin:21-jre-jammy`, Virtual Threads + G1GC đàn hồi), Spring Boot 3.3.5, Spring Data JPA, Spring Security (JWT), JasperReports |
| **Frontend** | React 19, Vite 6, Bootstrap 5.3, Lucide Icons, Recharts, Axios |
| **Cơ sở dữ liệu** | MySQL 8.0 LTS (`mysql:8.0`, InnoDB tối ưu RAM, UTF8MB4) |
| **Docker & Proxy** | **Docker Engine CE `v27+ / v28+` (Stable)** + **Docker Compose V2 (`v2.32+`)**, Nginx Reverse Proxy (`nginx:alpine` ~25MB) |
| **Công cụ giải nén** | **VPS Linux:** `unzip`, `zip`, `p7zip-full` (`7z`), `tar` \| **Windows:** `7-Zip v24.09+` / `NanaZip` |
| **Cấu hình VPS chuẩn** | **1 – 2 vCPU / 2 GB RAM vật lý + 4 GB Swap (RAM ảo) / 20–30 GB SSD** (Ubuntu 24.04 LTS) |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
QuanLyKho/
├── backend/          # Mã nguồn Backend (Spring Boot 3.3.5 / Java 21)
├── frontend/         # Mã nguồn Frontend (React 19 / Vite 6)
├── database/         # Cơ sở dữ liệu: Schema tạo bảng & hướng dẫn sao lưu
├── deploy/           # Trọn gói triển khai Docker & file nén qkshop-vps-deploy.zip
├── docs/             # Tài liệu tổng hợp hệ thống (Kiến trúc, Nghiệp vụ, HDSD, VPS)
├── .env.example      # Mẫu biến môi trường an toàn
└── README.md         # Tài liệu tổng quan dự án
```

---

## ⚡ Hướng Dẫn Khởi Chạy Nhanh

### 1. Triển khai trên Server VPS (Docker)
Trọn gói chạy VPS đã được đóng gói sẵn trong thư mục [`deploy/`](./deploy) và file nén [`deploy/qkshop-vps-deploy.zip`](./deploy/qkshop-vps-deploy.zip).  
👉 *Xem hướng dẫn chi tiết từng bước tại: **[`deploy/HUONG_DAN_VPS.md`](./deploy/HUONG_DAN_VPS.md)***.

**Bước chuẩn bị (Chỉ chạy 1 lần nếu VPS Ubuntu 24.04 mới tinh):**
```bash
# 1. Cài đặt công cụ giải nén (unzip, 7z, tar) & Docker Engine CE + Compose V2
sudo apt-get update && sudo apt-get install -y unzip zip tar p7zip-full curl ca-certificates gnupg nano
curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER

# 2. Tạo 4 GB RAM ảo (Swap) trên SSD chống tràn bộ nhớ
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10 vm.vfs_cache_pressure=50
printf "vm.swappiness=10\nvm.vfs_cache_pressure=50\n" | sudo tee -a /etc/sysctl.conf
```

**3 Bước giải nén & khởi chạy hệ thống:**
```bash
# Bước 1: Giải nén gói cài đặt vào /opt/qkshop
sudo mkdir -p /opt/qkshop && sudo unzip -o qkshop-vps-deploy.zip -d /opt/qkshop && cd /opt/qkshop

# Bước 2: Tạo file cấu hình môi trường
cp .env.example .env

# Bước 3: Khởi chạy toàn bộ hệ thống (MySQL + Backend + Frontend Nginx)
docker compose up -d --build
```
- **Truy cập Web:** `http://<IP_VPS>` (Cổng 80) — Tổng RAM tiêu thụ thực tế chỉ **~850 MB – 1.25 GB**.

---

### 2. Chạy ở môi trường lập trình (Local Dev)

```bash
# Terminal 1: Chạy Backend (Cổng 8080)
cd backend && mvn spring-boot:run

# Terminal 2: Chạy Frontend (Cổng 5173)
cd frontend && npm install && npm run dev
```

---

## 🔑 Tài Khoản Quản Trị Hệ Thống

- Trong gói cơ sở dữ liệu khởi tạo (`deploy/database/init/01_qkshop_tonkho_full.sql`) đã có sẵn tài khoản **Quản trị viên (`ADMIN`)** cùng toàn bộ dữ liệu phân quyền của cửa hàng.
- Khi triển khai lên VPS, hệ thống sử dụng trực tiếp tài khoản quản trị sẵn có trong CSDL, **không cần cấu hình hay tạo thêm tài khoản admin mặc định mới**.

---

## 📚 Tài Liệu Tổng Hợp Hệ Thống (Docs)

Toàn bộ giải thích luồng xử lý nghiệp vụ, hướng dẫn sử dụng 24 màn hình và cẩm nang vận hành VPS được tổng hợp tại thư mục [`docs/`](./docs):

- 📘 **[Bản Markdown (`docs/TONG_HOP_HE_THONG.md`)](./docs/TONG_HOP_HE_THONG.md):** Bản tài liệu gốc đầy đủ sơ đồ luồng nghiệp vụ, hướng dẫn 24 màn hình và vận hành VPS.
- 📕 **[Bản PDF Trực Quan (`docs/TONG_HOP_HE_THONG.pdf`)](./docs/TONG_HOP_HE_THONG.pdf):** Tài liệu PDF trình bày màu trực quan, dễ đọc và in ấn.

---

## 🔒 Bản Quyền
Dự án được phát triển và sở hữu độc quyền bởi **QKShop** ([LICENSE](./LICENSE)).
