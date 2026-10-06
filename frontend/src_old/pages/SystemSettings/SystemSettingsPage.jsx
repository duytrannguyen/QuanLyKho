import { useState, useEffect } from 'react';
import { Settings, Users, Database } from 'lucide-react';
import { systemApi } from '../../api';
import { useToast } from '../../toast/ToastContext';
import styles from './SystemSettingsPage.module.css';

export default function SystemSettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  
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
      showToast('Lỗi lưu cấu hình: ' + (err.response?.data?.message || err.message), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Cài đặt hệ thống</h1>
          <p>Quản lý cấu hình, phân quyền người dùng và tích hợp</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <div className={styles.menuCard}>
          <div className={`${styles.menuItem} ${activeTab === 'general' ? styles.active : ''}`}
               onClick={() => setActiveTab('general')}>
            <span className={styles.menuIcon}><Settings size={18} /></span>
            Cấu hình chung
          </div>
          <div className={`${styles.menuItem} ${activeTab === 'users' ? styles.active : ''}`}
               onClick={() => setActiveTab('users')}>
            <span className={styles.menuIcon}><Users size={18} /></span>
            Người dùng & Phân quyền
          </div>
          <div className={`${styles.menuItem} ${activeTab === 'datasale' ? styles.active : ''}`}
               onClick={() => setActiveTab('datasale')}>
            <span className={styles.menuIcon}><Database size={18} /></span>
            Tích hợp DataSale
          </div>
        </div>

        {/* Content */}
        <div className={styles.contentCard}>
          {activeTab === 'general' && (
            <div>
              <h2 className={styles.sectionTitle}>Cấu hình chung</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.settingLabel}>Nhận diện cấu hình tự động</div>
                <div className={styles.settingSub}>Bật để hệ thống tự động trích xuất thông tin RAM, SSD, CPU từ chuỗi model đầy đủ.</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: '16px', height: '16px' }} 
                         checked={config.auto_recognition === 'true'}
                         onChange={e => handleConfigChange('auto_recognition', e.target.checked ? 'true' : 'false')} />
                  <span>Kích hoạt tính năng nhận diện</span>
                </label>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingLabel}>Thời gian lưu trữ nhật ký</div>
                <div className={styles.settingSub}>Số ngày giữ lại dữ liệu nhật ký hoạt động trên hệ thống (mặc định 90 ngày).</div>
                <input type="number" className="form-input" style={{ width: '120px' }} 
                       value={config.log_retention_days || 90} 
                       onChange={e => handleConfigChange('log_retention_days', e.target.value)} />
              </div>

              <button className="btn btn-primary" disabled={saving}
                      onClick={() => handleSaveConfig(['auto_recognition', 'log_retention_days'])}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className={styles.headerWithBtn}>
                <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>Quản lý người dùng</h2>
                <button className="btn btn-primary btn-sm">+ Thêm người dùng</button>
              </div>
              
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Họ và tên</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.fullName}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[u.role.toLowerCase()]}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[u.status.toLowerCase()]}`}>
                          {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm">Sửa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'datasale' && (
            <div>
              <h2 className={styles.sectionTitle}>Tích hợp DataSale</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.settingLabel}>DataSale API Endpoint</div>
                <div className={styles.settingSub}>Đường dẫn API của hệ thống DataSale để đối soát tồn kho.</div>
                <input type="text" className="form-input" 
                       value={config.datasale_endpoint || ''}
                       onChange={e => handleConfigChange('datasale_endpoint', e.target.value)} />
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingLabel}>API Key</div>
                <div className={styles.settingSub}>Khóa bảo mật để kết nối. Không chia sẻ khóa này.</div>
                <input type="password" className="form-input" 
                       value={config.datasale_apikey || ''}
                       onChange={e => handleConfigChange('datasale_apikey', e.target.value)} />
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.settingLabel}>Lịch đồng bộ tự động</div>
                <div className={styles.settingSub}>Cấu hình thời gian chạy đối soát định kỳ tự động.</div>
                <select className="form-select" style={{ width: '200px' }} 
                        value={config.datasale_sync_schedule || 'none'}
                        onChange={e => handleConfigChange('datasale_sync_schedule', e.target.value)}>
                  <option value="none">Tắt tự động</option>
                  <option value="hourly">Mỗi giờ</option>
                  <option value="daily">Mỗi ngày lúc 00:00</option>
                  <option value="weekly">Mỗi tuần</option>
                </select>
              </div>

              <button className="btn btn-primary" disabled={saving}
                      onClick={() => handleSaveConfig(['datasale_endpoint', 'datasale_apikey', 'datasale_sync_schedule'])}>
                {saving ? 'Đang lưu...' : 'Cập nhật cấu hình'}
              </button>
              <button className="btn btn-outline" style={{ marginLeft: '12px' }}>Kiểm tra kết nối</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
