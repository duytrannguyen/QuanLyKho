import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, ClipboardCheck,
  Search, BarChart3, RefreshCw, FileText, Settings, ChevronsLeft, ChevronsRight, ShoppingCart
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { path: '/', label: 'Điều hành', icon: LayoutDashboard },
  { path: '/nhap-may', label: 'Nhập máy', icon: PackagePlus },
  { path: '/kiem-tra', label: 'Kiểm tra máy', icon: ClipboardCheck },
  { path: '/tra-cuu', label: 'Tra cứu', icon: Search },
  { path: '/ban-may', label: 'Bán máy', icon: ShoppingCart },
  { path: '/phan-tich', label: 'Phân tích', icon: BarChart3 },
  { path: '/doi-soat', label: 'Đối soát & đồng bộ', icon: RefreshCw },
  { path: '/nhat-ky', label: 'Nhật ký', icon: FileText },
  { path: '/he-thong', label: 'Hệ thống', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>QK</div>
        <div className={styles.logoText}>
          <div className={styles.logoTitle}>Tồn Kho V2</div>
          <div className={styles.logoSub}>QKShop · Trung tâm vận hành</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.navList}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
            end={path === '/'}
            title={collapsed ? label : undefined}
          >
            <span className={styles.navIcon}>
              <Icon size={20} />
            </span>
            <span className={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Collapse Button */}
      <div className={styles.collapseArea}>
        <button className={styles.collapseBtn} onClick={onToggle}>
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> <span>Thu gọn</span></>}
        </button>
      </div>

      {/* Version */}
      <div className={styles.versionArea}>
        <div className={styles.versionText}>
          UI Specification 1.0<br />Dữ liệu chính thức
        </div>
      </div>
    </aside>
  );
}
