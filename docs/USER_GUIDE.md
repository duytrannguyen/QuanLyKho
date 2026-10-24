# 📖 SỔ TAY HƯỚNG DẪN SỬ DỤNG HỆ THỐNG
## QKSHOP WAREHOUSE MANAGEMENT SYSTEM (WMS)

---

## 📑 MỤC LỤC
1. [Đăng Nhập & Quản Lý Phiên Làm Việc](#1-đăng-nhập--quản-lý-phiên-làm-việc)
2. [Tra Cứu Tồn Kho & Tìm Kiếm Máy](#2-tra-cứu-tồn-kho--tìm-kiếm-máy)
3. [Quy Trình Nhập Máy Mới & Kiểm Định (QC)](#3-quy-trình-nhập-máy-mới--kiểm-định-qc)
4. [Quản Lý & Bán Phụ Kiện](#4-quản-lý--bán-phụ-kiện)
5. [Tạo Đơn Bán Hàng & Đóng Vòng Đời Máy](#5-tạo-đơn-bán-hàng--đóng-vòng-đời-máy)
6. [Tạo & Xuất Báo Giá PDF (Khổ A4 / A5)](#6-tạo--xuất-báo-giá-pdf-khổ-a4--a5)
7. [Đối Soát Dữ Liệu & Đồng Bộ Google Sheets](#7-đối-soát-dữ-liệu--đồng-bộ-google-sheets)
8. [Quản Trị Người Dùng & Phân Quyền Nhân Sự](#8-quản-trị-người-dùng--phân-quyền-nhân-sự)

---

## 1. ĐĂNG NHẬP & QUẢN LÝ PHIÊN LÀM VIỆC

1. Mở trình duyệt và truy cập vào địa chỉ hệ thống (Ví dụ: `http://localhost` hoặc IP tĩnh server nội bộ).
2. Nhập **Tên đăng nhập** và **Mật khẩu**.
   - *Tài khoản quản trị khởi tạo:* `admin` / `admin123`.
3. Sau khi đăng nhập, hệ thống sẽ tự động hiển thị thanh menu bên trái tương ứng với các quyền hạn mà bạn được phân bổ.
4. **Đổi mật khẩu:** Bấm vào biểu tượng ảnh đại diện ở góc phải trên cùng -> Chọn **"Đổi Mật Khẩu"** để bảo mật tài khoản.

---

## 2. TRA CỨU TỒN KHO & TÌM KIẾM MÁY

- Truy cập menu **"Tìm Kiếm Tồn Kho"**.
- **Bộ lọc đa năng:**
  - Tìm nhanh theo: Số máy (Serial), Tên model, Dòng CPU (Core i5, i7, Ryzen 7...), Dung lượng RAM (8GB, 16GB, 32GB), Ổ cứng SSD.
  - Lọc theo khoảng giá bán mong muốn.
  - Lọc theo tình trạng: Sẵn sàng bán (`READY`) hoặc Đang chờ kiểm định (`NEEDS_INSPECTION`).
- **Thao tác nhanh:**
  - Nhấp vào từng máy để xem toàn bộ thông tin chi tiết: cấu hình, ngày nhập, giá vốn, giá niêm yết, tình trạng ngoại hình máy.

---

## 3. QUY TRÌNH NHẬP MÁY MỚI & KIỂM ĐỊNH (QC)

### Bước 1: Tiếp nhận máy (Nhập kho)
- Truy cập menu **"Nhập Máy Móc"**.
- Điền các thông tin bắt buộc:
  - **Số Máy / Serial:** Quét mã vạch từ máy hoặc nhập bằng tay.
  - **Thương hiệu & Dòng máy:** Chọn Dell, HP, Lenovo, Asus...
  - **Cấu hình chi tiết:** Chọn CPU, dung lượng RAM, dung lượng SSD, card đồ họa GPU, kích thước màn hình.
  - **Giá nhập vốn:** Ghi nhận giá nhập phục vụ tính toán lợi nhuận.
- Nhấn **"Lưu & Nhập Kho"**. Máy sẽ được tự động đưa vào danh sách **"Chờ Kiểm Định"**.

### Bước 2: Kiểm định chất lượng (QC)
- Kỹ thuật viên truy cập menu **"Kiểm Định"**.
- Mở máy cần kiểm tra, rà soát danh sách kiểm định: Màn hình, Bàn phím, Loa, Webcam, Pin, Cổng kết nối, Ngoại hình.
- Nếu đạt yêu cầu: Nhấn **"Xác Nhận Đạt - Chuyển Sẵn Sàng Bán"**. Máy sẽ chuyển sang trạng thái `READY` và hiển thị trên bảng báo giá bán hàng.

---

## 4. QUẢN LÝ & BÁN PHỤ KIỆN

### Quản lý tồn kho phụ kiện:
- Truy cập menu **"Tồn Kho Phụ Kiện"**.
- Bấm **"Thêm Phụ Kiện Mới"** để khai báo mã SKU, tên phụ kiện, danh mục (Chuột, Balo, Bàn phím, Sạc...), giá bán lẻ và số lượng ban đầu.

### Xuất bán phụ kiện:
- Truy cập menu **"Bán Phụ Kiện"**.
- Chọn các món phụ kiện khách mua, nhập số lượng và thông tin người mua.
- Nhấn **"Xác Nhận Xuất Bán"**: Hệ thống sẽ tự động trừ số lượng tồn kho phụ kiện và ghi nhận vào mục **"Lịch Sử Bán Phụ Kiện"**.

---

## 5. TẠO ĐƠN BÁN HÀNG & ĐÓNG VÒNG ĐỜI MÁY

1. Truy cập menu **"Bán Hàng"**.
2. Chọn máy cần bán từ danh sách tồn kho sẵn sàng.
3. Điền thông tin giao dịch:
   - Tên khách hàng, số điện thoại, địa chỉ nhận hàng.
   - Giá bán thực tế (có thể áp dụng chiết khấu).
   - Thời hạn bảo hành (Mặc định 12 tháng).
   - Phương thức thanh toán (Tiền mặt, Chuyển khoản, Quẹt thẻ, Trả góp).
4. Nhấn **"Hoàn Tất Đơn Hàng"**.
5. *Kết quả:* Máy tự động được chuyển từ kho `Active` sang kho `Closed Cycle`, kết thúc một vòng đời sản phẩm an toàn.

---

## 6. TẠO & XUẤT BÁO GIÁ PDF (KHỔ A4 / A5)

1. Truy cập menu **"Bảng Giá"**.
2. Tích chọn các dòng máy bạn muốn đưa vào danh sách chào hàng gửi khách.
3. Tùy chỉnh bộ lọc: Theo thương hiệu, phân khúc giá sinh viên / văn phòng / đồ họa / gaming.
4. Chọn khổ giấy in:
   - **Khổ A4:** Phù hợp gửi file báo giá qua Zalo/Email hoặc in tài liệu phát cho khách hàng.
   - **Khổ A5:** Phù hợp in bảng thông tin đặt tại quầy hoặc kẹp trên từng kệ máy trưng bày.
5. Nhấn nút **"Xuất Báo Giá PDF"**: Hệ thống JasperReports sẽ render file PDF sắc nét kèm logo QKShop để bạn tải về ngay lập tức.

---

## 7. ĐỐI SOÁT DỮ LIỆU & ĐỒNG BỘ GOOGLE SHEETS

1. Truy cập menu **"Đối Soát"**.
2. Nhấn nút **"Đồng Bộ Ngay"** nếu muốn cập nhật số liệu mới nhất từ bảng tính Google Sheets của cửa hàng.
3. Màn hình Đối Soát sẽ tự động phân loại:
   - **Khớp 100%:** Các máy có thông tin trên hệ thống và Sheets đồng nhất.
   - **Cảnh báo Lệch Kho:** Các máy có mặt trên Sheets nhưng chưa có trên kho WMS, hoặc trạng thái bán bị sai khác.
4. Nhân viên kế toán dựa vào danh sách cảnh báo để xử lý điều chỉnh kịp thời.

---

## 8. QUẢN TRỊ NGƯỜI DÙNG & PHÂN QUYỀN NHÂN SỰ

*(Chỉ dành cho tài khoản có quyền ADMIN hoặc MANAGE_USERS)*

1. Truy cập menu **"Cài Đặt Hệ Thống" -> "Quản Lý Tài Khoản"**.
2. **Tạo tài khoản mới:**
   - Nhập Username, Tên đầy đủ, Email, Mật khẩu ban đầu.
   - Chọn vai trò chuẩn: `ADMIN`, `ACCOUNTANT`, `TECHNICAL`, hoặc `SALES`.
3. **Phân quyền tùy biến:**
   - Có thể bật/tắt từng mã quyền cụ thể cho từng nhân viên (ví dụ: Nhân viên bán hàng chỉ được xem bảng giá và tạo đơn, không được xóa máy hoặc xem giá nhập vốn).
