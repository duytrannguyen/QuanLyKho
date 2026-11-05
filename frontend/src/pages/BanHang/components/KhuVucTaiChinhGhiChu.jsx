import React from 'react';
import { DollarSign, CheckCircle, RotateCcw } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../../../utils/dinh_dang';

export default function KhuVucTaiChinhGhiChu({
  formData,
  handleFormChange,
  grandTotal,
  onSale,
  onReset,
  isReady,
  isLoading
}) {
  return (
    <div className="section-card bg-primary bg-opacity-10 border-primary border-opacity-25 mb-0">
      <div className="section-title text-primary d-flex justify-content-between align-items-center">
        <span>
          <DollarSign size={15} className="me-1.5" /> 4. Thanh toán & Ghi chú
        </span>
      </div>

      <div className="row g-2 mb-2.5">
        <div className="col-6">
          <label className="form-label text-primary fw-bold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Giá chốt bán (VNĐ) <span className="text-danger">*</span>
          </label>
          <input
            className="form-control pos-input text-primary fw-bold border-primary shadow-none bg-white"
            value={formatCurrency(formData.finalPrice)}
            onChange={(e) => handleFormChange('finalPrice', parseCurrency(e.target.value))}
            style={{ fontSize: '0.9rem' }}
          />
        </div>

        <div className="col-6">
          <label className="form-label text-success fw-bold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Giảm giá thêm (VNĐ)
          </label>
          <input
            className="form-control pos-input text-success fw-bold border-success shadow-none bg-white"
            value={formatCurrency(formData.discount)}
            onChange={(e) => handleFormChange('discount', parseCurrency(e.target.value))}
            placeholder="0 đ"
            style={{ fontSize: '0.9rem' }}
          />
        </div>

        <div className="col-6">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Ngày bán <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className="form-control pos-input bg-white"
            value={formData.saleDate}
            onChange={(e) => handleFormChange('saleDate', e.target.value)}
          />
        </div>

        <div className="col-6">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Nhân viên chốt
          </label>
          <input
            className="form-control pos-input bg-white"
            value={formData.salesperson}
            onChange={(e) => handleFormChange('salesperson', e.target.value)}
            placeholder="Tên nhân viên..."
          />
        </div>

        <div className="col-12">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Ghi chú đơn hàng (Nội bộ)
          </label>
          <textarea
            className="form-control pos-input bg-white"
            rows="2"
            value={formData.saleNote}
            onChange={(e) => handleFormChange('saleNote', e.target.value)}
            placeholder="Ghi chú thêm về thỏa thuận hoặc khách hàng..."
            style={{ fontSize: '0.8rem', resize: 'none' }}
          ></textarea>
        </div>
      </div>

      {/* TỔNG KẾT THANH TOÁN */}
      <div className="card shadow-none border border-primary border-opacity-25 rounded-3 bg-white p-2.5 text-center mb-2.5">
        <div className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
          Tổng thanh toán
        </div>
        <div className="text-primary fw-bold my-0.5" style={{ fontSize: '1.75rem', lineHeight: '1.1' }}>
          {formatCurrency(grandTotal)}
          <span className="fs-6 ms-1">đ</span>
        </div>
        <div className="text-muted fst-italic" style={{ fontSize: '0.7rem' }}>
          Đã bao gồm giá máy, phụ kiện bán thêm và phí nâng cấp linh kiện.
        </div>
      </div>

      {/* CÁC NÚT HÀNH ĐỘNG BÁN */}
      <div className="d-flex gap-2">
        {onReset && (
          <button
            type="button"
            className="btn btn-light text-secondary fw-semibold rounded-pill px-3 py-1.5 border shadow-none"
            onClick={onReset}
            style={{ fontSize: '0.82rem' }}
          >
            <RotateCcw size={13} className="me-1" /> Hủy
          </button>
        )}
        {onSale && (
          <button
            type="button"
            className="btn btn-primary fw-bold rounded-pill px-3 py-1.5 shadow-sm d-flex align-items-center justify-content-center flex-grow-1"
            onClick={onSale}
            disabled={!isReady || isLoading}
            style={{ fontSize: '0.85rem' }}
          >
            {isLoading ? (
              <span className="spinner-border spinner-border-sm me-1.5"></span>
            ) : (
              <CheckCircle size={16} className="me-1.5" />
            )}
            XÁC NHẬN BÁN
          </button>
        )}
      </div>
    </div>
  );
}
