import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalLoading from '../GlobalLoading';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${styles.layout} ${collapsed ? styles.collapsed : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header collapsed={collapsed} />
      <main className={styles.mainContent}>
        <GlobalLoading />
        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
