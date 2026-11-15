import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, ClipboardCheck, Search, BarChart3,
  FileText, Settings, ChevronsLeft, ChevronsRight, ShoppingCart, List, Tag, 
  ShieldCheck, ChevronRight, Package, History, X, Wrench, ShoppingBag, TrendingUp, Cpu, Users, Clock, Truck
} from 'lucide-react';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import logoQK from '../../assets/qkshop_logo.png';
import qkMark from '../../assets/qkshop_mark.png';

// 1. PHÂN CHIA NHÓM THEO LUỒNG NGHIỆP VỤ THỰC TẾ & TẦN SUẤT SỬ DỤNG (ĐẦY ĐỦ 24 CHỨC NĂNG)
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
    title: 'BÁN HÀNG & GIAO VẬN',
    items: [
      { path: '/ban-may', label: 'Bán máy (POS)', icon: ShoppingCart, permission: 'SALE_MACHINE' },
      { path: '/ban-phu-kien', label: 'Bán phụ kiện lẻ', icon: ShoppingBag, permission: 'SALE_ACCESSORY' },
      { path: '/lich-su-ban-phu-kien', label: 'Lịch sử bán phụ kiện', icon: History, permission: 'ACCESSORY_HISTORY' },
      { path: '/don-ship', label: 'Đơn ship & Giao hàng', icon: Truck, permission: 'SHIP_MANAGE' },
      { path: '/bang-gia', label: 'Bảng giá niêm yết', icon: Tag, permission: 'PRICING_VIEW|PRICING_MANAGE' },
    ]
  },
  {
    title: 'KHO MÁY & KIỂM ĐỊNH',
    items: [
      { path: '/tra-cuu', label: 'Tồn kho máy', icon: Search, permission: 'SEARCH_INVENTORY|MACHINE_UPDATE|MACHINE_EXPORT_OTHER' },
      { path: '/nhap-may', label: 'Nhập kho máy', icon: PackagePlus, permission: 'IMPORT_MACHINE' },
      { path: '/kiem-tra', label: 'Kiểm định chất lượng', icon: ClipboardCheck, permission: 'INSPECTION' },
      { path: '/quan-ly-ma-may', label: 'Quản lý mã máy (Serial)', icon: List, permission: 'MANAGE_MACHINE_CODES' },
    ]
  },
  {
    title: 'KHO LINH KIỆN & PHỤ KIỆN',
    items: [
      { path: '/ton-kho-phu-kien', label: 'Kho phụ kiện', icon: Package, permission: 'INVENTORY_ACCESSORY|ACCESSORY_MANAGE' },
      { path: '/nhap-phu-kien', label: 'Nhập kho phụ kiện', icon: PackagePlus, permission: 'IMPORT_ACCESSORY' },
      { path: '/ton-kho-linh-kien', label: 'Kho linh kiện', icon: Cpu, permission: 'INVENTORY_PART|PART_MANAGE' },
      { path: '/nhap-linh-kien', label: 'Nhập kho linh kiện', icon: PackagePlus, permission: 'IMPORT_PART' },
    ]
  },
  {
    title: 'SỬA CHỮA, BẢO HÀNH & CRM',
    items: [
      { path: '/dich-vu-sua-chua', label: 'Tiếp nhận sửa chữa', icon: Wrench, permission: 'SERVICE_REPAIR' },
      { path: '/tra-cuu-sua-chua', label: 'Tra cứu phiếu sửa chữa', icon: Search, permission: 'SERVICE_VIEW|SERVICE_REPAIR' },
      { path: '/bao-hanh', label: 'Tra cứu đơn & Bảo hành', icon: ShieldCheck, permission: 'WARRANTY_CHECK' },
      { path: '/khach-hang', label: 'Khách hàng (CRM)', icon: Users, permission: 'CRM_VIEW|CRM_CARE|CRM_MANAGE' },
      { path: '/khach-hang/het-han-bao-hanh', label: 'Máy hết hạn bảo hành', icon: Clock, permission: 'CRM_VIEW|CRM_CARE|CRM_MANAGE' },
    ]
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { path: '/nhat-ky', label: 'Nhật ký hoạt động', icon: FileText, permission: 'LOGS_VIEW' },
      { path: '/he-thong', label: 'Cài đặt hệ thống', icon: Settings },
    ]
  }
];

// Kiểm tra đường dẫn hiện tại có khớp với item hay không
const isPathMatching = (itemPath, currentPathname) => {
  if (itemPath === '/' || itemPath === '/khach-hang') {
    return currentPathname === itemPath;
  }
  return currentPathname === itemPath || currentPathname.startsWith(`${itemPath}/`);
};

// 2. HEADER
const SidebarHeader = ({ isCollapsed, isMobile, setMobileOpen }) => (
  <div
    className={`d-flex align-items-center px-3 py-2 border-bottom border-secondary border-opacity-25 ${
      isCollapsed ? 'justify-content-center' : ''
    }`}
    style={{ minHeight: '72px' }}
  >
    {isCollapsed ? (
      <div
        className="bg-white d-flex justify-content-center align-items-center rounded-3 flex-shrink-0 shadow-sm"
        style={{ width: '46px', height: '38px', padding: '4px' }}
        title="QKShop.vn - Tồn Kho V2"
      >
        <img src={qkMark} alt="QKShop" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    ) : (
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <div
          className="bg-white rounded-3 px-2 py-1 shadow-sm d-inline-flex align-items-center justify-content-center align-self-start"
          style={{ maxWidth: '100%' }}
        >
          <img
            src={logoQK}
            alt="QKShop.vn"
            style={{ height: '28px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div
          className="text-white-50 fw-semibold mt-1 ps-1"
          style={{ fontSize: '11px', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}
        >
          Hệ thống vận hành - Kho Hàng
        </div>
      </div>
    )}

    {isMobile && (
      <button className="btn btn-link text-white-50 p-0 ms-auto" onClick={() => setMobileOpen(false)}>
        <X size={24} />
      </button>
    )}
  </div>
);

// 3. NAV ITEM
const NavItem = ({ item, isCollapsed, isMobile, setMobileOpen }) => {
  const { path, label, icon: Icon } = item;

  return (
    <NavLink
      to={path}
      end={path === '/' || path === '/khach-hang'}
      onClick={() => isMobile && setMobileOpen(false)}
      className={({ isActive }) =>
        `nav-link d-flex align-items-center mb-1 rounded-3 text-nowrap transition-all border-0 ${
          isActive
            ? 'active bg-primary text-white shadow-sm fw-medium'
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
          <Icon size={19} className="flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
          <span
            className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'd-none' : 'opacity-100 w-auto ms-3'
            }`}
            style={{ fontSize: '13.5px', whiteSpace: 'nowrap' }}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};

// 4. NAV GROUP
const NavGroup = ({ group, isActive, hasActiveChild, onToggle, isCollapsed, isMobile, setMobileOpen }) => {
  const showContent = isCollapsed || isActive;

  return (
    <div className={`mb-1 ${isCollapsed ? 'border-bottom border-secondary border-opacity-10 pb-2 mb-2 mx-2' : ''}`}>
      {!isCollapsed && (
        <div
          className={`d-flex justify-content-between align-items-center px-3 py-2 user-select-none hover-text-white ${
            hasActiveChild ? 'text-white' : 'text-white-50'
          }`}
          onClick={onToggle}
          style={{ cursor: 'pointer', transition: 'color 0.2s ease' }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <span
              className="fw-bold text-uppercase text-truncate"
              style={{ fontSize: '11px', letterSpacing: '0.5px' }}
            >
              {group.title}
            </span>
            {hasActiveChild && !isActive && (
              <span
                className="rounded-circle bg-primary d-inline-block flex-shrink-0"
                style={{ width: '6px', height: '6px' }}
                title="Đang ở trang thuộc nhóm này"
              />
            )}
          </div>
          <ChevronRight
            size={15}
            className="flex-shrink-0"
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
          <div
            className={`nav nav-pills flex-column ${isCollapsed ? 'px-0' : 'px-2'}`}
            style={{ minHeight: 0 }}
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
      </div>
    </div>
  );
};

// 5. MAIN SIDEBAR
export default function ThanhBen({ collapsed, onToggle, width, isMobile, mobileOpen, setMobileOpen }) {
  const { hasPermission } = useAuth();
  const location = useLocation();

  // Accordion Độc quyền: Mở sẵn nhóm chứa trang hiện tại
  const [activeGroup, setActiveGroup] = useState(() => {
    const currentGroup = navGroups.find(g =>
      g.items.some(item => isPathMatching(item.path, location.pathname))
    );
    return currentGroup ? currentGroup.title : navGroups[0].title;
  });

  useEffect(() => {
    if (!collapsed) {
      const currentGroup = navGroups.find(g =>
        g.items.some(item => isPathMatching(item.path, location.pathname))
      );
      if (currentGroup) {
        setActiveGroup(currentGroup.title);
      }
    }
  }, [location.pathname, collapsed]);

  const toggleGroup = (title) => {
    setActiveGroup(prev => (prev === title ? null : title));
  };

  const allowedNavGroups = useMemo(() => {
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => !item.permission || hasPermission(item.permission))
      }))
      .filter(group => group.items.length > 0);
  }, [hasPermission]);

  const isCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = isMobile ? 'min(290px, 85vw)' : width;

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 4px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); }
        .hover-bg-dark:hover { background-color: rgba(255,255,255,0.06); color: #fff !important; }
        .hover-text-white:hover { color: #fff !important; }
      `}</style>

      {isMobile && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
          style={{
            opacity: mobileOpen ? 0.5 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease-in-out',
            backdropFilter: 'blur(2px)',
            zIndex: 1040
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className="d-flex flex-column position-fixed top-0 bottom-0 start-0 shadow"
        style={{
          width: sidebarWidth,
          backgroundColor: '#212529',
          transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
          overflowX: 'hidden',
          zIndex: 1045
        }}
      >
        <SidebarHeader isCollapsed={isCollapsed} isMobile={isMobile} setMobileOpen={setMobileOpen} />

        <nav className="sidebar-scroll flex-grow-1 overflow-y-auto overflow-x-hidden pt-2 pb-4">
          {allowedNavGroups.map((group) => {
            const hasActiveChild = group.items.some(item =>
              isPathMatching(item.path, location.pathname)
            );
            return (
              <NavGroup
                key={group.title}
                group={group}
                isActive={activeGroup === group.title}
                hasActiveChild={hasActiveChild}
                onToggle={() => toggleGroup(group.title)}
                isCollapsed={isCollapsed}
                isMobile={isMobile}
                setMobileOpen={setMobileOpen}
              />
            );
          })}
        </nav>

        {!isMobile && (
          <div className="p-3 border-top border-secondary border-opacity-25 bg-dark">
            <button
              className="btn btn-dark w-100 d-flex align-items-center justify-content-center text-white-50 hover-bg-dark py-2 border-0 shadow-none"
              onClick={onToggle}
              style={{ transition: 'all 0.2s' }}
            >
              {isCollapsed ? (
                <ChevronsRight size={20} />
              ) : (
                <>
                  <ChevronsLeft size={20} />
                  <span className="ms-2 fw-medium" style={{ whiteSpace: 'nowrap' }}>
                    Thu gọn
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}