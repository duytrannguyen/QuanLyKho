const fs = require('fs');

const file = 'e:/QKSHOP/QL_Kho/frontend/src/trang/NhapMayMoc/TrangNhapMayMoc.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  [/MUA\/NHP HA\?NG/g, 'MUA/NHẬP HÀNG'],
  [/THU LI CA KHA\?CH/g, 'THU LẠI CỦA KHÁCH'],
  [/KHA\?CH \?"I\/TR/g, 'KHÁCH ĐỔI/TRẢ'],
  [/T'N \?U K/g, 'TỒN ĐẦU KỲ'],
  [/S'N SA\?NG BA\?N/g, 'SẴN SÀNG BÁN'],
  [/CN KI,M TRA/g, 'CẦN KIỂM TRA'],
  [/KhA'ng cm cng/g, 'Không cảm ứng'],
  [/Cm cng/g, 'Cảm ứng'],
  [/T `\? xut theo dAng mAy/g, 'Tự đề xuất theo dòng máy'],
  [/Vn phAng/g, 'Văn phòng'],
  [/MAy trm/g, 'Máy trạm'],
  [/Nghip v nh-p/g, 'Nghiệp vụ nhập'],
  [/Trng thAi ban ` u/g, 'Trạng thái ban đầu'],
  [/Sn sAng bAn/g, 'Sẵn sàng bán'],
  [/C n kim tra/g, 'Cần kiểm tra'],
  [/mAy/g, 'máy'],
  [/GiA bAn/g, 'Giá bán'],
  [/GiA:/g, 'Giá:'],
  [/Cha cA3/g, 'Chưa có'],
  [/H y/g, 'Hủy'],
  [/XAc nh-n nh-p kho/g, 'Xác nhận nhập kho'],
  [/\?ang lu\.\.\./g, 'Đang lưu...'],
  [/PhAn loi tr>c/g, 'Phân loại trước'],
  [/\?ang phAn loi\.\.\./g, 'Đang phân loại...'],
  [/Cp nht/g, 'Cập nhật'],
  [/LAm li/g, 'Làm lại'],
  [/H th`ng s phAn loi tr>c; cha ghi d_ liu Y b>c nAy\./g, 'Hệ thống sẽ phân loại trước; chưa ghi dữ liệu ở bước này.'],
  [/Nu cA3/g, 'Nếu có'],
  [/Ghi chA/g, 'Ghi chú'],
  [/CA3 th b  sung sau/g, 'Có thể bổ sung sau'],
  [/TA1y ch\?n, vA- d:/g, 'Tùy chọn, ví dụ:'],
  [/KA-ch th>c mAn hAnh/g, 'Kích thước màn hình'],
  [/VA- d:/g, 'Ví dụ:'],
  [/Cu hAnh/g, 'Cấu hình'],
  [/HAng/g, 'Hàng'],
  [/cTt/g, 'cột'],
  [/PhAn khAc/g, 'Phân khúc'],
  [/DAng mAy/g, 'Dòng máy'],
  [/Model ` y ` ca hAng/g, 'Model đầy đủ của hãng'],
  [/Hng/g, 'Hãng'],
  [/ThA'ng tin mAy/g, 'Thông tin máy'],
  [/Nh-p mAy m>i l/g, 'Nhập máy mới lẻ'],
  [/Nh-p nhi\?u mAy/g, 'Nhập nhiều máy'],
  [/Ti file Excel/g, 'Tải file Excel'],
  [/Hoc nh-p tay danh sAch serial/g, 'Hoặc nhập tay danh sách serial'],
  [/M-i serial mTt dAng/g, 'Mỗi serial một dòng'],
  [/XA3a/g, 'Xóa'],
  [/\?ang x lA\.\.\./g, 'Đang xử lý...'],
  [/H th`ng nh-n din/g, 'Hệ thống nhận diện'],
  [/Nh-p d_ liu theo mAy thc t/g, 'Nhập dữ liệu theo máy thực tế'],
  [/KhA'ng c n bit mA dAng mAy hoc mA bin th\./g, 'Không cần biết mã dòng máy hoặc mã biến thể.'],
  [/Chucn hA3a model vA cu hAnh/g, 'Chuẩn hóa model và cấu hình'],
  [/Kh>p danh mc hoc to bin th m>i/g, 'Khớp danh mục hoặc tạo biến thể mới'],
  [/Hin th< kt qu ` xAc nh-n/g, 'Hiển thị kết quả để xác nhận'],
  [/DAng mAy `A cA3 s t k tha phAn khAc\. DAng hoAn toAn m>i s lu la ch\?n phAn khAc mTt l n cho cAc mAy sau\./g, 'Dòng máy đã có sẽ tự kế thừa phân khúc. Dòng hoàn toàn mới sẽ lưu lựa chọn phân khúc một lần cho các máy sau.'],
  [/Xem tr>c danh sAch/g, 'Xem trước danh sách'],
  [/Kh`i UI dA1ng tm cho Nh-p LA' nu user bm chuyn Tab/g, 'Khối UI dùng tạm cho Nhập Lô nếu user bấm chuyển Tab'],
  [/Footer Form Nh-p l/g, 'Footer Form Nhập lẻ']
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(file, content, 'utf8');
console.log("Replaced strings successfully!");
