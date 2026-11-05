import React from 'react';
import { Monitor } from 'lucide-react';
import { formatDate } from '../../../utils/dinh_dang';

export default function BangThongTinMayChon({ machine }) {
  const isReady = machine?.state === 'READY';
  const waitDays = machine?.intakeAt
    ? Math.floor((new Date() - new Date(machine.intakeAt)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="card shadow-sm border-0 rounded-3 mb-2.5 overflow-hidden">
      <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
        <h6 className="card-title fw-bold m-0 d-flex align-items-center text-dark" style={{ fontSize: '0.8rem' }}>
          <Monitor className="me-1.5 text-primary" size={15} /> THÔNG TIN MÁY CHỌN
        </h6>
        <span
          className={`badge rounded-pill px-2 py-0.5 ${isReady ? 'bg-success text-white' : 'bg-warning text-dark'}`}
          style={{ fontSize: '0.68rem' }}
        >
          {isReady ? 'SẴN SÀNG' : 'KIỂM TRA'}
        </span>
      </div>

      <div className="card-body p-2.5">
        <div className="mb-2">
          <div className="fw-bold text-dark fs-6 lh-sm mb-1">
            {machine.sourceModelText || machine.platformDisplayName || 'Không rõ dòng máy'}
          </div>
          <div className="d-flex flex-wrap gap-1 align-items-center">
            {machine.brandName && (
              <span className="badge bg-light text-secondary border" style={{ fontSize: '0.68rem' }}>
                {machine.brandName} {machine.modelLineName ? `• ${machine.modelLineName}` : ''}
              </span>
            )}
            {machine.configId && (
              <span className="badge bg-light text-muted border font-monospace" style={{ fontSize: '0.68rem' }}>
                Mã CH: {machine.configId}
              </span>
            )}
          </div>
        </div>

        {/* Cấu hình nhanh 3 ô */}
        <div className="row g-1 mb-2 text-center">
          <div className="col-4">
            <div className="p-1 bg-light rounded-2 border" style={{ fontSize: '0.72rem' }}>
              <span className="text-muted d-block" style={{ fontSize: '9px' }}>CPU</span>
              <span className="fw-bold text-dark text-truncate d-block">{machine.cpuCode || '—'}</span>
            </div>
          </div>
          <div className="col-4">
            <div className="p-1 bg-light rounded-2 border" style={{ fontSize: '0.72rem' }}>
              <span className="text-muted d-block" style={{ fontSize: '9px' }}>RAM</span>
              <span className="fw-bold text-info text-truncate d-block">{machine.ram || '—'}</span>
            </div>
          </div>
          <div className="col-4">
            <div className="p-1 bg-light rounded-2 border" style={{ fontSize: '0.72rem' }}>
              <span className="text-muted d-block" style={{ fontSize: '9px' }}>SSD</span>
              <span className="fw-bold text-success text-truncate d-block">{machine.ssd || '—'}</span>
            </div>
          </div>
        </div>

        {/* Chi tiết Serial & Kho */}
        <div className="d-flex justify-content-between align-items-center py-1 border-top" style={{ fontSize: '0.75rem' }}>
          <span className="text-muted">Serial Key:</span>
          <span className="fw-bold font-monospace bg-light px-2 py-0.5 rounded border text-primary">
            {machine.serialKey}
          </span>
        </div>
        <div className="d-flex justify-content-between align-items-center py-1 border-top" style={{ fontSize: '0.75rem' }}>
          <span className="text-muted">Lưu kho:</span>
          <span className="fw-medium text-dark">{waitDays} ngày ({formatDate(machine.intakeAt)})</span>
        </div>
      </div>
    </div>
  );
}
