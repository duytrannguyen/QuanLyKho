import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AlertCircle, UserPlus, Phone, User, 
  Save, X, Calendar, CheckCircle2, SearchX, Eye,
  Search, Filter, Package, Wrench, Monitor, Headphones, Lock
} from 'lucide-react';
import { crmApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import { CategoryBadge, OrderStatusBadge } from './HoaDonKhachHang';
import ModalChiTietHoaDonCRM from './ModalChiTietHoaDonCRM';
import PhanTrang from '../../components/common/PhanTrang';
import BangLoading from '../../components/common/BangLoading';

/**
 * Danh sách đơn chưa xác định khách (thiếu hoặc sai SĐT) kèm form gán thủ công.
 */
export default function DonChuaXacDinh({ canManage, onChanged }) {
  const { showToast } = useToast();
  const { requirePermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchKw, setSearchKw] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(''); // '' | 'MACHINE' | 'ACCESSORY' | 'REPAIR'

  // Inline edit state
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
    if (!requirePermission('CRM_MANAGE', showToast, 'Gán đơn hàng chưa xác định vào hồ sơ khách')) return;
    setEditingId(order.id);
    setPhone(order.customerPhone || '');
    setName(order.customerName || '');
  };

  const handleAssign = async (orderId) => {
    if (!requirePermission('CRM_MANAGE', showToast, 'Gán đơn hàng chưa xác định vào hồ sơ khách')) return;
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      showToast('Vui lòng nhập số điện thoại hợp lệ gồm 10 chữ số (bắt đầu bằng 0)', 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await crmApi.assignOrder({ orderId, phone: cleanPhone, customerName: name.trim() });
      if (res.success) {
        showToast(res.userMessage || 'Đã gán đơn hàng vào hồ sơ khách thành công', 'success');
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

  // Client-side filtering for search & category in current batch
  const displayedOrders = useMemo(() => {
    return orders.filter(o => {
      const matchCategory = !categoryFilter || o.orderCategory === categoryFilter;
      const kw = searchKw.trim().toLowerCase();
      const matchKw = !kw || 
        (o.transactionId && o.transactionId.toLowerCase().includes(kw)) ||
        (o.customerName && o.customerName.toLowerCase().includes(kw)) ||
        (o.productName && o.productName.toLowerCase().includes(kw)) ||
        (o.customerPhone && o.customerPhone.includes(kw));
      return matchCategory && matchKw;
    });
  }, [orders, searchKw, categoryFilter]);

  return (
    <div className="d-flex flex-column gap-4 animate__animated animate__fadeIn">
      
      {/* Alert Info Box */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="card-body p-4 border-start border-warning border-5">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-start gap-3">
              <div className="bg-warning bg-opacity-10 text-warning-emphasis p-3 rounded-circle flex-shrink-0">
                <AlertCircle size={26} />
              </div>
              <div>
                <h5 className="fw-bold text-dark mb-1">Cần Chuẩn Hóa Số Điện Thoại Để Nhận Diện Khách Hàng</h5>
                <p className="mb-0 text-secondary small">
                  Các đơn hàng dưới đây bị thiếu hoặc nhập sai định dạng số điện thoại khi bán hàng, nên hệ thống chưa thể tự động gom vào hồ sơ CRM của khách.
                  {canManage ? ' Bạn có thể nhập SĐT chuẩn (10 chữ số) để hệ thống tự động gán vào khách cũ hoặc tạo mới hồ sơ.' : ' Vui lòng báo quản lý kho để bổ sung số điện thoại chuẩn.'}
                </p>
              </div>
            </div>
            <div className="bg-light border rounded-4 px-4 py-3 text-center flex-shrink-0">
              <div className="text-muted small fw-medium">Tồn đọng chưa gán</div>
              <div className="fs-3 fw-bolder text-warning-emphasis lh-1 mt-1">{totalElements}</div>
              <div className="text-secondary small mt-1">đơn hàng</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 py-3 rounded-4">
          <SearchX size={18} /> {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        
        {/* Filter Toolbar */}
        <div className="card-header bg-white border-bottom p-3 px-4">
          <div className="row g-3 align-items-center justify-content-between">
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm shadow-xs rounded-pill overflow-hidden border">
                <span className="input-group-text bg-white border-0 text-secondary ps-3">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control border-0 ps-0 shadow-none"
                  placeholder="Tìm theo mã đơn, tên khách, sản phẩm..."
                  value={searchKw}
                  onChange={(e) => setSearchKw(e.target.value)}
                />
                {searchKw && (
                  <button 
                    className="btn btn-sm btn-link text-secondary text-decoration-none pe-3" 
                    type="button" 
                    onClick={() => setSearchKw('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-md-auto d-flex flex-wrap align-items-center gap-2">
              <span className="text-secondary small fw-medium me-1">Loại đơn:</span>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1 fw-medium ${!categoryFilter ? 'btn-primary' : 'btn-light border text-secondary'}`}
                onClick={() => setCategoryFilter('')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1 fw-medium ${categoryFilter === 'MACHINE' ? 'btn-primary' : 'btn-light border text-secondary'}`}
                onClick={() => setCategoryFilter('MACHINE')}
              >
                Máy móc
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1 fw-medium ${categoryFilter === 'ACCESSORY' ? 'btn-primary' : 'btn-light border text-secondary'}`}
                onClick={() => setCategoryFilter('ACCESSORY')}
              >
                Phụ kiện
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1 fw-medium ${categoryFilter === 'REPAIR' ? 'btn-primary' : 'btn-light border text-secondary'}`}
                onClick={() => setCategoryFilter('REPAIR')}
              >
                Sửa chữa
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <table className="table table-hover table-borderless align-middle mb-0">
            <thead className="table-light border-bottom">
              <tr>
                <th className="py-3 text-center text-secondary fw-semibold" style={{ width: '60px' }}>STT</th>
                <th className="py-3 text-secondary fw-semibold">Mã đơn & Ngày</th>
                <th className="py-3 text-secondary fw-semibold text-center">Danh mục</th>
                <th className="py-3 text-secondary fw-semibold">Tên & SĐT tạm trên đơn</th>
                <th className="py-3 text-secondary fw-semibold" style={{ minWidth: 220 }}>Sản phẩm</th>
                <th className="py-3 text-secondary fw-semibold text-center">Trạng thái</th>
                <th className="py-3 text-secondary fw-semibold text-end">Thành tiền</th>
                <th className="py-3 text-secondary fw-semibold text-center" style={{ width: '280px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {displayedOrders.map((o, index) => {
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
                    <td className="text-center">
                      <CategoryBadge category={o.orderCategory} />
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div className="fw-bold text-dark mb-1">
                        {o.customerName || <span className="fst-italic text-muted fw-normal">(Không có tên)</span>}
                      </div>
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
                    <td>
                      <span className="text-dark fw-medium line-clamp-2">{o.productName || '—'}</span>
                      {o.serialKeys && (
                        <span className="small text-muted font-monospace d-block mt-1">
                          Serial: {o.serialKeys}
                        </span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="text-center">
                      <OrderStatusBadge status={o.orderStatus} />
                    </td>

                    {/* Thành tiền */}
                    <td className="text-end text-nowrap">
                      <div className="fw-bolder text-success fs-6">{dinhDangTien(o.netRevenue || 0)} đ</div>
                    </td>

                    {/* Thao tác / Gán khách */}
                    <td className="text-center px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div className="d-flex flex-column gap-2 bg-white p-3 rounded-4 border shadow-sm">
                          <div className="text-start small fw-bold text-dark mb-1">
                            Gán SĐT định danh khách hàng:
                          </div>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text bg-light text-secondary"><Phone size={14} /></span>
                            <input
                              id={`crm-assign-phone-${o.id}`}
                              className="form-control font-monospace text-primary fw-bold"
                              placeholder="Nhập SĐT chuẩn 10 số (0...)"
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
                              placeholder="Họ và tên khách (tùy chọn)"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                          <div className="d-flex gap-2 mt-1">
                            <button 
                              type="button" 
                              className="btn btn-sm btn-primary flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1 rounded-pill" 
                              disabled={saving} 
                              onClick={() => handleAssign(o.id)}
                            >
                              {saving ? <span className="spinner-border spinner-border-sm" /> : <Save size={14} />}
                              Lưu gán
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-light border d-inline-flex align-items-center justify-content-center gap-1 text-secondary rounded-pill" 
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
                            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1"
                            onClick={() => setSelectedOrder(o)}
                            title="Xem chi tiết hóa đơn"
                          >
                            <Eye size={14} />
                            <span>Xem</span>
                          </button>
                          <button 
                            type="button" 
                            id={`crm-assign-btn-${o.id}`} 
                            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 shadow-xs hover-primary" 
                            onClick={() => startEdit(o)}
                            title={canManage ? 'Gán SĐT khách hàng' : 'Yêu cầu quyền: Quản trị dữ liệu CRM'}
                          >
                            <UserPlus size={14} /> Gán SĐT
                            {!canManage && <Lock size={12} className="text-warning" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Trạng thái trống (Tốt) */}
              {!loading && displayedOrders.length === 0 && !error && (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="d-flex flex-column align-items-center text-muted">
                      <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle mb-3">
                        <CheckCircle2 size={44} />
                      </div>
                      <h5 className="fw-bold text-success mb-1">
                        {searchKw || categoryFilter ? 'Không tìm thấy đơn hàng phù hợp.' : 'Tuyệt vời! Không còn đơn chưa xác định.'}
                      </h5>
                      <p className="mb-0 text-secondary small">
                        {searchKw || categoryFilter ? 'Hãy thử xóa bộ lọc tìm kiếm.' : 'Toàn bộ đơn hàng trong hệ thống đều đã được gán số điện thoại khách hàng chuẩn hóa.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Trạng thái Loading */}
              {loading && (
                <BangLoading colSpan={canManage ? 8 : 7} message="Đang quét danh sách hóa đơn chưa xác định khách..." />
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang Footer */}
        {totalPages > 1 && (
          <div className="bg-light p-3 border-top px-4">
            <PhanTrang
              isZeroIndexed={true}
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={load}
              itemName="đơn chưa gán"
              showPageNumbers={false}
            />
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
        .hover-primary:hover { background-color: #0b5ed7 !important; color: white !important; }
      `}} />
    </div>
  );
}
