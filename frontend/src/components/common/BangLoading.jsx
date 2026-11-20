import React from 'react';

/**
 * Component Hiển thị Trạng Thái Đang Tải Trong Bảng Dữ Liệu
 */
export default function BangLoading({
  colSpan = 8,
  message = 'Đang tải dữ liệu từ máy chủ...',
  className = 'py-5 text-center'
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={className}>
        <div className="spinner-border spinner-border-sm text-primary mb-2" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <div className="text-muted small fw-medium">{message}</div>
      </td>
    </tr>
  );
}

