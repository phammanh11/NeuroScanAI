import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import type { AuthSession, UserProfile, UserRole } from '@/types/domain';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsDemoRole: (role: UserRole) => Promise<UserProfile>;
  loginWithCredentials: (email: string, password: string) => Promise<UserProfile>;
  registerAccount: (fullName: string, email: string, password: string) => Promise<UserProfile>;
  updateCurrentUser: (patch: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider quản lý trạng thái xác thực và phân quyền RBAC (USER / DOCTOR) trong bộ nhớ phiên.
 * Không tự đăng nhập khi khởi tạo. Người dùng vẫn có thể chọn tài khoản Demo tại màn hình Login.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const authRequestRef = useRef(0);
  const profileRequestRef = useRef(0);

  useEffect(() => {
    if (!session) return;
    const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      neuroscanAdapter.logout();
      setSession(null);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      neuroscanAdapter.logout();
      setSession(null);
    }, remainingMs);
    return () => window.clearTimeout(timeoutId);
  }, [session]);

  const loginAsDemoRole = async (role: UserRole): Promise<UserProfile> => {
    const requestId = ++authRequestRef.current;
    profileRequestRef.current += 1;
    setIsLoading(true);
    try {
      const nextSession = await neuroscanAdapter.loginWithDemoRole(role);
      if (requestId !== authRequestRef.current) {
        throw new Error('Yêu cầu đăng nhập trước đó đã được thay thế.');
      }
      setSession(nextSession);
      return nextSession.user;
    } finally {
      if (requestId === authRequestRef.current) setIsLoading(false);
    }
  };

  const loginWithCredentials = async (email: string, password: string): Promise<UserProfile> => {
    const requestId = ++authRequestRef.current;
    profileRequestRef.current += 1;
    setIsLoading(true);
    try {
      const nextSession = await neuroscanAdapter.loginWithEmailPassword(email, password);
      if (requestId !== authRequestRef.current) {
        throw new Error('Yêu cầu đăng nhập trước đó đã được thay thế.');
      }
      setSession(nextSession);
      return nextSession.user;
    } finally {
      if (requestId === authRequestRef.current) setIsLoading(false);
    }
  };

  const registerAccount = async (
    fullName: string,
    email: string,
    password: string,
  ): Promise<UserProfile> => {
    const requestId = ++authRequestRef.current;
    profileRequestRef.current += 1;
    setIsLoading(true);
    try {
      const nextSession = await neuroscanAdapter.registerUser(fullName, email, password);
      if (requestId !== authRequestRef.current) {
        throw new Error('Yêu cầu đăng ký trước đó đã được thay thế.');
      }
      setSession(nextSession);
      return nextSession.user;
    } finally {
      if (requestId === authRequestRef.current) setIsLoading(false);
    }
  };

  const updateCurrentUser = async (patch: Partial<UserProfile>): Promise<UserProfile> => {
    if (!session) {
      throw new Error('Bạn cần đăng nhập để cập nhật thông tin.');
    }
    const sessionAtStart = session;
    const requestId = ++profileRequestRef.current;
    const updated = await neuroscanAdapter.updateUserProfile(
      sessionAtStart.user.id,
      sessionAtStart.user.role,
      patch,
    );
    setSession((current) => {
      // Không để response cũ của tài khoản trước ghi đè tài khoản hiện tại.
      if (
        requestId !== profileRequestRef.current ||
        !current ||
        current.user.id !== sessionAtStart.user.id ||
        current.user.role !== sessionAtStart.user.role
      ) {
        return current;
      }
      return { ...current, user: updated };
    });
    return updated;
  };

  const logout = () => {
    authRequestRef.current += 1;
    profileRequestRef.current += 1;
    neuroscanAdapter.logout();
    setSession(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isAuthenticated: Boolean(session?.user),
        isLoading,
        loginAsDemoRole,
        loginWithCredentials,
        registerAccount,
        updateCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return ctx;
}
