import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { dinhDangTien } from '../../../utils/dinh_dang';

export const BRAND_CHANNEL_COLORS = {
  'TikTok': { main: '#fe2c55', bg: 'rgba(254, 44, 85, 0.1)', text: '#fe2c55' },
  'Zalo': { main: '#0068ff', bg: 'rgba(0, 104, 255, 0.1)', text: '#0068ff' },
  'Facebook': { main: '#1877f2', bg: 'rgba(24, 119, 242, 0.1)', text: '#1877f2' },
  'Google': { main: '#ea4335', bg: 'rgba(234, 67, 53, 0.1)', text: '#ea4335' },
  'Người quen giới thiệu': { main: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
  'Trực tiếp / Vãng lai': { main: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', text: '#7c3aed' },
  'Khác': { main: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  'Chưa rõ': { main: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', text: '#64748b' }
};

export const PIE_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#f97316', '#64748b',
  '#14b8a6', '#6366f1', '#84cc16', '#a855f7'
];

export const renderTrendBadge = (metric) => {
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

export const renderMoneyTooltip = ({ active, payload, label }) => {
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

export const renderCountTooltip = ({ active, payload, label }) => {
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

export const renderPieOuterAgentLabel = ({ cx, cy, midAngle, outerRadius, name, percentage, percent }) => {
  const pct = percentage !== undefined ? percentage : Math.round((percent || 0) * 100);
  if (pct < 4) return null;
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

export const renderPieInnerAgentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percentage, percent }) => {
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

export const getCustomerTypeColor = (name, index) => {
  if (!name) return '#94a3b8';
  const lower = name.toLowerCase();
  if (lower.includes('lần đầu') || lower.includes('mới')) return '#2563eb';
  if (lower.includes('cũ') || lower.includes('quen')) return '#10b981';
  if (lower.includes('chưa rõ') || lower.includes('khác')) return '#94a3b8';
  return PIE_COLORS[index % PIE_COLORS.length];
};

export const getStudentColor = (name, index) => {
  if (!name) return '#94a3b8';
  const lower = name.toLowerCase();
  if (lower.includes('sinh viên') && !lower.includes('không')) return '#06b6d4';
  if (lower.includes('đi làm') || lower.includes('khác') || lower.includes('không')) return '#3b82f6';
  if (lower.includes('chưa')) return '#94a3b8';
  return PIE_COLORS[index % PIE_COLORS.length];
};

export const getSourceColor = (name, index) => {
  if (BRAND_CHANNEL_COLORS[name]) return BRAND_CHANNEL_COLORS[name].main;
  return PIE_COLORS[index % PIE_COLORS.length];
};

export const getCategoryColor = (name) => {
  if (!name) return '#94a3b8';
  if (name.includes('Phụ kiện')) return '#10b981';
  if (name.includes('Sửa chữa') || name.includes('Dịch vụ')) return '#f59e0b';
  return '#2563eb';
};

export const formatSharePct = (val, total) => {
  if (!val || !total || total <= 0) return '0%';
  const p = (val / total) * 100;
  if (p > 0 && p < 0.1) return `${p.toFixed(2)}%`;
  return `${p.toFixed(1)}%`;
};

