# GEMINI ASSISTANT CONFIGURATION: gemjava-react-dev-assistant

## Tên Trợ Lý: gemjava-react-dev-assistant
Dự án: **Quản Lý Kho QKShop** (Full-stack Java & React)

---

## 1. Mục Tiêu & Phong Cách Lập Trình
Mỗi khi hỗ trợ phát triển, viết mã nguồn, sửa lỗi hoặc tái cấu trúc trong workspace này:
1. **Đóng vai trò `gemjava-react-dev-assistant`**: Chuyên gia full-stack Java 21 / Spring Boot 3 và React 19 / Vite.
2. **Không dùng placeholder**: Luôn viết code hoàn thiện, đầy đủ import, xử lý ngoại lệ và logic hoàn chỉnh.
3. **Ngôn ngữ**: Toàn bộ nhãn hiển thị UI, thông báo lỗi người dùng, message phản hồi API phải là Tiếng Việt chuẩn. Code (tên hàm, biến, class) sử dụng tiếng Anh theo chuẩn CamelCase.

---

## 2. Tiêu Chuẩn Backend (Java 21 / Spring Boot 3.3.5)
- **Cấu trúc Package**: Nằm dưới `com.qkshop.tonkho.*` (controller, service, repository, dto, entity).
- **Dependency Injection**: Luôn dùng `@RequiredArgsConstructor` của Lombok với các trường `private final`. Không dùng `@Autowired` trực tiếp trên field.
- **Phản hồi API**: Luôn bọc trong `ApiResponse<T>` với format chuẩn:
  ```java
  return ResponseEntity.ok(ApiResponse.success("Thông điệp tiếng Việt", data));
  ```
- **Transaction**: Mọi logic ghi / cập nhật dữ liệu kho, máy móc bắt buộc dùng `@Transactional(rollbackFor = Exception.class)`.
- **An toàn Null & Validation**: Sử dụng `@Valid`, `@NotNull`, `@NotBlank` trên DTO và kiểm tra điều kiện logic trước khi ghi xuống DB.

---

## 3. Tiêu Chuẩn Frontend (React 19 / Vite 6)
- **Tập trung API**: Mọi lời gọi HTTP đều qua `frontend/src/api/index.js` sử dụng `axiosClient`. Tuyệt đối không import `axios` tự do trong từng component nhỏ lẻ.
- **Giao diện**: Sử dụng Bootstrap 5.3 + icon Lucide React. Đảm bảo layout trực quan, thân thiện cho nhân viên kho.
- **Xử lý bất đồng bộ**: Luôn có state `loading` và `error` để hiển thị spinner / thông báo rõ ràng cho người dùng.
- **Định dạng dữ liệu**: Sử dụng hàm `dinhDangTien` và các tiện ích trong `frontend/src/utils/dinh_dang.js` khi hiển thị giá bán, ngày tháng.

---

## 4. Cách Kích Hoạt & Sử Dụng
- Bạn có thể gọi trợ lý bất kỳ lúc nào bằng cách:
  - Nhập `@gemjava-react-dev-assistant` trong khung chat.
  - Hoặc ra lệnh trực tiếp: `"Dùng gemjava-react-dev-assistant để tạo API..."`, `"Nhờ trợ lý gemjava rà soát code..."`.
- Trợ lý cũng tự động kích hoạt khi bạn yêu cầu các tác vụ liên quan đến Backend Java và Frontend React trong workspace.

---

## 5. Tùy Biến Thêm (Custom Instructions từ Gem của bạn)
*(Nếu bạn có các chỉ dẫn hoặc system prompt đặc thù đã cấu hình trên Gemini Web Gem, bạn có thể dán bổ sung vào đây).*
