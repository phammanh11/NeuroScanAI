import React, { useEffect, useRef, useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
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
    icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Phân tích MRI',
    to: '/mri-analysis',
    icon: <ScanLine className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Lịch sử & Đánh giá Bác sĩ',
    to: '/history',
    icon: <History className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Trợ lý AI Y tế',
    to: '/ai-assistant',
    icon: <MessageSquareHeart className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Kiến thức y khoa',
    to: '/knowledge',
    icon: <BookOpen className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Hồ sơ & Cài đặt',
    to: '/profile',
    icon: <UserCircle className="w-4 h-4 shrink-0" />,
  },
];

const DOCTOR_NAV_ITEMS: NavItem[] = [
  {
    label: 'Bảng điều khiển Bác sĩ',
    to: '/doctor/dashboard',
    icon: <Stethoscope className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Danh sách Bệnh nhân',
    to: '/doctor/patients',
    icon: <Users className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Computer Vision MRI',
    to: '/doctor/vision-analysis',
    icon: <ScanLine className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Ca bệnh & Đánh giá',
    to: '/doctor/cases',
    icon: <ClipboardList className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Trợ lý AI Bác sĩ',
    to: '/doctor/ai-assistant',
    icon: <MessageSquareHeart className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Hồ sơ Bác sĩ',
    to: '/doctor/profile',
    icon: <UserCircle className="w-4 h-4 shrink-0" />,
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

  // Desktop Collapsible state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('neuroscan_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('neuroscan_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    onCloseMobileRef.current = onCloseMobile;
  }, [onCloseMobile]);

  // Listen to custom event from Header or keyboard shortcut (Alt + S)
  useEffect(() => {
    const handleToggleEvent = () => toggleCollapse();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('neuroscan:toggle-sidebar', handleToggleEvent);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('neuroscan:toggle-sidebar', handleToggleEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const renderContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/90 overflow-hidden select-none">
      {/* Brand Header */}
      <div
        className={`flex items-center h-16 border-b border-slate-200/80 dark:border-slate-800 transition-all ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Mở rộng thanh điều hướng (Alt + S)"
            className="w-10 h-10 rounded-xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-all group"
          >
            <Brain className="w-5 h-5 group-hover:hidden" />
            <PanelLeftOpen className="w-5 h-5 hidden group-hover:block text-teal-300" />
          </button>
        ) : (
          <>
            <NavLink
              to="/"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 focus-visible:outline-none min-w-0"
            >
              <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  NeuroScan <span className="text-teal-600 dark:text-teal-400">AI</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {role === 'DOCTOR' ? 'Cổng Chuyên môn Bác sĩ' : 'Hỗ trợ Phân tích MRI'}
                </div>
              </div>
            </NavLink>

            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              title="Thu gọn thanh điều hướng (Alt + S)"
              className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-2xs active:scale-95"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Đóng thanh điều hướng"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Role indicator badge */}
      {collapsed ? (
        <div className="px-2 pt-3 flex justify-center">
          <div
            title={`Vai trò: ${role === 'DOCTOR' ? 'DOCTOR (Bác sĩ chuyên khoa)' : 'USER (Người sử dụng)'}`}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-default ${
              role === 'DOCTOR'
                ? 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300'
                : 'bg-teal-500/10 border-teal-500/25 text-teal-700 dark:text-teal-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      ) : (
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
      )}

      {/* Navigation List */}
      <nav
        aria-label="Menu điều hướng chính"
        className={`flex-1 py-4 space-y-1.5 overflow-y-auto ${
          collapsed ? 'px-2' : 'px-3'
        }`}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center rounded-xl text-sm font-medium transition-all ${
                collapsed
                  ? 'justify-center w-10 h-10 mx-auto'
                  : 'gap-3 px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-navy-800 text-white dark:bg-teal-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            {item.icon}
            {!collapsed && <span className="truncate flex-1">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Mode Notice */}
      {collapsed ? (
        <div className="py-2.5 border-t border-slate-200/80 dark:border-slate-800 flex justify-center">
          <div
            title={`Chế độ: ${ENV_CONFIG.MOCK_MODE ? 'Mock Demo' : 'API'} đang kết nối`}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-default"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Chế độ: {ENV_CONFIG.MOCK_MODE ? 'Mock Demo' : 'API'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="leading-relaxed text-[10px]">
              {ENV_CONFIG.MOCK_MODE
                ? 'Dữ liệu giả lập phục vụ kiểm thử UI.'
                : 'Dịch vụ Cloudflare API đang kết nối an toàn.'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Desktop Expand / Collapse Action Bar */}
      <div className="hidden lg:block p-2 border-t border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={toggleCollapse}
          title={collapsed ? 'Mở rộng menu (Alt + S)' : 'Thu gọn menu (Alt + S)'}
          className={`w-full flex items-center rounded-xl py-2 px-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-2xs group ${
            collapsed ? 'justify-center w-10 h-10 mx-auto p-0' : 'justify-between'
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <PanelLeftClose className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                <span>Thu gọn menu</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400">
                Alt+S
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar with Smooth Width Transition */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-[width] duration-300 ease-in-out z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer / Sheet (Always Expanded) */}
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
            {renderContent(false)}
          </aside>
        </div>
      )}
    </>
  );
};
