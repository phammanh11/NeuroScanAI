import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  LogOut,
  ArrowLeftRight,
  ChevronRight,
  Bug,
  Home,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { MOCK_ERROR_SIMULATION_EVENT } from '@/constants/appEvents';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tổng quan cá nhân',
  'mri-analysis': 'Tải lên & Phân tích MRI',
  'mri-results': 'Chi tiết kết quả MRI',
  history: 'Lịch sử phân tích',
  'ai-assistant': 'Trợ lý AI Y tế',
  knowledge: 'Thư viện Kiến thức Y khoa',
  profile: 'Hồ sơ người dùng',
  settings: 'Cài đặt hệ thống',
  'model-overview': 'Tổng quan Mô hình Nghiên cứu',
  doctor: 'Cổng Bác sĩ',
  cases: 'Danh sách ca MRI được chia sẻ',
  reviews: 'Đánh giá & Nhận xét chuyên môn',
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, loginAsDemoRole, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotif, setShowNotif] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [simError, setSimError] = useState(() =>
    neuroscanAdapter.getControlledErrorSimulation(),
  );
  const notificationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showNotif) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setShowNotif(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowNotif(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotif]);

  useEffect(() => {
    if (user?.preferences.doctorReviewAlerts === false) setShowNotif(false);
  }, [user?.preferences.doctorReviewAlerts]);

  const segments = location.pathname.split('/').filter(Boolean);

  const handleQuickSwitchRole = async () => {
    if (!user || isSwitchingRole) return;
    const nextRole = user.role === 'USER' ? 'DOCTOR' : 'USER';
    setIsSwitchingRole(true);
    try {
      await loginAsDemoRole(nextRole);
      showToast({
        variant: 'info',
        title: `Đã chuyển sang tài khoản giả lập: ${nextRole}`,
        description:
          nextRole === 'DOCTOR'
            ? 'Đang điều hướng tới Doctor Dashboard.'
            : 'Đang điều hướng tới User Dashboard.',
      });
      navigate(nextRole === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không thể chuyển vai trò khi đang bật mô phỏng lỗi mạng',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleToggleSimError = () => {
    const next = !simError;
    neuroscanAdapter.setControlledErrorSimulation(next);
    setSimError(next);
    window.dispatchEvent(
      new CustomEvent(MOCK_ERROR_SIMULATION_EVENT, { detail: { enabled: next } }),
    );
    showToast({
      variant: next ? 'warning' : 'success',
      title: next
        ? 'Đã BẬT mô phỏng lỗi API có kiểm soát'
        : 'Đã TẮT mô phỏng lỗi API',
      description: next
        ? 'Các thao tác gọi API tiếp theo sẽ trả về trạng thái Error để bạn kiểm thử nút Retry.'
        : 'Các dịch vụ Mock hoạt động bình thường trở lại.',
    });
  };

  const handleLogout = () => {
    logout();
    showToast({
      variant: 'info',
      title: 'Đã đăng xuất khỏi phiên làm việc',
    });
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Left: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Mở menu điều hướng"
          className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
          {segments.map((seg, idx) => {
            const label = ROUTE_LABELS[seg] || seg;
            const isLast = idx === segments.length - 1;
            return (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span
                  className={`truncate ${
                    isLast
                      ? 'font-semibold text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Controlled Error Simulator Toggle */}
        {neuroscanAdapter.isMockMode() && (
          <button
            type="button"
            onClick={handleToggleSimError}
            title="Bật/tắt giả lập lỗi API để kiểm thử ErrorState & nút Retry"
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              simError
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{simError ? 'Đang bật lỗi thử nghiệm' : 'Test lỗi API'}</span>
          </button>
        )}

        {/* Quick RBAC Demo Role Switcher */}
        {user && neuroscanAdapter.isMockMode() && (
          <button
            type="button"
            disabled={isSwitchingRole}
            onClick={handleQuickSwitchRole}
            aria-busy={isSwitchingRole}
            title="Chuyển nhanh giữa giao diện USER và DOCTOR trong chế độ Demo"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/25 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đổi vai trò Demo:</span>
            <span>{user.role === 'USER' ? 'Sang Bác sĩ' : 'Sang Người dùng'}</span>
          </button>
        )}

        <ThemeToggle />

        {/* Notifications Dropdown */}
        {neuroscanAdapter.isMockMode() && user?.preferences.doctorReviewAlerts !== false && (
          <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotif((prev) => !prev)}
            aria-label="Thông báo hệ thống"
            aria-expanded={showNotif}
            aria-controls="header-notifications"
            aria-haspopup="dialog"
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500" />
          </button>

          {showNotif && (
            <div
              id="header-notifications"
              role="dialog"
              aria-label="Thông báo hệ thống"
              className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl z-40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Thông báo Demo
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotif(false)}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Đóng
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Thông báo nhận xét chuyên môn
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Khi một phiên MRI được chia sẻ và có cập nhật từ bác sĩ, thông báo sẽ xuất hiện tại đây.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Trạng thái phiên làm việc Demo
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Các thông báo hiện tại là dữ liệu minh họa, không đại diện cho hồ sơ y tế thực tế.
                  </p>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* User Avatar & Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <Link
              to={user.role === 'DOCTOR' ? '/doctor/profile' : '/profile'}
              className="flex items-center gap-2 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-navy-800 dark:bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                {user.role === 'DOCTOR' ? 'BS' : 'ND'}
              </div>
              <div className="hidden xl:block max-w-[150px]">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-600">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {user.role} • {user.isDemoAccount ? 'Giả lập' : 'Tài khoản'}
                </p>
              </div>
            </Link>

            <button
              type="button"
              disabled={isSwitchingRole}
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
