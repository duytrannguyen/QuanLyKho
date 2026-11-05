import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, ClipboardCheck, Search, BarChart3, RefreshCw, 
  FileText, Settings, ChevronsLeft, ChevronsRight, ShoppingCart, List, Tag, 
  ShieldCheck, ChevronRight, Package, History, X, Wrench, ShoppingBag, TrendingUp, Cpu, Users, Clock, Truck
} from 'lucide-react';
import { useAuth } from '../../contexts/NguCanhXacThuc';

// 1. DATA ĐÃ ĐƯỢC KHÔI PHỤC ĐẦY ĐỦ 100%
const navGroups = [
  {
    title: 'TỔNG QUAN & BÁO CÁO',
    items: [
      { path: '/', label: 'Bàn điều hành', icon: LayoutDashboard, permission: 'DASHBOARD_VIEW' },
      { path: '/bao-cao-ban-hang', label: 'Báo cáo doanh số', icon: TrendingUp, permission: 'SALES_REPORT_VIEW' },
      { path: '/phan-tich', label: 'Thống kê phân tích', icon: BarChart3, permission: 'ANALYTICS_VIEW' },
    ]
  },
  {
    title: 'BÁN HÀNG & DỊCH VỤ',
    items: [
      { path: '/ban-may', label: 'Bán máy (POS)', icon: ShoppingCart, permission: 'SALE_MACHINE' },
      { path: '/ban-phu-kien', label: 'Bán phụ kiện lẻ', icon: ShoppingBag, permission: 'SALE_ACCESSORY' },
      { path: '/dich-vu-sua-chua', label: 'Dịch vụ sửa chữa', icon: Wrench, permission: 'SERVICE_REPAIR' },
      { path: '/don-ship', label: 'Đơn ship & Giao hàng', icon: Truck, permission: 'SALE_MACHINE' },
      { path: '/bao-hanh', label: 'Tra cứu đơn & Bảo hành', icon: ShieldCheck, permission: 'WARRANTY_CHECK' },
      { path: '/bang-gia', label: 'Bảng giá niêm yết', icon: Tag, permission: 'PRICING_VIEW' },
    ]
  },
  {
    title: 'KHO MÁY & KIỂM ĐỊNH',
    items: [
      { path: '/tra-cuu', label: 'Tồn kho máy', icon: Search, permission: 'SEARCH_INVENTORY' },
      { path: '/quan-ly-ma-may', label: 'Quản lý mã máy (Serial)', icon: List, permission: 'MANAGE_MACHINE_CODES' },
      { path: '/nhap-may', label: 'Nhập kho máy', icon: PackagePlus, permission: 'IMPORT_MACHINE' },
      { path: '/kiem-tra', label: 'Kiểm định chất lượng', icon: ClipboardCheck, permission: 'INSPECTION' },
    ]
  },
  {
    title: 'LINH KIỆN & PHỤ KIỆN',
    items: [
      { path: '/ton-kho-linh-kien', label: 'Kho linh kiện', icon: Cpu, permission: 'INVENTORY_PART' },
      { path: '/ton-kho-phu-kien', label: 'Kho phụ kiện', icon: Package, permission: 'INVENTORY_ACCESSORY' },
    ]
  },
  {
    title: 'CHĂM SÓC KHÁCH HÀNG',
    items: [
      { path: '/khach-hang', label: 'Khách hàng (CRM)', icon: Users, permission: 'CRM_VIEW' },
      { path: '/khach-hang/het-han-bao-hanh', label: 'Máy hết hạn bảo hành', icon: Clock, permission: 'CRM_VIEW' },
    ]
  },
  {
    title: 'HỆ THỐNG & ĐỐI SOÁT',
    items: [
      { path: '/doi-soat', label: 'Đối soát Google Sheet', icon: RefreshCw, permission: 'SYNC_MANAGE' },
      { path: '/nhat-ky', label: 'Nhật ký hoạt động', icon: FileText, permission: 'LOGS_VIEW' },
      { path: '/he-thong', label: 'Cấu hình & Phân quyền', icon: Settings, permission: 'SYSTEM_MANAGE' },
    ]
  }
];

// 2. HEADER
const SidebarHeader = ({ isCollapsed, isMobile, setMobileOpen }) => (
  <div className="d-flex align-items-center p-3 border-bottom border-secondary border-opacity-25" style={{ minHeight: '70px' }}>
    <div className="bg-primary text-white d-flex justify-content-center align-items-center rounded-3 flex-shrink-0 shadow" style={{ width: '40px', height: '40px' }}>
      <span className="fw-bold fs-5">QK</span>
    </div>
    
    <div className={`text-white overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 ms-0' : 'opacity-100 flex-grow-1 ms-3'}`} style={{ whiteSpace: 'nowrap' }}>
      <div className="fw-bold fs-6">TỒN KHO V2</div>
      <div className="text-white-50 small">QKShop · Vận hành</div>
    </div>

    {isMobile && (
      <button className="btn btn-link text-white-50 p-0 ms-auto" onClick={() => setMobileOpen(false)}>
        <X size={24} />
      </button>
    )}
  </div>
);

// 3. NAV ITEM (Fix lệch tâm & khối active chuẩn vuông)
const NavItem = ({ item, isCollapsed, isMobile, setMobileOpen }) => {
  const { path, label, icon: Icon } = item;
  
  return (
    <NavLink 
      to={path} 
      end={path === '/'} 
      onClick={() => isMobile && setMobileOpen(false)}
      className={({ isActive }) => 
        `nav-link d-flex align-items-center mb-1 rounded-3 text-nowrap transition-all border-0 ${
          isActive 
            ? 'active bg-primary text-white shadow-sm' 
            : 'text-white-50 hover-bg-dark'
        } ${isCollapsed ? 'justify-content-center p-0 mx-auto' : 'py-2 px-3'}`
      }
      style={{ 
        transition: 'all 0.2s ease-in-out',
        width: isCollapsed ? '42px' : '100%',
        height: isCollapsed ? '42px' : 'auto'
      }}
      title={isCollapsed ? label : ''}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} className="flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
          <span 
            className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 ms-0' : 'opacity-100 w-auto ms-3'}`}
            style={{ fontSize: '14px', whiteSpace: 'nowrap' }}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};

// 4. NAV GROUP (Tách vạch ngăn khi thu nhỏ)
const NavGroup = ({ group, isActive, onToggle, isCollapsed, isMobile, setMobileOpen }) => {
  const showContent = isCollapsed || isActive;

  return (
    <div className={`mb-1 ${isCollapsed ? 'border-bottom border-secondary border-opacity-10 pb-2 mb-2 mx-2' : ''}`}>
      {!isCollapsed && (
        <div 
          className="d-flex justify-content-between align-items-center px-3 py-2 text-white-50 user-select-none hover-text-white"
          onClick={onToggle}
          style={{ cursor: 'pointer', transition: 'color 0.2s ease' }}
        >
          <span className="fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            {group.title}
          </span>
          <ChevronRight 
            size={16} 
            style={{ 
              transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)', 
              transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)' 
            }} 
          />
        </div>
      )}
      
      <div 
        style={{
          display: 'grid',
          gridTemplateRows: showContent ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s cubic-bezier(0.2, 0, 0, 1)'
        }}
      >
        <div className="overflow-hidden">
          <div className={`nav nav-pills flex-column ${isCollapsed ? 'px-0' : 'px-2'}`} style={{ minHeight: 0 }}>
            {group.items.map((item) => (
              <NavItem 
                key={item.path} 
                item={item} 
                isCollapsed={isCollapsed} 
                isMobile={isMobile} 
                setMobileOpen={setMobileOpen} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. MAIN SIDEBAR
export default function ThanhBen({ collapsed, onToggle, width, isMobile, mobileOpen, setMobileOpen }) {
  const { hasPermission } = useAuth();
  const location = useLocation();

  const [activeGroup, setActiveGroup] = useState(() => {
    const currentGroup = navGroups.find(g => g.items.some(item => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path))));
    return currentGroup ? currentGroup.title : navGroups[0].title;
  });

  useEffect(() => {
    if (!collapsed) {
       const currentGroup = navGroups.find(g => g.items.some(item => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path))));
       if (currentGroup && activeGroup !== currentGroup.title) {
           setActiveGroup(currentGroup.title);
       }
    }
  }, [location.pathname, collapsed]);

  const toggleGroup = (title) => {
    setActiveGroup(prev => prev === title ? null : title);
  };

  const allowedNavGroups = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => !item.permission || hasPermission(item.permission))
    })).filter(group => group.items.length > 0);
  }, [hasPermission]);

  const isCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = isMobile ? '280px' : width;

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 4px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); }
        .hover-bg-dark:hover { background-color: rgba(255,255,255,0.05); color: #fff !important; }
        .hover-text-white:hover { color: #fff !important; }
      `}</style>

      {isMobile && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark z-2"
          style={{ 
            opacity: mobileOpen ? 0.5 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease-in-out',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside 
        className="d-flex flex-column position-fixed top-0 bottom-0 start-0 z-3 shadow"
        style={{ 
          width: sidebarWidth,
          backgroundColor: '#212529',
          transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
          overflowX: 'hidden'
        }}
      >
        <SidebarHeader isCollapsed={isCollapsed} isMobile={isMobile} setMobileOpen={setMobileOpen} />

        <nav className="sidebar-scroll flex-grow-1 overflow-y-auto overflow-x-hidden pt-2 pb-4">
          {allowedNavGroups.map((group) => (
            <NavGroup 
              key={group.title}
              group={group}
              isActive={activeGroup === group.title}
              onToggle={() => toggleGroup(group.title)}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
              setMobileOpen={setMobileOpen}
            />
          ))}
        </nav>

        {!isMobile && (
          <div className="p-3 border-top border-secondary border-opacity-25 bg-dark">
            <button 
              className="btn btn-dark w-100 d-flex align-items-center justify-content-center text-white-50 hover-bg-dark py-2 border-0 shadow-none" 
              onClick={onToggle}
              style={{ transition: 'all 0.2s' }}
            >
              {isCollapsed ? <ChevronsRight size={20} /> : (
                <>
                  <ChevronsLeft size={20} /> 
                  <span className="ms-2 fw-medium" style={{ whiteSpace: 'nowrap' }}>Thu gọn</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}