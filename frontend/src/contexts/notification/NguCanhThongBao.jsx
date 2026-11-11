import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * NguCanhThongBao – Hệ thống thông báo nhỏ (toast-notification) hiển thị góc trên bên phải.
 * Sử dụng Bootstrap 5 Toast Component.
 */
const NguCanhThongBao = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'primary') => {
    const id = Date.now() + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type, time: new Date() }]);

    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
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

  const contextValue = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <NguCanhThongBao.Provider value={contextValue}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3 mt-5" style={{ zIndex: 9999 }}>
        {toasts.map(t => {
          const bgType = t.type === 'error' ? 'danger' : t.type;
          return (
            <div key={t.id} className={`toast show align-items-center text-bg-${bgType} border-0 mb-2 shadow-lg`} role="alert" aria-live="assertive" aria-atomic="true">
              <div className="toast-header">
                <strong className="me-auto">{t.isConfirm ? 'Xác nhận' : 'Thông báo'}</strong>
                <small className={bgType === 'light' ? 'text-muted' : ''}>vừa xong</small>
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
          );
        })}
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
