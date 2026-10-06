import React, { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { apiTonKho, apiMayMoc } from '../../api';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatCycleState } from '../../constants/trangThai';

export default function TrangTimKiemTonKho() {
  const { showToast, confirm } = useToast();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('Tất cả');
  const [status, setStatus] = useState('Tất cả');
  const [segment, setSegment] = useState('Tất cả');
  const [results, setResults] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [activeVariant, setActiveVariant] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [innerPage, setInnerPage] = useState(0);
  const [activeModal, setActiveModal] = useState({ type: null, payload: null });
  const [modalForm, setModalForm] = useState({ price: '', reason: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    segments: [],
    productLines: []
  });

  useEffect(() => {
    setInnerPage(0);
    setExpandedRow(null);
  }, [activeVariant?.variant?.id]);

  const getDisplayName = (variant) => {
    return variant?.variantName || 'Không xác định';
  };

  useEffect(() => {
    // Load dynamic filters
    apiTonKho.getFilters().then(res => {
      setFilterOptions({
        brands: res.data?.brands || [],
        segments: res.data?.segments || [],
        productLines: res.data?.productLines || []
      });
    }).catch(console.error);
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await apiTonKho.search({ query, brand, status, segment, page, size: 10 });
      if (res.data && res.data.content) {
        setResults(res.data.content);
        setPageInfo({
          number: res.data.number,
          totalPages: res.data.totalPages,
          totalElements: res.data.totalElements
        });
        if (res.data.content.length > 0) {
          setActiveVariant(res.data.content[0]);
        } else {
          setActiveVariant(null);
        }
      } else {
        setResults(res.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInventory();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, brand, status, segment, page]);

  useEffect(() => {
    setPage(0);
  }, [query, brand, status, segment]);

  const clearFilters = () => {
    setQuery('');
    setBrand('Tất cả');
    setStatus('Tất cả');
    setSegment('Tất cả');
  };

  const toggleExpand = (serial) => {
    if (expandedRow === serial) {
      setExpandedRow(null);
    } else {
      setExpandedRow(serial);
    }
  };

  const handleUpdatePriceAll = () => {
    if (!activeVariant || !activeVariant.machines || activeVariant.machines.length === 0) {
      showToast('Không có máy nào để cập nhật', 'danger');
      return;
    }
    setModalForm({ price: activeVariant.machines[0]?.price ? activeVariant.machines[0].price.toString() : '', reason: '' });
    setActiveModal({ type: 'PRICE_ALL', payload: { variant: activeVariant } });
  };

  const handleUpdateSinglePrice = (machine) => {
    setModalForm({ price: machine.price ? machine.price.toString() : '', reason: '' });
    setActiveModal({ type: 'PRICE_SINGLE', payload: { machine } });
  };

  const handleMoveToInspection = (machine) => {
    setModalForm({ price: '', reason: '' });
    setActiveModal({ type: 'INSPECTION', payload: { machine } });
  };

  const handleExportOther = (machine) => {
    setModalForm({ price: '', reason: '' });
    setActiveModal({ type: 'EXPORT_OTHER', payload: { machine } });
  };

  const submitModal = async () => {
    setIsSubmitting(true);
    try {
      const { type, payload } = activeModal;
      if (type === 'PRICE_ALL') {
        const newPrice = parseCurrency(modalForm.price);
        if (!newPrice || isNaN(newPrice)) throw new Error("Giá không hợp lệ");
        const promises = payload.variant.machines.map(m => apiMayMoc.update(m.serial, { price: newPrice }));
        await Promise.all(promises);
        showToast('Cập nhật giá thành công', 'success');
      } else if (type === 'PRICE_SINGLE') {
        const newPrice = parseCurrency(modalForm.price);
        if (!newPrice || isNaN(newPrice)) throw new Error("Giá không hợp lệ");
        await apiMayMoc.update(payload.machine.serial, { price: newPrice });
        showToast('Cập nhật giá thành công', 'success');
      } else if (type === 'INSPECTION') {
        if (!modalForm.reason.trim()) throw new Error("Vui lòng nhập lý do");
        await apiMayMoc.update(payload.machine.serial, { status: 'NEEDS_INSPECTION', notes: modalForm.reason });
        showToast('Đã đưa máy về trạng thái kiểm tra', 'success');
      } else if (type === 'EXPORT_OTHER') {
        if (!modalForm.reason.trim()) throw new Error("Vui lòng nhập lý do xuất");
        await apiMayMoc.update(payload.machine.serial, { status: 'CLOSED', notes: modalForm.reason });
        showToast('Đã xuất máy thành công', 'success');
      }
      
      setActiveModal({ type: null, payload: null });
      fetchInventory();
    } catch (err) {
      showToast('Thao tác thất bại: ' + (err.userMessage || err.message), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveSearchOrFilter = query.trim().length > 0 || brand !== 'Tất cả' || status !== 'Tất cả' || segment !== 'Tất cả';

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-wrap gap-3 mb-4 align-items-center">
        <div className="flex-grow-1 position-relative" style={{ maxWidth: '400px' }}>
          <Search size={16} className="position-absolute text-secondary" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input className="form-control ps-5" style={{ height: '40px' }}
            placeholder="Tìm theo dòng máy, model, cấu hình, biến thể hoặc serial"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: '160px', height: '40px' }} value={segment} onChange={e => setSegment(e.target.value)}>
          <option value="Tất cả">Phân khúc: Tất cả</option>
          {filterOptions.segments.map(seg => (
            <option key={seg} value={seg}>{seg}</option>
          ))}
        </select>
        <select className="form-select" style={{ width: '140px', height: '40px' }} value={brand} onChange={e => setBrand(e.target.value)}>
          <option value="Tất cả">Hãng: Tất cả</option>
          {filterOptions.brands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select className="form-select" style={{ width: '150px', height: '40px' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="Tất cả">Trạng thái: Tất cả</option>
          <option value="READY">Sẵn sàng bán</option>
          <option value="NEEDS_INSPECTION">Cần kiểm tra</option>
        </select>
        <button className="btn btn-outline-secondary" style={{ height: '40px' }} onClick={clearFilters}>Xóa bộ lọc</button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-secondary small mb-0 fw-medium">
          {hasActiveSearchOrFilter 
            ? (pageInfo.totalElements > 0 ? `${pageInfo.totalElements} biến thể phù hợp` : `${results.length} biến thể phù hợp`)
            : 'Nhập từ khóa hoặc chọn bộ lọc để hiển thị kết quả'}
        </p>
        
        {(hasActiveSearchOrFilter && pageInfo.totalPages > 1) && (
          <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
            <span className="small text-secondary">Trang {page + 1} / {pageInfo.totalPages}</span>
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= pageInfo.totalPages - 1} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        )}
      </div>

      {hasActiveSearchOrFilter ? (
        <div className="row g-4 align-items-start">
        {/* Left Column - Variants */}
        <div className="col-xl-4 col-lg-5 col-md-12 d-flex flex-column gap-3 mb-4 mb-lg-0">
          {results.map(item => {
            const variantSubtitle = item?.config?.displayName || item?.variant?.variantName || '';
            
            let segmentVal = 'Chưa phân loại';
            const segCode = item?.variant?.platform?.modelLine?.segmentCode;
            if (segCode === 'OFFICE') segmentVal = 'Văn phòng';
            else if (segCode === 'GAMING') segmentVal = 'Gaming';
            else if (segCode === 'WORKSTATION') segmentVal = 'Máy trạm';
            else if (segCode) segmentVal = segCode;

            const isItemActive = activeVariant?.variant?.id === item?.variant?.id;

            return (
              <div key={item?.variant?.id || Math.random()} 
                  className={`card shadow-sm border p-3 ${isItemActive ? 'border-primary shadow' : ''}`}
                  onClick={() => setActiveVariant(item)}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="fw-bold text-dark">{item?.variant?.platform?.platformCode || getDisplayName(item?.variant)}</div>
                  <div className="text-end d-flex flex-column align-items-end">
                    <div className={`fw-bold ${(item?.totalCount || 0) > 1 ? 'text-success' : 'text-warning'}`}>Tồn: {item?.totalCount || 0}</div>
                    <div className="text-secondary" style={{fontSize: '11px', marginTop: '2px'}}>Giá đại diện</div>
                    <div className={`fw-bold text-primary ${(!item?.machines?.length || !item.machines[0]?.price) ? '' : ''}`}>
                      {(item?.machines?.length > 0 && item.machines[0]?.price) ? formatCurrency(item.machines[0].price) + ' đ' : 'Chưa có giá'}
                    </div>
                  </div>
                </div>
                <div className="small text-secondary mb-3">{variantSubtitle}</div>
                <div className="d-flex gap-2 mb-3">
                  <span className="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle">{segmentVal}</span>
                </div>
                <div className="small text-secondary opacity-75" style={{fontSize: '12px'}}>
                  Code: {item?.config?.configId || item?.variant?.variantId || 'DM-000000 - BT-000000'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column - Detail */}
        {activeVariant && activeVariant.variant && (
          <div className="col-xl-8 col-lg-7 col-md-12">
            <div className="card shadow-sm border-0 p-4 sticky-top" style={{ top: '1rem', zIndex: 1 }}>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h4 className="fw-bold text-dark mb-1">Chi tiết cấu hình</h4>
                  <h5 className="fw-bold text-dark mb-1">{activeVariant?.variant?.platform?.platformCode || getDisplayName(activeVariant?.variant)}</h5>
                  <p className="small text-secondary mb-0">
                    {activeVariant?.config?.displayName || activeVariant?.variant?.variantName}
                  </p>
                </div>
                <button className="btn btn-outline-primary btn-sm fw-medium" onClick={handleUpdatePriceAll}>Sửa giá cấu hình này</button>
              </div>

              <div className="row g-3 mb-4 pb-4 border-bottom">
                <div className="col-6 col-lg-3">
                  <div className="border rounded p-3 d-flex flex-column h-100 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="rounded-circle bg-success" style={{width: '8px', height: '8px'}}></span>
                      <span className="small text-secondary fw-medium">Máy đang tồn</span>
                    </div>
                    <div className="fs-4 fw-bold text-dark mt-auto">{activeVariant.totalCount || 0}</div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="border rounded p-3 d-flex flex-column h-100 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="rounded-circle bg-success" style={{width: '8px', height: '8px'}}></span>
                      <span className="small text-secondary fw-medium">Sẵn sàng bán</span>
                    </div>
                    <div className="fs-4 fw-bold text-dark mt-auto">{activeVariant.readyCount || 0}</div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="border rounded p-3 d-flex flex-column h-100 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="rounded-circle bg-warning" style={{width: '8px', height: '8px'}}></span>
                      <span className="small text-secondary fw-medium">Cần kiểm tra</span>
                    </div>
                    <div className="fs-4 fw-bold text-dark mt-auto">{activeVariant.inspectionCount || 0}</div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="border rounded p-3 d-flex flex-column h-100 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="rounded-circle bg-primary" style={{width: '8px', height: '8px'}}></span>
                      <span className="small text-secondary fw-medium">Đã xuất</span>
                    </div>
                    <div className="fs-4 fw-bold text-dark mt-auto">0</div>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-dark m-0">Danh sách serial</h5>
                  <span className="small text-secondary fw-medium">{(activeVariant?.machines || []).length} serial / vòng tồn</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light text-secondary small text-uppercase">
                      <tr>
                        <th className="ps-3 py-3">Serial</th>
                        <th className="py-3">Cấu hình (RAM/SSD)</th>
                        <th className="py-3">Trạng thái</th>
                        <th className="py-3">Ngày nhập</th>
                        <th className="py-3">Giá bán</th>
                        <th className="pe-3 py-3">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeVariant?.machines || []).slice(innerPage * 5, (innerPage + 1) * 5).map((machine, index) => {
                        const isExpanded = expandedRow === machine.serial;
                        return (
                          <React.Fragment key={machine.serial}>
                            <tr className={isExpanded ? 'border-start border-primary border-3' : ''}>
                              <td className="ps-3"><strong>{machine.serial}</strong></td>
                              <td><span className="small fw-medium text-dark">{machine.ram} | {machine.ssd}</span></td>
                              <td>
                                <span className={`badge rounded-pill border py-1 px-2 ${machine.status === 'READY' ? 'bg-success-subtle text-success border-success-subtle' : 'bg-warning-subtle text-warning-emphasis border-warning-subtle'}`}>
                                  {formatCycleState(machine.status).toUpperCase()}
                                </span>
                              </td>
                              <td>{machine.intakeAt ? new Date(machine.intakeAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                              <td>{machine.price ? formatCurrency(machine.price) + ' đ' : '—'}</td>
                              <td className="pe-3">
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleExpand(machine.serial)}>
                                  {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-start border-primary border-3 bg-light">
                                <td colSpan="6" className="p-4 border-bottom">
                                  <div className="d-flex flex-column align-items-center">
                                    <div className="d-flex align-items-start justify-content-between mb-4 position-relative w-75">
                                      <div className="position-absolute bg-success" style={{height: '2px', top: '12px', left: '10%', right: '10%', zIndex: 1}}></div>
                                      
                                      <div className="d-flex flex-column align-items-center position-relative z-2" style={{width: '100px'}}>
                                        <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center mb-2" style={{width: '24px', height: '24px'}}>
                                          <Check size={14} />
                                        </div>
                                        <div className="small fw-bold text-dark mb-1">Nhập kho</div>
                                        <div className="text-secondary opacity-75" style={{fontSize: '11px'}}>{machine.intakeAt ? new Date(machine.intakeAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</div>
                                      </div>
                                      
                                      <div className="d-flex flex-column align-items-center position-relative z-2" style={{width: '100px'}}>
                                        <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center mb-2" style={{width: '24px', height: '24px'}}>
                                          <Check size={14} />
                                        </div>
                                        <div className="small fw-bold text-dark mb-1">Kiểm tra đạt</div>
                                        <div className="text-secondary opacity-75" style={{fontSize: '11px'}}>—</div>
                                      </div>

                                      <div className="d-flex flex-column align-items-center position-relative z-2" style={{width: '100px'}}>
                                        <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center mb-2" style={{width: '24px', height: '24px'}}>
                                          <Check size={14} />
                                        </div>
                                        <div className="small fw-bold text-dark mb-1">Trạng thái hiện tại</div>
                                        <div className="text-secondary fw-medium" style={{fontSize: '12px'}}>{formatCycleState(machine.status).toUpperCase()}</div>
                                      </div>
                                    </div>

                                    <div className="d-flex gap-2 justify-content-end w-100">
                                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleUpdateSinglePrice(machine)}>Sửa giá riêng</button>
                                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleMoveToInspection(machine)}>Đưa về kiểm tra</button>
                                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleExportOther(machine)}>Xuất khác</button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(activeVariant?.machines || []).length > 5 && (
                  <div className="d-flex justify-content-center gap-2 align-items-center mt-3">
                    <button className="btn btn-sm btn-outline-secondary" disabled={innerPage === 0} onClick={() => setInnerPage(innerPage - 1)}>Trước</button>
                    <span className="small text-secondary">Trang {innerPage + 1} / {Math.ceil(activeVariant.machines.length / 5)}</span>
                    <button className="btn btn-sm btn-outline-secondary" disabled={innerPage >= Math.ceil(activeVariant.machines.length / 5) - 1} onClick={() => setInnerPage(innerPage + 1)}>Sau</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      ) : (
        <div className="text-center p-5 text-secondary">
          <Search size={48} className="mb-3 opacity-50" />
          <h4 className="fw-bold text-dark mb-2">Sẵn sàng tìm kiếm</h4>
          <p>Nhập từ khóa hoặc chọn bộ lọc ở trên để bắt đầu tra cứu kho</p>
        </div>
      )}

      {/* Render Modals */}
      {activeModal.type && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
              
              {activeModal.type === 'PRICE_ALL' && (
                <>
                  <div className="modal-header border-bottom p-4">
                    <h5 className="modal-title fw-bold">Sửa giá toàn bộ máy trong cấu hình này</h5>
                  </div>
                  <div className="modal-body p-4 d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Mã cấu hình</span>
                      <span className="fw-bold text-dark">{activeModal.payload.variant.config?.configId || activeModal.payload.variant.variant?.variantId || 'BT-000000'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Tên cấu hình</span>
                      <span className="fw-bold text-dark">{activeModal.payload.variant.config?.displayName || getDisplayName(activeModal.payload.variant.variant)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Giá hiện tại</span>
                      <span className="fw-bold text-dark">
                        {activeModal.payload.variant.machines[0]?.price ? formatCurrency(activeModal.payload.variant.machines[0].price) + ' đ' : 'Chưa có'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Số máy sẽ áp dụng</span>
                      <span className="fw-bold text-dark">{activeModal.payload.variant.machines.length}</span>
                    </div>

                    <div className="mt-2">
                      <label className="form-label fw-semibold text-dark">Giá bán mới <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" 
                        value={formatCurrency(modalForm.price)} 
                        onChange={e => setModalForm({...modalForm, price: parseCurrency(e.target.value)})}
                        placeholder="Nhập giá mới..."
                      />
                    </div>
                    <div className="alert alert-info border-info small mb-0 mt-2 p-3">
                      Sửa theo cấu hình chỉ cập nhật các máy đang tồn trong đúng cấu hình này. Giá của máy đã xuất và hóa đơn bán cũ được giữ nguyên.
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setActiveModal({type: null, payload: null})} disabled={isSubmitting}>Quay lại</button>
                    <button className="btn btn-primary" onClick={submitModal} disabled={isSubmitting}>Kiểm tra thay đổi</button>
                  </div>
                </>
              )}

              {activeModal.type === 'PRICE_SINGLE' && (
                <>
                  <div className="modal-header border-bottom p-4">
                    <h5 className="modal-title fw-bold">Sửa giá riêng theo serial</h5>
                  </div>
                  <div className="modal-body p-4 d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Serial</span>
                      <span className="fw-bold text-dark">{activeModal.payload.machine.serial}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Tên máy</span>
                      <span className="fw-bold text-dark">{getDisplayName(activeVariant?.variant)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Giá hiện tại</span>
                      <span className="fw-bold text-dark">
                        {activeModal.payload.machine.price ? formatCurrency(activeModal.payload.machine.price) + ' đ' : 'Chưa có'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Số máy sẽ áp dụng</span>
                      <span className="fw-bold text-dark">1</span>
                    </div>

                    <div className="mt-2">
                      <label className="form-label fw-semibold text-dark">Giá bán mới <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" 
                        value={formatCurrency(modalForm.price)} 
                        onChange={e => setModalForm({...modalForm, price: parseCurrency(e.target.value)})}
                        placeholder="Nhập giá mới..."
                      />
                    </div>
                    <div className="alert alert-info border-info small mb-0 mt-2 p-3">
                      Sửa riêng chỉ cập nhật máy đang tồn có đúng serial này. Giá của máy đã xuất và hóa đơn bán cũ được giữ nguyên.
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setActiveModal({type: null, payload: null})} disabled={isSubmitting}>Quay lại</button>
                    <button className="btn btn-primary" onClick={submitModal} disabled={isSubmitting}>Kiểm tra thay đổi</button>
                  </div>
                </>
              )}

              {activeModal.type === 'INSPECTION' && (
                <>
                  <div className="modal-header border-bottom p-4">
                    <h5 className="modal-title fw-bold">Đưa về kiểm tra lại</h5>
                  </div>
                  <div className="modal-body p-4 d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Serial</span>
                      <span className="fw-bold text-dark">{activeModal.payload.machine.serial}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Trạng thái mới</span>
                      <span className="fw-bold text-dark">CẦN KIỂM TRA</span>
                    </div>
                    <div className="mt-2">
                      <label className="form-label fw-semibold text-dark">Lý do <span className="text-danger">*</span></label>
                      <textarea className="form-control" rows="3"
                        value={modalForm.reason}
                        onChange={e => setModalForm({...modalForm, reason: e.target.value})}
                        placeholder="Mô tả vấn đề phát hiện..."
                      />
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setActiveModal({type: null, payload: null})} disabled={isSubmitting}>Quay lại</button>
                    <button className="btn btn-primary" onClick={submitModal} disabled={isSubmitting}>Kiểm tra dữ liệu</button>
                  </div>
                </>
              )}

              {activeModal.type === 'EXPORT_OTHER' && (
                <>
                  <div className="modal-header border-bottom p-4">
                    <h5 className="modal-title fw-bold">Xuất máy khác (Không doanh thu)</h5>
                  </div>
                  <div className="modal-body p-4 d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Serial</span>
                      <span className="fw-bold text-dark">{activeModal.payload.machine.serial}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Trạng thái mới</span>
                      <span className="fw-bold text-dark">ĐÃ ĐÓNG (XUẤT KHÁC)</span>
                    </div>
                    <div className="mt-2">
                      <label className="form-label fw-semibold text-dark">Lý do xuất / Mã tham chiếu <span className="text-danger">*</span></label>
                      <textarea className="form-control" rows="3"
                        value={modalForm.reason}
                        onChange={e => setModalForm({...modalForm, reason: e.target.value})}
                        placeholder="Nhập lý do xuất (vd: Chuyển kho ngoài, Đền bù, Hao hụt)..."
                      />
                    </div>
                    <div className="alert alert-warning border-warning text-warning-emphasis small mb-0 mt-2 p-3">
                      Lưu ý: Luồng xuất khác sẽ <b>không</b> ghi nhận vào doanh thu và không thể hoàn tác trực tiếp.
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setActiveModal({type: null, payload: null})} disabled={isSubmitting}>Quay lại</button>
                    <button className="btn btn-danger" onClick={submitModal} disabled={isSubmitting}>Xác nhận xuất</button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

