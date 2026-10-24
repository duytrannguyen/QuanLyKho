import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X, KeyRound } from 'lucide-react';
import { systemApi } from '../../api';

export default function ModalDoiMatKhau({ show, onClose, user, showToast }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!show || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      showToast('Vui lòng nhập mật khẩu mới', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu mới không khớp', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await systemApi.changePassword(user.id, newPassword);
      showToast(`Đã đổi mật khẩu thành công cho tài khoản "${user.username}"!`, 'success');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      const errMsg = err.userMessage || err.message || 'Lỗi đổi mật khẩu';
      showToast(errMsg, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          {/* HEADER */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <div 
                className="d-flex align-items-center justify-content-center rounded-3 bg-white-10"
                style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.1)' }}
              >
                <KeyRound size={20} className="text-warning" />
              </div>
              <div>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}>
                  Đổi mật khẩu
                </h5>
                <p className="text-white-50 m-0" style={{ fontSize: '0.8rem' }}>
                  Tài khoản: <strong className="text-white">{user.username}</strong> ({user.fullName})
                </p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose} 
              disabled={submitting}
            />
          </div>

          {/* BODY */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">
                  Mật khẩu mới <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><Lock size={16} /></span>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-control" 
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">
                  Nhập lại mật khẩu mới <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light"><Lock size={16} /></span>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-control" 
                    placeholder="Nhập lại mật khẩu để xác nhận"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="alert alert-warning border-0 rounded-3 p-3 mb-0 small text-dark">
                Sau khi đổi mật khẩu, người dùng sẽ cần sử dụng mật khẩu mới này cho lần đăng nhập tiếp theo.
              </div>
            </div>

            {/* FOOTER */}
            <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-end gap-2">
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={onClose} 
                disabled={submitting}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-sm px-4 fw-bold shadow-sm"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check size={16} className="me-1 d-inline" />
                    Xác nhận đổi
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
