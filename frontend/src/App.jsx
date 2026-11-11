// Import Bootstrap 5 CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// (Tuỳ chọn) Import Bootstrap JS nếu bạn cần dùng Dropdown, Modal, Collapse...
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { AuthProvider, useAuth, getPermissionLabel } from './contexts/NguCanhXacThuc';
import { ToastProvider, useToast } from './contexts/notification/NguCanhThongBao';
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
const TrangDonShip = React.lazy(() => import('./pages/DonShip/TrangDonShip'));
const TrangKiemTraBaoHanh = React.lazy(() => import('./pages/KiemTraBaoHanh/TrangKiemTraBaoHanh'));
const TrangNhapPhuKien = React.lazy(() => import('./pages/NhapPhuKien/TrangNhapPhuKien'));
const TrangTonKhoPhuKien = React.lazy(() => import('./pages/TonKhoPhuKien/TrangTonKhoPhuKien'));
const TrangNhapLinhKien = React.lazy(() => import('./pages/NhapLinhKien/TrangNhapLinhKien'));
const TrangTonKhoLinhKien = React.lazy(() => import('./pages/TonKhoLinhKien/TrangTonKhoLinhKien'));
const TrangBanPhuKien = React.lazy(() => import('./pages/BanPhuKien/TrangBanPhuKien'));
const TrangLichSuBanPhuKien = React.lazy(() => import('./pages/LichSuBanPhuKien/TrangLichSuBanPhuKien'));
const TrangSuaChua = React.lazy(() => import('./pages/SuaChua/TrangSuaChua'));
const TrangTraCuuSuaChua = React.lazy(() => import('./pages/SuaChua/TrangTraCuuSuaChua'));
const TrangBaoCaoBanHang = React.lazy(() => import('./pages/BaoCaoBanHang/TrangBaoCaoBanHang'));
const TrangKhachHang = React.lazy(() => import('./pages/KhachHang/TrangKhachHang'));
const TrangMayHetBaoHanh = React.lazy(() => import('./pages/KhachHang/TrangMayHetBaoHanh'));
const TrangChiTietKhachHang = React.lazy(() => import('./pages/KhachHang/TrangChiTietKhachHang'));

function AccessDeniedScreen({ permission }) {
  const { user, getFirstPermittedRoute, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fallbackRoute = getFirstPermittedRoute();
  const requiredLabel = getPermissionLabel(permission);

  useEffect(() => {
    if (permission) {
      showToast(`Bạn không có quyền truy cập trang này. Cần quyền: [${requiredLabel}]`, 'warning');
    }
  }, [permission, requiredLabel, showToast]);

  const handleRefresh = async () => {
    await refreshUser();
    showToast('Đã đồng bộ lại quyền hạn tài khoản của bạn.', 'info');
  };

  return (
    <div className="container py-5 text-center">
      <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '580px', borderRadius: '18px' }}>
        <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10 text-warning" style={{ width: '72px', height: '72px' }}>
          <ShieldAlert size={38} />
        </div>
        <h4 className="fw-bold text-dark mb-2">Không đủ quyền hạn truy cập</h4>
        <p className="text-secondary mb-3">
          Tài khoản <strong className="text-dark">{user?.fullName || user?.username}</strong> ({user?.username}) chưa được cấp quyền truy cập vào chức năng này.
        </p>
        {permission && (
          <div className="bg-light border rounded-3 p-3 mb-4 text-start">
            <div className="small text-secondary mb-1">Quyền hạn yêu cầu để mở chức năng:</div>
            <div className="fw-bold text-danger d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>{requiredLabel}</span>
              <code className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">{permission}</code>
            </div>
          </div>
        )}
        <p className="small text-muted mb-4">
          Nếu bạn cần sử dụng tính năng này cho công việc, vui lòng liên hệ Quản trị viên để được cấp quyền trong mục <strong>Cấu hình &amp; Phân quyền</strong>.
        </p>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          {fallbackRoute && (
            <button
              type="button"
              className="btn btn-primary px-4 d-flex align-items-center gap-2 fw-medium"
              onClick={() => navigate(fallbackRoute, { replace: true })}
            >
              <span>Đi tới trang làm việc của bạn</span>
              <ArrowRight size={16} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary px-3 d-flex align-items-center gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
            <span>Làm mới quyền</span>
          </button>
          {!fallbackRoute && (
            <button
              type="button"
              className="btn btn-outline-danger px-3 d-flex align-items-center gap-2"
              onClick={logout}
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SmartIndexRoute() {
  const { hasPermission, getFirstPermittedRoute } = useAuth();
  if (hasPermission('DASHBOARD_VIEW')) {
    return <TrangTongQuan />;
  }
  const firstRoute = getFirstPermittedRoute();
  if (firstRoute && firstRoute !== '/') {
    return <Navigate to={firstRoute} replace />;
  }
  return <AccessDeniedScreen permission="DASHBOARD_VIEW" />;
}

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
    return <AccessDeniedScreen permission={permission} />;
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
          <Route index element={<SmartIndexRoute />} />
          <Route path="bao-cao-ban-hang" element={<ProtectedRoute permission="SALES_REPORT_VIEW"><TrangBaoCaoBanHang /></ProtectedRoute>} />
          <Route path="nhap-may" element={<ProtectedRoute permission="IMPORT_MACHINE"><TrangNhapMayMoc /></ProtectedRoute>} />
          <Route path="nhap-phu-kien" element={<ProtectedRoute permission="IMPORT_ACCESSORY"><TrangNhapPhuKien /></ProtectedRoute>} />
          <Route path="ton-kho-phu-kien" element={<ProtectedRoute permission="INVENTORY_ACCESSORY|ACCESSORY_MANAGE"><TrangTonKhoPhuKien /></ProtectedRoute>} />
          <Route path="nhap-linh-kien" element={<ProtectedRoute permission="IMPORT_PART"><TrangNhapLinhKien /></ProtectedRoute>} />
          <Route path="ton-kho-linh-kien" element={<ProtectedRoute permission="INVENTORY_PART|PART_MANAGE"><TrangTonKhoLinhKien /></ProtectedRoute>} />
          <Route path="kiem-tra" element={<ProtectedRoute permission="INSPECTION"><TrangKiemDinh /></ProtectedRoute>} />
          <Route path="tra-cuu" element={<ProtectedRoute permission="SEARCH_INVENTORY|MACHINE_UPDATE|MACHINE_EXPORT_OTHER"><TrangTimKiemTonKho /></ProtectedRoute>} />
          <Route path="quan-ly-ma-may" element={<ProtectedRoute permission="MANAGE_MACHINE_CODES"><TrangQuanLyMaMay /></ProtectedRoute>} />
          <Route path="ban-may" element={<ProtectedRoute permission="SALE_MACHINE"><TrangBanHang /></ProtectedRoute>} />
          <Route path="don-ship" element={<ProtectedRoute permission="SHIP_MANAGE"><TrangDonShip /></ProtectedRoute>} />
          <Route path="ban-phu-kien" element={<ProtectedRoute permission="SALE_ACCESSORY"><TrangBanPhuKien /></ProtectedRoute>} />
          <Route path="lich-su-ban-phu-kien" element={<ProtectedRoute permission="ACCESSORY_HISTORY"><TrangLichSuBanPhuKien /></ProtectedRoute>} />
          <Route path="dich-vu-sua-chua" element={<ProtectedRoute permission="SERVICE_REPAIR"><TrangSuaChua /></ProtectedRoute>} />
          <Route path="tra-cuu-sua-chua" element={<ProtectedRoute permission="SERVICE_VIEW|SERVICE_REPAIR"><TrangTraCuuSuaChua /></ProtectedRoute>} />
          <Route path="khach-hang" element={<ProtectedRoute permission="CRM_VIEW|CRM_CARE|CRM_MANAGE"><TrangKhachHang /></ProtectedRoute>} />
          <Route path="khach-hang/het-han-bao-hanh" element={<ProtectedRoute permission="CRM_VIEW|CRM_CARE|CRM_MANAGE"><TrangMayHetBaoHanh /></ProtectedRoute>} />
          <Route path="khach-hang/:id" element={<ProtectedRoute permission="CRM_VIEW|CRM_CARE|CRM_MANAGE"><TrangChiTietKhachHang /></ProtectedRoute>} />
          <Route path="phan-tich" element={<ProtectedRoute permission="ANALYTICS_VIEW"><TrangThongKe /></ProtectedRoute>} />
          <Route path="doi-soat" element={<ProtectedRoute permission="SYNC_VIEW|SYNC_MANAGE"><TrangDoiSoat /></ProtectedRoute>} />
          <Route path="nhat-ky" element={<ProtectedRoute permission="LOGS_VIEW"><TrangNhatKyHoatDong /></ProtectedRoute>} />
          <Route path="he-thong" element={<ProtectedRoute permission="SYSTEM_MANAGE|USER_MANAGE"><TrangCaiDatHeThong /></ProtectedRoute>} />
          <Route path="bang-gia" element={<ProtectedRoute permission="PRICING_VIEW|PRICING_MANAGE"><TrangBangGia /></ProtectedRoute>} />
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