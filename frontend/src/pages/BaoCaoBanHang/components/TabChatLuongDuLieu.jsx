import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function TabChatLuongDuLieu({ data }) {
  if (!data) return null;
  const quality = data.dataQuality || {};

  return (
    <div className="fade show active">
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white p-4 p-xl-5">
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center justify-content-center p-3 bg-warning-subtle text-warning-emphasis rounded-circle mb-3">
            <ShieldAlert size={40} />
          </div>
          <h4 className="fw-bold text-dark">Kiểm Soát Chất Lượng Dữ Liệu</h4>
          <p className="text-muted">Hệ thống tự động rà soát tính đầy đủ của thông tin đơn hàng để đảm bảo báo cáo luôn chính xác nhất.</p>
        </div>

        <div className="row g-4 justify-content-center">
          <div className="col-12 col-md-4">
            <div className="p-4 bg-light rounded-4 border border-light-subtle text-center h-100 shadow-sm hover-lift-card">
              <div className="text-muted fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Tổng Đơn Hàng Xét Duyệt</div>
              <h1 className="fw-bold text-dark display-5 mb-3">
                {quality.totalOrdersInPeriod?.toLocaleString('vi-VN') || 0}
              </h1>
              <span className="badge bg-success text-white rounded-pill px-3 py-2 fw-semibold fs-6 shadow-sm">
                <CheckCircle2 size={16} className="me-1 inline" /> Hợp lệ
              </span>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="p-4 rounded-4 border text-center h-100 shadow-sm hover-lift-card" style={{ backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }}>
              <div className="text-danger fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Đơn Lỗi / Thiếu Thông Tin</div>
              <h1 className="fw-bold text-danger display-5 mb-3">
                {quality.issuesCount?.toLocaleString('vi-VN') || 0}
              </h1>
              <p className="text-danger small fw-semibold mb-0">Thiếu mã khách hàng hoặc<br />thuộc tính bắt buộc</p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="p-4 rounded-4 border text-center h-100 shadow-sm hover-lift-card" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
              <div className="text-warning-emphasis fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Đơn Chưa Rõ Nguồn</div>
              <h1 className="fw-bold text-warning display-5 mb-3">
                {quality.unknownSourceCount?.toLocaleString('vi-VN') || 0}
              </h1>
              <p className="text-warning-emphasis small fw-semibold mb-0">Nguồn chốt đơn đang bị<br />để trống hoặc "Chưa rõ"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

