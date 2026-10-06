import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { logApi } from '../../api';
import styles from './ActivityLogPage.module.css';

export default function ActivityLogPage() {
  const [activeLog, setActiveLog] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (search = '') => {
    try {
      setLoading(true);
      const res = await logApi.getList({ page: 0, size: 50, search });
      if (res.data && res.data.content) {
        setLogs(res.data.content);
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
    <div className={styles.page}>
      <div className={styles.filters}>
        <div className={styles.searchInput} style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: '36px' }} 
            placeholder="Tìm serial, Transaction ID hoặc Event ID" 
            onChange={(e) => fetchLogs(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: '200px' }}>
          <option>Loại sự kiện: Tất cả</option>
        </select>
        <select className="form-select" style={{ width: '200px' }}>
          <option>Người thao tác: Tất cả</option>
        </select>
        <button className="btn btn-outline btn-sm">Xóa bộ lọc</button>
      </div>
      
      <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)' }}>{logs.length} sự kiện phù hợp {loading && '(Đang tải...)'}</p>

      <div className={styles.contentGrid}>
        {/* Left - Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3>Danh sách sự kiện</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Sự kiện</th>
                  <th>Serial</th>
                  <th>Nguồn (Cycle/Tx)</th>
                  <th>Người thao tác</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>Chưa có sự kiện nào</td>
                  </tr>
                )}
                {logs.map(log => (
                  <tr key={log.id} 
                      className={`${styles.tableRow} ${activeLog?.id === log.id ? styles.active : ''}`}
                      onClick={() => setActiveLog(log)}>
                    <td>{new Date(log.eventAt).toLocaleString('vi-VN')}</td>
                    <td><span className={styles.statusTransition}>{log.eventType}</span></td>
                    <td><strong>{log.serialKey || '-'}</strong></td>
                    <td style={{ fontSize: '12px' }}>{log.cycleId || log.transactionId || '-'}</td>
                    <td style={{ fontSize: '12px' }}>{log.actor || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right - Detail Panel */}
        {activeLog && (
          <div className={styles.detailsCard}>
            <div className={styles.detailsHeader}>
              <div>
                <h3 className={styles.detailsTitle}>Chi tiết sự kiện</h3>
                <p className={styles.detailsSub}>Chỉ đọc</p>
              </div>
              <span className={`${styles.badge} ${styles.success}`}>{activeLog.eventType}</span>
            </div>

            <div className={styles.eventBlock}>
              <div className={styles.eventLabel}>Event ID</div>
              <div className={styles.eventValue}>{activeLog.eventId}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>Idempotency: {activeLog.idempotencyKey}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>{new Date(activeLog.eventAt).toLocaleString('vi-VN')}</div>
            </div>

            <div className={styles.eventBlock}>
              <div className={styles.eventLabel}>Serial / Cycle ID</div>
              <div className={`${styles.eventValue} ${styles.large}`}>{activeLog.serialKey || '-'}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Cycle: {activeLog.cycleId || '-'}
              </div>
            </div>

            <div className={styles.diffContainer}>
              <div className={styles.diffBox}>
                <div className={styles.diffTitle}>Dữ liệu sự kiện (JSON)</div>
                <pre style={{ fontSize: '11px', color: 'var(--gray-600)', background: 'var(--gray-50)', padding: '8px', borderRadius: '4px', overflowX: 'auto', margin: 0 }}>
                  {activeLog.eventData || '{}'}
                </pre>
              </div>
            </div>

            <div className={styles.eventBlock} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className={styles.eventLabel}>Người thực hiện</div>
              <div className={styles.eventValue} style={{ fontSize: '13px', fontWeight: '700' }}>{activeLog.actor || '-'}</div>
            </div>

            <div className={styles.infoBox}>
              Sự kiện được ghi bằng Append-Only Pattern và không thể sửa hoặc xóa trực tiếp.
            </div>

            <div className={styles.actionBtns}>
              <button className="btn btn-outline" style={{ flex: 1 }}>Mở hồ sơ serial</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
