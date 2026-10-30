import React, { useState, useEffect } from 'react';
import { 
  X, User, Lock, Shield, Sliders, Check, Eye, EyeOff, 
  Mail, KeyRound, Bell, Volume2, VolumeX, Sparkles, AlertCircle, Layers
} from 'lucide-react';
import { userApi } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

// Danh sách các bảng màu Avatar để nhân viên tự chọn cá tính
const AVATAR_COLORS = [
  { id: 'grad-orange', label: 'Cam Lửa', bg: 'linear-gradient(135deg, #ef4444, #f97316)' },
  { id: 'grad-blue', label: 'Xanh Biển', bg: 'linear-gradient(135deg, #0d6efd, #0dcaf0)' },
  { id: 'grad-purple', label: 'Tím Thạch Anh', bg: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'grad-green', label: 'Xanh Lá', bg: 'linear-gradient(135deg, #10b981, #059669)' },
  { id: 'grad-dark', label: 'Đen Huyền Bí', bg: 'linear-gradient(135deg, #1e293b, #0f172a)' },
];

export default function ModalCaiDatCaNhan({ show, onClose, initialTab = 'profile' }) {
  const { user, refreshUser, hasPermission } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Form Thông tin cá nhân
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    avatarColor: 'grad-orange',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Form Đổi mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Danh sách quyền & metadata
  const [permissionsList, setPermissionsList] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  // Tùy chọn giao diện & âm thanh
  const [preferences, setPreferences] = useState(() => {
    return {
      soundEnabled: localStorage.getItem('pref_sound') !== 'false',
      autoCloseNoti: localStorage.getItem('pref_autoclose_noti') !== 'false',
    };
  });

  // Khởi tạo dữ liệu khi mở modal
  useEffect(() => {
    if (!show) return;

    setActiveTab(initialTab);

    // Nạp thông tin user hiện tại
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        avatarColor: localStorage.getItem(`user_avatar_color_${user.username}`) || 'grad-orange',
      });
    }

    // Reset form mật khẩu
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    // Tải danh sách quyền nếu chọn tab quyền hạn
    userApi.getPermissions()
      .then(res => setPermissionsList(res.data || []))
      .catch(() => {});
  }, [show, user, initialTab]);

  if (!show || !user) return null;

  // Xử lý lưu hồ sơ cá nhân
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileData.fullName.trim()) {
      showToast('Họ và tên không được để trống', 'warning');
      return;
    }

    setSavingProfile(true);
    try {
      await userApi.updateProfile({
        fullName: profileData.fullName.trim(),
        email: profileData.email.trim() || null,
        avatarUrl: profileData.avatarColor,
      });

      // Lưu màu sắc avatar vào localStorage
      localStorage.setItem(`user_avatar_color_${user.username}`, profileData.avatarColor);

      // Cập nhật AuthContext
      await refreshUser();
      showToast('Cập nhật thông tin cá nhân thành công!', 'success');
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi cập nhật thông tin cá nhân', 'danger');
    } finally {
      setSavingProfile(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      showToast('Vui lòng nhập mật khẩu hiện tại', 'warning');
      return;
    }
    if (!passwordData.newPassword) {
      showToast('Vui lòng nhập mật khẩu mới', 'warning');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Nhập lại mật khẩu mới không khớp', 'warning');
      return;
    }

    setSavingPassword(true);
    try {
      await userApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showToast('Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi đổi mật khẩu', 'danger');
    } finally {
      setSavingPassword(false);
    }
  };

  // Lưu tùy chọn trải nghiệm
  const handleTogglePreference = (key) => {
    const nextVal = !preferences[key];
    setPreferences(prev => ({ ...prev, [key]: nextVal }));
    localStorage.setItem(key === 'soundEnabled' ? 'pref_sound' : 'pref_autoclose_noti', String(nextVal));
    showToast('Đã lưu tùy chọn trải nghiệm', 'info');
  };

  // Gom nhóm quyền hạn
  const groupedPermissions = {};
  permissionsList.forEach(perm => {
    const gName = perm.group || 'Khác';
    if (!groupedPermissions[gName]) groupedPermissions[gName] = [];
    groupedPermissions[gName].push(perm);
  });

  const initials = (profileData.fullName || user.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const selectedBg = AVATAR_COLORS.find(c => c.id === profileData.avatarColor)?.bg || AVATAR_COLORS[0].bg;

  const isAdmin = (user.role || '').toUpperCase() === 'ADMIN' || (user.role || '').includes('Admin');
  const userPermCount = isAdmin ? permissionsList.length : (user.permissions ? user.permissions.length : 0);

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          {/* HEADER */}
          <div className="modal-header bg-dark text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: '42px', height: '42px', background: selectedBg, fontSize: '1rem' }}
              >
                {initials}
              </div>
              <div>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.15rem' }}>
                  Cài đặt & Hồ sơ cá nhân
                </h5>
                <p className="text-white-50 m-0" style={{ fontSize: '0.8rem' }}>
                  Tài khoản: <strong className="text-white">{user.username}</strong> · Vai trò: <span className="badge bg-primary-subtle text-primary border">{user.role}</span>
                </p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose} 
            />
          </div>

          {/* NAV TABS */}
          <div className="bg-light px-4 pt-2 border-bottom d-flex gap-2 flex-wrap">
            <button
              type="button"
              className={`btn btn-sm py-2 px-3 fw-semibold border-0 rounded-bottom-0 rounded-top ${activeTab === 'profile' ? 'btn-white bg-white text-primary border-top border-primary border-3 shadow-sm' : 'text-secondary'}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={15} className="me-1.5 d-inline" />
              Thông tin cá nhân
            </button>
            <button
              type="button"
              className={`btn btn-sm py-2 px-3 fw-semibold border-0 rounded-bottom-0 rounded-top ${activeTab === 'password' ? 'btn-white bg-white text-primary border-top border-primary border-3 shadow-sm' : 'text-secondary'}`}
              onClick={() => setActiveTab('password')}
            >
              <Lock size={15} className="me-1.5 d-inline" />
              Đổi mật khẩu
            </button>
            <button
              type="button"
              className={`btn btn-sm py-2 px-3 fw-semibold border-0 rounded-bottom-0 rounded-top ${activeTab === 'permissions' ? 'btn-white bg-white text-primary border-top border-primary border-3 shadow-sm' : 'text-secondary'}`}
              onClick={() => setActiveTab('permissions')}
            >
              <Shield size={15} className="me-1.5 d-inline" />
              Quyền hạn của tôi
              <span className="badge rounded-pill bg-primary ms-1.5" style={{ fontSize: '0.68rem' }}>
                {userPermCount}
              </span>
            </button>
            <button
              type="button"
              className={`btn btn-sm py-2 px-3 fw-semibold border-0 rounded-bottom-0 rounded-top ${activeTab === 'preferences' ? 'btn-white bg-white text-primary border-top border-primary border-3 shadow-sm' : 'text-secondary'}`}
              onClick={() => setActiveTab('preferences')}
            >
              <Sliders size={15} className="me-1.5 d-inline" />
              Tùy chọn trải nghiệm
            </button>
          </div>

          {/* BODY */}
          <div className="modal-body p-4" style={{ maxHeight: 'calc(78vh - 120px)' }}>

            {/* TAB 1: THÔNG TIN CÁ NHÂN */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile}>
                <div className="row g-4">
                  {/* Cột trái: Form thông tin */}
                  <div className="col-lg-7">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Tên đăng nhập
                      </label>
                      <input 
                        type="text" 
                        className="form-control bg-light" 
                        value={user.username} 
                        disabled 
                      />
                      <div className="form-text small text-muted">
                        Tên đăng nhập được quản trị viên cấp cố định và không thể thay đổi.
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Vai trò hệ thống
                      </label>
                      <div>
                        <span className="badge bg-primary px-3 py-2 rounded-pill fs-6">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Họ và tên <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><User size={16} /></span>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Nhập họ và tên đầy đủ"
                          value={profileData.fullName}
                          onChange={e => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                        />
                      </div>
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
                          placeholder="VD: nhanvien@qkshop.vn"
                          value={profileData.email}
                          onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Xem trước và Tùy biến Avatar */}
                  <div className="col-lg-5">
                    <div className="p-3 bg-light rounded-3 border text-center h-100 d-flex flex-column justify-content-between">
                      <div>
                        <h6 className="fw-bold text-dark mb-3 small text-uppercase">
                          Màu sắc Avatar cá nhân
                        </h6>

                        {/* Avatar Preview */}
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow mx-auto mb-3"
                          style={{ width: '80px', height: '80px', background: selectedBg, fontSize: '1.8rem' }}
                        >
                          {initials}
                        </div>

                        <div className="small text-secondary mb-3">
                          Chọn phong cách hiển thị avatar của bạn trên thanh tiêu đề:
                        </div>

                        {/* Bảng chọn màu sắc */}
                        <div className="d-flex justify-content-center gap-2 flex-wrap mb-2">
                          {AVATAR_COLORS.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className={`rounded-circle border-0 p-0 position-relative transition-all ${profileData.avatarColor === c.id ? 'shadow ring-2 ring-primary' : 'opacity-80'}`}
                              style={{ 
                                width: '32px', height: '32px', 
                                background: c.bg,
                                transform: profileData.avatarColor === c.id ? 'scale(1.15)' : 'scale(1)',
                                border: profileData.avatarColor === c.id ? '2px solid white' : 'none',
                                outline: profileData.avatarColor === c.id ? '2px solid #0d6efd' : 'none'
                              }}
                              onClick={() => setProfileData(prev => ({ ...prev, avatarColor: c.id }))}
                              title={c.label}
                            >
                              {profileData.avatarColor === c.id && (
                                <Check size={14} className="text-white position-absolute top-50 start-50 translate-middle" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3">
                        <button 
                          type="submit" 
                          className="btn btn-primary w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-1.5"
                          disabled={savingProfile}
                        >
                          {savingProfile ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              Lưu thay đổi hồ sơ
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: ĐỔI MẬT KHẨU */}
            {activeTab === 'password' && (
              <form onSubmit={handleSavePassword}>
                <div className="mx-auto" style={{ maxWidth: '480px' }}>
                  <div className="p-3 border rounded-3 bg-white mb-3">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <KeyRound size={18} className="text-warning" />
                      Thay đổi mật khẩu đăng nhập
                    </h6>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Mật khẩu hiện tại <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><Lock size={16} /></span>
                        <input 
                          type={showCurrentPassword ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Nhập mật khẩu bạn đang dùng"
                          value={passwordData.currentPassword}
                          onChange={e => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Mật khẩu mới <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><Lock size={16} /></span>
                        <input 
                          type={showNewPassword ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Tối thiểu 6 ký tự"
                          value={passwordData.newPassword}
                          onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                          type={showNewPassword ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Xác nhận lại mật khẩu mới"
                          value={passwordData.confirmPassword}
                          onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="alert alert-warning border-0 rounded-3 p-2.5 small mb-0">
                      <div className="d-flex align-items-start gap-2">
                        <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                        <div>
                          Hãy đặt mật khẩu mạnh kết hợp chữ cái và số để đảm bảo tính an toàn cho kho hàng.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-end">
                    <button 
                      type="submit" 
                      className="btn btn-primary fw-bold shadow-sm px-4"
                      disabled={savingPassword}
                    >
                      {savingPassword ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Đang xác thực...
                        </>
                      ) : (
                        <>
                          <Check size={16} className="me-1 d-inline" />
                          Xác nhận đổi mật khẩu
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 3: QUYỀN HẠN CỦA TÔI */}
            {activeTab === 'permissions' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold text-dark m-0">Danh sách quyền hạn được cấp</h6>
                    <p className="text-secondary small m-0">Tài khoản của bạn được phép thao tác các chức năng có đánh dấu xanh</p>
                  </div>
                  <span className="badge bg-primary fs-6 px-3 py-1.5 rounded-pill">
                    {userPermCount} quyền thao tác
                  </span>
                </div>

                {isAdmin && (
                  <div className="alert alert-success border-0 rounded-3 p-3 mb-3 d-flex align-items-center gap-2">
                    <Sparkles size={18} className="text-success flex-shrink-0" />
                    <span className="small">
                      Tài khoản của bạn là <strong>Quản trị viên (ADMIN)</strong> nên có toàn quyền truy cập tất cả các chức năng trong hệ thống.
                    </span>
                  </div>
                )}

                <div className="row g-3">
                  {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                    <div className="col-md-6" key={groupName}>
                      <div className="border rounded-3 h-100 bg-white shadow-sm overflow-hidden">
                        <div className="bg-light px-3 py-2 border-bottom d-flex align-items-center gap-2">
                          <Layers size={14} className="text-primary" />
                          <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: '0.78rem' }}>{groupName}</span>
                        </div>
                        <div className="p-2">
                          {perms.map(p => {
                            const isAllowed = isAdmin || (user.permissions && user.permissions.includes(p.code));
                            return (
                              <div 
                                key={p.code} 
                                className={`p-2 rounded-2 mb-1 d-flex align-items-start gap-2 ${isAllowed ? 'bg-success-subtle text-success-emphasis' : 'bg-light text-muted opacity-50'}`}
                              >
                                <div className="pt-0.5">
                                  {isAllowed ? (
                                    <Check size={15} className="text-success" />
                                  ) : (
                                    <X size={15} className="text-secondary" />
                                  )}
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <span className="fw-semibold small" style={{ fontSize: '0.8rem' }}>{p.name}</span>
                                    <code style={{ fontSize: '0.65rem' }}>{p.code}</code>
                                  </div>
                                  <div className="small text-secondary" style={{ fontSize: '0.72rem' }}>
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
            )}

            {/* TAB 4: TÙY CHỌN TRẢI NGHIỆM */}
            {activeTab === 'preferences' && (
              <div className="mx-auto" style={{ maxWidth: '540px' }}>
                <div className="p-3 border rounded-3 bg-white mb-3">
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <Sliders size={18} className="text-primary" />
                    Cá nhân hóa trải nghiệm thao tác
                  </h6>

                  {/* Âm thanh */}
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold text-dark small d-flex align-items-center gap-2">
                        {preferences.soundEnabled ? <Volume2 size={16} className="text-primary" /> : <VolumeX size={16} className="text-secondary" />}
                        Âm thanh chuông báo hệ thống
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        Phát âm thanh nhẹ khi có thông báo đơn hàng xuất kho hoặc đồng bộ mới.
                      </div>
                    </div>
                    <div className="form-check form-switch m-0">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        checked={preferences.soundEnabled}
                        onChange={() => handleTogglePreference('soundEnabled')}
                        style={{ width: '38px', height: '20px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Tự động đóng thông báo */}
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <div>
                      <div className="fw-semibold text-dark small d-flex align-items-center gap-2">
                        <Bell size={16} className="text-info" />
                        Tự đóng hộp thông báo khi chọn
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        Tự động đóng menu thông báo khi bạn nhấp vào liên kết của một thông báo.
                      </div>
                    </div>
                    <div className="form-check form-switch m-0">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        checked={preferences.autoCloseNoti}
                        onChange={() => handleTogglePreference('autoCloseNoti')}
                        style={{ width: '38px', height: '20px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="alert alert-info border-0 rounded-3 p-3 small text-secondary">
                  Các cài đặt trải nghiệm cá nhân này được lưu riêng trên trình duyệt thiết bị của bạn.
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="modal-footer bg-light px-4 py-2.5 border-top d-flex justify-content-end">
            <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onClose}>
              Đóng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
