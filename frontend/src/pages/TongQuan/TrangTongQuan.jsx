import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, ShoppingBag, ClipboardCheck, AlertTriangle,
  PackagePlus, Search, RefreshCw, ArrowRight, Truck, Lock
} from 'lucide-react';
import { dashboardApi, syncApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { formatEventType } from '../../utils/dinh_dang';

export default function TrangTongQuan() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const [summary, setSummary] = useState(null);
  const [priorities, setPriorities] = useState(null);
  const [activities, setActivities] = useState([]);
  const [syncSettings, setSyncSettings] = useState(null);
  const [latestSync, setLatestSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, priRes, actRes, setRes, latRes] = await Promise.allSettled([
        dashboardApi.getSummary(),
        dashboardApi.getPriorities(),
        dashboardApi.getRecentActivity(),
        syncApi.getSyncSettings(),
        syncApi.getLatestStatus(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (priRes.status === 'fulfilled') setPriorities(priRes.value.data);
      if (actRes.status === 'fulfilled') setActivities(actRes.value.data || []);
      if (setRes.status === 'fulfilled') setSyncSettings(setRes.value.data);
      if (latRes.status === 'fulfilled') setLatestSync(latRes.value.data);
    } catch (err) {
      console.error('TongQuan load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!requirePermission('SYNC_MANAGE', showToast, 'Đồng bộ Google Sheet')) return;
    if (syncing) return;
    setSyncing(true);
    try {
      await syncApi.run('MANUAL');
      showToast('Đã thực hiện đồng bộ Google Sheet thành công!', 'success');
      await loadData();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi đồng bộ Google Sheet', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  const handleGuardedNavigate = (path, permissionCode, actionName) => (e) => {
    e.preventDefault();
    if (requirePermission(permissionCode, showToast, actionName)) {
      navigate(path);
    }
  };

  const stats = summary || {
    totalActive: 0,
    readyToSell: 0,
    needInspection: 0,
    errorCount: 0,
    withoutPrice: 0,
    pendingInspections: 0,
  };

  const prio = priorities || {
    p0_data_errors: 0,
    p1_pending_inspections: 0,
    p2_without_price: 0,
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0">Điều hành kho hàng</h2>
          <p className="text-secondary mb-0">Tình trạng hệ thống và công việc cần xử lý hôm nay</p>
        </div>
        <div>
          <button
            className={`btn d-flex align-items-center gap-2 shadow-sm ${
              hasPermission('SYNC_MANAGE') ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={handleManualSync}
            disabled={syncing}
            title={!hasPermission('SYNC_MANAGE') ? 'Cần quyền Đồng bộ CSDL (SYNC_MANAGE)' : 'Đồng bộ Google Sheet thủ công'}
          >
            <RefreshCw size={16} className={syncing ? 'spinner-border spinner-border-sm' : ''} />
            <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
            {!hasPermission('SYNC_MANAGE') && <Lock size={14} className="text-muted" />}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        <StatCard icon={Eye} colorClass="text-primary bg-primary bg-opacity-10" number={stats.totalActive} label="Tổng số máy trong kho" />
        <StatCard icon={ShoppingBag} colorClass="text-success bg-success bg-opacity-10" number={stats.readyToSell} label="Máy đủ điều kiện bán" />
        <StatCard icon={ClipboardCheck} colorClass="text-warning bg-warning bg-opacity-10" number={stats.needInspection} label="Máy chờ kỹ thuật" />
        <StatCard icon={AlertTriangle} colorClass="text-danger bg-danger bg-opacity-10" number={stats.errorCount} label="Vấn đề cần đối soát" />
      </div>

      {/* Health Status */}
      <div className="row g-3 mb-4">
        <HealthItem
          dotClass={syncSettings?.enabled ? 'bg-success' : 'bg-secondary'}
          label="Google Sheet"
          value={syncSettings?.enabled ? 'Đã kết nối' : 'Đang tắt kết nối'}
        />
        <HealthItem
          dotClass="bg-warning"
          label="Đồng bộ bán hàng"
          value={syncSettings?.cronEnabled ? 'Tự động & Thủ công' : 'Thủ công có kiểm soát'}
        />
        <HealthItem
          dotClass="bg-success"
          label="Lần đồng bộ gần nhất"
          value={latestSync?.finishedAt ? new Date(latestSync.finishedAt).toLocaleString('vi-VN') : 'Chưa có lượt chạy'}
        />
        <HealthItem
          dotClass={syncSettings?.cronEnabled ? 'bg-success' : 'bg-secondary'}
          label="Lịch tự động"
          value={syncSettings?.cronEnabled ? 'Đang kích hoạt' : 'Chưa kích hoạt'}
        />
      </div>

      {/* Priority Tasks + Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-0 p-4">
            <h5 className="fw-bold mb-4">Việc cần xử lý</h5>
            
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
              <div className="d-flex align-items-center gap-3">
                <span className="badge rounded-circle bg-danger d-flex align-items-center justify-content-center p-2" style={{width: '32px', height: '32px'}}>P0</span>
                <span className="fw-medium text-dark">{prio.p0_data_errors} lỗi dữ liệu đang mở</span>
              </div>
              <button
                type="button"
                onClick={handleGuardedNavigate('/doi-soat', 'SYNC_VIEW', 'Xem trang đối soát')}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                title={!hasPermission('SYNC_VIEW') ? 'Cần quyền Đối soát (SYNC_VIEW)' : ''}
              >
                <span>Xử lý</span>
                {!hasPermission('SYNC_VIEW') && <Lock size={12} className="text-muted" />}
              </button>
            </div>
            
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
              <div className="d-flex align-items-center gap-3">
                <span className="badge rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center p-2" style={{width: '32px', height: '32px'}}>P1</span>
                <span className="fw-medium text-dark">{prio.p1_pending_inspections} máy chờ kiểm tra</span>
              </div>
              <button
                type="button"
                onClick={handleGuardedNavigate('/kiem-tra', 'INSPECTION', 'Kiểm tra máy')}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                title={!hasPermission('INSPECTION') ? 'Cần quyền Kiểm tra máy (INSPECTION)' : ''}
              >
                <span>Xử lý</span>
                {!hasPermission('INSPECTION') && <Lock size={12} className="text-muted" />}
              </button>
            </div>

            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <span className="badge rounded-circle bg-info text-dark d-flex align-items-center justify-content-center p-2" style={{width: '32px', height: '32px'}}>P2</span>
                <span className="fw-medium text-dark">{prio.p2_without_price} máy chưa có giá bán</span>
              </div>
              <button
                type="button"
                onClick={handleGuardedNavigate('/tra-cuu', 'INVENTORY_VIEW', 'Tra cứu tồn kho')}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                title={!hasPermission('INVENTORY_VIEW') ? 'Cần quyền Tra cứu tồn kho (INVENTORY_VIEW)' : ''}
              >
                <span>Xử lý</span>
                {!hasPermission('INVENTORY_VIEW') && <Lock size={12} className="text-muted" />}
              </button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-0 p-4">
            <h5 className="fw-bold mb-4">Thao tác nhanh</h5>
            <div className="row g-3">
              <div className="col-6">
                <button
                  type="button"
                  onClick={handleGuardedNavigate('/nhap-may', 'IMPORT_MACHINE', 'Nhập máy vào kho')}
                  className={`btn w-100 py-3 border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2 position-relative ${
                    hasPermission('IMPORT_MACHINE') ? 'btn-light' : 'btn-light opacity-75'
                  }`}
                >
                  <PackagePlus size={28} className={hasPermission('IMPORT_MACHINE') ? 'text-primary' : 'text-secondary'} />
                  <span className="fw-medium text-dark d-flex align-items-center gap-1">
                    Nhập máy
                    {!hasPermission('IMPORT_MACHINE') && <Lock size={13} className="text-muted" />}
                  </span>
                </button>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  onClick={handleGuardedNavigate('/tra-cuu', 'INVENTORY_VIEW', 'Tra cứu tồn kho')}
                  className={`btn w-100 py-3 border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2 position-relative ${
                    hasPermission('INVENTORY_VIEW') ? 'btn-light' : 'btn-light opacity-75'
                  }`}
                >
                  <Search size={28} className={hasPermission('INVENTORY_VIEW') ? 'text-primary' : 'text-secondary'} />
                  <span className="fw-medium text-dark d-flex align-items-center gap-1">
                    Tra serial
                    {!hasPermission('INVENTORY_VIEW') && <Lock size={13} className="text-muted" />}
                  </span>
                </button>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  onClick={handleGuardedNavigate('/kiem-tra', 'INSPECTION', 'Kiểm tra kỹ thuật máy')}
                  className={`btn w-100 py-3 border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2 position-relative ${
                    hasPermission('INSPECTION') ? 'btn-light' : 'btn-light opacity-75'
                  }`}
                >
                  <ClipboardCheck size={28} className={hasPermission('INSPECTION') ? 'text-primary' : 'text-secondary'} />
                  <span className="fw-medium text-dark d-flex align-items-center gap-1">
                    Kiểm tra máy
                    {!hasPermission('INSPECTION') && <Lock size={13} className="text-muted" />}
                  </span>
                </button>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  onClick={handleGuardedNavigate('/don-ship', 'SHIP_MANAGE', 'Quản lý đơn ship')}
                  className={`btn w-100 py-3 border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2 position-relative ${
                    hasPermission('SHIP_MANAGE') ? 'btn-light' : 'btn-light opacity-75'
                  }`}
                >
                  <Truck size={28} className={hasPermission('SHIP_MANAGE') ? 'text-primary' : 'text-secondary'} />
                  <span className="fw-medium text-dark d-flex align-items-center gap-1">
                    Đơn ship
                    {!hasPermission('SHIP_MANAGE') && <Lock size={13} className="text-muted" />}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card shadow-sm border-0 p-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h5 className="fw-bold m-0">Hoạt động gần đây</h5>
          <button
            type="button"
            onClick={handleGuardedNavigate('/nhat-ky', 'LOGS_VIEW', 'Xem nhật ký hoạt động')}
            className="btn btn-link p-0 text-decoration-none text-primary fw-medium small d-flex align-items-center gap-1"
          >
            <span>Mở nhật ký đầy đủ</span>
            {!hasPermission('LOGS_VIEW') && <Lock size={12} className="text-muted" />}
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-secondary">
              <tr>
                <th className="text-center">STT</th>
                <th>Thời gian</th>
                <th>Hoạt động</th>
                <th>Serial</th>
                <th>Người thực hiện</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {activities.length > 0 ? activities.slice(0, 10).map((log, i) => (
                <tr key={log.id || i}>
                  <td className="text-center text-secondary">{i + 1}</td>
                  <td>{log.eventAt
                    ? new Date(log.eventAt).toLocaleString('vi-VN')
                    : log.createdAt
                    ? new Date(log.createdAt).toLocaleString('vi-VN')
                    : '-'}
                  </td>
                  <td className="fw-medium text-dark">{formatEventType(log.eventType || log.action)}</td>
                  <td><strong>{log.serialKey || log.serial || log.cycleId || '-'}</strong></td>
                  <td>{log.actor || log.user?.username || '-'}</td>
                  <td><span className="badge bg-success bg-opacity-10 text-success border border-success">Thành công</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-secondary">
                    {loading ? 'Đang tải...' : 'Chưa có hoạt động nào'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, colorClass, number, label }) {
  return (
    <div className="col-12 col-sm-6 col-md-3">
      <div className="card shadow-sm border-0 h-100 p-4 d-flex flex-row align-items-center gap-3" style={{transition: 'transform 0.2s'}}>
        <div className={`rounded d-flex align-items-center justify-content-center flex-shrink-0 ${colorClass}`} style={{width: '48px', height: '48px'}}>
          <Icon size={24} />
        </div>
        <div>
          <div className="fs-3 fw-bold text-dark lh-1 mb-1">{number}</div>
          <div className="text-secondary small">{label}</div>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ dotClass, label, value }) {
  return (
    <div className="col-12 col-sm-6 col-md-3">
      <div className="card shadow-sm border-0 h-100 p-3 d-flex flex-row align-items-center gap-3">
        <span className={`rounded-circle flex-shrink-0 ${dotClass}`} style={{width: '12px', height: '12px'}}></span>
        <div>
          <div className="fw-medium text-dark small">{label}</div>
          <div className="text-secondary fw-bold" style={{fontSize: '0.75rem'}}>{value}</div>
        </div>
      </div>
    </div>
  );
}
