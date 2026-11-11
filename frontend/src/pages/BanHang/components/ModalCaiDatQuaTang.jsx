import React from 'react';
import { Gift, Search, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/dinh_dang';

export default function ModalCaiDatQuaTang({
  show,
  onClose,
  availableAccessories,
  tempGiftBundle,
  modalSearchTerm,
  setModalSearchTerm,
  isSavingGift,
  onAddTempGift,
  onUpdateTempGift,
  onRemoveTempGift,
  onSaveGiftBundle
}) {
  if (!show) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1060, backdropFilter: 'blur(2px)' }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          <div className="modal-header bg-primary text-white py-3 border-0">
            <h5 className="modal-title fw-bold d-flex align-items-center fs-6">
              <Gift className="me-2" size={18} /> Cài Đặt Bộ Quà Tặng Mặc Định
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4 bg-light" style={{ fontSize: '0.9rem' }}>
            <p className="text-muted small mb-3">
              Cấu hình các món quà tự động gắn kèm khi bán máy. Khi bớt quà, hệ thống sẽ lấy đơn giá quy đổi để trừ trực tiếp vào tiền máy.
            </p>

            <div className="mb-3">
              <label className="form-label fw-bold text-dark small">Thêm món vào bộ quà:</label>
              <div className="input-group shadow-none rounded-3 overflow-hidden border bg-white">
                <span className="input-group-text bg-transparent border-0 text-muted ps-2.5">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control border-0 shadow-none"
                  placeholder="Tìm phụ kiện theo tên hoặc SKU..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              {modalSearchTerm.trim() && (
                <div
                  className="border rounded-3 mt-1 bg-white shadow-sm overflow-hidden"
                  style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.85rem' }}
                >
                  {availableAccessories
                    .filter(
                      (a) =>
                        a.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                        a.sku.toLowerCase().includes(modalSearchTerm.toLowerCase())
                    )
                    .map((acc) => (
                      <div
                        key={acc.sku}
                        className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom hover-bg-light"
                      >
                        <div>
                          <div className="fw-semibold text-dark">{acc.name}</div>
                          <small className="text-muted" style={{ fontSize: '11px' }}>
                            SKU: {acc.sku} | Tồn: {acc.quantity}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-0.5 fw-medium"
                          style={{ fontSize: '11px' }}
                          onClick={() => onAddTempGift(acc)}
                        >
                          <Plus size={12} className="me-1" /> Thêm
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <h6 className="fw-bold text-dark mb-2 fs-6">
              Danh sách các món quà trong bộ ({tempGiftBundle.length}):
            </h6>
            {tempGiftBundle.length === 0 ? (
              <div className="alert alert-secondary text-center py-3 rounded-3 border-0 small m-0">
                Chưa có món quà nào trong bộ mặc định.
              </div>
            ) : (
              <div
                className="table-responsive bg-white rounded-3 shadow-sm border overflow-hidden"
                style={{ fontSize: '0.85rem' }}
              >
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>
                    <tr>
                      <th className="ps-3 py-2">Tên món quà</th>
                      <th style={{ width: '100px' }} className="text-center py-2">
                        Số lượng
                      </th>
                      <th style={{ width: '150px' }} className="text-end py-2">
                        Giá trị trừ máy
                      </th>
                      <th style={{ width: '50px' }} className="text-center pe-3 py-2">
                        Xóa
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempGiftBundle.map((item) => {
                      const fallbackAcc = availableAccessories?.find((a) => a.sku === item.sku);
                      const displayName = item.name || fallbackAcc?.name || item.sku;
                      const displayPrice =
                        item.price !== undefined && item.price !== null
                          ? item.price
                          : fallbackAcc?.price || 0;
                      return (
                      <tr key={item.sku}>
                        <td className="ps-3">
                          <div className="fw-bold text-dark">{displayName}</div>
                          <small className="text-muted font-monospace" style={{ fontSize: '10px' }}>
                            {item.sku}
                          </small>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-xs text-center fw-bold bg-light pos-input"
                            value={item.quantity}
                            onChange={(e) => onUpdateTempGift(item.sku, 'qty', e.target.value)}
                            style={{ fontSize: '11px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-xs text-end text-primary fw-bold pos-input"
                            value={formatCurrency(displayPrice)}
                            onChange={(e) => onUpdateTempGift(item.sku, 'price', e.target.value)}
                            placeholder="0"
                            style={{ fontSize: '11px' }}
                          />
                        </td>
                        <td className="text-center pe-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-light text-danger rounded-circle p-1"
                            onClick={() => onRemoveTempGift(item.sku)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer bg-white border-top py-2 px-3 d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-light rounded-pill px-3 fw-bold border"
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-pill fw-bold px-4 shadow-sm"
              onClick={onSaveGiftBundle}
              disabled={isSavingGift}
            >
              {isSavingGift ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span> Đang lưu...
                </>
              ) : (
                'Lưu cài đặt'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

