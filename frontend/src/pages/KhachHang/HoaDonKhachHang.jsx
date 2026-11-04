import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AlertCircle, Monitor, Headphones, Wrench, ShieldCheck, 
  ArrowLeft, Phone, Calendar, ShoppingBag, 
  CheckCircle2, FileText, Package, User, Eye,
  MessageSquare, PhoneCall, Edit3, MapPin, Mail,
  Sparkles, Clock, Copy, Check, Columns, Maximize2,
  Crown, Star, UserCheck, ShieldAlert, CheckCheck, RotateCcw, XCircle
} from 'lucide-react';
import { crmApi } from '../../api';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import ModalChiTietHoaDonCRM from './ModalChiTietHoaDonCRM';
import ModalChinhSuaKhachHang from './ModalChinhSuaKhachHang';
import ModalTinNhanMau from './ModalTinNhanMau';
import TabNhatKyChamSoc from './TabNhatKyChamSoc';

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
    <span className={`badge rounded-pill ${cancelled ? 'bg-danger bg-opacity-10 text-danger border border-danger-subtle' : 'bg-secondary bg-opacity-10 text-dark border border-secondary-subtle'} fw-medium px-2 py-1`} title="Trạng thái xử lý hóa đơn / giao dịch">
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

/**
 * Badge hiển thị tiến trình chăm sóc cho từng đơn hàng:
 * - Đơn máy: chu kỳ vệ sinh định kỳ lặp lại (mặc định 6 tháng).
 * - Đơn khác: thăm hỏi 1 lần sau mua (7-14 ngày), hoàn tất không lặp lại.
 */
export const OrderCareStatusBadge = ({ order }) => {
  if (!order) return null;

  // Máy đã bán lại cho shop hoặc thu lại -> Bảo hành vô hiệu & chấm dứt nhắc CSKH
  if (order.isWarrantyVoided || order.careStatus === 'DA_BAN_LAI' || order.careStatus === 'VOIDED') {
    return (
      <div className="d-flex flex-column align-items-center gap-1">
        <span className="badge bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25 rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
          <XCircle size={12} className="text-secondary" />
          <span>Đã bán lại cho shop</span>
        </span>
        <span className="small text-muted" style={{ fontSize: '0.70rem' }}>
          Bảo hành vô hiệu • Không nhắc CSKH
        </span>
      </div>
    );
  }

  const isMachine = (order.orderCategory || 'MACHINE').toUpperCase() === 'MACHINE';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isMachine) {
    // Đơn máy móc: Vệ sinh định kỳ
    if (order.careStatus === 'DA_VE_SINH') {
      let diffDays = null;
      if (order.nextCareDate) {
        const next = new Date(order.nextCareDate);
        next.setHours(0, 0, 0, 0);
        diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      }
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <CheckCheck size={12} />
            <span>Đã vệ sinh máy</span>
          </span>
          {order.nextCareDate && (
            <span className={`small fw-medium ${diffDays <= 0 ? 'text-danger fw-bold' : 'text-secondary'}`} style={{ fontSize: '0.72rem' }}>
              {diffDays <= 0 ? `⚠️ Đến hạn (Quá ${Math.abs(diffDays)} ngày)` : `Kỳ tới: ${formatDate(order.nextCareDate)} (${diffDays} ngày nữa)`}
            </span>
          )}
        </div>
      );
    }

    if (order.careStatus === 'DANG_HEN') {
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <Calendar size={12} className="text-warning" />
            <span>Đang hẹn vệ sinh</span>
          </span>
          {order.nextCareDate && (
            <span className="small text-secondary fw-medium" style={{ fontSize: '0.72rem' }}>
              Hẹn: {formatDate(order.nextCareDate)}
            </span>
          )}
        </div>
      );
    }

    // Chưa vệ sinh lần nào: tính từ saleDate
    if (order.saleDate) {
      const sale = new Date(order.saleDate);
      sale.setHours(0, 0, 0, 0);
      const isOffice = (order.segment || '').toLowerCase().includes('văn phòng') || (order.segment || '').toLowerCase().includes('van phong');
      const monthsThreshold = isOffice ? 12 : 6;
      
      const due = new Date(sale);
      due.setMonth(due.getMonth() + monthsThreshold);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
              <AlertCircle size={12} />
              <span>Đến hạn vệ sinh máy</span>
            </span>
            <span className="small text-danger fw-medium" style={{ fontSize: '0.72rem' }}>
              Chu kỳ {monthsThreshold} tháng (Quá {Math.abs(diffDays)} ngày)
            </span>
          </div>
        );
      } else {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1">
              <RotateCcw size={12} />
              <span>Chưa đến kỳ vệ sinh</span>
            </span>
            <span className="small text-secondary" style={{ fontSize: '0.72rem' }}>
              Còn {diffDays} ngày ({monthsThreshold} tháng)
            </span>
          </div>
        );
      }
    }

    return (
      <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
        Chưa vệ sinh
      </span>
    );
  } else {
    // Đơn phụ kiện hoặc sửa chữa: chăm sóc 1 lần (7-14 ngày)
    if (order.careStatus === 'HOAN_TAT_1_LAN') {
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <CheckCheck size={12} />
            <span>Đã chăm sóc (1 lần)</span>
          </span>
          <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
            Hoàn tất sau mua
          </span>
        </div>
      );
    }

    if (order.careStatus === 'DANG_HEN') {
      return (
        <div className="d-flex flex-column align-items-center gap-1">
          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
            <Calendar size={12} className="text-warning" />
            <span>Hẹn liên hệ lại</span>
          </span>
          {order.nextCareDate && (
            <span className="small text-secondary" style={{ fontSize: '0.72rem' }}>
              {formatDate(order.nextCareDate)}
            </span>
          )}
        </div>
      );
    }

    // Chưa chăm sóc: kiểm tra ngày mua có trong khoảng 7-14 ngày không
    if (order.saleDate) {
      const sale = new Date(order.saleDate);
      sale.setHours(0, 0, 0, 0);
      const passedDays = Math.floor((today - sale) / (1000 * 60 * 60 * 24));

      if (passedDays >= 7 && passedDays <= 14) {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-info bg-opacity-10 text-info-emphasis border border-info-subtle rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1 fw-bold">
              <Clock size={12} />
              <span>Cần thăm hỏi sau mua</span>
            </span>
            <span className="small text-info-emphasis fw-medium" style={{ fontSize: '0.72rem' }}>
              Đã mua {passedDays} ngày (Mốc 7-14 ngày)
            </span>
          </div>
        );
      } else if (passedDays < 7) {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
              Mới mua ({passedDays} ngày)
            </span>
            <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
              Nhắc sau 7 ngày
            </span>
          </div>
        );
      } else {
        return (
          <div className="d-flex flex-column align-items-center gap-1">
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
              Chưa chăm sóc
            </span>
            <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
              (1 lần duy nhất)
            </span>
          </div>
        );
      }
    }

    return (
      <span className="badge bg-light text-secondary border rounded-pill px-2 py-1">
        Chưa chăm sóc
      </span>
    );
  }
};

/**
 * Phân hạng khách hàng dựa trên chi tiêu và số lượng đơn
 */
export const getCustomerTier = (totalSpent = 0, totalOrders = 0) => {
  const spent = Number(totalSpent) || 0;
  const orders = Number(totalOrders) || 0;
  if (spent >= 25000000 || orders >= 4) {
    return { name: 'VIP Kim Cương', icon: Crown, className: 'bg-warning text-dark border border-warning shadow-xs', textClass: 'text-warning-emphasis' };
  }
  if (spent >= 10000000 || orders >= 2) {
    return { name: 'Thân Thiết', icon: Star, className: 'bg-info bg-opacity-10 text-info border border-info shadow-xs', textClass: 'text-info' };
  }
  return { name: 'Khách Tiềm Năng', icon: UserCheck, className: 'bg-light text-secondary border', textClass: 'text-secondary' };
};

export default function HoaDonKhachHang({ customer, onBack, onCustomerUpdated }) {
  const [currentCustomer, setCurrentCustomer] = useState(customer);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  const reloadCustomerData = useCallback(async () => {
    if (!customer?.id) return;
    try {
      const res = await crmApi.getCustomer(customer.id);
      if (res.success && res.data) {
        setCurrentCustomer(res.data);
        if (onCustomerUpdated) onCustomerUpdated(res.data);
      }
    } catch (err) {}
  }, [customer?.id, onCustomerUpdated]);
  
  // Layout View Mode: 'split' (2 cột chuẩn 360°) | 'orders' (Toàn màn hình đơn) | 'care' (Toàn màn hình CSKH)
  const [viewMode, setViewMode] = useState('split');

  // Đơn hàng cụ thể được chọn để chăm sóc
  const [selectedOrderForCare, setSelectedOrderForCare] = useState(null);

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(null);

  const customerId = currentCustomer?.id;
  const [category, setCategory] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState(''); // '' (Tất cả) | 'ACTIVE' (Còn BH) | 'EXPIRED' (Đã hết BH) | 'VOIDED' (Đã thu lại)
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

  const copyPhone = (e) => {
    e.stopPropagation();
    if (currentCustomer?.phone) {
      navigator.clipboard.writeText(currentCustomer.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const copySerialText = (e, serial) => {
    e.stopPropagation();
    if (serial) {
      navigator.clipboard.writeText(serial);
      setCopiedSerial(serial);
      setTimeout(() => setCopiedSerial(null), 2000);
    }
  };

  const handleCareForOrder = (order) => {
    setSelectedOrderForCare(order);
    if (viewMode === 'orders') {
      setViewMode('split');
    }
  };

  const cleanPhone = (currentCustomer?.phone || '').replace(/\D/g, '');
  const tier = getCustomerTier(currentCustomer?.totalSpent, currentCustomer?.totalOrders);
  const TierIcon = tier.icon;

  // Tính toán nhanh hạn bảo hành của thiết bị gần nhất (bỏ qua máy đã bán lại)
  const activeMachines = useMemo(() => {
    return orders.filter(o => 
      (o.orderCategory === 'MACHINE' || !o.orderCategory) && 
      !o.isWarrantyVoided && 
      o.careStatus !== 'DA_BAN_LAI' && 
      o.careStatus !== 'VOIDED' &&
      !isCancelledOrReturned(o.orderStatus)
    );
  }, [orders]);

  const isAllRepurchased = useMemo(() => {
    return orders.length > 0 && orders.every(o => o.isWarrantyVoided || o.careStatus === 'DA_BAN_LAI' || o.careStatus === 'VOIDED');
  }, [orders]);

  const latestMachine = useMemo(() => {
    if (activeMachines.length > 0) return activeMachines[0];
    return null;
  }, [activeMachines]);

  // Đếm nhanh trạng thái bảo hành của các hóa đơn
  const warrantyCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let active = 0, expired = 0, voided = 0;
    orders.forEach(o => {
      if (o.isWarrantyVoided || o.careStatus === 'DA_BAN_LAI' || o.careStatus === 'VOIDED') {
        voided++;
      } else if (o.warrantyExpiry) {
        const exp = new Date(o.warrantyExpiry);
        exp.setHours(0, 0, 0, 0);
        if (exp >= today) active++;
        else expired++;
      }
    });
    return { active, expired, voided };
  }, [orders]);

  // Danh sách hóa đơn được lọc theo Trạng thái bảo hành
  const displayedOrders = useMemo(() => {
    if (!warrantyFilter) return orders;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders.filter(o => {
      if (warrantyFilter === 'VOIDED') {
        return o.isWarrantyVoided || o.careStatus === 'DA_BAN_LAI' || o.careStatus === 'VOIDED';
      }
      if (o.isWarrantyVoided || o.careStatus === 'DA_BAN_LAI' || o.careStatus === 'VOIDED') {
        return false;
      }
      if (!o.warrantyExpiry) return false;
      const exp = new Date(o.warrantyExpiry);
      exp.setHours(0, 0, 0, 0);

      if (warrantyFilter === 'ACTIVE') return exp >= today;
      if (warrantyFilter === 'EXPIRED') return exp < today;
      return true;
    });
  }, [orders, warrantyFilter]);

  const getWarrantyCountdown = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diff > 0) {
      return { active: true, text: `Còn ${diff} ngày BH`, days: diff };
    } else {
      return { active: false, text: `Hết hạn ${Math.abs(diff)} ngày trước`, days: diff };
    }
  };

  return (
    <div className="d-flex flex-column gap-3 animate__animated animate__fadeIn">
      
      {/* --- TOP BAR: Quay lại + View Mode Toggle + Thao tác nhanh --- */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 bg-white p-3 px-4 rounded-4 shadow-sm border">
        
        {/* Nút quay lại & Tiêu đề khách */}
        <div className="d-flex align-items-center gap-3">
          {onBack && (
            <button
              type="button"
              className="btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1 hover-primary transition-all"
              onClick={onBack}
              title="Quay về danh sách khách hàng"
            >
              <ArrowLeft size={16} /> <span>Danh sách khách</span>
            </button>
          )}

          <div className="d-flex align-items-center gap-2">
            <span className="text-secondary small">Hồ sơ khách:</span>
            <strong className="text-dark fs-6">
              {currentCustomer?.fullName || currentCustomer?.phone || 'Chi tiết'}
            </strong>
            <span className={`badge rounded-pill ${tier.className} d-inline-flex align-items-center gap-1 px-2 py-1`}>
              <TierIcon size={12} /> {tier.name}
            </span>
          </div>
        </div>

        {/* Chuyển đổi View Mode */}
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group p-1 bg-light rounded-pill border shadow-xs" role="group">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1 transition-all ${
                viewMode === 'split' ? 'btn-white bg-white text-primary shadow-xs fw-bold' : 'btn-light border-0 text-secondary'
              }`}
              onClick={() => setViewMode('split')}
              title="Bố cục 2 cột: Hồ sơ & CSKH bên trái, Hóa đơn bên phải"
            >
              <Columns size={14} /> <span>Chăm sóc 360°</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1 transition-all ${
                viewMode === 'orders' ? 'btn-white bg-white text-primary shadow-xs fw-bold' : 'btn-light border-0 text-secondary'
              }`}
              onClick={() => setViewMode('orders')}
              title="Mở rộng toàn màn hình cho Hóa đơn & Giao dịch"
            >
              <ShoppingBag size={14} /> <span>Hóa đơn ({totalElements})</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1 transition-all ${
                viewMode === 'care' ? 'btn-white bg-white text-primary shadow-xs fw-bold' : 'btn-light border-0 text-secondary'
              }`}
              onClick={() => setViewMode('care')}
              title="Mở rộng toàn màn hình cho Nhật ký tương tác CSKH"
            >
              <Clock size={14} /> <span>Nhật ký CSKH</span>
            </button>
          </div>
        </div>

      </div>

      {/* --- MAIN CONTENT AREA: Chia bố cục theo View Mode --- */}
      <div className="row g-3">
        
        {/* ============================================================ */}
        {/* CỘT TRÁI: HỒ SƠ KHÁCH HÀNG & NHẬT KÝ CSKH GẮN HÓA ĐƠN        */}
        {/* ============================================================ */}
        {(viewMode === 'split' || viewMode === 'care') && (
          <div className={viewMode === 'care' ? 'col-12' : 'col-12 col-lg-5 col-xl-4 d-flex flex-column gap-3'}>
            
            {/* Card 1: Hồ Sơ Khách Hàng */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
              
              {/* Header Card Hồ sơ */}
              <div className="card-header bg-white border-bottom p-3 px-3.5">
                <div className="d-flex align-items-center gap-3">
                  <div 
                    className="text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold shadow-xs" 
                    style={{ 
                      width: '48px', 
                      height: '48px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      fontSize: '1.25rem'
                    }}
                  >
                    {(currentCustomer?.fullName || 'K').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <h6 className="fw-bold text-dark mb-0 text-truncate fs-6">
                        {currentCustomer?.fullName || <span className="fst-italic text-muted fw-normal">Chưa có họ tên</span>}
                      </h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border text-primary rounded-pill d-inline-flex align-items-center gap-1 py-0.5 px-2 hover-primary flex-shrink-0"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setIsEditingCustomer(true)}
                        title="Chỉnh sửa thông tin khách"
                      >
                        <Edit3 size={12} /> <span>Sửa</span>
                      </button>
                    </div>

                    <div className="d-flex align-items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`badge rounded-pill ${tier.className} d-inline-flex align-items-center gap-1 py-0.5 px-2`} style={{ fontSize: '0.7rem' }}>
                        <TierIcon size={11} /> {tier.name}
                      </span>
                      {currentCustomer?.customerType && (
                        <span className="badge bg-light text-secondary border rounded-pill py-0.5 px-2" style={{ fontSize: '0.7rem' }}>
                          {currentCustomer.customerType}
                        </span>
                      )}

                      {/* Badge Trạng thái CSKH đồng bộ 100% với danh sách ngoài */}
                      {currentCustomer?.careStatusTag === 'CARE_DUE' ? (
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                          <AlertCircle size={11} className="text-danger" />
                          <span>{currentCustomer.careStatusLabel || 'Đến hạn chăm sóc'}</span>
                        </span>
                      ) : currentCustomer?.careStatusTag === 'APPOINTMENT' ? (
                        <span className="badge bg-warning bg-opacity-15 text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                          <Calendar size={11} className="text-warning-emphasis" />
                          <span>{currentCustomer.careStatusLabel || 'Đang hẹn khách'}</span>
                        </span>
                      ) : currentCustomer?.careStatusTag === 'COMPLETED' ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle2 size={11} className="text-success" />
                          <span>{currentCustomer.careStatusLabel || 'Đã hoàn tất'}</span>
                        </span>
                      ) : currentCustomer?.careStatusTag === 'VOIDED' ? (
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                          <XCircle size={11} className="text-secondary" />
                          <span>{currentCustomer.careStatusLabel || 'Đã bán lại cho shop'}</span>
                        </span>
                      ) : (
                        <span className="badge bg-light text-secondary border py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                          <span>{currentCustomer?.careStatusLabel || 'Đang dùng tốt'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SĐT & Nhóm nút kết nối nhanh */}
                <div className="d-flex flex-wrap align-items-center gap-1.5 mt-2.5 pt-2.5 border-top">
                  <div className="d-inline-flex align-items-center gap-1 bg-light px-2 py-1 rounded-pill font-monospace fw-bold text-dark border shadow-2xs" style={{ fontSize: '0.78rem' }}>
                    <Phone size={12} className="text-primary" />
                    <span>{currentCustomer?.phone}</span>
                    <button
                      type="button"
                      className="btn btn-sm p-0 text-secondary hover-primary border-0 ms-1"
                      onClick={copyPhone}
                      title="Sao chép SĐT"
                    >
                      {copiedPhone ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    </button>
                  </div>

                  {cleanPhone && (
                    <>
                      <a
                        href={`https://zalo.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 shadow-2xs hover-primary"
                        style={{ fontSize: '0.75rem' }}
                        title="Mở Zalo chat với khách"
                      >
                        <MessageSquare size={12} />
                        <span>Chat Zalo</span>
                      </a>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="btn btn-sm btn-outline-success rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 shadow-2xs"
                        style={{ fontSize: '0.75rem' }}
                        title="Gọi điện trực tiếp"
                      >
                        <PhoneCall size={12} />
                        <span>Gọi</span>
                      </a>
                    </>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning text-dark rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 shadow-2xs"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setShowTemplatesModal(true)}
                    title="Mở bộ kịch bản tin nhắn CSKH"
                  >
                    <Sparkles size={12} className="text-warning" />
                    <span>Tin nhắn mẫu</span>
                  </button>
                </div>
              </div>

              {/* Thông tin thuộc tính khách hàng */}
              <div className="card-body p-3 px-3.5">
                <div className="d-flex flex-column gap-1.5 small">
                  
                  {currentCustomer?.address && (
                    <div className="d-flex align-items-start gap-1.5">
                      <MapPin size={13} className="text-danger flex-shrink-0 mt-0.5" />
                      <div className="text-truncate" style={{ fontSize: '0.78rem' }}>
                        <span className="text-muted">Đ/c:</span> <span className="fw-medium text-dark">{currentCustomer.address}</span>
                      </div>
                    </div>
                  )}

                  {currentCustomer?.email && (
                    <div className="d-flex align-items-center gap-1.5">
                      <Mail size={13} className="text-secondary flex-shrink-0" />
                      <div className="text-truncate" style={{ fontSize: '0.78rem' }}>
                        <span className="text-muted">Email:</span> <span className="fw-medium text-dark">{currentCustomer.email}</span>
                      </div>
                    </div>
                  )}

                  {currentCustomer?.birthDate && (
                    <div className="d-flex align-items-center gap-1.5">
                      <Calendar size={13} className="text-info flex-shrink-0" />
                      <div style={{ fontSize: '0.78rem' }}>
                        <span className="text-muted">Sinh nhật:</span> <span className="fw-medium text-dark">{formatDate(currentCustomer.birthDate)}</span>
                      </div>
                    </div>
                  )}

                  {/* 2 ô mini Giao dịch đầu & Gần nhất */}
                  <div className="row g-2 pt-1.5 mt-0.5 border-top">
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-1.5 text-center border">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Đơn đầu tiên</span>
                        <strong className="text-dark font-monospace" style={{ fontSize: '0.75rem' }}>{formatDate(currentCustomer?.firstOrderAt)}</strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-1.5 text-center border">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Đơn gần nhất</span>
                        <strong className="text-dark font-monospace" style={{ fontSize: '0.75rem' }}>{formatDate(currentCustomer?.lastOrderAt)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú nhu cầu / sở thích */}
                  {currentCustomer?.preferenceNote && (
                    <div className="mt-1.5 p-2 bg-warning bg-opacity-10 border border-warning-subtle rounded-3 text-dark">
                      <div className="fw-bold small text-warning-emphasis d-flex align-items-center gap-1 mb-0.5" style={{ fontSize: '0.72rem' }}>
                        <FileText size={12} /> Nhu cầu & Sở thích:
                      </div>
                      <div className="fst-italic" style={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {currentCustomer.preferenceNote}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* Card 2: Live Nhật Ký CSKH Đính Kèm Hóa Đơn Cụ Thể */}
            <TabNhatKyChamSoc 
              customerId={customerId} 
              customerName={currentCustomer?.fullName} 
              orders={orders}
              selectedOrderForCare={selectedOrderForCare}
              onClearSelectedOrder={() => setSelectedOrderForCare(null)}
              onViewOrderDetail={(ord) => setSelectedOrder(ord)}
              onCareUpdated={() => {
                loadOrders(page, false);
                reloadCustomerData();
              }}
              isCompact={viewMode === 'split'} 
            />

          </div>
        )}

        {/* ============================================================ */}
        {/* CỘT PHẢI: LỊCH SỬ HÓA ĐƠN & THIẾT BỊ ĐANG SỞ HỮU             */}
        {/* ============================================================ */}
        {(viewMode === 'split' || viewMode === 'orders') && (
          <div className={viewMode === 'orders' ? 'col-12' : 'col-12 col-lg-7 col-xl-8 d-flex flex-column gap-3'}>
            
            {/* Widget Thống kê doanh số khách hàng */}
            <div className="row g-2.5">
              <div className="col-12 col-sm-4">
                <div className="card border shadow-xs rounded-4 bg-white p-3 h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Tổng hóa đơn</div>
                      <div className="fs-4 fw-bolder text-primary mt-0.5 font-monospace">
                        {currentCustomer?.totalOrders ?? totalElements}
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Giao dịch hoàn tất</div>
                    </div>
                    <div className="bg-primary bg-opacity-10 text-primary p-2.5 rounded-3">
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-4">
                <div className="card border shadow-xs rounded-4 bg-white p-3 h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Tổng chi tiêu tích lũy</div>
                      <div className="fs-5 fw-bolder text-success mt-0.5 font-monospace">
                        {dinhDangTien(currentCustomer?.totalSpent || 0)} đ
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Doanh thu thực thu</div>
                    </div>
                    <div className="bg-success bg-opacity-10 text-success p-2.5 rounded-3">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-4">
                <div className="card border shadow-xs rounded-4 bg-white p-3 h-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Bảo hành gần nhất</div>
                      <div className="fs-6 fw-bold text-dark mt-0.5 text-truncate" style={{ maxWidth: '140px' }} title={isAllRepurchased ? 'Đã thu hồi máy' : (latestMachine?.productName || 'Không có')}>
                        {isAllRepurchased ? 'Đã thu hồi máy' : (latestMachine?.warrantyExpiry ? formatDate(latestMachine.warrantyExpiry) : '—')}
                      </div>
                      <div className="small" style={{ fontSize: '0.72rem' }}>
                        {isAllRepurchased ? (
                          <span className="text-secondary fw-medium">Đã bán lại cho shop</span>
                        ) : latestMachine?.warrantyExpiry ? (
                          getWarrantyCountdown(latestMachine.warrantyExpiry)?.active ? (
                            <span className="text-success fw-medium">Đang trong thời hạn BH</span>
                          ) : (
                            <span className="text-danger fw-semibold">Đã hết bảo hành</span>
                          )
                        ) : <span className="text-muted">Chưa có thông tin</span>}
                      </div>
                    </div>
                    <div className={`${isAllRepurchased ? 'bg-secondary bg-opacity-10 text-secondary' : (latestMachine?.warrantyExpiry && !getWarrantyCountdown(latestMachine.warrantyExpiry)?.active ? 'bg-danger bg-opacity-10 text-danger' : 'bg-info bg-opacity-10 text-info')} p-2.5 rounded-3`}>
                      {isAllRepurchased ? <XCircle size={20} /> : (latestMachine?.warrantyExpiry && !getWarrantyCountdown(latestMachine.warrantyExpiry)?.active ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Orders Card */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
              
              {/* Card Header: Tiêu đề + Bộ lọc Category & Hạn bảo hành */}
              <div className="card-header bg-white border-bottom p-2.5 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 p-1.5 rounded-circle text-primary">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 text-dark fs-6">Lịch Sử Mua Hàng & Thiết Bị</h6>
                    <small className="text-secondary" style={{ fontSize: '0.72rem' }}>Bấm nút <strong>"CSKH"</strong> trên bất kỳ đơn nào để chăm sóc theo đơn đó</small>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {/* Bộ lọc Danh mục */}
                  <div className="d-flex gap-1 flex-wrap">
                    {CATEGORY_FILTERS.map((f) => (
                      <button
                        key={f.value || 'ALL'}
                        type="button"
                        className={`btn btn-sm rounded-pill px-2.5 py-0.5 fw-medium transition-all ${
                          category === f.value ? 'btn-primary shadow-2xs' : 'btn-light border text-secondary'
                        }`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setCategory(f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Ngăn cách */}
                  {(warrantyCounts.active > 0 || warrantyCounts.expired > 0 || warrantyCounts.voided > 0) && (
                    <div className="vr d-none d-sm-block text-secondary opacity-25" style={{ height: '16px' }} />
                  )}

                  {/* Bộ lọc Trạng thái Bảo hành (Xem nhanh máy còn hạn / đã hết hạn) */}
                  {(warrantyCounts.active > 0 || warrantyCounts.expired > 0 || warrantyCounts.voided > 0) && (
                    <div className="d-flex gap-1 flex-wrap">
                      <button
                        type="button"
                        className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                          warrantyFilter === '' ? 'btn-dark text-white fw-bold shadow-2xs' : 'btn-white bg-white border text-secondary'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => setWarrantyFilter('')}
                        title="Tất cả trạng thái bảo hành"
                      >
                        <span>Tất cả BH</span>
                      </button>

                      {warrantyCounts.active > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                            warrantyFilter === 'ACTIVE' ? 'btn-success text-white fw-bold shadow-2xs' : 'btn-white bg-white border border-success-subtle text-success'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => setWarrantyFilter(prev => prev === 'ACTIVE' ? '' : 'ACTIVE')}
                          title="Lọc các hóa đơn máy còn hạn bảo hành"
                        >
                          <ShieldCheck size={11} />
                          <span>Còn BH</span>
                          <span className="badge rounded-pill bg-success text-white ms-0.5" style={{ fontSize: '0.62rem' }}>{warrantyCounts.active}</span>
                        </button>
                      )}

                      {warrantyCounts.expired > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                            warrantyFilter === 'EXPIRED' ? 'btn-danger text-white fw-bold shadow-2xs' : 'btn-white bg-white border border-danger-subtle text-danger'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => setWarrantyFilter(prev => prev === 'EXPIRED' ? '' : 'EXPIRED')}
                          title="Xem lại các hóa đơn máy ĐÃ HẾT HẠN bảo hành"
                        >
                          <Clock size={11} />
                          <span>Đã hết hạn BH</span>
                          <span className="badge rounded-pill bg-danger text-white ms-0.5" style={{ fontSize: '0.62rem' }}>{warrantyCounts.expired}</span>
                        </button>
                      )}

                      {warrantyCounts.voided > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                            warrantyFilter === 'VOIDED' ? 'btn-secondary text-white fw-bold shadow-2xs' : 'btn-white bg-white border text-secondary'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => setWarrantyFilter(prev => prev === 'VOIDED' ? '' : 'VOIDED')}
                          title="Lọc các hóa đơn máy đã bán lại cho shop (Vô hiệu hóa)"
                        >
                          <XCircle size={11} />
                          <span>Đã thu lại</span>
                          <span className="badge rounded-pill bg-secondary text-white ms-0.5" style={{ fontSize: '0.62rem' }}>{warrantyCounts.voided}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="alert alert-danger m-3 d-flex align-items-center gap-2 py-2 px-3 border-0 shadow-xs rounded-3 small">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Table / List View */}
              <div className="table-responsive bg-white">
                <table className="table table-hover table-borderless align-middle mb-0">
                  <thead className="table-light border-bottom">
                    <tr>
                      <th className="py-2.5 text-center text-secondary fw-semibold" style={{ width: '45px' }}>STT</th>
                      <th className="py-2.5 text-secondary fw-semibold" style={{ width: '135px' }}>Mã đơn & Ngày</th>
                      <th className="py-2.5 text-secondary fw-semibold">Thiết bị & Cấu hình</th>
                      <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '185px' }}>Bảo hành & CSKH</th>
                      <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '110px' }}>Trạng thái đơn</th>
                      <th className="py-2.5 text-secondary fw-semibold text-end" style={{ width: '120px' }}>Thành tiền</th>
                      <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '115px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {displayedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                          <Clock size={28} className="text-secondary opacity-50 mb-2" />
                          <div className="fw-semibold">Không có hóa đơn nào phù hợp với bộ lọc hiện tại.</div>
                          <small className="text-secondary">
                            {warrantyFilter ? 'Hãy thử chọn "Tất cả BH" để xem toàn bộ giao dịch.' : 'Khách hàng chưa có hóa đơn thuộc phân loại này.'}
                          </small>
                        </td>
                      </tr>
                    ) : displayedOrders.map((o, index) => {
                      const cancelled = isCancelledOrReturned(o.orderStatus);
                      const countdown = getWarrantyCountdown(o.warrantyExpiry);
                      const isTargetCare = selectedOrderForCare?.id === o.id;

                      return (
                        <tr 
                          key={o.id} 
                          role="button"
                          className={`border-bottom cursor-pointer hover-table-row transition-all ${
                            isTargetCare ? 'bg-primary bg-opacity-10 border-primary' : (cancelled ? 'bg-light opacity-75' : '')
                          }`}
                          onClick={() => setSelectedOrder(o)}
                          title="Nhấn để xem chi tiết hóa đơn & in phiếu bảo hành"
                        >
                          
                          {/* STT */}
                          <td className="text-center text-secondary fw-medium" style={{ fontSize: '0.8rem' }}>
                            {index + 1}
                          </td>

                          {/* Mã đơn & Ngày */}
                          <td className="text-nowrap">
                            <div className="d-flex align-items-center gap-1 font-monospace fw-bold text-primary mb-0.5">
                              <span>{o.transactionId}</span>
                              {isTargetCare && (
                                <span className="badge bg-primary text-white rounded-pill px-1" style={{ fontSize: '0.62rem' }}>
                                  CSKH
                                </span>
                              )}
                            </div>
                            <div className="text-muted small d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                              <Calendar size={11} /> {formatDate(o.saleDate)}
                            </div>
                            <div className="mt-1">
                              <CategoryBadge category={o.orderCategory} />
                            </div>
                          </td>

                          {/* Sản phẩm / Cấu hình / Serial */}
                          <td>
                            <div className={`fw-bold ${cancelled ? 'text-secondary text-decoration-line-through' : 'text-dark'}`} style={{ fontSize: '0.82rem' }}>
                              {o.productName || <span className="text-muted fw-normal fst-italic">Không có tên sản phẩm</span>}
                            </div>
                            
                            {/* Khối Serial */}
                            {o.serialKeys && (
                              <div className="d-flex align-items-center gap-1 mt-0.5">
                                <span className="badge bg-light text-dark border font-monospace py-0.5 px-1.5 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                                  <span>Serial: {o.serialKeys}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm p-0 border-0 text-secondary hover-primary"
                                    onClick={(e) => copySerialText(e, o.serialKeys)}
                                    title="Sao chép serial máy"
                                  >
                                    {copiedSerial === o.serialKeys ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                                  </button>
                                </span>
                              </div>
                            )}

                            {/* Cấu hình / Ghi chú */}
                            {o.configSummary && (
                              <div className="small text-secondary mt-0.5 text-truncate" style={{ maxWidth: '280px', fontSize: '0.73rem' }} title={o.configSummary}>
                                {o.configSummary}
                              </div>
                            )}

                            {/* Phụ kiện bán kèm */}
                            {o.accompanyingOrder && (
                              <div className="mt-1 p-1.5 bg-info bg-opacity-10 border-start border-info border-3 rounded-end small" style={{ fontSize: '0.72rem' }}>
                                <div className="d-flex align-items-center justify-content-between mb-0.5">
                                  <span className="badge bg-info text-dark d-inline-flex align-items-center gap-1 py-0 px-1" style={{ fontSize: '0.65rem' }}>
                                    <Package size={10} /> Kèm: {o.accompanyingOrder.transactionId}
                                  </span>
                                  <span className="fw-bold text-info-emphasis">
                                    +{dinhDangTien(o.accompanyingOrder.netRevenue || 0)} đ
                                  </span>
                                </div>
                                <div className="text-dark fw-medium text-truncate" style={{ maxWidth: '220px' }}>
                                  {o.accompanyingOrder.productName}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Bảo hành & CSKH (Hiển thị rõ ràng Hết hạn vs Còn hạn) */}
                          <td className="text-center text-nowrap">
                            <div className="d-flex flex-column align-items-center gap-1">
                              {o.isWarrantyVoided || o.careStatus === 'DA_BAN_LAI' || o.careStatus === 'VOIDED' ? (
                                <span className="badge bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25 py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                  <XCircle size={11} className="text-secondary" />
                                  <span>Đã thu lại (Vô hiệu)</span>
                                </span>
                              ) : (o.warrantyPeriod || o.warrantyExpiry ? (
                                <div className="d-flex flex-column align-items-center gap-0.5">
                                  {countdown?.active ? (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                      <ShieldCheck size={11} className="text-success" />
                                      <span>Còn BH ({countdown.text})</span>
                                    </span>
                                  ) : (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                      <ShieldAlert size={11} className="text-danger" />
                                      <span>Đã hết hạn BH</span>
                                    </span>
                                  )}
                                  {o.warrantyExpiry && (
                                    <small className={`fw-medium ${countdown?.active ? 'text-muted' : 'text-danger'}`} style={{ fontSize: '0.68rem' }}>
                                      {countdown?.active ? 'Hạn:' : 'Đã hết:'} {formatDate(o.warrantyExpiry)} {!countdown?.active && `(${countdown.text})`}
                                    </small>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>— Không BH —</span>
                              ))}

                              {/* Tiến trình CSKH */}
                              <OrderCareStatusBadge order={o} />
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="text-center text-nowrap">
                            <OrderStatusBadge status={o.orderStatus} />
                            {o.paymentStatus && (
                              <div className="text-secondary small mt-0.5" style={{ fontSize: '0.7rem' }}>
                                {o.paymentStatus}
                              </div>
                            )}
                          </td>

                          {/* Thành tiền */}
                          <td className="text-end text-nowrap">
                            <div className={`fw-bolder font-monospace fs-6 ${cancelled ? 'text-decoration-line-through text-muted' : 'text-success'}`}>
                              {dinhDangTien(o.combinedNetRevenue || o.netRevenue || 0)} đ
                            </div>
                            {Number(o.discount) > 0 && !cancelled && (
                              <div className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle mt-0.5" style={{ fontSize: '0.68rem' }}>
                                Giảm: -{dinhDangTien(o.discount)} đ
                              </div>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="text-center text-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              {/* NÚT CHĂM SÓC THEO ĐƠN NÀY */}
                              <button
                                type="button"
                                className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-1 py-1 px-2 shadow-2xs transition-all ${
                                  isTargetCare 
                                    ? 'btn-primary text-white shadow-xs fw-bold' 
                                    : 'btn-outline-success hover-success'
                                }`}
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => handleCareForOrder(o)}
                                title="Ghi chú chăm sóc riêng cho hóa đơn này"
                              >
                                <MessageSquare size={11} />
                                <span>CSKH</span>
                              </button>

                              {/* Nút Xem chi tiết */}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center gap-1 py-1 px-2 shadow-2xs hover-primary transition-all"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => setSelectedOrder(o)}
                                title="Xem chi tiết hóa đơn"
                              >
                                <Eye size={11} />
                                <span>Xem</span>
                              </button>
                            </div>
                          </td>
                          
                        </tr>
                      );
                    })}

                    {/* Trạng thái trống */}
                    {!loading && orders.length === 0 && !error && (
                      <tr>
                        <td colSpan={7} className="text-center py-5">
                          <div className="d-flex flex-column align-items-center text-muted">
                            <ShoppingBag size={44} className="mb-3 opacity-25" />
                            <h6 className="fw-medium text-dark mb-1">Không tìm thấy hóa đơn nào phù hợp.</h6>
                            <p className="small text-secondary mb-0">Khách hàng chưa có giao dịch nào theo bộ lọc danh mục đã chọn.</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Trạng thái Loading */}
                    {loading && (
                      <tr>
                        <td colSpan={7} className="text-center py-5">
                          <div className="spinner-border text-primary spinner-border-sm" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                          </div>
                          <p className="text-muted small mt-2 mb-0">Đang tải lịch sử mua hàng của khách...</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tải thêm */}
              {!loading && page + 1 < totalPages && (
                <div className="card-footer bg-white border-top text-center py-3">
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary rounded-pill px-4 py-2 fw-medium shadow-xs hover-primary transition-all" 
                    onClick={() => loadOrders(page + 1, true)}
                  >
                    Tải thêm hóa đơn cũ hơn
                  </button>
                </div>
              )}

            </div>

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

      {/* Modal Chỉnh sửa Khách hàng */}
      {isEditingCustomer && (
        <ModalChinhSuaKhachHang 
          customer={currentCustomer}
          onClose={() => setIsEditingCustomer(false)}
          onUpdated={(updated) => {
            setCurrentCustomer(updated);
            if (onCustomerUpdated) onCustomerUpdated(updated);
          }}
        />
      )}

      {/* Modal Bộ Mẫu Tin Nhắn */}
      {showTemplatesModal && (
        <ModalTinNhanMau
          customer={currentCustomer}
          orders={selectedOrderForCare ? [selectedOrderForCare, ...orders] : orders}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .cursor-pointer { cursor: pointer; }
        .hover-table-row:hover { background-color: #f8fafc !important; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-primary:hover { background-color: #0b5ed7 !important; color: white !important; }
        .hover-success:hover { background-color: #198754 !important; color: white !important; }
        .shadow-xs { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      `}} />
    </div>
  );
}
