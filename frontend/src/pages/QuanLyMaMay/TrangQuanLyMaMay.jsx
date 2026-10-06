import React, { useState, useEffect } from 'react';
import { Search, Download, Laptop, X, PackageOpen, Filter } from 'lucide-react';
import { apiMayMoc, apiTonKho } from '../../api';
import { formatCurrency } from '../../utils/dinh_dang';

import { formatCycleState, formatIntakeType, formatCloseType } from '../../constants/trangThai';

export default function TrangQuanLyMaMay() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('ACTIVE');
  const [brand, setBrand] = useState('Tất cả');
  const [status, setStatus] = useState('Tất cả');
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Thêm trạng thái loading
  
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [filterOptions, setFilterOptions] = useState({ brands: [] });

  // Lấy danh sách hãng
  useEffect(() => {
    apiTonKho.getFilters().then(res => {
      setFilterOptions({ brands: res.data?.brands || [] });
    }).catch(console.error);
  }, []);

  // Gọi API tìm kiếm
  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      let effectiveStatus = status;
      if (status === 'Tất cả') {
        effectiveStatus = tab === 'ACTIVE' ? 'ACTIVE_ONLY' : 'CLOSED_ONLY';
      }
      const res = await apiMayMoc.searchHistory({ query, brand, status: effectiveStatus, page, size: pageSize });
      if (res.data && res.data.content) {
        setResults(res.data.content);
        setPageInfo({
          number: res.data.number,
          totalPages: res.data.totalPages,
          totalElements: res.data.totalElements,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => fetchMachines(), 500);
    return () => clearTimeout(timer);
  }, [query, brand, status, tab, page, pageSize]);

  // Reset trang về 0 khi đổi bộ lọc
  useEffect(() => { setPage(0); }, [query, brand, status, tab, pageSize]);
  
  // Reset trạng thái khi đổi Tab
  useEffect(() => { setStatus('Tất cả'); }, [tab]);

  // Render thời gian lưu kho
  const getStorageTime = (record) => {
    if (record.storageDays !== undefined && record.storageDays !== null) {
      if (record.closedAt) {
        return <span className="text-secondary small">Lưu kho: <strong>{record.storageDays}</strong> ngày</span>;
      }
      return <span className="text-warning-emphasis small fw-medium">Đang tồn: {record.storageDays} ngày</span>;
    }
    return '—';
  };

  // Render tên máy
  const getMachineName = (record) => {
    return record.sourceModelText || record.configId || '—';
  };

  // Render Badge trạng thái với màu sắc trực quan
  const getStatusBadge = (record) => {
    if (record.closeType) {
      const label = formatCloseType(record.closeType);
      let cls = 'bg-secondary-subtle text-secondary'; // Mặc định
      
      if (record.closeType === 'SALE') cls = 'bg-primary-subtle text-primary border border-primary-subtle';
      else if (record.closeType === 'RETURN' || record.closeType === 'CANCEL') cls = 'bg-danger-subtle text-danger border border-danger-subtle';
      else if (record.closeType === 'TRANSFER') cls = 'bg-info-subtle text-info border border-info-subtle';

      return <span className={`badge rounded-pill px-3 py-1 ${cls}`}>{label}</span>;
    }
    
    if (record.state) {
      const label = formatCycleState(record.state);
      const cls = record.state === 'READY' 
        ? 'bg-success-subtle text-success border border-success-subtle' 
        : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      return <span className={`badge rounded-pill px-3 py-1 ${cls}`}>{label}</span>;
    }
    return '—';
  };

  // Tính số cột để render Loading / Empty State
  const colSpanCount = tab === 'CLOSED' ? 9 : 8;

  return (
    <div className="container-fluid py-4 bg-light min-vh-100 d-flex flex-column">
      
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
            <div className="bg-primary bg-opacity-10 p-2 rounded">
              <Laptop size={24} className="text-primary" />
            </div>
            Quản lý mã máy (Serial)
          </h3>
          <p className="text-secondary m-0 mt-1 small">Sổ lưu trữ toàn bộ mã máy và lịch sử kinh doanh</p>
        </div>
        <button className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-4 shadow-sm" onClick={() => {/* TODO: xuất Excel */ }}>
          <Download size={18} />
          Xuất Excel
        </button>
      </div>

      <div className="card shadow-sm border-0 rounded-4 flex-grow-1 d-flex flex-column">
        
        {/* Bộ lọc & Tabs */}
        <div className="card-header bg-white border-bottom p-4">
          
          {/* Tabs UI mới */}
          <div className="d-flex bg-light p-1 rounded-pill d-inline-flex border mb-4">
            <button 
              className={`btn rounded-pill border-0 px-4 py-2 fw-medium transition-all ${tab === 'ACTIVE' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`} 
              onClick={() => setTab('ACTIVE')}
            >
              Máy đang còn tồn
            </button>
            <button 
              className={`btn rounded-pill border-0 px-4 py-2 fw-medium transition-all ${tab === 'CLOSED' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`} 
              onClick={() => setTab('CLOSED')}
            >
              Máy đã xuất / bán
            </button>
          </div>

          {/* Thanh tìm kiếm & Dropdowns */}
          <div className="row g-3">
            <div className="col-12 col-md-5 col-lg-4">
              <div className="position-relative">
                <Search size={18} className="position-absolute top-50 translate-middle-y text-muted ms-3" />
                <input 
                  className="form-control ps-5 pe-5 py-2 rounded-pill" 
                  placeholder="Tìm theo Serial, Model..."
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                />
                {query && (
                  <X 
                    className="position-absolute top-50 end-0 translate-middle-y text-muted me-3" 
                    size={18} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setQuery('')}
                  />
                )}
              </div>
            </div>
            <div className="col-6 col-md-3 col-lg-2">
              <select className="form-select py-2 rounded-pill" value={brand} onChange={e => setBrand(e.target.value)}>
                <option value="Tất cả">Hãng: Tất cả</option>
                {filterOptions.brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-4 col-lg-3">
              <select className="form-select py-2 rounded-pill" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Tất cả">Trạng thái: Tất cả</option>
                {tab === 'ACTIVE' ? (
                  <>
                    <option value="READY">Sẵn sàng bán</option>
                    <option value="NEEDS_INSPECTION">Chờ kiểm tra</option>
                  </>
                ) : (
                  <>
                    <option value="SALE">Đã bán</option>
                    <option value="RETURN">Đã trả khách</option>
                    <option value="CANCEL">Đã hủy</option>
                    <option value="TRANSFER">Chuyển kho</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="card-body p-0 d-flex flex-column flex-grow-1">
          <div className="table-responsive flex-grow-1 custom-scrollbar">
            <table className="table table-hover align-middle m-0 bg-white">
              <thead className="table-light position-sticky top-0 shadow-sm text-secondary small text-uppercase fw-semibold" style={{ zIndex: 10 }}>
                <tr>
                  <th className="text-center py-3" style={{ width: '5%' }}>STT</th>
                  <th className="py-3" style={{ width: '12%' }}>Serial</th>
                  <th className="py-3" style={{ width: '18%' }}>Tên máy / Model</th>
                  <th className="py-3" style={{ width: '20%' }}>Cấu hình máy</th>
                  <th className="py-3" style={{ width: '10%' }}>Giá bán</th>
                  <th className="py-3" style={{ width: '10%' }}>Loại nhập</th>
                  <th className="py-3" style={{ width: '13%' }}>Trạng thái</th>
                  <th className="py-3" style={{ width: '12%' }}>Lưu kho</th>
                  {tab === 'CLOSED' && <th className="py-3" style={{ width: '12%' }}>Ngày đóng</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={colSpanCount} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-secondary small">Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={colSpanCount} className="text-center py-5">
                      <div className="text-muted d-flex flex-column align-items-center">
                        <PackageOpen size={48} className="mb-3 opacity-50" />
                        <h6 className="fw-bold mb-1">Không tìm thấy mã máy</h6>
                        <p className="mb-0 small">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  results.map((record, index) => (
                    <tr key={record.cycleId || record.serialKey || index}>
                      <td className="text-center text-muted">
                        {page * pageSize + index + 1}
                      </td>
                      <td>
                        <span className="fw-medium text-dark bg-light px-2 py-1 rounded font-monospace small border">
                          {record.serialKey}
                        </span>
                      </td>
                      <td>
                        <span className="fw-medium text-dark">{getMachineName(record)}</span>
                      </td>
                      <td>
                        <span className="small text-secondary">{record.configDisplayName || '—'}</span>
                      </td>
                      <td>
                        <span className={record.closeType === 'SALE' ? 'fw-bold text-success' : 'fw-semibold text-dark'}>
                          {record.salePriceSnapshot ? formatCurrency(record.salePriceSnapshot) + ' ₫' : '—'}
                        </span>
                      </td>
                      <td className="small text-secondary">
                        {record.intakeType ? formatIntakeType(record.intakeType) : '—'}
                      </td>
                      <td>{getStatusBadge(record)}</td>
                      <td>{getStorageTime(record)}</td>
                      {tab === 'CLOSED' && (
                        <td className="small text-secondary">
                          {record.closedAt ? new Date(record.closedAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phân trang (Pagination) */}
        {results.length > 0 && (
          <div className="card-footer bg-white border-top p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="small text-muted">
                Hiển thị <strong>{page * pageSize + 1} - {Math.min((page + 1) * pageSize, pageInfo.totalElements)}</strong> / <strong>{pageInfo.totalElements}</strong> mã máy
              </span>
              <div className="d-flex align-items-center gap-2">
                <select className="form-select form-select-sm w-auto rounded-3" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value="15">15 dòng</option>
                  <option value="30">30 dòng</option>
                  <option value="50">50 dòng</option>
                  <option value="100">100 dòng</option>
                </select>
              </div>
            </div>

            {pageInfo.totalPages > 1 && (
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                  <button className="page-link px-3" onClick={() => setPage(page - 1)}>Trước</button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link bg-light text-dark">Trang {page + 1} / {pageInfo.totalPages}</span>
                </li>
                <li className={`page-item ${page >= pageInfo.totalPages - 1 ? 'disabled' : ''}`}>
                  <button className="page-link px-3" onClick={() => setPage(page + 1)}>Sau</button>
                </li>
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}