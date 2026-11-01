import React, { useState, useEffect, useCallback } from 'react';
import { 
  PhoneCall, MessageSquare, User, Wrench, Calendar, 
  Clock, Plus, CheckCircle2, AlertCircle, Send, MessageCircle
} from 'lucide-react';
import { crmApi } from '../../api';
import { formatDate } from '../../utils/dinh_dang';

const INTERACTION_TYPES = [
  { value: 'CALL', label: 'Gọi điện', icon: PhoneCall, color: 'text-success', bg: 'bg-success bg-opacity-10 border-success-subtle' },
  { value: 'ZALO', label: 'Nhắn tin Zalo', icon: MessageSquare, color: 'text-primary', bg: 'bg-primary bg-opacity-10 border-primary-subtle' },
  { value: 'STORE_VISIT', label: 'Gặp tại cửa hàng', icon: User, color: 'text-purple', bg: 'bg-info bg-opacity-10 border-info-subtle' },
  { value: 'WARRANTY', label: 'Bảo hành / Kỹ thuật', icon: Wrench, color: 'text-warning', bg: 'bg-warning bg-opacity-10 border-warning-subtle' },
];

export default function TabNhatKyChamSoc({ customerId, customerName }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [interactionType, setInteractionType] = useState('CALL');
  const [content, setContent] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  const loadNotes = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError('');
      const res = await crmApi.getCareNotes(customerId);
      if (res.success) {
        setNotes(res.data || []);
      } else {
        setError(res.userMessage || 'Không thể tải lịch sử chăm sóc.');
      }
    } catch (err) {
      setError(err?.userMessage || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      setFormSuccess('');
      const res = await crmApi.addCareNote(customerId, {
        interactionType,
        content: content.trim(),
        followUpDate: followUpDate || null,
      });
      if (res.success) {
        setFormSuccess('Đã lưu nhật ký tương tác thành công!');
        setContent('');
        setFollowUpDate('');
        loadNotes();
        setTimeout(() => setFormSuccess(''), 3000);
      } else {
        setError(res.userMessage || 'Không thể lưu nhật ký.');
      }
    } catch (err) {
      setError(err?.userMessage || 'Lỗi khi lưu nhật ký chăm sóc.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMeta = (type) => {
    return INTERACTION_TYPES.find(t => t.value === type) || INTERACTION_TYPES[0];
  };

  return (
    <div className="d-flex flex-column gap-4 animate__animated animate__fadeIn">
      
      {/* Khung ghi chú mới */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-3 px-4 d-flex align-items-center gap-2">
          <div className="p-2 bg-primary bg-opacity-10 rounded text-primary">
            <Plus size={18} />
          </div>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Thêm Nhật Ký Chăm Sóc / Tương Tác</h6>
            <small className="text-secondary">Lưu lại nội dung gọi điện, nhắn Zalo hoặc lịch hẹn với khách hàng</small>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="card-body p-4 bg-light">
          {formSuccess && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-3 small">
              <CheckCircle2 size={16} /> {formSuccess}
            </div>
          )}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-3 small">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Chọn loại tương tác */}
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary text-uppercase mb-2">Hình thức tương tác</label>
            <div className="d-flex flex-wrap gap-2">
              {INTERACTION_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = interactionType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setInteractionType(type.value)}
                    className={`btn btn-sm rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 border transition-all ${
                      isSelected 
                        ? 'btn-primary shadow-sm text-white' 
                        : 'btn-white bg-white text-secondary'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nội dung tương tác */}
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary text-uppercase mb-1">
              Nội dung trao đổi <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control rounded-3"
              rows="3"
              placeholder="VD: Đã gọi điện hỏi thăm tình trạng máy sau 1 tuần mua, khách báo máy chạy mát, hài lòng. Hẹn thứ 7 mang máy qua vệ sinh..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Ngày hẹn tiếp theo */}
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-5">
              <label className="form-label small fw-bold text-secondary text-uppercase mb-1">
                <Calendar size={13} className="me-1" /> Ngày hẹn liên hệ lại (nếu có)
              </label>
              <input
                type="date"
                className="form-control rounded-3"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-7 d-flex justify-content-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="btn btn-primary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : (
                  <Send size={15} />
                )}
                <span>Lưu nhật ký chăm sóc</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Danh sách dòng thời gian Timeline */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-3 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 bg-info bg-opacity-10 rounded text-info">
              <Clock size={18} />
            </div>
            <div>
              <h6 className="mb-0 fw-bold text-dark">Lịch Sử Chăm Sóc ({notes.length})</h6>
              <small className="text-secondary">Dòng thời gian các lần trao đổi và hỗ trợ</small>
            </div>
          </div>
        </div>

        <div className="card-body p-4 bg-white">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="mt-2 text-muted small">Đang tải dòng thời gian chăm sóc...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <MessageCircle size={40} className="opacity-25 mb-2" />
              <p className="mb-1 fw-medium text-dark">Chưa có nhật ký chăm sóc nào</p>
              <small className="text-secondary">Hãy ghi chú lại cuộc gọi hoặc tin nhắn đầu tiên với khách hàng ở biểu mẫu phía trên.</small>
            </div>
          ) : (
            <div className="timeline-container d-flex flex-column gap-3">
              {notes.map((note) => {
                const meta = getMeta(note.interactionType);
                const Icon = meta.icon;
                return (
                  <div key={note.id} className="p-3 rounded-4 border bg-light d-flex flex-column gap-2 shadow-xs">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom pb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge rounded-pill border px-3 py-1 d-inline-flex align-items-center gap-1 ${meta.bg} ${meta.color} fw-medium small`}>
                          <Icon size={14} />
                          <span>{meta.label}</span>
                        </span>
                        <span className="text-secondary small">
                          bởi <strong className="text-dark">{note.createdBy || 'Nhân viên'}</strong>
                        </span>
                      </div>
                      <span className="text-muted small d-flex align-items-center gap-1 font-monospace">
                        <Clock size={13} /> {formatDate(note.createdAt)}
                      </span>
                    </div>

                    <p className="mb-0 text-dark small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {note.content}
                    </p>

                    {note.followUpDate && (
                      <div className="mt-1 pt-2 border-top d-flex align-items-center gap-2 text-warning fw-medium small">
                        <Calendar size={14} />
                        <span>Hẹn liên hệ lại vào ngày: <strong>{formatDate(note.followUpDate)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
