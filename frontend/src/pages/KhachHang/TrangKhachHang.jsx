import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Search, RefreshCw, AlertCircle, PhoneOff, FileText, 
  ArrowRight, X, Filter, Phone, MessageSquare, PhoneCall, 
  Edit3, ShieldAlert, Wrench, Calendar, CheckCircle2, Download 
} from 'lucide-react';
import { crmApi } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import HoaDonKhachHang from './HoaDonKhachHang';
import DonChuaXacDinh from './DonChuaXacDinh';
import ModalChinhSuaKhachHang from './ModalChinhSuaKhachHang';

const SORT_OPTIONS = [
  { value: 'lastOrderAt:desc', label: 'Mua gần đây nhất' },
  { value: 'totalOrders:desc', label: 'Nhiều giao dịch nhất' },
  { value: 'totalSpent:desc', label: 'Chi tiêu cao nhất' },
  { value: 'firstOrderAt:asc', label: 'Khách lâu năm nhất' },
  { value: 'fullName:asc', label: 'Tên A → Z' },
];

const PAGE_SIZE = 20;

export default function TrangKhachHang() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('CRM_MANAGE');

  const [tab, setTab] = useState('customers'); // 'customers' | 'unlinked' | 'customer-detail'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
  const requestSeq = useRef(0);

  const handleExportExcel = async () => {
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
      const filterSuffix = filterType === 'WARRANTY_EXPIRING' ? '_SapHetBaoHanh' : (filterType === 'MAINTENANCE_DUE' ? '_DenHanBaoDuong' : '');
      link.setAttribute('download', `Danh_Sach_Khach_Hang_CRM${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast?.showSuccess?.('Xuất file Excel danh sách khách hàng thành công!');
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      toast?.showError?.('Không thể xuất file Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  // Debounce ô tìm kiếm để tránh gọi API mỗi lần gõ phím
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
      // Chỉ số tổng quan không bắt buộc, bỏ qua lỗi
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

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setTab('customer-detail');
  };

  const handleCloseDetailTab = (e) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(null);
    setTab('customers');
  };

  const handleRebuild = async () => {
    if (!window.confirm('Dựng lại toàn bộ dữ liệu khách hàng từ các đơn hàng? Thao tác có thể mất vài phút.')) return;
    try {
      setRebuilding(true);
      const res = await crmApi.rebuild();
      if (res.success) {
        showToast(res.userMessage || 'Đã dựng lại dữ liệu khách hàng', 'success');
        setSelectedCustomer(null);
        setTab('customers');
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
    if (selectedCustomer?.id === updated.id) {
      setSelectedCustomer(updated);
    }
    loadSummary();
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      
      {/* --- HEADER SECTION --- */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bolder mb-1 d-flex align-items-center text-dark gap-2">
            <div className="bg-primary text-white p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
              <Users size={20} />
            </div>
            Quản trị Khách hàng & Hậu mãi (CRM)
          </h1>
          <p className="text-secondary mb-0 mt-2">
            Tra cứu lịch sử mua hàng, chăm sóc khách định kỳ và quản lý toàn bộ hóa đơn.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm px-4"
            disabled={rebuilding}
            onClick={handleRebuild}
          >
            <RefreshCw size={18} className={rebuilding ? 'opacity-50 spin' : ''} />
            {rebuilding ? 'Đang xử lý dữ liệu...' : 'Đồng bộ lại dữ liệu'}
          </button>
        )}
      </div>

      {/* --- QUICK STATS / FILTER WIDGETS --- */}
      <div className="row g-3 mb-4">
        
        {/* Widget 1: Tất cả khách */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            className={`card border-0 shadow-sm rounded-4 h-100 transition-all cursor-pointer ${tab === 'customers' && filterType === '' ? 'border-primary border-2 bg-primary bg-opacity-10' : 'bg-white hover-card'}`}
            onClick={() => { setFilterType(''); setTab('customers'); setPage(0); }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-medium">Tất cả khách hàng</div>
                <div className="fs-4 fw-bolder text-dark mt-1">{summary.totalCustomers}</div>
                <div className="text-primary small" style={{ fontSize: '0.75rem' }}>Bấm để xem tất cả</div>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                <Users size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Sắp hết bảo hành trong 30 ngày */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            className={`card border-0 shadow-sm rounded-4 h-100 transition-all cursor-pointer ${tab === 'customers' && filterType === 'WARRANTY_EXPIRING' ? 'border-warning border-2 bg-warning bg-opacity-10' : 'bg-white hover-card'}`}
            onClick={() => { setFilterType('WARRANTY_EXPIRING'); setTab('customers'); setPage(0); }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-warning-emphasis small fw-medium">Sắp hết bảo hành</div>
                <div className="fs-4 fw-bolder text-warning-emphasis mt-1">{summary.warrantyExpiringCount || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Trong vòng 30 ngày tới</div>
              </div>
              <div className="bg-warning bg-opacity-10 text-warning-emphasis p-3 rounded-circle">
                <ShieldAlert size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Đến hạn bảo dưỡng máy */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            className={`card border-0 shadow-sm rounded-4 h-100 transition-all cursor-pointer ${tab === 'customers' && filterType === 'MAINTENANCE_DUE' ? 'border-info border-2 bg-info bg-opacity-10' : 'bg-white hover-card'}`}
            onClick={() => { setFilterType('MAINTENANCE_DUE'); setTab('customers'); setPage(0); }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-info small fw-medium">Đến hạn bảo dưỡng máy</div>
                <div className="fs-4 fw-bolder text-info mt-1">{summary.maintenanceDueCount || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Văn phòng: 12th • Khác: 6th</div>
              </div>
              <div className="bg-info bg-opacity-10 text-info p-3 rounded-circle">
                <Wrench size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 4: Đơn chưa xác định khách */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            className={`card border-0 shadow-sm rounded-4 h-100 transition-all cursor-pointer ${tab === 'unlinked' ? 'border-danger border-2 bg-danger bg-opacity-10' : 'bg-white hover-card'}`}
            onClick={() => setTab('unlinked')}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-danger small fw-medium">Đơn chưa gán khách</div>
                <div className="fs-4 fw-bolder text-danger mt-1">{summary.unlinkedOrders || 0}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Thiếu hoặc sai số điện thoại</div>
              </div>
              <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle">
                <PhoneOff size={22} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* --- MAIN CARD --- */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        
        {/* Tab Navigation */}
        <div className="card-header bg-white border-bottom-0 pt-3 pb-0 px-4">
          <ul className="nav nav-tabs border-bottom fw-medium">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link border-0 border-bottom border-3 px-3 py-3 d-flex align-items-center gap-2 ${tab === 'customers' ? 'active border-primary text-primary bg-white' : 'border-transparent text-secondary hover-bg-light'}`}
                onClick={() => setTab('customers')}
              >
                <Users size={18} />
                Khách hàng
                <span className={`badge rounded-pill ${tab === 'customers' ? 'bg-primary' : 'bg-secondary'}`}>
                  {summary.totalCustomers}
                </span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link border-0 border-bottom border-3 px-3 py-3 d-flex align-items-center gap-2 ${tab === 'unlinked' ? 'active border-primary text-primary bg-white' : 'border-transparent text-secondary hover-bg-light'}`}
                onClick={() => setTab('unlinked')}
              >
                <PhoneOff size={18} />
                Đơn chưa xác định
                {summary.unlinkedOrders > 0 && (
                  <span className="badge rounded-pill bg-warning text-dark">
                    {summary.unlinkedOrders}
                  </span>
                )}
              </button>
            </li>
            {selectedCustomer && (
              <li className="nav-item">
                <div
                  role="button"
                  className={`nav-link border-0 border-bottom border-3 px-3 py-3 d-flex align-items-center gap-2 ${tab === 'customer-detail' ? 'active border-primary text-primary bg-white' : 'border-transparent text-secondary'}`}
                  onClick={() => setTab('customer-detail')}
                >
                  <FileText size={18} />
                  <span>Chi tiết: {selectedCustomer.fullName || selectedCustomer.phone}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-close ms-2 p-1"
                    title="Đóng tab"
                    onClick={handleCloseDetailTab}
                  />
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Tab Content */}
        <div className="card-body p-0">
          {tab === 'customer-detail' && selectedCustomer ? (
            <div className="p-4">
              <HoaDonKhachHang 
                customer={selectedCustomer} 
                onBack={() => setTab('customers')} 
                onCustomerUpdated={handleCustomerUpdated}
              />
            </div>
          ) : tab === 'unlinked' ? (
            <div className="p-4">
              <DonChuaXacDinh canManage={canManage} onChanged={() => { loadSummary(); loadCustomers(); }} />
            </div>
          ) : (
            <div className="d-flex flex-column h-100">
              
              {/* Toolbar: Search, Filter Buttons & Sort */}
              <div className="bg-white p-4 border-bottom">
                <div className="row g-3 align-items-center justify-content-between">
                  
                  {/* Ô tìm kiếm */}
                  <div className="col-12 col-md-5">
                    <div className="input-group input-group-lg shadow-sm">
                      <span className="input-group-text bg-white border-end-0 text-secondary">
                        <Search size={20} />
                      </span>
                      <input
                        type="search"
                        className="form-control border-start-0 ps-0"
                        placeholder="Tìm SĐT hoặc tên khách hàng..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Nhóm nút lọc nhanh (Bộ lọc CSKH) */}
                  <div className="col-12 col-md-auto d-flex flex-wrap align-items-center gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium transition-all ${filterType === '' ? 'btn-primary shadow-sm' : 'btn-light border text-secondary'}`}
                      onClick={() => { setFilterType(''); setPage(0); }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium transition-all d-flex align-items-center gap-1 ${filterType === 'WARRANTY_EXPIRING' ? 'btn-warning text-dark shadow-sm' : 'btn-light border text-secondary'}`}
                      onClick={() => { setFilterType('WARRANTY_EXPIRING'); setPage(0); }}
                    >
                      <ShieldAlert size={14} /> Sắp hết bảo hành
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium transition-all d-flex align-items-center gap-1 ${filterType === 'MAINTENANCE_DUE' ? 'btn-info text-dark shadow-sm' : 'btn-light border text-secondary'}`}
                      onClick={() => { setFilterType('MAINTENANCE_DUE'); setPage(0); }}
                    >
                      <Wrench size={14} /> Cần bảo dưỡng
                    </button>

                    {/* Nút Xuất Excel */}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success rounded-pill px-3 py-2 fw-medium d-inline-flex align-items-center gap-1 shadow-sm ms-lg-1"
                      onClick={handleExportExcel}
                      disabled={exporting}
                      title="Xuất danh sách khách hàng ra file Excel theo bộ lọc"
                    >
                      <Download size={14} />
                      <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
                    </button>
                  </div>
                  
                  {/* Dropdown Sắp xếp */}
                  <div className="col-12 col-md-auto d-flex align-items-center gap-2">
                    <Filter size={18} className="text-secondary d-none d-lg-block" />
                    <select
                      className="form-select shadow-sm"
                      style={{ minWidth: '190px' }}
                      value={sort}
                      onChange={(e) => { setSort(e.target.value); setPage(0); }}
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mt-3 mb-0 py-2 border-0 shadow-sm">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}
              </div>

              {/* Table Section */}
              <div className="table-responsive bg-white">
                <table className="table table-hover table-borderless align-middle mb-0">
                  <thead className="table-light border-bottom">
                    <tr>
                      <th className="py-3 text-center text-secondary fw-semibold" style={{ width: '60px' }}>STT</th>
                      <th className="py-3 text-secondary fw-semibold">Khách hàng</th>
                      <th className="py-3 text-secondary fw-semibold">Số điện thoại</th>
                      <th className="py-3 text-secondary fw-semibold text-center">Phân loại</th>
                      <th className="py-3 text-secondary fw-semibold text-center">Tổng đơn</th>
                      <th className="py-3 text-secondary fw-semibold text-end">Tổng chi tiêu</th>
                      <th className="py-3 text-secondary fw-semibold text-end">Giao dịch gần nhất</th>
                      <th className="py-3 text-secondary fw-semibold text-center" style={{ width: '160px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {customers.map((c, index) => {
                      const cleanPhone = (c.phone || '').replace(/\D/g, '');
                      return (
                        <tr
                          key={c.id}
                          role="button"
                          className={`border-bottom cursor-pointer hover-table-row ${selectedCustomer?.id === c.id ? 'bg-primary bg-opacity-10' : ''}`}
                          onClick={() => handleSelectCustomer(c)}
                        >
                          {/* STT */}
                          <td className="text-center text-secondary fw-medium">
                            {page * PAGE_SIZE + index + 1}
                          </td>
                          
                          {/* Họ tên */}
                          <td>
                            <div className="fw-bold text-dark">
                              {c.fullName || <span className="text-muted fw-normal fst-italic">(Chưa cập nhật)</span>}
                            </div>
                            {c.address && (
                              <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }} title={c.address}>
                                {c.address}
                              </div>
                            )}
                          </td>
                          
                          {/* SĐT + Quick Action: Zalo + Call */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-light text-dark border font-monospace px-2 py-1 fs-6">
                                {c.phone}
                              </span>
                              {cleanPhone && (
                                <div className="d-flex align-items-center gap-1">
                                  {/* Mở Zalo */}
                                  <a
                                    href={`https://zalo.me/${cleanPhone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-light border text-primary p-1 rounded-circle hover-primary transition-all"
                                    title="Mở chat Zalo với khách"
                                  >
                                    <MessageSquare size={14} />
                                  </a>
                                  {/* Gọi điện */}
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    className="btn btn-sm btn-light border text-success p-1 rounded-circle hover-bg-light transition-all"
                                    title="Gọi điện cho khách"
                                  >
                                    <PhoneCall size={14} />
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Phân loại */}
                          <td className="text-center">
                            {c.customerType ? (
                              <span className="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1">
                                {c.customerType}
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          
                          {/* Tổng đơn */}
                          <td className="text-center">
                            <span className="badge rounded-circle bg-primary bg-opacity-10 text-primary p-2" style={{ width: '32px', height: '32px' }}>
                              {c.totalOrders}
                            </span>
                          </td>
                          
                          {/* Tổng chi tiêu */}
                          <td className="text-end fw-bolder text-success">
                            {dinhDangTien(c.totalSpent || 0)} đ
                          </td>
                          
                          {/* Gần nhất */}
                          <td className="text-end text-secondary small">
                            {formatDate(c.lastOrderAt)}
                          </td>
                          
                          {/* Thao tác */}
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center justify-content-center gap-1 px-2 py-1"
                                onClick={() => handleSelectCustomer(c)}
                                title="Xem hóa đơn của khách"
                              >
                                <FileText size={14} />
                                <span>Hóa đơn</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border text-secondary rounded-pill d-inline-flex align-items-center justify-content-center gap-1 px-2 py-1 hover-primary"
                                onClick={() => setEditingCustomer(c)}
                                title="Chỉnh sửa hồ sơ khách"
                              >
                                <Edit3 size={14} />
                                <span>Sửa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty State */}
                    {!loading && customers.length === 0 && !error && (
                      <tr>
                        <td colSpan={8} className="text-center py-5">
                          <div className="d-flex flex-column align-items-center justify-content-center text-muted">
                            <Search size={48} className="mb-3 opacity-25" />
                            <h5 className="fw-normal">
                              {debouncedKeyword ? 'Không tìm thấy khách hàng nào.' : 'Chưa có dữ liệu khách hàng theo bộ lọc này.'}
                            </h5>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Loading State */}
                    {loading && (
                      <tr>
                        <td colSpan={8} className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                          </div>
                          <p className="text-muted mt-2 mb-0">Đang lấy dữ liệu khách hàng...</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="bg-light p-3 border-top d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                <span className="text-secondary fw-medium">
                  Hiển thị <strong className="text-dark">{customers.length}</strong> / Tổng <strong className="text-dark">{totalElements}</strong> khách hàng
                </span>
                
                {totalPages > 1 && (
                  <nav aria-label="Page navigation">
                    <ul className="pagination pagination-sm mb-0 shadow-sm">
                      <li className={`page-item ${page === 0 || loading ? 'disabled' : ''}`}>
                        <button className="page-link px-3" onClick={() => setPage(p => p - 1)}>
                          Trước
                        </button>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link bg-white text-dark fw-medium px-4">
                          Trang {page + 1} / {totalPages}
                        </span>
                      </li>
                      <li className={`page-item ${page + 1 >= totalPages || loading ? 'disabled' : ''}`}>
                        <button className="page-link px-3" onClick={() => setPage(p => p + 1)}>
                          Sau
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Modal Chỉnh Sửa Hồ Sơ Khách Hàng */}
      {editingCustomer && (
        <ModalChinhSuaKhachHang 
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onUpdated={handleCustomerUpdated}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.08)!important; }
        .hover-bg-light:hover { background-color: #f8f9fa !important; }
        .hover-table-row:hover { background-color: #f8fafc !important; }
        .cursor-pointer { cursor: pointer; }
        .hover-primary:hover { background-color: #0d6efd !important; color: white !important; border-color: #0d6efd !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}