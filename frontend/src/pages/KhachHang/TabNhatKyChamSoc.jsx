import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PhoneCall, MessageSquare, User, Wrench, Calendar, 
  Clock, Plus, CheckCircle2, AlertCircle, Send, MessageCircle,
  ShoppingBag, Check, Laptop, Sparkles, CheckCheck, ShieldCheck, 
  RotateCcw, ArrowRight, Info, Filter, History, PenLine, Dot, XCircle, Lock
} from 'lucide-react';
import { crmApi } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatDate } from '../../utils/dinh_dang';

const INTERACTION_TYPES = [
  { value: 'CALL', label: 'Gọi', icon: PhoneCall, color: 'text-success', bg: 'bg-success bg-opacity-10 border-success-subtle' },
  { value: 'ZALO', label: 'Zalo', icon: MessageSquare, color: 'text-primary', bg: 'bg-primary bg-opacity-10 border-primary-subtle' },
  { value: 'STORE_VISIT', label: 'Tại shop', icon: User, color: 'text-purple', bg: 'bg-info bg-opacity-10 border-info-subtle' },
  { value: 'WARRANTY', label: 'Kỹ thuật', icon: Wrench, color: 'text-warning', bg: 'bg-warning bg-opacity-10 border-warning-subtle' },
];

const getDatePlusMonths = (months = 6) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

const getDatePlusDays = (days = 1) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getUpcomingWeekend = () => {
  const d = new Date();
  const day = d.getDay(); // 0: Chủ Nhật, 6: Thứ Bảy
  const daysUntilSaturday = day === 6 ? 7 : (6 - day);
  d.setDate(d.getDate() + daysUntilSaturday);
  return d.toISOString().split('T')[0];
};

/**
 * Nút Radio chỉ báo trạng thái trực quan
 */
const RadioIndicator = ({ selected, color = 'primary' }) => (
  <div 
    className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 transition-all ${
      selected 
        ? `border border-2 border-${color} bg-white shadow-xs` 
        : 'border border-secondary border-opacity-50 bg-white'
    }`}
    style={{ width: '17px', height: '17px' }}
  >
    {selected && (
      <div className={`rounded-circle bg-${color}`} style={{ width: '8px', height: '8px' }} />
    )}
  </div>
);

export default function TabNhatKyChamSoc({ 
  customerId, 
  customerName, 
  orders = [], 
  selectedOrderForCare = null,
  onClearSelectedOrder = null,
  onViewOrderDetail = null,
  onCareUpdated = null,
  isCompact = false 
}) {
  const { hasPermission, requirePermission } = useAuth();
  const { showToast } = useToast();
  const canCare = hasPermission('CRM_CARE|CRM_MANAGE');
  const [activeTab, setActiveTab] = useState('timeline');
  
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [targetOrderId, setTargetOrderId] = useState('');
  const [interactionType, setInteractionType] = useState('CALL');
  const [careOutcome, setCareOutcome] = useState('MAINTENANCE_COMPLETED');
  const [nextCycleDate, setNextCycleDate] = useState(getDatePlusMonths(6));
  const [followUpDate, setFollowUpDate] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  // Timeline filter theo orderId
  const [timelineOrderFilter, setTimelineOrderFilter] = useState('ALL');

  const containerRef = useRef(null);

  // Tự động chọn hóa đơn mới nhất nếu chưa chọn
  useEffect(() => {
    if (!targetOrderId && orders && orders.length > 0) {
      setTargetOrderId(String(orders[0].id));
    }
  }, [orders, targetOrderId]);

  // Khi có selectedOrderForCare từ bảng bên phải -> Chuyển sang Tab Thêm Mới
  useEffect(() => {
    if (selectedOrderForCare) {
      setTargetOrderId(String(selectedOrderForCare.id));
      setActiveTab('create');
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedOrderForCare]);

  // Order đang được chọn
  const currentSelectedOrder = useMemo(() => {
    if (!targetOrderId) return null;
    return orders.find(o => String(o.id) === String(targetOrderId)) || null;
  }, [targetOrderId, orders]);

  // Phân biệt đơn bán máy vs phụ kiện/sửa chữa
  const isMachineOrder = useMemo(() => {
    if (!currentSelectedOrder) return true;
    const cat = (currentSelectedOrder.orderCategory || '').toUpperCase();
    return cat === 'MACHINE' || !cat;
  }, [currentSelectedOrder]);

  // Đồng bộ careOutcome mặc định khi đổi loại đơn
  useEffect(() => {
    if (isMachineOrder) {
      if (currentSelectedOrder?.careStatus === 'DANG_HEN') {
        setCareOutcome('APPOINTMENT_SET');
        if (currentSelectedOrder.nextCareDate) {
          setFollowUpDate(currentSelectedOrder.nextCareDate.split('T')[0]);
        }
      } else if (currentSelectedOrder?.careStatus === 'DA_VE_SINH') {
        setCareOutcome('MAINTENANCE_COMPLETED');
        setNextCycleDate(getDatePlusMonths(6));
      } else {
        setCareOutcome('APPOINTMENT_SET');
        setFollowUpDate(getDatePlusDays(1));
        setNextCycleDate(getDatePlusMonths(6));
      }
    } else {
      if (currentSelectedOrder?.careStatus === 'DANG_HEN') {
        setCareOutcome('APPOINTMENT_SET');
        if (currentSelectedOrder.nextCareDate) {
          setFollowUpDate(currentSelectedOrder.nextCareDate.split('T')[0]);
        }
      } else {
        setCareOutcome('APPOINTMENT_SET');
        setFollowUpDate(getDatePlusDays(1));
      }
    }
  }, [isMachineOrder, targetOrderId]);

  const loadNotes = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError('');
      const res = await crmApi.getCareNotes(customerId);
      if (res.success) {
        setNotes(res.data || []);
      } else {
        setError(res.userMessage || 'Không thể tải lịch sử chăm sóc.');
      }
    } catch (err) {
      setError(err?.userMessage || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requirePermission('CRM_CARE|CRM_MANAGE', showToast, 'Ghi nhận nhật ký chăm sóc khách hàng (CSKH)')) return;
    if (!targetOrderId || !currentSelectedOrder) {
      setError('Mục hóa đơn / thiết bị cần chăm sóc là bắt buộc.');
      return;
    }
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung trao đổi.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setFormSuccess('');

      const payload = {
        interactionType,
        content: content.trim(),
        followUpDate: followUpDate || null,
        orderId: currentSelectedOrder.id,
        orderTransactionId: currentSelectedOrder.transactionId,
        orderProductName: currentSelectedOrder.productName,
        careOutcome,
        nextCycleDate: (isMachineOrder && careOutcome === 'MAINTENANCE_COMPLETED') ? nextCycleDate : null
      };

      const res = await crmApi.addCareNote(customerId, payload);
      if (res.success) {
        setFormSuccess('Đã lưu tiến trình chăm sóc thành công!');
        setContent('');
        setFollowUpDate('');
        if (isMachineOrder && careOutcome === 'MAINTENANCE_COMPLETED') {
          setNextCycleDate(getDatePlusMonths(6));
        }
        await loadNotes();
        if (onCareUpdated) {
          onCareUpdated(currentSelectedOrder.id);
        }
        setTimeout(() => {
          setActiveTab('timeline');
          setFormSuccess('');
        }, 700);
      } else {
        setError(res.userMessage || 'Không thể lưu nhật ký.');
      }
    } catch (err) {
      setError(err?.userMessage || 'Lỗi khi lưu nhật ký chăm sóc.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMeta = (type) => {
    return INTERACTION_TYPES.find(t => t.value === type) || INTERACTION_TYPES[0];
  };

  const displayedNotes = useMemo(() => {
    if (timelineOrderFilter === 'ALL') return notes;
    return notes.filter(n => String(n.orderId) === String(timelineOrderFilter));
  }, [notes, timelineOrderFilter]);

  const applyQuickTemplate = (text) => {
    setContent(prev => (prev ? `${prev} ${text}` : text));
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white" ref={containerRef}>
      
      {/* ============================================================ */}
      {/* HEADER CARD: 2 TAB 50-50 CỰC ĐẸP, CÂN ĐỐI, KHÔNG RỚT DÒNG    */}
      {/* ============================================================ */}
      <div className="card-header bg-white border-bottom p-2">
        <div className="d-flex align-items-center bg-light p-1 rounded-3 border">
          <button
            type="button"
            className={`btn btn-sm flex-fill rounded-2 py-1.5 px-2 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 transition-all ${
              activeTab === 'timeline' 
                ? 'btn-white bg-white text-primary shadow-xs' 
                : 'btn-light border-0 text-secondary'
            }`}
            style={{ fontSize: '0.8rem' }}
            onClick={() => setActiveTab('timeline')}
          >
            <History size={14} />
            <span>Lịch sử ({notes.length})</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm flex-fill rounded-2 py-1.5 px-2 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 transition-all ${
              activeTab === 'create' 
                ? 'btn-white bg-white text-primary shadow-xs' 
                : 'btn-light border-0 text-secondary'
            }`}
            style={{ fontSize: '0.8rem' }}
            onClick={() => {
              if (!requirePermission('CRM_CARE|CRM_MANAGE', showToast, 'Ghi nhận nhật ký chăm sóc khách hàng (CSKH)')) return;
              setActiveTab('create');
            }}
            title={canCare ? 'Thêm ghi nhận chăm sóc mới' : 'Yêu cầu quyền: Chăm sóc khách hàng (CSKH)'}
          >
            <PenLine size={14} />
            <span>+ Ghi nhận CSKH</span>
            {!canCare && <Lock size={11} className="text-warning" />}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: FORM GHI NHẬN CHĂM SÓC MỚI (TINH GỌN THEO CHIỀU DỌC)   */}
      {/* ============================================================ */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="card-body p-3 bg-light bg-opacity-40 animate__animated animate__fadeIn">
          
          {formSuccess && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-2.5 rounded-3 mb-2.5 small border-0 shadow-xs">
              <CheckCircle2 size={15} /> {formSuccess}
            </div>
          )}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-2.5 rounded-3 mb-2.5 small border-0 shadow-xs">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* 1. CHỌN HÓA ĐƠN LIÊN QUAN */}
          <div className="mb-2.5">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label small fw-bold text-dark text-uppercase mb-0 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                <ShoppingBag size={12} className="text-primary" />
                <span>Hóa đơn / Thiết bị cần chăm sóc</span>
                <span className="text-danger fw-bold">*</span>
              </label>
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                Bắt buộc
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="alert alert-warning py-2 px-2.5 small border-0 rounded-3 mb-0">
                Khách hàng chưa có hóa đơn nào trên hệ thống.
              </div>
            ) : (
              <select
                className={`form-select form-select-sm rounded-3 shadow-xs bg-white ${!targetOrderId ? 'border-danger' : 'border-primary-subtle fw-medium text-dark'}`}
                style={{ fontSize: '0.78rem' }}
                value={targetOrderId}
                onChange={(e) => setTargetOrderId(e.target.value)}
                required
              >
                <option value="">-- Chọn hóa đơn cần chăm sóc --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    [{o.transactionId}] {o.productName} ({formatDate(o.saleDate)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. CHỌN TIẾN TRÌNH & KẾT QUẢ (DẠNG RADIO THẺ CÓ CHỈ BÁO RÕ RÀNG 100%) */}
          {currentSelectedOrder && (
            <div className="mb-2.5 p-2 bg-white rounded-3 border shadow-xs">
              
              {/* Cảnh báo máy đã bán lại cho shop */}
              {(currentSelectedOrder.isWarrantyVoided || currentSelectedOrder.careStatus === 'DA_BAN_LAI' || currentSelectedOrder.careStatus === 'VOIDED') && (
                <div className="alert alert-dark d-flex align-items-center gap-2 py-1.5 px-2.5 rounded-3 mb-2 small border-dark border-opacity-25" style={{ fontSize: '0.73rem' }}>
                  <XCircle size={14} className="text-danger flex-shrink-0" />
                  <div>
                    <strong className="text-danger">Máy đã bán lại cho shop:</strong> Chế độ bảo hành đối với khách hàng này đã bị hủy. Hệ thống không áp dụng lịch nhắc bảo dưỡng định kỳ nữa.
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center justify-content-between mb-1.5 pb-1 border-bottom">
                <span className="small fw-bold text-dark text-uppercase d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                  <ShieldCheck size={13} className="text-success" />
                  <span>Kết quả chăm sóc đơn này</span>
                </span>
                <span className={`badge ${isMachineOrder ? 'bg-primary' : 'bg-info'} bg-opacity-10 ${isMachineOrder ? 'text-primary' : 'text-info-emphasis'} border border-opacity-25 rounded-pill px-2`} style={{ fontSize: '0.68rem' }}>
                  {isMachineOrder ? 'Đơn Máy (Vệ sinh định kỳ)' : 'Đơn Sửa chữa / Phụ kiện'}
                </span>
              </div>

              {/* Danh sách 3 lựa chọn Radio xếp dọc có viền và hiệu ứng rõ ràng */}
              <div className="d-flex flex-column gap-2">
                {isMachineOrder ? (
                  <>
                    {/* Option 1 Máy: Đang hẹn ngày mang máy qua */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'APPOINTMENT_SET'
                          ? 'border-warning bg-warning bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-warning'
                      }`}
                      onClick={() => {
                        setCareOutcome('APPOINTMENT_SET');
                        if (!followUpDate) setFollowUpDate(getDatePlusDays(1));
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'APPOINTMENT_SET'} color="warning" />
                          <Calendar size={15} className={careOutcome === 'APPOINTMENT_SET' ? 'text-warning-emphasis' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'APPOINTMENT_SET' ? 'fw-bold text-dark' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Đang hẹn ngày mang máy qua vệ sinh
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Lưu lịch hẹn khách ghé shop để hệ thống theo dõi
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'APPOINTMENT_SET' && <Check size={15} className="text-warning-emphasis" />}
                      </div>

                      {/* Khung chọn ngày hẹn khi click chọn */}
                      {careOutcome === 'APPOINTMENT_SET' && (
                        <div className="mt-2 pt-2 border-top border-warning-subtle d-flex flex-wrap align-items-center justify-content-between gap-1 animate__animated animate__fadeIn" onClick={(e) => e.stopPropagation()}>
                          <span className="small text-dark fw-medium d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                            <Calendar size={12} className="text-warning" />
                            <span>Ngày hẹn:</span>
                          </span>
                          <div className="d-flex align-items-center gap-1">
                            <input
                              type="date"
                              className="form-control form-control-sm py-0 px-1.5 rounded-2 border-warning-subtle bg-white fw-bold text-dark text-center"
                              style={{ maxWidth: '125px', fontSize: '0.72rem', height: '26px' }}
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-0 px-1.5 rounded-pill text-dark fw-medium"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setFollowUpDate(getDatePlusDays(1))}
                              title="Hẹn ngày mai"
                            >
                              Mai (+1N)
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-0 px-1.5 rounded-pill text-dark fw-medium"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setFollowUpDate(getDatePlusDays(2))}
                              title="Hẹn 2 ngày nữa"
                            >
                              +2N
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-0 px-1.5 rounded-pill text-dark fw-medium"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setFollowUpDate(getUpcomingWeekend())}
                              title="Hẹn thứ 7 tuần này"
                            >
                              Cuối tuần
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 2 Máy: Khách ĐÃ ĐẾN vệ sinh máy */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'MAINTENANCE_COMPLETED'
                          ? 'border-success bg-success bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-success'
                      }`}
                      onClick={() => {
                        setCareOutcome('MAINTENANCE_COMPLETED');
                        if (!nextCycleDate) setNextCycleDate(getDatePlusMonths(6));
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'MAINTENANCE_COMPLETED'} color="success" />
                          <CheckCheck size={15} className={careOutcome === 'MAINTENANCE_COMPLETED' ? 'text-success' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'MAINTENANCE_COMPLETED' ? 'fw-bold text-success' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Khách ĐÃ ĐẾN vệ sinh máy tại shop
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Xác nhận hoàn tất chu kỳ này & tự động hẹn chu kỳ tiếp theo
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'MAINTENANCE_COMPLETED' && <Check size={15} className="text-success" />}
                      </div>

                      {/* Khung chọn ngày chu kỳ tới */}
                      {careOutcome === 'MAINTENANCE_COMPLETED' && (
                        <div className="mt-2 pt-2 border-top border-success-subtle d-flex flex-wrap align-items-center justify-content-between gap-1 animate__animated animate__fadeIn" onClick={(e) => e.stopPropagation()}>
                          <span className="small text-success fw-medium d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                            <RotateCcw size={12} />
                            <span>Kỳ tới:</span>
                          </span>
                          <div className="d-flex align-items-center gap-1">
                            <input
                              type="date"
                              className="form-control form-control-sm py-0 px-1.5 rounded-2 border-success-subtle bg-white fw-bold text-success text-center"
                              style={{ maxWidth: '125px', fontSize: '0.72rem', height: '26px' }}
                              value={nextCycleDate}
                              onChange={(e) => setNextCycleDate(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success py-0 px-1.5 rounded-pill"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setNextCycleDate(getDatePlusMonths(6))}
                            >
                              +6T
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success py-0 px-1.5 rounded-pill"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setNextCycleDate(getDatePlusMonths(12))}
                            >
                              +12T
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 3 Máy: Ghi chú trao đổi thường */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'GENERAL_NOTE'
                          ? 'border-primary bg-primary bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-primary'
                      }`}
                      onClick={() => setCareOutcome('GENERAL_NOTE')}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'GENERAL_NOTE'} color="primary" />
                          <MessageCircle size={15} className={careOutcome === 'GENERAL_NOTE' ? 'text-primary' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'GENERAL_NOTE' ? 'fw-bold text-primary' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Chỉ ghi chú trao đổi / tư vấn
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Chưa chốt hẹn, khách bận hoặc cần suy nghĩ thêm
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'GENERAL_NOTE' && <Check size={15} className="text-primary" />}
                      </div>
                    </div>

                    {/* Option 4 Máy: Khách đã bán lại máy cho shop */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'MACHINE_REPURCHASED'
                          ? 'border-dark bg-dark bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-dark'
                      }`}
                      onClick={() => setCareOutcome('MACHINE_REPURCHASED')}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'MACHINE_REPURCHASED'} color="dark" />
                          <XCircle size={15} className={careOutcome === 'MACHINE_REPURCHASED' ? 'text-dark' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'MACHINE_REPURCHASED' ? 'fw-bold text-dark' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Khách đã bán lại máy cho shop (Hủy BH & CSKH)
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Chấm dứt hiệu lực bảo hành và ngừng mọi lịch nhắc vệ sinh máy cho đơn này
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'MACHINE_REPURCHASED' && <Check size={15} className="text-dark" />}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Option 1 Phụ kiện: Hẹn liên hệ lại sau */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'APPOINTMENT_SET'
                          ? 'border-warning bg-warning bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-warning'
                      }`}
                      onClick={() => {
                        setCareOutcome('APPOINTMENT_SET');
                        if (!followUpDate) setFollowUpDate(getDatePlusDays(1));
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'APPOINTMENT_SET'} color="warning" />
                          <Calendar size={15} className={careOutcome === 'APPOINTMENT_SET' ? 'text-warning-emphasis' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'APPOINTMENT_SET' ? 'fw-bold text-dark' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Hẹn liên hệ lại sau
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Khách đang bận, hẹn gọi lại vào ngày chỉ định
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'APPOINTMENT_SET' && <Check size={15} className="text-warning-emphasis" />}
                      </div>

                      {careOutcome === 'APPOINTMENT_SET' && (
                        <div className="mt-2 pt-2 border-top border-warning-subtle d-flex flex-wrap align-items-center justify-content-between gap-1 animate__animated animate__fadeIn" onClick={(e) => e.stopPropagation()}>
                          <span className="small text-dark fw-medium d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                            <Calendar size={12} className="text-warning" />
                            <span>Ngày hẹn lại:</span>
                          </span>
                          <div className="d-flex align-items-center gap-1">
                            <input
                              type="date"
                              className="form-control form-control-sm py-0 px-1.5 rounded-2 border-warning-subtle bg-white fw-bold text-dark text-center"
                              style={{ maxWidth: '125px', fontSize: '0.72rem', height: '26px' }}
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-0 px-1.5 rounded-pill text-dark fw-medium"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setFollowUpDate(getDatePlusDays(1))}
                            >
                              Mai (+1N)
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-0 px-1.5 rounded-pill text-dark fw-medium"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setFollowUpDate(getDatePlusDays(2))}
                            >
                              +2N
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-0 px-1.5 rounded-pill text-dark fw-medium"
                              style={{ fontSize: '0.65rem', height: '24px' }}
                              onClick={() => setFollowUpDate(getUpcomingWeekend())}
                            >
                              Cuối tuần
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 2 Phụ kiện: Hoàn tất 1 lần */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'ONE_TIME_COMPLETED'
                          ? 'border-success bg-success bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-success'
                      }`}
                      onClick={() => setCareOutcome('ONE_TIME_COMPLETED')}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'ONE_TIME_COMPLETED'} color="success" />
                          <CheckCheck size={15} className={careOutcome === 'ONE_TIME_COMPLETED' ? 'text-success' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'ONE_TIME_COMPLETED' ? 'fw-bold text-success' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Xác nhận ĐÃ HOÀN TẤT sau mua (1 lần)
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Hoàn tất quy trình thăm hỏi, không lặp lại nhắc nhở nữa
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'ONE_TIME_COMPLETED' && <Check size={15} className="text-success" />}
                      </div>
                    </div>

                    {/* Option 3 Phụ kiện: Ghi chú khác */}
                    <div 
                      role="button"
                      className={`p-2 rounded-3 border transition-all cursor-pointer ${
                        careOutcome === 'GENERAL_NOTE'
                          ? 'border-primary bg-primary bg-opacity-10 shadow-xs'
                          : 'border-secondary-subtle bg-white hover-border-primary'
                      }`}
                      onClick={() => setCareOutcome('GENERAL_NOTE')}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <RadioIndicator selected={careOutcome === 'GENERAL_NOTE'} color="primary" />
                          <MessageCircle size={15} className={careOutcome === 'GENERAL_NOTE' ? 'text-primary' : 'text-secondary'} />
                          <div>
                            <span className={`d-block small ${careOutcome === 'GENERAL_NOTE' ? 'fw-bold text-primary' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                              Ghi chú trao đổi khác
                            </span>
                            <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>
                              Lưu thông tin tư vấn hoặc ý kiến khách hàng
                            </span>
                          </div>
                        </div>
                        {careOutcome === 'GENERAL_NOTE' && <Check size={15} className="text-primary" />}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 3. HÌNH THỨC LIÊN HỆ (CHIA ĐỀU 4 CỘT VUÔNG VẮN) */}
          <div className="mb-2.5">
            <label className="form-label small fw-bold text-secondary text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>
              Hình thức liên hệ
            </label>
            <div className="row g-1.5">
              {INTERACTION_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = interactionType === type.value;
                return (
                  <div key={type.value} className="col-3">
                    <button
                      type="button"
                      onClick={() => setInteractionType(type.value)}
                      className={`btn btn-sm w-100 rounded-3 py-1 px-1 d-inline-flex align-items-center justify-content-center gap-1 border transition-all ${
                        isSelected 
                          ? 'btn-primary shadow-xs text-white fw-bold' 
                          : 'btn-white bg-white text-secondary'
                      }`}
                      style={{ fontSize: '0.72rem' }}
                    >
                      <Icon size={12} />
                      <span className="text-nowrap">{type.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. NỘI DUNG TRAO ĐỔI & GỢI Ý NHANH */}
          <div className="mb-2.5">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label small fw-bold text-secondary text-uppercase mb-0" style={{ fontSize: '0.72rem' }}>
                Nội dung trao đổi <span className="text-danger">*</span>
              </label>
            </div>

            {/* Chip gợi ý nhanh */}
            <div className="d-flex gap-1 flex-wrap mb-1.5">
              {careOutcome === 'APPOINTMENT_SET' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border border-warning-subtle py-0 px-2 rounded-pill text-warning-emphasis"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate(isMachineOrder ? 'Khách hẹn ngày mai mang máy qua shop vệ sinh tra keo.' : 'Khách hẹn ngày mai gọi lại tư vấn.')}
                  >
                    + Hẹn mai ghé
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border border-warning-subtle py-0 px-2 rounded-pill text-warning-emphasis"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate(isMachineOrder ? 'Khách hẹn cuối tuần mang máy ghé shop vệ sinh.' : 'Khách hẹn cuối tuần liên hệ lại.')}
                  >
                    + Hẹn cuối tuần
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border border-warning-subtle py-0 px-2 rounded-pill text-warning-emphasis"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Khách đang bận đi đường/họp, hẹn gọi lại sau.')}
                  >
                    + Khách bận, gọi lại sau
                  </button>
                </>
              )}

              {isMachineOrder && careOutcome === 'MAINTENANCE_COMPLETED' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-0 px-2 rounded-pill text-success"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Khách đã ghé shop vệ sinh máy, tra keo tản nhiệt, máy chạy mát mẻ.')}
                  >
                    + Đã vệ sinh & tra keo
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-0 px-2 rounded-pill text-success"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Đã thổi bụi, test nhiệt độ ổn định, bàn giao khách hài lòng.')}
                  >
                    + Test nhiệt độ mát
                  </button>
                </>
              )}

              {!isMachineOrder && careOutcome === 'ONE_TIME_COMPLETED' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-0 px-2 rounded-pill text-info-emphasis"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Đã gọi hỏi thăm sau mua 7 ngày, khách dùng tốt và hài lòng.')}
                  >
                    + Dùng tốt sau 7 ngày
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-0 px-2 rounded-pill text-info-emphasis"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Khách phản hồi sản phẩm hoạt động ổn định, không có lỗi gì.')}
                  >
                    + Hoạt động ổn định
                  </button>
                </>
              )}

              {careOutcome === 'GENERAL_NOTE' && (
                <button
                  type="button"
                  className="btn btn-sm btn-light border py-0 px-2 rounded-pill text-secondary"
                  style={{ fontSize: '0.68rem' }}
                  onClick={() => applyQuickTemplate('Đã liên hệ tư vấn và giải đáp thắc mắc cho khách.')}
                >
                  + Đã tư vấn khách
                </button>
              )}

              {careOutcome === 'MACHINE_REPURCHASED' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border border-dark-subtle py-0 px-2 rounded-pill text-dark"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Khách hàng đã bán lại máy cho shop. Đã hủy chế độ bảo hành và ngừng lịch nhắc vệ sinh định kỳ.')}
                  >
                    + Khách đã bán lại máy cho shop
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border border-dark-subtle py-0 px-2 rounded-pill text-dark"
                    style={{ fontSize: '0.68rem' }}
                    onClick={() => applyQuickTemplate('Khách đã bán/chuyển nhượng máy cho người khác sử dụng.')}
                  >
                    + Đã chuyển nhượng máy
                  </button>
                </>
              )}
            </div>

            <textarea
              className="form-control form-control-sm rounded-3 bg-white"
              rows={2}
              style={{ fontSize: '0.78rem' }}
              placeholder={
                currentSelectedOrder 
                  ? `Nhập nội dung cho đơn [${currentSelectedOrder.transactionId}]...`
                  : 'Nhập nội dung trao đổi...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* 5. NÚT LƯU TIẾN TRÌNH */}
          <div className="d-flex align-items-center justify-content-between pt-1">
            <button
              type="button"
              className="btn btn-sm btn-light text-secondary rounded-pill px-3 py-1"
              style={{ fontSize: '0.78rem' }}
              onClick={() => setActiveTab('timeline')}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting || !content.trim() || !targetOrderId}
              className="btn btn-sm btn-primary rounded-pill px-3.5 py-1.5 d-inline-flex align-items-center gap-1.5 shadow-sm fw-medium"
              style={{ fontSize: '0.78rem' }}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : (
                <Send size={13} />
              )}
              <span>Lưu tiến trình CSKH</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* TAB 2: DÒNG THỜI GIAN LỊCH SỬ CHĂM SÓC (TIMELINE FEED)         */}
      {/* ============================================================ */}
      {activeTab === 'timeline' && (
        <div className="card-body p-3 bg-white" style={isCompact ? { maxHeight: '480px', overflowY: 'auto' } : {}}>
          
          {/* Thanh lọc theo đơn trên đỉnh timeline */}
          {orders.length > 0 && notes.length > 0 && (
            <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
              <span className="small text-secondary" style={{ fontSize: '0.72rem' }}>Lọc theo đơn:</span>
              <select
                className="form-select form-select-sm py-0.5 px-2 rounded-pill shadow-xs border-light-subtle text-secondary"
                style={{ fontSize: '0.72rem', maxWidth: '170px' }}
                value={timelineOrderFilter}
                onChange={(e) => setTimelineOrderFilter(e.target.value)}
              >
                <option value="ALL">Xem tất cả ({notes.length})</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.transactionId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary spinner-border-sm" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="mt-2 text-muted small mb-0">Đang tải nhật ký chăm sóc...</p>
            </div>
          ) : displayedNotes.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <MessageCircle size={32} className="opacity-25 mb-2" />
              <p className="mb-1 fw-medium text-dark small">
                {timelineOrderFilter === 'ALL' ? 'Chưa có nhật ký chăm sóc nào' : 'Không có ghi chú cho đơn này'}
              </p>
              <p className="text-secondary small mb-3" style={{ fontSize: '0.75rem' }}>
                Bấm nút bên dưới để ghi nhận cuộc gọi, tin nhắn hoặc xác nhận khách đã đến vệ sinh máy.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1 shadow-xs"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  if (!requirePermission('CRM_CARE|CRM_MANAGE', showToast, 'Ghi nhận nhật ký chăm sóc khách hàng (CSKH)')) return;
                  setActiveTab('create');
                }}
              >
                <Plus size={14} /> <span>+ Thêm ghi nhận CSKH</span>
                {!canCare && <Lock size={11} className="text-warning" />}
              </button>
            </div>
          ) : (
            <div className="timeline-container d-flex flex-column gap-2">
              {displayedNotes.map((note) => {
                const meta = getMeta(note.interactionType);
                const Icon = meta.icon;
                
                const linkedOrder = note.orderId 
                  ? orders.find(o => String(o.id) === String(note.orderId)) 
                  : null;

                const displayTxn = note.orderTransactionId || linkedOrder?.transactionId;
                const displayProduct = note.orderProductName || linkedOrder?.productName;

                return (
                  <div key={note.id} className="p-2.5 rounded-3 border bg-light bg-opacity-40 d-flex flex-column gap-1.5 shadow-2xs">
                    
                    {/* Header Note: Icon Loại + Badge Kết quả + Badge Hóa đơn + Thời gian */}
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 border-bottom pb-1">
                      <div className="d-flex align-items-center gap-1.5 flex-wrap">
                        
                        {/* Badge Loại liên hệ */}
                        <span className={`badge rounded-pill border px-2 py-0.5 d-inline-flex align-items-center gap-1 ${meta.bg} ${meta.color} fw-medium`} style={{ fontSize: '0.7rem' }}>
                          <Icon size={11} />
                          <span>{meta.label}</span>
                        </span>

                        {/* Badge Kết quả tiến trình */}
                        {note.careOutcome === 'MAINTENANCE_COMPLETED' && (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 fw-bold" style={{ fontSize: '0.7rem' }}>
                            <CheckCheck size={11} />
                            <span>ĐÃ VỆ SINH MÁY</span>
                          </span>
                        )}

                        {note.careOutcome === 'ONE_TIME_COMPLETED' && (
                          <span className="badge bg-info bg-opacity-10 text-info border border-info-subtle rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 fw-bold" style={{ fontSize: '0.7rem' }}>
                            <CheckCheck size={11} />
                            <span>HOÀN TẤT 1 LẦN</span>
                          </span>
                        )}

                        {note.careOutcome === 'APPOINTMENT_SET' && (
                          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 fw-bold" style={{ fontSize: '0.7rem' }}>
                            <Calendar size={11} />
                            <span>ĐANG HẸN</span>
                          </span>
                        )}

                        {/* Badge Hóa đơn liên quan */}
                        {displayTxn && (
                          <span 
                            role="button"
                            className="badge bg-white text-primary border border-primary-subtle rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 shadow-xs hover-primary transition-all text-nowrap"
                            style={{ fontSize: '0.7rem' }}
                            onClick={() => {
                              if (onViewOrderDetail && (linkedOrder || note.orderId)) {
                                onViewOrderDetail(linkedOrder || { id: note.orderId, transactionId: displayTxn, productName: displayProduct });
                              }
                            }}
                            title="Xem chi tiết hóa đơn liên quan"
                          >
                            <ShoppingBag size={10} />
                            <span><strong>{displayTxn}</strong></span>
                          </span>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-1.5 text-muted font-monospace" style={{ fontSize: '0.7rem' }}>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>

                    {/* Nội dung trao đổi */}
                    <p className="mb-0 text-dark small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, fontSize: '0.78rem' }}>
                      {note.content}
                    </p>

                    {/* Hẹn liên hệ lại (nếu có) */}
                    {note.followUpDate && (
                      <div className="pt-1 d-flex align-items-center gap-1 text-warning fw-medium small" style={{ fontSize: '0.72rem' }}>
                        <Calendar size={11} />
                        <span>Hẹn ngày: <strong>{formatDate(note.followUpDate)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hover-border-warning:hover { border-color: #ffc107 !important; background-color: #fffdf5 !important; }
        .hover-border-success:hover { border-color: #198754 !important; background-color: #f6fcf8 !important; }
        .hover-border-primary:hover { border-color: #0d6efd !important; background-color: #f7faff !important; }
        .hover-border-dark:hover { border-color: #212529 !important; background-color: #f8f9fa !important; }
        .cursor-pointer { cursor: pointer; }
      `}} />
    </div>
  );
}
