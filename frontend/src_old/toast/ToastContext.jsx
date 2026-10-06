import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import './ToastContext.css';

/**
 * ToastContext – Hệ thống thông báo nhỏ (toast) hiển thị góc trên bên phải.
 *
 * Cung cấp 2 loại thông báo:
 * 1. showToast(message, type): Thông báo thông thường (tự động đóng sau 3 giây)
 *    - type: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'light'
 * 2. confirm(message): Hộp thoại xác nhận (trả về Promise<boolean>)
 *    - true: người dùng bấm OK
 *    - false: người dùng bấm Hủy
 *
 * Tất cả toast được render trong một container cố định (position-fixed top-0 end-0).
 */
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  // Danh sách các toast đang hiển thị
  const [toasts, setToasts] = useState([]);

  /**
   * Hiển thị toast thông báo.
   * Tự động tạo ID duy nhất và xóa sau 3 giây.
   */
  const showToast = useCallback((message, type = 'primary') => {
    const id = Date.now() + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type, time: new Date() }]);

    // Tự động đóng toast sau 3 giây
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  /** Xóa một toast cụ thể ngay lập tức (khi người dùng bấm nút X). */
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Hiển thị hộp thoại xác nhận và trả về Promise.
   * Dùng thay cho window.confirm() (đẹp hơn và không block UI).
   * - resolve(true): khi bấm OK
   * - resolve(false): khi bấm Hủy
   */
  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      const id = Date.now() + Math.random().toString(36).substring(2);
      setToasts(prev => [...prev, {
        id,
        message,
        type: 'light',
        isConfirm: true,
        onResolve: (val) => {
          resolve(val);
          setToasts(current => current.filter(t => t.id !== id));
        }
      }]);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}
      {/* Container cố định ở góc trên bên phải – hiển thị tất cả toast */}
      <div className="toast-container position-fixed top-0 end-0 p-3 mt-5" style={{ zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast show align-items-center text-bg-${t.type} border-0 mb-2 shadow-lg`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="toast-header">
              <strong className="me-auto text-primary">{t.isConfirm ? 'Xác nhận' : 'Thông báo'}</strong>
              <small className="text-muted">vừa xong</small>
              {/* Nút X chỉ hiển thị với toast thông thường (không hiển thị với confirm) */}
              {!t.isConfirm && (
                <button type="button" className="btn-close" onClick={() => removeToast(t.id)}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="toast-body">
              {t.message}
              {/* Nút OK/Hủy cho toast confirm */}
              {t.isConfirm && (
                <div className="mt-3 d-flex justify-content-end gap-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => t.onResolve(false)}>Hủy</button>
                  <button className="btn btn-sm btn-danger" onClick={() => t.onResolve(true)}>OK</button>
                </div>
              )}
            </div>
            {/* Thanh tiến trình tự đóng (chỉ cho toast thông thường) */}
            {!t.isConfirm && <div className="toast-progress"></div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/** Hook để sử dụng ToastContext – sẽ báo lỗi nếu dùng bên ngoài ToastProvider. */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
