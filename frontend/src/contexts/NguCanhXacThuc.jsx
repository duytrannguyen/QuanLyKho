import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../api';

const NguCanhXacThuc = createContext(null);

export const PERMISSION_LABELS = {
  DASHBOARD_VIEW: 'Tổng quan điều hành',
  SALES_REPORT_VIEW: 'Báo cáo doanh số',
  ANALYTICS_VIEW: 'Thống kê phân tích kho',
  SALE_MACHINE: 'Bán máy lẻ (POS)',
  SALE_ACCESSORY: 'Bán phụ kiện lẻ',
  SHIP_MANAGE: 'Xem & Xác nhận giao đơn ship',
  ORDER_EDIT: 'Sửa hóa đơn & Đơn hàng đã xuất',
  ORDER_RETURN: 'Đổi trả & Hoàn đơn hàng về kho',
  PRICING_VIEW: 'Xem bảng giá niêm yết',
  PRICING_MANAGE: 'Quản lý & Chỉnh sửa bảng giá in',
  SEARCH_INVENTORY: 'Tra cứu tồn kho máy',
  MANAGE_MACHINE_CODES: 'Quản lý mã máy & Lịch sử Serial',
  IMPORT_MACHINE: 'Nhập kho máy',
  MACHINE_UPDATE: 'Sửa giá bán & Bảo hành máy tồn kho',
  MACHINE_EXPORT_OTHER: 'Xuất máy khác & Đưa về kiểm tra',
  MACHINE_DELETE: 'Xóa máy khỏi kho',
  INSPECTION: 'Kiểm định chất lượng máy',
  IMPORT_ACCESSORY: 'Nhập kho phụ kiện',
  INVENTORY_ACCESSORY: 'Xem tồn kho phụ kiện',
  ACCESSORY_MANAGE: 'Sửa / Xóa phụ kiện & Cấu hình quà tặng',
  ACCESSORY_HISTORY: 'Xem lịch sử xuất bán phụ kiện',
  IMPORT_PART: 'Nhập kho linh kiện',
  INVENTORY_PART: 'Xem tồn kho linh kiện',
  PART_MANAGE: 'Sửa / Xóa danh mục linh kiện',
  WARRANTY_CHECK: 'Tra cứu đơn hàng & Bảo hành',
  SERVICE_REPAIR: 'Tiếp nhận & Xử lý phiếu sửa chữa',
  SERVICE_VIEW: 'Xem danh sách phiếu sửa chữa',
  CRM_VIEW: 'Xem hồ sơ khách hàng & Máy hết bảo hành',
  CRM_CARE: 'Ghi nhận chăm sóc khách hàng (CSKH)',
  CRM_MANAGE: 'Quản lý hồ sơ CRM & Gán đơn khách lẻ',
  SYNC_VIEW: 'Xem Đối soát & Lịch sử đồng bộ',
  SYNC_MANAGE: 'Thực thi Đồng bộ & Xử lý sai lệch',
  LOGS_VIEW: 'Xem Nhật ký hoạt động hệ thống',
  EXPORT_DATA: 'Xuất dữ liệu báo cáo ra file Excel',
  USER_MANAGE: 'Quản trị người dùng & Phân quyền',
  SYSTEM_MANAGE: 'Cấu hình hệ thống & Bảo trì máy chủ',
};

export const ROUTE_PERMISSION_MAP = [
  { path: '/', label: 'Bàn điều hành', permission: 'DASHBOARD_VIEW' },
  { path: '/bao-cao-ban-hang', label: 'Báo cáo doanh số', permission: 'SALES_REPORT_VIEW' },
  { path: '/phan-tich', label: 'Thống kê phân tích', permission: 'ANALYTICS_VIEW' },
  { path: '/ban-may', label: 'Bán máy (POS)', permission: 'SALE_MACHINE' },
  { path: '/ban-phu-kien', label: 'Bán phụ kiện lẻ', permission: 'SALE_ACCESSORY' },
  { path: '/don-ship', label: 'Đơn ship & Giao hàng', permission: 'SHIP_MANAGE' },
  { path: '/dich-vu-sua-chua', label: 'Tiếp nhận sửa chữa', permission: 'SERVICE_REPAIR' },
  { path: '/tra-cuu-sua-chua', label: 'Tra cứu phiếu sửa chữa', permission: 'SERVICE_VIEW|SERVICE_REPAIR' },
  { path: '/bang-gia', label: 'Bảng giá niêm yết', permission: 'PRICING_VIEW|PRICING_MANAGE' },
  { path: '/tra-cuu', label: 'Tồn kho máy', permission: 'SEARCH_INVENTORY|MACHINE_UPDATE|MACHINE_EXPORT_OTHER' },
  { path: '/quan-ly-ma-may', label: 'Quản lý mã máy (Serial)', permission: 'MANAGE_MACHINE_CODES' },
  { path: '/nhap-may', label: 'Nhập kho máy', permission: 'IMPORT_MACHINE' },
  { path: '/kiem-tra', label: 'Kiểm định chất lượng', permission: 'INSPECTION' },
  { path: '/nhap-phu-kien', label: 'Nhập kho phụ kiện', permission: 'IMPORT_ACCESSORY' },
  { path: '/ton-kho-phu-kien', label: 'Kho phụ kiện', permission: 'INVENTORY_ACCESSORY|ACCESSORY_MANAGE' },
  { path: '/lich-su-ban-phu-kien', label: 'Lịch sử bán phụ kiện', permission: 'ACCESSORY_HISTORY' },
  { path: '/nhap-linh-kien', label: 'Nhập kho linh kiện', permission: 'IMPORT_PART' },
  { path: '/ton-kho-linh-kien', label: 'Kho linh kiện', permission: 'INVENTORY_PART|PART_MANAGE' },
  { path: '/bao-hanh', label: 'Tra cứu đơn & Bảo hành', permission: 'WARRANTY_CHECK' },
  { path: '/khach-hang', label: 'Khách hàng (CRM)', permission: 'CRM_VIEW|CRM_CARE|CRM_MANAGE' },
  { path: '/khach-hang/het-han-bao-hanh', label: 'Máy hết hạn bảo hành', permission: 'CRM_VIEW|CRM_CARE|CRM_MANAGE' },
  { path: '/doi-soat', label: 'Đối soát Google Sheet', permission: 'SYNC_VIEW|SYNC_MANAGE' },
  { path: '/nhat-ky', label: 'Nhật ký hoạt động', permission: 'LOGS_VIEW' },
  { path: '/he-thong', label: 'Cấu hình & Phân quyền', permission: 'SYSTEM_MANAGE|USER_MANAGE' },
];

export function getPermissionLabel(permissionCode) {
  if (!permissionCode) return 'Truy cập tính năng';
  const codes = Array.isArray(permissionCode)
    ? permissionCode
    : String(permissionCode).split('|').map(s => s.trim()).filter(Boolean);
  return codes.map(c => PERMISSION_LABELS[c] || c).join(' hoặc ');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res && res.data) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      }
    } catch {
      // Bỏ qua lỗi nếu mạng gián đoạn
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const { token, refreshToken, ...userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const hasPermission = useCallback((permissionCode) => {
    if (!user) return false;
    const roleUpper = (user.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || roleUpper === 'QUẢN TRỊ VIÊN') {
      return true;
    }
    if (!permissionCode) return true;

    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    // Hỗ trợ kiểm tra danh sách quyền phân cách bằng dấu gạch đứng '|' hoặc mảng
    const permsToCheck = Array.isArray(permissionCode)
      ? permissionCode
      : String(permissionCode).split('|').map(s => s.trim()).filter(Boolean);

    return permsToCheck.some(code => {
      if (userPerms.includes(code)) return true;
      // Chỉ giữ từ đồng nghĩa mã quyền để tương thích CSDL cũ, tuyệt đối không tự động leo thang quyền
      if (code === 'LOGS_VIEW' && userPerms.includes('LOG_VIEW')) return true;
      if (code === 'LOG_VIEW' && userPerms.includes('LOGS_VIEW')) return true;
      if (code === 'MANAGE_MACHINE_CODES' && userPerms.includes('CATALOG_VIEW')) return true;
      if (code === 'CATALOG_VIEW' && userPerms.includes('MANAGE_MACHINE_CODES')) return true;
      return false;
    });
  }, [user]);

  const getFirstPermittedRoute = useCallback(() => {
    for (const r of ROUTE_PERMISSION_MAP) {
      if (hasPermission(r.permission)) {
        return r.path;
      }
    }
    return null;
  }, [hasPermission]);

  const requirePermission = useCallback((permissionCode, showToast, customActionName) => {
    if (hasPermission(permissionCode)) return true;
    if (typeof showToast === 'function') {
      const label = getPermissionLabel(permissionCode);
      const actionMsg = customActionName ? `"${customActionName}"` : 'thao tác này';
      showToast(
        `Tài khoản của bạn không đủ quyền hạn để thực hiện ${actionMsg}. Cần được cấp quyền: [${label}].`,
        'warning'
      );
    }
    return false;
  }, [hasPermission]);

  const contextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      refreshUser,
      hasPermission,
      getFirstPermittedRoute,
      requirePermission,
      getPermissionLabel,
    }),
    [user, login, logout, loading, refreshUser, hasPermission, getFirstPermittedRoute, requirePermission]
  );

  return (
    <NguCanhXacThuc.Provider value={contextValue}>
      {children}
    </NguCanhXacThuc.Provider>
  );
}

export function useAuth() {
  const contexts = useContext(NguCanhXacThuc);
  if (!contexts) throw new Error('useAuth must be used within AuthProvider');
  return contexts;
}

