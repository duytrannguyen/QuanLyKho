import React from 'react';
import {
  TrendingUp, BarChart3, LineChart, ShoppingCart, Filter, MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, LabelList
} from 'recharts';
import { dinhDangTien } from '../../../utils/dinh_dang';
import {
  BRAND_CHANNEL_COLORS,
  renderMoneyTooltip,
  renderCountTooltip,
  renderPieInnerAgentLabel
} from './baoCaoConstants';

export default function TabTongQuan({ data, trendMetric, setTrendMetric, totalRevenue }) {
  if (!data) return null;

  return (
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
  );
}

