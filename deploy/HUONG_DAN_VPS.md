# 🚀 HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH HỆ THỐNG TRÊN SERVER VPS
> **Dành riêng cho cấu hình: Cloud Server Linux 2 (1 Core vCPU / 2 GB RAM / 20 GB SSD / Băng thông 200 Mbps)**

Gói triển khai này đã đóng gói sẵn toàn bộ mã thực thi (**Backend `tonkho-2.0.0.jar`**, **Frontend `dist/`**), cấu hình Docker siêu nhẹ và cơ sở dữ liệu MySQL khởi tạo tự động (`database/init/01_qkshop_tonkho_full.sql`).

---

## 📋 1. Phân Tích Cấu Hình VPS & Chiến Lược Tối Ưu Tốc Độ

| Hạng mục | Thông số VPS | Thách thức & Giải pháp kỹ thuật tối ưu |
|:---|:---|:---|
| **CPU** | **1 Core (1 vCPU)** | **Thách thức:** Dễ nghẽn CPU nếu Garbage Collector (GC) hoặc JIT compiler chạy nhiều luồng.<br>**Giải pháp:** Giới hạn JIT `-XX:CICompilerCount=2`, cấu hình GC 1 luồng; kích hoạt **Java 21 Virtual Threads** xử lý hàng trăm kết nối I/O mượt mà. |
| **Bộ nhớ (RAM)** | **2 GB RAM** | **Thách thức:** Mặc định MySQL 8 + Java 21 ngốn > 2.5 GB, dễ bị Linux `OOM-Killer` ngắt tiến trình.<br>**Giải pháp:** Khống chế 3 container ở mức **~1.45 GB**; tạo thêm **4 GB Swap SSD với `swappiness=10`** để đạt tổng **6 GB bộ nhớ**. |
| **Ổ cứng (Disk)** | **20 GB SSD** | **Thách thức:** Dung lượng có hạn, nếu build code hoặc để log phình to sẽ đầy đĩa.<br>**Giải pháp:** Giới hạn log 30MB/container; **Build tại máy tính cá nhân**, chỉ đưa file chạy lên VPS; tự dọn binlog sau 3 ngày. |
| **Băng thông** | **200 Mbps** | **Lợi thế lớn:** Mạng cực nhanh. Kết hợp nén Gzip mức 5 và cache trình duyệt vĩnh viễn 1 năm cho assets. Thời gian tải trang đạt mức **< 100ms**. |
| **Hệ điều hành** | **Ubuntu 24.04 LTS** *(hoặc 22.04 LTS)* | Bản chuẩn 64-bit hoặc Minimal đều tương thích 100%. |

---

## 📦 2. Quy Trình Đóng Gói 1-Click Từ Máy Tính Cá Nhân (Build Local)

> [!IMPORTANT]
> **Tuyệt đối KHÔNG chạy lệnh `mvn clean package` hay `npm run build` trực tiếp trên VPS 1 Core / 20 GB SSD!**
> Việc biên dịch trực tiếp trên VPS sẽ làm CPU chạm đỉnh 100% trong 15-20 phút, dễ treo máy và ngốn mất 5 - 8 GB dung lượng ổ cứng cho `node_modules` và `.m2`. Hãy build trên máy tính và chỉ upload file ZIP đã đóng gói sẵn.

Mỗi khi bạn có cập nhật code mới, chỉ cần chạy 1 thao tác trên máy Windows:
1. **Cách 1 (Chuột):** Nhấp đúp chuột vào file `deploy/dong_goi.bat`.
2. **Cách 2 (Terminal):** Mở PowerShell tại thư mục gốc và chạy:
   ```powershell
   .\deploy\dong_goi.ps1
   ```

Script sẽ tự động:
- Biên dịch Frontend React (Vite) ra thư mục `deploy/frontend/dist/`.
- Biên dịch Backend Spring Boot ra file `deploy/backend/target/tonkho-2.0.0.jar`.
- Đóng gói toàn bộ vào file: **`deploy/qkshop-vps-deploy.zip`** (~92 MB).

---

## 🛠️ 3. Chuẩn Bị Môi Trường VPS Mới (Chỉ làm 1 lần đầu)

Đăng nhập vào VPS qua SSH (với quyền `root` hoặc `sudo`) và chạy lần lượt các khối lệnh sau:

### Bước 3.1: Cài đặt công cụ giải nén & tiện ích cơ bản
```bash
sudo apt-get update
sudo apt-get install -y unzip zip tar p7zip-full curl ca-certificates gnupg nano
```

### Bước 3.2: Cài đặt Docker Engine CE & Docker Compose V2
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```
> 💡 *Mẹo:* Nếu bạn thuê VPS theo gói có cài sẵn app mẫu (như OpenClaw hoặc n8n), hãy chạy lệnh sau để dọn sạch:
> ```bash
> sudo docker rm -f $(sudo docker ps -aq) 2>/dev/null || true
> ```

### Bước 3.3: Tối ưu cấu hình Docker Daemon (`/etc/docker/daemon.json`)
Giúp giữ container chạy liên tục khi Docker daemon reload (`live-restore`), nâng ulimits và khống chế log chống đầy ổ cứng 20GB:
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

### Bước 3.4: Tạo 4 GB RAM ảo (Swap trên SSD) & Tối ưu Kernel
Kết hợp **2 GB RAM vật lý + 4 GB Swap = 6 GB tổng bộ nhớ**, đồng thời cấu hình `swappiness=10` để hệ điều hành luôn ưu tiên dùng RAM vật lý tốc độ cao:
```bash
# 1. Tạo file swap 4GB (tự động thử fallocate, nếu không hỗ trợ sẽ dùng dd)
sudo fallocate -l 4G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Tinh chỉnh nhân Linux cho VPS 1 Core
sudo sysctl -w vm.swappiness=10 vm.vfs_cache_pressure=50 net.core.somaxconn=1024 net.ipv4.tcp_tw_reuse=1
cat << 'EOF' | sudo tee -a /etc/sysctl.conf
vm.swappiness=10
vm.vfs_cache_pressure=50
net.core.somaxconn=1024
net.ipv4.tcp_tw_reuse=1
EOF
```
*(Gõ lệnh `free -h` để kiểm tra: dòng `Swap` hiển thị `4.0Gi` là thành công).*

---

## ⚡ 4. Ba Bước Khởi Chạy Hệ Thống QKShop

### Bước 1: Tải file `qkshop-vps-deploy.zip` lên VPS và giải nén
Dùng WinSCP / FileZilla tải file `qkshop-vps-deploy.zip` vào thư mục bất kỳ trên VPS (ví dụ `/root` hoặc `/home`), sau đó chạy:

```bash
sudo mkdir -p /opt/qkshop
sudo unzip -o qkshop-vps-deploy.zip -d /opt/qkshop
cd /opt/qkshop
```

### Bước 2: Tạo file cấu hình môi trường (`.env`)
```bash
cp .env.example .env
```
*(Tùy chọn: Gõ `nano .env` nếu muốn đổi mật khẩu MySQL `DB_PASSWORD` hoặc mã bí mật `JWT_SECRET`).*

### Bước 3: Khởi chạy toàn bộ hệ thống
```bash
docker compose up -d --build
```
*(Chỉ mất khoảng **30 - 45 giây** là toàn bộ 3 dịch vụ MySQL, Backend và Frontend sẽ sẵn sàng hoạt động).*

---

## 🎉 5. Truy Cập Hệ Thống & Tài Khoản Quản Trị

- **Địa chỉ truy cập Web:** `http://<IP_CỦA_VPS>` (Cổng 80 mặc định).
- **Tài khoản đăng nhập:**
  - Sử dụng trực tiếp **tài khoản Quản trị viên đã có sẵn trong cơ sở dữ liệu** (`database/init/01_qkshop_tonkho_full.sql`).
  - Hệ thống tự động nạp nguyên vẹn 28 bảng dữ liệu, các chỉ mục (Indexes) và tài khoản quản trị hiện có của cửa hàng, **không cần tạo thêm tài khoản admin mặc định mới**.
- **Kết nối Tên miền & SSL (Tùy chọn):** Trỏ bản ghi A của tên miền (ví dụ `kho.qkshop.vn`) về IP VPS và bật SSL qua Cloudflare (chế độ Flexible/Full) hoặc Certbot Nginx.

---

## 📊 6. Bảng Thông Số Tối Ưu Của 3 Container

| Container | Base Image | Giới hạn RAM | Các thông số tối ưu chi tiết |
|:---|:---|:---|:---|
| **`qkshop_db`** | `mysql:8.0` | `550 MB` | • `--performance-schema=OFF` (tiết kiệm ~150MB RAM)<br>• `--innodb-flush-log-at-trx-commit=2` (tăng tốc ghi hóa đơn gấp 5 - 10 lần)<br>• `--skip-name-resolve` (kết nối nội bộ tức thì, không DNS lookup)<br>• `--innodb-buffer-pool-size=256M`<br>• `--binlog-expire-logs-seconds=259200` (dọn binlog sau 3 ngày) |
| **`qkshop_backend`** | `eclipse-temurin:21-jre-jammy` | `850 MB` | • `-Xms256m -Xmx512m`<br>• `-XX:+UseG1GC -XX:ParallelGCThreads=1 -XX:ConcGCThreads=1` (tiết kiệm CPU 1 core)<br>• `-XX:CICompilerCount=2` (mở khóa JIT C2 tối ưu mã máy mà không nghẽn CPU)<br>• Java 21 Virtual Threads (`spring.threads.virtual.enabled=true`)<br>• HikariCP max pool 10 kết nối<br>• Cài sẵn font `DejaVu` hỗ trợ xuất PDF & Excel tiếng Việt |
| **`qkshop_frontend`** | `nginx:alpine` | `80 MB` | • Tiêu thụ thực tế chỉ ~20 - 25 MB RAM<br>• `keepalive 32` kết nối thường trực tới Backend (giảm tối đa latency API)<br>• Nén Gzip mức 5 cho toàn bộ JSON, HTML, JS, CSS<br>• Cache tĩnh `/assets/` 1 năm (`immutable`) |

---

## 🛠️ 7. Sổ Tay Lệnh Vận Hành & Bảo Trì Hàng Ngày

### 1. Kiểm tra trạng thái & theo dõi tài nguyên
```bash
# Xem trạng thái sống của các container
docker compose ps

# Giám sát mức dùng CPU / RAM thực tế thời gian thực
docker stats

# Xem nhật ký (log) của Backend để theo dõi giao dịch
docker compose logs -f --tail=100 backend

# Khởi động lại hệ thống (an toàn 100% dữ liệu)
docker compose restart
```

### 2. Cập nhật phiên bản mới (Sau khi đóng gói từ máy local)
Khi có tính năng mới hoặc sửa lỗi:
1. Tại máy tính: Chạy `dong_goi.bat` để tạo file `qkshop-vps-deploy.zip` mới.
2. Upload file zip đè lên VPS.
3. Chạy 2 lệnh cập nhật không gián đoạn:
   ```bash
   sudo unzip -o qkshop-vps-deploy.zip -d /opt/qkshop
   cd /opt/qkshop && docker compose up -d --build
   ```

### 3. Tối ưu dung lượng ổ cứng (Đặc biệt quan trọng với gói 20 GB SSD)
```bash
# 1. Thu hồi dung lượng log hệ thống Linux (giới hạn tối đa 100MB)
sudo journalctl --vacuum-size=100M

# 2. Xóa các Docker image cũ và build cache không còn dùng
docker system prune -f

# 3. Kiểm tra dung lượng trống của ổ cứng
df -h /
```

### 4. Sao lưu (Backup) & Phục hồi (Restore) CSDL MySQL
```bash
# 1. Sao lưu và nén trực tiếp CSDL ra file .sql.gz (tiết kiệm 85% dung lượng)
docker exec qkshop_db mysqldump -uroot -p"$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)" \
  --single-transaction --routines --triggers qkshop_tonkho | gzip > backup_qkshop_$(date +%Y%m%d).sql.gz

# 2. Khôi phục CSDL từ file nén .sql.gz
gunzip < backup_qkshop_YYYYMMDD.sql.gz | docker exec -i qkshop_db \
  mysql -uroot -p"$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)" qkshop_tonkho
```

> ⚠️ **Lưu ý quan trọng:** Tuyệt đối **KHÔNG** chạy lệnh `docker compose down -v` vì cờ `-v` sẽ xóa ổ đĩa dữ liệu MySQL (`mysql_data`). Khi cần tắt/bật máy chủ, chỉ dùng `docker compose stop` và `docker compose start`.
