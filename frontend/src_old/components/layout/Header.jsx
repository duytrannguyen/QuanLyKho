import { useState } from 'react';
import { Search, RefreshCw, Settings, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

export default function Header({ collapsed }) {
  const { user } = useAuth();
  const [time] = useState(() => {
    const now = new Date();
    return `Cập nhật ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className={`${styles.header} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.headerLeft}>
        {/* <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm serial, dòng máy, giao dịch..."
          />
        </div> */}
      </div>

      <div className={styles.headerRight}>
        {/* Status Badge */}
        <div className={styles.statusBadge}>
          <span className={styles.statusDot}></span>
          DỮ LIỆU CHÍNH THỨC - ĐANG GHI
        </div>

        {/* Timestamp */}
        <span className={styles.timestamp}>{time}</span>

        {/* Refresh Button */}
        <button className={styles.headerBtn}>
          <Plus size={14} />
          Làm mới
        </button>

        {/* Settings */}
        <button className={styles.iconBtn}>
          <Settings size={18} />
        </button>

        {/* User */}
        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.username || 'User'}</div>
            <div className={styles.userRole}>{user?.role || 'Quản lý'}</div>
          </div>
          <div className={styles.avatar}>{initials}</div>
        </div>
      </div>
    </header>
  );
}
