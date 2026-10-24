import React from 'react';
import { Shield, X, CheckCircle2, XCircle, Layers } from 'lucide-react';

export default function ModalXemQuyen({ show, onClose, user, availablePermissions }) {
  if (!show || !user) return null;

  const isAdmin = user.role === 'ADMIN';
  const userPermSet = new Set(user.permissions || []);

  // Nhóm các quyền theo Group
  const groupedPermissions = {};
  (availablePermissions || []).forEach(perm => {
    const gName = perm.group || 'Khác';
    if (!groupedPermissions[gName]) groupedPermissions[gName] = [];
    groupedPermissions[gName].push(perm);
  });

  const totalGranted = isAdmin 
    ? (availablePermissions || []).length 
    : (user.permissions ? user.permissions.length : 0);

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          {/* HEADER */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <div 
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.1)' }}
              >
                <Shield size={20} className="text-info" />
              </div>
              <div>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}>
                  Chi tiết quyền hạn: {user.fullName} ({user.username})
                </h5>
                <p className="text-white-50 m-0" style={{ fontSize: '0.8rem' }}>
                  Vai trò: <span className="badge bg-primary-subtle text-primary border">{user.role}</span> · Đã cấp: <strong className="text-white">{totalGranted}</strong>/{(availablePermissions || []).length} quyền
                </p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose} 
            />
          </div>

          {/* BODY */}
          <div className="modal-body p-4" style={{ maxHeight: '70vh' }}>
            {isAdmin && (
              <div className="alert alert-success border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
                <Shield size={18} className="text-success flex-shrink-0" />
                <span className="small">
                  Tài khoản có vai trò <strong>ADMIN</strong> nên tự động sở hữu toàn bộ các quyền hạn trong hệ thống.
                </span>
              </div>
            )}

            <div className="row g-3">
              {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                <div className="col-md-6" key={groupName}>
                  <div className="border rounded-3 h-100 bg-white shadow-sm overflow-hidden">
                    <div className="bg-light px-3 py-2 border-bottom d-flex align-items-center gap-2">
                      <Layers size={14} className="text-primary" />
                      <span className="fw-bold text-dark text-uppercase small">{groupName}</span>
                    </div>
                    <div className="p-2">
                      {perms.map(p => {
                        const hasThis = isAdmin || userPermSet.has(p.code);
                        return (
                          <div 
                            key={p.code} 
                            className={`p-2 rounded-2 mb-1 d-flex align-items-start gap-2 ${hasThis ? 'bg-success-subtle' : 'bg-light text-muted opacity-60'}`}
                          >
                            <div className="pt-0.5">
                              {hasThis ? (
                                <CheckCircle2 size={16} className="text-success" />
                              ) : (
                                <XCircle size={16} className="text-secondary" />
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center justify-content-between">
                                <span className={`fw-semibold small ${hasThis ? 'text-success-emphasis' : 'text-secondary'}`}>
                                  {p.name}
                                </span>
                                <code style={{ fontSize: '0.65rem' }}>{p.code}</code>
                              </div>
                              <div style={{ fontSize: '0.75rem' }} className="text-secondary">
                                {p.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <div className="modal-footer bg-light px-4 py-2 border-top">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Đóng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
