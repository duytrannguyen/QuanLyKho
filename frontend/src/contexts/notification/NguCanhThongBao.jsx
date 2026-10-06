import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * NguCanhThongBao – Hệ thống thông báo nhỏ (toast-notification) hiển thị góc trên bên phải.
 * Sử dụng Bootstrap 5 Toast Component.
 */
const NguCanhThongBao = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'primary') => {
    const id = Date.now() + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type, time: new Date() }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
    <NguCanhThongBao.Provider value={{ showToast, confirm }}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3 mt-5" style={{ zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast show align-items-center text-bg-${t.type} border-0 mb-2 shadow-lg`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="toast-header">
              <strong className="me-auto">{t.isConfirm ? 'Xác nhận' : 'Thông báo'}</strong>
              <small className={t.type === 'light' ? 'text-muted' : ''}>vừa xong</small>
              {!t.isConfirm && (
                <button type="button" className="btn-close" onClick={() => removeToast(t.id)}></button>
              )}
            </div>
            <div className="toast-body">
              {t.message}
              {t.isConfirm && (
                <div className="mt-2 pt-2 border-top d-flex justify-content-end gap-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => t.onResolve(false)}>Hủy</button>
                  <button className="btn btn-sm btn-primary" onClick={() => t.onResolve(true)}>OK</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </NguCanhThongBao.Provider>
  );
};

export const useToast = () => {
  const contexts = useContext(NguCanhThongBao);
  if (!contexts) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return contexts;
};
