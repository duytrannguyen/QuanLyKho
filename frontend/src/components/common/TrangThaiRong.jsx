import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * Component Hiển thị Trạng Thái Rỗng / Không Có Dữ Liệu
 */
export default function TrangThaiRong({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  message = 'Không tìm thấy dữ liệu phù hợp với điều kiện lọc hiện tại.',
  actionButton = null,
  className = 'py-5 my-3'
}) {
  return (
    <div className={`text-center ${className}`}>
      <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 shadow-sm">
        <Icon size={44} className="text-secondary opacity-50" />
      </div>
      <h6 className="fw-bold text-dark mb-1">{title}</h6>
      <p className="text-muted small mb-3" style={{ maxWidth: '420px', margin: '0 auto' }}>
        {message}
      </p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}

