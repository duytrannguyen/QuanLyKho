import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { syncApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

export default function TrangDoiSoat() {
  const { showToast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('Lỗi cần xử lý');
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [runs, setRuns] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(0);
  }, [activeTab, pageSize]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'Lỗi cần xử lý') {
        const res = await syncApi.getIssues();
        setIssues(res.data || []);
      } else if (activeTab === 'Lịch sử đồng bộ') {
        const res = await syncApi.getRuns();
        setRuns(res.data || []);
      }
    } catch (err) {
      showToast('Lỗi tải dữ liệu', 'danger');
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      await syncApi.run('MANUAL');
      showToast('Đã kích hoạt lượt đồng bộ mới', 'success');
      fetchData();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi đồng bộ', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleRecheckIssue = async (issueId) => {
    try {
      const res = await syncApi.recheckIssue(issueId);
      if (res.data.status === 'RESOLVED') {
        showToast('Lỗi đã được tự động xử lý', 'success');
      } else {
        showToast('Chưa thể tự động xử lý lỗi này, vui lòng khắc phục thủ công', 'warning');
      }
      fetchData();
    } catch (err) {
      showToast('Lỗi quét lại', 'danger');
    }
  };

  const handleResolveManual = async (issueId) => {
    const isConfirmed = await confirm('Xác nhận đóng lỗi thủ công?');
    if (!isConfirmed) return;
    try {
      await syncApi.resolveIssue(issueId, 'Người dùng đã kiểm tra và đóng thủ công');
      showToast('Đã đóng lỗi', 'success');
      fetchData();
    } catch (err) {
      showToast('Lỗi thao tác', 'danger');
    }
  };

  return (
    <div className="container-fluid py-4 min-vh-100 bg-light">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold text-dark m-0 mb-1">Đối soát DataSale & Đồng bộ</h2>
          <p className="text-secondary m-0">Quản lý các lượt đồng bộ và theo dõi sai lệch dữ liệu với KiotViet / Nhanh.vn</p>
        </div>
        <div>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSyncNow} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            {loading ? 'Đang chạy...' : 'Đồng bộ ngay'}
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {['Tổng quan', 'Lỗi cần xử lý', 'Lịch sử đồng bộ'].map(tab => (
          <li className="nav-item" key={tab}>
            <button 
              className={`nav-link text-dark fw-medium ${activeTab === tab ? 'active border-primary border-bottom-2 text-primary fw-bold' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab ? { borderBottom: '2px solid #0d6efd' } : {}}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        <div className="col-12">
          {activeTab === 'Lỗi cần xử lý' && (
            <div className="card shadow-sm border-0 p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark m-0">Danh sách lỗi sai lệch</h5>
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>Làm mới</button>
              </div>
              
              {issues.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center text-secondary py-5">
                  <CheckCircle size={48} className="text-success mb-3" />
                  <h5 className="fw-bold text-dark">Tuyệt vời! Không có lỗi nào</h5>
                  <p className="m-0">Mọi dữ liệu trong kho đang khớp hoàn toàn với DataSale.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: '60px' }}>STT</th>
                        <th>ID</th>
                        <th>Loại lỗi</th>
                        <th>Đối tượng</th>
                        <th>Thời gian phát hiện</th>
                        <th style={{ minWidth: '300px' }}>Tin nhắn</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.slice(page * pageSize, (page + 1) * pageSize).map((issue, index) => (
                        <tr key={issue.issueId}>
                          <td className="text-center">{page * pageSize + index + 1}</td>
                          <td><strong>{issue.issueId}</strong></td>
                          <td>
                            <span className="badge bg-warning text-dark">{issue.issueType}</span>
                          </td>
                          <td>{issue.entityId}</td>
                          <td>{new Date(issue.firstSeenAt).toLocaleString('vi-VN')}</td>
                          <td><small>{issue.message}</small></td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => handleRecheckIssue(issue.issueId)}>Quét lại</button>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => handleResolveManual(issue.issueId)}>Đóng thủ công</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {issues.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-secondary">Hiển thị:</span>
                    <select className="form-select form-select-sm w-auto" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  {Math.ceil(issues.length / pageSize) > 1 && (
                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
                      <span className="small">Trang {page + 1} / {Math.ceil(issues.length / pageSize)}</span>
                      <button className="btn btn-outline-secondary btn-sm" disabled={page >= Math.ceil(issues.length / pageSize) - 1} onClick={() => setPage(page + 1)}>Sau</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Lịch sử đồng bộ' && (
            <div className="card shadow-sm border-0 p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark m-0">Lịch sử các lượt chạy (Sync Runs)</h5>
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>Làm mới</button>
              </div>

              {runs.length === 0 ? (
                <div className="text-center text-secondary py-5">
                  Chưa có lượt chạy nào.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: '60px' }}>STT</th>
                        <th>Run ID</th>
                        <th>Thời gian chạy</th>
                        <th>Chế độ</th>
                        <th>Trạng thái</th>
                        <th>Quét (Hợp lệ / Tổng)</th>
                        <th>Lỗi phát sinh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.slice(page * pageSize, (page + 1) * pageSize).map((run, index) => (
                        <tr key={run.syncRunId}>
                          <td className="text-center">{page * pageSize + index + 1}</td>
                          <td><strong>{run.syncRunId}</strong></td>
                          <td>{new Date(run.startedAt).toLocaleString('vi-VN')}</td>
                          <td>{run.runMode}</td>
                          <td>
                            <span className={`badge ${run.runStatus === 'COMPLETED' ? 'bg-success' : 'bg-danger'}`}>
                              {run.runStatus}
                            </span>
                          </td>
                          <td>{run.rowsValid} / {run.rowsRead}</td>
                          <td className={run.rowsError > 0 ? 'text-danger fw-bold' : ''}>{run.rowsError}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {runs.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-secondary">Hiển thị:</span>
                    <select className="form-select form-select-sm w-auto" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  {Math.ceil(runs.length / pageSize) > 1 && (
                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
                      <span className="small">Trang {page + 1} / {Math.ceil(runs.length / pageSize)}</span>
                      <button className="btn btn-outline-secondary btn-sm" disabled={page >= Math.ceil(runs.length / pageSize) - 1} onClick={() => setPage(page + 1)}>Sau</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Tổng quan' && (
            <div className="card shadow-sm border-0 p-4 min-vh-50 d-flex align-items-center justify-content-center text-center">
              <Clock size={48} className="text-primary mb-3 opacity-50" />
              <h5 className="fw-bold text-dark">Tổng quan đối soát</h5>
              <p className="text-secondary m-0">Mục này sẽ hiển thị biểu đồ và các thống kê liên quan đến DataSale (Đang phát triển).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
