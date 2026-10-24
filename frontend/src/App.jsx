// Import Bootstrap 5 CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// (Tuỳ chọn) Import Bootstrap JS nếu bạn cần dùng Dropdown, Modal, Collapse...
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/NguCanhXacThuc';
import { ToastProvider } from './contexts/notification/NguCanhThongBao';
import BoCucChinh from './components/layout/BoCucChinh';

// Lazy loading components
const TrangDangNhap = React.lazy(() => import('./pages/DangNhap/TrangDangNhap'));
const TrangTongQuan = React.lazy(() => import('./pages/TongQuan/TrangTongQuan'));
const TrangNhapMayMoc = React.lazy(() => import('./pages/NhapMayMoc/TrangNhapMayMoc'));
const TrangKiemDinh = React.lazy(() => import('./pages/KiemDinh/TrangKiemDinh'));
const TrangTimKiemTonKho = React.lazy(() => import('./pages/TimKiemTonKho/TrangTimKiemTonKho'));
const TrangBanHang = React.lazy(() => import('./pages/BanHang/TrangBanHang'));
const TrangThongKe = React.lazy(() => import('./pages/ThongKe/TrangThongKe'));
const TrangDoiSoat = React.lazy(() => import('./pages/DoiSoat/TrangDoiSoat'));
const TrangNhatKyHoatDong = React.lazy(() => import('./pages/NhatKyHoatDong/TrangNhatKyHoatDong'));
const TrangCaiDatHeThong = React.lazy(() => import('./pages/CaiDatHeThong/TrangCaiDatHeThong'));
const TrangQuanLyMaMay = React.lazy(() => import('./pages/QuanLyMaMay/TrangQuanLyMaMay'));
const TrangBangGia = React.lazy(() => import('./pages/BangGia/TrangBangGia'));
const TrangKiemTraBaoHanh = React.lazy(() => import('./pages/KiemTraBaoHanh/TrangKiemTraBaoHanh'));
const TrangNhapPhuKien = React.lazy(() => import('./pages/NhapPhuKien/TrangNhapPhuKien'));
const TrangTonKhoPhuKien = React.lazy(() => import('./pages/TonKhoPhuKien/TrangTonKhoPhuKien'));
const TrangBanPhuKien = React.lazy(() => import('./pages/BanPhuKien/TrangBanPhuKien'));
const TrangLichSuBanPhuKien = React.lazy(() => import('./pages/LichSuBanPhuKien/TrangLichSuBanPhuKien'));

function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center bg-light" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
        <span className="ms-3 text-secondary fw-bold">Đang tải...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (permission && !hasPermission(permission)) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '520px', borderRadius: '16px' }}>
          <div className="text-warning mb-3">
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="fw-bold text-dark mb-2">Từ chối quyền truy cập</h4>
          <p className="text-secondary mb-4">Tài khoản của bạn chưa được cấp quyền để truy cập tính năng này. Vui lòng liên hệ quản trị viên hệ thống để được cấp quyền.</p>
          <div>
            <a href="/" className="btn btn-primary px-4">Quay về trang chủ</a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function LoadingSpinner() {
  return (
    <div className="d-flex align-items-center justify-content-center p-5">
      <div className="spinner-border text-primary" role="status"></div>
      <span className="ms-3 text-secondary fw-bold">Đang tải trang...</span>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <TrangDangNhap />
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <BoCucChinh />
          </ProtectedRoute>
        }>
          <Route index element={<ProtectedRoute permission="DASHBOARD_VIEW"><TrangTongQuan /></ProtectedRoute>} />
          <Route path="nhap-may" element={<ProtectedRoute permission="IMPORT_MACHINE"><TrangNhapMayMoc /></ProtectedRoute>} />
          <Route path="nhap-phu-kien" element={<ProtectedRoute permission="IMPORT_ACCESSORY"><TrangNhapPhuKien /></ProtectedRoute>} />
          <Route path="kiem-tra" element={<ProtectedRoute permission="INSPECTION"><TrangKiemDinh /></ProtectedRoute>} />
          <Route path="tra-cuu" element={<ProtectedRoute permission="SEARCH_INVENTORY"><TrangTimKiemTonKho /></ProtectedRoute>} />
          <Route path="quan-ly-ma-may" element={<ProtectedRoute permission="MANAGE_MACHINE_CODES"><TrangQuanLyMaMay /></ProtectedRoute>} />
          <Route path="ton-kho-phu-kien" element={<ProtectedRoute permission="INVENTORY_ACCESSORY"><TrangTonKhoPhuKien /></ProtectedRoute>} />
          <Route path="ban-may" element={<ProtectedRoute permission="SALE_MACHINE"><TrangBanHang /></ProtectedRoute>} />
          <Route path="ban-phu-kien" element={<ProtectedRoute permission="SALE_ACCESSORY"><TrangBanPhuKien /></ProtectedRoute>} />
          <Route path="lich-su-ban-phu-kien" element={<ProtectedRoute permission="ACCESSORY_HISTORY"><TrangLichSuBanPhuKien /></ProtectedRoute>} />
          <Route path="phan-tich" element={<ProtectedRoute permission="ANALYTICS_VIEW"><TrangThongKe /></ProtectedRoute>} />
          <Route path="doi-soat" element={<ProtectedRoute permission="SYNC_MANAGE"><TrangDoiSoat /></ProtectedRoute>} />
          <Route path="nhat-ky" element={<ProtectedRoute permission="LOGS_VIEW"><TrangNhatKyHoatDong /></ProtectedRoute>} />
          <Route path="he-thong" element={<ProtectedRoute permission="SYSTEM_MANAGE"><TrangCaiDatHeThong /></ProtectedRoute>} />
          <Route path="bang-gia" element={<ProtectedRoute permission="PRICING_VIEW"><TrangBangGia /></ProtectedRoute>} />
          <Route path="bao-hanh" element={<ProtectedRoute permission="WARRANTY_CHECK"><TrangKiemTraBaoHanh /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}


export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}