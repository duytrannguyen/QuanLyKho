import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './toast/ToastContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import MachineImportPage from './pages/MachineImport/MachineImportPage';
import InspectionPage from './pages/Inspection/InspectionPage';
import InventorySearchPage from './pages/InventorySearch/InventorySearchPage';
import SalePage from './pages/Sale/SalePage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import ReconciliationPage from './pages/Reconciliation/ReconciliationPage';
import ActivityLogPage from './pages/ActivityLog/ActivityLogPage';
import SystemSettingsPage from './pages/SystemSettings/SystemSettingsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
        <span>Đang tải...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <LoginPage />
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="nhap-may" element={<MachineImportPage />} />
        <Route path="kiem-tra" element={<InspectionPage />} />
        <Route path="tra-cuu" element={<InventorySearchPage />} />
        <Route path="ban-may" element={<SalePage />} />
        <Route path="phan-tich" element={<AnalyticsPage />} />
        <Route path="doi-soat" element={<ReconciliationPage />} />
        <Route path="nhat-ky" element={<ActivityLogPage />} />
        <Route path="he-thong" element={<SystemSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
