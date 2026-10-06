import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ThanhBen from './ThanhBen';
import PhanDau from './PhanDau';
import TaiToanCuc from '../TaiToanCuc';

export default function BoCucChinh() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = collapsed ? '72px' : '240px';
  const marginGap = isMobile ? '0px' : '0px';
  const contentMargin = isMobile ? '0px' : sidebarWidth;

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <ThanhBen 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
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
          onOpenMenu={() => setMobileOpen(true)}
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
