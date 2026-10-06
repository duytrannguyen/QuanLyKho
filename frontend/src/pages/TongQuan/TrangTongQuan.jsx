import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, ShoppingBag, ClipboardCheck, AlertTriangle,
  PackagePlus, Search, RefreshCw, ArrowRight
} from 'lucide-react';
import { dashboardApi } from '../../api';
import { formatEventType } from '../../utils/dinh_dang';

export default function TrangTongQuan() {
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
      <div className="mb-4">
        <h2 className="fw-bold m-0">Điều hành kho hàng</h2>
        <p className="text-secondary">Tình trạng hệ thống và công việc cần xử lý hôm nay</p>
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
        <HealthItem dotClass="bg-success" label="DataSale" value="Đã kết nối đọc" />
        <HealthItem dotClass="bg-warning" label="Đồng bộ bán hàng" value="Thủ công có kiểm soát" />
        <HealthItem dotClass="bg-success" label="Lần đồng bộ" value={new Date().toLocaleString('vi-VN')} />
        <HealthItem dotClass="bg-secondary" label="Tự động" value="Chưa kích hoạt" />
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
              <button className="btn btn-sm btn-outline-primary">Xử lý</button>
            </div>
            
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
              <div className="d-flex align-items-center gap-3">
                <span className="badge rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center p-2" style={{width: '32px', height: '32px'}}>P1</span>
                <span className="fw-medium text-dark">{prio.p1_pending_inspections} máy chờ kiểm tra</span>
              </div>
              <Link to="/kiem-tra" className="btn btn-sm btn-outline-primary">Xử lý</Link>
            </div>

            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <span className="badge rounded-circle bg-info text-dark d-flex align-items-center justify-content-center p-2" style={{width: '32px', height: '32px'}}>P2</span>
                <span className="fw-medium text-dark">{prio.p2_without_price} máy chưa có giá bán</span>
              </div>
              <button className="btn btn-sm btn-outline-primary">Xử lý</button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-0 p-4">
            <h5 className="fw-bold mb-4">Thao tác nhanh</h5>
            <div className="row g-3">
              <div className="col-6">
                <Link to="/nhap-may" className="btn btn-light w-100 py-3 text-decoration-none border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2">
                  <PackagePlus size={28} className="text-primary" />
                  <span className="fw-medium text-dark">Nhập máy</span>
                </Link>
              </div>
              <div className="col-6">
                <Link to="/tra-cuu" className="btn btn-light w-100 py-3 text-decoration-none border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2">
                  <Search size={28} className="text-primary" />
                  <span className="fw-medium text-dark">Tra serial</span>
                </Link>
              </div>
              <div className="col-6">
                <Link to="/kiem-tra" className="btn btn-light w-100 py-3 text-decoration-none border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2">
                  <ClipboardCheck size={28} className="text-primary" />
                  <span className="fw-medium text-dark">Kiểm tra máy</span>
                </Link>
              </div>
              <div className="col-6">
                <button className="btn btn-light w-100 py-3 text-decoration-none border shadow-sm h-100 d-flex flex-column align-items-center justify-content-center gap-2" onClick={loadData}>
                  <RefreshCw size={28} className="text-primary" />
                  <span className="fw-medium text-dark">Đồng bộ ngay</span>
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
          <Link to="/nhat-ky" className="text-decoration-none text-primary fw-medium small d-flex align-items-center gap-1">
            Mở nhật ký đầy đủ <ArrowRight size={14} />
          </Link>
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
