import { formatCurrency, formatDate } from './dinh_dang';
import logoQK from '../assets/qkshop_logo.png';

const getLogoUrl = () => (
  logoQK.startsWith('data:') || logoQK.startsWith('http')
    ? logoQK
    : `${window.location.origin}${logoQK}`
);

/**
 * In Phiếu Tiếp Nhận Máy Sửa Chữa & Bảo Hành (RMA)
 * @param {Object} order - Thông tin phiếu sửa chữa
 */
export const printIntakeTicket = (order) => {
  if (!order) return;
  const win = window.open('', '_blank', 'width=850,height=800');
  if (!win) {
    alert('Vui lòng cho phép trình duyệt mở popup để in phiếu tiếp nhận');
    return;
  }

  const servicesText = (order.items || []).map((it, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>
        <strong>${it.serviceName || ''}</strong>
        ${it.note ? `<br/><small style="color:#64748b;">Ghi chú: ${it.note}</small>` : ''}
      </td>
      <td style="text-align:center;">${it.quantity || 1}</td>
      <td style="text-align:right;">${it.price ? formatCurrency(it.price) + ' đ' : 'Chờ báo giá'}</td>
    </tr>
  `).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Phiếu Tiếp Nhận Máy - ${order.orderCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    body { padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
    .logo { font-size: 22px; font-weight: 800; color: #2563eb; }
    .title { text-align: center; margin: 15px 0; }
    .title h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; }
    .title p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
    .row-info { display: flex; font-size: 13px; }
    .lbl { width: 140px; color: #64748b; font-weight: 500; }
    .val { flex: 1; font-weight: 600; color: #0f172a; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
    .table th { background: #f1f5f9; text-transform: uppercase; font-weight: 600; }
    .condition-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px; margin-top: 12px; }
    .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 15px; font-size: 11px; color: #475569; }
    .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
    .sign-col { width: 220px; }
    .sign-title { font-weight: 600; margin-bottom: 50px; font-size: 12px; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo"><img src="${getLogoUrl()}" alt="QKSHOP.VN" style="height: 32px; width: auto; object-fit: contain; display: block; margin-bottom: 4px;" /></div>
      <div style="font-size: 11px; color: #64748b;">Dịch vụ Tiếp nhận Sửa Chữa & Bảo Hành Laptop</div>
      <div style="font-size: 11px; color: #64748b;">Hotline: 0939.xxx.xxx | Website: qkshop.vn</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: 700; color: #2563eb;">Mã phiếu: ${order.orderCode}</div>
      <div style="font-size: 11px; color: #64748b;">Ngày nhận: ${formatDate(order.createdDate)}</div>
      ${order.promisedDate ? `<div style="font-size: 11px; color: #dc2626; font-weight: 600;">Hẹn trả máy: ${formatDate(order.promisedDate)}</div>` : ''}
    </div>
  </div>

  <div class="title">
    <h2>PHIẾU TIẾP NHẬN MÁY SỬA CHỮA / BẢO HÀNH</h2>
    <p>(Quý khách vui lòng giữ phiếu này để đối chiếu khi nhận lại máy)</p>
  </div>

  <div class="grid">
    <div class="row-info"><span class="lbl">Khách hàng:</span><span class="val">${order.customerName || '—'}</span></div>
    <div class="row-info"><span class="lbl">Số điện thoại:</span><span class="val font-monospace">${order.customerPhone || '—'}</span></div>
    <div class="row-info"><span class="lbl">Dòng máy:</span><span class="val">${order.deviceModel || '—'}</span></div>
    <div class="row-info"><span class="lbl">Số Serial:</span><span class="val font-monospace">${order.deviceSerial || '—'}</span></div>
    <div class="row-info"><span class="lbl">KTV tiếp nhận:</span><span class="val">${order.technicianName || 'QKShop'}</span></div>
    <div class="row-info"><span class="lbl">Trạng thái:</span><span class="val" style="color: #d97706;">${order.status === 'RECEIVED' ? 'Mới tiếp nhận máy' : (order.status || 'Chờ xử lý')}</span></div>
  </div>

  <div class="condition-box">
    <div style="font-weight: 700; color: #b45309; margin-bottom: 4px;">TÌNH TRẠNG TIẾP NHẬN & PHỤ KIỆN GỬI KÈM:</div>
    <div><strong>• Tình trạng máy lúc nhận:</strong> ${order.intakeCondition || order.note || 'Bình thường / Chưa ghi chú'}</div>
    <div><strong>• Phụ kiện gửi kèm:</strong> ${order.accessoriesReceived || 'Chỉ thân máy (Không có phụ kiện)'}</div>
  </div>

  <div style="margin-top: 14px;">
    <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 6px;">Hạng mục dịch vụ / Linh kiện yêu cầu kiểm tra:</div>
    <table class="table">
      <thead>
        <tr>
          <th style="width: 8%; text-align: center;">STT</th>
          <th>Dịch vụ / Linh kiện</th>
          <th style="width: 15%; text-align: center;">Số lượng</th>
          <th style="width: 25%; text-align: right;">Đơn giá dự kiến</th>
        </tr>
      </thead>
      <tbody>
        ${servicesText || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Kiểm tra tổng quát theo tình trạng máy</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="terms">
    <strong>LƯU Ý QUAN TRỌNG:</strong>
    <p>1. QKShop không chịu trách nhiệm về dữ liệu cá nhân trong máy. Quý khách vui lòng sao lưu trước khi bàn giao máy.</p>
    <p>2. Vui lòng kiểm tra lại tình trạng máy và phụ kiện được ghi trên phiếu trước khi rời cửa hàng.</p>
    <p>3. Khi đến nhận máy, quý khách vui lòng mang theo phiếu này hoặc số điện thoại đăng ký tiếp nhận.</p>
  </div>

  <div class="signatures">
    <div class="sign-col">
      <div class="sign-title">KHÁCH HÀNG BÀN GIAO MÁY<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
    </div>
    <div class="sign-col">
      <div class="sign-title">KỸ THUẬT VIÊN TIẾP NHẬN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
      <div style="font-weight: 600; font-size: 13px;">${order.technicianName || 'QKShop'}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
  win.document.close();
};

/**
 * In Hóa Đơn Thanh Toán & Phiếu Bảo Hành Dịch Vụ Sửa Chữa
 * @param {Object} order - Thông tin phiếu sửa chữa hoàn tất
 */
export const printPaymentInvoice = (order) => {
  if (!order) return;
  const win = window.open('', '_blank', 'width=850,height=800');
  if (!win) {
    alert('Vui lòng cho phép trình duyệt mở popup để in hóa đơn thanh toán');
    return;
  }

  const rowsHtml = (order.items || []).map((it, idx) => {
    const pText = it.warrantyPeriod || (it.warrantyMonths > 0 ? it.warrantyMonths + ' Tháng' : 'Không BH');
    const lower = pText.toLowerCase();
    let badgeStyle = lower.includes('từ chối') || lower.includes('tu choi')
      ? 'color: #dc2626; font-weight: 700;'
      : (lower.includes('theo bh') || lower.includes('theo bảo hành') ? 'color: #2563eb; font-weight: 700;' : '');

    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>
          <strong>${it.serviceName || ''}</strong>
          ${it.note ? `<br/><small style="color:#64748b;">Ghi chú: ${it.note}</small>` : ''}
        </td>
        <td style="text-align:center;">${it.quantity || 1}</td>
        <td style="text-align:right;">${formatCurrency(it.price)} đ</td>
        <td style="text-align:center; ${badgeStyle}">${pText}</td>
        <td style="text-align:center;">${it.warrantyExpiry || '---'}</td>
      </tr>
    `;
  }).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Hóa Đơn & Bảo Hành - ${order.orderCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    body { padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 16px; }
    .logo { font-size: 22px; font-weight: 800; color: #16a34a; }
    .title { text-align: center; margin: 15px 0; }
    .title h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
    .row-info { display: flex; font-size: 13px; }
    .lbl { width: 140px; color: #64748b; font-weight: 500; }
    .val { flex: 1; font-weight: 600; color: #0f172a; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
    .table th { background: #f1f5f9; text-transform: uppercase; font-weight: 600; }
    .total-box { margin-top: 14px; text-align: right; }
    .total-price { font-size: 18px; font-weight: 800; color: #16a34a; }
    .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 15px; font-size: 11px; color: #475569; }
    .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
    .sign-col { width: 220px; }
    .sign-title { font-weight: 600; margin-bottom: 50px; font-size: 12px; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo"><img src="${getLogoUrl()}" alt="QKSHOP.VN" style="height: 32px; width: auto; object-fit: contain; display: block; margin-bottom: 4px;" /></div>
      <div style="font-size: 11px; color: #64748b;">Hóa Đơn Dịch Vụ Sửa Chữa & Bảo Hành</div>
      <div style="font-size: 11px; color: #64748b;">Hotline: 0939.xxx.xxx | Website: qkshop.vn</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: 700; color: #16a34a;">Hóa đơn: ${order.orderCode}</div>
      <div style="font-size: 11px; color: #64748b;">Ngày thanh toán: ${formatDate(order.createdDate)}</div>
    </div>
  </div>

  <div class="title">
    <h2>PHIẾU THANH TOÁN & BẢO HÀNH DỊCH VỤ</h2>
  </div>

  <div class="grid">
    <div class="row-info"><span class="lbl">Khách hàng:</span><span class="val">${order.customerName || '—'}</span></div>
    <div class="row-info"><span class="lbl">Số điện thoại:</span><span class="val font-monospace">${order.customerPhone || '—'}</span></div>
    <div class="row-info"><span class="lbl">Dòng máy:</span><span class="val">${order.deviceModel || '—'}</span></div>
    <div class="row-info"><span class="lbl">Số Serial:</span><span class="val font-monospace">${order.deviceSerial || '—'}</span></div>
    <div class="row-info"><span class="lbl">KTV thực hiện:</span><span class="val">${order.technicianName || 'QKShop'}</span></div>
    <div class="row-info"><span class="lbl">Trạng thái:</span><span class="val" style="color: #16a34a;">Đã hoàn tất & Giao khách</span></div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width: 6%; text-align: center;">STT</th>
        <th>Dịch vụ / Linh kiện</th>
        <th style="width: 10%; text-align: center;">Số lượng</th>
        <th style="width: 20%; text-align: right;">Đơn giá</th>
        <th style="width: 18%; text-align: center;">Gói bảo hành</th>
        <th style="width: 18%; text-align: center;">Hạn bảo hành</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="total-box">
    <div style="font-size: 14px; color: #64748b;">Tổng tiền thanh toán: <span class="total-price">${formatCurrency(order.totalAmount)} đ</span></div>
  </div>

  <div class="terms">
    <strong>ĐIỀU KHOẢN BẢO HÀNH:</strong>
    <p>1. Các linh kiện thay thế được bảo hành theo thời hạn ghi trên phiếu, tem niêm phong phải còn nguyên vẹn.</p>
    <p>2. Không bảo hành các hư hỏng do rơi vỡ, vào nước, chập cháy nguồn điện, hoặc can thiệp phần cứng trái phép.</p>
  </div>

  <div class="signatures">
    <div class="sign-col">
      <div class="sign-title">KHÁCH HÀNG THANH TOÁN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
    </div>
    <div class="sign-col">
      <div class="sign-title">KỸ THUẬT VIÊN / THU NGÂN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
      <div style="font-weight: 600; font-size: 13px;">${order.technicianName || 'QKShop'}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
  win.document.close();
};

