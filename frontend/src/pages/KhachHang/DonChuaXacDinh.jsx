import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, UserPlus, Phone, User, 
  Save, X, Calendar, CheckCircle2, SearchX, Eye
} from 'lucide-react';
import { crmApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import { CategoryBadge, OrderStatusBadge } from './HoaDonKhachHang';
import ModalChiTietHoaDonCRM from './ModalChiTietHoaDonCRM';

/**
 * Danh sách đơn chưa xác định khách (thiếu hoặc sai SĐT) kèm form gán thủ công.
 */
export default function DonChuaXacDinh({ canManage, onChanged }) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const PAGE_SIZE = 20;

  const load = useCallback(async (targetPage) => {
    try {
      setLoading(true);
      setError('');
      const res = await crmApi.getUnlinkedOrders({ page: targetPage, size: PAGE_SIZE });
      if (!res.success) {
        setError(res.userMessage || 'Không thể tải danh sách đơn chưa xác định khách.');
        return;
      }
      setOrders(res.data.items);
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      setError(err?.userMessage || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const startEdit = (order) => {
    setEditingId(order.id);
    setPhone(order.customerPhone || '');
    setName(order.customerName || '');
  };

  const handleAssign = async (orderId) => {
    if (!phone.trim()) {
      showToast('Vui lòng nhập số điện thoại khách hàng', 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await crmApi.assignOrder({ orderId, phone: phone.trim(), customerName: name.trim() });
      if (res.success) {
        showToast(res.userMessage || 'Đã gán đơn hàng thành công', 'success');
        setEditingId(null);
        await load(page);
        if (onChanged) onChanged();
      } else {
        showToast(res.userMessage || 'Không thể gán đơn hàng', 'error');
      }
    } catch (err) {
      showToast(err?.userMessage || 'Không thể gán đơn hàng', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4 animate__animated animate__fadeIn">
      
      {/* Alert Info Box */}
      <div className="alert alert-warning border-0 border-start border-warning border-4 shadow-sm bg-warning bg-opacity-10 d-flex align-items-start gap-3 p-4 mb-0 rounded-end-4">
        <div className="bg-warning bg-opacity-25 p-2 rounded-circle text-warning-emphasis mt-1">
          <AlertCircle size={24} />
        </div>
        <div>
          <h5 className="alert-heading fw-bold text-dark mb-1">Cần xác định khách hàng</h5>
          <p className="mb-0 text-dark opacity-75">
            Các đơn dưới đây chưa có số điện thoại hợp lệ nên chưa thuộc hồ sơ khách hàng nào. 
            {canManage ? ' Hãy nhập SĐT chuẩn để gán đơn vào đúng hồ sơ khách.' : ' Vui lòng liên hệ quản lý để bổ sung SĐT hợp lệ.'}
          </p>
          <hr className="border-warning opacity-25 my-2" />
          <div className="fw-medium text-warning-emphasis">
            Tồn đọng: <span className="badge bg-warning text-dark fs-6 ms-1">{totalElements}</span> đơn
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 py-3">
          <SearchX size={18} /> {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover table-borderless align-middle mb-0">
            <thead className="table-light border-bottom">
              <tr>
                <th className="py-3 text-center text-secondary fw-semibold" style={{ width: '60px' }}>STT</th>
                <th className="py-3 text-secondary fw-semibold">Mã đơn & Ngày</th>
                <th className="py-3 text-secondary fw-semibold">Loại</th>
                <th className="py-3 text-secondary fw-semibold">Khách (Trên đơn)</th>
                <th className="py-3 text-secondary fw-semibold">Sản phẩm</th>
                <th className="py-3 text-secondary fw-semibold text-center">Trạng thái</th>
                <th className="py-3 text-secondary fw-semibold text-end">Thành tiền</th>
                {canManage && <th className="py-3 text-secondary fw-semibold text-center" style={{ width: '280px' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody className="border-top-0">
              {orders.map((o, index) => {
                const isEditing = editingId === o.id;
                return (
                  <tr 
                    key={o.id} 
                    role="button"
                    className={`border-bottom transition-all cursor-pointer ${isEditing ? 'bg-primary bg-opacity-10' : 'hover-table-row'}`}
                    onClick={() => { if (!isEditing) setSelectedOrder(o); }}
                    title="Nhấn để xem chi tiết hóa đơn"
                  >
                    
                    {/* STT */}
                    <td className="text-center text-secondary fw-medium">
                      {page * PAGE_SIZE + index + 1}
                    </td>

                    {/* Mã đơn & Ngày */}
                    <td>
                      <div className="fw-bold font-monospace text-primary mb-1">{o.transactionId}</div>
                      <div className="text-muted small d-flex align-items-center gap-1">
                        <Calendar size={12} /> {formatDate(o.saleDate)}
                      </div>
                    </td>

                    {/* Loại */}
                    <td>
                      <CategoryBadge category={o.orderCategory} />
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div className="fw-bold text-dark mb-1">{o.customerName || <span className="fst-italic text-muted fw-normal">(Trống)</span>}</div>
                      {o.customerPhone ? (
                        <div className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 py-1">
                          <Phone size={11} /> SĐT sai: {o.customerPhone}
                        </div>
                      ) : (
                        <div className="badge bg-secondary-subtle text-secondary-emphasis border d-inline-flex align-items-center gap-1 py-1">
                          <Phone size={11} /> Thiếu SĐT
                        </div>
                      )}
                    </td>

                    {/* Sản phẩm */}
                    <td style={{ minWidth: 200 }}>
                      <span className="text-dark fw-medium line-clamp-2">{o.productName || '—'}</span>
                    </td>

                    {/* Trạng thái */}
                    <td className="text-center">
                      <OrderStatusBadge status={o.orderStatus} />
                    </td>

                    {/* Thành tiền */}
                    <td className="text-end text-nowrap">
                      <div className="fw-bolder text-dark fs-6">{dinhDangTien(o.netRevenue || 0)} đ</div>
                    </td>

                    {/* Thao tác / Gán khách */}
                    {canManage && (
                      <td className="text-center px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="d-flex flex-column gap-2 bg-white p-2 rounded-3 border shadow-sm animate__animated animate__zoomIn animate__faster">
                            <div className="input-group input-group-sm">
                              <span className="input-group-text bg-light text-secondary"><Phone size={14} /></span>
                              <input
                                id={`crm-assign-phone-${o.id}`}
                                className="form-control font-monospace text-primary fw-bold"
                                placeholder="Số điện thoại (10 số)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text bg-light text-secondary"><User size={14} /></span>
                              <input
                                id={`crm-assign-name-${o.id}`}
                                className="form-control"
                                placeholder="Tên khách (tùy chọn)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                              />
                            </div>
                            <div className="d-flex gap-2 mt-1">
                              <button 
                                type="button" 
                                className="btn btn-sm btn-primary flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1" 
                                disabled={saving} 
                                onClick={() => handleAssign(o.id)}
                              >
                                {saving ? <span className="spinner-border spinner-border-sm" /> : <Save size={14} />}
                                Lưu
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-light border d-inline-flex align-items-center justify-content-center gap-1 text-secondary" 
                                disabled={saving} 
                                onClick={() => setEditingId(null)}
                              >
                                <X size={14} /> Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1"
                              onClick={() => setSelectedOrder(o)}
                              title="Xem chi tiết hóa đơn"
                            >
                              <Eye size={14} />
                              <span>Xem</span>
                            </button>
                            <button 
                              type="button" 
                              id={`crm-assign-btn-${o.id}`} 
                              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 hover-primary" 
                              onClick={() => startEdit(o)}
                            >
                              <UserPlus size={15} /> Gán khách
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Trạng thái trống (Tốt) */}
              {!loading && orders.length === 0 && !error && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="text-center py-5">
                    <div className="d-flex flex-column align-items-center text-muted">
                      <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle mb-3">
                        <CheckCircle2 size={48} />
                      </div>
                      <h5 className="fw-medium text-success">Tuyệt vời!</h5>
                      <p className="mb-0">Tất cả đơn hàng đều đã được xác định SĐT khách hàng.</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Trạng thái Loading */}
              {loading && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <p className="text-muted mt-2 mb-0">Đang quét danh sách hóa đơn...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang Footer */}
        {totalPages > 1 && (
          <div className="bg-light p-3 border-top d-flex justify-content-center align-items-center gap-3">
            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0 shadow-sm">
                <li className={`page-item ${page === 0 || loading ? 'disabled' : ''}`}>
                  <button className="page-link px-3" onClick={() => load(page - 1)}>
                    Trước
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link bg-white text-dark fw-medium px-4">
                    Trang {page + 1} / {totalPages}
                  </span>
                </li>
                <li className={`page-item ${page + 1 >= totalPages || loading ? 'disabled' : ''}`}>
                  <button className="page-link px-3" onClick={() => load(page + 1)}>
                    Sau
                  </button>
                </li>
              </ul>
            </nav>
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
        .cursor-pointer { cursor: pointer; }
        .hover-table-row:hover { background-color: #f8fafc !important; }
        .transition-all { transition: background-color 0.2s ease-in-out; }
        .hover-primary:hover { background-color: #0d6efd !important; color: white !important; }
      `}} />
    </div>
  );
}