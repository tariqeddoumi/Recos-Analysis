import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';
import { LoginForm } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginForm) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roleCode: string | string[]) => boolean;
  hasPermission: (permissionCode: string | string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch {
      setUser(null);
      authService.removeToken();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = useCallback(async (credentials: LoginForm) => {
    const response = await authService.login(credentials);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (roleCode: string | string[]) => {
      if (!user) return false;
      const codes = Array.isArray(roleCode) ? roleCode : [roleCode];
      return codes.includes(user.role.code);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permissionCode: string | string[]) => {
      if (!user) return false;
      const codes = Array.isArray(permissionCode) ? permissionCode : [permissionCode];
      return user.role.permissions.some((p) => codes.includes(p.code));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
