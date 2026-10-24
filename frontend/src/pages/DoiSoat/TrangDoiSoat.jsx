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
  const [settings, setSettings] = useState({ enabled: false, intervalMinutes: 15, doneMarker: 'Đã xuất kho', notifyMode: 'CHANGES' });
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [bulkResolving, setBulkResolving] = useState(false);

  const ISSUE_TYPE_META = {
    MISSING_SERIAL: { label: 'Đơn thiếu Serial', badgeClass: 'bg-secondary text-white' },
    UNKNOWN_SERIAL_SOLD: { label: 'Serial chưa có trong kho', badgeClass: 'bg-danger text-white' },
    ORDER_CANCELLED_PENDING_RETURN: { label: 'Đơn hủy chờ nhập kho', badgeClass: 'bg-warning text-dark' },
    DUPLICATE_SERIAL_SALE: { label: 'Trùng Serial đã bán', badgeClass: 'bg-danger text-white' },
    MISSING_SALE_RECORD: { label: 'Thiếu bản ghi bán', badgeClass: 'bg-warning text-dark' },
    SOLD_WHILE_INSPECTING: { label: 'Bán khi đang kiểm tra', badgeClass: 'bg-info text-dark' },
  };

  const getIssueMeta = (type) => ISSUE_TYPE_META[type] || { label: type, badgeClass: 'bg-secondary text-white' };

  const PRESET_INTERVALS = [1, 2, 3, 5, 10, 15, 30, 45, 60, 120, 240, 360, 720, 1440];

  const formatIntervalSummary = (mins) => {
    const m = Number(mins);
    if (!m || m < 1) return 'Chưa hợp lệ';
    if (m === 1) return 'Mỗi 1 phút (Nhanh nhất - Realtime)';
    if (m < 60) return `Mỗi ${m} phút`;
    if (m === 60) return 'Mỗi 1 tiếng (60 phút)';
    if (m % 1440 === 0) return `Mỗi ${m / 1440} ngày (${m} phút)`;
    if (m % 60 === 0) return `Mỗi ${m / 60} tiếng (${m} phút)`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `Mỗi ${h} tiếng ${rem} phút (${m} phút)`;
  };

  useEffect(() => {
    setPage(0);
  }, [activeTab, pageSize, selectedTypeFilter]);

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
      } else if (activeTab === 'Cài đặt đồng bộ') {
        const res = await syncApi.getSyncSettings();
        if (res.data) {
          setSettings(res.data);
          const mins = Number(res.data.intervalMinutes);
          setIsCustomInterval(!PRESET_INTERVALS.includes(mins));
        }
      } else if (activeTab === 'Tổng quan') {
        const [issuesRes, runsRes, settingsRes] = await Promise.allSettled([
          syncApi.getIssues(),
          syncApi.getRuns(),
          syncApi.getSyncSettings(),
        ]);
        if (issuesRes.status === 'fulfilled') setIssues(issuesRes.value.data || []);
        if (runsRes.status === 'fulfilled') setRuns(runsRes.value.data || []);
        if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
          setSettings(settingsRes.value.data);
          const mins = Number(settingsRes.value.data.intervalMinutes);
          setIsCustomInterval(!PRESET_INTERVALS.includes(mins));
        }
      }
    } catch (err) {
      showToast('Lỗi tải dữ liệu', 'danger');
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      await syncApi.updateSyncSettings(settings);
      showToast('Đã lưu cài đặt đồng bộ thành công!', 'success');
      fetchData();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi lưu cài đặt', 'danger');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveReturn = async (issueId, entityId) => {
    const isConfirmed = await confirm(`Xác nhận nhập lại máy ${entityId} vào kho (chuyển về kiểm tra đầu vào do đơn bị hủy/trả trên Sheet)?`);
    if (!isConfirmed) return;
    try {
      await syncApi.approveReturn(issueId);
      showToast(`Đã nạp máy ${entityId} lại kho kiểm tra thành công!`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi nhập lại kho', 'danger');
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      const res = await syncApi.run('MANUAL');
      const run = res?.data;
      if (run?.runStatus === 'FAILED') {
        showToast(`Đồng bộ thất bại: ${run.errorMessage || 'Không rõ lỗi'}`, 'danger');
      } else if (run) {
        if (run.rowsProcessed > 0 && run.rowsError === 0) {
          showToast(`🎉 Đồng bộ thành công: Đã xuất kho ${run.rowsProcessed} máy (${run.rowsValid}/${run.rowsRead} dòng đã xử lý)!`, 'success');
        } else if (run.rowsError > 0) {
          showToast(`⚠️ Đồng bộ xong: Đã xuất kho ${run.rowsProcessed} máy, nhưng phát hiện ${run.rowsError} lỗi cần xử lý!`, 'warning');
        } else {
          showToast(`ℹ️ Đồng bộ hoàn tất: Toàn bộ ${run.rowsRead} dòng trên Sheet đã khớp với kho (không có đơn hàng mới).`, 'info');
        }
      } else {
        showToast('Đã kích hoạt lượt đồng bộ mới', 'success');
      }
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

  const typeCounts = issues.reduce((acc, issue) => {
    acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
    return acc;
  }, {});

  const filteredIssues = selectedTypeFilter === 'ALL'
    ? issues
    : issues.filter(i => i.issueType === selectedTypeFilter);

  const handleResolveAll = async (typeToResolve) => {
    const isAll = !typeToResolve || typeToResolve === 'ALL';
    const targetLabel = isAll ? 'TẤT CẢ các lỗi' : `các lỗi '${getIssueMeta(typeToResolve).label}'`;
    const countToResolve = isAll ? issues.length : (typeCounts[typeToResolve] || 0);

    const isConfirmed = await confirm(
      `Bạn có chắc chắn muốn đóng hàng loạt ${countToResolve} lỗi (${targetLabel}) không?\n\nThao tác này sẽ chuyển toàn bộ sang trạng thái ĐÃ XỬ LÝ và không làm ảnh hưởng tới các đơn hàng mới.`
    );
    if (!isConfirmed) return;

    setBulkResolving(true);
    try {
      const res = await syncApi.resolveAllIssues(isAll ? 'ALL' : typeToResolve, 'Người dùng đã đóng hàng loạt');
      const resolved = res?.data?.resolvedCount || countToResolve;
      showToast(`Đã đóng thành công ${resolved} lỗi!`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi đóng hàng loạt', 'danger');
    } finally {
      setBulkResolving(false);
    }
  };

  return (
    <div className="container-fluid py-4 min-vh-100 bg-light">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold text-dark m-0 mb-1">Đối soát DataSale & Đồng bộ</h2>
          <p className="text-secondary m-0">Đồng bộ đơn "Hoàn tất" từ Google Sheet DATABASE_BÁN HÀNG để trừ kho và theo dõi sai lệch dữ liệu</p>
        </div>
        <div>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSyncNow} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            {loading ? 'Đang chạy...' : 'Đồng bộ ngay'}
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {['Tổng quan', 'Lỗi cần xử lý', 'Lịch sử đồng bộ', 'Cài đặt đồng bộ'].map(tab => (
          <li className="nav-item" key={tab}>
            <button 
              className={`nav-link text-dark fw-medium ${activeTab === tab ? 'active border-primary border-bottom-2 text-primary fw-bold' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab ? { borderBottom: '2px solid #0d6efd' } : {}}
            >
              {tab}
              {tab === 'Lỗi cần xử lý' && issues.length > 0 && (
                <span className="badge bg-danger ms-2 rounded-pill">{issues.length}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        <div className="col-12">
          {activeTab === 'Lỗi cần xử lý' && (
            <div className="card shadow-sm border-0 p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <h5 className="fw-bold text-dark m-0">Danh sách lỗi sai lệch</h5>
                  <p className="text-secondary small m-0">Tổng số: {issues.length} lỗi cần xử lý hoặc xác nhận</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {filteredIssues.length > 0 && (
                    <button
                      className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                      onClick={() => handleResolveAll(selectedTypeFilter)}
                      disabled={bulkResolving}
                      title="Chuyển toàn bộ các lỗi thuộc loại này sang trạng thái Đã xử lý"
                    >
                      <XCircle size={15} />
                      {bulkResolving ? 'Đang xử lý...' : `Đóng hàng loạt (${filteredIssues.length})`}
                    </button>
                  )}
                  <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>Làm mới</button>
                </div>
              </div>

              {issues.length > 0 && (
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 bg-light rounded-3 border">
                  <span className="small text-secondary fw-medium me-1">Lọc theo loại:</span>
                  <button
                    className={`btn btn-sm ${selectedTypeFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setSelectedTypeFilter('ALL')}
                  >
                    Tất cả ({issues.length})
                  </button>
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <button
                      key={type}
                      className={`btn btn-sm ${selectedTypeFilter === type ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setSelectedTypeFilter(type)}
                    >
                      {getIssueMeta(type).label} ({count})
                    </button>
                  ))}
                </div>
              )}
              
              {filteredIssues.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center text-secondary py-5">
                  <CheckCircle size={48} className="text-success mb-3" />
                  <h5 className="fw-bold text-dark">
                    {issues.length === 0 ? 'Tuyệt vời! Không có lỗi nào' : 'Không có lỗi nào thuộc bộ lọc này'}
                  </h5>
                  <p className="m-0">
                    {issues.length === 0
                      ? 'Mọi dữ liệu trong kho đang khớp hoàn toàn với DataSale.'
                      : 'Bạn có thể bấm "Tất cả" để xem các loại lỗi khác.'}
                  </p>
                  {issues.length > 0 && (
                    <button className="btn btn-sm btn-link mt-2" onClick={() => setSelectedTypeFilter('ALL')}>
                      Quay lại xem tất cả lỗi
                    </button>
                  )}
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
                      {filteredIssues.slice(page * pageSize, (page + 1) * pageSize).map((issue, index) => (
                        <tr key={issue.issueId}>
                          <td className="text-center">{page * pageSize + index + 1}</td>
                          <td><strong>{issue.issueId}</strong></td>
                          <td>
                            <span className={`badge ${getIssueMeta(issue.issueType).badgeClass}`}>
                              {getIssueMeta(issue.issueType).label}
                            </span>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{issue.issueType}</div>
                          </td>
                          <td>{issue.entityId}</td>
                          <td>{new Date(issue.firstSeenAt).toLocaleString('vi-VN')}</td>
                          <td><small>{issue.message}</small></td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              {issue.issueType === 'ORDER_CANCELLED_PENDING_RETURN' && (
                                <button
                                  className="btn btn-success btn-sm fw-bold"
                                  onClick={() => handleApproveReturn(issue.issueId, issue.entityId)}
                                >
                                  Xác nhận nhập lại kho
                                </button>
                              )}
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
              {filteredIssues.length > 0 && (
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
                  {Math.ceil(filteredIssues.length / pageSize) > 1 && (
                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
                      <span className="small">Trang {page + 1} / {Math.ceil(filteredIssues.length / pageSize)}</span>
                      <button className="btn btn-outline-secondary btn-sm" disabled={page >= Math.ceil(filteredIssues.length / pageSize) - 1} onClick={() => setPage(page + 1)}>Sau</button>
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
                        <th>Cần xử lý / Tổng dòng</th>
                        <th>Đã khớp</th>
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
                            <span
                              className={`badge ${run.runStatus === 'COMPLETED' ? 'bg-success' : run.runStatus === 'RUNNING' ? 'bg-info' : 'bg-danger'}`}
                              title={run.errorMessage || ''}
                            >
                              {run.runStatus}
                            </span>
                            {run.errorMessage && (
                              <div className="small text-danger mt-1" style={{ maxWidth: 320 }}>{run.errorMessage}</div>
                            )}
                          </td>
                          <td>{run.rowsValid} / {run.rowsRead}</td>
                          <td className="text-success fw-medium">{run.rowsProcessed}</td>
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
            <div>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6 col-xl-3">
                  <div className="card shadow-sm border-0 p-3 h-100 bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-medium">Lỗi đang mở</span>
                      <span className={`badge ${issues.length > 0 ? 'bg-danger' : 'bg-success'}`}>
                        {issues.length > 0 ? `${issues.length} lỗi` : 'Khớp 100%'}
                      </span>
                    </div>
                    <div className="fs-3 fw-bold text-dark">{issues.length}</div>
                    <div className="small text-muted mt-1">
                      {issues.length > 0 ? (
                        <button className="btn btn-link p-0 small text-decoration-none" onClick={() => setActiveTab('Lỗi cần xử lý')}>
                          Xem chi tiết lỗi &rarr;
                        </button>
                      ) : (
                        'Không có sai lệch dữ liệu'
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-xl-3">
                  <div className="card shadow-sm border-0 p-3 h-100 bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-medium">Đơn hủy chờ hoàn kho</span>
                      <span className="badge bg-warning text-dark">
                        {typeCounts['ORDER_CANCELLED_PENDING_RETURN'] || 0} máy
                      </span>
                    </div>
                    <div className="fs-3 fw-bold text-dark">
                      {typeCounts['ORDER_CANCELLED_PENDING_RETURN'] || 0}
                    </div>
                    <div className="small text-muted mt-1">
                      {(typeCounts['ORDER_CANCELLED_PENDING_RETURN'] || 0) > 0 ? (
                        <button
                          className="btn btn-link p-0 small text-decoration-none text-warning fw-bold"
                          onClick={() => {
                            setSelectedTypeFilter('ORDER_CANCELLED_PENDING_RETURN');
                            setActiveTab('Lỗi cần xử lý');
                          }}
                        >
                          Duyệt nạp lại kho ngay &rarr;
                        </button>
                      ) : (
                        'Không có đơn hủy cần trả'
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-xl-3">
                  <div className="card shadow-sm border-0 p-3 h-100 bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-medium">Đồng bộ tự động</span>
                      <span className={`badge ${settings.enabled ? 'bg-success' : 'bg-secondary'}`}>
                        {settings.enabled ? 'Đang BẬT' : 'Đang TẮT'}
                      </span>
                    </div>
                    <div className="fs-5 fw-bold text-dark text-truncate" title={formatIntervalSummary(settings.intervalMinutes)}>
                      {settings.enabled ? formatIntervalSummary(settings.intervalMinutes) : 'Chưa bật'}
                    </div>
                    <div className="small text-muted mt-1">
                      <button className="btn btn-link p-0 small text-decoration-none" onClick={() => setActiveTab('Cài đặt đồng bộ')}>
                        Tùy chỉnh tần suất &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-xl-3">
                  <div className="card shadow-sm border-0 p-3 h-100 bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-medium">Lượt chạy gần nhất</span>
                      {runs[0] && (
                        <span className={`badge ${runs[0].runStatus === 'COMPLETED' ? 'bg-success' : runs[0].runStatus === 'RUNNING' ? 'bg-info' : 'bg-danger'}`}>
                          {runs[0].runStatus}
                        </span>
                      )}
                    </div>
                    <div className="fs-6 fw-bold text-dark">
                      {runs[0] ? new Date(runs[0].startedAt).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}
                    </div>
                    <div className="small text-muted mt-1">
                      {runs[0] ? (
                        <span>Khớp {runs[0].rowsProcessed} máy / {runs[0].rowsValid} dòng hợp lệ</span>
                      ) : (
                        'Bấm "Đồng bộ ngay" để chạy'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {issues.length > 0 && (
                <div className="card shadow-sm border-0 p-4 mb-4">
                  <h6 className="fw-bold text-dark mb-3">Phân bổ loại lỗi hiện tại</h6>
                  <div className="row g-2">
                    {Object.entries(typeCounts).map(([type, count]) => (
                      <div key={type} className="col-12 col-md-4">
                        <div
                          className="p-3 border rounded-3 bg-light d-flex justify-content-between align-items-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedTypeFilter(type);
                            setActiveTab('Lỗi cần xử lý');
                          }}
                        >
                          <div>
                            <div className="fw-bold text-dark">{getIssueMeta(type).label}</div>
                            <small className="text-muted">{type}</small>
                          </div>
                          <span className={`badge fs-6 ${getIssueMeta(type).badgeClass}`}>
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Cài đặt đồng bộ' && (
            <div className="card shadow-sm border-0 p-4" style={{ maxWidth: 860 }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark m-0">Cấu hình đồng bộ Google Sheet tự động</h5>
                <span className={`badge ${settings.enabled ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>
                  {settings.enabled ? '● Tự động: Đang BẬT' : '○ Tự động: Đang TẮT'}
                </span>
              </div>
              <p className="text-secondary mb-4 small">
                Tùy chỉnh bật/tắt, tần suất định kỳ từ 1 phút đến 24 giờ và chế độ thông báo mỗi khi quét đơn "Hoàn tất" trên Google Sheet.
              </p>

              <form onSubmit={handleSaveSettings}>
                <div className="mb-4 p-3 bg-light rounded-3 border form-check form-switch fs-5">
                  <input
                    className="form-check-input ms-0 me-3"
                    type="checkbox"
                    id="syncSwitch"
                    checked={settings.enabled}
                    onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                  />
                  <label className="form-check-label fw-bold text-dark fs-6" htmlFor="syncSwitch">
                    {settings.enabled ? 'Đang BẬT đồng bộ tự động theo chu kỳ' : 'Đang TẮT đồng bộ tự động'}
                  </label>
                  <div className="text-muted fs-6 small mt-1 ms-1">
                    Khi bật, hệ thống sẽ tự động quét ngầm theo chu kỳ cài đặt bên dưới mà không cần thao tác thủ công.
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary d-flex justify-content-between align-items-center">
                      <span>Tần suất đồng bộ</span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle small fw-normal">
                        {formatIntervalSummary(settings.intervalMinutes)}
                      </span>
                    </label>
                    <select
                      className="form-select mb-2"
                      value={isCustomInterval ? 'custom' : settings.intervalMinutes}
                      onChange={e => {
                        if (e.target.value === 'custom') {
                          setIsCustomInterval(true);
                        } else {
                          setIsCustomInterval(false);
                          setSettings({ ...settings, intervalMinutes: Number(e.target.value) });
                        }
                      }}
                    >
                      <optgroup label="Tần suất cao (Realtime / Bán hàng liên tục)">
                        <option value="1">Mỗi 1 phút (Nhanh nhất - Realtime)</option>
                        <option value="2">Mỗi 2 phút</option>
                        <option value="3">Mỗi 3 phút</option>
                        <option value="5">Mỗi 5 phút</option>
                      </optgroup>
                      <optgroup label="Tần suất tiêu chuẩn (Khuyên dùng)">
                        <option value="10">Mỗi 10 phút</option>
                        <option value="15">Mỗi 15 phút (Mặc định)</option>
                        <option value="30">Mỗi 30 phút</option>
                        <option value="45">Mỗi 45 phút</option>
                      </optgroup>
                      <optgroup label="Tần suất dài (Tiết kiệm tài nguyên)">
                        <option value="60">Mỗi 1 tiếng (60 phút)</option>
                        <option value="120">Mỗi 2 tiếng (120 phút)</option>
                        <option value="240">Mỗi 4 tiếng (240 phút)</option>
                        <option value="360">Mỗi 6 tiếng (360 phút)</option>
                        <option value="720">Mỗi 12 tiếng (Nửa ngày)</option>
                        <option value="1440">Mỗi 24 tiếng (1 ngày 1 lần)</option>
                      </optgroup>
                      <option value="custom">⚙️ Tùy chỉnh số phút khác...</option>
                    </select>

                    {isCustomInterval && (
                      <div className="input-group">
                        <span className="input-group-text bg-white text-secondary small">Nhập số phút:</span>
                        <input
                          type="number"
                          min="1"
                          max="10080"
                          className="form-control"
                          placeholder="VD: 7, 20, 90..."
                          value={settings.intervalMinutes}
                          onChange={e => setSettings({ ...settings, intervalMinutes: Math.max(1, Number(e.target.value)) })}
                        />
                        <span className="input-group-text small">phút</span>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary">Chế độ thông báo sau khi đồng bộ</label>
                    <select
                      className="form-select"
                      value={settings.notifyMode || 'CHANGES'}
                      onChange={e => setSettings({ ...settings, notifyMode: e.target.value })}
                    >
                      <option value="CHANGES">🔔 Khi có đơn mới xuất kho hoặc có lỗi (Khuyên dùng)</option>
                      <option value="ALL">📢 Mọi lượt đồng bộ (Kể cả khi không có đơn mới)</option>
                      <option value="ERROR_ONLY">⚠️ Chỉ khi phát sinh lỗi sai lệch</option>
                      <option value="NONE">🔕 Tắt thông báo nổi</option>
                    </select>
                    <div className="form-text small">
                      Hệ thống sẽ hiển thị thông báo góc trên màn hình mỗi khi lượt quét hoàn tất.
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary">Ký hiệu đánh dấu đã xuất kho</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.doneMarker}
                      onChange={e => setSettings({ ...settings, doneMarker: e.target.value })}
                      placeholder="Đã xuất kho"
                    />
                    <div className="form-text small">Ghi vào cột trạng thái khớp CRM trên Sheet sau khi trừ kho.</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-secondary">Google Spreadsheet ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.spreadsheetId || ''}
                      onChange={e => setSettings({ ...settings, spreadsheetId: e.target.value })}
                      placeholder="13gxMGT1dDwlK-ncXi3fUx2nY17U3ax2v1hxNRt2oIqs"
                    />
                    <div className="form-text small">
                      ID bảng tính (nằm trên đường dẫn URL của Google Sheet).
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 pt-2 border-top">
                  <button type="submit" className="btn btn-primary px-4 fw-bold" disabled={savingSettings}>
                    {savingSettings ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={fetchData}>
                    Tải lại
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
