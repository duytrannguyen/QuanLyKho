import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const NguCanhXacThuc = createContext(null);

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

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const { token, refreshToken, ...userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

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

      // Hỗ trợ tương thích ngược (fallback aliases) cho các tài khoản tạo trước đó
      if (code === 'SHIP_MANAGE' && userPerms.includes('SALE_MACHINE')) return true;
      if (code === 'SERVICE_VIEW' && userPerms.includes('SERVICE_REPAIR')) return true;
      if (code === 'USER_MANAGE' && userPerms.includes('SYSTEM_MANAGE')) return true;
      if (code === 'ORDER_EDIT' && (userPerms.includes('SALE_MACHINE') || userPerms.includes('SALE_ACCESSORY'))) return true;
      if (code === 'ORDER_RETURN' && (userPerms.includes('SALE_MACHINE') || userPerms.includes('SYNC_MANAGE'))) return true;
      if (code === 'MACHINE_UPDATE' && userPerms.includes('IMPORT_MACHINE')) return true;
      if (code === 'ACCESSORY_MANAGE' && userPerms.includes('IMPORT_ACCESSORY')) return true;
      if (code === 'PART_MANAGE' && userPerms.includes('IMPORT_PART')) return true;
      if (code === 'PRICING_MANAGE' && userPerms.includes('PRICING_VIEW')) return true;
      if (code === 'EXPORT_DATA' && (userPerms.includes('CRM_VIEW') || userPerms.includes('SEARCH_INVENTORY'))) return true;

      return false;
    });
  }, [user]);

  return (
    <NguCanhXacThuc.Provider value={{ user, login, logout, loading, refreshUser, hasPermission }}>
      {children}
    </NguCanhXacThuc.Provider>
  );
}

export function useAuth() {
  const contexts = useContext(NguCanhXacThuc);
  if (!contexts) throw new Error('useAuth must be used within AuthProvider');
  return contexts;
}

