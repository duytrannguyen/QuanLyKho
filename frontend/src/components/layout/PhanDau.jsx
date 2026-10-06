import { useState } from 'react';
import { Search, RefreshCw, Settings, Plus, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

export default function PhanDau({ collapsed, sidebarWidth, marginGap = '0px', isMobile, onOpenMenu }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [time] = useState(() => {
    const now = new Date();
    return `Cập nhật ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="position-fixed top-0 end-0 bg-white border-bottom d-flex align-items-center justify-content-between px-3 px-md-4 z-2"
      style={{ left: isMobile ? '0px' : `calc(${sidebarWidth} + ${marginGap})`, height: '64px', transition: 'left 0.3s ease' }}
    >
      <div className="d-flex align-items-center flex-grow-1 gap-2 gap-md-3">
        {isMobile && (
          <button className="btn btn-light d-md-none p-1 border-0" onClick={onOpenMenu}>
            <Menu size={24} />
          </button>
        )}
        {/* Search Input placeholder */}
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Status Badge */}
        <div className="badge bg-primary bg-opacity-10 text-primary border border-primary rounded-pill d-flex align-items-center gap-2 py-1 px-3">
          <span className="bg-primary rounded-circle" style={{ width: '6px', height: '6px' }}></span>
          DỮ LIỆU CHÍNH THỨC
        </div>

        {/* Timestamp */}
        <span className="text-secondary small">{time}</span>

        {/* Refresh Button */}
        <button className="btn btn-light btn-sm d-flex align-items-center gap-1 border d-none d-sm-flex" onClick={() => showToast('Đang làm mới dữ liệu...', 'info')}>
          <Plus size={14} />
          Làm mới
        </button>

        {/* Settings */}
        <button className="btn btn-light btn-sm p-1 d-none d-sm-flex" onClick={() => showToast('Cài đặt cá nhân đang phát triển', 'info')} style={{ width: '32px', height: '32px' }}>
          <Settings size={18} className="text-secondary m-auto" />
        </button>

        {/* User */}
        <div className="d-flex align-items-center gap-3 ps-3 border-start ms-1">
          <div className="text-end" style={{ lineHeight: '1.2' }}>
            <div className="fw-bold small">{user?.username || 'User'}</div>
            <div className="text-secondary" style={{ fontSize: '0.7rem' }}>{user?.role || 'Quản lý'}</div>
          </div>
          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #ef4444, #f97316)', cursor: 'pointer' }}>
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
