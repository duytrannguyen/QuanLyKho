import React, { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, Wrench, X, Eye, Printer, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiSuaChua } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatCurrency, formatDate } from '../../utils/dinh_dang';

export default function TrangTraCuuSuaChua() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await apiSuaChua.getOrders({ keyword: keyword.trim() });
      setResults(res.data?.data || res.data || []);
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi tra cứu dịch vụ sửa chữa', 'danger');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return {
        text: 'Không bảo hành',
        badge: 'bg-secondary-subtle text-secondary',
        icon: AlertCircle
      };
    }
    const now = new Date();
    const end = new Date(expiryDate);
    end.setHours(23, 59, 59, 999);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Hết hạn (${Math.abs(diffDays)} ngày trước)`,
        badge: 'bg-danger-subtle text-danger',
        icon: AlertCircle
      };
    }
    return {
      text: `Còn hạn (${diffDays} ngày)`,
      badge: 'bg-success-subtle text-success',
      icon: ShieldCheck
    };
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <ShieldCheck className="me-2 text-primary" size={28} /> Tra Cứu Dịch Vụ Sửa Chữa & Bảo Hành
          </h2>
          <p className="text-secondary mb-0 small mt-1">
            Tra cứu lịch sử sửa chữa, thời hạn bảo hành của từng dịch vụ/linh kiện theo số điện thoại, tên khách, model máy hoặc mã hóa đơn
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary d-flex align-items-center fw-medium shadow-sm"
          onClick={() => navigate('/dich-vu-sua-chua')}
        >
          <Wrench size={16} className="me-2" /> Tạo & Cập nhật đơn sửa chữa
        </button>
      </div>

      {/* Thẻ tìm kiếm */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        <div className="card-body p-4 p-md-5">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8 text-center mb-2">
              <h4 className="fw-bold text-dark mb-2">Nhập Thông Tin Để Tra Cứu</h4>
              <p className="text-secondary small">
                Nhập Số điện thoại, Tên khách hàng, Tên model máy hoặc Tên dịch vụ để tìm lại các hóa đơn và kiểm tra hạn bảo hành
              </p>

              <form onSubmit={handleSearch} className="row g-3 align-items-center justify-content-center mt-2">
                <div className="col-12 col-md-8 position-relative">
                  <Search className="position-absolute top-50 translate-middle-y text-muted ms-3" size={20} style={{ left: '15px' }} />
                  <input
                    type="text"
                    className="form-control form-control-lg rounded-pill px-5 shadow-none border-secondary-subtle"
                    style={{ backgroundColor: '#f8f9fa' }}
                    placeholder="Nhập SĐT khách, Tên khách, Model máy, Mã hóa đơn..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  {keyword && (
                    <X
                      className="position-absolute top-50 translate-middle-y text-muted"
                      size={20}
                      style={{ right: '25px', cursor: 'pointer' }}
                      onClick={() => {
                        setKeyword('');
                        setResults([]);
                        setHasSearched(false);
                      }}
                    />
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg rounded-pill w-100 d-flex align-items-center justify-content-center fw-medium shadow-sm"
                    disabled={isLoading || !keyword.trim()}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <Search size={20} className="me-2" />
                    )}
                    Tra cứu ngay
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Bảng kết quả tìm kiếm dịch vụ */}
          {hasSearched && (
            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold m-0 text-dark">
                  Kết quả tìm thấy ({results.length} hóa đơn)
                </h6>
                <small className="text-muted">Nhấp chuột vào dòng để xem chi tiết đầy đủ của hóa đơn</small>
              </div>

              {results.length > 0 ? (
                <div className="table-responsive border rounded bg-white">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-secondary small text-uppercase fw-semibold">
                      <tr>
                        <th className="px-3 py-3" style={{ width: '15%' }}>Mã Hóa Đơn & Ngày</th>
                        <th className="py-3" style={{ width: '20%' }}>Máy Sửa & Khách Hàng</th>
                        <th className="py-3" style={{ width: '28%' }}>Các Dịch Vụ Đã Làm</th>
                        <th className="py-3 text-end" style={{ width: '13%' }}>Tổng Hóa Đơn</th>
                        <th className="py-3 text-center" style={{ width: '12%' }}>Bảo Hành</th>
                        <th className="py-3 text-end px-3" style={{ width: '12%' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((ord, idx) => {
                        const createdDateText = formatDate(ord.createdDate);

                        // Đánh giá trạng thái bảo hành tổng hợp của hóa đơn
                        const hasValidWarranty = ord.items?.some(it => {
                          if (!it.warrantyExpiry) return false;
                          const end = new Date(it.warrantyExpiry);
                          end.setHours(23, 59, 59, 999);
                          return end >= new Date();
                        });

                        const hasAnyWarranty = ord.items?.some(it => it.warrantyMonths > 0);

                        return (
                          <tr
                            key={ord.id || idx}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedOrderDetail(ord)}
                            title="Nhấp để xem chi tiết đầy đủ của hóa đơn"
                          >
                            <td className="px-3 py-3">
                              <span className="badge bg-warning-subtle text-warning-emphasis fw-bold">
                                {ord.orderCode}
                              </span>
                              <div className="small text-muted mt-1">{createdDateText}</div>
                            </td>
                            <td className="py-3">
                              <div className="fw-bold text-dark">{ord.deviceModel}</div>
                              <div className="small text-secondary">
                                {ord.customerName} {ord.customerPhone && `• ${ord.customerPhone}`}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex flex-wrap gap-1">
                                {ord.items?.map((it, iIdx) => (
                                  <span key={iIdx} className="badge bg-light text-dark border p-1 px-2 fw-normal">
                                    <strong className="text-primary">{it.serviceName}</strong>
                                    {it.quantity > 1 && ` (x${it.quantity})`}
                                    {it.warrantyMonths > 0 ? (
                                      <span className="ms-1 text-success fw-bold">[{it.warrantyMonths}T]</span>
                                    ) : (
                                      <span className="ms-1 text-muted">[KBH]</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 text-end">
                              <span className="fw-bold text-danger fs-6">
                                {formatCurrency(ord.totalAmount)} đ
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              {hasValidWarranty ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1">
                                  <ShieldCheck size={12} className="me-1 mb-1 d-inline" /> Còn hạn BH
                                </span>
                              ) : hasAnyWarranty ? (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1">
                                  <AlertCircle size={12} className="me-1 mb-1 d-inline" /> Hết hạn BH
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1">
                                  Không bảo hành
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-end px-3" onClick={e => e.stopPropagation()}>
                              <div className="d-flex justify-content-end gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary py-0 px-2 fw-medium"
                                  title="Chỉnh sửa hóa đơn này"
                                  onClick={() => navigate('/dich-vu-sua-chua', { state: { editOrder: ord } })}
                                >
                                  <Edit3 size={13} className="me-1" /> Sửa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5 border rounded bg-white">
                  <Wrench size={40} className="text-secondary opacity-25 mb-2" />
                  <p className="text-muted mb-0">Không tìm thấy hóa đơn sửa chữa nào khớp với từ khóa "{keyword}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT ĐẦY ĐỦ KHI CLICK VÀO HÓA ĐƠN */}
      {selectedOrderDetail && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <Wrench className="me-2 text-warning" size={22} />
                  Chi Tiết Đơn Dịch Vụ: {selectedOrderDetail.orderCode}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedOrderDetail(null)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Khối thông tin chung */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2 small">
                    <div className="col-sm-6"><strong>Mã hóa đơn:</strong> <span className="badge bg-primary">{selectedOrderDetail.orderCode}</span></div>
                    <div className="col-sm-6"><strong>Ngày thực hiện:</strong> {formatDate(selectedOrderDetail.createdDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> {selectedOrderDetail.customerName}</div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedOrderDetail.customerPhone}</span></div>
                    <div className="col-sm-6"><strong>Máy sửa chữa:</strong> <span className="text-primary fw-bold">{selectedOrderDetail.deviceModel}</span></div>
                    <div className="col-sm-6"><strong>Kỹ thuật viên:</strong> {selectedOrderDetail.technicianName || '—'}</div>
                    {selectedOrderDetail.note && (
                      <div className="col-12 mt-1"><strong>Ghi chú:</strong> <span className="text-muted">{selectedOrderDetail.note}</span></div>
                    )}
                    <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                      <strong className="fs-6">Tổng tiền thanh toán:</strong>
                      <span className="text-danger fw-bold fs-5">{formatCurrency(selectedOrderDetail.totalAmount)} đ</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách các dịch vụ & thời hạn bảo hành */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '130px' }}>Hạn bảo hành</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '130px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderDetail.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.serviceName}</strong>
                              {it.note && <div className="small text-muted">Tem/ghi chú: {it.note}</div>}
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">Không BH</span>
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

              <div className="modal-footer bg-light d-flex justify-content-between">
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-warning fw-medium d-flex align-items-center"
                    onClick={() => {
                      const ord = selectedOrderDetail;
                      setSelectedOrderDetail(null);
                      navigate('/dich-vu-sua-chua', { state: { editOrder: ord } });
                    }}
                  >
                    <Edit3 size={16} className="me-1" /> Chỉnh sửa hóa đơn này
                  </button>
                  <button type="button" className="btn btn-outline-secondary d-flex align-items-center" onClick={() => window.print()}>
                    <Printer size={16} className="me-1" /> In hóa đơn
                  </button>
                </div>
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedOrderDetail(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
