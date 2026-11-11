import React from 'react';
import { ShoppingBag, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { dinhDangTien, formatDate } from '../../../utils/dinh_dang';

export default function ThongKeKhachHangWidget({
  currentCustomer,
  totalElements,
  isAllRepurchased,
  latestMachine,
  getWarrantyCountdown
}) {
  const countdown = latestMachine?.warrantyExpiry ? getWarrantyCountdown(latestMachine.warrantyExpiry) : null;

  return (
    <div className="row g-2.5">
      <div className="col-12 col-sm-4">
        <div className="card border shadow-xs rounded-4 bg-white p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Tổng hóa đơn</div>
              <div className="fs-4 fw-bolder text-primary mt-0.5 font-monospace">
                {currentCustomer?.totalOrders ?? totalElements}
              </div>
              <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Giao dịch hoàn tất</div>
            </div>
            <div className="bg-primary bg-opacity-10 text-primary p-2.5 rounded-3">
              <ShoppingBag size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-sm-4">
        <div className="card border shadow-xs rounded-4 bg-white p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Tổng chi tiêu tích lũy</div>
              <div className="fs-5 fw-bolder text-success mt-0.5 font-monospace">
                {dinhDangTien(currentCustomer?.totalSpent || 0)} đ
              </div>
              <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Doanh thu thực thu</div>
            </div>
            <div className="bg-success bg-opacity-10 text-success p-2.5 rounded-3">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-sm-4">
        <div className="card border shadow-xs rounded-4 bg-white p-3 h-100">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Bảo hành gần nhất</div>
              <div className="fs-6 fw-bold text-dark mt-0.5 text-truncate" style={{ maxWidth: '140px' }} title={isAllRepurchased ? 'Đã thu hồi máy' : (latestMachine?.productName || 'Không có')}>
                {isAllRepurchased ? 'Đã thu hồi máy' : (latestMachine?.warrantyExpiry ? formatDate(latestMachine.warrantyExpiry) : '—')}
              </div>
              <div className="small" style={{ fontSize: '0.72rem' }}>
                {isAllRepurchased ? (
                  <span className="text-secondary fw-medium">Đã bán lại cho shop</span>
                ) : latestMachine?.warrantyExpiry ? (
                  countdown?.active ? (
                    <span className="text-success fw-medium">Đang trong thời hạn BH</span>
                  ) : (
                    <span className="text-danger fw-semibold">Đã hết bảo hành</span>
                  )
                ) : <span className="text-muted">Chưa có thông tin</span>}
              </div>
            </div>
            <div className={`${isAllRepurchased ? 'bg-secondary bg-opacity-10 text-secondary' : (latestMachine?.warrantyExpiry && !countdown?.active ? 'bg-danger bg-opacity-10 text-danger' : 'bg-info bg-opacity-10 text-info')} p-2.5 rounded-3`}>
              {isAllRepurchased ? <XCircle size={20} /> : (latestMachine?.warrantyExpiry && !countdown?.active ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

