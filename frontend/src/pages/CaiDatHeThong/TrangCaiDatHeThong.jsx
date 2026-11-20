import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings, Users, Database, UserPlus, Edit3, KeyRound,
  Shield, Lock, Unlock, Trash2, Eye, Search, CheckCircle, XCircle, User,
  Sliders, Clock, Cpu, Save, X
} from 'lucide-react';
import { systemApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import ModalNguoiDung from './ModalNguoiDung';
import ModalDoiMatKhau from './ModalDoiMatKhau';
import ModalXemQuyen from './ModalXemQuyen';
import ModalCaiDatCaNhan from '../../components/layout/ModalCaiDatCaNhan';

export default function TrangCaiDatHeThong() {
  const { showToast } = useToast();
  const { user: currentUser, hasPermission, refreshUser, isSuperAdmin, isAdmin } = useAuth();

  const canManageSystem = isSuperAdmin || hasPermission('SYSTEM_MANAGE');
  const canManageUsers = isSuperAdmin || hasPermission('USER_MANAGE') || Boolean(currentUser);

  const [activeTab, setActiveTab] = useState(() => {
    return canManageSystem ? 'general' : 'users';
  });
  const [users, setUsers] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);

  // Bộ lọc danh sách người dùng
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  // State quản lý Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [viewPermUser, setViewPermUser] = useState(null);
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [personalModalTab, setPersonalModalTab] = useState('profile');

  // Tải danh sách người dùng
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await systemApi.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      showToast('Lỗi tải danh sách người dùng: ' + (err.userMessage || err.message), 'danger');
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  // Tải danh sách quyền hệ thống
  const loadPermissions = useCallback(async () => {
    try {
      const res = await systemApi.getPermissions();
      setAvailablePermissions(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách quyền:', err);
    }
  }, []);

  useEffect(() => {
    setPage(0);
  }, [activeTab, pageSize, searchTerm, roleFilter]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
      if (availablePermissions.length === 0) {
        loadPermissions();
      }
    } else if (activeTab === 'general' || activeTab === 'datasale') {
      systemApi.getConfig().then(res => setConfig(res.data || {})).catch(console.error);
    }
  }, [activeTab, loadUsers, loadPermissions, availablePermissions.length]);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async (keys) => {
    setSaving(true);
    try {
      await Promise.all(
        keys
          .filter(key => config[key] !== undefined)
          .map(key => systemApi.updateConfig(key, config[key]))
      );
      showToast('Đã lưu cấu hình thành công!', 'success');
    } catch (err) {
      showToast('Lỗi lưu cấu hình: ' + (err.userMessage || err.message || 'Lỗi không xác định'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Khóa / Mở khóa người dùng
  const handleToggleStatus = async (user) => {
    if (user.username === 'admin') {
      showToast('Không thể khóa tài khoản quản trị viên chính', 'warning');
      return;
    }
    const isLocking = user.isActive !== false;
    const actionText = isLocking ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản "${user.username}"?`)) {
      return;
    }

    try {
      await systemApi.toggleUserStatus(user.id);
      showToast(`Đã ${actionText} tài khoản thành công!`, 'success');
      loadUsers();
    } catch (err) {
      showToast('Lỗi: ' + (err.userMessage || err.message), 'danger');
    }
  };

  // Xóa người dùng
  const handleDeleteUser = async (user) => {
    if (user.username === 'admin') {
      showToast('Không thể xóa tài khoản quản trị viên chính', 'warning');
      return;
    }
    if (currentUser && user.username === currentUser.username) {
      showToast('Bạn không thể tự xóa tài khoản của chính mình', 'warning');
      return;
    }

    if (!window.confirm(`HÀNH ĐỘNG NGUY HIỂM: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.username}" (${user.fullName})?`)) {
      return;
    }

    try {
      await systemApi.deleteUser(user.id);
      showToast('Đã xóa tài khoản thành công!', 'success');
      loadUsers();
    } catch (err) {
      showToast('Lỗi xóa tài khoản: ' + (err.userMessage || err.message), 'danger');
    }
  };

  // Lọc người dùng
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !searchTerm ||
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const isRoot = u.username === 'admin' || u.role === 'SUPERADMIN';
      const actualRole = isRoot ? 'SUPERADMIN' : u.role;
      const matchRole = roleFilter === 'ALL' || actualRole === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="container-fluid p-0">
      {/* ================= HEADER & ĐIỀU HƯỚNG TAB ================= */}
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
            <Settings size={24} className="text-primary" />
            <span>Cài đặt hệ thống</span>
          </h3>
          <p className="text-secondary small m-0 mt-1">
            Quản lý cấu hình, người dùng & phân quyền tùy chỉnh chi tiết
          </p>
        </div>

        {/* Thanh chuyển Tab ngang */}
        <div className="bg-white p-1.5 rounded-3 shadow-sm border d-inline-flex gap-1">
          {canManageSystem && (
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 rounded-2 fw-semibold border-0 ${
                activeTab === 'general'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('general')}
            >
              <Sliders size={16} />
              <span>Cấu hình chung</span>
            </button>
          )}
          {canManageUsers && (
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 rounded-2 fw-semibold border-0 ${
                activeTab === 'users'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} />
              <span>Người dùng & Phân quyền</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: CẤU HÌNH CHUNG ================= */}
      {activeTab === 'general' && (
        <div className="row">
          <div className="col-12 col-xl-8">
            <div className="card shadow-sm border-0 overflow-hidden">
              <div className="card-header bg-white border-bottom px-4 py-3">
                <h5 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                  <Sliders size={18} className="text-primary" />
                  <span>Cấu hình chung</span>
                </h5>
              </div>

              <div className="card-body p-4">
                {/* Mục 1: Nhận diện cấu hình tự động */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 rounded-3 bg-light border mb-3">
                  <div className="d-flex align-items-start gap-3" style={{ maxWidth: '600px' }}>
                    <div className="p-2 rounded-3 bg-white border text-primary shadow-xs mt-0.5">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Nhận diện cấu hình tự động</h6>
                      <p className="small text-secondary m-0">
                        Bật để hệ thống tự động trích xuất thông tin RAM, SSD, CPU từ chuỗi model đầy đủ.
                      </p>
                    </div>
                  </div>

                  <div className="form-check form-switch m-0 ps-0 d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-3 border">
                    <input
                      className="form-check-input m-0"
                      type="checkbox"
                      role="switch"
                      id="autoRecog"
                      checked={config.auto_recognition === 'true'}
                      onChange={e => handleConfigChange('auto_recognition', e.target.checked ? 'true' : 'false')}
                      style={{ cursor: 'pointer', width: '2.5em', height: '1.25em' }}
                    />
                    <label
                      className="form-check-label small fw-medium text-dark ms-2"
                      htmlFor="autoRecog"
                      style={{ cursor: 'pointer' }}
                    >
                      Kích hoạt tính năng nhận diện
                    </label>
                  </div>
                </div>

                {/* Mục 2: Thời gian lưu trữ nhật ký */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 rounded-3 bg-light border">
                  <div className="d-flex align-items-start gap-3" style={{ maxWidth: '600px' }}>
                    <div className="p-2 rounded-3 bg-white border text-primary shadow-xs mt-0.5">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Thời gian lưu trữ nhật ký</h6>
                      <p className="small text-secondary m-0">
                        Số ngày giữ lại dữ liệu nhật ký hoạt động trên hệ thống (mặc định 90 ngày).
                      </p>
                    </div>
                  </div>

                  <div style={{ width: '160px' }}>
                    <input
                      type="number"
                      className="form-control fw-semibold text-center bg-white"
                      value={config.log_retention_days || 90}
                      onChange={e => handleConfigChange('log_retention_days', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="card-footer bg-light border-top px-4 py-3 d-flex justify-content-end">
                <button
                  className="btn btn-primary fw-medium d-flex align-items-center gap-2 px-4 shadow-sm"
                  disabled={saving}
                  onClick={() => handleSaveConfig(['auto_recognition', 'log_retention_days'])}
                >
                  <Save size={16} />
                  <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: NGƯỜI DÙNG & PHÂN QUYỀN ================= */}
      {activeTab === 'users' && (
        <div>
          {/* Banner thông báo dành cho tài khoản Admin thường */}
          {!isSuperAdmin && isAdmin && (
            <div className="alert alert-primary border-primary-subtle bg-primary-subtle bg-opacity-25 rounded-3 mb-3 d-flex align-items-start gap-3 shadow-xs">
              <Shield size={22} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="small flex-grow-1">
                <div className="fw-bold text-dark">Vai trò Quản trị viên (Admin thường):</div>
                <div className="text-secondary mt-0.5">
                  Bạn có quyền tạo tài khoản nhân viên, phân quyền hạn và đổi mật khẩu cho người dùng khác. 
                  Lưu ý: <strong>Quyền khóa/mở khóa và xóa tài khoản</strong> chỉ dành riêng cho tài khoản Quản trị tối cao (<strong>Superadmin</strong>).
                </div>
              </div>
            </div>
          )}

          {/* Banner thông báo dành cho tài khoản Nhân viên / Quản lý thông thường */}
          {!isSuperAdmin && !isAdmin && (
            <div className="alert alert-info border-info-subtle bg-info-subtle bg-opacity-25 rounded-3 mb-3 d-flex align-items-start gap-3 shadow-xs">
              <Shield size={22} className="text-info flex-shrink-0 mt-0.5" />
              <div className="small flex-grow-1">
                <div className="fw-bold text-dark">Chế độ xem & Cập nhật thông tin cá nhân:</div>
                <div className="text-secondary mt-0.5">
                  Bạn có thể xem danh sách đồng nghiệp, xem quyền hạn chi tiết và cập nhật thông tin cá nhân hoặc đổi mật khẩu của chính mình.
                </div>
              </div>
            </div>
          )}

          <div className="card shadow-sm border-0 overflow-hidden">
            {/* Card Header: Tiêu đề & Nút hành động chính */}
            <div className="card-header bg-white border-bottom p-3 p-md-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold text-dark m-0 d-flex align-items-center gap-2 flex-wrap">
                    <span>Quản lý người dùng & Phân quyền</span>
                    {isSuperAdmin && (
                      <span
                        className="badge bg-warning text-dark border border-warning shadow-xs rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.75rem' }}
                      >
                        👑 Superadmin
                      </span>
                    )}
                    {!isSuperAdmin && isAdmin && (
                      <span
                        className="badge bg-primary text-white shadow-xs rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.75rem' }}
                      >
                        ⭐ Admin
                      </span>
                    )}
                  </h5>
                  <p className="small text-secondary m-0 mt-1">
                    Quản lý tài khoản đăng nhập và cấp quyền hạn tùy chỉnh cho từng nhân viên
                  </p>
                </div>

                {isSuperAdmin || isAdmin ? (
                  <button
                    className="btn btn-primary fw-medium d-flex align-items-center gap-2 shadow-sm px-3 py-2"
                    onClick={() => {
                      setEditingUser(null);
                      setUserModalOpen(true);
                    }}
                  >
                    <UserPlus size={18} />
                    <span>Thêm người dùng mới</span>
                  </button>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5 fw-medium px-3 py-2"
                      onClick={() => {
                        setPersonalModalTab('profile');
                        setPersonalModalOpen(true);
                      }}
                    >
                      <User size={15} />
                      <span>Cập nhật thông tin của bạn</span>
                    </button>
                    <button
                      className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 fw-medium shadow-sm px-3 py-2"
                      onClick={() => {
                        setPersonalModalTab('password');
                        setPersonalModalOpen(true);
                      }}
                    >
                      <KeyRound size={15} />
                      <span>Đổi mật khẩu của bạn</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Thanh công cụ Lọc & Tìm kiếm */}
              <div className="row g-2 align-items-center bg-light p-2.5 rounded-3 border">
                <div className="col-12 col-md-5 col-lg-6">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0 text-secondary">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Tìm theo username, họ tên, email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="btn btn-white bg-white border border-start-0 text-secondary"
                        onClick={() => setSearchTerm('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="col-12 col-sm-7 col-md-4 col-lg-3">
                  <select
                    className="form-select form-select-sm fw-medium"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả vai trò</option>
                    <option value="SUPERADMIN">👑 SUPERADMIN (Quản trị tối cao)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="MANAGER">MANAGER (Quản lý)</option>
                    <option value="STAFF">STAFF (Nhân viên)</option>
                  </select>
                </div>

                <div className="col-12 col-sm-5 col-md-3 col-lg-3 text-sm-end d-flex align-items-center justify-content-sm-end">
                  <span className="small text-secondary fw-semibold bg-white px-3 py-1 rounded-2 border">
                    Tổng số: <strong className="text-dark">{filteredUsers.length}</strong> tài khoản
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng dữ liệu người dùng */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-secondary small text-uppercase">
                  <tr>
                    <th className="text-center py-3" style={{ width: '5%' }}>STT</th>
                    <th className="py-3" style={{ width: '16%' }}>Tài khoản</th>
                    <th className="py-3" style={{ width: '16%' }}>Họ và tên</th>
                    <th className="py-3" style={{ width: '18%' }}>Email</th>
                    <th className="py-3" style={{ width: '12%' }}>Vai trò</th>
                    <th className="py-3" style={{ width: '11%' }}>Phân quyền</th>
                    <th className="py-3 text-center" style={{ width: '10%' }}>Trạng thái</th>
                    <th className="py-3 text-end pe-4" style={{ width: '12%' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                        <span className="text-secondary small">Đang tải danh sách người dùng...</span>
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted small">
                        Không tìm thấy tài khoản người dùng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, index) => {
                      const isRootUser = u.username === 'admin' || u.role === 'SUPERADMIN';
                      const isCurrentUser = currentUser && u.username === currentUser.username;

                      let roleBadgeClass = 'bg-secondary text-white';
                      let roleDisplay = u.role;
                      if (isRootUser) {
                        roleBadgeClass = 'bg-warning text-dark border border-warning fw-bold shadow-xs';
                        roleDisplay = '👑 SUPERADMIN';
                      } else if (u.role === 'ADMIN') {
                        roleBadgeClass = 'bg-primary-subtle text-primary border border-primary-subtle fw-semibold';
                        roleDisplay = 'ADMIN';
                      } else if (u.role === 'MANAGER') {
                        roleBadgeClass = 'bg-info-subtle text-info-emphasis border border-info-subtle fw-semibold';
                        roleDisplay = 'MANAGER';
                      } else if (u.role === 'STAFF') {
                        roleBadgeClass = 'bg-success-subtle text-success border border-success-subtle fw-semibold';
                        roleDisplay = 'STAFF';
                      }

                      const hasAllPerms = isRootUser || u.role === 'ADMIN';
                      const permCount = hasAllPerms
                        ? availablePermissions.length
                        : (u.permissions ? u.permissions.length : 0);

                      const avatarBg = isRootUser
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : u.role === 'ADMIN' ? '#0d6efd'
                        : u.role === 'MANAGER' ? '#0dcaf0'
                        : '#198754';

                      return (
                        <tr
                          key={u.id}
                          className={isCurrentUser ? 'bg-primary-subtle bg-opacity-10' : ''}
                        >
                          <td className="text-center text-secondary small fw-medium">
                            {page * pageSize + index + 1}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2.5">
                              <div
                                className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white small shadow-xs flex-shrink-0"
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  background: avatarBg
                                }}
                              >
                                {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="d-flex align-items-center gap-1">
                                  <strong className="text-dark">{u.username}</strong>
                                  {isRootUser && (
                                    <span
                                      className="badge bg-warning text-dark shadow-xs"
                                      style={{ fontSize: '0.65rem' }}
                                    >
                                      Gốc
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="fw-medium text-dark">{u.fullName || '—'}</td>
                          <td className="text-secondary small">{u.email || '—'}</td>
                          <td>
                            <span className={`badge rounded-pill px-2.5 py-1 ${roleBadgeClass}`}>
                              {roleDisplay}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-light border py-1 px-2.5 d-inline-flex align-items-center gap-1.5 rounded-pill shadow-xs"
                              onClick={() => setViewPermUser(u)}
                              title="Bấm để xem danh sách chi tiết các quyền đã cấp"
                            >
                              <Shield
                                size={13}
                                className={
                                  isRootUser
                                    ? 'text-warning'
                                    : hasAllPerms
                                    ? 'text-primary'
                                    : 'text-success'
                                }
                              />
                              <span className="small fw-semibold text-dark">
                                {hasAllPerms ? 'Toàn quyền' : `${permCount} quyền`}
                              </span>
                              <Eye size={12} className="text-secondary" />
                            </button>
                          </td>
                          <td className="text-center">
                            {u.isActive !== false ? (
                              <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 px-2.5 py-1">
                                <CheckCircle size={12} /> Hoạt động
                              </span>
                            ) : (
                              <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 px-2.5 py-1">
                                <XCircle size={12} /> Đã khóa
                              </span>
                            )}
                          </td>
                          <td className="text-end pe-4">
                            {isSuperAdmin || isAdmin ? (
                              <div className="d-inline-flex align-items-center gap-1">
                                {/* Sửa & Phân quyền: Superadmin sửa được mọi user. Admin thường sửa được các user khác (không sửa được tài khoản admin gốc) */}
                                {(!isRootUser || isSuperAdmin) && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary rounded-2 p-1.5 d-flex align-items-center justify-content-center"
                                    title={isRootUser ? "Chỉnh sửa tài khoản gốc" : "Chỉnh sửa thông tin & Phân quyền"}
                                    onClick={() => {
                                      setEditingUser(u);
                                      setUserModalOpen(true);
                                    }}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}

                                {/* Đổi mật khẩu: Superadmin đổi được mọi user. Admin thường đổi được user khác (không đổi được mật khẩu tài khoản admin gốc) */}
                                {(!isRootUser || isSuperAdmin) && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning text-dark rounded-2 p-1.5 d-flex align-items-center justify-content-center"
                                    title="Đổi mật khẩu người dùng"
                                    onClick={() => {
                                      setSelectedUserForPassword(u);
                                      setPasswordModalOpen(true);
                                    }}
                                  >
                                    <KeyRound size={14} />
                                  </button>
                                )}

                                {/* Khóa / Mở khóa: CHỈ DUY NHẤT TÀI KHOẢN GỐC (SUPERADMIN) MỚI CÓ QUYỀN KHÓA */}
                                {isSuperAdmin && !isRootUser && (
                                  <button
                                    type="button"
                                    className={`btn btn-sm rounded-2 p-1.5 d-flex align-items-center justify-content-center ${
                                      u.isActive !== false
                                        ? 'btn-outline-secondary'
                                        : 'btn-outline-success'
                                    }`}
                                    title={
                                      u.isActive !== false ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
                                    }
                                    onClick={() => handleToggleStatus(u)}
                                  >
                                    {u.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                  </button>
                                )}

                                {/* Xóa tài khoản: CHỈ DUY NHẤT TÀI KHOẢN GỐC (SUPERADMIN) MỚI CÓ QUYỀN XÓA */}
                                {isSuperAdmin &&
                                  !isRootUser &&
                                  (!currentUser || u.username !== currentUser.username) && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger rounded-2 p-1.5 d-flex align-items-center justify-content-center"
                                      title="Xóa tài khoản"
                                      onClick={() => handleDeleteUser(u)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}

                                {/* Nếu là tài khoản gốc mà người đang xem là Admin thường: hiển thị nút Xem quyền */}
                                {isRootUser && !isSuperAdmin && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border py-1 px-2.5 text-secondary d-inline-flex align-items-center gap-1 rounded-2"
                                    title="Xem chi tiết quyền hạn Quản trị tối cao"
                                    onClick={() => setViewPermUser(u)}
                                  >
                                    <Eye size={13} />
                                    <span className="small">Xem quyền</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="d-flex justify-content-end align-items-center gap-1">
                                {u.username === currentUser?.username ? (
                                  <div className="d-inline-flex gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 py-1 px-2"
                                      title="Cập nhật thông tin của bạn"
                                      onClick={() => {
                                        setPersonalModalTab('profile');
                                        setPersonalModalOpen(true);
                                      }}
                                    >
                                      <User size={13} />
                                      <span className="small">Sửa thông tin</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-warning text-dark d-flex align-items-center gap-1 py-1 px-2"
                                      title="Đổi mật khẩu của bạn"
                                      onClick={() => {
                                        setPersonalModalTab('password');
                                        setPersonalModalOpen(true);
                                      }}
                                    >
                                      <KeyRound size={13} />
                                      <span className="small">Đổi MK</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border py-1 px-2.5 text-secondary d-inline-flex align-items-center gap-1"
                                    title="Xem chi tiết quyền hạn"
                                    onClick={() => setViewPermUser(u)}
                                  >
                                    <Eye size={13} />
                                    <span className="small">Xem quyền</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Phân trang */}
            {filteredUsers.length > 0 && (
              <div className="card-footer bg-light border-top px-4 py-2.5 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-secondary">Hiển thị:</span>
                  <select
                    className="form-select form-select-sm w-auto fw-medium"
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                  >
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span className="small text-secondary">dòng / trang</span>
                </div>

                {totalPages > 1 && (
                  <div className="d-flex gap-2 align-items-center">
                    <button
                      type="button"
                      className="btn btn-white bg-white border btn-sm fw-medium shadow-xs"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      &larr; Trang trước
                    </button>
                    <span className="small text-secondary fw-semibold px-2">
                      Trang {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-white bg-white border btn-sm fw-medium shadow-xs"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                    >
                      Trang sau &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}
      {/* Modal Thêm & Sửa người dùng / Phân quyền tùy chỉnh */}
      <ModalNguoiDung
        show={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          loadUsers();
          refreshUser();
        }}
        editingUser={editingUser}
        availablePermissions={availablePermissions}
        showToast={showToast}
      />

      {/* Modal Đổi mật khẩu */}
      <ModalDoiMatKhau
        show={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setSelectedUserForPassword(null);
        }}
        user={selectedUserForPassword}
        showToast={showToast}
      />

      {/* Modal Xem chi tiết quyền */}
      <ModalXemQuyen
        show={Boolean(viewPermUser)}
        onClose={() => setViewPermUser(null)}
        user={viewPermUser}
        availablePermissions={availablePermissions}
      />

      {/* Modal Cài đặt cá nhân: Tự cập nhật thông tin & đổi mật khẩu */}
      <ModalCaiDatCaNhan
        show={personalModalOpen}
        onClose={() => {
          setPersonalModalOpen(false);
          loadUsers();
        }}
        initialTab={personalModalTab}
      />
    </div>
  );
}