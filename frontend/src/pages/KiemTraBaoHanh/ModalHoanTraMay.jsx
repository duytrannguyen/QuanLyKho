import React from 'react';
import { RotateCcw, BatteryCharging, ClipboardCheck } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';

export default function ModalHoanTraMay({
  order,
  returnReason,
  setReturnReason,
  returnState,
  setReturnState,
  restoreCharger,
  setRestoreCharger,
  restoreAccessories,
  setRestoreAccessories,
  restoreUpgradeParts,
  setRestoreUpgradeParts,
  returnSalePrice,
  setReturnSalePrice,
  isSubmitting = false,
  title = 'Xác Nhận Đổi Trả / Thu Hồi Máy Về Kho',
  alertText,
  reasonLabel = 'Lý do đổi trả / thu hồi',
  reasonPlaceholder = 'VD: Khách nâng đời máy khác, máy không phù hợp nhu cầu...',
  idPrefix = 'returnModal',
  onSubmit,
  onClose,
}) {
  if (!order) return null;

  const hasChargerName = Boolean(order.chargerName && String(order.chargerName).trim());
  const hasWarehouseCharger = Boolean(hasChargerName && order.chargerSku && String(order.chargerSku).trim());

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow">
          <div className="modal-header bg-danger bg-opacity-10 border-0 p-4">
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 bg-danger bg-opacity-25 text-danger rounded-3">
                <RotateCcw size={20} />
              </div>
              <h5 className="modal-title fw-bold text-danger m-0">{title}</h5>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isSubmitting}
            ></button>
          </div>

          <form onSubmit={onSubmit}>
            <div className="modal-body p-4">
              <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3">
                {alertText || (
                  <>
                    Thao tác này sẽ chuyển chu kỳ máy sang <strong>CUSTOMER_RETURN</strong>, hủy quyền bảo hành đơn cũ và tự động đưa máy trở lại kho hoạt động với <strong>giá gốc niêm yết</strong>.
                  </>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary text-uppercase mb-1">Máy &amp; Serial</label>
                <div className="p-2.5 bg-light rounded-3 border">
                  <div className="fw-bold text-dark">{order.sourceModelText || 'Không rõ dòng máy'}</div>
                  <div className="font-monospace small text-primary fw-bold mt-0.5">Serial: {order.serialKey}</div>
                  {hasChargerName && (
                    <div className="mt-2 pt-2 border-top d-flex flex-wrap align-items-center gap-2 small">
                      <span className="d-inline-flex align-items-center gap-1 text-secondary fw-semibold">
                        <BatteryCharging size={14} className="text-warning" />
                        Sạc kèm theo máy:
                      </span>
                      <span className="fw-semibold text-dark">{order.chargerName}</span>
                      {hasWarehouseCharger ? (
                        <span className="badge bg-warning bg-opacity-15 text-dark border border-warning border-opacity-50 font-monospace">
                          SKU: {order.chargerSku}
                        </span>
                      ) : (
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border">
                          Sạc ngoài kho — Không cộng tồn kho
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-secondary text-uppercase mb-0">
                    Giá máy gốc trả về kho (VNĐ) <span className="text-danger">*</span>
                  </label>
                  <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace" style={{ fontSize: '0.7rem' }}>
                    Tự động tách giá gốc
                  </span>
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control rounded-start-3 font-monospace fw-bold text-primary"
                    value={formatCurrency(returnSalePrice)}
                    onChange={(e) => setReturnSalePrice(parseCurrency(e.target.value))}
                    placeholder="Nhập giá máy gốc..."
                    required
                  />
                  <span className="input-group-text bg-light rounded-end-3 text-secondary fw-semibold">đ</span>
                </div>
                <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                  Giá bán niêm yết khi máy quay lại kho. Đã bóc tách riêng linh kiện nâng cấp, phụ kiện và chiết khấu của đơn cũ.
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary text-uppercase mb-1">
                  {reasonLabel} <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control rounded-3"
                  rows="2"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder={reasonPlaceholder}
                  required
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary text-uppercase mb-1">
                  Trạng thái nhập lại kho
                </label>
                <select
                  className="form-select rounded-3"
                  value={returnState}
                  onChange={(e) => setReturnState(e.target.value)}
                >
                  <option value="READY">Sẵn sàng bán lại ngay (READY)</option>
                  <option value="NEEDS_INSPECTION">Cần kiểm tra / KTV test lại máy (NEEDS_INSPECTION)</option>
                </select>
                {returnState === 'NEEDS_INSPECTION' && (
                  <div className="alert alert-info py-2 px-3 small rounded-3 mt-2 mb-0 d-flex align-items-start gap-2">
                    <ClipboardCheck size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Hệ thống sẽ tự động tạo phiếu <strong>Kiểm định hoàn trả (CUSTOMER_RETURN)</strong> đưa máy vào hàng chờ Kiểm Định để KTV test lại trước khi mở bán.
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-light rounded-3 border mb-2">
                {hasWarehouseCharger && (
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`${idPrefix}ChargerCheck`}
                      checked={restoreCharger}
                      onChange={(e) => setRestoreCharger(e.target.checked)}
                    />
                    <label className="form-check-label small fw-semibold text-dark d-block" htmlFor={`${idPrefix}ChargerCheck`}>
                      Hoàn kho sạc kèm theo máy ({order.chargerName})
                    </label>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      Cộng lại +1 tồn kho phụ kiện. Bỏ chọn nếu khách làm mất sạc hoặc giữ lại sạc cũ.
                    </div>
                  </div>
                )}

                {hasChargerName && !hasWarehouseCharger && (
                  <div className="small text-secondary mb-2 pb-2 border-bottom">
                    <BatteryCharging size={14} className="me-1 text-secondary" />
                    Sạc kèm theo máy (<strong>{order.chargerName}</strong>) là sạc ngoài kho nên không cộng tồn kho.
                  </div>
                )}

                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`${idPrefix}AccCheck`}
                    checked={restoreAccessories}
                    onChange={(e) => setRestoreAccessories(e.target.checked)}
                  />
                  <label className="form-check-label small fw-semibold text-dark d-block" htmlFor={`${idPrefix}AccCheck`}>
                    Hoàn kho các phụ kiện / quà tặng kèm theo đơn
                  </label>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Nếu bỏ chọn và có phụ kiện mua thêm tính tiền, hóa đơn phụ kiện sẽ được giữ nguyên doanh thu.
                  </div>
                </div>

                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`${idPrefix}PartsCheck`}
                    checked={restoreUpgradeParts}
                    onChange={(e) => setRestoreUpgradeParts(e.target.checked)}
                  />
                  <label className="form-check-label small fw-semibold text-dark" htmlFor={`${idPrefix}PartsCheck`}>
                    Hoàn kho các linh kiện đã nâng cấp (RAM/SSD)
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 p-4 pt-0">
              <button
                type="button"
                className="btn btn-light rounded-pill px-4 fw-medium"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-danger rounded-pill px-4 fw-medium d-inline-flex align-items-center gap-2 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>Xác nhận hoàn kho</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
