import React from 'react';
import { Wrench, Edit3, Lock } from 'lucide-react';
import { formatCurrency, formatDate, getItemExpiryStatus } from '../../utils/dinh_dang';

/**
 * Modal Chi Tiết Phiếu Dịch Vụ Sửa Chữa
 */
export default function ModalChiTietSuaChua({ order, canEditOrder, onEdit, onClose }) {
  if (!order) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow border-0 rounded-4">
          <div className="modal-header bg-primary text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <Wrench size={20} />
              Chi Tiết Phiếu Dịch Vụ Sửa Chữa #{order.orderCode}
            </h5>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-light text-primary fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
                onClick={() => onEdit(order)}
                title={canEditOrder ? 'Sửa phiếu dịch vụ' : 'Yêu cầu quyền: Sửa thông tin đơn bán'}
              >
                <Edit3 size={14} />
                <span>Sửa phiếu</span>
                {!canEditOrder && <Lock size={12} className="text-warning" />}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              />
            </div>
          </div>

          <div className="modal-body p-4">
            {/* Thông tin chung của phiếu */}
            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="row g-2">
                <div className="col-sm-6">
                  <strong>Mã hóa đơn:</strong>{' '}
                  <span className="badge bg-warning bg-opacity-20 text-warning-emphasis fw-bold ms-1">{order.orderCode}</span>
                </div>
                <div className="col-sm-6"><strong>Ngày thực hiện:</strong> {formatDate(order.createdDate)}</div>
                <div className="col-sm-6"><strong>Khách hàng:</strong> <span className="fw-semibold text-dark">{order.customerName}</span></div>
                <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{order.customerPhone}</span></div>
                <div className="col-sm-6"><strong>Thiết bị sửa chữa:</strong> <span className="text-primary fw-bold">{order.deviceModel}</span></div>
                <div className="col-sm-6"><strong>Kỹ thuật viên:</strong> {order.technicianName || '—'}</div>
                {order.note && (
                  <div className="col-12 mt-1"><strong>Ghi chú đơn:</strong> <span className="text-muted">{order.note}</span></div>
                )}
                <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                  <strong className="fs-6">Tổng tiền thanh toán:</strong>
                  <span className="text-danger fw-bold fs-5">{formatCurrency(order.totalAmount)} đ</span>
                </div>
              </div>
            </div>

            {/* Danh sách các dịch vụ & linh kiện */}
            <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
            <div className="table-responsive border rounded">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                    <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                    <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                    <th className="py-2 text-center" style={{ width: '110px' }}>Bảo hành</th>
                    <th className="py-2 text-center" style={{ width: '120px' }}>Hạn BH</th>
                    <th className="pe-3 py-2 text-end" style={{ width: '140px' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((it, idx) => {
                    const itExp = getItemExpiryStatus(it.warrantyExpiry);
                    const ItExpIcon = itExp.icon;

                    return (
                      <tr key={idx}>
                        <td className="ps-3 py-2">
                          <strong>{it.serviceName}</strong>
                          {it.note && <div className="small text-muted">Ghi chú: {it.note}</div>}
                        </td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                        <td className="text-center">
                          {it.warrantyPeriod ? (
                            <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                          ) : it.warrantyMonths > 0 ? (
                            <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                          ) : (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary">Không BH</span>
                          )}
                        </td>
                        <td className="text-center fw-bold text-dark">{it.warrantyExpiry || '—'}</td>
                        <td className="pe-3 text-end">
                          <span className={`badge rounded-pill px-2 py-1 small ${itExp.badge}`}>
                            <ItExpIcon size={12} className="me-1 mb-1 d-inline" />
                            {itExp.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-footer bg-light d-flex justify-content-end">
            <button type="button" className="btn btn-secondary px-4" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

