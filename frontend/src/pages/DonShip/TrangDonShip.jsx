import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck, Clock, CheckCircle2, Search, RotateCcw, Edit3, Eye,
  Calendar, ShieldCheck, AlertCircle, FileText, User, Phone,
  Hash, DollarSign, Package, Check, RefreshCw, ChevronLeft, ChevronRight, Lock
} from 'lucide-react';
import { apiBaoHanh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import ModalChiTietDonHang from '../KiemTraBaoHanh/ModalChiTietDonHang';
import ModalSuaDonMay from '../KiemTraBaoHanh/ModalSuaDonMay';
import ModalXacNhanGiaoHang from '../KiemTraBaoHanh/ModalXacNhanGiaoHang';
import PhanTrang from '../../components/common/PhanTrang';
import { formatCurrency, formatDate, getCleanWarrantyType, getTodayDateString } from '../../utils/dinh_dang';

export default function TrangDonShip() {
  const { showToast } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const canConfirmShip = hasPermission('SHIP_MANAGE');
  const canEditOrder = hasPermission('ORDER_EDIT');
  const canReturnOrder = hasPermission('ORDER_RETURN');

  // Active Tab: 'PENDING' (Chờ giao) | 'DELIVERED' (Đã hoàn thành)
  const [activeTab, setActiveTab] = useState('PENDING');

  // Dữ liệu danh sách đơn & Thống kê
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, delivered: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [confirmDeliveryDate, setConfirmDeliveryDate] = useState(getTodayDateString());
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Return modal state
  const [returningOrder, setReturningOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('Khách từ chối nhận hàng / Hoàn hàng về kho');
  const [returnState, setReturnState] = useState('READY');
  const [restoreAccessories, setRestoreAccessories] = useState(true);
  const [restoreUpgradeParts, setRestoreUpgradeParts] = useState(true);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Tải danh sách đơn ship
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = activeTab === 'PENDING' ? 'pending' : 'delivered';
      const res = await apiBaoHanh.getShippingOrders({
        status: statusParam,
        keyword: debouncedSearchTerm.trim() || undefined
      });
      const data = res.data?.data || res.data || {};
      setOrders(data.orders || []);
      setSummary({
        total: Number(data.total) || 0,
        pending: Number(data.pending) || 0,
        delivered: Number(data.delivered) || 0,
      });
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi tải danh sách đơn ship', 'danger');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearchTerm, showToast]);

  useEffect(() => {
    fetchOrders();
    setCurrentPage(1); // Reset về trang 1 khi đổi tab hoặc tìm kiếm
  }, [fetchOrders]);

  // Xử lý phân trang dữ liệu ở phía client
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, currentPage, pageSize]);

  const totalPages = Math.ceil(orders.length / pageSize) || 1;

  // Xử lý xác nhận khách đã nhận hàng
  const handleOpenConfirm = (order) => {
    if (!requirePermission('SHIP_MANAGE', showToast, 'Xác nhận giao đơn ship thành công')) return;
    setConfirmingOrder(order);
    setConfirmDeliveryDate(getTodayDateString());
  };

  const handleConfirmSubmit = async (e) => {
    e?.preventDefault();
    if (!confirmingOrder || !confirmDeliveryDate) return;

    setIsSubmittingDelivery(true);
    try {
      await apiBaoHanh.confirmDelivery(confirmingOrder.cycleId, {
        deliveryDate: confirmDeliveryDate
      });
      showToast(`Đã xác nhận khách nhận máy ${confirmingOrder.serialKey}! Bảo hành đã được kích hoạt.`, 'success');
      setConfirmingOrder(null);
      if (selectedOrder && selectedOrder.cycleId === confirmingOrder.cycleId) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi xác nhận giao hàng', 'danger');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // Xử lý hoàn hàng / hủy giao
  const handleOpenReturn = (order) => {
    if (!requirePermission('ORDER_RETURN', showToast, 'Đổi trả & Hoàn đơn hàng ship về kho')) return;
    setReturningOrder(order);
    setReturnReason('Khách từ chối nhận hàng / Hoàn hàng về kho');
    setReturnState('READY');
    setRestoreAccessories(true);
    setRestoreUpgradeParts(true);
  };

  const handleReturnSubmit = async (e) => {
    e?.preventDefault();
    if (!returningOrder) return;

    setIsSubmittingReturn(true);
    try {
      await apiBaoHanh.returnShippingOrder(returningOrder.cycleId, {
        reason: returnReason,
        returnState,
        restoreAccessories,
        restoreUpgradeParts
      });
      showToast(`Đã hoàn đơn hàng ${returningOrder.cycleId}! Máy đã được nhập lại kho.`, 'success');
      setReturningOrder(null);
      if (selectedOrder && selectedOrder.cycleId === returningOrder.cycleId) {
        setSelectedOrder(null);
      }
      fetchOrders();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi hoàn đơn hàng', 'danger');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Helper tính trạng thái bảo hành đơn máy
  const computeWarrantyInfo = (order) => {
    if (!order.isDelivered) {
      return {
        status: 'PENDING',
        text: 'Chờ khách nhận hàng',
        badge: 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25',
        icon: Clock,
        endDate: null
      };
    }

    if (order.warrantyExpiry) {
      const now = new Date();
      const end = new Date(order.warrantyExpiry);
      end.setHours(23, 59, 59, 999);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (now > end) {
        return {
          status: 'EXPIRED',
          text: 'Hết hạn bảo hành',
          badge: 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25',
          icon: AlertCircle,
          endDate: end,
          diffDays: Math.abs(diffDays)
        };
      }
      return {
        status: 'VALID',
        text: 'Còn hạn bảo hành',
        badge: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25',
        icon: ShieldCheck,
        endDate: end,
        diffDays
      };
    }

    return {
      status: 'CUSTOM',
      text: 'Theo thỏa thuận',
      badge: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25',
      icon: FileText,
      endDate: null
    };
  };

  return (
    <div className="container-fluid py-4 min-vh-100 position-relative bg-light" style={{ paddingBottom: '100px' }}>

      {/* 1. Header Trang */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 bg-white p-4 rounded-4 shadow-sm border">
        <div>
          <h4 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
              <Truck size={24} />
            </div>
            Quản Lý Đơn Ship & Giao Hàng
          </h4>
          <div className="text-muted small mt-1">
            Theo dõi tiến độ giao hàng từ xa, kiểm soát đơn chờ và tự động kích hoạt bảo hành từ ngày khách nhận.
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary rounded-pill px-3 py-2 d-flex align-items-center gap-2 shadow-sm fw-medium"
          onClick={fetchOrders}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'spinner-border spinner-border-sm border-0' : ''} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. KPI Cards Thống Kê Nhanh */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div
            className={`card border-0 shadow-sm rounded-4 p-3 transition-all ${activeTab === 'PENDING' ? 'border-start border-4 border-warning bg-warning bg-opacity-10 shadow' : 'bg-white'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('PENDING')}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Đơn chờ khách nhận</span>
                <h3 className="fw-bold text-warning mb-0 mt-1">{summary.pending}</h3>
              </div>
              <div className="p-3 bg-warning bg-opacity-25 text-warning rounded-4">
                <Clock size={24} />
              </div>
            </div>
            <div className="small text-muted mt-2">
              Chưa kích hoạt bảo hành (Đang vận chuyển)
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div
            className={`card border-0 shadow-sm rounded-4 p-3 transition-all ${activeTab === 'DELIVERED' ? 'border-start border-4 border-success bg-success bg-opacity-10 shadow' : 'bg-white'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('DELIVERED')}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Đơn đã giao thành công</span>
                <h3 className="fw-bold text-success mb-0 mt-1">{summary.delivered}</h3>
              </div>
              <div className="p-3 bg-success bg-opacity-25 text-success rounded-4">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="small text-muted mt-2">
              Đã nhận hàng & Đang chạy bảo hành
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Tổng đơn ship xa</span>
                <h3 className="fw-bold text-primary mb-0 mt-1">{summary.total}</h3>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                <Truck size={24} />
              </div>
            </div>
            <div className="small text-muted mt-2">
              Tất cả các đơn gửi xa trên toàn hệ thống
            </div>
          </div>
        </div>
      </div>

      {/* 3. Khối Nội Dung & Tabs */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">

        {/* Tab Header & Search */}
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">

            {/* Tabs Selector */}
            <ul className="nav nav-pills gap-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm ${activeTab === 'PENDING' ? 'active bg-warning text-dark' : 'text-secondary bg-light'
                    }`}
                  onClick={() => setActiveTab('PENDING')}
                >
                  <Clock size={16} />
                  <span>Đơn chờ nhận hàng</span>
                  <span className="badge rounded-pill bg-white text-dark ms-1">{summary.pending}</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm ${activeTab === 'DELIVERED' ? 'active bg-success text-white' : 'text-secondary bg-light'
                    }`}
                  onClick={() => setActiveTab('DELIVERED')}
                >
                  <CheckCircle2 size={16} />
                  <span>Đơn đã hoàn thành</span>
                  <span className="badge rounded-pill bg-white text-dark ms-1">{summary.delivered}</span>
                </button>
              </li>
            </ul>

            {/* Thanh Tìm Kiếm */}
            <div className="d-flex align-items-center gap-2" style={{ minWidth: '320px' }}>
              <div className="input-group shadow-sm rounded-pill overflow-hidden border">
                <span className="input-group-text bg-white border-0 ps-3">
                  <Search size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-white shadow-none ps-2"
                  placeholder="Tìm Serial, Khách, SĐT, Mã đơn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-white border-0 text-secondary"
                    onClick={() => setSearchTerm('')}
                    title="Xóa tìm kiếm"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 4. Danh Sách Đơn Hàng */}
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-5 my-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <h6 className="text-muted fw-semibold">Đang tải danh sách đơn ship...</h6>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-5 my-5">
              <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 shadow-sm text-secondary opacity-50">
                <Truck size={48} />
              </div>
              <h5 className="fw-bold text-dark">
                {activeTab === 'PENDING' ? 'Hiện không có đơn nào đang chờ giao' : 'Chưa có đơn ship nào hoàn thành'}
              </h5>
              <p className="text-muted mb-0">
                {searchTerm ? `Không có kết quả khớp với từ khóa "${searchTerm}"` : 'Tất cả các đơn ship sẽ xuất hiện tại đây khi được tạo từ trang bán hàng.'}
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary small text-uppercase fw-bold">
                    <tr>
                      <th className="ps-4 py-3 text-center" style={{ width: '6%' }}>STT</th>
                      <th className="py-3" style={{ width: '22%' }}>Máy & Cấu hình</th>
                      <th className="py-3" style={{ width: '13%' }}>Số Serial</th>
                      <th className="py-3" style={{ width: '15%' }}>Khách hàng & SĐT</th>
                      <th className="py-3" style={{ width: '11%' }}>Ngày gửi đơn</th>
                      <th className="py-3" style={{ width: '11%' }}>Gói bảo hành</th>
                      <th className="py-3 text-center" style={{ width: '13%' }}>
                        {activeTab === 'PENDING' ? 'Trạng thái giao' : 'Ngày nhận & Hạn BH'}
                      </th>
                      <th className="py-3 text-end px-4" style={{ width: '9%' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order, idx) => {
                      const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                      const warrantyInfo = computeWarrantyInfo(order);

                      return (
                        <tr
                          key={order.cycleId || idx}
                          onClick={() => setSelectedOrder(order)}
                          style={{ cursor: 'pointer' }}
                          title="Bấm để xem chi tiết đơn hàng"
                        >
                          {/* STT */}
                          <td className="ps-4 py-3 text-center text-muted fw-semibold font-monospace">
                            {absoluteIndex}
                          </td>

                          {/* Máy & Cấu hình */}
                          <td className="py-3">
                            <div className="fw-bold text-dark">{order.sourceModelText || 'Không rõ dòng máy'}</div>
                            {order.configInfo && (
                              <div className="small text-muted text-truncate mt-1" style={{ maxWidth: '240px' }}>
                                {order.configInfo}
                              </div>
                            )}
                            {(order.orderCode || order.sourceReference) && (
                              <span className="badge bg-light text-secondary border font-monospace mt-1">
                                #{order.orderCode || order.sourceReference}
                              </span>
                            )}
                          </td>

                          {/* Số Serial */}
                          <td className="py-3">
                            <span className="font-monospace fw-semibold bg-light px-2 py-1 rounded border text-dark">
                              {order.serialKey}
                            </span>
                          </td>

                          {/* Khách hàng & SĐT & Vận đơn */}
                          <td className="py-3">
                            <div className="fw-semibold text-dark">{order.customerName || 'Khách lẻ'}</div>
                            <div className="small text-muted">{order.customerPhone || '—'}</div>
                            {(order.shippingCarrier || order.trackingCode) && (
                              <div className="small text-primary mt-1 font-monospace" style={{ fontSize: '11px' }}>
                                🚚 {order.shippingCarrier || 'Vận chuyển'} {order.trackingCode ? `[${order.trackingCode}]` : ''}
                              </div>
                            )}
                            {order.codAmount > 0 && (
                              <div className="small text-danger fw-semibold" style={{ fontSize: '11px' }}>
                                COD: {formatCurrency(order.codAmount)}đ
                              </div>
                            )}
                          </td>

                          {/* Ngày gửi / Ngày bán */}
                          <td className="py-3">
                            <div className="fw-medium text-dark">{formatDate(order.saleDate)}</div>
                            <div className="small text-primary fw-semibold mt-1">
                              {order.salePrice ? formatCurrency(order.salePrice) + ' đ' : '—'}
                            </div>
                          </td>

                          {/* Gói bảo hành */}
                          <td className="py-3">
                            <span className="badge bg-light text-dark border px-2 py-1 fw-semibold">
                              {getCleanWarrantyType(order.warrantyPeriod)}
                            </span>
                          </td>

                          {/* Trạng thái / Ngày nhận */}
                          <td className="py-3 text-center">
                            {activeTab === 'PENDING' ? (
                              <div>
                                <span className="badge rounded-pill px-2.5 py-1 small fw-semibold bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
                                  <Clock size={13} className="me-1 d-inline" />
                                  Chờ khách nhận
                                </span>
                                <div className="small text-muted mt-1" style={{ fontSize: '11px' }}>
                                  Chưa kích hoạt bảo hành
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="badge rounded-pill px-2.5 py-1 small fw-semibold bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                                  <CheckCircle2 size={13} className="me-1 d-inline" />
                                  Đã nhận: {formatDate(order.deliveryDate)}
                                </span>
                                {order.warrantyExpiry && (
                                  <div className="small text-muted mt-1" style={{ fontSize: '11px' }}>
                                    Hạn BH: <strong>{formatDate(order.warrantyExpiry)}</strong>
                                    {warrantyInfo.diffDays !== undefined && (
                                      <span className={`ms-1 fw-medium ${warrantyInfo.status === 'EXPIRED' ? 'text-danger' : 'text-success'}`}>
                                        ({warrantyInfo.status === 'EXPIRED' ? `Hết ${warrantyInfo.diffDays} ngày` : `Còn ${warrantyInfo.diffDays} ngày`})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Nút Thao tác */}
                          <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="d-inline-flex align-items-center gap-1 justify-content-end">
                              {activeTab === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success py-1 px-2.5 fw-medium d-inline-flex align-items-center gap-1 text-white shadow-sm rounded-pill"
                                    onClick={() => handleOpenConfirm(order)}
                                    title="Xác nhận khách đã nhận hàng & Kích hoạt bảo hành"
                                  >
                                    <Truck size={13} />
                                    <span>Đã nhận</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm py-1 px-2.5 fw-medium d-inline-flex align-items-center gap-1 rounded-pill ${canReturnOrder ? 'btn-outline-danger' : 'btn-light text-muted border'}`}
                                    onClick={() => handleOpenReturn(order)}
                                    title={canReturnOrder ? 'Khách từ chối nhận hàng / Hủy giao / Hoàn hàng về kho' : 'Cần quyền: Đổi trả & Hoàn đơn hàng về kho (ORDER_RETURN)'}
                                  >
                                    {canReturnOrder ? <RotateCcw size={13} /> : <Lock size={12} />}
                                    <span>Hoàn hàng</span>
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                className={`btn btn-sm py-1 px-2.5 fw-medium d-inline-flex align-items-center gap-1 rounded-pill ${canEditOrder ? 'btn-outline-primary' : 'btn-light text-muted border'}`}
                                onClick={() => {
                                  if (!requirePermission('ORDER_EDIT', showToast, 'Sửa hóa đơn & đơn hàng đã xuất')) return;
                                  setEditingOrder(order);
                                }}
                                title={canEditOrder ? 'Sửa thông tin đơn máy' : 'Cần quyền: Sửa hóa đơn & Đơn hàng đã xuất (ORDER_EDIT)'}
                              >
                                {canEditOrder ? <Edit3 size={13} /> : <Lock size={12} />}
                                <span>Sửa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 5. Phân Trang (Pagination Footer) */}
              <div className="card-footer bg-white border-top py-3 px-4">
                <PhanTrang
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={orders.length}
                  itemsPerPage={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50]}
                  itemName="đơn ship"
                  showPageNumbers={false}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 6. Modal Chi Tiết Đơn Hàng */}
      {selectedOrder && (
        <ModalChiTietDonHang
          order={selectedOrder}
          statusInfo={computeWarrantyInfo(selectedOrder)}
          onConfirmDelivery={handleOpenConfirm}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* 7. Modal Chỉnh Sửa Đơn Máy */}
      {editingOrder && (
        <ModalSuaDonMay
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            fetchOrders();
            setEditingOrder(null);
          }}
        />
      )}

      {/* 8. Modal Xác Nhận Giao Hàng & Kích Hoạt Bảo Hành */}
      {confirmingOrder && (
        <ModalXacNhanGiaoHang
          order={confirmingOrder}
          confirmDeliveryDate={confirmDeliveryDate}
          setConfirmDeliveryDate={setConfirmDeliveryDate}
          isConfirmingDelivery={isSubmittingDelivery}
          onSubmit={handleConfirmSubmit}
          onClose={() => setConfirmingOrder(null)}
        />
      )}

      {/* Modal Hoàn hàng / Hủy giao */}
      {returningOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header bg-danger bg-opacity-10 border-0 p-4">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 bg-danger bg-opacity-25 text-danger rounded-3">
                    <RotateCcw size={20} />
                  </div>
                  <h5 className="modal-title fw-bold text-danger m-0">Xác Nhận Hoàn Hàng / Giao Thất Bại</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setReturningOrder(null)}
                  disabled={isSubmittingReturn}
                ></button>
              </div>

              <form onSubmit={handleReturnSubmit}>
                <div className="modal-body p-4">
                  <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3">
                    Thao tác này sẽ hủy giao đơn hàng, chuyển trạng thái chu kỳ sang <strong>CUSTOMER_RETURN</strong> và tự động đưa máy trở lại kho hoạt động.
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary text-uppercase mb-1">Máy & Serial</label>
                    <div className="p-2.5 bg-light rounded-3 border">
                      <div className="fw-bold text-dark">{returningOrder.sourceModelText || 'Không rõ dòng máy'}</div>
                      <div className="font-monospace small text-primary fw-bold mt-0.5">Serial: {returningOrder.serialKey}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary text-uppercase mb-1">
                      Lý do hoàn hàng <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control rounded-3"
                      rows="2"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="VD: Khách đổi ý, bom hàng, không liên lạc được..."
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
                      <option value="NEEDS_INSPECTION">Cần kiểm tra / Test lại máy (NEEDS_INSPECTION)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-light rounded-3 border mb-2">
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="restoreAccCheck"
                        checked={restoreAccessories}
                        onChange={(e) => setRestoreAccessories(e.target.checked)}
                      />
                      <label className="form-check-label small fw-semibold text-dark" htmlFor="restoreAccCheck">
                        Hoàn kho các phụ kiện / quà tặng kèm theo đơn
                      </label>
                    </div>

                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="restorePartsCheck"
                        checked={restoreUpgradeParts}
                        onChange={(e) => setRestoreUpgradeParts(e.target.checked)}
                      />
                      <label className="form-check-label small fw-semibold text-dark" htmlFor="restorePartsCheck">
                        Hoàn kho các linh kiện đã nâng cấp (RAM/SSD)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 p-4 pt-0">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4 fw-medium"
                    onClick={() => setReturningOrder(null)}
                    disabled={isSubmittingReturn}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger rounded-pill px-4 fw-medium d-inline-flex align-items-center gap-2 shadow-sm"
                    disabled={isSubmittingReturn}
                  >
                    {isSubmittingReturn ? (
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
      )}

    </div>
  );
}