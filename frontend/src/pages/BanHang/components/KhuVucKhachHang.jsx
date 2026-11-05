import React from 'react';
import { User, UserPlus } from 'lucide-react';

export default function KhuVucKhachHang({ formData, handleFormChange, matchedCrmCustomer }) {
  return (
    <div className="section-card">
      <div className="section-title d-flex justify-content-between align-items-center w-100">
        <span>
          <User size={15} className="me-1.5 text-primary" /> 1. Thông tin khách hàng
        </span>
        <button
          type="button"
          className="btn btn-sm btn-light text-primary py-0 px-2 rounded-pill fw-medium border shadow-none"
          style={{ fontSize: '0.72rem', height: '24px' }}
          onClick={() => {
            const timestamp = Date.now().toString().slice(-6);
            handleFormChange('customer', `Khách vãng lai ${timestamp}`);
            handleFormChange('customerPhone', `0999${timestamp}`);
          }}
        >
          <UserPlus size={11} className="me-1" /> + Khách vãng lai
        </button>
      </div>

      <div className="row g-2">
        {/* Hàng 1: Tên & SĐT */}
        <div className="col-md-7 col-12">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Tên Khách hàng <span className="text-danger">*</span>
          </label>
          <input
            className="form-control pos-input"
            value={formData.customer}
            onChange={(e) => handleFormChange('customer', e.target.value)}
            placeholder="Nhập tên khách..."
          />
        </div>

        <div className="col-md-5 col-12">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Số điện thoại <span className="text-danger">*</span>
          </label>
          <input
            className="form-control pos-input"
            value={formData.customerPhone}
            onChange={(e) => handleFormChange('customerPhone', e.target.value)}
            placeholder="Nhập SĐT..."
          />
          {matchedCrmCustomer && (
            <div
              className="mt-1 p-1.5 bg-success bg-opacity-10 rounded-2 border border-success-subtle small text-success d-flex align-items-center justify-content-between"
              style={{ fontSize: '0.72rem' }}
            >
              <span>
                <strong>Khách cũ:</strong> {matchedCrmCustomer.fullName} ({matchedCrmCustomer.totalOrders} đơn)
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-success fw-bold text-decoration-none"
                style={{ fontSize: '0.72rem' }}
                onClick={() => {
                  handleFormChange('customer', matchedCrmCustomer.fullName);
                  handleFormChange('customerType', 'Khách cũ quay lại');
                }}
              >
                Áp dụng
              </button>
            </div>
          )}
        </div>

        {/* Hàng 2: Nguồn, Kênh chốt, Phân loại, HS/SV (4 cột đều trên desktop) */}
        <div className="col-6 col-md-3">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Nơi biết Shop
          </label>
          <select
            className="form-select pos-input"
            value={formData.firstSource}
            onChange={(e) => handleFormChange('firstSource', e.target.value)}
          >
            <option value="TikTok">TikTok</option>
            <option value="Facebook">Facebook</option>
            <option value="Zalo">Zalo</option>
            <option value="Google">Google / Website</option>
            <option value="Người quen giới thiệu">Người quen giới thiệu</option>
            <option value="Trực tiếp / Vãng lai">Khách vãng lai</option>
            <option value="Khác">Khác (Tự nhập)</option>
          </select>
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Kênh chốt đơn <span className="text-danger">*</span>
          </label>
          <select
            className="form-select pos-input border-primary border-opacity-50 fw-medium"
            value={formData.lastSource}
            onChange={(e) => handleFormChange('lastSource', e.target.value)}
          >
            <option value="Trực tiếp / Vãng lai">Tại Cửa hàng</option>
            <option value="Facebook">Facebook (Inbox)</option>
            <option value="TikTok">TikTok (Inbox)</option>
            <option value="Zalo">Zalo</option>
            <option value="Google">Hotline / Website</option>
            <option value="Người quen giới thiệu">Khách giới thiệu</option>
            <option value="Khác">Khác (Tự nhập)</option>
          </select>
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            Phân loại khách
          </label>
          <select
            className="form-select pos-input"
            value={formData.customerType}
            onChange={(e) => handleFormChange('customerType', e.target.value)}
          >
            <option>Khách mua lần đầu</option>
            <option>Khách cũ quay lại</option>
            <option>Khách sỉ / Đối tác</option>
          </select>
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
            HS / Sinh viên?
          </label>
          <select
            className="form-select pos-input"
            value={formData.isStudent}
            onChange={(e) => handleFormChange('isStudent', e.target.value)}
          >
            <option>Không</option>
            <option>Có</option>
          </select>
        </div>

        {/* Hàng bổ sung khi chọn Khác */}
        {formData.firstSource === 'Khác' && (
          <div className="col-md-6 col-12">
            <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
              Nhập nơi biết <span className="text-danger">*</span>
            </label>
            <input
              className="form-control pos-input border-warning"
              value={formData.customFirstSource}
              onChange={(e) => handleFormChange('customFirstSource', e.target.value)}
              placeholder="VD: YouTube, Bạn bè..."
            />
          </div>
        )}

        {formData.lastSource === 'Khác' && (
          <div className="col-md-6 col-12">
            <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
              Nhập kênh chốt <span className="text-danger">*</span>
            </label>
            <input
              className="form-control pos-input border-warning"
              value={formData.customLastSource}
              onChange={(e) => handleFormChange('customLastSource', e.target.value)}
              placeholder="VD: Shopee, Telegram..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
