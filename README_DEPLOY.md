# Hướng Dẫn Deploy Dự Án QKShop Quản Lý Kho Bằng Docker

Dự án này đã được cấu hình sẵn để dễ dàng deploy lên server thông qua Docker và Docker Compose. Hệ thống bao gồm 3 container:
1. **db**: Cơ sở dữ liệu MySQL 8.0.
2. **backend**: Spring Boot application.
3. **frontend**: React Vite application, được build tĩnh và serve thông qua Nginx (Nginx cũng đóng vai trò Reverse Proxy chuyển tiếp request `/api` tới backend).

## Yêu Cầu Hệ Thống
- Máy chủ (Server / VPS) đã cài đặt **Docker** và **Docker Compose**.
- Đã mở port `80` (HTTP) để người dùng có thể truy cập hệ thống.
- (Tùy chọn) Có thể mở thêm port `8080` (Backend API) hoặc `3306` (MySQL) nếu cần truy cập trực tiếp để quản trị.

## Các Bước Deploy Lên Server

### Bước 1: Sao chép mã nguồn lên server
Bạn có thể dùng `git clone` hoặc upload trực tiếp toàn bộ thư mục gốc của dự án này lên server của bạn.

### Bước 2: Cấu hình bảo mật (Tùy chọn nhưng rất khuyến khích)
Để bảo mật tốt hơn, đừng dùng mật khẩu mặc định. Hãy tạo một file `.env` **ngay tại thư mục gốc của dự án** (nơi chứa file `docker-compose.yml`) và điền các thông tin sau:

```env
# Mật khẩu root của MySQL
DB_PASSWORD=mat_khau_cua_ban_123!@#

# Secret key cho việc mã hóa JWT của hệ thống
JWT_SECRET=chuoi_mat_ma_ngau_nhien_va_du_dai_de_bao_mat_he_thong
```

*Lưu ý: Nếu không tạo file `.env`, hệ thống sẽ dùng giá trị mặc định là `dongduy122` và chuỗi bí mật mặc định.*

### Bước 3: Chạy dự án với Docker Compose
Mở terminal trên server, di chuyển tới thư mục gốc dự án (chứa file `docker-compose.yml`) và chạy lệnh sau:

```bash
docker-compose up -d --build
```
- `-d`: Chạy ngầm (detached mode) để ứng dụng không bị tắt khi bạn đóng terminal.
- `--build`: Ép Docker build lại các image từ đầu để đảm bảo code mới nhất được áp dụng.

### Bước 4: Chờ và kiểm tra
Lần đầu tiên chạy, Docker sẽ cần vài phút để tải môi trường Node.js (frontend) và Maven/Java (backend) về để tiến hành build. 
Bạn có thể xem tiến trình hoặc lỗi (nếu có) bằng lệnh:

```bash
docker-compose logs -f
```

### Bước 5: Truy cập hệ thống
Sau khi các container báo trạng thái `running`, bạn có thể truy cập hệ thống:
- Giao diện web (Frontend): `http://<IP-CỦA-SERVER>`
- API gốc (Backend): `http://<IP-CỦA-SERVER>:8080` (chỉ dùng nếu muốn test API độc lập, bình thường Frontend sẽ tự động gọi backend thông qua Nginx nội bộ).

---

## Cập Nhật Code Lên Server
Mỗi khi bạn có sửa đổi code (frontend hoặc backend), bạn chỉ cần đưa code mới lên server và chạy lại lệnh:

```bash
docker-compose up -d --build
```
Docker sẽ tự động build lại phần code bị thay đổi và khởi động lại container tương ứng.

## Một Số Lệnh Quản Trị Thường Dùng
- **Tắt hệ thống**: `docker-compose down`
- **Khởi động lại (không build)**: `docker-compose restart`
- **Vào MySQL Console**: `docker exec -it qkshop_db mysql -uroot -p`

---

## Hướng Dẫn Đưa Dự Án Lên Internet (Public)

Tùy vào mục đích sử dụng, có 2 cách để đưa dự án này cho người khác truy cập qua Internet:

### Cách 1: Public tạm thời từ máy tính cá nhân (Dùng Ngrok)
Dùng khi bạn muốn chia sẻ nhanh dự án đang chạy trên laptop/PC của mình cho người khác hoặc khách hàng xem thử (không cần mua server).

**Các bước thực hiện:**
1. Đăng ký tài khoản và tải [Ngrok](https://ngrok.com/).
2. Cài đặt mã xác thực theo hướng dẫn của Ngrok: `ngrok config add-authtoken <Mã_Của_Bạn>`.
3. Do hệ thống của chúng ta hiển thị giao diện ở cổng `80`, bạn chỉ cần mở terminal (cmd/powershell) và chạy lệnh:
   ```bash
   ngrok http 80
   ```
4. Ngrok sẽ sinh ra một đường dẫn (ví dụ: `https://abcd-123.ngrok-free.app`). 
5. Bạn copy đường dẫn này gửi cho bạn bè, họ có thể vào hệ thống quản lý kho của bạn từ bất kỳ đâu trên thế giới!
*(Lưu ý: Bạn phải bật máy tính, bật Docker và giữ nguyên cửa sổ ngrok thì web mới hoạt động. Khi tắt Ngrok, link sẽ chết).*

### Cách 2: Public chính thức (Chạy 24/24 với Tên miền thực)
Dùng khi bạn muốn đưa phần mềm vào sử dụng thực tế cho cửa hàng, chạy liên tục 24/24.

**Chuẩn bị:**
- Thuê một máy chủ ảo (VPS) (ví dụ VPS Ubuntu của Vultr, DigitalOcean, hoặc các nhà cung cấp Việt Nam) có IP tĩnh.
- Mua một tên miền (Domain) riêng, ví dụ: `quanlykho-qkshop.vn`.

**Các bước deploy lên VPS:**
1. **Trỏ tên miền:** Truy cập nơi mua tên miền, tạo bản ghi `A` trỏ tên miền về địa chỉ IP của VPS.
2. **Cài đặt môi trường trên VPS:** Truy cập vào VPS, cài đặt **Docker** và **Docker Compose**.
3. **Đưa mã nguồn lên:** Upload toàn bộ mã nguồn của bạn lên VPS.
4. **Cấu hình bảo mật:** 
   - Bắt buộc phải tạo file `.env` trên VPS để đổi mật khẩu database (`DB_PASSWORD`) và `JWT_SECRET`.
5. **Chạy ứng dụng:**
   - Chạy lệnh: `docker-compose up -d --build`.
   - Lúc này người dùng đã có thể truy cập hệ thống qua IP của VPS, hoặc qua tên miền (nếu trỏ thành công).
6. **Bảo mật HTTPS (Ổ khóa xanh):**
   - Để website an toàn hơn, bạn nên cấu hình Nginx (bên ngoài host) kết hợp với **Certbot** (Let's Encrypt) hoặc dùng công cụ **Nginx Proxy Manager** (dạng Docker) để cấp phát SSL miễn phí cho tên miền. Nó sẽ hứng request `https://` và chuyển tiếp vào cổng `80` của container `qkshop_frontend`.
