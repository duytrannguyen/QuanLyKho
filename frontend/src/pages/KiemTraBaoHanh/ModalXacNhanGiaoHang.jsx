import React from 'react';
import { Truck, Calendar, Info, CheckCircle2 } from 'lucide-react';

/**
 * Modal Xác Nhận Khách Đã Nhận Hàng & Kích Hoạt Bảo Hành (Đơn ship xa)
 * Dùng chung cho TrangKiemTraBaoHanh và TrangDonShip
 */
export default function ModalXacNhanGiaoHang({
  order,
  confirmDeliveryDate,
  setConfirmDeliveryDate,
  isConfirmingDelivery,
  onSubmit,
  onClose
}) {
  if (!order) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow border-0 rounded-4">
          <div className="modal-header bg-success text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <Truck size={20} />
              Xác Nhận Khách Đã Nhận Hàng
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={isConfirmingDelivery}
            />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body p-4">
              <div className="p-3 bg-light rounded-3 border mb-3">
                <div className="fw-bold text-dark mb-1">
                  {order.sourceModelText || 'Máy tính'}
                </div>
                <div className="small text-muted font-monospace mb-1">
                  Serial: <strong className="text-primary">{order.serialKey}</strong>
                </div>
                <div className="small text-muted">
                  Khách hàng: <strong className="text-dark">{order.customerName || 'Khách lẻ'}</strong> - {order.customerPhone || '—'}
                </div>
                <div className="small text-muted mt-1">
                  Gói bảo hành: <span className="badge bg-primary ms-1">{order.warrantyPeriod || 'Theo máy'}</span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                  <Calendar size={15} className="text-success" />
                  Ngày khách nhận hàng thực tế <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control border-success fw-medium"
                  value={confirmDeliveryDate}
                  onChange={(e) => setConfirmDeliveryDate(e.target.value)}
                  required
                />
                <div className="form-text small text-muted">
                  Thời gian bảo hành của máy sẽ bắt đầu được tính từ mốc ngày này.
                </div>
              </div>

              <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-0 rounded-3">
                <Info size={16} className="text-info flex-shrink-0" />
                <span>Sau khi xác nhận, đơn sẽ hoàn tất và kích hoạt hạn bảo hành tương ứng với gói của máy.</span>
              </div>
            </div>

            <div className="modal-footer bg-light d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary px-4 rounded-pill"
                onClick={onClose}
                disabled={isConfirmingDelivery}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-success px-4 rounded-pill fw-bold d-flex align-items-center gap-2 text-white"
                disabled={isConfirmingDelivery}
              >
                {isConfirmingDelivery ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Xác nhận & Kích hoạt BH</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

