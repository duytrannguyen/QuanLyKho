import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Calendar, DollarSign,
  ShoppingCart, Users, Percent, ArrowUpRight, AlertCircle,
  Filter, Layers, Laptop, ShieldAlert, Activity,
  Package, Wrench, Info, Lock
} from 'lucide-react';
import { salesReportApi } from '../../api';
import { dinhDangTien } from '../../utils/dinh_dang';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { BRAND_CHANNEL_COLORS, renderTrendBadge, formatSharePct } from './components/baoCaoConstants';
import TabTongQuan from './components/TabTongQuan';
import TabSanPham from './components/TabSanPham';
import TabKhachHang from './components/TabKhachHang';
import TabChatLuongDuLieu from './components/TabChatLuongDuLieu';

export default function TrangBaoCaoBanHang() {
  const { showToast, confirm } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const canRebuild = hasPermission('SYNC_MANAGE|SYSTEM_MANAGE');

  const [preset, setPreset] = useState('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [trendMetric, setTrendMetric] = useState('revenue-bar'); // 'revenue-bar' | 'revenue-area' | 'orders'

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (selectedPreset, fromDate, toDate, silent = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = { preset: selectedPreset };
      if (selectedPreset === 'CUSTOM') {
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
      }
      const res = await salesReportApi.getDashboard(params);
      if (res && res.data) setData(res.data);
      else setData(null);
    } catch (err) {
      console.error('Lỗi tải báo cáo bán hàng:', err);
      const msg = err?.response?.data?.userMessage || 'Không thể tải dữ liệu báo cáo bán hàng. Vui lòng thử lại.';
      setError(msg);
      if (!silent) showToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData(preset, customFrom, customTo, true);
  }, [preset, fetchData]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!customFrom || !customTo) {
      showToast('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc', 'warning');
      return;
    }
    setPreset('CUSTOM');
    fetchData('CUSTOM', customFrom, customTo);
  };

  const handleRebuild = async () => {
    if (!requirePermission('SYNC_MANAGE|SYSTEM_MANAGE', showToast, 'Đồng bộ lại cơ sở dữ liệu báo cáo bán hàng')) return;
    const isConfirmed = await confirm('Hệ thống sẽ đồng bộ và làm mới lại toàn bộ dữ liệu đơn hàng vào bảng sales_orders. Bạn có chắc chắn muốn thực hiện?');
    if (!isConfirmed) return;

    try {
      setRebuilding(true);
      showToast('Đang tiến hành đồng bộ dữ liệu đơn hàng...', 'primary');
      const res = await salesReportApi.rebuild();
      showToast(res?.userMessage || 'Làm mới dữ liệu thành công!', 'success');
      fetchData(preset, customFrom, customTo);
    } catch (err) {
      showToast('Lỗi làm mới dữ liệu: ' + (err?.response?.data?.userMessage || err.message), 'danger');
    } finally {
      setRebuilding(false);
    }
  };

  const kpis = data?.kpis;
  const totalRevenue = kpis?.actualRevenue?.current || 1;

  const channelCardsData = useMemo(() => {
    if (!kpis) return [];
    return [
      { id: 'tiktok', name: 'TikTok', revenue: kpis.tiktokRevenue?.current || 0, trend: kpis.tiktokRevenue, color: BRAND_CHANNEL_COLORS['TikTok'] },
      { id: 'zalo', name: 'Zalo', revenue: kpis.zaloRevenue?.current || 0, trend: kpis.zaloRevenue, color: BRAND_CHANNEL_COLORS['Zalo'] },
      { id: 'facebook', name: 'Facebook', revenue: kpis.facebookRevenue?.current || 0, trend: kpis.facebookRevenue, color: BRAND_CHANNEL_COLORS['Facebook'] },
      { id: 'google', name: 'Google', revenue: kpis.googleRevenue?.current || 0, trend: kpis.googleRevenue, color: BRAND_CHANNEL_COLORS['Google'] },
      { id: 'referral', name: 'Giới thiệu', revenue: kpis.referralRevenue?.current || 0, trend: kpis.referralRevenue, color: BRAND_CHANNEL_COLORS['Người quen giới thiệu'] }
    ];
  }, [kpis]);

  return (
    <div className="container-fluid px-3 px-xl-4 py-4 bg-body-tertiary min-vh-100 overflow-hidden">

      {/* ==================== 1. HEADER & CONTROL ==================== */}
      <div className="row align-items-center justify-content-between mb-4 gy-3">
        <div className="col-12 col-md-auto">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-4 d-flex align-items-center justify-content-center">
              <Activity size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="fs-4 fw-bold text-dark mb-1">Báo Cáo Doanh Số & Kênh Bán</h2>
              <div className="text-muted small d-flex align-items-center flex-wrap gap-2">
                <span>Phân tích dữ liệu đa kênh</span>
                {data && (
                  <>
                    <span className="text-body-tertiary">•</span>
                    <span className="badge bg-white text-dark border shadow-sm px-2 py-1 rounded-pill fw-medium">
                      Kỳ hiện tại: <span className="text-primary fw-bold">{data.periodLabel}</span>
                      {data.previousPeriodLabel && <span className="text-muted fw-normal ms-1">(So sánh: {data.previousPeriodLabel})</span>}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-auto d-flex align-items-center gap-2">
          <button
            className="btn btn-white border bg-white shadow-sm btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill hover-lift"
            onClick={handleRebuild}
            disabled={rebuilding}
            title={canRebuild ? 'Đồng bộ lại dữ liệu đơn hàng vào CSDL báo cáo' : 'Yêu cầu quyền: Quản lý đồng bộ hoặc Quản trị hệ thống'}
          >
            {rebuilding ? <div className="spinner-border spinner-border-sm text-secondary" role="status"></div> : <RefreshCw size={16} className="text-secondary" />}
            <span className="text-secondary">{rebuilding ? 'Đang đồng bộ...' : 'Đồng bộ CSDL'}</span>
            {!canRebuild && <Lock size={13} className="text-warning" />}
          </button>
          <button
            className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 px-4 py-2 fw-semibold rounded-pill shadow-sm hover-lift"
            onClick={() => { showToast('Đang cập nhật...', 'primary'); fetchData(preset, customFrom, customTo); }}
            disabled={loading}
          >
            {loading ? <div className="spinner-border spinner-border-sm text-white" role="status"></div> : <RefreshCw size={16} />}
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <div className="bg-white p-1 rounded-pill shadow-sm border d-inline-flex flex-wrap align-items-center gap-1">
          {[
            { id: 'ALL_TIME', label: 'Toàn thời gian' },
            { id: 'THIS_MONTH', label: 'Tháng này' },
            { id: 'LAST_MONTH', label: 'Tháng trước' },
            { id: 'THIS_WEEK', label: 'Tuần này' },
            { id: 'LAST_WEEK', label: 'Tuần trước' },
            { id: 'TODAY', label: 'Hôm nay' },
            { id: 'YESTERDAY', label: 'Hôm qua' },
            { id: 'CUSTOM', label: 'Tùy chỉnh' }
          ].map((p) => (
            <button
              key={p.id}
              className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold transition-all border-0 ${preset === p.id
                ? 'btn-primary shadow-sm text-white'
                : 'btn-light bg-transparent text-secondary hover-bg-light'
                }`}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'CUSTOM' && (
          <form onSubmit={handleApplyCustomDate} className="bg-white p-1 rounded-pill shadow-sm border d-inline-flex align-items-center gap-2 px-3">
            <Calendar size={16} className="text-primary flex-shrink-0" />
            <input type="date" className="form-control form-control-sm border-0 bg-transparent py-1 shadow-none fw-medium text-dark" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} required />
            <span className="text-muted small fw-medium">đến</span>
            <input type="date" className="form-control form-control-sm border-0 bg-transparent py-1 shadow-none fw-medium text-dark" value={customTo} onChange={(e) => setCustomTo(e.target.value)} required />
            <button type="submit" className="btn btn-primary btn-sm px-3 rounded-pill fw-bold">Áp dụng</button>
          </form>
        )}
      </div>

      {/* ERROR / LOADING */}
      {error && (
        <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex align-items-center mb-4">
          <AlertCircle size={24} className="me-3 flex-shrink-0" />
          <div className="flex-grow-1 fw-medium">{error}</div>
          <button className="btn btn-outline-danger btn-sm rounded-pill px-4 fw-bold" onClick={() => fetchData(preset, customFrom, customTo)}>Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
          <h5 className="fw-bold text-dark">Đang tổng hợp dữ liệu...</h5>
          <p className="text-muted">Hệ thống đang truy xuất các chỉ số quản trị từ cơ sở dữ liệu.</p>
        </div>
      ) : data ? (
        <>
          {/* ==================== 2. HERO METRICS (4 CARDS) ==================== */}
          <div className="row g-3 mb-4">
            {/* Thực tế */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100 text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="fw-semibold text-white-50 text-uppercase small" style={{ letterSpacing: '0.5px' }}>Doanh Thu Thực Tế (Net)</span>
                      <div className="bg-white bg-opacity-25 rounded-circle p-2 d-flex align-items-center justify-content-center">
                        <DollarSign size={20} className="text-white" />
                      </div>
                    </div>
                    <h3 className="fw-bold fs-2 mb-0 text-white">{dinhDangTien(kpis?.actualRevenue?.current || 0)}</h3>
                  </div>
                  <div className="d-flex justify-content-between align-items-end mt-4">
                    <div className="bg-white bg-opacity-25 px-2 py-1 rounded-pill text-white fw-bold small d-flex align-items-center gap-1 shadow-sm">
                      {kpis?.actualRevenue?.trend === 'UP' ? <TrendingUp size={14} /> : kpis?.actualRevenue?.trend === 'DOWN' ? <TrendingDown size={14} /> : <Minus size={14} />}
                      {kpis?.actualRevenue?.changeText}
                    </div>
                    <span className="text-white-50 small fw-medium">Đã trừ giảm giá</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Niêm yết */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100 bg-white hover-lift-card">
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="text-muted fw-bold text-uppercase small" style={{ letterSpacing: '0.5px' }}>Doanh Thu Niêm Yết</span>
                      <div className="rounded-circle p-2 d-flex align-items-center justify-content-center bg-warning-subtle text-warning-emphasis">
                        <Percent size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-dark fs-3 mb-0">{dinhDangTien(kpis?.grossRevenue?.current || 0)}</h3>
                  </div>
                  <div className="d-flex justify-content-between align-items-end mt-4">
                    <span className="text-danger fw-bold small">Giảm: {dinhDangTien(kpis?.totalDiscount?.current || 0)}</span>
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill">
                      Tỷ lệ {(kpis?.discountRate?.current || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sản lượng */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100 bg-white hover-lift-card">
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="text-muted fw-bold text-uppercase small" style={{ letterSpacing: '0.5px' }}>Số Máy Bán Hoàn Tất</span>
                      <div className="rounded-circle p-2 d-flex align-items-center justify-content-center bg-success-subtle text-success-emphasis">
                        <ShoppingCart size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-dark fs-3 mb-0">
                      {kpis?.soldUnits?.current?.toLocaleString('vi-VN') || 0} <span className="fs-6 text-muted fw-semibold">máy</span>
                    </h3>
                  </div>
                  <div className="d-flex justify-content-between align-items-end mt-4">
                    {renderTrendBadge(kpis?.soldUnits)}
                    <span className="text-muted small fw-medium">Đơn hoàn thành</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AOV */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm rounded-4 h-100 bg-white hover-lift-card">
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="text-muted fw-bold text-uppercase small" style={{ letterSpacing: '0.5px' }}>Giá Trị TB / Đơn (AOV)</span>
                      <div className="rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
                        <ArrowUpRight size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-dark fs-3 mb-0">{dinhDangTien(kpis?.aov?.current || 0)}</h3>
                  </div>
                  <div className="d-flex justify-content-between align-items-end mt-4">
                    {renderTrendBadge(kpis?.aov)}
                    <span className="text-muted small fw-medium">Quy mô đơn hàng</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 2.1. DOANH THU RIÊNG BIỆT THEO NGÀNH HÀNG ==================== */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 px-1">
              <div className="d-flex align-items-center gap-2">
                <div className="p-1 rounded-2 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center">
                  <Layers size={18} />
                </div>
                <div>
                  <h6 className="fw-bold mb-0 text-dark text-uppercase small" style={{ letterSpacing: '0.5px' }}>
                    Phân Tách Doanh Thu Theo Ngành Hàng
                  </h6>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Doanh số độc lập từ phân hệ Máy tính, Phụ kiện và Sửa chữa kỹ thuật</span>
                </div>
              </div>
              <span className="badge bg-white text-secondary border shadow-xs rounded-pill px-3 py-1 fw-medium" style={{ fontSize: '0.78rem' }}>
                Hạch toán độc lập từ CSDL
              </span>
            </div>

            <div className="row g-3">
              {/* 1. Máy móc */}
              <div className="col-12 col-lg-4">
                <div className="card category-card category-card-machine border-0 h-100 p-4 hover-lift-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle p-2 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center">
                        <Laptop size={18} />
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-6">Máy Móc (Laptop / PC)</div>
                        <span className="text-muted small">Thiết bị chính</span>
                      </div>
                    </div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 fw-bold">
                      {formatSharePct(kpis?.machineRevenue?.current, totalRevenue)}
                    </span>
                  </div>

                  <h3 className="fw-bold text-dark fs-3 mb-2">
                    {dinhDangTien(kpis?.machineRevenue?.current || 0)}
                  </h3>

                  <div className="progress mb-3 bg-light" style={{ height: 6 }}>
                    <div
                      className="progress-bar bg-primary rounded-pill"
                      style={{ width: `${Math.min((((kpis?.machineRevenue?.current || 0) / totalRevenue) * 100), 100)}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small fw-semibold">
                      Sản lượng: <strong className="text-dark">{(kpis?.machineOrders?.current || 0).toLocaleString('vi-VN')}</strong> máy
                    </span>
                    {renderTrendBadge(kpis?.machineRevenue)}
                  </div>

                  <div className="mt-auto pt-3 border-top border-light-subtle text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                    <div className="d-flex align-items-start gap-1">
                      <Info size={14} className="text-primary flex-shrink-0 mt-1" />
                      <span>Laptop & PC hoàn tất từ kho chính (đã trừ voucher/giảm giá).</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Phụ kiện */}
              <div className="col-12 col-lg-4">
                <div className="card category-card category-card-accessory border-0 h-100 p-4 hover-lift-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle p-2 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center">
                        <Package size={18} />
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-6">Phụ Kiện Tin Học</div>
                        <span className="text-muted small">Phân hệ Kho Phụ Kiện</span>
                      </div>
                    </div>
                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 fw-bold">
                      {formatSharePct(kpis?.accessoryRevenue?.current, totalRevenue)}
                    </span>
                  </div>

                  <h3 className="fw-bold text-dark fs-3 mb-2">
                    {dinhDangTien(kpis?.accessoryRevenue?.current || 0)}
                  </h3>

                  <div className="progress mb-3 bg-light" style={{ height: 6 }}>
                    <div
                      className="progress-bar bg-success rounded-pill"
                      style={{ width: `${Math.max(Math.min((((kpis?.accessoryRevenue?.current || 0) / totalRevenue) * 100), 100), 2)}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small fw-semibold">
                      Sản lượng: <strong className="text-dark">{(kpis?.accessoryOrders?.current || 0).toLocaleString('vi-VN')}</strong> đơn
                    </span>
                    {renderTrendBadge(kpis?.accessoryRevenue)}
                  </div>

                  <div className="mt-auto pt-3 border-top border-light-subtle text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                    <div className="d-flex align-items-start gap-1">
                      <Info size={14} className="text-success flex-shrink-0 mt-1" />
                      <span>Bao gồm đơn bán lẻ và phụ kiện bán kèm ngoài mặc định (tính phí). <strong>Quà tặng mặc định kèm máy (0đ) không tính vào doanh thu.</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Dịch vụ sửa chữa */}
              <div className="col-12 col-lg-4">
                <div className="card category-card category-card-repair border-0 h-100 p-4 hover-lift-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle p-2 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center">
                        <Wrench size={18} />
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-6">Dịch Vụ Sửa Chữa</div>
                        <span className="text-muted small">Phân hệ Quản Lý Sửa Chữa</span>
                      </div>
                    </div>
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 fw-bold">
                      {formatSharePct(kpis?.repairRevenue?.current, totalRevenue)}
                    </span>
                  </div>

                  <h3 className="fw-bold text-dark fs-3 mb-2">
                    {dinhDangTien(kpis?.repairRevenue?.current || 0)}
                  </h3>

                  <div className="progress mb-3 bg-light" style={{ height: 6 }}>
                    <div
                      className="progress-bar bg-warning rounded-pill"
                      style={{ width: `${Math.max(Math.min((((kpis?.repairRevenue?.current || 0) / totalRevenue) * 100), 100), 2)}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small fw-semibold">
                      Sản lượng: <strong className="text-dark">{(kpis?.repairOrders?.current || 0).toLocaleString('vi-VN')}</strong> phiếu
                    </span>
                    {renderTrendBadge(kpis?.repairRevenue)}
                  </div>

                  <div className="mt-auto pt-3 border-top border-light-subtle text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                    <div className="d-flex align-items-start gap-1">
                      <Info size={14} className="text-warning flex-shrink-0 mt-1" />
                      <span>Công kỹ thuật viên, bảo dưỡng tra keo, thay linh kiện máy.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 px-3 py-2 mt-3 rounded-3 bg-white border border-light-subtle text-muted small shadow-xs">
              <Info size={16} className="text-primary flex-shrink-0" />
              <div className="flex-grow-1" style={{ fontSize: '0.825rem' }}>
                <span className="fw-bold text-dark">Quy tắc ghi nhận:</span> Doanh thu thuần (Net) = <strong>Máy Móc + Phụ Kiện + Dịch Vụ Sửa Chữa</strong>. <em>Ghi chú phụ kiện:</em> Phụ kiện gồm 2 loại: <strong>Quà tặng mặc định (0đ)</strong> không tính doanh thu; chỉ <strong>phụ kiện bán kèm ngoài mặc định (tính phí)</strong> hoặc <strong>bán lẻ</strong> mới được tính vào doanh thu phụ kiện.
              </div>
            </div>
          </div>

          {/* ==================== 3. CHANNELS STRIP ==================== */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2 px-1">
              <div className="d-flex align-items-center gap-2">
                <div className="p-1 rounded-2 bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center">
                  <Filter size={18} />
                </div>
                <h6 className="fw-bold mb-0 text-dark text-uppercase small" style={{ letterSpacing: '0.5px' }}>
                  Hiệu Suất Theo Kênh Bán Hàng
                </h6>
              </div>
              <span className="text-muted small" style={{ fontSize: '0.78rem' }}>5 kênh chốt đơn chính</span>
            </div>

            <div className="row g-2">
              {channelCardsData.map((c) => {
                const pct = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={c.id} className="col-12 col-sm-6 col-xl flex-fill">
                    <div className="channel-pill-card h-100 d-flex flex-column justify-content-between">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="rounded-circle shadow-xs flex-shrink-0" style={{ width: 9, height: 9, backgroundColor: c.color.main }}></span>
                          <span className="fw-bold text-dark small">{c.name}</span>
                        </div>
                        <span className="fw-bold text-muted small">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="fw-bold text-dark fs-6 my-1">
                        {dinhDangTien(c.revenue)}
                      </div>
                      <div className="progress bg-light my-1" style={{ height: 4 }}>
                        <div className="progress-bar rounded-pill" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: c.color.main }}></div>
                      </div>
                      <div className="text-end mt-1">
                        {renderTrendBadge(c.trend)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==================== 4. WORKSPACE TABS ==================== */}
          <div className="d-flex justify-content-center mb-4">
            <div className="bg-white p-1 rounded-pill shadow-sm border d-inline-flex flex-wrap">
              <button
                className={`btn rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2 border-0 transition-all ${activeTab === 'overview' ? 'btn-primary text-white shadow-sm' : 'btn-light bg-transparent text-secondary'
                  }`}
                onClick={() => setActiveTab('overview')}
              >
                <TrendingUp size={18} /> Xu Hướng & Kênh
              </button>
              <button
                className={`btn rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2 border-0 transition-all ${activeTab === 'products' ? 'btn-primary text-white shadow-sm' : 'btn-light bg-transparent text-secondary'
                  }`}
                onClick={() => setActiveTab('products')}
              >
                <Laptop size={18} /> Sản Phẩm & Hãng
              </button>
              <button
                className={`btn rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2 border-0 transition-all ${activeTab === 'customers' ? 'btn-primary text-white shadow-sm' : 'btn-light bg-transparent text-secondary'
                  }`}
                onClick={() => setActiveTab('customers')}
              >
                <Users size={18} /> Khách Hàng
              </button>
              <button
                className={`btn rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2 border-0 transition-all ${activeTab === 'dataQuality' ? 'btn-primary text-white shadow-sm' : 'btn-light bg-transparent text-secondary'
                  }`}
                onClick={() => setActiveTab('dataQuality')}
              >
                <ShieldAlert size={18} /> Sức Khỏe Dữ Liệu
                {data.dataQuality?.issuesCount > 0 && <span className="badge bg-danger rounded-circle p-1 ms-1 d-flex align-items-center justify-content-center" style={{ width: 22, height: 22 }}>{data.dataQuality.issuesCount}</span>}
              </button>
            </div>
          </div>

          {/* ==================== TABS CONTENT ==================== */}
          {activeTab === 'overview' && (
            <TabTongQuan
              data={data}
              trendMetric={trendMetric}
              setTrendMetric={setTrendMetric}
              totalRevenue={totalRevenue}
            />
          )}

          {activeTab === 'products' && (
            <TabSanPham
              data={data}
              totalRevenue={totalRevenue}
            />
          )}

          {activeTab === 'customers' && (
            <TabKhachHang
              data={data}
            />
          )}

          {activeTab === 'dataQuality' && (
            <TabChatLuongDuLieu
              data={data}
            />
          )}
        </>
      ) : null}

      {/* CSS inline cho trải nghiệm giao diện cao cấp & mượt mà */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.12)!important; }
        .hover-lift-card { transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
        .hover-lift-card:hover { transform: translateY(-3px); box-shadow: 0 .75rem 1.5rem rgba(15,23,42,.08)!important; }
        .hover-bg-light:hover { background-color: #f8fafc!important; color: #2563eb!important; }
        
        .category-card {
          background: #ffffff;
          border-radius: 1rem;
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
          position: relative;
          overflow: hidden;
        }
        .category-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }
        .category-card-machine::before { background: linear-gradient(90deg, #2563eb, #60a5fa); }
        .category-card-accessory::before { background: linear-gradient(90deg, #10b981, #34d399); }
        .category-card-repair::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

        .channel-pill-card {
          background: #ffffff;
          border-radius: 0.875rem;
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
          padding: 0.85rem 1rem;
          transition: all 0.2s ease;
        }
        .channel-pill-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
          border-color: rgba(203, 213, 225, 0.9);
        }
        .shadow-xs { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
      `}} />
    </div>
  );
}
