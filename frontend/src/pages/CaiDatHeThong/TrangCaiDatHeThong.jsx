import { useState, useEffect } from 'react';
import { Settings, Users, Database } from 'lucide-react';
import { systemApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

export default function TrangCaiDatHeThong() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  
  useEffect(() => {
    setPage(0);
  }, [activeTab, pageSize]);

  useEffect(() => {
    if (activeTab === 'users') {
      systemApi.getUsers().then(res => setUsers(res.data)).catch(console.error);
    } else if (activeTab === 'general' || activeTab === 'datasale') {
      systemApi.getConfig().then(res => setConfig(res.data || {})).catch(console.error);
    }
  }, [activeTab]);

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

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="mb-4">
        <h2 className="fw-bold text-dark m-0 mb-1">Cài đặt hệ thống</h2>
        <p className="text-secondary m-0">Quản lý cấu hình, phân quyền người dùng và tích hợp</p>
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

            {activeTab === 'users' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold text-dark m-0">Quản lý người dùng</h4>
                  <button className="btn btn-primary btn-sm" onClick={() => showToast('Tính năng đang phát triển', 'info')}>+ Thêm người dùng</button>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center text-secondary small text-uppercase">STT</th>
                        <th className="text-secondary small text-uppercase">Tài khoản</th>
                        <th className="text-secondary small text-uppercase">Họ và tên</th>
                        <th className="text-secondary small text-uppercase">Vai trò</th>
                        <th className="text-secondary small text-uppercase">Trạng thái</th>
                        <th className="text-secondary small text-uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(page * pageSize, (page + 1) * pageSize).map((u, index) => {
                        let roleBadgeClass = "bg-secondary text-white";
                        if (u.role === 'ADMIN') roleBadgeClass = "bg-primary-subtle text-primary border border-primary";
                        if (u.role === 'MANAGER') roleBadgeClass = "bg-info-subtle text-info border border-info";
                        if (u.role === 'STAFF') roleBadgeClass = "bg-success-subtle text-success border border-success";

                        return (
                          <tr key={u.id}>
                            <td className="text-center">{page * pageSize + index + 1}</td>
                            <td><strong>{u.username}</strong></td>
                            <td>{u.fullName}</td>
                            <td>
                              <span className={`badge rounded-pill ${roleBadgeClass}`}>{u.role}</span>
                            </td>
                            <td>
                              <span className={`badge rounded-pill ${u.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                                {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => showToast('Tính năng đang phát triển', 'info')}>Sửa</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {users.length > 0 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-secondary">Hiển thị:</span>
                      <select className="form-select form-select-sm w-auto" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    {Math.ceil(users.length / pageSize) > 1 && (
                      <div className="d-flex gap-2 align-items-center">
                        <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
                        <span className="small text-secondary">Trang {page + 1} / {Math.ceil(users.length / pageSize)}</span>
                        <button className="btn btn-outline-secondary btn-sm" disabled={page >= Math.ceil(users.length / pageSize) - 1} onClick={() => setPage(page + 1)}>Sau</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
    </div>
  );
}
