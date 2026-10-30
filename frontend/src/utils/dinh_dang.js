export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  // Nếu là kiểu number (bao gồm float/double có phần thập phân như AOV)
  if (typeof value === 'number') {
    if (isNaN(value)) return '';
    return Math.round(value).toLocaleString('vi-VN');
  }
  const str = value.toString().trim();
  if (!str) return '';
  // Nếu là chuỗi số thực dạng "11445907.82"
  if (!isNaN(str) && str.includes('.')) {
    return Math.round(parseFloat(str)).toLocaleString('vi-VN');
  }
  // Nếu là chuỗi số nhập liệu từ form người dùng
  const cleaned = str.replace(/\D/g, '');
  if (!cleaned) return '';
  return parseInt(cleaned, 10).toLocaleString('vi-VN');
};

export const dinhDangTien = formatCurrency;

export const parseCurrency = (formattedValue) => {
  if (formattedValue === null || formattedValue === undefined || formattedValue === '') return '';
  return formattedValue.toString().replace(/\D/g, '');
};

export const EVENT_TYPE_MAP = {
  'INTAKE_CREATED': 'Nhập máy',
  'INTAKE_BATCH_CREATED': 'Nhập lô máy',
  'INSPECTION_CREATED': 'Tạo yêu cầu kiểm tra',
  'INSPECTION_PROGRESS_SAVED': 'Lưu tiến độ kiểm tra',
  'INSPECTION_PASSED': 'Duyệt đạt kiểm tra',
  'INSPECTION_REJECTED': 'Hủy/Trả kiểm tra',
  'SENT_BACK_TO_INSPECTION': 'Đưa về kiểm tra lại',
  'SALE_COMPLETED': 'Giao dịch bán',
  'SALE_SYNC_MATCHED': 'Đồng bộ bán hàng',
  'SALE_SYNC_RETURN': 'Đồng bộ đổi/trả',
  'SALE_SYNC_CANCEL': 'Đồng bộ hủy đơn',
  'CYCLE_CLOSED_SOLD': 'Đã bán',
  'CYCLE_CLOSED_RETURNED': 'Trả lại khách/NCC',
  'CYCLE_CLOSED_GIFT': 'Xuất tặng',
  'CYCLE_CLOSED_SUPPLIER_RETURN': 'Trả nhà cung cấp',
  'CYCLE_CLOSED_INTERNAL': 'Dùng nội bộ',
  'CYCLE_CLOSED_OTHER': 'Xuất khác',
  'CONFIG_UPDATED': 'Cập nhật cấu hình',
  'PRICE_UPDATED': 'Cập nhật giá',
  'NOTE_UPDATED': 'Cập nhật ghi chú',
  'MIGRATION': 'Migration dữ liệu',
  'CORRECTION': 'Sửa lỗi dữ liệu',
  'SYSTEM': 'Thao tác hệ thống',
};

export const formatEventType = (eventType) => {
  if (!eventType) return '-';
  return EVENT_TYPE_MAP[eventType] || eventType;
};

export const getCleanWarrantyType = (warrantyPeriod) => {
  if (!warrantyPeriod) return 'Không có';
  return warrantyPeriod
    .replace(/\s*[\/\-]\s*ngày\s*hết\s*(bảo\s*hành|hạn).*$/i, '')
    .replace(/\s*[\/\-]\s*hết\s*(bảo\s*hành|hạn).*$/i, '')
    .replace(/\s*\(\s*ngày\s*hết\s*(bảo\s*hành|hạn).*?\)/i, '')
    .replace(/\s*[\/\-]\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s*$/i, '')
    .trim() || warrantyPeriod;
};

/**
 * Tính toán ngày hết hạn bảo hành theo định dạng YYYY-MM-DD
 * @param {string|Date} baseDate - Ngày bắt đầu/ngày bán (VD: "2026-10-27" hoặc "2026-10-27T15:56:00")
 * @param {string} warrantyText - Chuỗi gói bảo hành (VD: "1 Ngày", "15 ngày", "6 tháng", "1 năm", ...)
 * @returns {string} Chuỗi ngày YYYY-MM-DD hoặc rỗng nếu không xác định
 */
export const tinhNgayHetHanBaoHanh = (baseDate, warrantyText) => {
  if (!warrantyText) return '';
  const cleanText = warrantyText.trim().toLowerCase();
  if (cleanText === 'không bh' || cleanText === 'không bảo hành' || cleanText === '0' || cleanText === '0 tháng' || cleanText === '0 ngày') {
    return '';
  }

  // Ngày bắt đầu
  let d = baseDate ? new Date(baseDate) : new Date();
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  // Kiểm tra nếu người dùng nhập trực tiếp một ngày (DD/MM/YYYY)
  const dmyMatch = warrantyText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const target = new Date(year, month, day);
    return target.toISOString().slice(0, 10);
  }

  // Tách số lượng và đơn vị
  const numMatch = cleanText.match(/(\d+)/);
  if (!numMatch) return '';
  const num = parseInt(numMatch[1], 10);
  if (num <= 0) return '';

  const res = new Date(d.getTime());
  if (cleanText.includes('ngày') || cleanText.includes('ngay') || cleanText.includes('day')) {
    res.setDate(res.getDate() + num);
  } else if (cleanText.includes('năm') || cleanText.includes('nam') || cleanText.includes('year')) {
    res.setFullYear(res.getFullYear() + num);
  } else {
    // Mặc định hoặc có từ "tháng" / "t" / "month"
    res.setMonth(res.getMonth() + num);
  }

  const yyyy = res.getFullYear();
  const mm = String(res.getMonth() + 1).padStart(2, '0');
  const dd = String(res.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Định dạng ngày sang chuẩn Việt Nam DD/MM/YYYY (chỉ lưu/hiển thị ngày, không hiển thị giờ)
 * @param {string|Date} dateStr - Chuỗi ngày hoặc đối tượng Date
 * @returns {string} Chuỗi định dạng DD/MM/YYYY hoặc '—' nếu rỗng/lỗi
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Trường hợp chuỗi yyyy-MM-dd
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const [y, m, day] = dateStr.slice(0, 10).split('-');
        return `${day}/${m}/${y}`;
      }
      return String(dateStr);
    }
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Lấy ngày hôm nay theo chuẩn YYYY-MM-DD cho input type="date"
 * @returns {string} YYYY-MM-DD
 */
export const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

