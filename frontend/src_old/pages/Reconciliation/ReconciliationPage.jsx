import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { syncApi } from '../../api';
import { useToast } from '../../toast/ToastContext';
import styles from './ReconciliationPage.module.css';

export default function ReconciliationPage() {
  const { showToast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('Lỗi cần xử lý');
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [runs, setRuns] = useState([]);

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
      showToast(err.response?.data?.message || 'Lỗi đồng bộ', 'danger');
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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Đối soát DataSale & Đồng bộ</h1>
          <p>Quản lý các lượt đồng bộ và theo dõi sai lệch dữ liệu với KiotViet / Nhanh.vn</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-primary" onClick={handleSyncNow} disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Đang chạy...' : 'Đồng bộ ngay'}
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {['Tổng quan', 'Lỗi cần xử lý', 'Lịch sử đồng bộ'].map(tab => (
          <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      <div className={styles.contentLayout}>
        {activeTab === 'Lỗi cần xử lý' && (
          <div className={styles.resultPanel}>
            <div className={styles.resultHeader}>
              <h3>Danh sách lỗi sai lệch</h3>
              <button className="btn btn-outline btn-sm" onClick={fetchData}>Làm mới</button>
            </div>
            
            {issues.length === 0 ? (
              <div className={styles.emptyState}>
                <CheckCircle size={48} color="var(--success-500)" style={{ marginBottom: '16px' }} />
                <h3>Tuyệt vời! Không có lỗi nào</h3>
                <p>Mọi dữ liệu trong kho đang khớp hoàn toàn với DataSale.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Loại lỗi</th>
                    <th>Đối tượng</th>
                    <th>Thời gian phát hiện</th>
                    <th>Tin nhắn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map(issue => (
                    <tr key={issue.issueId}>
                      <td><strong>{issue.issueId}</strong></td>
                      <td>
                        <span className="badge badge-warning">{issue.issueType}</span>
                      </td>
                      <td>{issue.entityId}</td>
                      <td>{new Date(issue.firstSeenAt).toLocaleString('vi-VN')}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.9rem' }}>{issue.message}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleRecheckIssue(issue.issueId)}>Quét lại</button>
                          <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger-600)', borderColor: 'var(--danger-200)' }} onClick={() => handleResolveManual(issue.issueId)}>Đóng thủ công</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'Lịch sử đồng bộ' && (
          <div className={styles.resultPanel}>
            <div className={styles.resultHeader}>
              <h3>Lịch sử các lượt chạy (Sync Runs)</h3>
              <button className="btn btn-outline btn-sm" onClick={fetchData}>Làm mới</button>
            </div>

            {runs.length === 0 ? (
              <div className={styles.emptyState}>
                Chưa có lượt chạy nào.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Thời gian chạy</th>
                    <th>Chế độ</th>
                    <th>Trạng thái</th>
                    <th>Quét (Hợp lệ / Tổng)</th>
                    <th>Lỗi phát sinh</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.syncRunId}>
                      <td><strong>{run.syncRunId}</strong></td>
                      <td>{new Date(run.startedAt).toLocaleString('vi-VN')}</td>
                      <td>{run.runMode}</td>
                      <td>
                        <span className={`badge ${run.runStatus === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                          {run.runStatus}
                        </span>
                      </td>
                      <td>{run.rowsValid} / {run.rowsRead}</td>
                      <td style={{ color: run.rowsError > 0 ? 'red' : 'inherit' }}>{run.rowsError}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'Tổng quan' && (
          <div className={styles.resultPanel}>
            <div className={styles.emptyState}>
              <Clock size={48} color="var(--primary-300)" style={{ marginBottom: '16px' }} />
              <h3>Tổng quan đối soát</h3>
              <p>Mục này sẽ hiển thị biểu đồ và các thống kê liên quan đến DataSale (Đang phát triển).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
