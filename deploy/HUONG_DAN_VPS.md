# 🚀 HƯỚNG DẪN KHỞI CHẠY NHANH TRÊN SERVER VPS (3 BƯỚC)

Đây là gói triển khai đã được đóng gói sẵn toàn bộ file thực thi (`tonkho-2.0.0.jar` và `frontend/dist/`), file cấu hình Docker và bộ dữ liệu khởi tạo cơ sở dữ liệu MySQL tự động.

---

## 📋 Yêu cầu trên VPS
- Đã cài đặt Docker và Docker Compose.
*(Nếu VPS Ubuntu mới tinh chưa có Docker, chỉ cần gõ: `curl -fsSL https://get.docker.com | sh`)*

---

## ⚡ 3 BƯỚC KHỞI CHẠY HỆ THỐNG TRÊN VPS

### BƯỚC 1: Đưa gói này lên VPS
Tải toàn bộ thư mục này (hoặc file `.zip`) lên thư mục mong muốn trên VPS (ví dụ: `/opt/qkshop`).

```bash
cd /opt/qkshop
```

### BƯỚC 2: Tạo file cấu hình môi trường (.env)
Sao chép file mẫu `.env.example` thành `.env`:

```bash
cp .env.example .env
```
*(Tùy chọn: Dùng lệnh `nano .env` nếu bạn muốn đổi mật khẩu MySQL hoặc chỉ định IP tĩnh riêng).*

### BƯỚC 3: Khởi chạy toàn bộ hệ thống bằng 1 lệnh
```bash
docker compose up -d --build
```

---

## 🎉 KẾT QUẢ & TRUY CẬP

- **Giao diện Web:** Mở trình duyệt và truy cập vào IP hoặc tên miền VPS: `http://<IP_VPS>` (cổng 80).
- **Tài khoản Quản trị khởi tạo mặc định:**
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
*(Cơ sở dữ liệu sẽ tự động được khởi tạo cấu trúc 28 bảng và nạp tài khoản admin thông qua thư mục `database/init/`)*.
- **Lưu ý về SSL / Tên miền:** Khi bạn trỏ tên miền (ví dụ: `kho.qkshop.vn`) vào IP VPS, bạn có thể dễ dàng bật SSL miễn phí qua Cloudflare (chỉ 1 click) hoặc dùng Certbot / Let's Encrypt theo tên miền chính thức.

---

## 🛠️ LỆNH QUẢN TRỊ CƠ BẢN

- **Xem trạng thái các container:**
  ```bash
  docker compose ps
  ```
- **Xem log hệ thống (nếu cần gỡ lỗi):**
  ```bash
  docker compose logs -f backend
  ```
- **Dừng hệ thống:**
  ```bash
  docker compose stop
  ```
- **Khởi động lại hệ thống:**
  ```bash
  docker compose start
  ```
- **Xóa hệ thống:**
  ```bash
  docker compose rm
  ````