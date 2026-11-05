import React from 'react';
import { Search, RotateCcw, Monitor, X, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../../utils/dinh_dang';

export const MachineCandidatesTable = ({ candidates, onSelectCandidate, onClear }) => (
  <div className="card shadow-sm mb-3 border-0 rounded-3 overflow-hidden">
    <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
      <div>
        <h6 className="card-title fw-bold m-0 text-primary d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
          <Monitor className="me-1.5" size={16} />
          Tìm thấy {candidates.length} máy trong kho
        </h6>
        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
          Vui lòng chọn 1 máy cụ thể bên dưới để xuất bán.
        </small>
      </div>
      {onClear && (
        <button
          type="button"
          className="btn btn-sm btn-light text-secondary rounded-circle p-1 hover-bg-light"
          onClick={onClear}
          title="Đóng"
        >
          <X size={15} />
        </button>
      )}
    </div>
    <div className="table-responsive">
      <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
        <thead className="table-light">
          <tr>
            <th className="ps-3 py-1.5 text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Tên dòng máy</th>
            <th className="py-1.5 text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Số Serial</th>
            <th className="py-1.5 text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Cấu hình</th>
            <th className="py-1.5 text-secondary text-end text-uppercase" style={{ fontSize: '0.7rem' }}>Giá niêm yết</th>
            <th className="py-1.5 text-center text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Trạng thái</th>
            <th className="py-1.5 text-end pe-3 text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((m) => {
            const isReady = m.state === 'READY';
            return (
              <tr key={m.id || m.serialKey} style={{ cursor: 'pointer' }} onClick={() => onSelectCandidate(m)}>
                <td className="ps-3 py-1.5">
                  <div className="fw-bold text-dark">{m.sourceModelText || 'Không rõ dòng máy'}</div>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>Mã chu kỳ: {m.cycleId || '—'}</small>
                </td>
                <td className="py-1.5">
                  <span className="badge bg-light text-dark font-monospace border px-1.5 py-0.5">{m.serialKey}</span>
                </td>
                <td className="py-1.5">
                  <div className="d-flex flex-wrap gap-1">
                    {m.cpuCode && <span className="badge badge-soft-primary" style={{ fontSize: '0.7rem' }}>{m.cpuCode}</span>}
                    {m.ram && (
                      <span className="badge bg-info bg-opacity-10 text-info border border-info-subtle" style={{ fontSize: '0.7rem' }}>
                        RAM {m.ram}
                      </span>
                    )}
                    {m.ssd && (
                      <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle" style={{ fontSize: '0.7rem' }}>
                        SSD {m.ssd}
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-end py-1.5">
                  <div className="fw-bold text-primary">
                    {m.salePrice ? formatCurrency(m.salePrice) + 'đ' : '—'}
                  </div>
                </td>
                <td className="text-center py-1.5">
                  <span
                    className={`badge rounded-pill px-2 py-0.5 fw-medium ${
                      isReady
                        ? 'bg-success bg-opacity-10 text-success border border-success-subtle'
                        : 'bg-warning bg-opacity-10 text-warning border border-warning-subtle'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {isReady ? 'SẴN SÀNG' : m.state || 'KIỂM TRA'}
                  </span>
                </td>
                <td className="text-end pe-3 py-1.5">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-2.5 py-0.5 rounded-pill fw-medium shadow-sm"
                    style={{ fontSize: '0.75rem' }}
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

export const SearchSection = ({ searchTerm, setSearchTerm, onSearch, isLoading, hasMachine, onResetSearch, scannedMachine }) => {
  if (hasMachine) {
    return (
      <div className="card shadow-sm mb-2.5 border-0 rounded-3 bg-white">
        <div className="card-body py-1.5 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span
              className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fw-bold d-flex align-items-center gap-1"
              style={{ fontSize: '0.72rem' }}
            >
              <CheckCircle size={13} /> MÁY ĐANG XUẤT BÁN
            </span>
            <span className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
              {scannedMachine?.sourceModelText || scannedMachine?.platformDisplayName || 'Thiết bị'}
            </span>
            {scannedMachine?.serialKey && (
              <span className="badge bg-light text-primary border font-monospace" style={{ fontSize: '0.75rem' }}>
                SN: {scannedMachine.serialKey}
              </span>
            )}
            {scannedMachine?.salePrice && (
              <span className="text-muted small">
                (Niêm yết: <strong className="text-dark">{formatCurrency(scannedMachine.salePrice)}đ</strong>)
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-medium rounded-pill px-2.5 py-0.5 shadow-sm d-flex align-items-center"
            onClick={onResetSearch}
            style={{ fontSize: '0.75rem' }}
          >
            <RotateCcw size={12} className="me-1 text-primary" /> Đổi máy khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-3 border-0 rounded-3 overflow-hidden">
      <div className="card-body py-2.5 px-3 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-1.5">
          <h6 className="fw-bold text-dark mb-0 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
            <Search size={15} className="me-1.5 text-primary" /> Tìm kiếm máy xuất bán
          </h6>
        </div>
        <form onSubmit={onSearch}>
          <div className="input-group border rounded-3 overflow-hidden shadow-none bg-light">
            <span className="input-group-text bg-transparent border-0 text-primary ps-2.5 py-1">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-control border-0 bg-transparent px-2 py-1 shadow-none fw-medium"
              placeholder="Quét mã vạch Serial hoặc nhập tên máy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              autoFocus
              style={{ fontSize: '0.88rem' }}
            />
            <button
              type="submit"
              className="btn btn-primary px-3 py-1 fw-bold text-uppercase"
              disabled={isLoading || !searchTerm.trim()}
              style={{ fontSize: '0.78rem' }}
            >
              {isLoading ? <span className="spinner-border spinner-border-sm" /> : 'Tìm kiếm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
