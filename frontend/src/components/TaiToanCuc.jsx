import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export default function TaiToanCuc() {
  const [loadingCount, setLoadingCount] = useState(0);

  useEffect(() => {
    // Add interceptors
    const reqInterceptor = axiosClient.interceptors.request.use((config) => {
      setLoadingCount(prev => prev + 1);
      return config;
    });

    const resInterceptor = axiosClient.interceptors.response.use(
      (response) => {
        // Add a tiny artificial delay so the user can actually see the spinner on fast localhost
        setTimeout(() => {
          setLoadingCount(prev => Math.max(prev - 1, 0));
        }, 300);
        return response;
      },
      (error) => {
        setTimeout(() => {
          setLoadingCount(prev => Math.max(prev - 1, 0));
        }, 300);
        return Promise.reject(error);
      }
    );

    return () => {
      // Cleanup interceptors
      axiosClient.interceptors.request.eject(reqInterceptor);
      axiosClient.interceptors.response.eject(resInterceptor);
    };
  }, []);

  if (loadingCount === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '20vh',
      zIndex: 99,
      transition: 'opacity 0.2s ease-in-out'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '24px 32px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div className="spinner-border text-secondary" style={{ width: '2.5rem', height: '2.5rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--gray-700)' }}>
          Đang xử lý...
        </div>
      </div>
    </div>
  );
}
