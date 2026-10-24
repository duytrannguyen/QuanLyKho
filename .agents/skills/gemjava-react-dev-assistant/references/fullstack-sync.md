# Quy Trình Tích Hợp & Đồng Bộ Dữ Liệu Full-stack

Tài liệu hướng dẫn quy trình phối hợp giữa Backend Spring Boot và Frontend React trong dự án QKShop.

## 1. Luồng xử lý nghiệp vụ kho (Inventory Cycle Flow)
- Nhập máy (`intake`): Kiểm tra serial registry, tạo ActiveInventory, ghi event log.
- Xuất kho / Bán hàng (`sale`): Kiểm tra máy hợp lệ trong chu kỳ, tạo ClosedCycle, cập nhật trạng thái kho.
- Đối soát dữ liệu (`sync` / `reconciliation`): Đồng bộ từ file Excel / Google Sheets vào hệ thống kho, đối chiếu số lượng và serial chênh lệch.

## 2. Kiểm thử và Xác thực (Verification)
- Backend:
  ```powershell
  cd backend
  mvn test
  ```
- Frontend:
  ```powershell
  cd frontend
  npm run build
  ```
