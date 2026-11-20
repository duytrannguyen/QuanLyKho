import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, ShoppingBag, ClipboardCheck, AlertTriangle,
  PackagePlus, Search, RefreshCw, ArrowRight, Truck, Lock
} from 'lucide-react';
import { dashboardApi } from '../../api';
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
      console.error('TongQuan load error:', err);
    } finally {
      setLoading(false);
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
            className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={loadData}
            disabled={loading}
            title="Làm mới số liệu điều hành"
          >
            <RefreshCw size={16} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        <StatCard icon={Eye} colorClass="text-primary bg-primary bg-opacity-10" number={stats.totalActive} label="Tổng số máy trong kho" />
        <StatCard icon={ShoppingBag} colorClass="text-success bg-success bg-opacity-10" number={stats.readyToSell} label="Máy đủ điều kiện bán" />
        <StatCard icon={ClipboardCheck} colorClass="text-warning bg-warning bg-opacity-10" number={stats.needInspection} label="Máy chờ kỹ thuật" />
        <StatCard icon={AlertTriangle} colorClass="text-danger bg-danger bg-opacity-10" number={stats.withoutPrice} label="Máy chưa có giá bán" />
      </div>

      {/* Priority Tasks + Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-0 p-4">
            <h5 className="fw-bold mb-4">Việc cần xử lý</h5>
            
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
                onClick={handleGuardedNavigate('/tra-cuu', 'SEARCH_INVENTORY', 'Tra cứu tồn kho')}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                title={!hasPermission('SEARCH_INVENTORY') ? 'Cần quyền Tra cứu tồn kho (SEARCH_INVENTORY)' : ''}
              >
                <span>Xử lý</span>
                {!hasPermission('SEARCH_INVENTORY') && <Lock size={12} className="text-muted" />}
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
                  onClick={handleGuardedNavigate('/tra-cuu', 'SEARCH_INVENTORY', 'Tra cứu tồn kho')}
                  className={`btn w-100 py-3 border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2 position-relative ${
                    hasPermission('SEARCH_INVENTORY') ? 'btn-light' : 'btn-light opacity-75'
                  }`}
                >
                  <Search size={28} className={hasPermission('SEARCH_INVENTORY') ? 'text-primary' : 'text-secondary'} />
                  <span className="fw-medium text-dark d-flex align-items-center gap-1">
                    Tra serial
                    {!hasPermission('SEARCH_INVENTORY') && <Lock size={13} className="text-muted" />}
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
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card shadow-sm border-0 h-100 p-3 d-flex flex-row align-items-center gap-2 gap-sm-3" style={{transition: 'transform 0.2s'}}>
        <div className={`rounded d-flex align-items-center justify-content-center flex-shrink-0 ${colorClass}`} style={{width: '42px', height: '42px'}}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <div className="fs-4 fs-md-3 fw-bold text-dark lh-1 mb-1">{number}</div>
          <div className="text-secondary small lh-sm">{label}</div>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ dotClass, label, value }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card shadow-sm border-0 h-100 p-2.5 p-sm-3 d-flex flex-row align-items-center gap-2 gap-sm-3">
        <span className={`rounded-circle flex-shrink-0 ${dotClass}`} style={{width: '10px', height: '10px'}}></span>
        <div className="min-w-0">
          <div className="fw-medium text-dark small lh-sm">{label}</div>
          <div className="text-secondary fw-bold" style={{fontSize: '0.75rem'}}>{value}</div>
        </div>
      </div>
    </div>
  );
}
