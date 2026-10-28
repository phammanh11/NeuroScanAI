import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import type { UserRole } from '@/types/domain';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, loginAsDemoRole } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const requiredRole = allowedRoles[0];
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
            Khu vực dành riêng cho vai trò {requiredRole}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Bạn đang đăng nhập với tài khoản giả lập có vai trò{' '}
            <strong>{user.role}</strong> ({user.fullName}). Đường dẫn{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">
              {location.pathname}
            </code>{' '}
            yêu cầu quyền <strong>{requiredRole}</strong>. Khi tích hợp thực tế, Backend FastAPI sẽ
            xác thực quyền này trên từng API.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(user.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard')
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Về Dashboard của {user.role}
            </button>

            <button
              type="button"
              disabled={isSwitchingRole}
              onClick={async () => {
                setIsSwitchingRole(true);
                setSwitchError(null);
                try {
                  await loginAsDemoRole(requiredRole);
                  showToast({
                    variant: 'info',
                    title: `Đã chuyển sang tài khoản giả lập ${requiredRole}`,
                  });
                } catch (err) {
                  setSwitchError(
                    err instanceof Error
                      ? err.message
                      : 'Không thể chuyển tài khoản Demo. Vui lòng thử lại.',
                  );
                } finally {
                  setIsSwitchingRole(false);
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Chuyển sang tài khoản Demo {requiredRole}
            </button>
          </div>
          {switchError && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {switchError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
