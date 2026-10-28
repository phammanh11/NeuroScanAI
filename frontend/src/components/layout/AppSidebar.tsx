import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Brain,
  LayoutDashboard,
  ScanLine,
  History,
  MessageSquareHeart,
  BookOpen,
  UserCircle,
  Stethoscope,
  ClipboardList,
  Users,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { UserRole } from '@/types/domain';
import { ENV_CONFIG } from '@/constants/apiEndpoints';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
}

const USER_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tổng quan cá nhân',
    to: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: 'Phân tích MRI',
    to: '/mri-analysis',
    icon: <ScanLine className="w-4 h-4" />,
    badge: 'Trọng tâm',
  },
  {
    label: 'Lịch sử & Đánh giá Bác sĩ',
    to: '/history',
    icon: <History className="w-4 h-4" />,
  },
  {
    label: 'Trợ lý AI Y tế',
    to: '/ai-assistant',
    icon: <MessageSquareHeart className="w-4 h-4" />,
  },
  {
    label: 'Kiến thức y khoa',
    to: '/knowledge',
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    label: 'Hồ sơ & Cài đặt',
    to: '/profile',
    icon: <UserCircle className="w-4 h-4" />,
  },
];

const DOCTOR_NAV_ITEMS: NavItem[] = [
  {
    label: 'Bảng điều khiển Bác sĩ',
    to: '/doctor/dashboard',
    icon: <Stethoscope className="w-4 h-4" />,
  },
  {
    label: 'Danh sách Bệnh nhân',
    to: '/doctor/patients',
    icon: <Users className="w-4 h-4" />,
    badge: 'Quản lý',
  },
  {
    label: 'Computer Vision MRI',
    to: '/doctor/vision-analysis',
    icon: <ScanLine className="w-4 h-4" />,
    badge: 'Vision Lab',
  },
  {
    label: 'Ca bệnh & Đánh giá',
    to: '/doctor/cases',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    label: 'Trợ lý AI Bác sĩ',
    to: '/doctor/ai-assistant',
    icon: <MessageSquareHeart className="w-4 h-4" />,
  },
  {
    label: 'Hồ sơ Bác sĩ',
    to: '/doctor/profile',
    icon: <UserCircle className="w-4 h-4" />,
  },
];

interface AppSidebarProps {
  role: UserRole;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems = role === 'DOCTOR' ? DOCTOR_NAV_ITEMS : USER_NAV_ITEMS;
  const mobileDialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseMobileRef = useRef(onCloseMobile);

  useEffect(() => {
    onCloseMobileRef.current = onCloseMobile;
  }, [onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusable = Array.from(
      mobileDialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      ) ?? [],
    );
    focusable[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobileRef.current();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [mobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/90">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200/80 dark:border-slate-800">
        <NavLink
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 focus-visible:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              NeuroScan <span className="text-teal-600 dark:text-teal-400">AI</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {role === 'DOCTOR' ? 'Cổng Chuyên môn Bác sĩ' : 'Hỗ trợ Phân tích MRI'}
            </div>
          </div>
        </NavLink>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Đóng thanh điều hướng"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role indicator badge */}
      <div className="px-4 pt-4">
        <div
          className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 ${
            role === 'DOCTOR'
              ? 'bg-sky-500/10 border-sky-500/25 text-sky-900 dark:text-sky-200'
              : 'bg-teal-500/10 border-teal-500/25 text-teal-900 dark:text-teal-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <div className="truncate">
            <span className="font-semibold">Vai trò: </span>
            <span>{role === 'DOCTOR' ? 'DOCTOR (Bác sĩ)' : 'USER (Người sử dụng)'}</span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav aria-label="Menu điều hướng chính" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-navy-800 text-white dark:bg-teal-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-700 dark:text-teal-200">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Notice */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Chế độ: {ENV_CONFIG.MOCK_MODE ? 'Mock Demo' : 'API'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="leading-relaxed">
            {ENV_CONFIG.MOCK_MODE
              ? 'Dữ liệu giả lập phục vụ kiểm thử UI. Không thay thế chẩn đoán lâm sàng.'
              : 'Dữ liệu từ dịch vụ API đang kết nối. Không thay thế chẩn đoán lâm sàng.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer / Sheet */}
      {mobileOpen && (
        <div
          ref={mobileDialogRef}
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng chính"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
