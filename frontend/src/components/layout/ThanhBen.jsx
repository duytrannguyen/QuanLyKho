import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, ClipboardCheck,
  Search, BarChart3, RefreshCw, FileText, Settings, 
  ChevronsLeft, ChevronsRight, ShoppingCart, List, Tag, ShieldCheck,
  ChevronRight, Package, History, X
} from 'lucide-react';
import '../../styles/Sidebar.css';

const navGroups = [
  {
    title: 'TỔNG QUAN',
    items: [
      { path: '/', label: 'Điều hành', icon: LayoutDashboard },
      { path: '/phan-tich', label: 'Phân tích', icon: BarChart3 },
    ]
  },
  {
    title: 'BÁN HÀNG',
    items: [
      { path: '/ban-may', label: 'Bán máy', icon: ShoppingCart },
      { path: '/ban-phu-kien', label: 'Bán phụ kiện lẻ', icon: ShoppingCart },
      { path: '/bang-gia', label: 'Bảng giá', icon: Tag },
    ]
  },
  {
    title: 'KHO HÀNG',
    items: [
      { path: '/quan-ly-ma-may', label: 'Quản lý mã máy', icon: List },
      { path: '/nhap-may', label: 'Nhập máy', icon: PackagePlus },
      { path: '/nhap-phu-kien', label: 'Nhập phụ kiện', icon: PackagePlus },
      { path: '/ton-kho-phu-kien', label: 'Tồn kho phụ kiện', icon: Package },
      { path: '/kiem-tra', label: 'Kiểm tra máy', icon: ClipboardCheck },
    ]
  },
  {
    title: 'HẬU MÃI & TRA CỨU',
    items: [
      { path: '/tra-cuu', label: 'Tra cứu chung', icon: Search },
      { path: '/lich-su-ban-phu-kien', label: 'Lịch sử phụ kiện', icon: History },
      { path: '/bao-hanh', label: 'Bảo hành', icon: ShieldCheck },
    ]
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { path: '/doi-soat', label: 'Đối soát & đồng bộ', icon: RefreshCw },
      { path: '/nhat-ky', label: 'Nhật ký', icon: FileText },
      { path: '/he-thong', label: 'Cấu hình', icon: Settings },
    ]
  }
];

export default function ThanhBen({ collapsed, onToggle, width, isMobile, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    const currentGroup = navGroups.find(group => 
      group.items.some(item => item.path === location.pathname)
    );
    if (currentGroup) {
      setActiveGroup(currentGroup.title);
    }
  }, [location.pathname]);

  const toggleGroup = (title) => {
    setActiveGroup(prev => (prev === title ? null : title));
  };

  // Xác định trạng thái của Sidebar dựa trên loại thiết bị
  const isCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = isMobile ? '280px' : width;
  
  return (
    <>
      {/* OVERLAY CHO MOBILE */}
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

      {/* SIDEBAR CHÍNH */}
      <aside 
        className="d-flex flex-column position-fixed top-0 bottom-0 start-0 z-3 shadow-lg"
        style={{ 
          width: sidebarWidth,
          backgroundColor: '#0b1727',
          transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
          transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)'
        }}
      >
      {/* HEADER / LOGO */}
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
          <div 
            className="ms-3 text-white text-truncate flex-grow-1"
            style={{ transition: 'opacity 0.3s ease', opacity: isCollapsed ? 0 : 1 }}
          >
            <div className="fw-bold fs-6 tracking-wide">Tồn Kho V2</div>
            <div className="small text-info opacity-75" style={{ fontSize: '0.75rem' }}>QKShop · Vận hành</div>
          </div>
        )}
        {/* Nút đóng trên mobile */}
        {isMobile && (
          <button className="btn btn-link text-white-50 p-1 ms-auto" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-grow-1 px-3 py-2 hide-scrollbar overflow-y-auto" style={{ overflowX: 'hidden' }}>
        {navGroups.map((group) => {
          const isOpen = activeGroup === group.title;
          const showContent = isCollapsed ? false : (collapsed || isOpen);

          return (
            <div key={group.title} className="mb-3">
              {/* Tiêu đề nhóm */}
              {!isCollapsed && (
                <div 
                  className="d-flex align-items-center justify-content-between px-2 py-2 mb-1 text-white-50 user-select-none"
                  onClick={() => toggleGroup(group.title)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >
                  <span className="fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                    {group.title}
                  </span>
                  
                  {/* Hiệu ứng Mũi tên xoay mượt mà */}
                  <ChevronRight 
                    size={16} 
                    style={{ 
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }} 
                  />
                </div>
              )}
              
              {/* Danh sách Menu con - Hiệu ứng Accordion mượt mà */}
              <div 
                className="d-flex flex-column gap-1 overflow-hidden" 
                style={{
                  maxHeight: showContent ? '400px' : '0', 
                  opacity: showContent ? 1 : 0,           
                  transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                  marginLeft: '0px'
                }}
              >
                {group.items.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    title={collapsed ? label : undefined}
                    className="text-decoration-none"
                  >
                    {({ isActive }) => (
                      <div 
                        onClick={() => isMobile && setMobileOpen(false)}
                        className={`d-flex align-items-center rounded-3 ${isCollapsed ? 'justify-content-center px-0 py-2 mx-auto' : 'px-3 py-2'}`}
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
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                          }
                        }}
                      >
                        <Icon size={18} className="flex-shrink-0" style={{ transition: 'stroke-width 0.2s ease', strokeWidth: isActive ? 2.5 : 2 }} />
                        {!isCollapsed && (
                          <span className="ms-3 text-truncate fw-medium" style={{ fontSize: '0.85rem' }}>
                            {label}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* FOOTER / TOGGLE BUTTON */}
      {!isMobile && (
        <div className="mt-auto p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            className="btn w-100 d-flex align-items-center justify-content-center text-white-50 border-0 py-2 rounded-3 shadow-none" 
            onClick={onToggle} 
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            {isCollapsed ? (
              <ChevronsRight size={18} />
            ) : (
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