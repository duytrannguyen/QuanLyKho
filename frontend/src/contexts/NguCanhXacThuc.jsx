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
    return Array.isArray(user.permissions) && user.permissions.includes(permissionCode);
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

