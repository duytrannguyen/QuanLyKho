import React from 'react';
import { Award, Laptop, Layers } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { dinhDangTien } from '../../../utils/dinh_dang';
import {
  PIE_COLORS,
  renderPieOuterAgentLabel,
  renderPieInnerAgentLabel,
  renderMoneyTooltip,
  renderCountTooltip,
  getCategoryColor,
  formatSharePct
} from './baoCaoConstants';

export default function TabSanPham({ data, totalRevenue }) {
  if (!data) return null;

  return (
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
              {(data.categoryMix || []).map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: getCategoryColor(item.name) }}></span>
                    <span className="fw-bold text-dark small">{item.name}</span>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold text-dark me-2">{formatSharePct(item.value, totalRevenue)}</span>
                    <span className="small text-muted fw-semibold">({dinhDangTien(item.value)})</span>
                  </div>
                </div>
              ))}
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
  );
}

