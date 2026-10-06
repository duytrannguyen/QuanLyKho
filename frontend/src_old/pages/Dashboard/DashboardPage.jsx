import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, ShoppingBag, ClipboardCheck, AlertTriangle,
  PackagePlus, Search, RefreshCw, ArrowRight
} from 'lucide-react';
import { dashboardApi } from '../../api';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [priorities, setPriorities] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, priRes, actRes] = await Promise.allSettled([
        dashboardApi.getSummary(),
        dashboardApi.getPriorities(),
        dashboardApi.getRecentActivity(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (priRes.status === 'fulfilled') setPriorities(priRes.value.data);
      if (actRes.status === 'fulfilled') setActivities(actRes.value.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fallback data for when backend is not connected
  const stats = summary || {
    totalActive: 97,
    readyToSell: 94,
    needInspection: 3,
    errorCount: 1,
    withoutPrice: 94,
    pendingInspections: 3,
  };

  const prio = priorities || {
    p0_data_errors: 1,
    p1_pending_inspections: 3,
    p2_without_price: 94,
  };

  return (
    <div className={styles.dashboard}>
      <h1 className="page-title">Điều hành kho hàng</h1>
      <p className="page-subtitle">Tình trạng hệ thống và công việc cần xử lý hôm nay</p>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <StatCard icon={Eye} color="blue" number={stats.totalActive} label="Tổng số máy trong kho" />
        <StatCard icon={ShoppingBag} color="green" number={stats.readyToSell} label="Máy đủ điều kiện bán" />
        <StatCard icon={ClipboardCheck} color="orange" number={stats.needInspection} label="Máy chờ kỹ thuật" />
        <StatCard icon={AlertTriangle} color="red" number={stats.errorCount} label="Vấn đề cần đối soát" />
      </div>

      {/* Health Status */}
      <div className={styles.healthGrid}>
        <HealthItem dot="green" label="DataSale" value="Đã kết nối đọc" />
        <HealthItem dot="yellow" label="Đồng bộ bán hàng" value="Thủ công có kiểm soát" />
        <HealthItem dot="green" label="Lần đồng bộ" value={new Date().toLocaleString('vi-VN')} />
        <HealthItem dot="gray" label="Tự động" value="Chưa kích hoạt" />
      </div>

      {/* Priority Tasks + Quick Actions */}
      <div className={styles.sectionGrid}>
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Việc cần xử lý</h3>
          <div className={styles.priorityItem}>
            <div className={styles.priorityLeft}>
              <span className={`${styles.priorityBadge} ${styles.p0}`}>P0</span>
              <span className={styles.priorityText}>{prio.p0_data_errors} lỗi dữ liệu đang mở</span>
            </div>
            <button className={styles.priorityBtn}>Xử lý</button>
          </div>
          <div className={styles.priorityItem}>
            <div className={styles.priorityLeft}>
              <span className={`${styles.priorityBadge} ${styles.p1}`}>P1</span>
              <span className={styles.priorityText}>{prio.p1_pending_inspections} máy chờ kiểm tra</span>
            </div>
            <Link to="/kiem-tra" className={styles.priorityBtn}>Xử lý</Link>
          </div>
          <div className={styles.priorityItem}>
            <div className={styles.priorityLeft}>
              <span className={`${styles.priorityBadge} ${styles.p2}`}>P2</span>
              <span className={styles.priorityText}>{prio.p2_without_price} máy chưa có giá bán</span>
            </div>
            <button className={styles.priorityBtn}>Xử lý</button>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Thao tác nhanh</h3>
          <div className={styles.quickGrid}>
            <Link to="/nhap-may" className={styles.quickAction}>
              <PackagePlus size={24} className={styles.quickIcon} />
              <span className={styles.quickLabel}>Nhập máy</span>
            </Link>
            <Link to="/tra-cuu" className={styles.quickAction}>
              <Search size={24} className={styles.quickIcon} />
              <span className={styles.quickLabel}>Tra serial</span>
            </Link>
            <Link to="/kiem-tra" className={styles.quickAction}>
              <ClipboardCheck size={24} className={styles.quickIcon} />
              <span className={styles.quickLabel}>Kiểm tra máy</span>
            </Link>
            <button className={styles.quickAction} onClick={loadData}>
              <RefreshCw size={24} className={styles.quickIcon} />
              <span className={styles.quickLabel}>Đồng bộ ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.activitySection}>
        <div className={styles.activityHeader}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Hoạt động gần đây</h3>
          <Link to="/nhat-ky" className={styles.activityLink}>
            Mở nhật ký đầy đủ <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
          </Link>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Hoạt động</th>
              <th>Serial</th>
              <th>Người thực hiện</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {activities.length > 0 ? activities.slice(0, 10).map((log, i) => (
              <tr key={log.eventId || i}>
                <td>{log.eventAt ? new Date(log.eventAt).toLocaleString('vi-VN') : '-'}</td>
                <td>{log.eventType}</td>
                <td><strong>{log.serialKey || log.cycleId || '-'}</strong></td>
                <td>{log.actor || '-'}</td>
                <td><span className={`badge badge-success`}>Thành công</span></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                  {loading ? 'Đang tải...' : 'Chưa có hoạt động nào'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, number, label }) {
  return (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className={styles.statNumber}>{number}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function HealthItem({ dot, label, value }) {
  return (
    <div className={styles.healthItem}>
      <span className={`${styles.healthDot} ${styles[dot]}`}></span>
      <div>
        <div className={styles.healthLabel}>{label}</div>
        <div className={styles.healthValue}>{value}</div>
      </div>
    </div>
  );
}
