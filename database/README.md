# 🗄️ Hướng Dẫn Quản Lý Cơ Sở Dữ Liệu MySQL - QKShop

Thư mục này quản lý toàn bộ cấu trúc bảng (DDL), dữ liệu khởi tạo (Seed Data) và các file Excel mẫu phục vụ cho việc vận hành hệ thống **Quản Lý Kho QKShop**.

---

## 📁 1. Cấu Trúc Thư Mục

```text
QuanLyKho/
├── database/
│   ├── schema/
│   │   └── 01_init_schema.sql          # Cấu trúc 28 bảng & Indexes (DDL thuần)
│   ├── samples/                        # Các file Excel mẫu dùng nhập kho & đối chiếu
│   │   ├── mau_doi_chieu_ton_kho.xlsx
│   │   └── mau_du_lieu_ban_hang.xlsx
│   └── README.md                       # Tài liệu hướng dẫn này
└── deploy/
    └── database/
        └── init/
            └── 01_qkshop_tonkho_full.sql # Bản CSDL đầy đủ (28 bảng + Indexes + Tài khoản quản trị)
```

---

## 🚀 2. Hướng Dẫn Khởi Tạo CSDL Ban Đầu

### Cách 1: Tự động qua Docker Compose V2 (Khuyên dùng)
Khi chạy lệnh `docker compose up -d --build` trong thư mục `deploy/`, container `qkshop_db` (`mysql:8.0` LTS) sẽ tự động thực thi file `deploy/database/init/01_qkshop_tonkho_full.sql` để khởi tạo CSDL `qkshop_tonkho` gồm:
- Toàn bộ **28 bảng dữ liệu** chuẩn `utf8mb4_unicode_ci`.
- Hệ thống **Chỉ mục (Indexes)** tối ưu tốc độ tìm kiếm Serial, đơn hàng, phụ kiện, linh kiện.
- **Tài khoản Quản trị viên (`ADMIN`)** và phân quyền đã có sẵn trong CSDL (không cần bước tạo thêm tài khoản admin mặc định mới).

**Thông số MySQL 8.0 tối ưu đã cấu hình sẵn trong `deploy/docker-compose.yml`:**
- Giới hạn RAM container: `mem_limit: 550m` (`innodb-buffer-pool-size=256M`).
- Tắt `performance-schema=OFF`, bật `skip-name-resolve`, `innodb-flush-log-at-trx-commit=2`, `max-connections=60`.

### Cách 2: Khởi tạo thủ công qua MySQL CLI (Môi trường cài trực tiếp)
```bash
# Nạp bản CSDL đầy đủ (Schema + Indexes + Dữ liệu gốc)
mysql -u root -p --default-character-set=utf8mb4 < deploy/database/init/01_qkshop_tonkho_full.sql
```

---

## 🔑 3. Tài Khoản Quản Trị Hệ Thống

- Trong file CSDL khởi tạo (`deploy/database/init/01_qkshop_tonkho_full.sql`) đã có sẵn tài khoản **Quản trị viên (`ADMIN`)** của cửa hàng với đầy đủ 27 quyền hệ thống.
- Khi triển khai lên VPS, hệ thống sử dụng trực tiếp tài khoản quản trị sẵn có trong CSDL mà **không cần cấu hình hay tạo thêm tài khoản admin mặc định mới**.

---

## 💾 4. Hướng Dẫn Sao Lưu & Phục Hồi (Backup & Restore)

### 4.1. Sao lưu CSDL (Backup)
- **Trên Docker VPS (Trích xuất & nén trực tiếp ra `.sql.gz` — tiết kiệm 85% dung lượng):**
  ```bash
  docker exec qkshop_db mysqldump -uroot -p"$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)" \
    --default-character-set=utf8mb4 --single-transaction --routines --triggers qkshop_tonkho \
    | gzip > backup_qkshop_$(date +%Y%m%d).sql.gz
  ```
- **Trên máy cài MySQL trực tiếp (Xuất ra file `.sql`):**
  ```bash
  mysqldump -u root -p --default-character-set=utf8mb4 --routines --triggers qkshop_tonkho \
    > backup_qkshop_$(date +%Y%m%d).sql
  ```

### 4.2. Phục hồi CSDL (Restore)
- **Trên Docker VPS (Giải nén & nạp từ file `.sql.gz`):**
  ```bash
  gunzip < backup_qkshop_YYYYMMDD.sql.gz | docker exec -i qkshop_db \
    mysql -uroot -p"$(grep '^DB_PASSWORD=' .env | cut -d '=' -f2-)" --default-character-set=utf8mb4 qkshop_tonkho
  ```
- **Trên máy cài MySQL trực tiếp (Nạp từ file `.sql`):**
  ```bash
  mysql -u root -p --default-character-set=utf8mb4 qkshop_tonkho < duong_dan_file_backup.sql
  ```
