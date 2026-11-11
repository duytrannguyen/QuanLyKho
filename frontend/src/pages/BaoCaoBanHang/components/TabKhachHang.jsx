import React from 'react';
import { Users, Sparkles, Smartphone } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  renderPieInnerAgentLabel,
  renderPieOuterAgentLabel,
  renderCountTooltip,
  getCustomerTypeColor,
  getStudentColor,
  getSourceColor
} from './baoCaoConstants';

export default function TabKhachHang({ data }) {
  if (!data) return null;

  return (
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
              {(data.customerTypeMix || []).map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: getCustomerTypeColor(item.name, idx) }}></span>
                    <span className="fw-bold text-dark small">{item.name}</span>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold text-primary me-2">{item.percentage}%</span>
                    <span className="small text-muted fw-semibold">({item.value?.toLocaleString('vi-VN')} đơn)</span>
                  </div>
                </div>
              ))}
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
              {(data.studentMix || []).map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: getStudentColor(item.name, idx) }}></span>
                    <span className="fw-bold text-dark small">{item.name}</span>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold text-info me-2">{item.percentage}%</span>
                    <span className="small text-muted fw-semibold">({item.value?.toLocaleString('vi-VN')} đơn)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Nguồn Tiếp Cận Lần Đầu */}
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
              {(data.firstSourceMix || []).map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded-3 bg-light border border-light-subtle">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle shadow-sm flex-shrink-0" style={{ width: 12, height: 12, backgroundColor: getSourceColor(item.name, idx) }}></span>
                    <span className="fw-bold text-dark small text-truncate" style={{ maxWidth: 140 }}>{item.name}</span>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold text-dark me-2">{item.percentage}%</span>
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

