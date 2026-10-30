import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, ClipboardCheck, Search, BarChart3, RefreshCw, 
  FileText, Settings, ChevronsLeft, ChevronsRight, ShoppingCart, List, Tag, 
  ShieldCheck, ChevronRight, Package, History, X, Wrench, ShoppingBag, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import '../../styles/Sidebar.css';

// 1. CHUẨN HÓA DATA: Sắp xếp lại thứ tự logic nghiệp vụ
const navGroups = [
  {
    title: 'TỔNG QUAN',
    items: [
      { path: '/', label: 'Bàn điều hành', icon: LayoutDashboard, permission: 'DASHBOARD_VIEW' },
      { path: '/bao-cao-ban-hang', label: 'Báo cáo doanh số', icon: TrendingUp, permission: 'SALES_REPORT_VIEW' },
      { path: '/phan-tich', label: 'Báo cáo thống kê', icon: BarChart3, permission: 'ANALYTICS_VIEW' },
    ]
  },
  {
    title: 'KINH DOANH & BÁN HÀNG',
    items: [
      { path: '/ban-may', label: 'Bán máy', icon: ShoppingCart, permission: 'SALE_MACHINE' },
      { path: '/ban-phu-kien', label: 'Bán phụ kiện lẻ', icon: ShoppingBag, permission: 'SALE_ACCESSORY' },
      { path: '/lich-su-ban-phu-kien', label: 'Lịch sử bán phụ kiện', icon: History, permission: 'ACCESSORY_HISTORY' },
      { path: '/bang-gia', label: 'Bảng giá niêm yết', icon: Tag, permission: 'PRICING_VIEW' },
    ]
  },
  {
    title: 'QUẢN LÝ KHO', // Gộp Kho máy & Kho phụ kiện cho liền mạch
    items: [
      { path: '/nhap-may', label: 'Nhập kho máy', icon: PackagePlus, permission: 'IMPORT_MACHINE' },
      { path: '/kiem-tra', label: 'Kiểm định máy', icon: ClipboardCheck, permission: 'INSPECTION' },
      { path: '/quan-ly-ma-may', label: 'Quản lý mã máy', icon: List, permission: 'MANAGE_MACHINE_CODES' },
      { path: '/tra-cuu', label: 'Tra cứu tồn kho máy', icon: Search, permission: 'SEARCH_INVENTORY' },
      { path: '/nhap-phu-kien', label: 'Nhập kho phụ kiện', icon: PackagePlus, permission: 'IMPORT_ACCESSORY' },
      { path: '/ton-kho-phu-kien', label: 'Tồn kho phụ kiện', icon: Package, permission: 'INVENTORY_ACCESSORY' },
    ]
  },
  {
    title: 'DỊCH VỤ & BẢO HÀNH',
    items: [
      { path: '/dich-vu-sua-chua', label: 'Dịch vụ sửa chữa', icon: Wrench, permission: 'SERVICE_REPAIR' },
      { path: '/tra-cuu-sua-chua', label: 'Tra cứu dịch vụ', icon: Search, permission: 'SERVICE_REPAIR' },
      { path: '/bao-hanh', label: 'Tra cứu bảo hành', icon: ShieldCheck, permission: 'WARRANTY_CHECK' },
    ]
  },
  {
    title: 'HỆ THỐNG & ĐỐI SOÁT',
    items: [
      { path: '/doi-soat', label: 'Đối soát & Google Sheet', icon: RefreshCw, permission: 'SYNC_MANAGE' },
      { path: '/nhat-ky', label: 'Nhật ký hoạt động', icon: FileText, permission: 'LOGS_VIEW' },
      { path: '/he-thong', label: 'Cấu hình & Phân quyền', icon: Settings, permission: 'SYSTEM_MANAGE' },
    ]
  }
];

// 2. TÁCH COMPONENTS CON ĐỂ TĂNG TÍNH ĐỌC HIỂU
const SidebarHeader = ({ isCollapsed, isMobile, setMobileOpen }) => (
  <div className="d-flex align-items-center p-3 mb-2" style={{ height: '78px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div 
      className="d-flex align-items-center justify-content-center text-white fw-bold rounded-4 flex-shrink-0 shadow" 
      style={{ 
        width: '42px', height: '42px', 
        background: 'linear-gradient(135deg, #0d6efd, #0dcaf0)',
        boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)'
      }}
    >
      QK
    </div>
    {!isCollapsed && (
      <div className="ms-3 text-white text-truncate flex-grow-1" style={{ transition: 'opacity 0.3s ease' }}>
        <div className="fw-bold fs-6 tracking-wide">Tồn Kho V2</div>
        <div className="small text-info opacity-75" style={{ fontSize: '0.75rem' }}>QKShop · Vận hành</div>
      </div>
    )}
    {isMobile && (
      <button className="btn btn-link text-white-50 p-1 ms-auto" onClick={() => setMobileOpen(false)}>
        <X size={20} />
      </button>
    )}
  </div>
);

const NavItem = ({ item, isCollapsed, isMobile, setMobileOpen }) => {
  const { path, label, icon: Icon } = item;
  
  return (
    <NavLink to={path} end={path === '/'} title={isCollapsed ? label : undefined} className="text-decoration-none">
      {({ isActive }) => (
        <div 
          onClick={() => isMobile && setMobileOpen(false)}
          className={`sidebar-nav-item d-flex align-items-center rounded-3 ${isCollapsed ? 'justify-content-center px-0 py-2 mx-auto' : 'px-3 py-2'}`}
          style={{
            width: isCollapsed ? '44px' : '100%',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
            background: isActive 
              ? (isCollapsed ? 'rgba(13,110,253,0.15)' : 'linear-gradient(90deg, rgba(13,110,253,0.15) 0%, rgba(13,110,253,0) 100%)') 
              : 'transparent',
            borderLeft: (!isCollapsed && isActive) ? '3px solid #0d6efd' : '3px solid transparent', 
            transition: 'all 0.2s ease',
            transform: (!isCollapsed && isActive) ? 'translateX(4px)' : 'translateX(0)' 
          }}
          // Mẹo: Tốt nhất bạn nên chuyển hover styles này vào Sidebar.css (.sidebar-nav-item:hover)
          onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)', e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        >
          <Icon size={18} className="flex-shrink-0" style={{ transition: 'stroke-width 0.2s ease', strokeWidth: isActive ? 2.5 : 2 }} />
          {!isCollapsed && <span className="ms-3 text-truncate fw-medium" style={{ fontSize: '0.85rem' }}>{label}</span>}
        </div>
      )}
    </NavLink>
  );
};

const NavGroup = ({ group, isActive, onToggle, isCollapsed, isMobile, setMobileOpen }) => {
  const showContent = isActive && !isCollapsed; // Logic đơn giản và rõ ràng hơn

  return (
    <div className="mb-3">
      {!isCollapsed && (
        <div 
          className="d-flex align-items-center justify-content-between px-2 py-2 mb-1 text-white-50 user-select-none group-header"
          onClick={onToggle}
          style={{ cursor: 'pointer', transition: 'color 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <span className="fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
            {group.title}
          </span>
          <ChevronRight 
            size={16} 
            style={{ 
              transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
            }} 
          />
        </div>
      )}
      
      <div 
        className="d-flex flex-column gap-1 overflow-hidden" 
        style={{
          maxHeight: showContent ? '400px' : '0', 
          opacity: showContent ? 1 : 0,         
          transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
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
  );
};


// 3. COMPONENT CHÍNH TRỞ NÊN VÔ CÙNG GỌN GÀNG
export default function ThanhBen({ collapsed, onToggle, width, isMobile, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [activeGroup, setActiveGroup] = useState(null);

  // Lọc quyền người dùng
  const allowedNavGroups = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => !item.permission || hasPermission(item.permission))
    })).filter(group => group.items.length > 0);
  }, [hasPermission]);

  // Tự động mở Group chứa URL hiện tại
  useEffect(() => {
    const currentGroup = allowedNavGroups.find(group => 
      group.items.some(item => item.path === location.pathname)
    );
    if (currentGroup) setActiveGroup(currentGroup.title);
  }, [location.pathname, allowedNavGroups]);

  const isCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = isMobile ? '280px' : width;
  
  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark z-3"
          style={{ 
            opacity: mobileOpen ? 0.5 : 0, 
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside 
        className="d-flex flex-column position-fixed top-0 bottom-0 start-0 z-3 shadow-lg"
        style={{ 
          width: sidebarWidth,
          backgroundColor: '#0b1727',
          transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)'
        }}
      >
        <SidebarHeader isCollapsed={isCollapsed} isMobile={isMobile} setMobileOpen={setMobileOpen} />

        {/* Navigation List */}
        <nav className="flex-grow-1 px-3 py-2 hide-scrollbar overflow-y-auto" style={{ overflowX: 'hidden' }}>
          {allowedNavGroups.map((group) => (
            <NavGroup 
              key={group.title}
              group={group}
              isActive={activeGroup === group.title}
              onToggle={() => setActiveGroup(prev => prev === group.title ? null : group.title)}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
              setMobileOpen={setMobileOpen}
            />
          ))}
        </nav>

        {/* Footer Toggle Button */}
        {!isMobile && (
          <div className="mt-auto p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              className="btn w-100 d-flex align-items-center justify-content-center text-white-50 border-0 py-2 rounded-3 shadow-none" 
              onClick={onToggle} 
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              {isCollapsed ? <ChevronsRight size={18} /> : (
                <>
                  <ChevronsLeft size={18} /> 
                  <span className="ms-2 fw-medium" style={{ fontSize: '0.85rem' }}>Thu gọn Sidebar</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}