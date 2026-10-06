import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { logApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatEventType } from '../../utils/dinh_dang';

export default function TrangNhatKyHoatDong() {
  const { showToast } = useToast();
  const [activeLog, setActiveLog] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(0);


  useEffect(() => {
    fetchLogs(searchQuery);
  }, [page, pageSize, searchQuery]);

  const fetchLogs = async (search = '') => {
    try {
      setLoading(true);
      const res = await logApi.getList({ page: page, size: pageSize, search });
      if (res.data && res.data.content) {
        setLogs(res.data.content);
        setTotalPages(res.data.totalPages || 0);
        if (res.data.content.length > 0) {
          setActiveLog(res.data.content[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4 h-100 d-flex flex-column bg-light min-vh-100">
      <div className="d-flex gap-3 align-items-center mb-4">
        <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
          <Search size={16} className="position-absolute top-50 translate-middle-y text-secondary" style={{ left: '12px' }} />
          <input 
            className="form-control" 
            style={{ paddingLeft: '36px' }} 
            placeholder="Tìm serial, Transaction ID hoặc Event ID" 
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <select className="form-select w-auto" style={{ minWidth: '200px' }}>
          <option>Loại sự kiện: Tất cả</option>
        </select>
        <select className="form-select w-auto" style={{ minWidth: '200px' }}>
          <option>Người thao tác: Tất cả</option>
        </select>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => showToast('Tính năng đang phát triển', 'info')}>Xóa bộ lọc</button>
      </div>
      
      <p className="text-secondary small mb-3">{logs.length} sự kiện phù hợp {loading && '(Đang tải...)'}</p>

      <div className="row flex-grow-1 min-vh-0">
        {/* Left - Table */}
        <div className="col-lg-8 mb-4 mb-lg-0 d-flex flex-column h-100">
          <div className="card shadow-sm border-0 d-flex flex-column h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="fw-bold text-dark m-0">Danh sách sự kiện</h5>
            </div>
            <div className="table-responsive flex-grow-1">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light position-sticky top-0 shadow-sm" style={{ zIndex: 10 }}>
                  <tr>
                    <th className="text-center text-secondary small text-uppercase">STT</th>
                    <th className="text-secondary small text-uppercase">Thời gian</th>
                    <th className="text-secondary small text-uppercase">Sự kiện</th>
                    <th className="text-secondary small text-uppercase">Serial</th>
                    <th className="text-secondary small text-uppercase">Nguồn (Cycle/Tx)</th>
                    <th className="text-secondary small text-uppercase">Người thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-secondary">Chưa có sự kiện nào</td>
                    </tr>
                  )}
                  {logs.map((log, index) => (
                    <tr key={log.id} 
                        className={activeLog?.id === log.id ? 'table-primary border-start border-primary border-4' : ''}
                        onClick={() => setActiveLog(log)}
                        style={{ cursor: 'pointer' }}>
                      <td className="text-center">{page * pageSize + index + 1}</td>
                      <td>{new Date(log.eventAt).toLocaleString('vi-VN')}</td>
                      <td>
                        <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle">{formatEventType(log.eventType)}</span>
                      </td>
                      <td><strong>{log.serialKey || '-'}</strong></td>
                      <td className="small">{log.cycleId || log.transactionId || '-'}</td>
                      <td className="small">{log.actor || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-secondary">Hiển thị:</span>
                <select className="form-select form-select-sm w-auto" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              
              {totalPages > 1 && (
                <div className="d-flex gap-2 align-items-center">
                  <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
                  <span className="small text-secondary">
                    Trang {page + 1} / {totalPages}
                  </span>
                  <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Sau</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right - Detail Panel */}
        <div className="col-lg-4 d-flex flex-column h-100">
          {activeLog && (
            <div className="card shadow-sm border-0 p-4 h-100 sticky-lg-top overflow-auto" style={{ top: '80px', maxHeight: 'calc(100vh - 100px)' }}>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h5 className="fw-bold text-dark m-0 mb-1">Chi tiết sự kiện</h5>
                  <p className="small text-secondary m-0">Chỉ đọc</p>
                </div>
                <span className="badge rounded-pill bg-success-subtle text-success border border-success">{formatEventType(activeLog.eventType)}</span>
              </div>

              <div className="mb-4">
                <div className="small text-secondary fw-bold text-uppercase mb-1">Event ID</div>
                <div className="fs-6 text-dark fw-medium">{activeLog.eventId}</div>
                <div className="small text-secondary mt-1">Idempotency: {activeLog.idempotencyKey}</div>
                <div className="small text-secondary mt-1">{new Date(activeLog.eventAt).toLocaleString('vi-VN')}</div>
              </div>

              <div className="mb-4">
                <div className="small text-secondary fw-bold text-uppercase mb-1">Serial / Cycle ID</div>
                <div className="fs-3 fw-bold text-dark">{activeLog.serialKey || '-'}</div>
                <div className="small text-secondary mt-1">
                  Cycle: {activeLog.cycleId || '-'}
                </div>
              </div>

              <div className="mb-4">
                <div className="card bg-light border-0">
                  <div className="card-body p-3">
                    <div className="small text-secondary mb-2">Dữ liệu sự kiện (JSON)</div>
                    <pre className="small text-secondary bg-white p-2 border rounded overflow-auto m-0" style={{ fontSize: '11px', maxHeight: '200px' }}>
                      {activeLog.eventData || '{}'}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mb-4 d-flex justify-content-between align-items-center">
                <div className="small text-secondary fw-bold text-uppercase">Người thực hiện</div>
                <div className="small fw-bold text-dark">{activeLog.actor || '-'}</div>
              </div>

              <div className="alert alert-info border-0 rounded-3 mb-4 py-2 small">
                Sự kiện được ghi bằng Append-Only Pattern và không thể sửa hoặc xóa trực tiếp.
              </div>

              <div className="d-grid mt-auto">
                <button className="btn btn-outline-secondary" onClick={() => showToast('Tính năng đang phát triển', 'info')}>Mở hồ sơ serial</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
