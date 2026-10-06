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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center bg-light" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
        <span className="ms-3 text-secondary fw-bold">Đang tải...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
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
          <Route index element={<TrangTongQuan />} />
          <Route path="nhap-may" element={<TrangNhapMayMoc />} />
          <Route path="nhap-phu-kien" element={<TrangNhapPhuKien />} />
          <Route path="kiem-tra" element={<TrangKiemDinh />} />
          <Route path="tra-cuu" element={<TrangTimKiemTonKho />} />
          <Route path="quan-ly-ma-may" element={<TrangQuanLyMaMay />} />
          <Route path="ton-kho-phu-kien" element={<TrangTonKhoPhuKien />} />
          <Route path="ban-may" element={<TrangBanHang />} />
          <Route path="ban-phu-kien" element={<TrangBanPhuKien />} />
          <Route path="lich-su-ban-phu-kien" element={<TrangLichSuBanPhuKien />} />
          <Route path="phan-tich" element={<TrangThongKe />} />
          <Route path="doi-soat" element={<TrangDoiSoat />} />
          <Route path="nhat-ky" element={<TrangNhatKyHoatDong />} />
          <Route path="he-thong" element={<TrangCaiDatHeThong />} />
          <Route path="bang-gia" element={<TrangBangGia />} />
          <Route path="bao-hanh" element={<TrangKiemTraBaoHanh />} />
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