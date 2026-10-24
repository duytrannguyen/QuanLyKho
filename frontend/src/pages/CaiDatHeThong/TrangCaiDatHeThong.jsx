import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, Users, Database, UserPlus, Edit3, KeyRound, 
  Shield, Lock, Unlock, Trash2, Eye, Search, CheckCircle, XCircle 
} from 'lucide-react';
import { systemApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import ModalNguoiDung from './ModalNguoiDung';
import ModalDoiMatKhau from './ModalDoiMatKhau';
import ModalXemQuyen from './ModalXemQuyen';

export default function TrangCaiDatHeThong() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('general');
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
      for (const key of keys) {
        if (config[key] !== undefined) {
          await systemApi.updateConfig(key, config[key]);
        }
      }
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

      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="mb-4">
        <h2 className="fw-bold text-dark m-0 mb-1">Cài đặt hệ thống</h2>
        <p className="text-secondary m-0">Quản lý cấu hình, người dùng & phân quyền tùy chỉnh chi tiết</p>
      </div>

      <div className="row g-4">
        {/* ThanhBen Menu */}
        <div className="col-lg-3">
          <div className="card shadow-sm border-0">
            <div className="list-group list-group-flush rounded">
              <button 
                className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0 ${activeTab === 'general' ? 'bg-primary-subtle text-primary fw-bold border-start border-primary border-4' : 'text-secondary'}`}
                onClick={() => setActiveTab('general')}
              >
                <Settings size={20} />
                Cấu hình chung
              </button>
              <button 
                className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0 ${activeTab === 'users' ? 'bg-primary-subtle text-primary fw-bold border-start border-primary border-4' : 'text-secondary'}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={20} />
                Người dùng & Phân quyền
              </button>
              <button 
                className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0 ${activeTab === 'datasale' ? 'bg-primary-subtle text-primary fw-bold border-start border-primary border-4' : 'text-secondary'}`}
                onClick={() => setActiveTab('datasale')}
              >
                <Database size={20} />
                Tích hợp DataSale
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="col-lg-9">
          <div className="card shadow-sm border-0 p-4">
            
            {/* ================= TAB CẤU HÌNH CHUNG ================= */}
            {activeTab === 'general' && (
              <div>
                <h4 className="fw-bold text-dark border-bottom pb-3 mb-4">Cấu hình chung</h4>
                
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1">Nhận diện cấu hình tự động</h6>
                  <p className="small text-secondary mb-3">Bật để hệ thống tự động trích xuất thông tin RAM, SSD, CPU từ chuỗi model đầy đủ.</p>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      role="switch" 
                      id="autoRecog" 
                      checked={config.auto_recognition === 'true'}
                      onChange={e => handleConfigChange('auto_recognition', e.target.checked ? 'true' : 'false')} 
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label" htmlFor="autoRecog" style={{ cursor: 'pointer' }}>
                      Kích hoạt tính năng nhận diện
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1">Thời gian lưu trữ nhật ký</h6>
                  <p className="small text-secondary mb-3">Số ngày giữ lại dữ liệu nhật ký hoạt động trên hệ thống (mặc định 90 ngày).</p>
                  <input 
                    type="number" 
                    className="form-control w-25" 
                    value={config.log_retention_days || 90} 
                    onChange={e => handleConfigChange('log_retention_days', e.target.value)} 
                  />
                </div>

                <button className="btn btn-primary" disabled={saving}
                        onClick={() => handleSaveConfig(['auto_recognition', 'log_retention_days'])}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}

            {/* ================= TAB NGƯỜI DÙNG & PHÂN QUYỀN ================= */}
            {activeTab === 'users' && (
              <div>
                {/* Header & Button thêm */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                  <div>
                    <h4 className="fw-bold text-dark m-0">Quản lý người dùng & Phân quyền</h4>
                    <p className="small text-secondary m-0">Quản lý tài khoản đăng nhập và cấp quyền hạn tùy chỉnh cho từng nhân viên</p>
                  </div>
                  <button 
                    className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" 
                    onClick={() => {
                      setEditingUser(null);
                      setUserModalOpen(true);
                    }}
                  >
                    <UserPlus size={18} />
                    <span>Thêm người dùng mới</span>
                  </button>
                </div>

                {/* Filter Toolbar */}
                <div className="row g-2 mb-3 bg-light p-3 rounded-3 border">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <Search size={16} className="text-secondary" />
                      </span>
                      <input 
                        type="text" 
                        className="form-control border-start-0" 
                        placeholder="Tìm theo username, họ tên, email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select 
                      className="form-select"
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả vai trò</option>
                      <option value="ADMIN">ADMIN (Quản trị viên)</option>
                      <option value="MANAGER">MANAGER (Quản lý)</option>
                      <option value="STAFF">STAFF (Nhân viên)</option>
                    </select>
                  </div>
                  <div className="col-md-3 text-end d-flex align-items-center justify-content-end">
                    <span className="small text-secondary fw-semibold">
                      Tổng số: {filteredUsers.length} tài khoản
                    </span>
                  </div>
                </div>
                
                {/* Table */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle border">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center text-secondary small text-uppercase" style={{ width: '50px' }}>STT</th>
                        <th className="text-secondary small text-uppercase">Tài khoản</th>
                        <th className="text-secondary small text-uppercase">Họ và tên</th>
                        <th className="text-secondary small text-uppercase">Email</th>
                        <th className="text-secondary small text-uppercase">Vai trò</th>
                        <th className="text-secondary small text-uppercase">Phân quyền tùy chỉnh</th>
                        <th className="text-secondary small text-uppercase text-center">Trạng thái</th>
                        <th className="text-secondary small text-uppercase text-end" style={{ width: '220px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
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
                          let roleBadgeClass = "bg-secondary text-white";
                          if (u.role === 'ADMIN') roleBadgeClass = "bg-primary-subtle text-primary border border-primary";
                          if (u.role === 'MANAGER') roleBadgeClass = "bg-info-subtle text-info border border-info";
                          if (u.role === 'STAFF') roleBadgeClass = "bg-success-subtle text-success border border-success";

                          const isAdmin = u.role === 'ADMIN';
                          const permCount = isAdmin 
                            ? availablePermissions.length 
                            : (u.permissions ? u.permissions.length : 0);

                          return (
                            <tr key={u.id}>
                              <td className="text-center text-secondary small">{page * pageSize + index + 1}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div 
                                    className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white small"
                                    style={{ 
                                      width: '32px', height: '32px', 
                                      background: u.role === 'ADMIN' ? '#0d6efd' : u.role === 'MANAGER' ? '#0dcaf0' : '#198754' 
                                    }}
                                  >
                                    {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <strong className="text-dark">{u.username}</strong>
                                    {u.username === 'admin' && (
                                      <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>Gốc</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="fw-medium">{u.fullName || '—'}</td>
                              <td className="text-secondary small">{u.email || '—'}</td>
                              <td>
                                <span className={`badge rounded-pill ${roleBadgeClass}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-light border py-1 px-2 d-flex align-items-center gap-1"
                                  onClick={() => setViewPermUser(u)}
                                  title="Bấm để xem danh sách chi tiết các quyền đã cấp"
                                >
                                  <Shield size={14} className={isAdmin ? 'text-primary' : 'text-success'} />
                                  <span className="small fw-semibold">
                                    {isAdmin ? 'Toàn quyền' : `${permCount} quyền`}
                                  </span>
                                  <Eye size={12} className="text-secondary ms-1" />
                                </button>
                              </td>
                              <td className="text-center">
                                {u.isActive !== false ? (
                                  <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1">
                                    <CheckCircle size={12} /> Hoạt động
                                  </span>
                                ) : (
                                  <span className="badge bg-danger-subtle text-danger border border-danger d-inline-flex align-items-center gap-1">
                                    <XCircle size={12} /> Đã khóa
                                  </span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="btn-group btn-group-sm">
                                  {/* Sửa & Phân quyền */}
                                  <button 
                                    className="btn btn-outline-primary" 
                                    title="Chỉnh sửa thông tin & Phân quyền"
                                    onClick={() => {
                                      setEditingUser(u);
                                      setUserModalOpen(true);
                                    }}
                                  >
                                    <Edit3 size={14} />
                                  </button>

                                  {/* Đổi mật khẩu */}
                                  <button 
                                    className="btn btn-outline-warning text-dark" 
                                    title="Đổi mật khẩu"
                                    onClick={() => {
                                      setSelectedUserForPassword(u);
                                      setPasswordModalOpen(true);
                                    }}
                                  >
                                    <KeyRound size={14} />
                                  </button>

                                  {/* Khóa / Mở khóa */}
                                  {u.username !== 'admin' && (
                                    <button 
                                      className={`btn ${u.isActive !== false ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                                      title={u.isActive !== false ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                      onClick={() => handleToggleStatus(u)}
                                    >
                                      {u.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                    </button>
                                  )}

                                  {/* Xóa */}
                                  {u.username !== 'admin' && (!currentUser || u.username !== currentUser.username) && (
                                    <button 
                                      className="btn btn-outline-danger" 
                                      title="Xóa tài khoản"
                                      onClick={() => handleDeleteUser(u)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang */}
                {filteredUsers.length > 0 && (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-secondary">Hiển thị:</span>
                      <select 
                        className="form-select form-select-sm w-auto" 
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
                          className="btn btn-outline-secondary btn-sm" 
                          disabled={page === 0} 
                          onClick={() => setPage(page - 1)}
                        >
                          &larr; Trang trước
                        </button>
                        <span className="small text-secondary fw-semibold">
                          Trang {page + 1} / {totalPages}
                        </span>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
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
            )}

            {/* ================= TAB DATASALE ================= */}
            {activeTab === 'datasale' && (
              <div>
                <h4 className="fw-bold text-dark border-bottom pb-3 mb-4">Tích hợp DataSale</h4>
                
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1">DataSale API Endpoint</h6>
                  <p className="small text-secondary mb-2">Đường dẫn API của hệ thống DataSale để đối soát tồn kho.</p>
                  <input type="text" className="form-control" 
                         value={config.datasale_endpoint || ''}
                         onChange={e => handleConfigChange('datasale_endpoint', e.target.value)} />
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1">API Key</h6>
                  <p className="small text-secondary mb-2">Khóa bảo mật để kết nối. Không chia sẻ khóa này.</p>
                  <input type="password" className="form-control" 
                         value={config.datasale_apikey || ''}
                         onChange={e => handleConfigChange('datasale_apikey', e.target.value)} />
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1">Lịch đồng bộ tự động</h6>
                  <p className="small text-secondary mb-2">Cấu hình thời gian chạy đối soát định kỳ tự động.</p>
                  <select className="form-select w-50" 
                          value={config.datasale_sync_schedule || 'none'}
                          onChange={e => handleConfigChange('datasale_sync_schedule', e.target.value)}>
                    <option value="none">Tắt tự động</option>
                    <option value="hourly">Mỗi giờ</option>
                    <option value="daily">Mỗi ngày lúc 00:00</option>
                    <option value="weekly">Mỗi tuần</option>
                  </select>
                </div>

                <div className="d-flex gap-3">
                  <button className="btn btn-primary" disabled={saving}
                          onClick={() => handleSaveConfig(['datasale_endpoint', 'datasale_apikey', 'datasale_sync_schedule'])}>
                    {saving ? 'Đang lưu...' : 'Cập nhật cấu hình'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => showToast('Tính năng đang phát triển', 'info')}>Kiểm tra kết nối</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {/* Modal Thêm & Sửa người dùng / Phân quyền tùy chỉnh */}
      <ModalNguoiDung 
        show={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={loadUsers}
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

    </div>
  );
}
