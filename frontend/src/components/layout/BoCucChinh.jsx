import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import ThanhBen from './ThanhBen';
import PhanDau from './PhanDau';
import TaiToanCuc from '../TaiToanCuc';

export default function BoCucChinh() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991.98px)');
    const handleMediaChange = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    setIsMobile(mql.matches);
    mql.addEventListener('change', handleMediaChange);
    return () => mql.removeEventListener('change', handleMediaChange);
  }, []);

  const handleToggleSidebar = useCallback(() => setCollapsed(prev => !prev), []);
  const handleOpenMobileMenu = useCallback(() => setMobileOpen(true), []);

  const sidebarWidth = collapsed ? '72px' : '240px';
  const marginGap = isMobile ? '0px' : '0px';
  const contentMargin = isMobile ? '0px' : sidebarWidth;

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <ThanhBen 
        collapsed={collapsed} 
        onToggle={handleToggleSidebar} 
        width={sidebarWidth} 
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      <div className="flex-grow-1 d-flex flex-column bg-light" style={{ marginLeft: contentMargin, transition: 'margin-left 0.3s ease', minHeight: '100vh', width: '100%' }}>
        <PhanDau 
          collapsed={collapsed} 
          sidebarWidth={sidebarWidth} 
          marginGap={marginGap}
          isMobile={isMobile}
          onOpenMenu={handleOpenMobileMenu}
        />
        
        <main className="flex-grow-1 position-relative" style={{ paddingTop: '64px' }}>
          <TaiToanCuc />
          <div className="p-3 p-md-4 w-100" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
