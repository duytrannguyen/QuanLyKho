const fs = require('fs');

// 1. Recover from the backup that has spaces
let content = fs.readFileSync('e:/QKSHOP/QL_Kho/frontend/src/trang/NhapMayMoc/TrangNhapMayMoc.jsx.fixed.jsx', 'utf8');

// 2. Remove BOM if present
if (content.startsWith('\uFFFD')) content = content.substring(1);
if (content.charCodeAt(0) === 0xFEFF) content = content.substring(1);
if (content.startsWith('')) content = content.substring(1); // just in case

// 3. Apply the safe replacements (NO SPACE REPLACEMENT)
newContent = content;
newContent = newContent.replace(/Serial.*CẬP.*NHẬT\./g, 'Serial đã tồn tại! Tự động tải dữ liệu để CẬP NHẬT.');
newContent = newContent.replace(/l.*?i 404 hoặc l.*?i không tìm thấy là máy m.*i/g, 'lỗi 404 hoặc lỗi không tìm thấy là máy mới');
newContent = newContent.replace(/Serial chưa có trong kho. Tiến hành NHẬP MÁY M.*?I\./g, 'Serial chưa có trong kho. Tiến hành NHẬP MÁY MỚI.');
newContent = newContent.replace(/L.*?i h.*?! th.*? ng/g, 'Lỗi hệ thống');
newContent = newContent.replace(/dòng l.*?i không hợp l.*?!/g, 'dòng lỗi không hợp lệ');
newContent = newContent.replace(/Đã tự .*? .*?"ng loại bỏ/g, 'Đã tự động loại bỏ');
newContent = newContent.replace(/Ẩn hi.*?!n tab/g, 'Ẩn hiện tab');
newContent = newContent.replace(/c.*?"t H.*?! th.*? ng nhận di.*?!n/g, 'cột Hệ thống nhận diện');
newContent = newContent.replace(/Tạm ẩn\/hi.*?!n nút chuyển tab phía trên nếu bạn vẫn cần chức n.*?ng Bulk/g, 'Tạm ẩn/hiện nút chuyển tab phía trên nếu bạn vẫn cần chức năng Bulk');
newContent = newContent.replace(/Nhập m.*?"t máy/g, 'Nhập một máy');
newContent = newContent.replace(/TH.*? NG TIN MÁY & CẤU H.*?NH/g, 'THÔNG TIN MÁY & CẤU HÌNH');
newContent = newContent.replace(/Model .*? ầy .*? ủ của hãng/g, 'Model đầy đủ của hãng');
newContent = newContent.replace(/Tự .*? ề xuất theo dòng máy/g, 'Tự đề xuất theo dòng máy');
newContent = newContent.replace(/Nghi.*?!p vụ nhập/g, 'Nghiệp vụ nhập');
newContent = newContent.replace(/KHÁCH Đ.*? I\/TRẢ/g, 'KHÁCH ĐỔI/TRẢ');
newContent = newContent.replace(/T.*? N ĐẦU KỲ/g, 'TỒN ĐẦU KỲ');
newContent = newContent.replace(/Trạng thái ban .*? ầu/g, 'Trạng thái ban đầu');
newContent = newContent.replace(/CẦN KI.*? M TRA/g, 'CẦN KIỂM TRA');
newContent = newContent.replace(/\(4 c.*?"t\)/g, '(4 cột)');
newContent = newContent.replace(/\+ ' .*? .*?' :/g, '+ \' đ\' :');
newContent = newContent.replace(/T\.Thái ban .*? ầu:/g, 'T.Thái ban đầu:');
newContent = newContent.replace(/H.*?! th.*? ng nhận di.*?!n/g, 'Hệ thống nhận diện');
newContent = newContent.replace(/Nhập dữ li.*?!u theo máy thực tế/g, 'Nhập dữ liệu theo máy thực tế');
newContent = newContent.replace(/Kh.*?:p danh mục hoặc tạo biến thỒ mới/g, 'Khớp danh mục hoặc tạo biến thể mới');
newContent = newContent.replace(/HiỒn th.*?9 kết quả .*? Ồ xác nhận/g, 'Hiển thị kết quả để xác nhận');
newContent = newContent.replace(/Dòng máy .*? ã có sẽ tự kế thừa phân khúc\. Dòng hoàn toàn mới sẽ lưu lựa chọn phân khúc m.*?"t lần cho các máy sau\./g, 'Dòng máy đã có sẽ tự kế thừa phân khúc. Dòng hoàn toàn mới sẽ lưu lựa chọn phân khúc một lần cho các máy sau.');
newContent = newContent.replace(/Kh.*? i UI dùng tạm cho Nhập Lô nếu user bấm chuyển Tab/g, 'Khối UI dùng tạm cho Nhập Lô nếu user bấm chuyển Tab');

// Also remove any remaining \uFFFD characters globally as a fallback
newContent = newContent.replace(/\uFFFD/g, '');
newContent = newContent.replace(/Ồ/g, 'ể'); // the leftover Ồ is usually ể in this file

// Fix the syntax error from earlier (placeholder)
newContent = newContent.replace(/placeholder="Có thể b" sung sau"/g, 'placeholder="Có thể bổ sung sau"');
newContent = newContent.replace(/placeholder="M i serial m"t dòng"/g, 'placeholder="Mỗi serial một dòng"');

fs.writeFileSync('e:/QKSHOP/QL_Kho/frontend/src/trang/NhapMayMoc/TrangNhapMayMoc.jsx', newContent, 'utf8');
