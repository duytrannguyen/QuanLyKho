import React, { useState, useEffect } from 'react';
import { Search, X, History, RotateCcw, Download, PackageOpen, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiMayMoc } from '../../api';
import { formatCurrency, formatDate } from '../../utils/dinh_dang';
import PhanTrang from '../../components/common/PhanTrang';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';

export default function ModalSoXuatKhac({ isOpen, onClose, onMachineRestored }) {
  const { showToast } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const canReopen = hasPermission('MACHINE_EXPORT_OTHER') || hasPermission('ADMIN');
  const canExport = hasPermission('EXPORT_DATA');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modal xác nhận nhập lại kho
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenState, setReopenState] = useState('READY');
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchExportedMachines = async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const res = await apiMayMoc.searchHistory({
        query: debouncedQuery,
        status: 'OTHER',
        page,
        size: pageSize,
      });
      if (res.data && res.data.content) {
        setResults(res.data.content);
        setPageInfo({
          number: res.data.number,
          totalPages: res.data.totalPages,
          totalElements: res.data.totalElements,
        });
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Lỗi tải sổ xuất khác:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExportedMachines();
    }
  }, [isOpen, debouncedQuery, page, pageSize]);

  const handleOpenReopen = (record) => {
    if (!requirePermission('MACHINE_EXPORT_OTHER', showToast, 'Nhập lại máy về kho')) return;
    setReopenTarget(record);
    setReopenState('READY');
    setReopenReason(`Nhập lại kho từ luồng xuất khác (${record.sourceReference || 'XK'})`);
  };

  const submitReopen = async () => {
    if (!reopenTarget) return;
    setIsReopening(true);
    try {
      await apiMayMoc.reopenExported(reopenTarget.serialKey, {
        targetState: reopenState,
        reason: reopenReason.trim() || 'Nhập lại máy về kho từ luồng xuất khác',
      });
      showToast(`Đã nhập lại máy ${reopenTarget.serialKey} về kho thành công!`, 'success');
      setReopenTarget(null);
      fetchExportedMachines();
      if (onMachineRestored) onMachineRestored();
    } catch (err) {
      showToast('Không thể nhập lại máy: ' + (err.userMessage || err.message), 'danger');
    } finally {
      setIsReopening(false);
    }
  };

  const handleExportExcel = () => {
    if (!requirePermission('EXPORT_DATA', showToast, 'Xuất sổ xuất khác ra Excel')) return;
    if (!results || results.length === 0) {
      showToast('Không có dữ liệu để xuất Excel', 'warning');
      return;
    }
    const headers = ['STT', 'Mã phiếu xuất', 'Serial', 'Tên máy', 'Cấu hình', 'Lý do xuất khác', 'Người thực hiện', 'Thời gian xuất', 'Giá niêm yết'];
    const rows = results.map((r, i) => [
      i + 1,
      r.sourceReference || '',
      r.serialKey || '',
      (r.sourceModelText || '').replace(/,/g, ' '),
      (r.configDisplayName || '').replace(/,/g, ' '),
      (r.closeReason || r.note || '').replace(/,/g, ' '),
      r.closedBy || '',
      r.closedAt ? new Date(r.closedAt).toLocaleString('vi-VN') : '',
      r.salePriceSnapshot || ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `So_Xuat_Khac_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống sổ xuất khác thành công!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 1050 }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '92vw' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
          
          {/* Header */}
          <div className="modal-header border-bottom bg-white p-4">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-warning bg-opacity-10 p-2 rounded-3 text-warning-emphasis">
                <History size={24} />
              </div>
              <div>
                <h5 className="modal-title fw-bold text-dark m-0 d-flex align-items-center gap-2">
                  <span>Sổ theo dõi &amp; Lịch sử xuất khác</span>
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small fw-normal">
                    {pageInfo.totalElements} máy đã xuất
                  </span>
                </h5>
                <p className="text-secondary small m-0 mt-1">Danh sách toàn bộ các máy xuất ngoài luồng bán hàng (mượn nội bộ, gửi bảo hành hãng, chuyển kho ngoài, rã xác...)</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className={`btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3 ${canExport ? 'btn-outline-primary' : 'btn-outline-secondary opacity-75'}`}
                onClick={handleExportExcel}
                title={canExport ? 'Xuất sổ xuất khác ra Excel' : 'Cần quyền xuất dữ liệu (EXPORT_DATA)'}
              >
                {canExport ? <Download size={15} /> : <Lock size={14} />}
                <span>Xuất Excel</span>
              </button>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 bg-light border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="position-relative flex-grow-1" style={{ maxWidth: '450px' }}>
              <Search size={16} className="position-absolute top-50 translate-middle-y text-secondary ms-3" />
              <input
                className="form-control ps-5 pe-4 py-2 rounded-pill bg-white"
                placeholder="Tìm theo Serial, mã phiếu xuất, lý do..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <X
                  size={16}
                  className="position-absolute top-50 end-0 translate-middle-y text-muted me-3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setQuery('')}
                />
              )}
            </div>
            <div className="small text-secondary">
              Hiển thị <strong>{results.length}</strong> / <strong>{pageInfo.totalElements}</strong> kết quả
            </div>
          </div>

          {/* Table */}
          <div className="modal-body p-0" style={{ minHeight: '380px' }}>
            <div className="table-responsive m-0">
              <table className="table table-hover align-middle m-0 bg-white">
                <thead className="table-light position-sticky top-0 shadow-sm text-secondary small text-uppercase fw-semibold" style={{ zIndex: 5 }}>
                  <tr>
                    <th className="text-center py-3" style={{ width: '5%' }}>STT</th>
                    <th className="py-3" style={{ width: '12%' }}>Mã phiếu xuất</th>
                    <th className="py-3" style={{ width: '12%' }}>Serial</th>
                    <th className="py-3" style={{ width: '17%' }}>Tên máy / Model</th>
                    <th className="py-3" style={{ width: '17%' }}>Cấu hình</th>
                    <th className="py-3" style={{ width: '16%' }}>Lý do xuất khác</th>
                    <th className="py-3" style={{ width: '10%' }}>Thời gian xuất</th>
                    <th className="text-center py-3" style={{ width: '11%' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <div className="mt-2 text-secondary small">Đang tải lịch sử xuất khác...</div>
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5">
                        <div className="text-muted d-flex flex-column align-items-center">
                          <PackageOpen size={48} className="mb-3 opacity-50" />
                          <h6 className="fw-bold mb-1">Chưa có máy nào xuất khác</h6>
                          <p className="mb-0 small">Các máy được xuất khác tại kho sẽ được lưu lại toàn bộ tại đây</p>
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
                          <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                            {record.sourceReference || 'XK-CHƯA-MÃ'}
                          </span>
                        </td>
                        <td>
                          <span className="fw-medium text-dark font-monospace small bg-light px-2 py-1 rounded border">
                            {record.serialKey}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold text-dark">{record.sourceModelText || '—'}</span>
                        </td>
                        <td>
                          <span className="small text-secondary">{record.configDisplayName || '—'}</span>
                        </td>
                        <td>
                          <div className="fw-medium text-dark small" style={{ maxWidth: '280px' }}>
                            {record.closeReason || record.note || 'Xuất khác'}
                          </div>
                          {record.closedBy && (
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              Người xuất: <strong>{record.closedBy}</strong>
                            </div>
                          )}
                        </td>
                        <td className="small text-secondary">
                          {record.closedAt ? (
                            <>
                              <div>{new Date(record.closedAt).toLocaleDateString('vi-VN')}</div>
                              <div className="text-muted" style={{ fontSize: '11px' }}>
                                {new Date(record.closedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="text-center">
                          <button
                            className={`btn btn-sm d-inline-flex align-items-center gap-1 rounded-pill px-2.5 text-nowrap ${canReopen ? 'btn-outline-primary' : 'btn-light text-muted border'}`}
                            onClick={() => handleOpenReopen(record)}
                            title={canReopen ? 'Nhập lại máy về kho (Hoàn tác xuất khác)' : 'Cần quyền xuất máy khác (MACHINE_EXPORT_OTHER)'}
                          >
                            {canReopen ? <RotateCcw size={13} /> : <Lock size={12} />}
                            <span>Nhập lại</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer & Phân trang */}
          <div className="modal-footer bg-light border-top p-3 d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-secondary" onClick={onClose}>
              Đóng sổ
            </button>
            {results.length > 0 && (
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
                pageSizeOptions={[10, 20, 50]}
                itemName="máy"
                showPageNumbers={true}
              />
            )}
          </div>

        </div>
      </div>

      {/* Sub-Modal Nhập lại kho */}
      {reopenTarget && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom p-4">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
                    <RotateCcw size={20} />
                  </div>
                  Xác nhận nhập lại máy về kho
                </h5>
                <button type="button" className="btn-close" onClick={() => setReopenTarget(null)} disabled={isReopening}></button>
              </div>
              <div className="modal-body p-4 d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">Serial máy</span>
                  <span className="fw-bold font-monospace bg-light px-2 py-1 rounded border">{reopenTarget.serialKey}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">Tên máy</span>
                  <span className="fw-semibold text-dark">{reopenTarget.sourceModelText || '—'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">Mã phiếu xuất</span>
                  <span className="badge bg-secondary-subtle text-secondary font-monospace">{reopenTarget.sourceReference || 'XK'}</span>
                </div>

                <div className="mt-2">
                  <label className="form-label fw-semibold text-dark">Đưa máy về trạng thái kho <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={reopenState}
                    onChange={e => setReopenState(e.target.value)}
                  >
                    <option value="READY">SẴN SÀNG BÁN (Máy tốt, kiểm tra đạt chuẩn, có thể xuất bán ngay)</option>
                    <option value="NEEDS_INSPECTION">CẦN KIỂM TRA (Đưa về khu vực kỹ thuật để kiểm tra lại)</option>
                  </select>
                </div>

                <div className="mt-1">
                  <label className="form-label fw-semibold text-dark">Lý do nhập lại kho <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={reopenReason}
                    onChange={e => setReopenReason(e.target.value)}
                    placeholder="VD: Gửi bảo hành hãng đã xong, Hoàn tác do xuất nhầm..."
                  />
                </div>

                <div className="alert alert-info border-info small mb-0 p-3">
                  Máy sẽ được kích hoạt lại trong kho hoạt động và cập nhật trạng thái mới. Lịch sử xuất khác trước đó vẫn được lưu vết đầy đủ.
                </div>
              </div>
              <div className="modal-footer border-top p-3 d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={() => setReopenTarget(null)} disabled={isReopening}>Quay lại</button>
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

