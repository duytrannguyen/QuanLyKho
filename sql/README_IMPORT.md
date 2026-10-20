# Nạp dữ liệu QKShop từ Google Sheets vào QuanLyKho

Nguồn chụp ngày 20/10/2026, lúc 10:24:43 (GMT+7). Schema và mã nguồn tham chiếu từ commit `09bd758174950598be869a786b0821b53f223520` của `duytrannguyen/QuanLyKho`.

## Phạm vi dữ liệu

- 463 hồ sơ serial.
- 108 máy đang tồn: 107 READY và 1 NEEDS_INSPECTION.
- 375 vòng đã đóng, trong đó 355 vòng bán máy.
- 727 mã đơn duy nhất từ 185 đơn Web App và 676 đơn DataSale. Có 134 đơn xuất hiện ở cả hai nguồn, được gộp theo Transaction ID và đối chiếu serial.
- 1.107 sự kiện nhật ký, 455 yêu cầu đã xử lý, 33 yêu cầu kiểm tra.
- 27 bảng nguồn, 7.086 dòng được giữ nguyên theo vị trí ô trong các bảng `qk_migration_source_*`.

Tệp có tên khách hàng, số điện thoại, ghi chú và số liệu kinh doanh thật. Chỉ lưu trên repository Private hoặc kho nội bộ có quyền truy cập phù hợp.

## Trước khi nhập

1. Áp dụng file tương thích `compatibility/backend/src/main/java/com/qkshop/tonkho/core/enums/SegmentCode.java` lên cùng đường dẫn trong dự án, sau đó build backend. Giá trị mới `UNCLASSIFIED` giữ những dòng chưa có phân khúc; không gán mặc định thành Văn phòng hoặc Gaming.
2. Tạo một database MySQL mới, trống hoàn toàn, dùng charset `utf8mb4` và collation `utf8mb4_unicode_ci`.
3. Dừng riêng backend khi nạp để tránh ghi đồng thời. Không xóa database hoặc volume đang hoạt động. Nếu mục tiêu là thay thế hệ thống đang chạy, sao lưu database đó và kiểm thử bản nhập riêng trước khi đổi cấu hình kết nối.
4. Kiểm tra file `validation_report.json` và các vấn đề dữ liệu. Máy có trường cấu hình mâu thuẫn vẫn giữ giá trị nguồn và có cảnh báo trong `data_issues`.

## Nhập qua MySQL CLI

Theo Bước 6 của `README_DEPLOY.md`, có thể nạp file SQL bằng MySQL trong container `qkshop_db`. Ví dụ dưới đây dùng database riêng `qkshop_tonkho_import_20261020` để kiểm thử trước.

Nhập mật khẩu qua biến môi trường trên server. Không ghi mật khẩu thật vào repository hoặc lịch sử shell.

```bash
read -rsp 'MySQL password: ' MYSQL_PWD
echo
export MYSQL_PWD
docker exec -e MYSQL_PWD="$MYSQL_PWD" qkshop_db mysql -uroot -e 'CREATE DATABASE IF NOT EXISTS qkshop_tonkho_import_20261020 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
docker exec -i -e MYSQL_PWD="$MYSQL_PWD" qkshop_db mysql -uroot --default-character-set=utf8mb4 qkshop_tonkho_import_20261020 < sql/backup_qkshop_full_2026_10_20_PRIVATE.sql
docker exec -i -e MYSQL_PWD="$MYSQL_PWD" qkshop_db mysql -uroot --default-character-set=utf8mb4 qkshop_tonkho_import_20261020 < sql/02_verify.sql
unset MYSQL_PWD
```

Không thêm `--force`: cần dừng ngay nếu MySQL báo lỗi. Tài khoản nhập cần quyền tạo bảng và stored procedure trong database đích. Script kiểm tra các bảng dữ liệu đích đang trống, nạp bằng transaction và rollback khi gặp lỗi. Chạy lại vào database đã có dữ liệu sẽ bị từ chối, không tự xóa hoặc ghi đè.

File `backup_qkshop_full_2026_10_20_PRIVATE.sql` đã gồm schema và data. Hai file `00_schema.sql` và `01_data_private.sql` là lựa chọn nhập tách riêng; không nhập chúng lần nữa sau khi đã nhập file đầy đủ.

Sau khi hậu kiểm MySQL đạt, trỏ `DB_URL` của backend đã áp dụng patch sang database đã nhập và khởi động backend. Tài khoản ứng dụng được tạo theo cấu hình seeder của dự án; bộ dữ liệu này không sao chép tài khoản, mật khẩu hoặc secret key.

## Mapping và cách giữ chính xác dữ liệu

- `ACTIVE_INVENTORY` quyết định những vòng đang mở. `CLOSED_CYCLES` quyết định lịch sử đã đóng. Không dựng trạng thái từ việc cộng/trừ lại toàn bộ đơn cũ.
- Danh mục được chuyển sang Hãng → Dòng sản phẩm → Platform → Biến thể → Cấu hình. `qk_migration_catalog_map` giữ liên kết mã DM/BT gốc. Hai mã BT có khóa kỹ thuật trùng chính xác được lưu chung một biến thể đích và giữ alias nguồn.
- Cấu hình riêng tách theo biến thể + RAM + SSD. Giá bán không làm thay đổi nhóm cấu hình. Trường RAM/SSD thiếu dùng nhãn `CHƯA GHI NHẬN`, không tự lấy 8GB/256GB làm mặc định.
- Cấu hình lúc bán ưu tiên dữ liệu bán theo đúng Transaction ID + serial + vòng tồn. Những vòng cũ không đủ thông tin giữ trường thiếu và cảnh báo, không lấy RAM/SSD hiện tại của máy để ghi đè lịch sử.
- `closed_cycles` giữ các giao dịch đã khớp vòng tồn. `qk_migration_sales` giữ đầy đủ 727 đơn, bao gồm đơn trước V2, đơn hủy/trả, và các đơn chưa gắn được vòng tồn. Các đơn chỉ lưu trong bảng này chưa xuất hiện trong trang tra cứu bảo hành mặc định của frontend.
- Thông tin khách của vòng bán chỉ lấy từ giao dịch khớp Transaction ID và serial. Giữ số điện thoại và serial dạng văn bản, gồm cả số 0 đầu. Đã đối chiếu cột điện thoại hiển thị ở cả hai Sheet với dữ liệu đọc.
- Loại sự kiện Apps Script được map sang enum tương đương của Java. Loại gốc và khóa chống lặp gốc được giữ trong `event_log.notes`; khóa import riêng bảo đảm một sự kiện chỉ được ghi một lần.
- Một dòng EVENT_LOG bị lệch/thiếu thời điểm và hai dòng nhật ký thiếu Event ID chỉ giữ nguyên ở raw staging, có cảnh báo, không gán ngày hoặc Event ID nghiệp vụ giả.
- Sáu vòng đóng có loại cũ không tách rõ lý do được map thành OTHER và giữ lý do nguyên gốc. Không đổi chúng thành bán hàng.
- Chính sách bảo hành nguyên gốc giữ theo từng vòng trong `qk_migration_cycle_metadata.metadata_json`. Chuỗi bảo hành mà frontend hiện tại đọc được ghi vào `closed_cycles.warranty_period`.

## Hậu kiểm

Các truy vấn có tiền tố `VIOLATION` trong `02_verify.sql` phải trả về 0 dòng. Các mốc cần khớp: active 108; closed 375; registry 463; đơn chuẩn hóa 727. Mỗi Transaction ID bán khớp tối đa một vòng đóng; cùng một vòng không xuất hiện ở cả active và closed.

Kiểm thử tại máy đã thực thi chính các câu INSERT vào engine SQLite với khóa ngoại, enum và unique constraints tương đương, kiểm tra độ dài VARCHAR theo schema MySQL, đối chiếu số lượng và đọc lại toàn bộ 7.086 dòng nguồn. Máy chưa có MySQL server, Docker, Java/Maven nên chưa thể xác nhận chạy MySQL thực tế hoặc build Java. Phải hoàn tất hai bước đó trước khi vận hành.

## Tình trạng GitHub

Branch dự kiến: `codex/import-qkshop-data-20261020`.

Kết nối GitHub trả `403 Resource not accessible by integration` khi tạo branch. Chưa có branch hoặc dữ liệu mới nào được ghi lên GitHub. Cần cấp quyền Contents: Read and write cho kết nối GitHub trên repository này, đồng thời chuyển sang Private trước khi tải bộ dữ liệu có thông tin khách hàng.
