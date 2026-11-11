import React, { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, FileText, XCircle, X, Laptop, ShoppingBag, Wrench, Info, CheckCircle2, Edit3, Truck, Clock, Calendar, Lock } from 'lucide-react';
import { apiBaoHanh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import ModalChiTietDonHang from './ModalChiTietDonHang';
import ModalSuaDonMay from './ModalSuaDonMay';
import ModalSuaDonPhuKien from './ModalSuaDonPhuKien';
import ModalSuaDonSuaChua from './ModalSuaDonSuaChua';
import { getCleanWarrantyType, formatCurrency, formatDate, getTodayDateString } from '../../utils/dinh_dang';

export default function TrangKiemTraBaoHanh() {
  const { showToast, confirm } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const canEditOrder = hasPermission('ORDER_EDIT');
  const canManageShip = hasPermission('SHIP_MANAGE');
  const canReturnOrder = hasPermission('ORDER_RETURN');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dữ liệu tra cứu hợp nhất
  const [machines, setMachines] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [repairs, setRepairs] = useState([]);

  // Phân loại tìm kiếm: 'MACHINES' | 'ACCESSORIES' | 'REPAIRS' (chỉ tìm trong danh mục đang chọn)
  const [searchCategory, setSearchCategory] = useState('MACHINES');

  // Active Tab hiển thị kết quả: 'MACHINES' | 'ACCESSORIES' | 'REPAIRS'
  const [activeTab, setActiveTab] = useState('MACHINES');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState(null);
  const [selectedAccessoryOrder, setSelectedAccessoryOrder] = useState(null);

  // Modal chỉnh sửa các hóa đơn
  const [editingMachineOrder, setEditingMachineOrder] = useState(null);
  const [editingAccessoryOrder, setEditingAccessoryOrder] = useState(null);
  const [editingRepairOrder, setEditingRepairOrder] = useState(null);

  // Modal xác nhận khách đã nhận hàng (Đơn ship xa)
  const [confirmingDeliveryOrder, setConfirmingDeliveryOrder] = useState(null);
  const [confirmDeliveryDate, setConfirmDeliveryDate] = useState(getTodayDateString());
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);

  const handleOpenConfirmDelivery = (order) => {
    if (!requirePermission('SHIP_MANAGE', showToast, 'Xác nhận khách nhận hàng đơn ship xa')) return;
    setConfirmingDeliveryOrder(order);
    setConfirmDeliveryDate(getTodayDateString());
  };

  const handleOpenEditMachineOrder = (order) => {
    if (!requirePermission('ORDER_EDIT', showToast, 'Chỉnh sửa thông tin đơn máy đã bán')) return;
    setEditingMachineOrder(order);
  };

  const handleOpenEditAccessoryOrder = (order) => {
    if (!requirePermission('ORDER_EDIT', showToast, 'Chỉnh sửa hóa đơn phụ kiện đã bán')) return;
    setEditingAccessoryOrder(order);
  };

  const handleOpenEditRepairOrder = (order) => {
    if (!requirePermission('ORDER_EDIT', showToast, 'Chỉnh sửa phiếu dịch vụ sửa chữa')) return;
    setEditingRepairOrder(order);
  };

  const handleReturnOrder = async (order) => {
    if (!requirePermission('ORDER_RETURN', showToast, 'Hoàn trả / Thu hồi máy vào kho')) return;
    const isConfirmed = await confirm(`Bạn có chắc chắn muốn hoàn trả / thu hồi máy ${order.serialKey} về lại kho sẵn sàng bán?`);
    if (!isConfirmed) return;
    try {
      await apiBaoHanh.returnOrder(order.cycleId, {
        reason: 'Khách hoàn trả / Đổi trả máy từ màn hình Tra cứu bảo hành'
      });
      showToast(`Đã hoàn trả máy ${order.serialKey} về kho thành công!`, 'success');
      setSelectedOrder(null);
      handleSearch();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi hoàn trả máy về kho', 'danger');
    }
  };

  const handleConfirmDeliverySubmit = async (e) => {
    e?.preventDefault();
    if (!confirmingDeliveryOrder || !confirmDeliveryDate) return;

    setIsConfirmingDelivery(true);
    try {
      const res = await apiBaoHanh.confirmDelivery(confirmingDeliveryOrder.cycleId, {
        deliveryDate: confirmDeliveryDate
      });
      const updatedOrder = res.data?.data || res.data;
      showToast(`Đã xác nhận khách nhận máy ${confirmingDeliveryOrder.serialKey}! Bảo hành đã được kích hoạt.`, 'success');

      setMachines(prev => prev.map(m => m.cycleId === confirmingDeliveryOrder.cycleId ? { ...m, ...updatedOrder } : m));
      if (selectedOrder && selectedOrder.cycleId === confirmingDeliveryOrder.cycleId) {
        setSelectedOrder(prev => ({ ...prev, ...updatedOrder }));
      }
      setConfirmingDeliveryOrder(null);
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi xác nhận nhận hàng', 'danger');
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await apiBaoHanh.checkWarranty(keyword.trim());
      const data = res.data?.data || res.data || {};
      
      if (Array.isArray(data)) {
        if (searchCategory === 'MACHINES') {
          setMachines(data);
        } else {
          setMachines([]);
        }
        setAccessories([]);
        setRepairs([]);
        setActiveTab(searchCategory);
      } else {
        const m = data.machines || [];
        const a = data.accessories || [];
        const r = data.repairs || [];

        // Chỉ lưu và hiển thị đúng danh mục người dùng đã chọn
        if (searchCategory === 'MACHINES') {
          setMachines(m);
          setAccessories([]);
          setRepairs([]);
          setActiveTab('MACHINES');
          if (selectedOrder) {
            const updated = m.find(item => item.cycleId === selectedOrder.cycleId);
            if (updated) setSelectedOrder(updated);
          }
        } else if (searchCategory === 'ACCESSORIES') {
          setMachines([]);
          setAccessories(a);
          setRepairs([]);
          setActiveTab('ACCESSORIES');
          if (selectedAccessoryOrder) {
            const updated = a.find(item => item.id === selectedAccessoryOrder.id);
            if (updated) setSelectedAccessoryOrder(updated);
          }
        } else if (searchCategory === 'REPAIRS') {
          setMachines([]);
          setAccessories([]);
          setRepairs(r);
          setActiveTab('REPAIRS');
          if (selectedRepairOrder) {
            const updated = r.find(item => item.id === selectedRepairOrder.id);
            if (updated) setSelectedRepairOrder(updated);
          }
        }
      }

    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi tra cứu bảo hành', 'danger');
      setMachines([]);
      setAccessories([]);
      setRepairs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setKeyword('');
    setMachines([]);
    setAccessories([]);
    setRepairs([]);
    setHasSearched(false);
    setSelectedOrder(null);
  };

  const getWarrantyStatus = (saleDate, warrantyPeriod, isVoided, warrantyExpiry, isInStock, isShipping, isDelivered, deliveryDate, closeType) => {
    if (isInStock) {
      const now = new Date();
      let end = warrantyExpiry ? new Date(warrantyExpiry) : null;
      if (end) {
        end.setHours(23, 59, 59, 999);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (now > end) {
          return {
            status: 'IN_STOCK_EXPIRED',
            text: 'Tồn kho (Hết BH)',
            badge: 'bg-warning bg-opacity-25 text-dark border border-warning',
            icon: AlertCircle,
            endDate: end,
            diffDays: Math.abs(diffDays)
          };
        }
        return {
          status: 'IN_STOCK',
          text: 'Tồn kho (Còn BH)',
          badge: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25',
          icon: ShieldCheck,
          endDate: end,
          diffDays
        };
      }
      return {
        status: 'IN_STOCK',
        text: 'Tồn kho (Chưa bán)',
        badge: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25',
        icon: ShieldCheck,
        endDate: null
      };
    }

    // Đơn hàng đã thu lại hoặc đã vô hiệu hóa vòng bán
    if (isVoided || closeType === 'CUSTOMER_RETURN') {
      let end = null;
      if (warrantyExpiry) {
        end = new Date(warrantyExpiry);
        end.setHours(23, 59, 59, 999);
      }
      return {
        status: 'VOIDED',
        text: 'Đã thu lại (Vô hiệu)',
        badge: 'bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25',
        icon: XCircle,
        endDate: end
      };
    }

    // Đơn ship xa chưa nhận hàng: Ghi nhận là Chờ, chưa tính thời gian bảo hành
    if (isShipping && !isDelivered) {
      return {
        status: 'PENDING_DELIVERY',
        text: 'Chờ khách nhận hàng',
        badge: 'bg-warning bg-opacity-25 text-warning-emphasis border border-warning',
        icon: Truck,
        endDate: null,
        diffDays: undefined,
        isShippingPending: true
      };
    }

    if (!saleDate && !warrantyExpiry && !deliveryDate) {
      return {
        status: 'UNKNOWN',
        text: 'Không xác định',
        badge: 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25',
        icon: AlertCircle,
        endDate: null
      };
    }

    const now = new Date();
    let end;

    const baseDate = (isShipping && isDelivered && deliveryDate) ? deliveryDate : saleDate;

    if (warrantyExpiry) {
      end = new Date(warrantyExpiry);
      end.setHours(23, 59, 59, 999);
    } else if (warrantyPeriod) {
      const dateMatch = warrantyPeriod.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        const year = parseInt(dateMatch[3]);
        end = new Date(year, month, day, 23, 59, 59, 999);
      } else if (warrantyPeriod.toLowerCase().includes('tháng')) {
        const monthMatch = warrantyPeriod.match(/(\d+)/);
        if (monthMatch && baseDate) {
          const months = parseInt(monthMatch[1]);
          const sale = new Date(baseDate);
          end = new Date(sale.setMonth(sale.getMonth() + months));
          end.setHours(23, 59, 59, 999);
        }
      } else if (warrantyPeriod.toLowerCase().includes('năm')) {
        const yearMatch = warrantyPeriod.match(/(\d+)/);
        if (yearMatch && baseDate) {
          const years = parseInt(yearMatch[1]);
          const sale = new Date(baseDate);
          end = new Date(sale.setFullYear(sale.getFullYear() + years));
          end.setHours(23, 59, 59, 999);
        }
      } else if (warrantyPeriod.toLowerCase().includes('ngày')) {
        const dayMatch = warrantyPeriod.match(/(\d+)/);
        if (dayMatch && baseDate) {
          const days = parseInt(dayMatch[1]);
          const sale = new Date(baseDate);
          end = new Date(sale.setDate(sale.getDate() + days));
          end.setHours(23, 59, 59, 999);
        }
      }
    }

    if (isVoided) {
      return {
        status: 'VOIDED',
        text: 'Đã thu lại (Vô hiệu)',
        badge: 'bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25',
        icon: XCircle,
        endDate: end
      };
    }

    if (end) {
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
      } else {
        return {
          status: 'VALID',
          text: 'Còn hạn bảo hành',
          badge: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25',
          icon: ShieldCheck,
          endDate: end,
          diffDays
        };
      }
    }

    return {
      status: 'CUSTOM',
      text: 'Theo thỏa thuận',
      badge: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25',
      icon: FileText,
      endDate: null
    };
  };

  const getItemExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return {
        text: 'Không bảo hành',
        badge: 'bg-secondary bg-opacity-10 text-secondary',
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
        badge: 'bg-danger bg-opacity-10 text-danger',
        icon: AlertCircle
      };
    }
    return {
      text: `Còn hạn (${diffDays} ngày)`,
      badge: 'bg-success bg-opacity-10 text-success',
      icon: ShieldCheck
    };
  };

  const totalResults = machines.length + accessories.length + repairs.length;

  return (
    <div className="container-fluid py-4 bg-light min-vh-100 d-flex flex-column gap-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-3 d-flex align-items-center justify-content-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              Tra Cứu Bảo Hành & Đơn Hàng
              <div className="text-secondary fw-normal fs-6 mt-1">Đồng bộ tra cứu Máy tính, Phụ kiện và Dịch vụ sửa chữa</div>
            </div>
          </h2>
        </div>
      </div>

      {/* SEARCH SECTION */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-body p-4 p-md-5 bg-white">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9 text-center">
              <h5 className="fw-bold text-dark mb-3">Lựa chọn danh mục và nhập thông tin tra cứu</h5>

              {/* Bộ chọn danh mục: Chỉ tìm theo 1 danh mục cụ thể */}
              <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
                <button
                  type="button"
                  className={`btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                    searchCategory === 'MACHINES'
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-secondary border'
                  }`}
                  onClick={() => {
                    setSearchCategory('MACHINES');
                    setActiveTab('MACHINES');
                    setAccessories([]);
                    setRepairs([]);
                  }}
                >
                  <Laptop size={18} />
                  <span>Máy tính {hasSearched && searchCategory === 'MACHINES' ? `(${machines.length})` : '(Shop)'}</span>
                </button>
                <button
                  type="button"
                  className={`btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                    searchCategory === 'ACCESSORIES'
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-secondary border'
                  }`}
                  onClick={() => {
                    setSearchCategory('ACCESSORIES');
                    setActiveTab('ACCESSORIES');
                    setMachines([]);
                    setRepairs([]);
                  }}
                >
                  <ShoppingBag size={18} />
                  <span>Phụ kiện {hasSearched && searchCategory === 'ACCESSORIES' ? `(${accessories.length})` : '(Lẻ)'}</span>
                </button>
                <button
                  type="button"
                  className={`btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                    searchCategory === 'REPAIRS'
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-secondary border'
                  }`}
                  onClick={() => {
                    setSearchCategory('REPAIRS');
                    setActiveTab('REPAIRS');
                    setMachines([]);
                    setAccessories([]);
                  }}
                >
                  <Wrench size={18} />
                  <span>Sửa chữa {hasSearched && searchCategory === 'REPAIRS' ? `(${repairs.length})` : '(Dịch vụ)'}</span>
                </button>
              </div>

              {/* Ô input tìm kiếm */}
              <form onSubmit={handleSearch} className="row g-3 align-items-center justify-content-center">
                <div className="col-12 col-md-9 position-relative">
                  <Search className="position-absolute top-50 translate-middle-y text-muted ms-3" size={22} style={{ left: '15px' }} />
                  <input
                    type="text"
                    className="form-control form-control-lg rounded-pill ps-5 pe-5 shadow-sm border-2"
                    style={{ backgroundColor: '#fdfdfe', borderColor: '#e9ecef', height: '56px' }}
                    placeholder={
                      searchCategory === 'MACHINES'
                        ? 'Nhập Serial máy, SĐT khách hàng, Tên model laptop...'
                        : searchCategory === 'ACCESSORIES'
                        ? 'Nhập SĐT khách hàng, Tên phụ kiện, Mã đơn hàng...'
                        : searchCategory === 'REPAIRS'
                        ? 'Nhập SĐT khách hàng, Mã phiếu sửa chữa, Model máy...'
                        : 'Nhập SĐT khách hàng, Số Serial, Tên khách hoặc Mã đơn...'
                    }
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  {keyword && (
                    <X
                      className="position-absolute top-50 translate-middle-y text-muted hover-dark"
                      size={20}
                      style={{ right: '25px', cursor: 'pointer' }}
                      onClick={clearSearch}
                    />
                  )}
                </div>

                <div className="col-12 col-md-3">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg rounded-pill w-100 d-flex align-items-center justify-content-center fw-bold shadow-sm"
                    style={{ height: '56px' }}
                    disabled={isLoading || !keyword.trim()}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <Search size={20} className="me-2" />
                    )}
                    Tra cứu ngay
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>

      {/* RESULTS SECTION */}
      {hasSearched && (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h5 className="card-title fw-bold m-0 text-dark">
                Kết quả tra cứu cho "{keyword}"
              </h5>
              <div className="text-secondary small mt-1 d-flex align-items-center gap-1">
                <Info size={14} className="text-primary" />
                <span>Tìm thấy tổng cộng <strong>{totalResults}</strong> bản ghi bảo hành khớp dữ liệu</span>
              </div>
            </div>

            {/* Category Indicator */}
            <div className="d-flex align-items-center">
              {searchCategory === 'MACHINES' && (
                <div className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <Laptop size={18} />
                  <span>Danh mục: Máy tính ({machines.length})</span>
                </div>
              )}
              {searchCategory === 'ACCESSORIES' && (
                <div className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <ShoppingBag size={18} />
                  <span>Danh mục: Phụ kiện ({accessories.length})</span>
                </div>
              )}
              {searchCategory === 'REPAIRS' && (
                <div className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <Wrench size={18} />
                  <span>Danh mục: Dịch vụ sửa chữa ({repairs.length})</span>
                </div>
              )}
            </div>
          </div>

          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <h6 className="text-muted fw-semibold">Đang tổng hợp dữ liệu bảo hành từ hệ thống...</h6>
              </div>
            ) : totalResults === 0 ? (
              <div className="text-center py-5 my-3">
                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 shadow-sm">
                  <FileText size={48} className="text-secondary opacity-50" />
                </div>
                <h5 className="fw-bold text-dark">Không tìm thấy thông tin phù hợp</h5>
                <p className="text-muted mb-3">Không có máy tính, phụ kiện hay phiếu sửa chữa nào khớp với từ khóa <strong className="text-dark">"{keyword}"</strong></p>
                <button className="btn btn-outline-primary rounded-pill px-4 fw-semibold" onClick={clearSearch}>
                  Xóa tìm kiếm & Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* TAB 1: MÁY MUA TẠI SHOP */}
                {activeTab === 'MACHINES' && (
                  machines.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 bg-white">
                        <thead className="table-light text-secondary small text-uppercase fw-semibold">
                          <tr>
                            <th className="px-4 py-3" style={{ width: '24%' }}>Máy & Cấu hình</th>
                            <th className="py-3" style={{ width: '13%' }}>Số Serial</th>
                            <th className="py-3" style={{ width: '14%' }}>Khách hàng</th>
                            <th className="py-3" style={{ width: '13%' }}>Giá & Ngày bán</th>
                            <th className="py-3 text-center" style={{ width: '11%' }}>Gói bảo hành</th>
                            <th className="py-3" style={{ width: '12%' }}>Ngày hết hạn</th>
                            <th className="py-3 text-center" style={{ width: '11%' }}>Trạng thái</th>
                            <th className="py-3 text-end px-4" style={{ width: '11%' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machines.map((item, index) => {
                            const statusInfo = getWarrantyStatus(item.saleDate, item.warrantyPeriod, item.isVoided, item.warrantyExpiry, item.isInStock, item.isShipping, item.isDelivered, item.deliveryDate, item.closeType);
                            const StatusIcon = statusInfo.icon;
                            return (
                              <tr key={item.cycleId || index} onClick={() => setSelectedOrder(item)} style={{ cursor: 'pointer' }} title="Bấm để xem chi tiết đơn hàng">
                                <td className="px-4 py-3">
                                  <div className="fw-bold text-dark">{item.sourceModelText || 'Không rõ dòng máy'}</div>
                                  {item.configInfo && (
                                    <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '280px' }}>{item.configInfo}</div>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span className="font-monospace fw-semibold bg-light px-2 py-1 rounded border text-dark">{item.serialKey}</span>
                                </td>
                                <td className="py-3">
                                  <div className="fw-semibold text-dark d-flex align-items-center gap-1 flex-wrap">
                                    <span>{item.customerName || 'Khách lẻ'}</span>
                                    {(item.isVoided || item.closeType === 'CUSTOMER_RETURN') && (
                                      <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle" style={{ fontSize: '10px' }}>
                                        Đã thu máy
                                      </span>
                                    )}
                                  </div>
                                  <div className="small text-muted">{item.customerPhone}</div>
                                </td>
                                <td className="py-3">
                                  <div className="fw-semibold text-primary mb-1">{item.salePrice ? formatCurrency(item.salePrice) + ' đ' : '—'}</div>
                                  {Number(item.discount) > 0 && (
                                    <div className="small text-danger fw-medium" style={{ fontSize: '11px' }}>
                                      (Giảm: -{formatCurrency(item.discount)} đ)
                                    </div>
                                  )}
                                  <div className="small text-secondary">{item.saleDate ? new Date(item.saleDate).toLocaleDateString('vi-VN') : '—'}</div>
                                </td>
                                <td className="py-3 text-center">
                                  <span className="badge bg-light text-dark border px-2 py-1 fw-semibold">{getCleanWarrantyType(item.warrantyPeriod)}</span>
                                </td>
                                <td className="py-3">
                                  {item.isInStock ? (
                                    statusInfo.endDate ? (
                                      <div>
                                        <div className="fw-medium text-dark">{statusInfo.endDate.toLocaleDateString('vi-VN')}</div>
                                        <div className="small text-muted">(Hạn hãng)</div>
                                      </div>
                                    ) : (
                                      <span className="badge bg-light text-secondary border font-monospace">Kích hoạt khi bán</span>
                                    )
                                  ) : statusInfo.status === 'PENDING_DELIVERY' ? (
                                    <div>
                                      <div className="text-warning-emphasis fw-medium small d-flex align-items-center">
                                        <Clock size={13} className="me-1 text-warning flex-shrink-0" />
                                        <span>Chờ nhận hàng</span>
                                      </div>
                                      <div className="small text-muted" style={{ fontSize: '11px' }}>Kích hoạt khi nhận</div>
                                    </div>
                                  ) : statusInfo.endDate ? (
                                    <div>
                                      <div className="fw-medium text-dark">{statusInfo.endDate.toLocaleDateString('vi-VN')}</div>
                                      {statusInfo.diffDays !== undefined && (
                                        <div className={`small fw-medium ${statusInfo.status === 'EXPIRED' ? 'text-danger' : 'text-muted'}`}>
                                          {statusInfo.status === 'EXPIRED' ? `Hết hạn ${statusInfo.diffDays} ngày` : `Còn ${statusInfo.diffDays} ngày`}
                                        </div>
                                      )}
                                    </div>
                                  ) : '—'}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`badge rounded-pill px-2 py-1 small fw-semibold ${statusInfo.badge}`}>
                                    <StatusIcon size={14} className="me-1 mb-1 d-inline" />
                                    {statusInfo.text}
                                  </span>
                                  {item.currentMachineStateText && (
                                    <div className="mt-1">
                                      <span
                                        className={`badge ${item.isInStockNow ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-secondary border'}`}
                                        style={{ fontSize: '10px', whiteSpace: 'normal', display: 'inline-block', lineHeight: 1.2 }}
                                        title="Trạng thái máy hiện tại trong hệ thống"
                                      >
                                        📦 {item.currentMachineStateText}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                                  {!item.isInStock ? (
                                    <div className="d-inline-flex align-items-center gap-1 justify-content-end">
                                      {item.isShipping && !item.isDelivered && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-success py-1 px-2 fw-medium d-inline-flex align-items-center gap-1 text-white shadow-sm"
                                          onClick={() => handleOpenConfirmDelivery(item)}
                                          title={canManageShip ? 'Xác nhận khách đã nhận hàng & Kích hoạt bảo hành' : 'Yêu cầu quyền: Quản lý đơn ship'}
                                        >
                                          <Truck size={13} />
                                          <span>Đã nhận</span>
                                          {!canManageShip && <Lock size={11} className="text-warning" />}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary py-1 px-2 fw-medium d-inline-flex align-items-center gap-1"
                                        onClick={() => handleOpenEditMachineOrder(item)}
                                        title={canEditOrder ? 'Chỉnh sửa thông tin đơn máy này' : 'Yêu cầu quyền: Sửa thông tin đơn bán'}
                                      >
                                        <Edit3 size={13} />
                                        <span>Sửa</span>
                                        {!canEditOrder && <Lock size={11} className="text-warning" />}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="badge bg-light text-secondary border">Trong kho</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-muted">Không có máy tính nào mua tại shop khớp với từ khóa tìm kiếm.</div>
                  )
                )}

                {/* TAB 2: PHỤ KIỆN ĐÃ MUA */}
                {activeTab === 'ACCESSORIES' && (
                  accessories.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 bg-white">
                        <thead className="table-light text-secondary small text-uppercase fw-semibold">
                          <tr>
                            <th className="px-4 py-3" style={{ width: '170px' }}>Mã đơn & Ngày bán</th>
                            <th className="py-3" style={{ width: '220px' }}>Khách hàng & SĐT</th>
                            <th className="py-3">Danh sách phụ kiện</th>
                            <th className="py-3 text-end" style={{ width: '140px' }}>Tổng thanh toán</th>
                            <th className="py-3 text-center" style={{ width: '150px' }}>Trạng thái BH</th>
                            <th className="py-3 text-end px-4" style={{ width: '110px' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessories.map((ord, idx) => {
                            const saleDateText = formatDate(ord.saleDate);
                            const now = new Date();
                            const hasValidWarranty = ord.items?.some(it => {
                              if (!it.warrantyExpiry) return false;
                              const end = new Date(it.warrantyExpiry);
                              end.setHours(23, 59, 59, 999);
                              return end >= now;
                            });
                            const hasAnyWarranty = ord.items?.some(it => it.warrantyMonths > 0 || it.warrantyExpiry);

                            return (
                              <tr
                                key={ord.id || idx}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedAccessoryOrder(ord)}
                                title="Nhấp để xem chi tiết đầy đủ đơn bán phụ kiện"
                              >
                                <td className="px-4 py-3">
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold px-2 py-1">
                                    {ord.orderCode || 'Lẻ'}
                                  </span>
                                  <div className="small text-muted mt-1">{saleDateText}</div>
                                </td>
                                <td className="py-3">
                                  <div className="fw-semibold text-dark">{ord.customerName || 'Khách vãng lai'}</div>
                                  <div className="small text-secondary">{ord.customerPhone || '—'}</div>
                                </td>
                                <td className="py-3">
                                  <div className="d-flex flex-wrap gap-1">
                                    {ord.items && ord.items.length > 0 ? (
                                      ord.items.map((it, iIdx) => (
                                        <span key={iIdx} className="badge bg-light text-dark border p-1 px-2 fw-normal">
                                          <strong className="text-primary">{it.accessoryName}</strong>
                                          {it.quantity > 1 && ` (x${it.quantity})`}
                                          {it.warrantyPeriod ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyPeriod}]</span>
                                          ) : it.warrantyMonths > 0 ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyMonths}T]</span>
                                          ) : (
                                            <span className="ms-1 text-muted">[0T]</span>
                                          )}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-muted small">Không có sản phẩm</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 text-end">
                                  <span className="fw-bold text-primary">
                                    {formatCurrency(ord.finalAmount ?? ord.totalAmount ?? 0)} đ
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  {hasValidWarranty ? (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1">
                                      <ShieldCheck size={12} className="me-1 mb-1 d-inline" /> Còn hạn BH
                                    </span>
                                  ) : hasAnyWarranty ? (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2 py-1">
                                      <AlertCircle size={12} className="me-1 mb-1 d-inline" /> Hết hạn BH
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1">
                                      Không bảo hành
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="d-flex justify-content-end gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary py-1 px-2 fw-medium d-inline-flex align-items-center gap-1"
                                      onClick={() => handleOpenEditAccessoryOrder(ord)}
                                      title={canEditOrder ? 'Chỉnh sửa hóa đơn phụ kiện này' : 'Yêu cầu quyền: Sửa thông tin đơn bán'}
                                    >
                                      <Edit3 size={13} />
                                      <span>Sửa</span>
                                      {!canEditOrder && <Lock size={11} className="text-warning" />}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border py-1 px-2 fw-medium"
                                      onClick={() => setSelectedAccessoryOrder(ord)}
                                    >
                                      Chi tiết
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
                    <div className="p-5 text-center text-muted">Không có phụ kiện nào khớp với từ khóa tìm kiếm.</div>
                  )
                )}


                {/* TAB 3: DỊCH VỤ SỬA CHỮA */}
                {activeTab === 'REPAIRS' && (
                  repairs.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 bg-white">
                        <thead className="table-light text-secondary small text-uppercase fw-semibold">
                          <tr>
                            <th className="px-4 py-3" style={{ width: '170px' }}>Mã phiếu & Ngày làm</th>
                            <th className="py-3" style={{ width: '220px' }}>Thiết bị & Khách hàng</th>
                            <th className="py-3">Các dịch vụ & Linh kiện</th>
                            <th className="py-3 text-end" style={{ width: '140px' }}>Tổng hóa đơn</th>
                            <th className="py-3 text-center" style={{ width: '150px' }}>Trạng thái BH</th>
                            <th className="py-3 text-end px-4" style={{ width: '110px' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repairs.map((ord, idx) => {
                            const createdDateText = formatDate(ord.createdDate);
                            const now = new Date();
                            const hasValidWarranty = ord.items?.some(it => {
                              if (!it.warrantyExpiry) return false;
                              const end = new Date(it.warrantyExpiry);
                              end.setHours(23, 59, 59, 999);
                              return end >= now;
                            });
                            const hasAnyWarranty = ord.items?.some(it => it.warrantyMonths > 0 || it.warrantyExpiry);

                            return (
                              <tr
                                key={ord.id || idx}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedRepairOrder(ord)}
                                title="Nhấp để xem chi tiết đầy đủ của phiếu sửa chữa"
                              >
                                <td className="px-4 py-3">
                                  <span className="badge bg-warning bg-opacity-20 text-warning-emphasis fw-bold px-2 py-1">
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
                                    {ord.items && ord.items.length > 0 ? (
                                      ord.items.map((it, iIdx) => (
                                        <span key={iIdx} className="badge bg-light text-dark border p-1 px-2 fw-normal">
                                          <strong className="text-primary">{it.serviceName}</strong>
                                          {it.quantity > 1 && ` (x${it.quantity})`}
                                          {it.warrantyPeriod ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyPeriod}]</span>
                                          ) : it.warrantyMonths > 0 ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyMonths}T]</span>
                                          ) : (
                                            <span className="ms-1 text-muted">[KBH]</span>
                                          )}

                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-muted small">Không có dịch vụ</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 text-end">
                                  <span className="fw-bold text-danger">
                                    {formatCurrency(ord.totalAmount)} đ
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  {hasValidWarranty ? (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1">
                                      <ShieldCheck size={12} className="me-1 mb-1 d-inline" /> Còn hạn BH
                                    </span>
                                  ) : hasAnyWarranty ? (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2 py-1">
                                      <AlertCircle size={12} className="me-1 mb-1 d-inline" /> Hết hạn BH
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1">
                                      Không bảo hành
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="d-flex justify-content-end gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary py-1 px-2 fw-medium d-inline-flex align-items-center gap-1"
                                      onClick={() => handleOpenEditRepairOrder(ord)}
                                      title={canEditOrder ? 'Chỉnh sửa phiếu dịch vụ này' : 'Yêu cầu quyền: Sửa thông tin đơn bán'}
                                    >
                                      <Edit3 size={13} />
                                      <span>Sửa</span>
                                      {!canEditOrder && <Lock size={11} className="text-warning" />}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border py-1 px-2 fw-medium"
                                      onClick={() => setSelectedRepairOrder(ord)}
                                    >
                                      Chi tiết
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
                    <div className="p-5 text-center text-muted">Không có dịch vụ sửa chữa nào khớp với từ khóa tìm kiếm.</div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Đơn Hàng Máy */}
      {selectedOrder && (
        <ModalChiTietDonHang
          order={selectedOrder}
          statusInfo={getWarrantyStatus(
            selectedOrder.saleDate,
            selectedOrder.warrantyPeriod,
            selectedOrder.isVoided,
            selectedOrder.warrantyExpiry,
            selectedOrder.isInStock,
            selectedOrder.isShipping,
            selectedOrder.isDelivered,
            selectedOrder.deliveryDate,
            selectedOrder.closeType
          )}
          onConfirmDelivery={handleOpenConfirmDelivery}
          onReturnOrder={handleReturnOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Modal Xác Nhận Giao Hàng & Kích Hoạt Bảo Hành */}
      {confirmingDeliveryOrder && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0 rounded-4">
              <div className="modal-header bg-success text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Truck size={20} />
                  Xác Nhận Khách Đã Nhận Hàng
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setConfirmingDeliveryOrder(null)}
                  disabled={isConfirmingDelivery}
                />
              </div>
              <form onSubmit={handleConfirmDeliverySubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="fw-bold text-dark mb-1">
                      {confirmingDeliveryOrder.sourceModelText || 'Máy tính'}
                    </div>
                    <div className="small text-muted font-monospace mb-1">
                      Serial: <strong className="text-primary">{confirmingDeliveryOrder.serialKey}</strong>
                    </div>
                    <div className="small text-muted">
                      Khách hàng: <strong className="text-dark">{confirmingDeliveryOrder.customerName || 'Khách lẻ'}</strong> - {confirmingDeliveryOrder.customerPhone || '—'}
                    </div>
                    <div className="small text-muted mt-1">
                      Gói bảo hành: <span className="badge bg-primary ms-1">{confirmingDeliveryOrder.warrantyPeriod || 'Theo máy'}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                      <Calendar size={15} className="text-success" />
                      Ngày khách nhận hàng thực tế <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control border-success fw-medium"
                      value={confirmDeliveryDate}
                      onChange={(e) => setConfirmDeliveryDate(e.target.value)}
                      required
                    />
                    <div className="form-text small text-muted">
                      Thời gian bảo hành của máy sẽ bắt đầu được tính từ mốc ngày này.
                    </div>
                  </div>

                  <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-0 rounded-3">
                    <Info size={16} className="text-info flex-shrink-0" />
                    <span>Sau khi xác nhận, đơn sẽ hoàn tất và kích hoạt hạn bảo hành tương ứng với gói của máy.</span>
                  </div>
                </div>

                <div className="modal-footer bg-light d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary px-4 rounded-pill"
                    onClick={() => setConfirmingDeliveryOrder(null)}
                    disabled={isConfirmingDelivery}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success px-4 rounded-pill fw-bold d-flex align-items-center gap-2 text-white"
                    disabled={isConfirmingDelivery}
                  >
                    {isConfirmingDelivery ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>Xác nhận & Kích hoạt BH</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Hóa Đơn Dịch Vụ Sửa Chữa */}
      {selectedRepairOrder && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow border-0 rounded-4">
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Wrench size={20} />
                  Chi Tiết Phiếu Dịch Vụ Sửa Chữa #{selectedRepairOrder.orderCode}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light text-primary fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
                    onClick={() => handleOpenEditRepairOrder(selectedRepairOrder)}
                    title={canEditOrder ? 'Sửa phiếu dịch vụ' : 'Yêu cầu quyền: Sửa thông tin đơn bán'}
                  >
                    <Edit3 size={14} />
                    <span>Sửa phiếu</span>
                    {!canEditOrder && <Lock size={12} className="text-warning" />}
                  </button>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedRepairOrder(null)}
                  />
                </div>
              </div>

              <div className="modal-body p-4">
                {/* Thông tin chung của phiếu */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2">
                    <div className="col-sm-6"><strong>Mã hóa đơn:</strong> <span className="badge bg-warning bg-opacity-20 text-warning-emphasis fw-bold ms-1">{selectedRepairOrder.orderCode}</span></div>
                    <div className="col-sm-6"><strong>Ngày thực hiện:</strong> {formatDate(selectedRepairOrder.createdDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> <span className="fw-semibold text-dark">{selectedRepairOrder.customerName}</span></div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedRepairOrder.customerPhone}</span></div>
                    <div className="col-sm-6"><strong>Thiết bị sửa chữa:</strong> <span className="text-primary fw-bold">{selectedRepairOrder.deviceModel}</span></div>
                    <div className="col-sm-6"><strong>Kỹ thuật viên:</strong> {selectedRepairOrder.technicianName || '—'}</div>
                    {selectedRepairOrder.note && (
                      <div className="col-12 mt-1"><strong>Ghi chú đơn:</strong> <span className="text-muted">{selectedRepairOrder.note}</span></div>
                    )}
                    <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                      <strong className="fs-6">Tổng tiền thanh toán:</strong>
                      <span className="text-danger fw-bold fs-5">{formatCurrency(selectedRepairOrder.totalAmount)} đ</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách các dịch vụ & linh kiện */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '110px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Hạn BH</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '140px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRepairOrder.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.serviceName}</strong>
                              {it.note && <div className="small text-muted">Ghi chú: {it.note}</div>}
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyPeriod ? (
                                <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                              ) : it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary">Không BH</span>
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

              <div className="modal-footer bg-light d-flex justify-content-end">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedRepairOrder(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Hóa Đơn Bán Phụ Kiện */}
      {selectedAccessoryOrder && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow border-0 rounded-4">
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <ShoppingBag size={20} />
                  Chi Tiết Hóa Đơn Phụ Kiện #{selectedAccessoryOrder.orderCode || 'Lẻ'}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light text-primary fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
                    onClick={() => handleOpenEditAccessoryOrder(selectedAccessoryOrder)}
                    title={canEditOrder ? 'Sửa hóa đơn phụ kiện' : 'Yêu cầu quyền: Sửa thông tin đơn bán'}
                  >
                    <Edit3 size={14} />
                    <span>Sửa hóa đơn</span>
                    {!canEditOrder && <Lock size={12} className="text-warning" />}
                  </button>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedAccessoryOrder(null)}
                  />
                </div>
              </div>


              <div className="modal-body p-4">
                {/* Thông tin đơn bán */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <strong>Mã hóa đơn:</strong>{' '}
                      <span className="badge bg-primary text-white fw-bold ms-1 px-2 py-1">
                        {selectedAccessoryOrder.orderCode || 'Lẻ'}
                      </span>
                    </div>
                    <div className="col-sm-6"><strong>Ngày bán:</strong> {formatDate(selectedAccessoryOrder.saleDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> <span className="fw-semibold text-dark">{selectedAccessoryOrder.customerName || 'Khách vãng lai'}</span></div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedAccessoryOrder.customerPhone || '—'}</span></div>
                    <div className="col-sm-6"><strong>Nhân viên bán:</strong> {selectedAccessoryOrder.salesperson || '—'}</div>
                    {selectedAccessoryOrder.saleNote && (
                      <div className="col-12 mt-1"><strong>Ghi chú đơn:</strong> <span className="text-muted">{selectedAccessoryOrder.saleNote}</span></div>
                    )}
                    <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                      <div>
                        {selectedAccessoryOrder.discount > 0 && (
                          <span className="text-muted small me-2">
                            (Giảm giá: -{formatCurrency(selectedAccessoryOrder.discount)} đ)
                          </span>
                        )}
                        <strong className="fs-6">Tổng tiền thanh toán:</strong>
                      </div>
                      <span className="text-primary fw-bold fs-5">
                        {formatCurrency(selectedAccessoryOrder.finalAmount ?? selectedAccessoryOrder.totalAmount ?? 0)} đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danh sách phụ kiện */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách phụ kiện & Bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Tên phụ kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '110px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Hạn BH</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '140px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccessoryOrder.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.accessoryName}</strong>
                              <div className="small text-muted">
                                {it.sku} {it.serialNumber && `• Tem/Serial: ${it.serialNumber}`}
                                {it.note && ` • Ghi chú: ${it.note}`}
                              </div>
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyPeriod ? (
                                <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                              ) : it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary">0 Tháng</span>
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

              <div className="modal-footer bg-light d-flex justify-content-end">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedAccessoryOrder(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Đơn Máy */}
      {editingMachineOrder && (
        <ModalSuaDonMay
          order={editingMachineOrder}
          onClose={() => setEditingMachineOrder(null)}
          onSuccess={() => handleSearch()}
        />
      )}

      {/* Modal Chỉnh Sửa Đơn Phụ Kiện */}
      {editingAccessoryOrder && (
        <ModalSuaDonPhuKien
          order={editingAccessoryOrder}
          onClose={() => setEditingAccessoryOrder(null)}
          onSuccess={() => handleSearch()}
        />
      )}

      {/* Modal Chỉnh Sửa Phiếu Sửa Chữa */}
      {editingRepairOrder && (
        <ModalSuaDonSuaChua
          order={editingRepairOrder}
          onClose={() => setEditingRepairOrder(null)}
          onSuccess={() => handleSearch()}
        />
      )}
    </div>
  );
}