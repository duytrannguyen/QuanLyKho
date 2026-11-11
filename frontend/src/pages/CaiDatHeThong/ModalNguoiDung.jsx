import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Shield, User as UserIcon, Lock, Mail, CheckSquare, 
  Square, RefreshCw, Info, AlertTriangle, Layers, Search, Eye, Zap, Layout, AlertCircle
} from 'lucide-react';
import { systemApi } from '../../api';
import { 
  ROUTE_PERMISSION_MAP, 
  PERMISSION_LABELS, 
  PERMISSION_DEPENDENCIES, 
  CRITICAL_PERMISSIONS 
} from '../../contexts/NguCanhXacThuc';

// Định nghĩa preset quyền mặc định cho từng vai trò hệ thống
const ROLE_PRESETS = {
  ADMIN: [
    'DASHBOARD_VIEW', 'SALES_REPORT_VIEW', 'ANALYTICS_VIEW',
    'SALE_MACHINE', 'SALE_ACCESSORY', 'SHIP_MANAGE', 'ORDER_EDIT', 'ORDER_RETURN', 'PRICING_VIEW', 'PRICING_MANAGE',
    'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES', 'IMPORT_MACHINE', 'MACHINE_UPDATE', 'MACHINE_EXPORT_OTHER', 'MACHINE_DELETE', 'INSPECTION',
    'IMPORT_ACCESSORY', 'INVENTORY_ACCESSORY', 'ACCESSORY_MANAGE', 'ACCESSORY_HISTORY', 'IMPORT_PART', 'INVENTORY_PART', 'PART_MANAGE',
    'WARRANTY_CHECK', 'SERVICE_REPAIR', 'SERVICE_VIEW', 'CRM_VIEW', 'CRM_CARE', 'CRM_MANAGE',
    'SYNC_VIEW', 'SYNC_MANAGE', 'LOGS_VIEW', 'EXPORT_DATA', 'USER_MANAGE', 'SYSTEM_MANAGE'
  ],
  MANAGER: [
    'DASHBOARD_VIEW', 'SALES_REPORT_VIEW', 'ANALYTICS_VIEW',
    'SALE_MACHINE', 'SALE_ACCESSORY', 'SHIP_MANAGE', 'ORDER_EDIT', 'ORDER_RETURN', 'PRICING_VIEW', 'PRICING_MANAGE',
    'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES', 'IMPORT_MACHINE', 'MACHINE_UPDATE', 'MACHINE_EXPORT_OTHER', 'INSPECTION',
    'IMPORT_ACCESSORY', 'INVENTORY_ACCESSORY', 'ACCESSORY_MANAGE', 'ACCESSORY_HISTORY', 'IMPORT_PART', 'INVENTORY_PART', 'PART_MANAGE',
    'WARRANTY_CHECK', 'SERVICE_REPAIR', 'SERVICE_VIEW', 'CRM_VIEW', 'CRM_CARE', 'CRM_MANAGE',
    'SYNC_VIEW', 'SYNC_MANAGE', 'LOGS_VIEW', 'EXPORT_DATA', 'USER_MANAGE'
  ],
  STAFF: [
    'DASHBOARD_VIEW', 'SALES_REPORT_VIEW',
    'SALE_MACHINE', 'SALE_ACCESSORY', 'SHIP_MANAGE', 'PRICING_VIEW',
    'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES', 'INVENTORY_ACCESSORY', 'ACCESSORY_HISTORY', 'INVENTORY_PART', 'INSPECTION',
    'WARRANTY_CHECK', 'SERVICE_REPAIR', 'SERVICE_VIEW', 'CRM_VIEW', 'CRM_CARE', 'SYNC_VIEW'
  ]
};

// Mẫu phân quyền nhanh theo vị trí công việc thực tế tại cửa hàng
const JOB_TEMPLATES = [
  {
    id: 'STORE_MANAGER',
    label: 'Cửa hàng trưởng / Quản lý',
    desc: 'Điều hành toàn bộ hoạt động kho bãi, bán hàng, sửa chữa, CRM & đối soát (trừ bảo trì máy chủ & xóa vĩnh viễn serial)',
    badgeColor: 'bg-primary',
    permissions: [
      'DASHBOARD_VIEW', 'SALES_REPORT_VIEW', 'ANALYTICS_VIEW',
      'SALE_MACHINE', 'SALE_ACCESSORY', 'SHIP_MANAGE', 'ORDER_EDIT', 'ORDER_RETURN', 'PRICING_VIEW', 'PRICING_MANAGE',
      'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES', 'IMPORT_MACHINE', 'MACHINE_UPDATE', 'MACHINE_EXPORT_OTHER', 'INSPECTION',
      'IMPORT_ACCESSORY', 'INVENTORY_ACCESSORY', 'ACCESSORY_MANAGE', 'ACCESSORY_HISTORY',
      'IMPORT_PART', 'INVENTORY_PART', 'PART_MANAGE',
      'WARRANTY_CHECK', 'SERVICE_REPAIR', 'SERVICE_VIEW',
      'CRM_VIEW', 'CRM_CARE', 'CRM_MANAGE',
      'SYNC_VIEW', 'SYNC_MANAGE', 'LOGS_VIEW', 'EXPORT_DATA'
    ]
  },
  {
    id: 'POS_SALES',
    label: 'Bán hàng & Thu ngân (POS)',
    desc: 'Bán máy, bán phụ kiện, theo dõi đơn ship, xem bảng giá, tra cứu tồn kho, bảo hành & CSKH',
    badgeColor: 'bg-success',
    permissions: [
      'DASHBOARD_VIEW', 'SALE_MACHINE', 'SALE_ACCESSORY', 'SHIP_MANAGE',
      'PRICING_VIEW', 'SEARCH_INVENTORY', 'INVENTORY_ACCESSORY', 'ACCESSORY_HISTORY',
      'WARRANTY_CHECK', 'CRM_VIEW', 'CRM_CARE'
    ]
  },
  {
    id: 'WAREHOUSE_KEEPER',
    label: 'Thủ kho & Nhập hàng',
    desc: 'Nhập kho máy/phụ kiện/linh kiện, sửa giá bán & bảo hành tồn kho, xuất khác, quản lý mã máy',
    badgeColor: 'bg-warning text-dark',
    permissions: [
      'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES', 'IMPORT_MACHINE', 'MACHINE_UPDATE', 'MACHINE_EXPORT_OTHER',
      'IMPORT_ACCESSORY', 'INVENTORY_ACCESSORY', 'ACCESSORY_MANAGE',
      'IMPORT_PART', 'INVENTORY_PART', 'PART_MANAGE', 'PRICING_VIEW', 'PRICING_MANAGE'
    ]
  },
  {
    id: 'TECHNICIAN',
    label: 'Kỹ thuật viên & Sửa chữa',
    desc: 'Kiểm định chất lượng máy, tiếp nhận & xử lý phiếu sửa chữa, tra cứu tồn kho máy & linh kiện thay thế',
    badgeColor: 'bg-info text-dark',
    permissions: [
      'SEARCH_INVENTORY', 'INSPECTION', 'INVENTORY_PART',
      'WARRANTY_CHECK', 'SERVICE_REPAIR', 'SERVICE_VIEW'
    ]
  },
  {
    id: 'CSKH_WARRANTY',
    label: 'CSKH & Tiếp nhận bảo hành',
    desc: 'Tra cứu lịch sử bảo hành, theo dõi tiến độ sửa chữa, chăm sóc khách hàng & khai thác máy hết hạn bảo hành',
    badgeColor: 'bg-secondary',
    permissions: [
      'WARRANTY_CHECK', 'SERVICE_VIEW', 'SHIP_MANAGE',
      'CRM_VIEW', 'CRM_CARE', 'CRM_MANAGE'
    ]
  },
  {
    id: 'ACCOUNTANT_SYNC',
    label: 'Kế toán & Đối soát số liệu',
    desc: 'Xem báo cáo doanh số, thống kê, sửa/hoàn đơn, đối soát Google Sheets & xuất Excel dữ liệu',
    badgeColor: 'bg-dark',
    permissions: [
      'DASHBOARD_VIEW', 'SALES_REPORT_VIEW', 'ANALYTICS_VIEW',
      'SHIP_MANAGE', 'ORDER_EDIT', 'ORDER_RETURN',
      'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES', 'ACCESSORY_HISTORY',
      'CRM_VIEW', 'SYNC_VIEW', 'SYNC_MANAGE', 'LOGS_VIEW', 'EXPORT_DATA'
    ]
  },
  {
    id: 'READ_ONLY',
    label: 'Chỉ xem & Tra cứu (Không thao tác)',
    desc: 'Chỉ được xem các màn hình tra cứu, báo cáo, tồn kho; không được thêm/sửa/xóa hay xuất bán',
    badgeColor: 'bg-light text-dark border',
    permissions: [
      'DASHBOARD_VIEW', 'SALES_REPORT_VIEW', 'ANALYTICS_VIEW',
      'PRICING_VIEW', 'SEARCH_INVENTORY', 'MANAGE_MACHINE_CODES',
      'INVENTORY_ACCESSORY', 'ACCESSORY_HISTORY', 'INVENTORY_PART',
      'WARRANTY_CHECK', 'SERVICE_VIEW', 'CRM_VIEW', 'SYNC_VIEW'
    ]
  }
];

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
  const [permSearchTerm, setPermSearchTerm] = useState('');
  const [permTypeFilter, setPermTypeFilter] = useState('ALL'); // 'ALL', 'VIEW', 'ACTION', 'SELECTED', 'UNSELECTED'
  const [showUiPreview, setShowUiPreview] = useState(true);

  const isAdminRoot = isEdit && editingUser?.username === 'admin';

  // Lọc và nhóm các quyền theo Group + Type + Search
  const groupedPermissions = useMemo(() => {
    const q = (permSearchTerm || '').trim().toLowerCase();
    const filtered = (availablePermissions || []).filter(p => {
      const isCritical = Boolean(p.critical || CRITICAL_PERMISSIONS.has(p.code));
      if (permTypeFilter === 'VIEW' && p.type !== 'VIEW') return false;
      if (permTypeFilter === 'ACTION' && p.type !== 'ACTION') return false;
      if (permTypeFilter === 'CRITICAL' && !isCritical) return false;
      if (permTypeFilter === 'SELECTED' && !selectedPermissions.has(p.code)) return false;
      if (permTypeFilter === 'UNSELECTED' && selectedPermissions.has(p.code)) return false;

      if (!q) return true;
      return (p.name && p.name.toLowerCase().includes(q)) ||
             (p.code && p.code.toLowerCase().includes(q)) ||
             (p.group && p.group.toLowerCase().includes(q)) ||
             (p.module && p.module.toLowerCase().includes(q)) ||
             (p.description && p.description.toLowerCase().includes(q));
    });

    const groups = {};
    filtered.forEach(perm => {
      const gName = perm.group || 'Khác';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(perm);
    });
    return groups;
  }, [availablePermissions, permSearchTerm, permTypeFilter, selectedPermissions]);

  // Tính toán danh sách menu giao diện sẽ hiển thị cho tài khoản này dựa trên quyền đã chọn
  const previewVisibleMenus = useMemo(() => {
    return ROUTE_PERMISSION_MAP.filter(route => {
      const codes = String(route.permission).split('|').map(s => s.trim()).filter(Boolean);
      return codes.some(c => selectedPermissions.has(c));
    });
  }, [selectedPermissions]);

  const previewActionPerms = useMemo(() => {
    return (availablePermissions || []).filter(p => p.type === 'ACTION' && selectedPermissions.has(p.code));
  }, [availablePermissions, selectedPermissions]);

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

      if (editingUser.role === 'ADMIN') {
        const allCodes = (availablePermissions || []).map(p => p.code);
        setSelectedPermissions(new Set(allCodes));
      } else if (editingUser.permissions && Array.isArray(editingUser.permissions)) {
        setSelectedPermissions(new Set(editingUser.permissions));
      } else {
        setSelectedPermissions(new Set(ROLE_PRESETS[editingUser.role] || []));
      }
    } else {
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
    setPermSearchTerm('');
    setPermTypeFilter('ALL');
    setActiveTab('info');
  }, [show, editingUser, availablePermissions]);

  if (!show) return null;

  // Xử lý thay đổi input cơ bản
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'role') {
      if (value === 'ADMIN') {
        const allCodes = (availablePermissions || []).map(p => p.code);
        setSelectedPermissions(new Set(allCodes));
      } else if (!isEdit) {
        const preset = ROLE_PRESETS[value] || [];
        setSelectedPermissions(new Set(preset));
      }
    }
  };

  // Toggle một quyền đơn lẻ với cơ chế phụ thuộc thông minh
  const togglePermission = (code) => {
    if (isAdminRoot) {
      showToast('Tài khoản admin gốc mặc định luôn giữ toàn bộ quyền hạn hệ thống.', 'warning');
      return;
    }
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        // HỦY QUYỀN
        next.delete(code);

        // Nếu hủy một quyền VIEW mà có các quyền ACTION phụ thuộc, tự động hủy luôn các ACTION con
        const affectedActions = [];
        Object.entries(PERMISSION_DEPENDENCIES).forEach(([actionCode, deps]) => {
          if (deps.includes(code) && next.has(actionCode)) {
            next.delete(actionCode);
            affectedActions.push(PERMISSION_LABELS[actionCode] || actionCode);
          }
        });
        if (affectedActions.length > 0) {
          showToast(`Đã tự động tắt các thao tác phụ thuộc: ${affectedActions.join(', ')} do bạn vừa bỏ quyền xem màn hình.`, 'info');
        }

        if (formData.role === 'ADMIN') {
          setFormData(f => ({ ...f, role: 'MANAGER' }));
          showToast('Đã tự động chuyển vai trò từ ADMIN sang MANAGER để lưu bộ quyền tùy chỉnh riêng.', 'info');
        }
      } else {
        // CẤP QUYỀN
        next.add(code);

        // Nếu cấp quyền ACTION mà thiếu quyền VIEW phụ thuộc, tự động bổ sung quyền VIEW
        const deps = PERMISSION_DEPENDENCIES[code] || [];
        const addedDeps = [];
        deps.forEach(depCode => {
          if (!next.has(depCode)) {
            next.add(depCode);
            addedDeps.push(PERMISSION_LABELS[depCode] || depCode);
          }
        });
        if (addedDeps.length > 0) {
          showToast(`Đã tự động bổ sung quyền xem: [${addedDeps.join(', ')}] để tài khoản có thể truy cập màn hình thao tác.`, 'info');
        }

        // Cảnh báo nếu cấp quyền rủi ro cao
        if (CRITICAL_PERMISSIONS.has(code)) {
          showToast(`Lưu ý: "${PERMISSION_LABELS[code] || code}" là quyền rủi ro cao / nhạy cảm, hãy cân nhắc kỹ đối tượng cấp.`, 'warning');
        }
      }
      return next;
    });
  };

  // Bật toàn bộ quyền trong một nhóm
  const selectAllInGroup = (groupName) => {
    if (isAdminRoot) {
      showToast('Tài khoản admin gốc mặc định luôn giữ toàn bộ quyền hạn hệ thống.', 'warning');
      return;
    }
    const permsInGroup = groupedPermissions[groupName] || [];
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      permsInGroup.forEach(p => next.add(p.code));
      return next;
    });
    showToast(`Đã chọn toàn bộ quyền nhóm "${groupName}"`, 'info');
  };

  // Chỉ bật các quyền VIEW (Xem) trong nhóm
  const selectOnlyViewInGroup = (groupName) => {
    if (isAdminRoot) return;
    const permsInGroup = groupedPermissions[groupName] || [];
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      permsInGroup.forEach(p => {
        if (p.type === 'VIEW') {
          next.add(p.code);
        } else {
          next.delete(p.code);
        }
      });
      return next;
    });
    showToast(`Đã chuyển nhóm "${groupName}" sang chế độ CHỈ XEM (Read-only)`, 'info');
  };

  // Tắt tất cả quyền trong nhóm
  const deselectAllInGroup = (groupName) => {
    if (isAdminRoot) {
      showToast('Tài khoản admin gốc mặc định luôn giữ toàn bộ quyền hạn hệ thống.', 'warning');
      return;
    }
    const permsInGroup = groupedPermissions[groupName] || [];
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      permsInGroup.forEach(p => next.delete(p.code));
      if (formData.role === 'ADMIN') {
        setFormData(f => ({ ...f, role: 'MANAGER' }));
      }
      return next;
    });
    showToast(`Đã bỏ chọn toàn bộ quyền nhóm "${groupName}"`, 'info');
  };

  // Thao tác nhanh toàn cục
  const selectAllPermissions = () => {
    const all = (availablePermissions || []).map(p => p.code);
    setSelectedPermissions(new Set(all));
  };

  const deselectAllPermissions = () => {
    if (isAdminRoot) {
      showToast('Không thể bỏ quyền của tài khoản admin gốc.', 'warning');
      return;
    }
    if (formData.role === 'ADMIN') {
      setFormData(f => ({ ...f, role: 'STAFF' }));
    }
    setSelectedPermissions(new Set());
  };

  const applyRolePreset = () => {
    const preset = ROLE_PRESETS[formData.role] || [];
    setSelectedPermissions(new Set(preset));
    showToast(`Đã áp dụng ${preset.length} quyền chuẩn của vai trò ${formData.role}`, 'info');
  };

  const applyJobTemplate = (tpl) => {
    if (isAdminRoot) {
      showToast('Không thể thay đổi bộ quyền của tài khoản admin gốc.', 'warning');
      return;
    }
    if (formData.role === 'ADMIN') {
      setFormData(f => ({ ...f, role: 'STAFF' }));
    }
    setSelectedPermissions(new Set(tpl.permissions));
    showToast(`Đã áp dụng mẫu vị trí "${tpl.label}" (${tpl.permissions.length} quyền). Bạn có thể tích chọn thêm hoặc bớt tùy ý.`, 'info');
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
                {/* MẪU PHÂN QUYỀN THEO VỊ TRÍ CÔNG VIỆC */}
                <div className="bg-white p-3 rounded-3 mb-3 border shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-dark small d-flex align-items-center gap-1">
                      <Zap size={15} className="text-warning" />
                      Gán nhanh theo vị trí công việc (Sau đó có thể tích thêm/bớt từng chức năng &amp; thao tác):
                    </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none small"
                      onClick={() => setShowUiPreview(prev => !prev)}
                    >
                      <Layout size={14} className="me-1 d-inline" />
                      {showUiPreview ? 'Ẩn xem trước giao diện' : 'Xem trước giao diện tài khoản'}
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {JOB_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        className="btn btn-sm btn-outline-dark rounded-pill px-3"
                        title={tpl.desc}
                        onClick={() => applyJobTemplate(tpl)}
                      >
                        {tpl.label} <span className="badge bg-secondary-subtle text-secondary ms-1">{tpl.permissions.length}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* XEM TRƯỚC GIAO DIỆN NGƯỜI DÙNG CỦA TÀI KHOẢN NÀY */}
                {showUiPreview && (
                  <div className="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 p-3 mb-3">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <div className="fw-bold text-primary small d-flex align-items-center gap-2">
                        <Eye size={16} />
                        <span>Xem trước Giao diện &amp; Quyền hạn thực tế của tài khoản ({formData.username || 'mới'}):</span>
                      </div>
                      <span className="small text-secondary">
                        Trang mặc định khi đăng nhập:{' '}
                        <strong className="text-dark">
                          {previewVisibleMenus.length > 0
                            ? `${previewVisibleMenus[0].label} (${previewVisibleMenus[0].path})`
                            : 'Chưa có trang nào (Sẽ báo thiếu quyền)'}
                        </strong>
                      </span>
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="bg-white rounded-2 p-2 border h-100">
                          <div className="small fw-semibold text-secondary mb-1">
                            Menu Thanh bên (Sidebar) sẽ hiển thị ({previewVisibleMenus.length}/{ROUTE_PERMISSION_MAP.length} trang):
                          </div>
                          {previewVisibleMenus.length === 0 ? (
                            <div className="small text-danger fst-italic">Không có menu nào được hiển thị.</div>
                          ) : (
                            <div className="d-flex flex-wrap gap-1">
                              {previewVisibleMenus.map(m => (
                                <span key={m.path} className="badge bg-primary-subtle text-primary border border-primary-subtle fw-medium">
                                  {m.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="bg-white rounded-2 p-2 border h-100">
                          <div className="small fw-semibold text-secondary mb-1">
                            Các thao tác nghiệp vụ cụ thể được phép ({previewActionPerms.length} thao tác):
                          </div>
                          {previewActionPerms.length === 0 ? (
                            <div className="small text-muted fst-italic">Tài khoản chỉ được xem dữ liệu (Read-only), các nút Thêm/Sửa/Xóa/Xuất sẽ khóa.</div>
                          ) : (
                            <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '72px', overflowY: 'auto' }}>
                              {previewActionPerms.map(a => (
                                <span key={a.code} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-medium">
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TOOLBAR */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-light p-3 rounded-3 mb-3 border">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
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

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className={`btn ${permTypeFilter === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setPermTypeFilter('ALL')}
                      >
                        Tất cả ({totalPermsCount})
                      </button>
                      <button
                        type="button"
                        className={`btn ${permTypeFilter === 'VIEW' ? 'btn-info text-white' : 'btn-outline-secondary'}`}
                        onClick={() => setPermTypeFilter('VIEW')}
                      >
                        Chức năng / Xem ({(availablePermissions || []).filter(p => p.type === 'VIEW').length})
                      </button>
                      <button
                        type="button"
                        className={`btn ${permTypeFilter === 'ACTION' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setPermTypeFilter('ACTION')}
                      >
                        Thao tác ({(availablePermissions || []).filter(p => p.type === 'ACTION').length})
                      </button>
                      <button
                        type="button"
                        className={`btn ${permTypeFilter === 'CRITICAL' ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setPermTypeFilter('CRITICAL')}
                        title="Các quyền nhạy cảm ảnh hưởng trực tiếp tới dữ liệu gốc"
                      >
                        ⚠️ Rủi ro cao ({(availablePermissions || []).filter(p => p.critical || CRITICAL_PERMISSIONS.has(p.code)).length})
                      </button>
                      <button
                        type="button"
                        className={`btn ${permTypeFilter === 'SELECTED' ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => setPermTypeFilter('SELECTED')}
                      >
                        Đã cấp ({selectedCount})
                      </button>
                    </div>

                    <div className="input-group input-group-sm" style={{ width: '210px' }}>
                      <span className="input-group-text bg-white"><Search size={14} /></span>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Tìm tên, mã, màn hình..." 
                        value={permSearchTerm}
                        onChange={e => setPermSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {Object.keys(groupedPermissions).length === 0 && (
                  <div className="text-center py-5 text-muted">
                    <Search size={32} className="opacity-50 mb-2" />
                    <div>Không tìm thấy quyền nào phù hợp với bộ lọc hiện tại</div>
                  </div>
                )}

                {/* DANH SÁCH CÁC NHÓM QUYỀN */}
                <div className="row g-4">
                  {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                    const grantedInGroup = perms.filter(p => selectedPermissions.has(p.code)).length;
                    const allInGroupSelected = perms.length > 0 && grantedInGroup === perms.length;

                    return (
                      <div className="col-lg-6" key={groupName}>
                        <div className="border rounded-3 h-100 bg-white shadow-sm overflow-hidden">
                          {/* TIÊU ĐỀ NHÓM & CÁC NÚT THAO TÁC NHANH NHÓM */}
                          <div className="d-flex flex-wrap justify-content-between align-items-center bg-light px-3 py-2 border-bottom gap-2">
                            <div className="d-flex align-items-center gap-2">
                              <Layers size={16} className="text-primary" />
                              <span className="fw-bold text-dark text-uppercase small">{groupName}</span>
                              <span className="badge bg-secondary-subtle text-secondary rounded-pill small">
                                {grantedInGroup}/{perms.length}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-1.5">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm px-2 py-0.5 fw-medium"
                                style={{ fontSize: '0.7rem' }}
                                title="Bật toàn bộ quyền trong nhóm này"
                                onClick={() => selectAllInGroup(groupName)}
                              >
                                Chọn hết
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-info btn-sm px-2 py-0.5 fw-medium text-dark"
                                style={{ fontSize: '0.7rem' }}
                                title="Chỉ bật các quyền xem màn hình, không bật thao tác thêm/sửa/xóa"
                                onClick={() => selectOnlyViewInGroup(groupName)}
                              >
                                Chỉ xem
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm px-2 py-0.5 fw-medium"
                                style={{ fontSize: '0.7rem' }}
                                title="Tắt toàn bộ quyền trong nhóm này"
                                onClick={() => deselectAllInGroup(groupName)}
                              >
                                Bỏ nhóm
                              </button>
                            </div>
                          </div>

                          {/* DANH SÁCH QUYỀN TRONG NHÓM */}
                          <div className="p-2">
                            {perms.map(p => {
                              const isChecked = selectedPermissions.has(p.code);
                              const isAction = p.type === 'ACTION';
                              const isCritical = Boolean(p.critical || CRITICAL_PERMISSIONS.has(p.code));
                              const deps = PERMISSION_DEPENDENCIES[p.code];

                              return (
                                <div 
                                  key={p.code} 
                                  className={`p-2 rounded-2 mb-1.5 transition-all d-flex align-items-start gap-2.5 border ${
                                    isChecked 
                                      ? isCritical
                                        ? 'bg-danger bg-opacity-10 border-danger border-opacity-25'
                                        : 'bg-primary-subtle border-primary-subtle'
                                      : 'hover-bg-light border-transparent'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => togglePermission(p.code)}
                                >
                                  <div className="pt-0.5">
                                    <input 
                                      type="checkbox" 
                                      className="form-check-input" 
                                      checked={isChecked}
                                      onChange={() => {}}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </div>
                                  <div className="flex-grow-1">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-0.5">
                                      <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                        <span className={`fw-semibold small ${
                                          isChecked 
                                            ? isCritical ? 'text-danger fw-bold' : 'text-primary' 
                                            : 'text-dark'
                                        }`}>
                                          {p.name}
                                        </span>
                                        <span
                                          className={`badge rounded-pill ${
                                            isAction
                                              ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                              : 'bg-info-subtle text-info-emphasis border border-info-subtle'
                                          }`}
                                          style={{ fontSize: '0.63rem' }}
                                        >
                                          {isAction ? 'Thao tác' : 'Chức năng (Xem)'}
                                        </span>
                                        {isCritical && (
                                          <span
                                            className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle"
                                            style={{ fontSize: '0.63rem' }}
                                            title="Quyền nhạy cảm / rủi ro cao"
                                          >
                                            ⚠️ Rủi ro cao
                                          </span>
                                        )}
                                      </div>
                                      <code className="text-secondary" style={{ fontSize: '0.68rem' }}>
                                        {p.code}
                                      </code>
                                    </div>
                                    <div className="small text-muted" style={{ fontSize: '0.77rem' }}>
                                      {p.description}
                                    </div>
                                    <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                      {p.module && (
                                        <span className="badge bg-light text-secondary border fw-normal" style={{ fontSize: '0.68rem' }}>
                                          📍 Vị trí: {p.module}
                                        </span>
                                      )}
                                      {deps && deps.length > 0 && (
                                        <span className="badge bg-light text-primary border border-primary-subtle fw-normal" style={{ fontSize: '0.68rem' }}>
                                          🔗 Cần có: {deps.map(d => PERMISSION_LABELS[d] || d).join(', ')}
                                        </span>
                                      )}
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
