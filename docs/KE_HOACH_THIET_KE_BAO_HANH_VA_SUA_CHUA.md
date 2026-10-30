# KẾ HOẠCH TRIỂN KHAI: BẢO HÀNH PHỤ KIỆN & DỊCH VỤ SỬA CHỮA ĐỒNG BỘ

> **Dự án**: Quản Lý Kho QKShop (Spring Boot 3.3.5 / Java 21 + React 19 / Vite 6)  
> **Phiên bản kế hoạch**: v1.1.0 (Đã hoàn thiện theo phản hồi tinh gọn từ người dùng)  
> **Trạng thái**: ✅ **ĐÃ TRIỂN KHAI HOÀN TẤT & ĐỒNG BỘ**

---

## 📌 Checklist Tiến Độ Thực Hiện

- [x] **Giai đoạn 1: Thiết kế Cơ sở dữ liệu & Entity Backend (Spring Boot)**
  - [x] 1.1. Bổ sung trường bảo hành mặc định cho bảng `accessories` (`default_warranty_months`)
  - [x] 1.2. Tạo bảng `accessory_orders` (Đơn xuất bán phụ kiện)
  - [x] 1.3. Tạo bảng `accessory_order_items` (Chi tiết phụ kiện, số lượng, giá, hạn bảo hành riêng từng món, serial tem)
  - [x] 1.4. Thiết kế tinh gọn đơn dịch vụ sửa chữa: Bảng `repair_orders` (Lưu Tên khách, SĐT, Tên máy, KTV, Ghi chú, Tổng tiền)
  - [x] 1.5. Bảng `repair_order_items` (Chi tiết nhập tay từng dịch vụ/linh kiện, giá, số lượng, thời hạn bảo hành, hạn bảo hành, ghi chú)
- [x] **Giai đoạn 2: API & Nghiệp Vụ Backend**
  - [x] 2.1. Cập nhật `AccessoryService` & Controller: Lưu đơn xuất phụ kiện nhiều món kèm hạn BH riêng, tự động tính ngày hết hạn
  - [x] 2.2. Xây dựng Controller & Service cho `RepairOrder`: Lưu đơn dịch vụ nhập tay, tự động tính hạn bảo hành từng hạng mục
  - [x] 2.3. Nâng cấp API `/sale/warranty`: Tra cứu hợp nhất theo SĐT hoặc Tên Khách/Tên máy (trả về cả Máy, Phụ kiện, Dịch vụ sửa chữa)
- [x] **Giai đoạn 3: Cập Nhật Giao Diện Bán Phụ Kiện (Frontend React)**
  - [x] 3.1. Thêm cột chọn thời hạn bảo hành (0T, 1T, 3T, 6T, 12T, 24T...) cho từng dòng phụ kiện trong giỏ bán
  - [x] 3.2. Cập nhật payload gửi lên API khi bấm Hoàn tất xuất bán
  - [x] 3.3. Thêm popup hiển thị & In phiếu biên nhận bảo hành phụ kiện
- [x] **Giai đoạn 4: Xây Dựng Màn Hình Quản Lý Dịch Vụ Sửa Chữa (Frontend React)**
  - [x] 4.1. Tạo trang `TrangSuaChua.jsx`: Form nhập tay khách, sđt, tên máy, thêm nhiều dòng dịch vụ (Tên dịch vụ, SL, Giá, Bảo hành, Ghi chú)
  - [x] 4.2. Cột danh sách các đơn sửa chữa gần đây kèm bộ lọc tìm kiếm nhanh
  - [x] 4.3. Popup in phiếu biên nhận dịch vụ sửa chữa giao cho khách
- [x] **Giai đoạn 5: Nâng Cấp Cổng Tra Cứu Bảo Hành (Frontend React)**
  - [x] 5.1. Nâng cấp `TrangKiemTraBaoHanh.jsx`: Giao diện 3 Tab trực quan:
    - 💻 **Máy mua tại shop**
    - 🎧 **Phụ kiện đã mua** (Hiển thị chi tiết hạn bảo hành, badge Còn hạn / Hết hạn của từng món)
    - 🛠️ **Dịch vụ sửa chữa** (Hiển thị tên máy sửa, dịch vụ đã làm, thời hạn bảo hành từng món)
- [x] **Giai đoạn 6: Kiểm Thử & Biên Dịch (Verification)**
  - [x] 6.1. Build Backend (`mvn clean compile`): **BUILD SUCCESS**
  - [x] 6.2. Build Frontend (`npm run build`): **Vite build thành công**
