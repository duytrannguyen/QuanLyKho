import React from 'react';
import {
  Edit3, Lock, Phone, Copy, Check, MessageSquare, PhoneCall,
  Sparkles, MapPin, Mail, Calendar, FileText, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { formatDate } from '../../../utils/dinh_dang';

export default function ThongTinKhachHangCard({
  currentCustomer,
  tier,
  cleanPhone,
  copiedPhone,
  copyPhone,
  canManage,
  requirePermission,
  showToast,
  setIsEditingCustomer,
  setShowTemplatesModal
}) {
  const TierIcon = tier?.icon;

  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
      {/* Header Card Hồ sơ */}
      <div className="card-header bg-white border-bottom p-3 px-3.5">
        <div className="d-flex align-items-center gap-3">
          <div
            className="text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold shadow-xs"
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              fontSize: '1.25rem'
            }}
          >
            {(currentCustomer?.fullName || 'K').charAt(0).toUpperCase()}
          </div>
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h6 className="fw-bold text-dark mb-0 text-truncate fs-6">
                {currentCustomer?.fullName || <span className="fst-italic text-muted fw-normal">Chưa có họ tên</span>}
              </h6>
              <button
                type="button"
                className="btn btn-sm btn-light border text-primary rounded-pill d-inline-flex align-items-center gap-1 py-0.5 px-2 hover-primary flex-shrink-0"
                style={{ fontSize: '0.75rem' }}
                onClick={() => {
                  if (!requirePermission('CRM_MANAGE', showToast, 'Chỉnh sửa thông tin hồ sơ khách hàng')) return;
                  setIsEditingCustomer(true);
                }}
                title={canManage ? 'Chỉnh sửa thông tin khách' : 'Yêu cầu quyền: Quản trị dữ liệu CRM'}
              >
                <Edit3 size={12} /> <span>Sửa</span>
                {!canManage && <Lock size={10} className="text-warning" />}
              </button>
            </div>

            <div className="d-flex align-items-center gap-1.5 mt-1 flex-wrap">
              {tier && (
                <span className={`badge rounded-pill ${tier.className} d-inline-flex align-items-center gap-1 py-0.5 px-2`} style={{ fontSize: '0.7rem' }}>
                  {TierIcon && <TierIcon size={11} />} {tier.name}
                </span>
              )}
              {currentCustomer?.customerType && (
                <span className="badge bg-light text-secondary border rounded-pill py-0.5 px-2" style={{ fontSize: '0.7rem' }}>
                  {currentCustomer.customerType}
                </span>
              )}

              {/* Badge Trạng thái CSKH */}
              {currentCustomer?.careStatusTag === 'CARE_DUE' ? (
                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                  <AlertCircle size={11} className="text-danger" />
                  <span>{currentCustomer.careStatusLabel || 'Đến hạn chăm sóc'}</span>
                </span>
              ) : currentCustomer?.careStatusTag === 'APPOINTMENT' ? (
                <span className="badge bg-warning bg-opacity-15 text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                  <Calendar size={11} className="text-warning-emphasis" />
                  <span>{currentCustomer.careStatusLabel || 'Đang hẹn khách'}</span>
                </span>
              ) : currentCustomer?.careStatusTag === 'COMPLETED' ? (
                <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                  <CheckCircle2 size={11} className="text-success" />
                  <span>{currentCustomer.careStatusLabel || 'Đã hoàn tất'}</span>
                </span>
              ) : currentCustomer?.careStatusTag === 'VOIDED' ? (
                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1 py-0.5 px-2 fw-semibold" style={{ fontSize: '0.7rem' }}>
                  <XCircle size={11} className="text-secondary" />
                  <span>{currentCustomer.careStatusLabel || 'Đã bán lại cho shop'}</span>
                </span>
              ) : (
                <span className="badge bg-light text-secondary border py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                  <span>{currentCustomer?.careStatusLabel || 'Đang dùng tốt'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SĐT & Nhóm nút kết nối nhanh */}
        <div className="d-flex flex-wrap align-items-center gap-1.5 mt-2.5 pt-2.5 border-top">
          <div className="d-inline-flex align-items-center gap-1 bg-light px-2 py-1 rounded-pill font-monospace fw-bold text-dark border shadow-2xs" style={{ fontSize: '0.78rem' }}>
            <Phone size={12} className="text-primary" />
            <span>{currentCustomer?.phone}</span>
            <button
              type="button"
              className="btn btn-sm p-0 text-secondary hover-primary border-0 ms-1"
              onClick={copyPhone}
              title="Sao chép SĐT"
            >
              {copiedPhone ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>

          {cleanPhone && (
            <>
              <a
                href={`https://zalo.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 shadow-2xs hover-primary"
                style={{ fontSize: '0.75rem' }}
                title="Mở Zalo chat với khách"
              >
                <MessageSquare size={12} />
                <span>Chat Zalo</span>
              </a>
              <a
                href={`tel:${cleanPhone}`}
                className="btn btn-sm btn-outline-success rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 shadow-2xs"
                style={{ fontSize: '0.75rem' }}
                title="Gọi điện trực tiếp"
              >
                <PhoneCall size={12} />
                <span>Gọi</span>
              </a>
            </>
          )}

          <button
            type="button"
            className="btn btn-sm btn-outline-warning text-dark rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 shadow-2xs"
            style={{ fontSize: '0.75rem' }}
            onClick={() => setShowTemplatesModal(true)}
            title="Mở bộ kịch bản tin nhắn CSKH"
          >
            <Sparkles size={12} className="text-warning" />
            <span>Tin nhắn mẫu</span>
          </button>
        </div>
      </div>

      {/* Thông tin thuộc tính khách hàng */}
      <div className="card-body p-3 px-3.5">
        <div className="d-flex flex-column gap-1.5 small">
          {currentCustomer?.address && (
            <div className="d-flex align-items-start gap-1.5">
              <MapPin size={13} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="text-truncate" style={{ fontSize: '0.78rem' }}>
                <span className="text-muted">Đ/c:</span> <span className="fw-medium text-dark">{currentCustomer.address}</span>
              </div>
            </div>
          )}

          {currentCustomer?.email && (
            <div className="d-flex align-items-center gap-1.5">
              <Mail size={13} className="text-secondary flex-shrink-0" />
              <div className="text-truncate" style={{ fontSize: '0.78rem' }}>
                <span className="text-muted">Email:</span> <span className="fw-medium text-dark">{currentCustomer.email}</span>
              </div>
            </div>
          )}

          {currentCustomer?.birthDate && (
            <div className="d-flex align-items-center gap-1.5">
              <Calendar size={13} className="text-info flex-shrink-0" />
              <div style={{ fontSize: '0.78rem' }}>
                <span className="text-muted">Sinh nhật:</span> <span className="fw-medium text-dark">{formatDate(currentCustomer.birthDate)}</span>
              </div>
            </div>
          )}

          {/* 2 ô mini Giao dịch đầu & Gần nhất */}
          <div className="row g-2 pt-1.5 mt-0.5 border-top">
            <div className="col-6">
              <div className="bg-light rounded-3 p-1.5 text-center border">
                <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Đơn đầu tiên</span>
                <strong className="text-dark font-monospace" style={{ fontSize: '0.75rem' }}>{formatDate(currentCustomer?.firstOrderAt)}</strong>
              </div>
            </div>
            <div className="col-6">
              <div className="bg-light rounded-3 p-1.5 text-center border">
                <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Đơn gần nhất</span>
                <strong className="text-dark font-monospace" style={{ fontSize: '0.75rem' }}>{formatDate(currentCustomer?.lastOrderAt)}</strong>
              </div>
            </div>
          </div>

          {/* Ghi chú nhu cầu / sở thích */}
          {currentCustomer?.preferenceNote && (
            <div className="mt-1.5 p-2 bg-warning bg-opacity-10 border border-warning-subtle rounded-3 text-dark">
              <div className="fw-bold small text-warning-emphasis d-flex align-items-center gap-1 mb-0.5" style={{ fontSize: '0.72rem' }}>
                <FileText size={12} /> Nhu cầu & Sở thích:
              </div>
              <div className="fst-italic" style={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {currentCustomer.preferenceNote}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

