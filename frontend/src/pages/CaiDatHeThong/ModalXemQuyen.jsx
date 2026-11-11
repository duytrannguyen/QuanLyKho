import React, { useState, useMemo } from 'react';
import { Shield, X, CheckCircle2, XCircle, Layers, Search } from 'lucide-react';
import { CRITICAL_PERMISSIONS } from '../../contexts/NguCanhXacThuc';

export default function ModalXemQuyen({ show, onClose, user, availablePermissions }) {
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const userPermSet = useMemo(() => new Set(user?.permissions || []), [user]);

  // Lọc và nhóm các quyền theo Group
  const groupedPermissions = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    const filtered = (availablePermissions || []).filter(p => {
      if (!q) return true;
      return (p.name && p.name.toLowerCase().includes(q)) ||
             (p.code && p.code.toLowerCase().includes(q)) ||
             (p.group && p.group.toLowerCase().includes(q)) ||
             (p.description && p.description.toLowerCase().includes(q));
    });

    const groups = {};
    filtered.forEach(perm => {
      const gName = perm.group || 'Khác';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(perm);
    });
    return groups;
  }, [availablePermissions, searchTerm]);

  if (!show || !user) return null;

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

          {/* SEARCH & FILTER BAR */}
          <div className="bg-light px-4 py-2.5 border-bottom d-flex justify-content-between align-items-center gap-3">
            <div className="input-group input-group-sm" style={{ maxWidth: '320px' }}>
              <span className="input-group-text bg-white"><Search size={14} /></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm quyền theo tên hoặc mã..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="badge bg-primary rounded-pill px-3 py-1.5 small">
              {totalGranted} quyền đang sở hữu
            </span>
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

            {Object.keys(groupedPermissions).length === 0 ? (
              <div className="text-center py-5 text-muted">
                <Search size={32} className="opacity-50 mb-2" />
                <div>Không tìm thấy quyền nào phù hợp với "{searchTerm}"</div>
              </div>
            ) : (
              <div className="row g-3">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                  const grantedInGroup = perms.filter(p => isAdmin || userPermSet.has(p.code)).length;
                  return (
                    <div className="col-md-6" key={groupName}>
                      <div className="border rounded-3 h-100 bg-white shadow-sm overflow-hidden">
                        <div className="bg-light px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <Layers size={14} className="text-primary" />
                            <span className="fw-bold text-dark text-uppercase small">{groupName}</span>
                          </div>
                          <span className="badge bg-secondary-subtle text-secondary rounded-pill small">
                            {grantedInGroup}/{perms.length}
                          </span>
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
                                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
                                    <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                      <span className={`fw-semibold small ${hasThis ? 'text-success-emphasis' : 'text-secondary'}`}>
                                        {p.name}
                                      </span>
                                      {p.type && (
                                        <span
                                          className={`badge rounded-pill ${
                                            p.type === 'ACTION'
                                              ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                              : 'bg-info-subtle text-info-emphasis border border-info-subtle'
                                          }`}
                                          style={{ fontSize: '0.62rem' }}
                                        >
                                          {p.type === 'ACTION' ? 'Thao tác' : 'Chức năng'}
                                        </span>
                                      )}
                                      {(p.critical || CRITICAL_PERMISSIONS.has(p.code)) && (
                                        <span
                                          className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle"
                                          style={{ fontSize: '0.62rem' }}
                                        >
                                          ⚠️ Rủi ro cao
                                        </span>
                                      )}
                                    </div>
                                    <code style={{ fontSize: '0.65rem' }}>{p.code}</code>
                                  </div>
                                  <div style={{ fontSize: '0.75rem' }} className="text-secondary">
                                    {p.description}
                                  </div>
                                  {p.module && (
                                    <div className="mt-1">
                                      <span className="badge bg-white text-secondary border fw-normal" style={{ fontSize: '0.65rem' }}>
                                        📍 {p.module}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
