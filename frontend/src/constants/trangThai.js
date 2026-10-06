export const CYCLE_STATE_MAP = {
  NEEDS_INSPECTION: 'Cần kiểm tra',
  READY: 'Sẵn sàng bán',
  CLOSED: 'Đã đóng',
};

export const INSPECTION_STATUS_MAP = {
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang xử lý',
  RECHECK_REQUESTED: 'Yêu cầu kiểm tra lại',
  PASSED: 'Đạt',
  REJECTED_RETURNED: 'Hủy/Trả',
};

export const INTAKE_TYPE_MAP = {
  PURCHASE: 'Mua nhập hàng',
  CUSTOMER_BUYBACK: 'Khách bán lại',
  CUSTOMER_RETURN: 'Khách đổi/trả',
  OPENING_BALANCE: 'Tồn đầu kỳ',
  SALE_CANCELLATION: 'Hủy đơn bán'
};

export const CLOSE_TYPE_MAP = {
  SALE: 'Đã bán',
  RETURN: 'Đã trả khách',
  CANCEL: 'Đã hủy',
  TRANSFER: 'Chuyển kho',
};

// Helper để format với fallback
export const formatCycleState = (state) => CYCLE_STATE_MAP[state] || state;
export const formatInspectionStatus = (status) => INSPECTION_STATUS_MAP[status] || status;
export const formatIntakeType = (type) => INTAKE_TYPE_MAP[type] || type;
export const formatCloseType = (type) => CLOSE_TYPE_MAP[type] || type;
