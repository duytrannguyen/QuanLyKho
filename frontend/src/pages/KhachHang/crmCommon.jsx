import React from 'react';
import {
  Monitor, Headphones, Wrench, Calendar, CheckCheck,
  RotateCcw, AlertCircle, Clock, XCircle, Crown, Star, UserCheck
} from 'lucide-react';
import { formatDate } from '../../utils/dinh_dang';

export const CATEGORY_META = {
  MACHINE: { label: 'Máy móc', icon: Monitor, className: 'bg-primary text-white' },
  ACCESSORY: { label: 'Phụ kiện', icon: Headphones, className: 'bg-info text-dark' },
  REPAIR: { label: 'Sửa chữa', icon: Wrench, className: 'bg-warning text-dark' },
};

export const CATEGORY_FILTERS = [
  { value: '', label: 'Tất cả hóa đơn' },
  { value: 'MACHINE', label: 'Máy móc' },
  { value: 'ACCESSORY', label: 'Phụ kiện' },
  { value: 'REPAIR', label: 'Dịch vụ sửa chữa' },
];

export const isCancelledOrReturned = (status) => {
  const s = (status || '').toLowerCase();
  return s.includes('hủy') || s.includes('huỷ') || s.includes('trả') || s.includes('cancel');
};

export const OrderStatusBadge = ({ status }) => {
  if (!status) return <span className="text-secondary">—</span>;
  const cancelled = isCancelledOrReturned(status);
  return (
    <span
      className={`badge rounded-pill ${cancelled ? 'bg-danger bg-opacity-10 text-danger border border-danger-subtle' : 'bg-secondary bg-opacity-10 text-dark border border-secondary-subtle'} fw-medium px-2 py-1`}
      title="Trạng thái xử lý hóa đơn / giao dịch"
    >
      {status}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  const meta = CATEGORY_META[category] || CATEGORY_META.MACHINE;
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.className} rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1`}>
      <Icon size={12} /> {meta.label}
    </span>
  );
};

/**
 * Badge hiển thị tiến trình chăm sóc cho từng đơn hàng:
 * - Đơn máy: chu kỳ vệ sinh định kỳ lặp lại (mặc định 6 tháng).
 * - Đơn khác: thăm hỏi 1 lần sau mua (7-14 ngày), hoàn tất không lặp lại.
 */
export const OrderCareStatusBadge = ({ order }) => {
  if (!order) return null;

  // Máy đã bán lại cho shop hoặc thu lại -> Bảo hành vô hiệu & chấm dứt nhắc CSKH
  if (order.isWarrantyVoided || order.careStatus === 'DA_BAN_LAI' || order.careStatus === 'VOIDED') {
    return (
      <div className="d-flex flex-column align-items-center gap-1">
        <span className="badge bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25 rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
          <XCircle size={12} className="text-secondary" />
          <span>Đã bán lại cho shop</span>
        </span>
        <span className="small text-muted" style={{ fontSize: '0.70rem' }}>
          Bảo hành vô hiệu • Không nhắc CSKH
        </span>
      </div>
    );
  }

  const isMachine = (order.orderCategory || 'MACHINE').toUpperCase() === 'MACHINE';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isMachine) {
    // Đơn máy móc: Vệ sinh định kỳ
    if (order.careStatus === 'DA_VE_SINH') {
      let diffDays = null;
      if (order.nextCareDate) {
        const next = new Date(order.nextCareDate);
        next.setHours(0, 0, 0, 0);
        diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      }
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <CheckCheck size={12} />
            <span>Đã vệ sinh máy</span>
          </span>
          {order.nextCareDate && (
            <span className={`small fw-medium ${diffDays <= 0 ? 'text-danger fw-bold' : 'text-secondary'}`} style={{ fontSize: '0.72rem' }}>
              {diffDays <= 0 ? `⚠️ Đến hạn (Quá ${Math.abs(diffDays)} ngày)` : `Kỳ tới: ${formatDate(order.nextCareDate)} (${diffDays} ngày nữa)`}
            </span>
          )}
        </div>
      );
    }

    if (order.careStatus === 'DANG_HEN') {
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <Calendar size={12} className="text-warning" />
            <span>Đang hẹn vệ sinh</span>
          </span>
          {order.nextCareDate && (
            <span className="small text-secondary fw-medium" style={{ fontSize: '0.72rem' }}>
              Hẹn: {formatDate(order.nextCareDate)}
            </span>
          )}
        </div>
      );
    }

    // Chưa vệ sinh lần nào: tính từ saleDate
    if (order.saleDate) {
      const sale = new Date(order.saleDate);
      sale.setHours(0, 0, 0, 0);
      const isOffice = (order.segment || '').toLowerCase().includes('văn phòng') || (order.segment || '').toLowerCase().includes('van phong');
      const monthsThreshold = isOffice ? 12 : 6;
      
      const due = new Date(sale);
      due.setMonth(due.getMonth() + monthsThreshold);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
              <AlertCircle size={12} />
              <span>Đến hạn vệ sinh máy</span>
            </span>
            <span className="small text-danger fw-medium" style={{ fontSize: '0.72rem' }}>
              Chu kỳ {monthsThreshold} tháng (Quá {Math.abs(diffDays)} ngày)
            </span>
          </div>
        );
      } else {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1">
              <RotateCcw size={12} />
              <span>Chưa đến kỳ vệ sinh</span>
            </span>
            <span className="small text-secondary" style={{ fontSize: '0.72rem' }}>
              Còn {diffDays} ngày ({monthsThreshold} tháng)
            </span>
          </div>
        );
      }
    }

    return (
      <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
        Chưa vệ sinh
      </span>
    );
  } else {
    // Đơn phụ kiện hoặc sửa chữa: chăm sóc 1 lần (7-14 ngày)
    if (order.careStatus === 'HOAN_TAT_1_LAN') {
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <CheckCheck size={12} />
            <span>Đã chăm sóc (1 lần)</span>
          </span>
          <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
            Hoàn tất sau mua
          </span>
        </div>
      );
    }

    if (order.careStatus === 'DANG_HEN') {
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <Calendar size={12} className="text-warning" />
            <span>Hẹn liên hệ lại</span>
          </span>
          {order.nextCareDate && (
            <span className="small text-secondary" style={{ fontSize: '0.72rem' }}>
              {formatDate(order.nextCareDate)}
            </span>
          )}
        </div>
      );
    }

    // Chưa chăm sóc: kiểm tra ngày mua có trong khoảng 7-14 ngày không
    if (order.saleDate) {
      const sale = new Date(order.saleDate);
      sale.setHours(0, 0, 0, 0);
      const passedDays = Math.floor((today - sale) / (1000 * 60 * 60 * 24));

      if (passedDays >= 7 && passedDays <= 14) {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-info bg-opacity-10 text-info-emphasis border border-info-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
              <Clock size={12} />
              <span>Cần thăm hỏi sau mua</span>
            </span>
            <span className="small text-info-emphasis fw-medium" style={{ fontSize: '0.72rem' }}>
              Đã mua {passedDays} ngày (Mốc 7-14 ngày)
            </span>
          </div>
        );
      } else if (passedDays < 7) {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
              Mới mua ({passedDays} ngày)
            </span>
            <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
              Nhắc sau 7 ngày
            </span>
          </div>
        );
      } else {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
              Chưa chăm sóc
            </span>
            <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
              (1 lần duy nhất)
            </span>
          </div>
        );
      }
    }

    return (
      <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
        Chưa chăm sóc
      </span>
    );
  }
};

/**
 * Phân hạng khách hàng dựa trên chi tiêu và số lượng đơn
 */
export const getCustomerTier = (totalSpent = 0, totalOrders = 0) => {
  const spent = Number(totalSpent) || 0;
  const orders = Number(totalOrders) || 0;
  if (spent >= 25000000 || orders >= 4) {
    return { name: 'VIP Kim Cương', icon: Crown, className: 'bg-warning text-dark border border-warning shadow-xs', textClass: 'text-warning-emphasis' };
  }
  if (spent >= 10000000 || orders >= 2) {
    return { name: 'Thân Thiết', icon: Star, className: 'bg-info bg-opacity-10 text-info border border-info shadow-xs', textClass: 'text-info' };
  }
  return { name: 'Khách Tiềm Năng', icon: UserCheck, className: 'bg-light text-secondary border', textClass: 'text-secondary' };
};

