import React, { useState } from 'react';
import { User, Phone, MapPin, Calendar, Mail, FileText, Save, X } from 'lucide-react';
import { crmApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

export default function ModalChinhSuaKhachHang({ customer, onClose, onUpdated }) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [birthDate, setBirthDate] = useState(customer?.birthDate ? customer.birthDate.substring(0, 10) : '');
  const [email, setEmail] = useState(customer?.email || '');
  const [preferenceNote, setPreferenceNote] = useState(customer?.preferenceNote || '');
  const [saving, setSaving] = useState(false);

  if (!customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Vui lòng nhập họ và tên khách hàng', 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await crmApi.updateCustomer(customer.id, {
        fullName: fullName.trim(),
        address: address.trim(),
        birthDate: birthDate || null,
        email: email.trim(),
        preferenceNote: preferenceNote.trim()
      });
      if (res.success) {
        showToast(res.userMessage || 'Cập nhật thông tin khách hàng thành công', 'success');
        if (onUpdated) onUpdated(res.data);
        onClose();
      } else {
        showToast(res.userMessage || 'Không thể cập nhật thông tin', 'error');
      }
    } catch (err) {
      showToast(err?.userMessage || 'Lỗi kết nối máy chủ khi cập nhật', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="modal fade show d-block animate__animated animate__fadeIn animate__faster" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg animate__animated animate__zoomIn animate__faster">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
                <User size={22} />
              </div>
              <div>
                <h5 className="modal-title fw-bold text-dark mb-0">Chỉnh Sửa Hồ Sơ Khách Hàng</h5>
                <span className="small text-muted">
                  SĐT định danh: <strong className="font-monospace text-primary">{customer.phone}</strong>
                </span>
              </div>
            </div>
            <button type="button" className="btn-close shadow-none" aria-label="Đóng" onClick={onClose} />
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 bg-light">
              <div className="bg-white p-4 rounded-4 border shadow-sm d-flex flex-column gap-3">
                
                {/* SĐT (Readonly) & Họ tên */}
                <div className="row g-3">
                  <div className="col-12 col-md-5">
                    <label className="form-label text-muted small fw-semibold">
                      <Phone size={14} className="me-1 text-primary" /> Số điện thoại (Định danh)
                    </label>
                    <input 
                      type="text" 
                      className="form-control font-monospace bg-light fw-bold" 
                      value={customer.phone} 
                      disabled 
                    />
                    <div className="form-text" style={{ fontSize: '0.78rem' }}>SĐT là mã định danh duy nhất của hồ sơ</div>
                  </div>

                  <div className="col-12 col-md-7">
                    <label className="form-label text-dark small fw-semibold">
                      <User size={14} className="me-1 text-primary" /> Họ và tên khách hàng <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control fw-medium" 
                      placeholder="Nhập họ và tên đầy đủ..." 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email & Ngày sinh */}
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-dark small fw-semibold">
                      <Mail size={14} className="me-1 text-secondary" /> Email liên hệ
                    </label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="email@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-dark small fw-semibold">
                      <Calendar size={14} className="me-1 text-secondary" /> Ngày sinh
                    </label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Địa chỉ */}
                <div>
                  <label className="form-label text-dark small fw-semibold">
                    <MapPin size={14} className="me-1 text-danger" /> Địa chỉ giao hàng / Cư trú
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..." 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* Ghi chú nhu cầu / sở thích */}
                <div>
                  <label className="form-label text-dark small fw-semibold">
                    <FileText size={14} className="me-1 text-warning" /> Ghi chú nhu cầu & Sở thích khách hàng
                  </label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Ví dụ: Khách làm đồ họa kiến trúc, thích dòng máy Dell Precision hoặc ThinkPad; Khách chuộng giao hàng ngoài giờ hành chính..."
                    value={preferenceNote}
                    onChange={(e) => setPreferenceNote(e.target.value)}
                  />
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
              <button type="button" className="btn btn-light border text-secondary rounded-pill px-4" onClick={onClose} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary rounded-pill px-4 d-inline-flex align-items-center gap-2 shadow-sm" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm" /> : <Save size={16} />}
                <span>Lưu thông tin</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
