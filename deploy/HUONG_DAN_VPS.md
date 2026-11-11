# 🚀 HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH HỆ THỐNG TRÊN SERVER VPS

Gói triển khai này đã đóng gói sẵn toàn bộ mã thực thi (**Backend `tonkho-2.0.0.jar`**, **Frontend `dist/`**), cấu hình Docker siêu nhẹ và cơ sở dữ liệu MySQL khởi tạo tự động (`database/init/01_qkshop_tonkho_full.sql`).

---

## 📋 1. Cấu Hình VPS & Công Cụ Khuyên Dùng

| Hạng mục | Khuyến nghị tối ưu | Ghi chú chi tiết |
|:---|:---|:---|
| **Cấu hình VPS** | **1 – 2 vCPU / 2 GB RAM / 20–30 GB SSD** | Kết hợp thêm **4 GB Swap (RAM ảo)** = **6 GB tổng bộ nhớ**. |
| **Hệ điều hành** | **Ubuntu 24.04 LTS** *(hoặc 22.04 LTS)* | Bản chuẩn hoặc Minimal đều tương thích 100%. |
| **Phiên bản Docker** | **Docker Engine CE `v27+ / v28+`** + **Compose V2** | Bản chính thức từ `get.docker.com` (nhẹ, hỗ trợ `cgroup v2` & BuildKit). |
| **Công cụ giải nén** | **VPS Linux:** `unzip`, `p7zip-full` (`7z`), `tar`<br>**Windows:** `7-Zip v24.09+` / `NanaZip` | File `qkshop-vps-deploy.zip` đã chuẩn hóa đường dẫn Linux POSIX (`/`). |

---

## 🛠️ 2. Chuẩn Bị Môi Trường VPS Mới (Chỉ làm 1 lần đầu)

Đăng nhập vào VPS qua SSH (với quyền `root` hoặc `sudo`) và chạy lần lượt 4 khối lệnh sau:

### Bước 2.1: Cài đặt công cụ giải nén (`unzip`, `7z`, `tar`) & tiện ích cơ bản
```bash
sudo apt-get update
sudo apt-get install -y unzip zip tar p7zip-full curl ca-certificates gnupg nano
```

### Bước 2.2: Cài đặt Docker Engine CE & Docker Compose V2
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```
> 💡 *Mẹo:* Nếu bạn thuê VPS theo gói khuyến mãi có cài sẵn ứng dụng mẫu (như *OpenClaw* hoặc *n8n*), hãy chạy lệnh sau để dọn sạch các container mẫu trước khi cài QKShop:
> ```bash
> sudo docker rm -f $(sudo docker ps -aq) 2>/dev/null || true
> ```

### Bước 2.3: Tối ưu cấu hình Docker Daemon (`/etc/docker/daemon.json`)
Giúp giữ container hoạt động liên tục (`live-restore`), nâng giới hạn file mở và tự động xoay vòng/nén log chống đầy ổ cứng:
```bash
sudo mkdir -p /etc/docker
cat << 'EOF' | sudo tee /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "live-restore": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker
```

### Bước 2.4: Tạo 4 GB RAM ảo (Swap trên SSD)
Kết hợp **2 GB RAM vật lý + 4 GB Swap = 6 GB tổng bộ nhớ**, đồng thời cấu hình `swappiness=10` để luôn ưu tiên dùng RAM vật lý tốc độ cao trước:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10 vm.vfs_cache_pressure=50
printf "vm.swappiness=10\nvm.vfs_cache_pressure=50\n" | sudo tee -a /etc/sysctl.conf
```
*(Gõ `free -h` để kiểm tra: dòng `Swap` hiển thị `4.0Gi` là thành công).*

---

## ⚡ 3. Ba Bước Khởi Chạy Hệ Thống QKShop

### Bước 1: Giải nén gói `qkshop-vps-deploy.zip` vào `/opt/qkshop`
Tải file `qkshop-vps-deploy.zip` lên VPS, sau đó chạy lệnh giải nén:

```bash
sudo mkdir -p /opt/qkshop
sudo unzip -o qkshop-vps-deploy.zip -d /opt/qkshop
cd /opt/qkshop
```
*(Dự phòng: Có thể giải nén bằng `sudo 7z x qkshop-vps-deploy.zip -o/opt/qkshop -y` hoặc `sudo python3 -m zipfile -e qkshop-vps-deploy.zip /opt/qkshop`).*

### Bước 2: Tạo file cấu hình môi trường (`.env`)
```bash
cp .env.example .env
```
*(Tùy chọn: Gõ `nano .env` nếu muốn chỉnh sửa mật khẩu MySQL `DB_PASSWORD` hoặc khóa bảo mật `JWT_SECRET`).*

### Bước 3: Khởi chạy toàn bộ hệ thống
```bash
docker compose up -d --build
```

---

## 🎉 4. Truy Cập Hệ Thống & Tài Khoản Quản Trị

- **Địa chỉ truy cập Web:** `http://<IP_CỦA_VPS>` (Cổng 80 mặc định).
- **Tài khoản đăng nhập:**
  - Sử dụng trực tiếp **tài khoản Quản trị viên đã có sẵn trong cơ sở dữ liệu** (`database/init/01_qkshop_tonkho_full.sql`).
  - Hệ thống tự động nạp nguyên vẹn 28 bảng dữ liệu, chỉ mục (Indexes) và tài khoản quản trị hiện có của cửa hàng, **không cần tạo thêm tài khoản admin mặc định mới**.
- **Kết nối Tên miền & SSL (Tùy chọn):** Trỏ tên miền (ví dụ `kho.qkshop.vn`) về IP VPS và bật SSL miễn phí qua Cloudflare hoặc Certbot.

---

## 📊 5. Thông Số Tối Ưu Của 3 Container Trong Gói

| Container | Base Image | Trần RAM (`mem_limit`) | Các tối ưu đã kích hoạt sẵn |
|:---|:---|:---|:---|
| **`qkshop_db`** | `mysql:8.0` | `550 MB` | `innodb_buffer_pool_size=256M`, tắt `performance_schema`, `skip-name-resolve`, tự dọn binlog sau 3 ngày. |
| **`qkshop_backend`** | `eclipse-temurin:21-jre-jammy` | `850 MB` | Java 21 Virtual Threads, G1GC tự co giãn trả RAM về OS, kèm `fontconfig` & font `DejaVu` xuất PDF/Excel. |
| **`qkshop_frontend`** | `nginx:alpine` | `80 MB` | Siêu nhẹ (~25MB), nén Gzip mức 6, `keepalive 32` kết nối nội bộ tới Backend, cache tĩnh `/assets/` 1 năm. |

---

## 🛠️ 6. Sổ Tay Lệnh Quản Trị & Sao Lưu Hàng Ngày

### Kiểm tra & Vận hành
```bash
# Xem trạng thái các container
docker compose ps

# Theo dõi mức dùng RAM / CPU thực tế
docker stats

# Xem nhật ký (log) của Backend thời gian thực
docker compose logs -f backend

# Khởi động lại hệ thống (an toàn 100% dữ liệu)
docker compose restart

# Cập nhật phiên bản mới (sau khi chép đè file mới vào /opt/qkshop)
docker compose up -d --build
```

### Sao lưu (Backup) & Phục hồi (Restore) CSDL MySQL
```bash
# 1. Sao lưu và nén trực tiếp CSDL ra file .sql.gz (tiết kiệm 85% dung lượng)
docker exec qkshop_db mysqldump -uroot -p"$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)" \
  --single-transaction --routines --triggers qkshop_tonkho | gzip > backup_qkshop_$(date +%Y%m%d).sql.gz

# 2. Khôi phục CSDL từ file nén .sql.gz
gunzip < backup_qkshop_YYYYMMDD.sql.gz | docker exec -i qkshop_db \
  mysql -uroot -p"$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)" qkshop_tonkho
```

> ⚠️ **Lưu ý quan trọng:** Tuyệt đối **KHÔNG** chạy lệnh `docker compose down -v` vì cờ `-v` sẽ xóa ổ đĩa dữ liệu MySQL (`mysql_data`). Khi cần tắt/bật máy chủ, chỉ dùng `docker compose stop` và `docker compose start`.
