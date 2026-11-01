import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, Monitor, Headphones, Wrench, ShieldCheck, 
  ArrowLeft, Phone, Calendar, ShoppingBag, 
  CheckCircle2, FileText, Package, User, Eye
} from 'lucide-react';
import { crmApi } from '../../api';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import ModalChiTietHoaDonCRM from './ModalChiTietHoaDonCRM';

const CATEGORY_META = {
  MACHINE: { label: 'Máy móc', icon: Monitor, className: 'bg-primary text-white' },
  ACCESSORY: { label: 'Phụ kiện', icon: Headphones, className: 'bg-info text-dark' },
  REPAIR: { label: 'Sửa chữa', icon: Wrench, className: 'bg-warning text-dark' },
};

const CATEGORY_FILTERS = [
  { value: '', label: 'Tất cả hóa đơn' },
  { value: 'MACHINE', label: 'Máy móc' },
  { value: 'ACCESSORY', label: 'Phụ kiện' },
  { value: 'REPAIR', label: 'Dịch vụ sửa chữa' },
];

const isCancelledOrReturned = (status) => {
  const s = (status || '').toLowerCase();
  return s.includes('hủy') || s.includes('huỷ') || s.includes('trả') || s.includes('cancel');
};

export const OrderStatusBadge = ({ status }) => {
  if (!status) return <span className="text-secondary">—</span>;
  const cancelled = isCancelledOrReturned(status);
  return (
    <span className={`badge rounded-pill ${cancelled ? 'bg-danger bg-opacity-10 text-danger border border-danger-subtle' : 'bg-success bg-opacity-10 text-success border border-success-subtle'} fw-medium px-3 py-2`}>
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

export default function HoaDonKhachHang({ customer, onBack }) {
  const customerId = customer?.id;
  const [category, setCategory] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (targetPage, append = false) => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError('');
      const res = await crmApi.getCustomerOrders(customerId, { category, page: targetPage, size: 20 });
      if (!res.success) {
        setError(res.userMessage || 'Không thể tải danh sách hóa đơn.');
        return;
      }
      const data = res.data;
      setOrders((prev) => (append ? [...prev, ...data.items] : data.items));
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err) {
      setError(err?.userMessage || 'Lỗi kết nối máy chủ khi tải hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [customerId, category]);

  useEffect(() => {
    loadOrders(0, false);
  }, [loadOrders]);

  return (
    <div className="d-flex flex-column gap-4 animate__animated animate__fadeIn">
      
      {/* --- HEADER: Thông tin khách hàng & Thống kê --- */}
      <div className="bg-white rounded-4 shadow-sm border p-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-4">
          
          {/* Cột trái: Nút Back + Info Khách */}
          <div className="d-flex flex-column align-items-start gap-3">
            {onBack && (
              <button
                type="button"
                className="btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-2 hover-bg-light rounded-pill px-3"
                onClick={onBack}
              >
                <ArrowLeft size={16} /> Về danh sách khách hàng
              </button>
            )}
            
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
                <User size={28} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h4 className="fw-bold mb-0 text-dark">
                    {customer?.fullName || <span className="fst-italic text-muted">(Khách hàng chưa cập nhật tên)</span>}
                  </h4>
                  {customer?.customerType && (
                    <span className="badge bg-info bg-opacity-10 text-info border border-info rounded-pill px-2 py-1">
                      {customer.customerType}
                    </span>
                  )}
                </div>
                <div className="text-secondary small d-flex flex-wrap align-items-center gap-3 mt-2">
                  <span className="d-flex align-items-center gap-1 bg-light px-2 py-1 rounded">
                    <Phone size={14} className="text-primary" /> {customer?.phone}
                  </span>
                  {customer?.firstOrderAt && (
                    <span className="d-flex align-items-center gap-1">
                      <Calendar size={14} className="text-muted" /> Đầu tiên: <strong className="text-dark">{formatDate(customer.firstOrderAt)}</strong>
                    </span>
                  )}
                  {customer?.lastOrderAt && (
                    <span className="d-flex align-items-center gap-1">
                      <CheckCircle2 size={14} className="text-success" /> Gần nhất: <strong className="text-dark">{formatDate(customer.lastOrderAt)}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Widget Thống kê */}
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 border border-primary-subtle rounded-4 px-4 py-3 text-center min-w-120">
              <div className="text-primary fw-medium small mb-1">Tổng hóa đơn</div>
              <div className="fw-bolder text-primary fs-4">{customer?.totalOrders ?? totalElements}</div>
            </div>
            <div className="bg-success bg-opacity-10 border border-success-subtle rounded-4 px-4 py-3 text-center min-w-150">
              <div className="text-success fw-medium small mb-1">Tổng chi tiêu</div>
              <div className="fw-bolder text-success fs-5">{dinhDangTien(customer?.totalSpent || 0)} đ</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DANH SÁCH HÓA ĐƠN --- */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        
        {/* Toolbar: Tiêu đề & Bộ lọc */}
        <div className="card-header bg-white border-bottom p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
              <ShoppingBag size={20} />
            </div>
            <h5 className="fw-bold mb-0 text-dark">Lịch sử mua hàng</h5>
            <span className="badge rounded-pill bg-light border text-dark ms-2">
              {totalElements} đơn
            </span>
          </div>
          
          <div className="d-flex gap-2 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value || 'ALL'}
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-2 fw-medium transition-all ${category === f.value ? 'btn-primary shadow-sm' : 'btn-light border text-secondary hover-bg-secondary'}`}
                onClick={() => setCategory(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger m-4 d-flex align-items-center gap-2 py-3 border-0 shadow-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Table */}
        <div className="table-responsive bg-white">
          <table className="table table-hover table-borderless align-middle mb-0">
            <thead className="table-light border-bottom">
              <tr>
                <th className="py-3 text-center text-secondary fw-semibold" style={{ width: '60px' }}>STT</th>
                <th className="py-3 text-secondary fw-semibold">Mã đơn & Ngày</th>
                <th className="py-3 text-secondary fw-semibold" style={{ width: '35%' }}>Thông tin sản phẩm</th>
                <th className="py-3 text-secondary fw-semibold text-center">Trạng thái</th>
                <th className="py-3 text-secondary fw-semibold text-end">Thành tiền</th>
                <th className="py-3 text-secondary fw-semibold text-center">Bảo hành</th>
                <th className="py-3 text-secondary fw-semibold">Nhân viên</th>
                <th className="py-3 text-secondary fw-semibold text-center" style={{ width: '120px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {orders.map((o, index) => {
                const cancelled = isCancelledOrReturned(o.orderStatus);
                return (
                  <tr 
                    key={o.id} 
                    role="button"
                    className={`border-bottom cursor-pointer hover-table-row ${cancelled ? 'bg-light opacity-75' : ''}`}
                    onClick={() => setSelectedOrder(o)}
                    title="Nhấn để xem chi tiết hóa đơn"
                  >
                    
                    {/* STT */}
                    <td className="text-center text-secondary fw-medium">
                      {index + 1}
                    </td>

                    {/* Mã đơn & Ngày */}
                    <td>
                      <div className="fw-bold font-monospace text-primary mb-1">
                        {o.transactionId}
                      </div>
                      <div className="text-muted small d-flex align-items-center gap-1">
                        <Calendar size={12} /> {formatDate(o.saleDate)}
                      </div>
                      <div className="mt-2">
                        <CategoryBadge category={o.orderCategory} />
                      </div>
                    </td>

                    {/* Sản phẩm / Cấu hình / Phụ kiện kèm */}
                    <td>
                      <div className={`fw-bold ${cancelled ? 'text-secondary text-decoration-line-through' : 'text-dark'} fs-6`}>
                        {o.productName || <span className="text-muted fw-normal fst-italic">Không có tên sản phẩm</span>}
                      </div>
                      
                      {o.serialKeys && (
                        <div className="small mt-2">
                          <span className="text-muted me-1">Serial:</span> 
                          <span className="badge bg-light text-dark border font-monospace py-1">{o.serialKeys}</span>
                        </div>
                      )}
                      
                      {o.note && (
                        <div className="small text-secondary fst-italic mt-2 d-flex gap-1">
                          <FileText size={14} className="text-muted" /> {o.note}
                        </div>
                      )}

                      {/* Khối hiển thị phụ kiện bán kèm */}
                      {o.accompanyingOrder && (
                        <div className="mt-3 p-3 bg-info bg-opacity-10 border-start border-info border-4 rounded-end">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="badge bg-info text-dark d-inline-flex align-items-center gap-1">
                              <Package size={12} /> Kèm mã: {o.accompanyingOrder.transactionId}
                            </span>
                            <span className="fw-bold text-info-emphasis small">
                              +{dinhDangTien(o.accompanyingOrder.netRevenue || 0)} đ
                            </span>
                          </div>
                          <div className="small fw-medium text-dark mt-2">
                            {o.accompanyingOrder.productName}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="text-center">
                      <OrderStatusBadge status={o.orderStatus} />
                      {o.paymentStatus && (
                        <div className="small text-secondary mt-2 fw-medium">{o.paymentStatus}</div>
                      )}
                    </td>

                    {/* Thành tiền */}
                    <td className="text-end">
                      <div className={`fw-bolder fs-6 ${cancelled ? 'text-decoration-line-through text-muted' : 'text-success'}`}>
                        {dinhDangTien(o.combinedNetRevenue || o.netRevenue || 0)} đ
                      </div>
                      
                      {o.accompanyingOrder && !cancelled && (
                        <div className="small text-secondary mt-1 d-flex flex-column gap-1">
                          <div>Máy: <span className="fw-medium">{dinhDangTien(o.netRevenue)} đ</span></div>
                          <div className="text-info">Phụ kiện: <span className="fw-medium">+{dinhDangTien(o.accompanyingOrder.netRevenue)} đ</span></div>
                        </div>
                      )}
                      
                      {Number(o.discount) > 0 && !cancelled && (
                        <div className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle mt-2">
                          Giảm: -{dinhDangTien(o.discount)} đ
                        </div>
                      )}
                    </td>

                    {/* Bảo hành */}
                    <td className="text-center">
                      {o.warrantyPeriod || o.warrantyExpiry ? (
                        <div className="d-flex flex-column align-items-center">
                          <div className="badge bg-light text-dark border d-inline-flex align-items-center gap-1 mb-1 px-2 py-1">
                            <ShieldCheck size={14} className="text-success" />
                            {o.warrantyPeriod || 'Có BH'}
                          </div>
                          {o.warrantyExpiry && (
                            <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                              Đến: {formatDate(o.warrantyExpiry)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Nhân viên */}
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="bg-secondary bg-opacity-10 rounded-circle p-1">
                          <User size={14} className="text-secondary" />
                        </div>
                        <span className="fw-medium text-dark">{o.salesperson || '—'}</span>
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center gap-1 px-3 py-1 shadow-sm hover-primary transition-all"
                        onClick={() => setSelectedOrder(o)}
                        title="Xem chi tiết hóa đơn"
                      >
                        <Eye size={14} />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                    
                  </tr>
                );
              })}

              {/* Trạng thái trống */}
              {!loading && orders.length === 0 && !error && (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="d-flex flex-column align-items-center text-muted">
                      <ShoppingBag size={48} className="mb-3 opacity-25" />
                      <h5 className="fw-normal">Không tìm thấy hóa đơn nào phù hợp.</h5>
                      <p className="small">Hãy thử thay đổi bộ lọc ở bên trên.</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Trạng thái Loading */}
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <p className="text-muted mt-2 mb-0">Đang lấy dữ liệu hóa đơn...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Nút Tải thêm */}
        {!loading && page + 1 < totalPages && (
          <div className="card-footer bg-white border-top-0 text-center py-4">
            <button 
              type="button" 
              className="btn btn-outline-primary rounded-pill px-5 py-2 fw-medium shadow-sm hover-primary transition-all" 
              onClick={() => loadOrders(page + 1, true)}
            >
              Tải thêm hóa đơn cũ hơn
            </button>
          </div>
        )}
      </div>

      {/* Modal Chi tiết Hóa đơn */}
      {selectedOrder && (
        <ModalChiTietHoaDonCRM 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .min-w-120 { min-width: 120px; }
        .min-w-150 { min-width: 150px; }
        .cursor-pointer { cursor: pointer; }
        .hover-table-row:hover { background-color: #f8fafc !important; }
        .hover-bg-secondary:hover { background-color: #e9ecef !important; }
        .transition-all { transition: all 0.2s ease-in-out; }
      `}} />
    </div>
  );
}