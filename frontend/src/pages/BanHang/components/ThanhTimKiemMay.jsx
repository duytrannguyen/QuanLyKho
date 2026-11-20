import React from 'react';
import { Search, RotateCcw, Monitor, X, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../../utils/dinh_dang';

export const SearchSection = ({ searchTerm, setSearchTerm, onSearch, isLoading, hasMachine, onResetSearch, scannedMachine }) => {
  if (hasMachine) {
    return (
      <div className="card shadow-sm mb-4 border-success border-opacity-50 rounded-4 bg-success-subtle bg-opacity-10">
        <div className="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          
          {/* Thông tin máy đã chọn */}
          <div className="d-flex align-items-start gap-3">
            <div className="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-success">MÁY ĐANG XUẤT BÁN</span>
                {scannedMachine?.salePrice && (
                  <span className="fw-bold text-primary">
                    {formatCurrency(scannedMachine.salePrice)}đ
                  </span>
                )}
              </div>
              <h5 className="fw-bold text-dark mb-1">
                {scannedMachine?.sourceModelText || scannedMachine?.platformDisplayName || 'Thiết bị không rõ tên'}
              </h5>
              {scannedMachine?.serialKey && (
                <span className="badge bg-white text-dark border font-monospace px-2 py-1">
                  SN: {scannedMachine.serialKey}
                </span>
              )}
            </div>
          </div>

          {/* Nút hành động */}
          <div>
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4 shadow-sm d-flex align-items-center fw-medium"
              onClick={onResetSearch}
            >
              <RotateCcw size={16} className="me-2" /> Đổi máy khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-4 border-0 rounded-4 bg-white">
      <div className="card-body p-4">
        <label className="fw-bold text-dark mb-3 d-flex align-items-center fs-6">
          <Search size={18} className="me-2 text-primary" /> 
          Tìm kiếm & Quét mã vạch máy xuất bán
        </label>
        
        <form onSubmit={onSearch}>
          <div className="input-group input-group-lg shadow-sm rounded-3 overflow-hidden border">
            <span className="input-group-text bg-white border-0 text-muted px-3">
              <Search size={20} />
            </span>
            <input
              type="text"
              className="form-control border-0 px-2 shadow-none fs-6"
              placeholder="Quét mã vạch Serial hoặc nhập tên máy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary px-4 fw-bold"
              disabled={isLoading || !searchTerm.trim()}
            >
              {isLoading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              {isLoading ? 'Đang tìm...' : 'TÌM KIẾM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export const MachineCandidatesTable = ({ candidates, onSelectCandidate, onClear }) => (
  <div className="card shadow-sm mb-4 border-0 rounded-4 overflow-hidden">
    
    {/* Card Header */}
    <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
      <div>
        <h6 className="card-title fw-bold m-0 text-primary d-flex align-items-center fs-6 mb-1">
          <Monitor className="me-2" size={18} />
          Tìm thấy {candidates.length} máy trong kho
        </h6>
        <span className="text-muted small">
          Vui lòng chọn 1 máy cụ thể bên dưới để tiến hành xuất bán.
        </span>
      </div>
      {onClear && (
        <button
          type="button"
          className="btn btn-light text-secondary rounded-circle p-2 d-flex align-items-center justify-content-center transition-all"
          onClick={onClear}
          title="Đóng bảng"
        >
          <X size={18} />
        </button>
      )}
    </div>

    {/* Table */}
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th className="ps-4 py-3 text-secondary small fw-medium text-uppercase">Tên & Dòng máy</th>
            <th className="py-3 text-secondary small fw-medium text-uppercase">Số Serial</th>
            <th className="py-3 text-secondary small fw-medium text-uppercase">Cấu hình chi tiết</th>
            <th className="py-3 text-secondary small fw-medium text-uppercase text-end">Giá niêm yết</th>
            <th className="py-3 text-secondary small fw-medium text-uppercase text-center">Trạng thái</th>
            <th className="pe-4 py-3 text-secondary small fw-medium text-uppercase text-end">Thao tác</th>
          </tr>
        </thead>
        <tbody className="border-top-0">
          {candidates.map((m) => {
            const isReady = m.state === 'READY';
            return (
              <tr 
                key={m.id || m.serialKey} 
                style={{ cursor: 'pointer' }} 
                onClick={() => onSelectCandidate(m)}
                className="transition-all"
              >
                <td className="ps-4 py-3">
                  <div className="fw-bold text-dark mb-1">{m.sourceModelText || 'Không rõ dòng máy'}</div>
                  <div className="text-muted small">Mã chu kỳ: <span className="fw-medium">{m.cycleId || '—'}</span></div>
                </td>
                
                <td className="py-3">
                  <span className="badge bg-light text-dark font-monospace border px-2 py-1 fs-6">
                    {m.serialKey}
                  </span>
                </td>
                
                <td className="py-3">
                  <div className="d-flex flex-wrap gap-2">
                    {m.cpuCode && <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-2 py-1">{m.cpuCode}</span>}
                    {m.ram && <span className="badge bg-info bg-opacity-10 text-info border border-info-subtle px-2 py-1">RAM {m.ram}</span>}
                    {m.ssd && <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle px-2 py-1">SSD {m.ssd}</span>}
                  </div>
                </td>
                
                <td className="text-end py-3">
                  <div className="fw-bold text-primary fs-6">
                    {m.salePrice ? `${formatCurrency(m.salePrice)}đ` : '—'}
                  </div>
                </td>
                
                <td className="text-center py-3">
                  <span
                    className={`badge rounded-pill px-3 py-1 fw-medium ${
                      isReady
                        ? 'bg-success bg-opacity-10 text-success border border-success-subtle'
                        : 'bg-warning bg-opacity-10 text-warning border border-warning-subtle'
                    }`}
                  >
                    {isReady ? 'SẴN SÀNG' : m.state || 'KIỂM TRA'}
                  </span>
                </td>
                
                <td className="text-end pe-4 py-3">
                  <button
                    type="button"
                    className="btn btn-primary px-4 rounded-pill fw-medium shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCandidate(m);
                    }}
                  >
                    Chọn
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);