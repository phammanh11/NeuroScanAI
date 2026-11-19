import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { LoadingState } from '@/components/common/LoadingState';
import type { UserRole } from '@/types/domain';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, isInitializing, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isInitializing) {
    return <LoadingState variant="page" title="Đang xác thực phiên đăng nhập..." />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  const normalizedUserRole = user.role.toUpperCase();
  const normalizedAllowedRoles = allowedRoles?.map((r) => r.toUpperCase());

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    const isDoctorOrAdmin = normalizedUserRole === 'DOCTOR' || normalizedUserRole === 'ADMIN';
    const fallbackHome = isDoctorOrAdmin ? '/doctor/dashboard' : '/dashboard';
    const requiredLabel = allowedRoles?.join(' / ') || 'DOCTOR';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Kiểm soát Truy cập Theo Vai trò (RBAC)
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Khu vực dành riêng cho vai trò {requiredLabel}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Bạn đang đăng nhập với vai trò{' '}
            <strong>{user.role}</strong> ({user.fullName}). Đường dẫn{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">
              {location.pathname}
            </code>{' '}
            được phân quyền dành riêng cho vai trò <strong>{requiredLabel}</strong> trên hệ thống NeuroScan AI.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(fallbackHome, { replace: true })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Về Dashboard của {user.role}
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', {
                  replace: true,
                  state: { from: `${location.pathname}${location.search}${location.hash}` },
                });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
