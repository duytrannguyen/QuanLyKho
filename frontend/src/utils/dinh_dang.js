export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const strVal = value.toString().replace(/\D/g, '');
  if (!strVal) return '';
  return parseInt(strVal, 10).toLocaleString('vi-VN');
};

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
