# 🗄️ Hướng Dẫn Quản Lý Cơ Sở Dữ Liệu MySQL - QKShop

Thư mục này quản lý toàn bộ các tập lệnh khởi tạo, cấu trúc bảng (DDL), dữ liệu ban đầu (Seed Data) và tài liệu mẫu phục vụ cho việc triển khai hệ thống **Quản Lý Kho QKShop**.

---

## 📁 Cấu Trúc Thư Mục

```
database/
├── schema/
│   └── 01_init_schema.sql      # Toàn bộ cấu trúc 28 bảng (DDL thuần, không chứa dữ liệu nhạy cảm)
├── seed/
│   └── 02_initial_data.sql     # Tài khoản Super Admin mặc định, bảng phân quyền & cấu hình hệ thống
├── samples/                    # Các file Excel mẫu dùng thử nghiệm nhập kho & đối chiếu
│   ├── mau_doi_chieu_ton_kho.xlsx
│   └── mau_du_lieu_ban_hang.xlsx
└── README.md                   # Tài liệu hướng dẫn này
```

---

## 🚀 Hướng Dẫn Khởi Tạo CSDL Ban Đầu

### Cách 1: Khởi tạo tự động qua Docker Compose (Khuyên dùng)
Khi chạy lệnh `docker compose up -d`, container MySQL sẽ tự động khởi tạo cơ sở dữ liệu `qkshop_tonkho` với toàn bộ bảng và cấu hình cần thiết.

### Cách 2: Khởi tạo thủ công qua MySQL CLI
1. Đăng nhập vào MySQL Server:
   ```bash
   mysql -u root -p
   ```
2. Khởi tạo cấu trúc bảng (Schema):
   ```bash
   mysql -u root -p < database/schema/01_init_schema.sql
   ```
3. Nạp dữ liệu ban đầu (Seed Data):
   ```bash
   mysql -u root -p < database/seed/02_initial_data.sql
   ```

---

## 🔑 Tài Khoản Quản Trị Khởi Tạo Mặc Định
- **Tên đăng nhập (Username):** `admin`
- **Mật khẩu mặc định (Password):** `admin123`
- **Quyền hạn:** Toàn quyền (Super Administrator)

> ⚠️ **Lưu ý bảo mật:** Sau khi đăng nhập thành công lần đầu tiên, vui lòng truy cập ngay vào menu **"Cài Đặt Hệ Thống" -> "Đổi Mật Khẩu"** để đổi sang mật khẩu an toàn của bạn.

---

## 💾 Hướng Dẫn Sao Lưu & Phục Hồi (Backup & Restore)

### 1. Sao lưu CSDL (Backup)
Chạy lệnh sau trên terminal để trích xuất bản sao lưu đầy đủ:
```bash
mysqldump -u root -p --default-character-set=utf8mb4 --routines --triggers qkshop_tonkho > backups/backup_qkshop_$(date +%Y%m%d).sql
```
*(Trên Windows PowerShell, bạn có thể chạy script `deploy/scripts/backup-db.bat` đã được chuẩn bị sẵn).*

### 2. Phục hồi CSDL (Restore)
Khi cần khôi phục lại dữ liệu từ một bản sao lưu:
```bash
mysql -u root -p --default-character-set=utf8mb4 qkshop_tonkho < duong_dan_file_backup.sql
```
