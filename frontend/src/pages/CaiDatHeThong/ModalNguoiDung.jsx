import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Shield, User as UserIcon, Lock, Mail, CheckSquare, 
  Square, RefreshCw, Info, AlertTriangle, Layers
} from 'lucide-react';
import { systemApi } from '../../api';

// Định nghĩa preset quyền mặc định cho từng vai trò
const ROLE_PRESETS = {
  ADMIN: [
    'DASHBOARD_VIEW', 'ANALYTICS_VIEW',
    'SALE_MACHINE', 'SALE_ACCESSORY', 'PRICING_VIEW',
    'MANAGE_MACHINE_CODES', 'IMPORT_MACHINE', 'IMPORT_ACCESSORY', 'INVENTORY_ACCESSORY', 'INSPECTION',
    'SEARCH_INVENTORY', 'ACCESSORY_HISTORY', 'WARRANTY_CHECK',
    'SYNC_MANAGE', 'LOGS_VIEW', 'SYSTEM_MANAGE'
  ],
  MANAGER: [
    'DASHBOARD_VIEW', 'ANALYTICS_VIEW',
    'SALE_MACHINE', 'SALE_ACCESSORY', 'PRICING_VIEW',
    'MANAGE_MACHINE_CODES', 'IMPORT_MACHINE', 'IMPORT_ACCESSORY', 'INVENTORY_ACCESSORY', 'INSPECTION',
    'SEARCH_INVENTORY', 'ACCESSORY_HISTORY', 'WARRANTY_CHECK',
    'SYNC_MANAGE', 'LOGS_VIEW'
  ],
  STAFF: [
    'DASHBOARD_VIEW',
    'SALE_MACHINE', 'SALE_ACCESSORY', 'PRICING_VIEW',
    'SEARCH_INVENTORY', 'ACCESSORY_HISTORY', 'WARRANTY_CHECK',
    'INSPECTION'
  ]
};

export default function ModalNguoiDung({ 
  show, 
  onClose, 
  onSuccess, 
  editingUser, 
  availablePermissions, 
  showToast 
}) {
  const isEdit = Boolean(editingUser);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'STAFF',
    isActive: true,
  });

  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' hoặc 'permissions'

  // Nhóm các quyền theo Group
  const groupedPermissions = useMemo(() => {
    const groups = {};
    (availablePermissions || []).forEach(perm => {
      const gName = perm.group || 'Khác';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(perm);
    });
    return groups;
  }, [availablePermissions]);

  // Điền dữ liệu khi mở modal
  useEffect(() => {
    if (!show) return;

    if (editingUser) {
      setFormData({
        username: editingUser.username || '',
        password: '',
        fullName: editingUser.fullName || '',
        email: editingUser.email || '',
        role: editingUser.role || 'STAFF',
        isActive: editingUser.isActive !== false,
      });

      // Nếu là ADMIN thì nạp toàn quyền, ngược lại nạp permissions của user
      if (editingUser.role === 'ADMIN') {
        const allCodes = (availablePermissions || []).map(p => p.code);
        setSelectedPermissions(new Set(allCodes));
      } else if (editingUser.permissions && Array.isArray(editingUser.permissions)) {
        setSelectedPermissions(new Set(editingUser.permissions));
      } else {
        setSelectedPermissions(new Set(ROLE_PRESETS[editingUser.role] || []));
      }
    } else {
      // Thêm mới: mặc định vai trò STAFF và nạp preset STAFF
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: 'STAFF',
        isActive: true,
      });
      setSelectedPermissions(new Set(ROLE_PRESETS.STAFF));
    }
    setActiveTab('info');
  }, [show, editingUser, availablePermissions]);

  if (!show) return null;

  // Xử lý thay đổi input cơ bản
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Nếu thay đổi vai trò khi tạo mới -> tự động cập nhật gợi ý quyền
    if (field === 'role' && !isEdit) {
      const preset = ROLE_PRESETS[value] || [];
      setSelectedPermissions(new Set(preset));
    }
  };

  // Toggle một quyền đơn lẻ
  const togglePermission = (code) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Toggle toàn bộ quyền trong một nhóm
  const toggleGroup = (groupName) => {
    const permsInGroup = groupedPermissions[groupName] || [];
    const allSelected = permsInGroup.every(p => selectedPermissions.has(p.code));

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      permsInGroup.forEach(p => {
        if (allSelected) {
          next.delete(p.code);
        } else {
          next.add(p.code);
        }
      });
      return next;
    });
  };

  // Thao tác nhanh
  const selectAllPermissions = () => {
    const all = (availablePermissions || []).map(p => p.code);
    setSelectedPermissions(new Set(all));
  };

  const deselectAllPermissions = () => {
    setSelectedPermissions(new Set());
  };

  const applyRolePreset = () => {
    const preset = ROLE_PRESETS[formData.role] || [];
    setSelectedPermissions(new Set(preset));
    showToast(`Đã áp dụng ${preset.length} quyền chuẩn của vai trò ${formData.role}`, 'info');
  };

  // Gửi Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      showToast('Vui lòng nhập họ và tên', 'warning');
      return;
    }

    if (!isEdit) {
      if (!formData.username.trim()) {
        showToast('Vui lòng nhập tên đăng nhập', 'warning');
        return;
      }
      if (formData.username.trim().length < 3) {
        showToast('Tên đăng nhập phải có ít nhất 3 ký tự', 'warning');
        return;
      }
      if (!formData.password) {
        showToast('Vui lòng nhập mật khẩu khởi tạo', 'warning');
        return;
      }
      if (formData.password.length < 6) {
        showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim() || null,
        role: formData.role,
        isActive: formData.isActive,
        permissions: Array.from(selectedPermissions),
      };

      if (!isEdit) {
        payload.username = formData.username.trim();
        payload.password = formData.password;
        await systemApi.createUser(payload);
        showToast('Tạo tài khoản người dùng thành công!', 'success');
      } else {
        await systemApi.updateUser(editingUser.id, payload);
        showToast('Cập nhật tài khoản và phân quyền thành công!', 'success');
      }

      onSuccess();
      onClose();
    } catch (err) {
      const errMsg = err.userMessage || err.message || (isEdit ? 'Lỗi cập nhật người dùng' : 'Lỗi tạo người dùng');
      showToast(errMsg, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPermsCount = availablePermissions ? availablePermissions.length : 0;
  const selectedCount = selectedPermissions.size;

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          {/* HEADER */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <div 
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.1)' }}
              >
                {isEdit ? <Shield size={20} className="text-warning" /> : <UserIcon size={20} className="text-info" />}
              </div>
              <div>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}>
                  {isEdit ? `Chỉnh sửa: ${editingUser.fullName || editingUser.username}` : 'Thêm tài khoản người dùng mới'}
                </h5>
                <p className="text-white-50 m-0" style={{ fontSize: '0.8rem' }}>
                  {isEdit ? 'Cập nhật thông tin cá nhân và thiết lập quyền hạn tùy chỉnh' : 'Tạo thông tin đăng nhập và gán quyền thao tác theo module'}
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

          {/* TABS SELECTOR */}
          <div className="bg-light px-4 pt-2 border-bottom d-flex gap-2">
            <button
              type="button"
              className={`btn btn-sm py-2 px-3 fw-semibold border-0 rounded-bottom-0 rounded-top ${activeTab === 'info' ? 'btn-white bg-white text-primary border-top border-primary border-3' : 'text-secondary'}`}
              onClick={() => setActiveTab('info')}
            >
              <UserIcon size={16} className="me-1 d-inline" />
              1. Thông tin tài khoản
            </button>
            <button
              type="button"
              className={`btn btn-sm py-2 px-3 fw-semibold border-0 rounded-bottom-0 rounded-top ${activeTab === 'permissions' ? 'btn-white bg-white text-primary border-top border-primary border-3' : 'text-secondary'}`}
              onClick={() => setActiveTab('permissions')}
            >
              <Shield size={16} className="me-1 d-inline" />
              2. Phân quyền tùy chỉnh
              <span className={`badge rounded-pill ms-2 ${selectedCount === totalPermsCount ? 'bg-success' : selectedCount > 0 ? 'bg-primary' : 'bg-secondary'}`}>
                {selectedCount}/{totalPermsCount}
              </span>
            </button>
          </div>

          {/* BODY */}
          <div className="modal-body p-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
            
            {/* TAB 1: THÔNG TIN TÀI KHOẢN */}
            {activeTab === 'info' && (
              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="p-3 border rounded-3 bg-white h-100">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <UserIcon size={18} className="text-primary" />
                      Thông tin định danh
                    </h6>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Tên đăng nhập <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="VD: nv_kho01"
                        value={formData.username}
                        disabled={isEdit}
                        onChange={e => handleInputChange('username', e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      />
                      {isEdit && (
                        <div className="form-text small text-muted">
                          Tên đăng nhập là cố định và không thể thay đổi sau khi tạo.
                        </div>
                      )}
                    </div>

                    {!isEdit && (
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">
                          Mật khẩu khởi tạo <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light"><Lock size={16} /></span>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Tối thiểu 6 ký tự"
                            value={formData.password}
                            onChange={e => handleInputChange('password', e.target.value)}
                          />
                        </div>
                        <div className="form-text small text-muted">
                          Người dùng có thể đổi lại mật khẩu này sau khi đăng nhập.
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Họ và tên nhân viên <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="VD: Nguyễn Văn A"
                        value={formData.fullName}
                        onChange={e => handleInputChange('fullName', e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Địa chỉ Email
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><Mail size={16} /></span>
                        <input 
                          type="email" 
                          className="form-control" 
                          placeholder="VD: nva@qkshop.vn"
                          value={formData.email}
                          onChange={e => handleInputChange('email', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="p-3 border rounded-3 bg-white h-100">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <Shield size={18} className="text-success" />
                      Vai trò & Trạng thái hoạt động
                    </h6>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Vai trò hệ thống <span className="text-danger">*</span>
                      </label>
                      <select 
                        className="form-select"
                        value={formData.role}
                        disabled={isEdit && editingUser?.username === 'admin'}
                        onChange={e => handleInputChange('role', e.target.value)}
                      >
                        <option value="ADMIN">ADMIN - Quản trị viên (Toàn quyền hệ thống)</option>
                        <option value="MANAGER">MANAGER - Quản lý (Điều hành, Kho & Bán hàng)</option>
                        <option value="STAFF">STAFF - Nhân viên (Bán hàng, Kiểm tra & Tra cứu)</option>
                      </select>
                      <div className="form-text small text-muted mt-2">
                        {formData.role === 'ADMIN' && '👑 Quản trị viên: Có toàn bộ quyền hạn, cấu hình hệ thống và quản lý tài khoản.'}
                        {formData.role === 'MANAGER' && '⭐ Quản lý: Có quyền quản lý kho, nhập/xuất, đối soát và báo cáo phân tích.'}
                        {formData.role === 'STAFF' && '👤 Nhân viên: Tập trung thao tác bán hàng, kiểm định và tra cứu thông tin.'}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label small fw-semibold text-secondary">
                        Trạng thái tài khoản
                      </label>
                      <div className="form-check form-switch p-0 d-flex align-items-center gap-3">
                        <input 
                          className="form-check-input ms-0" 
                          type="checkbox" 
                          role="switch" 
                          id="statusSwitch"
                          checked={formData.isActive}
                          disabled={isEdit && editingUser?.username === 'admin'}
                          onChange={e => handleInputChange('isActive', e.target.checked)}
                          style={{ width: '40px', height: '22px', cursor: 'pointer' }}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="statusSwitch" style={{ cursor: 'pointer' }}>
                          {formData.isActive ? (
                            <span className="text-success">Đang kích hoạt (Cho phép đăng nhập)</span>
                          ) : (
                            <span className="text-danger">Đã khóa (Chặn đăng nhập)</span>
                          )}
                        </label>
                      </div>
                      {isEdit && editingUser?.username === 'admin' && (
                        <div className="form-text small text-warning mt-1">
                          <AlertTriangle size={14} className="me-1 d-inline" />
                          Không thể khóa hoặc hạ quyền tài khoản admin gốc.
                        </div>
                      )}
                    </div>

                    <div className="alert alert-info border-0 rounded-3 p-3">
                      <div className="d-flex align-items-start gap-2">
                        <Info size={18} className="text-info flex-shrink-0 mt-1" />
                        <div className="small">
                          <strong>Gợi ý:</strong> Bạn có thể chuyển sang tab <strong>"2. Phân quyền tùy chỉnh"</strong> để bật/tắt chính xác các quyền thao tác cho tài khoản này theo từng nghiệp vụ riêng biệt.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PHÂN QUYỀN TÙY CHỈNH */}
            {activeTab === 'permissions' && (
              <div>
                {/* TOOLBAR */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-light p-3 rounded-3 mb-4 border">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-dark small">Thao tác nhanh:</span>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary"
                      onClick={selectAllPermissions}
                    >
                      <CheckSquare size={14} className="me-1 d-inline" />
                      Chọn tất cả ({totalPermsCount})
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={deselectAllPermissions}
                    >
                      <Square size={14} className="me-1 d-inline" />
                      Bỏ chọn hết
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-info"
                      onClick={applyRolePreset}
                    >
                      <RefreshCw size={14} className="me-1 d-inline" />
                      Theo vai trò ({formData.role})
                    </button>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-secondary">Đã cấp:</span>
                    <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill">
                      {selectedCount} / {totalPermsCount} quyền
                    </span>
                  </div>
                </div>

                {/* DANH SÁCH CÁC NHÓM QUYỀN */}
                <div className="row g-4">
                  {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                    const allInGroupSelected = perms.every(p => selectedPermissions.has(p.code));
                    const someInGroupSelected = perms.some(p => selectedPermissions.has(p.code));

                    return (
                      <div className="col-lg-6" key={groupName}>
                        <div className="border rounded-3 h-100 bg-white shadow-sm overflow-hidden">
                          {/* TIÊU ĐỀ NHÓM */}
                          <div className="d-flex justify-content-between align-items-center bg-light px-3 py-2 border-bottom">
                            <div className="d-flex align-items-center gap-2">
                              <Layers size={16} className="text-primary" />
                              <span className="fw-bold text-dark text-uppercase small">{groupName}</span>
                              <span className="badge bg-secondary-subtle text-secondary rounded-pill small">
                                {perms.filter(p => selectedPermissions.has(p.code)).length}/{perms.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-decoration-none p-0 small fw-semibold"
                              onClick={() => toggleGroup(groupName)}
                            >
                              {allInGroupSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                            </button>
                          </div>

                          {/* DANH SÁCH QUYỀN TRONG NHÓM */}
                          <div className="p-2">
                            {perms.map(p => {
                              const isChecked = selectedPermissions.has(p.code);
                              return (
                                <div 
                                  key={p.code} 
                                  className={`p-2 rounded-2 mb-1 transition-all d-flex align-items-start gap-3 ${isChecked ? 'bg-primary-subtle' : 'hover-bg-light'}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => togglePermission(p.code)}
                                >
                                  <div className="pt-1">
                                    <input 
                                      type="checkbox" 
                                      className="form-check-input" 
                                      checked={isChecked}
                                      onChange={() => {}} // handled by parent onClick
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </div>
                                  <div className="flex-grow-1">
                                    <div className="d-flex align-items-center gap-2">
                                      <span className={`fw-semibold small ${isChecked ? 'text-primary' : 'text-dark'}`}>
                                        {p.name}
                                      </span>
                                      <code className="text-secondary" style={{ fontSize: '0.7rem' }}>
                                        {p.code}
                                      </code>
                                    </div>
                                    <div className="small text-muted" style={{ fontSize: '0.78rem' }}>
                                      {p.description}
                                    </div>
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
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-between">
            <div className="d-flex gap-2">
              {activeTab === 'info' ? (
                <button 
                  type="button" 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setActiveTab('permissions')}
                >
                  Tiếp theo: Thiết lập phân quyền &rarr;
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setActiveTab('info')}
                >
                  &larr; Quay lại thông tin
                </button>
              )}
            </div>

            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose} 
                disabled={submitting}
              >
                Hủy
              </button>
              <button 
                type="button" 
                className="btn btn-primary px-4 fw-bold shadow-sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check size={18} className="me-1 d-inline" />
                    {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
