import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Calendar, DollarSign,
  ShoppingCart, Users, Percent, Award, ArrowUpRight, CheckCircle2,
  AlertCircle, Filter, Layers, Smartphone, Laptop, MessageSquare,
  ShieldAlert, Sparkles, Activity, BarChart3, LineChart,
  Package, Wrench, Info, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, LabelList
} from 'recharts';
import { salesReportApi } from '../../api';
import { dinhDangTien } from '../../utils/dinh_dang';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

// Bảng màu nhận diện thương hiệu cho các kênh bán hàng
const BRAND_CHANNEL_COLORS = {
  'TikTok': { main: '#fe2c55', bg: 'rgba(254, 44, 85, 0.1)', text: '#fe2c55' },
  'Zalo': { main: '#0068ff', bg: 'rgba(0, 104, 255, 0.1)', text: '#0068ff' },
  'Facebook': { main: '#1877f2', bg: 'rgba(24, 119, 242, 0.1)', text: '#1877f2' },
  'Google': { main: '#ea4335', bg: 'rgba(234, 67, 53, 0.1)', text: '#ea4335' },
  'Người quen giới thiệu': { main: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
  'Trực tiếp / Vãng lai': { main: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '#7c3aed' },
  'Khác': { main: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  'Chưa rõ': { main: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', text: '#64748b' }
};

const PIE_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#f97316', '#64748b',
  '#14b8a6', '#6366f1', '#84cc16', '#a855f7'
];

export default function TrangBaoCaoBanHang() {
  const { showToast, confirm } = useToast();

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

  const renderTrendBadge = (metric) => {
    if (!metric) return null;
    const isUp = metric.trend === 'UP';
    const isDown = metric.trend === 'DOWN';

    const badgeClass = isUp
      ? 'bg-success-subtle text-success border-success-subtle'
      : isDown
        ? 'bg-danger-subtle text-danger border-danger-subtle'
        : 'bg-secondary-subtle text-secondary border-secondary-subtle';

    return (
      <span className={`badge border rounded-pill d-inline-flex align-items-center gap-1 px-2 py-1 fw-medium ${badgeClass}`}>
        {isUp && <TrendingUp size={14} />}
        {isDown && <TrendingDown size={14} />}
        {!isUp && !isDown && <Minus size={14} />}
        <span style={{ fontSize: '0.8rem' }}>{metric.changeText}</span>
      </span>
    );
  };

  const renderMoneyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-light-subtle rounded-3 shadow p-3" style={{ minWidth: 220, zIndex: 1000 }}>
          <div className="fw-bold mb-2 pb-2 border-bottom text-muted small text-uppercase">{label}</div>
          {payload.map((item, idx) => (
            <div key={idx} className="d-flex justify-content-between align-items-center gap-4 my-1">
              <span className="small fw-semibold" style={{ color: item.color || '#2563eb' }}>{item.name}:</span>
              <span className="text-dark fw-bold">{dinhDangTien(item.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCountTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-light-subtle rounded-3 shadow p-3" style={{ minWidth: 220, zIndex: 1000 }}>
          <div className="fw-bold mb-2 pb-2 border-bottom text-muted small text-uppercase">{label}</div>
          {payload.map((item, idx) => (
            <div key={idx} className="d-flex justify-content-between align-items-center gap-4 my-1">
              <span className="small fw-semibold" style={{ color: item.color || '#2563eb' }}>{item.name}:</span>
              <span className="text-dark fw-bold">{item.value?.toLocaleString('vi-VN')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Helper hiển thị nhãn ngoài lát cắt (cho các biểu đồ nhiều tác nhân, vừa vặn không bị cắt góc)
  const renderPieOuterAgentLabel = ({ cx, cy, midAngle, outerRadius, name, percentage, percent }) => {
    const pct = percentage !== undefined ? percentage : Math.round((percent || 0) * 100);
    if (pct < 4) return null; // Ẩn lát cắt quá nhỏ tránh đè chữ
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 14;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const isRight = x > cx;
    const displayName = (name && name.length > 12) ? name.substring(0, 10) + '…' : name;

    return (
      <text
        x={x} y={y}
        fill="#334155"
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {`${displayName} (${pct}%)`}
      </text>
    );
  };

  // Helper hiển thị nhãn tác nhân trực tiếp bên trong lát cắt Donut (Hiển thị cả Tên tác nhân + %)
  const renderPieInnerAgentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percentage, percent }) => {
    const pct = percentage !== undefined ? percentage : Math.round((percent || 0) * 100);
    if (pct < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const displayName = (name && name.length > 12) ? name.substring(0, 10) + '…' : name;

    if (pct >= 12) {
      return (
        <text
          x={x} y={y}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.6)', pointerEvents: 'none' }}
        >
          <tspan x={x} dy="-0.6em" fontSize="11" fontWeight="600">{displayName}</tspan>
          <tspan x={x} dy="1.3em" fontSize="12" fontWeight="700">{`${pct}%`}</tspan>
        </text>
      );
    }

    return (
      <text
        x={x} y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="700"
        style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.6)', pointerEvents: 'none' }}
      >
        {`${pct}%`}
      </text>
    );
  };

  // Trợ lý màu sắc chuyên biệt cho từng loại dữ liệu
  const getCustomerTypeColor = (name, index) => {
    if (!name) return '#94a3b8';
    const lower = name.toLowerCase();
    if (lower.includes('lần đầu') || lower.includes('mới')) return '#2563eb'; // Xanh dương
    if (lower.includes('cũ') || lower.includes('quen')) return '#10b981'; // Xanh lá
    if (lower.includes('chưa rõ') || lower.includes('khác')) return '#94a3b8'; // Xám
    return PIE_COLORS[index % PIE_COLORS.length];
  };

  const getStudentColor = (name, index) => {
    if (!name) return '#94a3b8';
    const lower = name.toLowerCase();
    if (lower.includes('sinh viên') && !lower.includes('không')) return '#06b6d4'; // Cyan
    if (lower.includes('đi làm') || lower.includes('khác') || lower.includes('không')) return '#3b82f6'; // Xanh dương
    if (lower.includes('chưa')) return '#94a3b8'; // Xám
    return PIE_COLORS[index % PIE_COLORS.length];
  };

  const getSourceColor = (name, index) => {
    if (BRAND_CHANNEL_COLORS[name]) return BRAND_CHANNEL_COLORS[name].main;
    return PIE_COLORS[index % PIE_COLORS.length];
  };

  const getCategoryColor = (name) => {
    if (!name) return '#94a3b8';
    if (name.includes('Phụ kiện')) return '#10b981';
    if (name.includes('Sửa chữa') || name.includes('Dịch vụ')) return '#f59e0b';
    return '#2563eb';
  };

  const formatSharePct = (val, total) => {
    if (!val || !total || total <= 0) return '0%';
    const p = (val / total) * 100;
    if (p > 0 && p < 0.1) return `${p.toFixed(2)}%`;
    return `${p.toFixed(1)}%`;
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
          >
            {rebuilding ? <div className="spinner-border spinner-border-sm text-secondary" role="status"></div> : <RefreshCw size={16} className="text-secondary" />}
            <span className="text-secondary">{rebuilding ? 'Đang đồng bộ...' : 'Đồng bộ CSDL'}</span>
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

                  {/* Progress bar tỷ trọng */}
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

                  {/* Progress bar tỷ trọng */}
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

                  {/* Progress bar tỷ trọng */}
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

            {/* Thanh ghi chú kế toán mỏng, tinh tế */}
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

          {/* TAB 1: XU HƯỚNG & KÊNH BÁN */}
          {activeTab === 'overview' && (
            <div className="fade show active">
              {/* Sơ đồ 1 */}
              <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
                <div className="card-header bg-transparent border-0 pt-4 pb-0 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <h5 className="fw-bold d-flex align-items-center gap-2 mb-1 text-dark">
                      <TrendingUp className="text-primary" size={22} />
                      Diễn Biến Doanh Thu & Sản Lượng
                    </h5>
                    <small className="text-muted">Theo dõi chu kỳ bán hàng theo thời gian</small>
                  </div>
                  <div className="bg-light p-1 rounded-pill border d-inline-flex">
                    <button
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all border-0 ${trendMetric === 'revenue-bar' ? 'btn-white bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
                      onClick={() => setTrendMetric('revenue-bar')}
                    >
                      <BarChart3 size={15} className="me-1 d-inline" /> Cột Doanh Thu
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all border-0 ${trendMetric === 'revenue-area' ? 'btn-white bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
                      onClick={() => setTrendMetric('revenue-area')}
                    >
                      <LineChart size={15} className="me-1 d-inline" /> Vùng Doanh Thu
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all border-0 ${trendMetric === 'orders' ? 'btn-white bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
                      onClick={() => setTrendMetric('orders')}
                    >
                      <ShoppingCart size={15} className="me-1 d-inline" /> Số Máy Bán
                    </button>
                  </div>
                </div>

                <div className="card-body p-4" style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {trendMetric === 'revenue-bar' ? (
                      <BarChart data={data.dailyRevenue || []} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v)} dx={-10} />
                        <Tooltip content={renderMoneyTooltip} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          <LabelList dataKey="revenue" position="top" formatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v > 0 ? dinhDangTien(v) : '')} fill="#475569" fontSize={11} fontWeight={600} />
                        </Bar>
                      </BarChart>
                    ) : trendMetric === 'revenue-area' ? (
                      <AreaChart data={data.dailyRevenue || []} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v)} dx={-10} />
                        <Tooltip content={renderMoneyTooltip} />
                        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={data.dailyRevenue || []} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip content={renderCountTooltip} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="orderCount" name="Số máy đã bán" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          <LabelList dataKey="orderCount" position="top" formatter={(v) => (v > 0 ? `${v}` : '')} fill="#475569" fontSize={12} fontWeight={700} />
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="row g-4 mb-4">
                {/* Sơ đồ 2: Doanh Thu Nguồn */}
                <div className="col-12 col-lg-7">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                    <div className="card-header bg-transparent border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="fw-bold d-flex align-items-center gap-2 mb-1 text-dark">
                          <Filter className="text-info" size={22} />
                          Xếp Hạng Nguồn Chốt Đơn
                        </h5>
                      </div>
                    </div>
                    <div className="card-body p-4 d-flex flex-column justify-content-center" style={{ minHeight: 380 }}>
                      <ResponsiveContainer width="100%" height={340}>
                        <BarChart layout="vertical" data={data.revenueBySource || []} margin={{ top: 10, right: 110, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="source" tick={{ fontSize: 13, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} width={130} />
                          <Tooltip content={renderMoneyTooltip} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="revenue" name="Doanh thu" radius={[0, 6, 6, 0]} barSize={32}>
                            {(data.revenueBySource || []).map((entry, idx) => {
                              const colorObj = BRAND_CHANNEL_COLORS[entry.source] || BRAND_CHANNEL_COLORS['Khác'];
                              return <Cell key={`cell-${idx}`} fill={colorObj.main} />;
                            })}
                            <LabelList
                              dataKey="revenue"
                              position="right"
                              formatter={(val) => {
                                if (!val) return '';
                                const pct = totalRevenue > 0 ? ((val / totalRevenue) * 100).toFixed(1) : 0;
                                const moneyText = val >= 1e6 ? `${(val / 1e6).toFixed(1)} Tr` : dinhDangTien(val);
                                return `${moneyText} (${pct}%)`;
                              }}
                              fill="#475569" fontSize={12} fontWeight={600}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Sơ đồ 3: Hành vi chốt */}
                <div className="col-12 col-lg-5">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                    <div className="card-header bg-transparent border-0 pt-4 pb-0 px-4">
                      <h5 className="fw-bold d-flex align-items-center gap-2 mb-1 text-dark">
                        <MessageSquare className="text-warning" size={22} />
                        Hành Vi Chốt Đơn
                      </h5>
                    </div>
                    <div className="card-body p-4 d-flex flex-column">
                      <div style={{ height: 260, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.inboxVsDirect || []} dataKey="value" nameKey="name"
                              cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} stroke="none"
                              labelLine={false} label={renderPieInnerAgentLabel}
                            >
                              {(data.inboxVsDirect || []).map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#f59e0b'} />)}
                            </Pie>
                            <Tooltip content={renderMoneyTooltip} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="row g-3 mt-auto">
                        {(data.inboxVsDirect || []).map((item, idx) => (
                          <div key={idx} className="col-6">
                            <div className="p-3 bg-light rounded-4 border border-light-subtle h-100 text-center">
                              <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                <span className="rounded-circle" style={{ width: 12, height: 12, backgroundColor: idx === 0 ? '#3b82f6' : '#f59e0b' }}></span>
                                <span className="fw-bold text-dark">{item.name}</span>
                              </div>
                              <h4 className="fw-bold text-primary mb-1">{item.percentage}%</h4>
                              <div className="small text-muted fw-semibold">{dinhDangTien(item.value)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SẢN PHẨM & HÃNG */}
          {activeTab === 'products' && (
            <div className="fade show active">
              <div className="row g-4 mb-4">

                {/* Bảng Top Models */}
                <div className="col-12 col-xl-7">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                    <div className="card-header bg-transparent border-0 pt-4 pb-0 px-4">
                      <h5 className="fw-bold d-flex align-items-center gap-2 mb-1 text-dark">
                        <Award className="text-warning" size={22} />
                        Top 10 Dòng Máy Bán Chạy Nhất
                      </h5>
                    </div>
                    <div className="card-body p-0 mt-4">
                      <div className="table-responsive border-0">
                        <table className="table table-hover align-middle mb-0 border-top-0">
                          <thead className="table-light">
                            <tr>
                              <th className="px-4 py-3 text-muted small fw-bold text-uppercase border-bottom-0" style={{ width: 70 }}>Hạng</th>
                              <th className="py-3 text-muted small fw-bold text-uppercase border-bottom-0">Sản Phẩm</th>
                              <th className="py-3 text-muted small fw-bold text-uppercase border-bottom-0 text-center">Đã Bán</th>
                              <th className="py-3 text-muted small fw-bold text-uppercase border-bottom-0 text-end">Doanh Thu</th>
                              <th className="px-4 py-3 text-muted small fw-bold text-uppercase border-bottom-0" style={{ width: 140 }}>Tỷ Trọng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.topModels || []).map((m, idx) => {
                              const pct = totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0;
                              return (
                                <tr key={idx}>
                                  <td className="px-4 py-3 border-light-subtle">
                                    <span className={`badge rounded-circle d-flex align-items-center justify-content-center p-0 fw-bold shadow-sm ${idx === 0 ? 'bg-warning text-white' :
                                      idx === 1 ? 'bg-secondary text-white' :
                                        idx === 2 ? 'bg-danger text-white' :
                                          'bg-light text-secondary border'
                                      }`} style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="py-3 border-light-subtle">
                                    <div className="fw-bold text-dark text-truncate" style={{ maxWidth: 280 }} title={m.modelName}>{m.modelName}</div>
                                    <div className="text-muted small fw-medium mt-1">Đơn giá TB: {dinhDangTien(m.aov)}</div>
                                  </td>
                                  <td className="py-3 border-light-subtle text-center">
                                    <span className="fw-bold text-dark fs-5">{m.orderCount}</span>
                                  </td>
                                  <td className="py-3 border-light-subtle text-end fw-bold text-primary">{dinhDangTien(m.revenue)}</td>
                                  <td className="px-4 py-3 border-light-subtle">
                                    <div className="d-flex align-items-center gap-2">
                                      <div className="progress flex-grow-1 bg-light" style={{ height: 8 }}>
                                        <div className="progress-bar bg-primary rounded-pill" style={{ width: `${Math.min(pct * 3, 100)}%` }}></div>
                                      </div>
                                      <span className="text-muted fw-bold small" style={{ minWidth: '40px' }}>{pct.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Biểu đồ Thị phần Hãng */}
                <div className="col-12 col-xl-5">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold d-flex align-items-center gap-2 mb-0 text-dark">
                        <Laptop className="text-primary" size={22} />
                        Thị Phần Hãng Sản Xuất
                      </h5>
                      <span className="badge bg-light text-secondary border rounded-pill px-3 py-1 fw-medium">
                        {(data.brandMix || []).length} Hãng
                      </span>
                    </div>

                    <div style={{ minHeight: 250, width: '100%', flexGrow: 1 }}>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart margin={{ top: 10, right: 25, left: 25, bottom: 10 }}>
                          <Pie
                            data={data.brandMix || []} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none"
                            label={renderPieOuterAgentLabel} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          >
                            {(data.brandMix || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={renderMoneyTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-3 border-top border-light-subtle" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {(data.brandMix || []).map((item, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                          <div className="d-flex align-items-center gap-2">
                            <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                            <span className="fw-bold text-dark small">{item.name}</span>
                          </div>
                          <div className="text-end">
                            <span className="fw-bold text-primary me-2">{item.percentage}%</span>
                            <span className="small text-muted fw-semibold">({dinhDangTien(item.value)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hàng 2: Cơ cấu Ngành hàng & Cơ cấu Phân khúc */}
              <div className="row g-4 mb-4">
                {/* 1. Cơ cấu Doanh thu Ngành hàng */}
                <div className="col-12 col-lg-6">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold d-flex align-items-center gap-2 mb-0 text-dark">
                        <Layers className="text-success" size={22} />
                        Cơ Cấu Doanh Thu Theo Ngành Hàng
                      </h5>
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fw-bold">
                        Máy Móc • Phụ Kiện • Sửa Chữa
                      </span>
                    </div>

                    <div style={{ height: 260, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.categoryMix || []} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none"
                            labelLine={false} label={renderPieInnerAgentLabel}
                          >
                            {(data.categoryMix || []).map((item, i) => (
                              <Cell key={i} fill={getCategoryColor(item.name)} />
                            ))}
                          </Pie>
                          <Tooltip content={renderMoneyTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-3 border-top border-light-subtle">
                      {(data.categoryMix || []).map((item, idx) => {
                        const color = getCategoryColor(item.name);
                        return (
                          <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                            <div className="d-flex align-items-center gap-2">
                              <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: color }}></span>
                              <span className="fw-bold text-dark small">{item.name}</span>
                            </div>
                            <div className="text-end">
                              <span className="fw-bold text-dark me-2">{formatSharePct(item.value, totalRevenue)}</span>
                              <span className="small text-muted fw-semibold">({dinhDangTien(item.value)})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Cơ cấu Phân khúc máy */}
                <div className="col-12 col-lg-6">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold d-flex align-items-center gap-2 mb-0" style={{ color: '#7c3aed' }}>
                        <Layers size={22} />
                        Cơ Cấu Phân Khúc Máy
                      </h5>
                      <span className="badge bg-light text-secondary border rounded-pill px-3 py-1 fw-medium">
                        Phân khúc giá
                      </span>
                    </div>

                    <div style={{ height: 260, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 25, left: 25, bottom: 10 }}>
                          <Pie
                            data={data.segmentMix || []} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none"
                            label={renderPieOuterAgentLabel} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          >
                            {(data.segmentMix || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 4) % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={renderCountTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-3 border-top border-light-subtle" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {(data.segmentMix || []).map((item, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                          <div className="d-flex align-items-center gap-2">
                            <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: PIE_COLORS[(idx + 4) % PIE_COLORS.length] }}></span>
                            <span className="fw-bold text-dark small">{item.name}</span>
                          </div>
                          <div className="text-end">
                            <span className="fw-bold text-purple me-2" style={{ color: '#7c3aed' }}>{item.percentage}%</span>
                            <span className="small text-muted fw-semibold">({item.value?.toLocaleString('vi-VN')} đơn)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KHÁCH HÀNG (ĐÃ TỐI ƯU TOÀN DIỆN, KHÔNG TRÙNG LẶP, KHÔNG BỊ TRÀN CHỮ) */}
          {activeTab === 'customers' && (
            <div className="fade show active">
              <div className="row g-4 mb-4">

                {/* Card 1: Khách Mới vs Khách Cũ */}
                <div className="col-12 col-md-4">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column">
                    <h5 className="fw-bold d-flex align-items-center justify-content-center gap-2 mb-3 text-dark text-center">
                      <Users className="text-primary" size={22} />
                      Khách Mới & Khách Cũ
                    </h5>

                    <div style={{ height: 230, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.customerTypeMix || []} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none"
                            labelLine={false} label={renderPieInnerAgentLabel}
                          >
                            {(data.customerTypeMix || []).map((item, i) => (
                              <Cell key={i} fill={getCustomerTypeColor(item.name, i)} />
                            ))}
                          </Pie>
                          <Tooltip content={renderCountTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-3 border-top border-light-subtle">
                      {(data.customerTypeMix || []).map((item, idx) => {
                        const color = getCustomerTypeColor(item.name, idx);
                        return (
                          <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                            <div className="d-flex align-items-center gap-2">
                              <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: color }}></span>
                              <span className="fw-bold text-dark small">{item.name}</span>
                            </div>
                            <div className="text-end">
                              <span className="fw-bold text-primary me-2">{item.percentage}%</span>
                              <span className="small text-muted fw-semibold">({item.value?.toLocaleString('vi-VN')} đơn)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card 2: Học Sinh / Sinh Viên */}
                <div className="col-12 col-md-4">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column">
                    <h5 className="fw-bold d-flex align-items-center justify-content-center gap-2 mb-3 text-dark text-center">
                      <Sparkles className="text-info" size={22} />
                      Tỷ Lệ Học Sinh / Sinh Viên
                    </h5>

                    <div style={{ height: 230, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.studentMix || []} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none"
                            labelLine={false} label={renderPieInnerAgentLabel}
                          >
                            {(data.studentMix || []).map((item, i) => (
                              <Cell key={i} fill={getStudentColor(item.name, i)} />
                            ))}
                          </Pie>
                          <Tooltip content={renderCountTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-3 border-top border-light-subtle">
                      {(data.studentMix || []).map((item, idx) => {
                        const color = getStudentColor(item.name, idx);
                        return (
                          <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                            <div className="d-flex align-items-center gap-2">
                              <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: color }}></span>
                              <span className="fw-bold text-dark small">{item.name}</span>
                            </div>
                            <div className="text-end">
                              <span className="fw-bold text-info me-2">{item.percentage}%</span>
                              <span className="small text-muted fw-semibold">({item.value?.toLocaleString('vi-VN')} đơn)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card 3: Nguồn Tiếp Cận Lần Đầu (Đã thu gọn radius để chữ không bị cắt ở mép) */}
                <div className="col-12 col-md-4">
                  <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column">
                    <h5 className="fw-bold d-flex align-items-center justify-content-center gap-2 mb-3 text-dark text-center">
                      <Smartphone className="text-purple" size={22} style={{ color: '#7c3aed' }} />
                      Nguồn Tiếp Cận Lần Đầu
                    </h5>

                    <div style={{ height: 230, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 25, left: 25, bottom: 10 }}>
                          <Pie
                            data={data.firstSourceMix || []} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none"
                            label={renderPieOuterAgentLabel} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          >
                            {(data.firstSourceMix || []).map((item, i) => (
                              <Cell key={i} fill={getSourceColor(item.name, i)} />
                            ))}
                          </Pie>
                          <Tooltip content={renderCountTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-auto pt-3 border-top border-light-subtle" style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {(data.firstSourceMix || []).map((item, idx) => {
                        const color = getSourceColor(item.name, idx);
                        return (
                          <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                            <div className="d-flex align-items-center gap-2">
                              <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: color }}></span>
                              <span className="fw-bold text-dark small text-truncate" style={{ maxWidth: 140 }}>{item.name}</span>
                            </div>
                            <div className="text-end">
                              <span className="fw-bold text-dark me-2">{item.percentage}%</span>
                              <span className="small text-muted fw-semibold">({item.value?.toLocaleString('vi-VN')} đơn)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: SỨC KHỎE DỮ LIỆU */}
          {activeTab === 'dataQuality' && (
            <div className="fade show active">
              <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white p-4 p-xl-5">
                <div className="text-center mb-5">
                  <div className="d-inline-flex align-items-center justify-content-center p-3 bg-warning-subtle text-warning-emphasis rounded-circle mb-3">
                    <ShieldAlert size={40} />
                  </div>
                  <h4 className="fw-bold text-dark">Kiểm Soát Chất Lượng Dữ Liệu</h4>
                  <p className="text-muted">Hệ thống tự động rà soát tính đầy đủ của thông tin đơn hàng để đảm bảo báo cáo luôn chính xác nhất.</p>
                </div>

                <div className="row g-4 justify-content-center">
                  <div className="col-12 col-md-4">
                    <div className="p-4 bg-light rounded-4 border border-light-subtle text-center h-100 shadow-sm hover-lift-card">
                      <div className="text-muted fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Tổng Đơn Hàng Xét Duyệt</div>
                      <h1 className="fw-bold text-dark display-5 mb-3">
                        {data.dataQuality?.totalOrdersInPeriod?.toLocaleString('vi-VN') || 0}
                      </h1>
                      <span className="badge bg-success text-white rounded-pill px-3 py-2 fw-semibold fs-6 shadow-sm">
                        <CheckCircle2 size={16} className="me-1 inline" /> Hợp lệ
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="p-4 rounded-4 border text-center h-100 shadow-sm hover-lift-card" style={{ backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }}>
                      <div className="text-danger fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Đơn Lỗi / Thiếu Thông Tin</div>
                      <h1 className="fw-bold text-danger display-5 mb-3">
                        {data.dataQuality?.issuesCount?.toLocaleString('vi-VN') || 0}
                      </h1>
                      <p className="text-danger small fw-semibold mb-0">Thiếu mã khách hàng hoặc<br />thuộc tính bắt buộc</p>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="p-4 rounded-4 border text-center h-100 shadow-sm hover-lift-card" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                      <div className="text-warning-emphasis fw-bold mb-3 text-uppercase small" style={{ letterSpacing: '1px' }}>Đơn Chưa Rõ Nguồn</div>
                      <h1 className="fw-bold text-warning display-5 mb-3">
                        {data.dataQuality?.unknownSourceCount?.toLocaleString('vi-VN') || 0}
                      </h1>
                      <p className="text-warning-emphasis small fw-semibold mb-0">Nguồn chốt đơn đang bị<br />để trống hoặc "Chưa rõ"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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