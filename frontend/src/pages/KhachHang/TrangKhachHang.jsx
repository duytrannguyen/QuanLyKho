import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, RefreshCw, AlertCircle, PhoneOff,
  ArrowRight, X, Filter, Phone, MessageSquare, PhoneCall,
  Edit3, ShieldAlert, Wrench, Calendar, CheckCircle2, Download,
  Copy, Check, Crown, Star, UserCheck, Sparkles, ChevronRight,
  ExternalLink, Eye, ArrowUpRight, XCircle, RotateCcw, Clock, Lock
} from 'lucide-react';
import { crmApi } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import { getCustomerTier } from './HoaDonKhachHang';
import DonChuaXacDinh from './DonChuaXacDinh';
import ModalChinhSuaKhachHang from './ModalChinhSuaKhachHang';
import PhanTrang from '../../components/common/PhanTrang';
import BangLoading from '../../components/common/BangLoading';

const SORT_OPTIONS = [
  { value: 'lastOrderAt:desc', label: 'Mua gần đây nhất' },
  { value: 'totalSpent:desc', label: 'Chi tiêu cao nhất' },
  { value: 'totalOrders:desc', label: 'Nhiều giao dịch nhất' },
  { value: 'firstOrderAt:asc', label: 'Khách lâu năm nhất' },
  { value: 'fullName:asc', label: 'Tên khách A → Z' },
];

const PAGE_SIZE = 20;

/**
 * Tính khoảng cách thời gian tương đối (ví dụ: "3 ngày trước", "2 tháng trước")
 */
const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} năm trước`;
};

export default function TrangKhachHang() {
  const navigate = useNavigate();
  const { hasPermission, requirePermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('CRM_MANAGE');
  const canExport = hasPermission('EXPORT_DATA');

  // Phân hệ chính: 'customers' | 'unlinked'
  const [activeTab, setActiveTab] = useState('customers');
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filterType, setFilterType] = useState(''); // '' (ALL) | 'WARRANTY_EXPIRING' | 'MAINTENANCE_DUE'
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    unlinkedOrders: 0,
    warrantyExpiringCount: 0,
    maintenanceDueCount: 0
  });
  const [rebuilding, setRebuilding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const requestSeq = useRef(0);

  const handleExportExcel = async () => {
    if (!requirePermission('EXPORT_DATA', showToast, 'Xuất file Excel danh sách khách hàng CRM')) return;
    try {
      setExporting(true);
      const [sortBy, sortDir] = sort.split(':');
      const res = await crmApi.exportExcel({
        keyword: debouncedKeyword,
        filterType,
        sortBy,
        direction: sortDir,
      });
      const url = window.URL.createObjectURL(new Blob([res]));
      const link = document.createElement('a');
      link.href = url;
      const filterSuffix = filterType === 'WARRANTY_EXPIRING'
        ? '_SapHetBaoHanh'
        : (filterType === 'CARE_DUE' || filterType === 'MAINTENANCE_DUE')
          ? '_CanChamSoc'
          : filterType === 'APPOINTMENT_SET'
            ? '_DangHenKhach'
            : filterType === 'CARE_COMPLETED'
              ? '_DaHoanThanh'
              : '';
      link.setAttribute('download', `Danh_Sach_Khach_Hang_CRM${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Xuất file Excel danh sách khách hàng thành công!', 'success');
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      showToast('Không thể xuất file Excel. Vui lòng thử lại sau.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Debounce ô tìm kiếm để tránh gọi API liên tục
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await crmApi.getSummary();
      if (res.success) setSummary(res.data);
    } catch {
      // Chỉ số tổng quan không chặn UI
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      setLoading(true);
      setError('');
      const [sortBy, direction] = sort.split(':');
      const res = await crmApi.searchCustomers({
        keyword: debouncedKeyword,
        filterType,
        sortBy,
        direction,
        page,
        size: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) return;
      if (!res.success) {
        setError(res.userMessage || 'Không thể tải danh sách khách hàng.');
        return;
      }
      setCustomers(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err?.userMessage || 'Lỗi kết nối máy chủ khi tải danh sách khách hàng.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedKeyword, filterType, sort, page]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Điều hướng sang trang riêng biệt của khách hàng
  const handleOpenCustomer = (customer) => {
    navigate(`/khach-hang/${customer.id}`);
  };

  const handleRebuild = async () => {
    if (!requirePermission('CRM_MANAGE', showToast, 'Đồng bộ lại toàn bộ dữ liệu khách hàng CRM')) return;
    if (!window.confirm('Dựng lại toàn bộ dữ liệu khách hàng từ các đơn hàng? Thao tác có thể mất vài phút.')) return;
    try {
      setRebuilding(true);
      const res = await crmApi.rebuild();
      if (res.success) {
        showToast(res.userMessage || 'Đã dựng lại dữ liệu khách hàng thành công', 'success');
        await Promise.all([loadCustomers(), loadSummary()]);
      } else {
        showToast(res.userMessage || 'Dựng lại dữ liệu thất bại', 'error');
      }
    } catch (err) {
      showToast(err?.userMessage || 'Dựng lại dữ liệu thất bại', 'error');
    } finally {
      setRebuilding(false);
    }
  };

  const handleCustomerUpdated = (updated) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    loadSummary();
  };

  const copyCustomerPhone = (e, customer) => {
    e.stopPropagation();
    if (customer?.phone) {
      navigator.clipboard.writeText(customer.phone);
      setCopiedPhoneId(customer.id);
      setTimeout(() => setCopiedPhoneId(null), 2000);
    }
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">

      {/* --- HEADER SECTION: Tiêu đề + Thao tác xuất / đồng bộ --- */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
              <Users size={22} />
            </div>
            <div>
              <h1 className="h4 fw-bolder mb-0 text-dark">
                Quản Trị Khách Hàng & Chăm Sóc Hậu Mãi (CRM)
              </h1>
              <p className="text-secondary small mb-0 mt-1">
                Tra cứu hồ sơ khách hàng 360°, theo dõi lịch bảo dưỡng và quản lý toàn bộ lịch sử mua sắm.
              </p>
            </div>
          </div>
        </div>

        {/* Nút Xuất Excel & Đồng bộ */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-success rounded-pill px-3 py-2 fw-medium d-inline-flex align-items-center gap-2 shadow-xs bg-white"
            onClick={handleExportExcel}
            disabled={exporting}
            title={canExport ? 'Xuất file Excel danh sách khách hàng theo điều kiện lọc hiện tại' : 'Yêu cầu quyền: Xuất file Excel'}
          >
            {exporting ? <span className="spinner-border spinner-border-sm" /> : <Download size={15} />}
            <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            {!canExport && <Lock size={12} className="text-warning" />}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 shadow-xs"
            disabled={rebuilding}
            onClick={handleRebuild}
            title={canManage ? 'Đồng bộ và tính toán lại các chỉ số khách hàng từ toàn bộ hóa đơn' : 'Yêu cầu quyền: Quản trị dữ liệu CRM'}
          >
            <RefreshCw size={15} className={rebuilding ? 'spin' : ''} />
            <span>{rebuilding ? 'Đang xử lý...' : 'Đồng bộ lại'}</span>
            {!canManage && <Lock size={12} className="text-warning" />}
          </button>
        </div>
      </div>

      {/* --- ĐIỀU HƯỚNG PHÂN HỆ CHÍNH: KHÁCH HÀNG vs ĐƠN CHƯA GÁN --- */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <div className="btn-group p-1 bg-white rounded-pill border shadow-xs" role="group">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 fw-bold transition-all ${activeTab === 'customers'
                ? 'btn-primary text-white shadow-xs'
                : 'btn-white text-secondary border-0'
              }`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={16} />
            <span>Danh Sách Khách Hàng</span>
            <span className={`badge rounded-pill ${activeTab === 'customers' ? 'bg-white text-primary' : 'bg-light text-secondary border'}`}>
              {summary.totalCustomers}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 fw-bold transition-all ${activeTab === 'unlinked'
                ? 'btn-primary text-white shadow-xs'
                : 'btn-white text-secondary border-0'
              }`}
            onClick={() => setActiveTab('unlinked')}
          >
            <PhoneOff size={16} />
            <span>Đơn Chưa Xác Định SĐT</span>
            {summary.unlinkedOrders > 0 && (
              <span className={`badge rounded-pill ${activeTab === 'unlinked' ? 'bg-white text-warning-emphasis' : 'bg-warning text-dark'}`}>
                {summary.unlinkedOrders}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      {activeTab === 'unlinked' ? (
        <DonChuaXacDinh canManage={canManage} onChanged={() => { loadSummary(); loadCustomers(); }} />
      ) : (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">

          {/* CARD HEADER: PHỄU TIẾN TRÌNH CSKH & THANH TÌM KIẾM THỐNG NHẤT */}
          <div className="card-header bg-white border-bottom p-3 px-4">

            {/* TẦNG 1: PHỄU TIẾN TRÌNH CSKH (PIPELINE TABS) - Thay thế hoàn toàn dropdown trùng lặp */}
            <div className="d-flex align-items-center gap-2 overflow-x-auto pb-2 pb-md-0 mb-3 border-bottom border-light flex-wrap">
              <span className="text-secondary small fw-bold text-uppercase d-none d-md-inline-block me-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Phễu chăm sóc:
              </span>

              {/* 1. Tất cả */}
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 border transition-all ${filterType === '' || filterType === 'ALL'
                    ? 'btn-dark text-white fw-bold shadow-xs'
                    : 'btn-light text-secondary border-0 hover-bg-light'
                  }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => { setFilterType(''); setPage(0); }}
              >
                <Users size={14} />
                <span>Tất cả</span>
                <span className={`badge rounded-pill ms-1 ${filterType === '' || filterType === 'ALL' ? 'bg-white text-dark' : 'bg-white text-secondary border'
                  }`}>
                  {summary.totalCustomers || 0}
                </span>
              </button>

              {/* 2. Cần chăm sóc ngay */}
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 border transition-all ${filterType === 'CARE_DUE' || filterType === 'MAINTENANCE_DUE'
                    ? 'btn-danger text-white fw-bold shadow-xs'
                    : 'btn-white text-danger border-danger border-opacity-25 hover-bg-light'
                  }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  setFilterType(prev => (prev === 'CARE_DUE' || prev === 'MAINTENANCE_DUE') ? '' : 'CARE_DUE');
                  setPage(0);
                }}
                title="Khách có đơn máy đến hạn vệ sinh hoặc đơn phụ kiện/sửa chữa cần thăm hỏi sau 7-14 ngày"
              >
                <AlertCircle size={14} />
                <span>Cần chăm sóc ngay</span>
                <span className={`badge rounded-pill ms-1 ${filterType === 'CARE_DUE' || filterType === 'MAINTENANCE_DUE' ? 'bg-white text-danger' : 'bg-danger text-white'
                  }`}>
                  {summary.careDueCount ?? summary.maintenanceDueCount ?? 0}
                </span>
              </button>

              {/* 3. Đang hẹn khách */}
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 border transition-all ${filterType === 'APPOINTMENT_SET'
                    ? 'btn-warning text-dark fw-bold shadow-xs'
                    : 'btn-white text-warning-emphasis border-warning border-opacity-50 hover-bg-light'
                  }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  setFilterType(prev => prev === 'APPOINTMENT_SET' ? '' : 'APPOINTMENT_SET');
                  setPage(0);
                }}
                title="Khách hàng đã trao đổi và đang có lịch hẹn mang máy qua hoặc gọi lại"
              >
                <Calendar size={14} />
                <span>Đang hẹn khách</span>
                <span className={`badge rounded-pill ms-1 ${filterType === 'APPOINTMENT_SET' ? 'bg-dark text-warning' : 'bg-warning text-dark'
                  }`}>
                  {summary.appointmentCount || 0}
                </span>
              </button>

              {/* 4. Đã hoàn thành */}
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 border transition-all ${filterType === 'CARE_COMPLETED'
                    ? 'btn-success text-white fw-bold shadow-xs'
                    : 'btn-white text-success border-success border-opacity-25 hover-bg-light'
                  }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  setFilterType(prev => prev === 'CARE_COMPLETED' ? '' : 'CARE_COMPLETED');
                  setPage(0);
                }}
                title="Khách hàng đã hoàn thành vệ sinh máy hoặc hoàn tất chăm sóc sau mua 1 lần"
              >
                <CheckCircle2 size={14} />
                <span>Đã hoàn thành</span>
                <span className={`badge rounded-pill ms-1 ${filterType === 'CARE_COMPLETED' ? 'bg-white text-success' : 'bg-success text-white'
                  }`}>
                  {summary.completedCount || 0}
                </span>
              </button>

              {/* 5. Sắp hết hạn BH */}
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 border transition-all ${filterType === 'WARRANTY_EXPIRING'
                    ? 'btn-secondary text-white fw-bold shadow-xs'
                    : 'btn-white text-secondary border hover-bg-light'
                  }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  setFilterType(prev => prev === 'WARRANTY_EXPIRING' ? '' : 'WARRANTY_EXPIRING');
                  setPage(0);
                }}
                title="Khách hàng có máy sắp hết hạn bảo hành trong 30 ngày tới"
              >
                <ShieldAlert size={14} />
                <span>Sắp hết hạn BH</span>
                <span className={`badge rounded-pill ms-1 ${filterType === 'WARRANTY_EXPIRING' ? 'bg-white text-secondary' : 'bg-secondary bg-opacity-25 text-dark'
                  }`}>
                  {summary.warrantyExpiringCount || 0}
                </span>
              </button>

            </div>

            {/* TẦNG 2: TÌM KIẾM & SẮP XẾP & ĐẶT LẠI */}
            <div className="row g-2.5 align-items-center justify-content-between">

              {/* Ô tìm kiếm thông minh */}
              <div className="col-12 col-md-6 col-lg-5">
                <div className="input-group input-group-sm shadow-xs rounded-pill overflow-hidden border">
                  <span className="input-group-text bg-white border-0 text-secondary ps-3">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control border-0 ps-1 shadow-none py-2"
                    placeholder="Tìm theo số điện thoại hoặc họ tên khách hàng..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  {keyword && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-secondary text-decoration-none pe-3"
                      onClick={() => setKeyword('')}
                      title="Xóa tìm kiếm"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Nhóm Sắp xếp & Đặt lại bộ lọc */}
              <div className="col-12 col-md-auto d-flex align-items-center gap-2.5 justify-content-md-end flex-wrap">

                {/* Nút đặt lại khi đang có bộ lọc hoặc từ khóa */}
                {(filterType !== '' || keyword) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light border rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 text-secondary hover-primary transition-all shadow-2xs"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => { setFilterType(''); setKeyword(''); setPage(0); }}
                    title="Xóa bộ lọc & từ khóa để quay về tất cả khách hàng"
                  >
                    <RotateCcw size={13} />
                    <span>Đặt lại bộ lọc</span>
                  </button>
                )}

                {/* Dropdown Sắp xếp */}
                <div className="d-flex align-items-center gap-2">
                  <span className="text-secondary small fw-medium text-nowrap" style={{ fontSize: '0.78rem' }}>Sắp xếp:</span>
                  <select
                    className="form-select form-select-sm rounded-pill shadow-xs"
                    style={{ minWidth: '185px', fontSize: '0.8rem' }}
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(0); }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

              </div>

            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mt-3 mb-0 py-2 border-0 shadow-xs rounded-3 small">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>

          {/* DANH SÁCH KHÁCH HÀNG TABLE */}
          <div className="table-responsive bg-white">
            <table className="table table-hover table-borderless align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th className="py-3 text-center text-secondary fw-semibold" style={{ width: '50px' }}>STT</th>
                  <th className="py-3 text-secondary fw-semibold">Khách hàng</th>
                  <th className="py-3 text-secondary fw-semibold">Số điện thoại & Liên hệ</th>
                  <th className="py-3 text-secondary fw-semibold text-center">Phân hạng</th>
                  <th className="py-3 text-secondary fw-semibold text-center" style={{ minWidth: '160px' }}>Trạng thái CSKH</th>
                  <th className="py-3 text-secondary fw-semibold text-center">Tổng đơn</th>
                  <th className="py-3 text-secondary fw-semibold text-end">Tổng chi tiêu</th>
                  <th className="py-3 text-secondary fw-semibold text-end">Giao dịch gần nhất</th>
                  <th className="py-3 text-secondary fw-semibold text-center" style={{ width: '180px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
                {customers.map((c, index) => {
                  const cleanPhone = (c.phone || '').replace(/\D/g, '');
                  const tier = getCustomerTier(c.totalSpent, c.totalOrders);
                  const TierIcon = tier.icon;
                  const relativeTime = getRelativeTime(c.lastOrderAt);

                  return (
                    <tr
                      key={c.id}
                      role="button"
                      className="border-bottom cursor-pointer hover-table-row transition-all"
                      onClick={() => handleOpenCustomer(c)}
                      title="Nhấn để mở trang hồ sơ khách hàng"
                    >
                      {/* STT */}
                      <td className="text-center text-secondary fw-medium">
                        {page * PAGE_SIZE + index + 1}
                      </td>

                      {/* Khách hàng: Avatar + Họ tên + Địa chỉ */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold small flex-shrink-0" style={{ width: '38px', height: '38px' }}>
                            {(c.fullName || 'K').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '210px' }}>
                              {c.fullName || <span className="text-muted fw-normal fst-italic">(Chưa cập nhật tên)</span>}
                            </div>
                            {c.address && (
                              <div className="text-muted small text-truncate" style={{ maxWidth: '220px', fontSize: '0.78rem' }} title={c.address}>
                                {c.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SĐT + Quick Action: Copy + Zalo + Call */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex align-items-center gap-1">
                          <span className="badge bg-light text-dark border font-monospace px-2 py-1 fs-6 d-inline-flex align-items-center gap-1">
                            <span>{c.phone}</span>
                            <button
                              type="button"
                              className="btn btn-sm p-0 text-secondary hover-primary border-0 ms-1"
                              onClick={(e) => copyCustomerPhone(e, c)}
                              title="Sao chép SĐT"
                            >
                              {copiedPhoneId === c.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                            </button>
                          </span>

                          {cleanPhone && (
                            <div className="d-flex align-items-center gap-1 ms-1">
                              {/* Mở Zalo */}
                              <a
                                href={`https://zalo.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-light border text-primary p-1 rounded-circle hover-primary transition-all shadow-xs"
                                title="Mở chat Zalo với khách"
                              >
                                <MessageSquare size={13} />
                              </a>
                              {/* Gọi điện */}
                              <a
                                href={`tel:${cleanPhone}`}
                                className="btn btn-sm btn-light border text-success p-1 rounded-circle hover-bg-light transition-all shadow-xs"
                                title="Gọi điện cho khách"
                              >
                                <PhoneCall size={13} />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Phân hạng */}
                      <td className="text-center">
                        <span className={`badge rounded-pill ${tier.className} d-inline-flex align-items-center gap-1 px-2 py-1 small`}>
                          <TierIcon size={12} /> {tier.name}
                        </span>
                      </td>

                      {/* Trạng thái CSKH */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        {c.careStatusTag === 'CARE_DUE' ? (
                          <span
                            className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold"
                            style={{ fontSize: '0.76rem' }}
                            title="Khách có đơn máy đến hạn vệ sinh hoặc đơn cần thăm hỏi sau 7-14 ngày"
                          >
                            <AlertCircle size={13} className="text-danger" />
                            <span>{c.careStatusLabel || 'Đến hạn chăm sóc'}</span>
                          </span>
                        ) : c.careStatusTag === 'APPOINTMENT' ? (
                          <span
                            className="badge bg-warning bg-opacity-15 text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold"
                            style={{ fontSize: '0.76rem' }}
                            title={`Khách đang có lịch hẹn: ${c.nextAppointmentDate || ''}`}
                          >
                            <Calendar size={13} className="text-warning-emphasis" />
                            <span>{c.careStatusLabel || 'Đang hẹn khách'}</span>
                          </span>
                        ) : c.careStatusTag === 'COMPLETED' ? (
                          <span
                            className="badge bg-success bg-opacity-10 text-success border border-success-subtle d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold"
                            style={{ fontSize: '0.76rem' }}
                            title="Đã chăm sóc hoàn tất chu kỳ hiện tại"
                          >
                            <CheckCircle2 size={13} className="text-success" />
                            <span>{c.careStatusLabel || 'Đã hoàn tất'}</span>
                          </span>
                        ) : c.careStatusTag === 'VOIDED' ? (
                          <span
                            className="badge bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25 d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold"
                            style={{ fontSize: '0.76rem' }}
                            title="Khách hàng đã bán lại toàn bộ máy cho shop. Không áp dụng lịch bảo dưỡng định kỳ."
                          >
                            <XCircle size={13} className="text-secondary" />
                            <span>{c.careStatusLabel || 'Đã bán lại cho shop'}</span>
                          </span>
                        ) : (
                          <span
                            className="badge bg-light text-secondary border d-inline-flex align-items-center gap-1 px-2 py-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <span>{c.careStatusLabel || 'Đang theo dõi'}</span>
                          </span>
                        )}
                      </td>

                      {/* Tổng đơn */}
                      <td className="text-center">
                        <span className="badge rounded-pill bg-light text-dark border px-2 py-1 fw-bold">
                          {c.totalOrders}
                        </span>
                      </td>

                      {/* Tổng chi tiêu */}
                      <td className="text-end fw-bolder text-success">
                        {dinhDangTien(c.totalSpent || 0)} đ
                      </td>

                      {/* Giao dịch gần nhất */}
                      <td className="text-end">
                        <div className="text-dark small fw-medium">
                          {formatDate(c.lastOrderAt)}
                        </div>
                        {relativeTime && (
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {relativeTime}
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex align-items-center justify-content-center gap-1">

                          {/* Nút Xem hồ sơ (Chuyển trang) */}
                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill d-inline-flex align-items-center justify-content-center gap-1 px-2 py-1 shadow-xs"
                            onClick={() => handleOpenCustomer(c)}
                            title="Mở trang chi tiết hồ sơ & hóa đơn khách hàng"
                          >
                            <Eye size={13} />
                            <span>Hồ sơ</span>
                          </button>

                          {/* Nút Mở Tab Mới Trên Trình Duyệt */}
                          <a
                            href={`/khach-hang/${c.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-light border text-secondary rounded-circle p-1 hover-primary transition-all shadow-xs"
                            title="Mở hồ sơ khách trong tab mới của trình duyệt"
                          >
                            <ExternalLink size={13} />
                          </a>

                          {/* Nút Sửa hồ sơ */}
                          <button
                            type="button"
                            className="btn btn-sm btn-light border text-secondary rounded-circle p-1 hover-primary transition-all shadow-xs d-inline-flex align-items-center"
                            onClick={() => {
                              if (!requirePermission('CRM_MANAGE', showToast, 'Chỉnh sửa thông tin hồ sơ khách hàng')) return;
                              setEditingCustomer(c);
                            }}
                            title={canManage ? 'Chỉnh sửa nhanh hồ sơ khách' : 'Yêu cầu quyền: Quản trị dữ liệu CRM'}
                          >
                            <Edit3 size={13} />
                            {!canManage && <Lock size={10} className="text-warning ms-0.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty State */}
                {!loading && customers.length === 0 && !error && (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center justify-content-center text-muted">
                        <Search size={44} className="mb-3 opacity-25" />
                        <h6 className="fw-medium text-dark mb-1">
                          {debouncedKeyword ? 'Không tìm thấy khách hàng nào.' : 'Chưa có dữ liệu khách hàng theo bộ lọc này.'}
                        </h6>
                        <p className="small text-secondary mb-0">Hãy thử thay đổi từ khóa hoặc bộ lọc ở thanh công cụ phía trên.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Loading State */}
                {loading && (
                  <BangLoading colSpan={9} message="Đang đồng bộ dữ liệu khách hàng..." />
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-light p-3 border-top px-4">
            <PhanTrang
              isZeroIndexed={true}
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
              itemName="khách hàng"
              showPageNumbers={false}
            />
          </div>

        </div>
      )}

      {/* Modal Chỉnh Sửa Hồ Sơ Khách Hàng */}
      {editingCustomer && (
        <ModalChinhSuaKhachHang
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onUpdated={handleCustomerUpdated}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.08)!important; }
        .hover-bg-light:hover { background-color: #f8f9fa !important; }
        .hover-table-row:hover { background-color: #f8fafc !important; }
        .cursor-pointer { cursor: pointer; }
        .hover-primary:hover { background-color: #0b5ed7 !important; color: white !important; border-color: #0b5ed7 !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .shadow-xs { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      `}} />
    </div>
  );
}