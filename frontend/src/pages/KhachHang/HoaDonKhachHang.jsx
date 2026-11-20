import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ShoppingBag, Clock, Columns } from 'lucide-react';
import { crmApi } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import ModalChiTietHoaDonCRM from './ModalChiTietHoaDonCRM';
import ModalChinhSuaKhachHang from './ModalChinhSuaKhachHang';
import ModalTinNhanMau from './ModalTinNhanMau';
import TabNhatKyChamSoc from './TabNhatKyChamSoc';
import ThongTinKhachHangCard from './components/ThongTinKhachHangCard';
import ThongKeKhachHangWidget from './components/ThongKeKhachHangWidget';
import BangHoaDonKhachHang from './components/BangHoaDonKhachHang';

// Re-export common badges, helpers and constants for backwards compatibility
export {
  CATEGORY_META,
  CATEGORY_FILTERS,
  isCancelledOrReturned,
  OrderStatusBadge,
  CategoryBadge,
  OrderCareStatusBadge,
  getCustomerTier
} from './crmCommon';

import { isCancelledOrReturned, getCustomerTier } from './crmCommon';

export default function HoaDonKhachHang({ customer, onBack, onCustomerUpdated }) {
  const { hasPermission, requirePermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('CRM_MANAGE');
  const canCare = hasPermission('CRM_CARE|CRM_MANAGE');
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
  const [warrantyFilter, setWarrantyFilter] = useState('');
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
    if (!requirePermission('CRM_CARE|CRM_MANAGE', showToast, 'Ghi nhận chăm sóc khách hàng (CSKH)')) return;
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
        {/* CỘT TRÁI: HỒ SƠ KHÁCH HÀNG & NHẬT KÝ CSKH GẮN HÓA ĐƠN */}
        {(viewMode === 'split' || viewMode === 'care') && (
          <div className={viewMode === 'care' ? 'col-12' : 'col-12 col-lg-5 col-xl-4 d-flex flex-column gap-3'}>
            <ThongTinKhachHangCard
              currentCustomer={currentCustomer}
              tier={tier}
              cleanPhone={cleanPhone}
              copiedPhone={copiedPhone}
              copyPhone={copyPhone}
              canManage={canManage}
              requirePermission={requirePermission}
              showToast={showToast}
              setIsEditingCustomer={setIsEditingCustomer}
              setShowTemplatesModal={setShowTemplatesModal}
            />

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

        {/* CỘT PHẢI: LỊCH SỬ HÓA ĐƠN & THIẾT BỊ ĐANG SỞ HỮU */}
        {(viewMode === 'split' || viewMode === 'orders') && (
          <div className={viewMode === 'orders' ? 'col-12' : 'col-12 col-lg-7 col-xl-8 d-flex flex-column gap-3'}>
            <ThongKeKhachHangWidget
              currentCustomer={currentCustomer}
              totalElements={totalElements}
              isAllRepurchased={isAllRepurchased}
              latestMachine={latestMachine}
              getWarrantyCountdown={getWarrantyCountdown}
            />

            <BangHoaDonKhachHang
              orders={orders}
              displayedOrders={displayedOrders}
              category={category}
              setCategory={setCategory}
              warrantyFilter={warrantyFilter}
              setWarrantyFilter={setWarrantyFilter}
              warrantyCounts={warrantyCounts}
              error={error}
              loading={loading}
              page={page}
              totalPages={totalPages}
              loadOrders={loadOrders}
              selectedOrderForCare={selectedOrderForCare}
              handleCareForOrder={handleCareForOrder}
              setSelectedOrder={setSelectedOrder}
              copySerialText={copySerialText}
              copiedSerial={copiedSerial}
              getWarrantyCountdown={getWarrantyCountdown}
              canCare={canCare}
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
