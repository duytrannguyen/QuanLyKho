import React, { useState, useEffect } from 'react';
import { Search, Download, Laptop, X, PackageOpen, Lock, RotateCcw, AlertCircle } from 'lucide-react';
import { apiMayMoc, apiTonKho } from '../../api';
import { formatCurrency } from '../../utils/dinh_dang';
import PhanTrang from '../../components/common/PhanTrang';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

import { formatCycleState, formatIntakeType, formatCloseType } from '../../constants/trangThai';

export default function TrangQuanLyMaMay() {
  const { hasPermission, requirePermission } = useAuth();
  const { showToast } = useToast();
  const canExport = hasPermission('EXPORT_DATA');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tab, setTab] = useState('ACTIVE');
  const [brand, setBrand] = useState('Tất cả');
  const [status, setStatus] = useState('Tất cả');
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Thêm trạng thái loading
  
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [filterOptions, setFilterOptions] = useState({ brands: [] });

  // Modal hoàn tác / nhập lại kho máy xuất khác
  const canReopen = hasPermission('MACHINE_EXPORT_OTHER') || hasPermission('ADMIN');
  const [reopenModal, setReopenModal] = useState({ open: false, record: null });
  const [reopenState, setReopenState] = useState('READY');
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const handleOpenReopen = (record) => {
    if (!requirePermission('MACHINE_EXPORT_OTHER', showToast, 'Nhập lại máy về kho')) return;
    setReopenModal({ open: true, record });
    setReopenState('READY');
    setReopenReason(`Nhập lại kho từ luồng xuất khác (${record.sourceReference || 'XK'})`);
  };

  const submitReopen = async () => {
    if (!reopenModal.record) return;
    setIsReopening(true);
    try {
      await apiMayMoc.reopenExported(reopenModal.record.serialKey, {
        targetState: reopenState,
        reason: reopenReason || 'Nhập lại máy về kho từ luồng xuất khác'
      });
      showToast(`Đã nhập lại máy ${reopenModal.record.serialKey} về kho thành công!`, 'success');
      setReopenModal({ open: false, record: null });
      fetchMachines();
    } catch (err) {
      showToast('Không thể nhập lại máy: ' + (err.userMessage || err.message), 'danger');
    } finally {
      setIsReopening(false);
    }
  };

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
      const res = await apiMayMoc.searchHistory({ query: debouncedQuery, brand, status: effectiveStatus, page, size: pageSize });
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

  // Chỉ debounce cho từ khóa gõ tìm kiếm (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Tải ngay lập tức (0ms) khi mở trang, chuyển tab, lọc hoặc phân trang
  useEffect(() => {
    fetchMachines();
  }, [debouncedQuery, brand, status, tab, page, pageSize]);

  // Reset trang về 0 khi đổi bộ lọc
  useEffect(() => { setPage(0); }, [brand, status, tab, pageSize]);
  
  // Reset trạng thái khi đổi Tab
  useEffect(() => { setStatus('Tất cả'); }, [tab]);

  // Render thời gian lưu kho thực tế và tuổi tồn bán hàng (nếu có ngày chờ kiểm tra/sửa chữa)
  const getStorageTime = (record) => {
    if (record.storageDays !== undefined && record.storageDays !== null) {
      const paused = Number(record.pausedDays) || 0;
      const sellable = record.sellableDays !== undefined && record.sellableDays !== null
        ? record.sellableDays
        : Math.max(0, record.storageDays - paused);
      const showSellableBreakdown = paused > 0 || record.state === 'NEEDS_INSPECTION';
      const intakeTitle = record.intakeAt
        ? `Ngày nhập: ${new Date(record.intakeAt).toLocaleDateString('vi-VN')}`
        : undefined;

      return (
        <div className="d-flex flex-column gap-0" title={intakeTitle}>
          {record.closedAt ? (
            <span className="text-secondary small">
              Lưu kho: <strong>{record.storageDays}</strong> ngày
            </span>
          ) : (
            <span className="text-warning-emphasis small fw-medium">
              Đang tồn: <strong>{record.storageDays}</strong> ngày
            </span>
          )}
          {showSellableBreakdown && (
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Tuổi bán: <strong>{sellable}</strong> ngày{paused > 0 ? ` (Chờ KT: ${paused}n)` : ''}
            </span>
          )}
        </div>
      );
    }
    return '—';
  };

  // Render tên máy
  const getMachineName = (record) => {
    return record.productFullName || record.sourceModelText || record.configId || '—';
  };

  // Render Badge trạng thái với màu sắc trực quan
  const getStatusBadge = (record) => {
    if (record.closeType) {
      const label = formatCloseType(record.closeType);
      let cls = 'bg-secondary-subtle text-secondary'; // Mặc định
      
      if (record.closeType === 'SALE') cls = 'bg-primary-subtle text-primary border border-primary-subtle';
      else if (record.closeType === 'OTHER') cls = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      else if (record.closeType === 'CUSTOMER_RETURN' || record.closeType === 'RETURN' || record.closeType === 'CANCEL') cls = 'bg-danger-subtle text-danger border border-danger-subtle';
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
  const colSpanCount = tab === 'CLOSED' ? 11 : 8;

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
        <button
          className={`btn d-flex align-items-center gap-2 rounded-pill px-4 shadow-sm ${canExport ? 'btn-outline-primary' : 'btn-outline-secondary opacity-75'}`}
          title={canExport ? 'Xuất danh sách mã máy ra file CSV/Excel' : 'Cần quyền: Xuất dữ liệu báo cáo ra file Excel (EXPORT_DATA)'}
          onClick={() => {
            if (!requirePermission('EXPORT_DATA', showToast, 'Xuất danh sách mã máy ra file Excel')) return;
            if (!results || results.length === 0) {
              showToast('Không có dữ liệu mã máy để xuất', 'warning');
              return;
            }
            const headers = ['STT', 'Serial', 'Tên máy / Model', 'Cấu hình', 'Giá bán', 'Loại nhập', 'Trạng thái', 'Số ngày lưu kho', 'Ngày chờ KT/sửa', 'Tuổi tồn bán hàng'];
            const rows = results.map((r, i) => [
              i + 1,
              r.serialKey || '',
              getMachineName(r).replace(/,/g, ' '),
              (r.configDisplayName || r.productSummary || '').replace(/,/g, ' '),
              r.salePriceSnapshot || r.grossRevenue || '',
              r.intakeType ? formatIntakeType(r.intakeType) : '',
              r.closeType ? formatCloseType(r.closeType) : (r.state ? formatCycleState(r.state) : ''),
              r.storageDays ?? '',
              r.pausedDays ?? 0,
              r.sellableDays ?? r.storageDays ?? ''
            ]);
            const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Quan_Ly_Ma_May_${tab}_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Đã tải xuống file danh sách mã máy!', 'success');
          }}
        >
          {canExport ? <Download size={18} /> : <Lock size={16} />}
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
                    <option value="OTHER">Xuất khác</option>
                    <option value="CUSTOMER_RETURN">Khách đổi trả</option>
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
          <div className="table-responsive flex-grow-1">
            <table className="table table-hover align-middle m-0 bg-white">
              <thead className="table-light position-sticky top-0 shadow-sm text-secondary small text-uppercase fw-semibold" style={{ zIndex: 10 }}>
                <tr>
                  <th className="text-center py-3" style={{ width: '4%' }}>STT</th>
                  <th className="py-3" style={{ width: '11%' }}>Serial</th>
                  <th className="py-3" style={{ width: tab === 'CLOSED' ? '14%' : '19%' }}>Tên máy / Model</th>
                  <th className="py-3" style={{ width: tab === 'CLOSED' ? '14%' : '20%' }}>Cấu hình máy</th>
                  <th className="py-3" style={{ width: '10%' }}>Giá bán</th>
                  <th className="py-3" style={{ width: '9%' }}>Loại nhập</th>
                  <th className="py-3" style={{ width: '10%' }}>Trạng thái</th>
                  <th className="py-3" style={{ width: '11%' }}>Lưu kho</th>
                  {tab === 'CLOSED' && <th className="py-3" style={{ width: '14%' }}>Lý do / Tham chiếu</th>}
                  {tab === 'CLOSED' && <th className="py-3" style={{ width: '8%' }}>Ngày đóng</th>}
                  {tab === 'CLOSED' && <th className="text-center py-3" style={{ width: '10%' }}>Thao tác</th>}
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
                        <span className="small text-secondary">{record.configDisplayName || record.productSummary || '—'}</span>
                      </td>
                      <td className="text-nowrap">
                        <span className={record.closeType === 'SALE' ? 'fw-bold text-success' : 'fw-semibold text-dark'}>
                          {(record.salePriceSnapshot || record.grossRevenue)
                            ? `${formatCurrency(record.salePriceSnapshot || record.grossRevenue)} ₫`
                            : '—'}
                        </span>
                      </td>
                      <td className="small text-secondary">
                        {record.intakeType ? formatIntakeType(record.intakeType) : '—'}
                      </td>
                      <td>{getStatusBadge(record)}</td>
                      <td>{getStorageTime(record)}</td>
                      {tab === 'CLOSED' && (
                        <td className="small">
                          {record.sourceReference && (
                            <span className="badge bg-light text-dark border font-monospace me-1 mb-1 d-inline-block">
                              {record.sourceReference}
                            </span>
                          )}
                          {(record.customerName || record.customerPhone) && (
                            <div className="text-dark fw-medium mb-1">
                              <span>{record.customerName || 'Khách lẻ'}</span>
                              {record.customerPhone && (
                                <span className="badge bg-light text-secondary border font-monospace ms-1">
                                  {record.customerPhone}
                                </span>
                              )}
                            </div>
                          )}
                          {record.upgradeNote && (
                            <div className="text-warning-emphasis small mb-1" title={record.upgradeNote}>
                              Nâng cấp: {record.upgradeNote}
                            </div>
                          )}
                          <div className="text-secondary line-clamp-2" title={record.closeReason || record.note || ''}>
                            {record.closeReason || record.note || (!record.customerName ? '—' : '')}
                          </div>
                          {(record.salesperson || record.closedBy) && (
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              Bởi: {record.salesperson || record.closedBy}
                            </div>
                          )}
                        </td>
                      )}
                      {tab === 'CLOSED' && (
                        <td className="small text-secondary text-nowrap">
                          {record.closedAt ? new Date(record.closedAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      )}
                      {tab === 'CLOSED' && (
                        <td className="text-center">
                          {(record.closeType === 'OTHER' || record.closeType === 'CANCEL') ? (
                            <button
                              className={`btn btn-sm d-inline-flex align-items-center gap-1 text-nowrap ${canReopen ? 'btn-outline-primary' : 'btn-light text-muted border'}`}
                              onClick={() => handleOpenReopen(record)}
                              title={canReopen ? 'Nhập lại máy về kho (Hoàn tác xuất khác)' : 'Cần quyền: Xuất máy khác (MACHINE_EXPORT_OTHER)'}
                            >
                              {canReopen ? <RotateCcw size={13} /> : <Lock size={12} />}
                              <span>Nhập lại</span>
                            </button>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
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
          <div className="card-footer bg-white border-top p-3">
            <PhanTrang
              isZeroIndexed={true}
              page={page}
              totalPages={pageInfo.totalPages}
              totalElements={pageInfo.totalElements}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(0);
              }}
              pageSizeOptions={[15, 30, 50, 100]}
              itemName="mã máy"
              showPageNumbers={false}
            />
          </div>
        )}

      </div>

      {/* Modal Nhập lại kho từ máy xuất khác */}
      {reopenModal.open && reopenModal.record && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom p-4">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
                    <RotateCcw size={20} />
                  </div>
                  Nhập lại máy về kho
                </h5>
                <button type="button" className="btn-close" onClick={() => setReopenModal({ open: false, record: null })} disabled={isReopening}></button>
              </div>
              <div className="modal-body p-4 d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">Serial máy</span>
                  <span className="fw-bold font-monospace bg-light px-2 py-1 rounded border">{reopenModal.record.serialKey}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">Tên máy / Model</span>
                  <span className="fw-semibold text-dark">{getMachineName(reopenModal.record)}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">Mã tham chiếu / Phiếu</span>
                  <span className="badge bg-secondary-subtle text-secondary font-monospace">{reopenModal.record.sourceReference || 'XK'}</span>
                </div>

                <div className="mt-2">
                  <label className="form-label fw-semibold text-dark">Trạng thái đưa vào kho <span className="text-danger">*</span></label>
                  <select 
                    className="form-select"
                    value={reopenState}
                    onChange={e => setReopenState(e.target.value)}
                  >
                    <option value="READY">SẴN SÀNG BÁN (Máy đạt chuẩn, có thể xuất bán ngay)</option>
                    <option value="NEEDS_INSPECTION">CẦN KIỂM TRA (Đưa về khu vực kỹ thuật kiểm định lại)</option>
                  </select>
                </div>

                <div className="mt-1">
                  <label className="form-label fw-semibold text-dark">Lý do nhập lại kho <span className="text-danger">*</span></label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    value={reopenReason}
                    onChange={e => setReopenReason(e.target.value)}
                    placeholder="VD: Bảo hành ngoài đã xong mang về kho, Hoàn tác do xuất nhầm..."
                  />
                </div>

                <div className="alert alert-info border-info small mb-0 p-3">
                  Máy sẽ được chuyển trạng thái từ <b>ĐÃ ĐÓNG</b> sang kho hoạt động với Serial cũ và bắt đầu chu kỳ tồn kho mới.
                </div>
              </div>
              <div className="modal-footer border-top p-3 d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={() => setReopenModal({ open: false, record: null })} disabled={isReopening}>Hủy bỏ</button>
                <button className="btn btn-primary d-flex align-items-center gap-1" onClick={submitReopen} disabled={isReopening}>
                  {isReopening ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status"></div>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      <span>Xác nhận nhập kho</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}