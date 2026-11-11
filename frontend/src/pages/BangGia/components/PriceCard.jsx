import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import logoQK from '../../../assets/qkshop_logo.jpg';
import {
  DEFAULT_WARRANTY,
  POLICY_LINES,
  getFullModelName,
  getPriceText,
  getGpuText
} from './bangGiaConstants';

/**
 * Thẻ giá (dùng cho xem trước trên màn hình)
 */
export function PriceCard({ item }) {
  const modelTitle = item.modelTitle || getFullModelName(item);

  return (
    <div style={{
      border: '1.5px solid #111',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, Helvetica, sans-serif',
      background: '#fff',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <img src={logoQK} alt="QK Shop" style={{ height: '70px', maxWidth: '100%', objectFit: 'contain', marginTop: '-17px' }} />
      </div>

      <div style={{
        background: '#000', color: '#fff', textAlign: 'center',
        fontWeight: 900, fontSize: '15px', lineHeight: 1.3,
        padding: '6px 8px', width: '100%', boxSizing: 'border-box',
        wordWrap: 'break-word', flexShrink: 0, marginTop: '-20px'
      }}>
        {modelTitle}
      </div>

      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '20px', margin: '8px 0 4px', color: '#000', flexShrink: 0 }}>
        Giá: {getPriceText(item)}
      </div>

      <div style={{ borderBottom: '2px solid #000', margin: '0 8px 8px', flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#000', lineHeight: 1.25 }}>
        <div><b>CPU:</b> {item.cpuCode || ''}</div>
        <div><b>RAM:</b> {item.ramCode || ''}</div>
        <div><b>SSD:</b> {item.ssdCode || ''}</div>
        <div><b>Màn hình:</b> {item.screenSpec || ''}</div>
        <div><b>VGA:</b> {getGpuText(item)}</div>
        <div><b>Trọng lượng:</b> {item.weightKg || ''}{item.weightKg ? <i style={{ fontWeight: 'normal' }}>Kg</i> : ''}</div>
      </div>

      <div style={{ background: '#333', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '8px 4px', margin: '8px 0', flexShrink: 0 }}>
        {item.warrantyText || DEFAULT_WARRANTY}
      </div>

      <div style={{
        fontSize: '9px', fontStyle: 'italic', fontWeight: 700,
        lineHeight: 1.35, color: '#000', flexShrink: 0,
        whiteSpace: 'normal', wordWrap: 'break-word'
      }}>
        {POLICY_LINES.map(line => <div key={line}>{line}</div>)}
      </div>
    </div>
  );
}

/**
 * Thanh tiến trình các bước
 */
export function StepIndicator({ step, canGoTo, onGoTo }) {
  const steps = [
    { n: 1, label: 'Chọn máy' },
    { n: 2, label: 'Chỉnh sửa thông tin' },
    { n: 3, label: 'Xem trước & In' },
  ];
  return (
    <div className="d-flex align-items-center flex-wrap gap-2 mb-4">
      {steps.map(({ n, label }, idx) => {
        const isActive = step === n;
        const isDone = step > n;
        const enabled = canGoTo(n);
        return (
          <div key={n} className="d-flex align-items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 border-0 ${
                isActive ? 'btn-primary shadow-sm' : isDone ? 'btn-light text-success' : 'btn-light text-secondary'
              }`}
              disabled={!enabled && !isActive}
              onClick={() => enabled && onGoTo(n)}
            >
              <span
                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${
                  isActive ? 'bg-white text-primary' : isDone ? 'bg-success text-white' : 'bg-secondary text-white'
                }`}
                style={{ width: 22, height: 22, fontSize: 12 }}
              >
                {isDone ? <Check size={13} /> : n}
              </span>
              <span className="fw-semibold">{label}</span>
            </button>
            {idx < steps.length - 1 && <ChevronRight size={16} className="text-secondary opacity-50" />}
          </div>
        );
      })}
    </div>
  );
}

