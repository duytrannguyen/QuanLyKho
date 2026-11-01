import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Search, RefreshCw, AlertCircle, PhoneOff, FileText, ArrowRight, X, Filter } from 'lucide-react';
import { crmApi } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import HoaDonKhachHang from './HoaDonKhachHang';
import DonChuaXacDinh from './DonChuaXacDinh';

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

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ totalCustomers: 0, unlinkedOrders: 0 });
  const [rebuilding, setRebuilding] = useState(false);
  const requestSeq = useRef(0);

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
        keyword: debouncedKeyword, sortBy, direction, page, size: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) return; // bỏ kết quả của request cũ
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
  }, [debouncedKeyword, sort, page]);

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

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* --- HEADER SECTION --- */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bolder mb-1 d-flex align-items-center text-dark gap-2">
            <div className="bg-primary text-white p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
              <Users size={20} />
            </div>
            Quản trị Khách hàng (CRM)
          </h1>
          <p className="text-secondary mb-0 mt-2">
            Tra cứu khách đã giao dịch, phân tích chi tiêu và quản lý toàn bộ hóa đơn.
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
              <HoaDonKhachHang customer={selectedCustomer} onBack={() => setTab('customers')} />
            </div>
          ) : tab === 'unlinked' ? (
            <div className="p-4">
              <DonChuaXacDinh canManage={canManage} onChanged={() => { loadSummary(); loadCustomers(); }} />
            </div>
          ) : (
            <div className="d-flex flex-column h-100">
              
              {/* Toolbar: Search & Sort */}
              <div className="bg-white p-4 border-bottom">
                <div className="row g-3 align-items-center justify-content-between">
                  <div className="col-12 col-md-6 col-lg-5">
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
                  
                  <div className="col-12 col-md-auto d-flex align-items-center gap-2">
                    <Filter size={18} className="text-secondary d-none d-md-block" />
                    <span className="text-secondary fw-medium d-none d-md-block text-nowrap">Sắp xếp:</span>
                    <select
                      className="form-select form-select-lg shadow-sm"
                      style={{ minWidth: '220px' }}
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
                      <th className="py-3 text-secondary fw-semibold text-center">Tổng giao dịch</th>
                      <th className="py-3 text-secondary fw-semibold text-end">Tổng chi tiêu</th>
                      <th className="py-3 text-secondary fw-semibold text-end">Mua gần nhất</th>
                      <th className="py-3 text-secondary fw-semibold text-center" style={{ width: '120px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {customers.map((c, index) => (
                      <tr
                        key={c.id}
                        role="button"
                        className={`border-bottom ${selectedCustomer?.id === c.id ? 'bg-primary bg-opacity-10' : ''}`}
                        onClick={() => handleSelectCustomer(c)}
                      >
                        {/* CỘT STT MỚI THÊM */}
                        <td className="text-center text-secondary fw-medium">
                          {page * PAGE_SIZE + index + 1}
                        </td>
                        
                        <td>
                          <div className="fw-bold text-dark">
                            {c.fullName || <span className="text-muted fw-normal fst-italic">(Chưa cập nhật)</span>}
                          </div>
                        </td>
                        
                        <td>
                          <span className="badge bg-light text-dark border font-monospace px-2 py-1 fs-6">
                            {c.phone}
                          </span>
                        </td>
                        
                        <td className="text-center">
                          {c.customerType ? (
                            <span className="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1">
                              {c.customerType}
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        
                        <td className="text-center">
                          <span className="badge rounded-circle bg-primary bg-opacity-10 text-primary p-2" style={{ width: '32px', height: '32px' }}>
                            {c.totalOrders}
                          </span>
                        </td>
                        
                        <td className="text-end fw-bolder text-success">
                          {dinhDangTien(c.totalSpent || 0)} đ
                        </td>
                        
                        <td className="text-end text-secondary small">
                          {formatDate(c.lastOrderAt)}
                        </td>
                        
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-sm btn-light text-primary border d-inline-flex align-items-center justify-content-center gap-1 hover-primary"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <FileText size={16} />
                            <span className="d-none d-xl-inline">Xem</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Empty State */}
                    {!loading && customers.length === 0 && !error && (
                      <tr>
                        <td colSpan={8} className="text-center py-5">
                          <div className="d-flex flex-column align-items-center justify-content-center text-muted">
                            <Search size={48} className="mb-3 opacity-25" />
                            <h5 className="fw-normal">
                              {debouncedKeyword ? 'Không tìm thấy khách hàng nào.' : 'Chưa có dữ liệu khách hàng.'}
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
      
      {/* Thêm một chút CSS inline cho các hover effect tùy chỉnh (hoặc bạn có thể cho vào file CSS riêng) */}
      <style dangerouslySetInnerHTML={{__html: `
        .hover-bg-light:hover { background-color: #f8f9fa !important; }
        .hover-primary:hover { background-color: #0d6efd !important; color: white !important; border-color: #0d6efd !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}