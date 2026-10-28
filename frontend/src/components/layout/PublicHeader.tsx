import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Brain, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export const PublicHeader: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menuButton = mobileMenuButtonRef.current;
    const focusable = Array.from(
      mobileMenuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
    );
    focusable[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
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
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  const dashboardPath = user?.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              NeuroScan <span className="text-teal-600 dark:text-teal-400">AI</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav
          aria-label="Điều hướng công khai"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? 'text-teal-600 dark:text-teal-400 font-semibold'
                : 'hover:text-teal-600 dark:hover:text-teal-400 transition-colors'
            }
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/mri-analysis"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Phân tích MRI
          </NavLink>
          <NavLink
            to="/ai-assistant"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Trợ lý AI
          </NavLink>
          <NavLink
            to="/knowledge"
            className={({ isActive }) =>
              isActive
                ? 'text-teal-600 dark:text-teal-400 font-semibold'
                : 'hover:text-teal-600 dark:hover:text-teal-400 transition-colors'
            }
          >
            Kiến thức
          </NavLink>
          <NavLink
            to="/model-overview"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Kiến trúc AI
          </NavLink>
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
            >
              <span>Vào Bảng điều khiển ({user?.role})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
            >
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Đóng menu di động' : 'Mở menu di động'}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-menu"
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="public-mobile-menu"
          className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2 text-sm"
          role="dialog"
          aria-label="Menu điều hướng di động"
        >
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 font-medium text-slate-800 dark:text-slate-100"
          >
            Trang chủ
          </Link>
          <Link
            to="/mri-analysis"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 font-medium text-slate-800 dark:text-slate-100"
          >
            Phân tích MRI
          </Link>
          <Link
            to="/ai-assistant"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 font-medium text-slate-800 dark:text-slate-100"
          >
            Trợ lý AI
          </Link>
          <Link
            to="/knowledge"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 font-medium text-slate-800 dark:text-slate-100"
          >
            Kiến thức y khoa
          </Link>
          <Link
            to="/model-overview"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 font-medium text-slate-800 dark:text-slate-100"
          >
            Kiến trúc AI & Định hướng
          </Link>
        </div>
      )}
    </header>
  );
};
