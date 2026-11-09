import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Header } from '@/components/layout/Header';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';

export const UserLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const isChatbotRoute =
    pathname.includes('/ai-assistant') || pathname.includes('/ai-chatbot');

  return (
    <div
      className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
        isChatbotRoute ? 'lg:h-dvh lg:overflow-hidden' : ''
      }`}
    >
      <AppSidebar
        role="USER"
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />
        <main
          className={
            isChatbotRoute
              ? 'flex-1 min-h-0 flex flex-col p-3 sm:p-4 lg:px-6 lg:py-3 max-w-7xl w-full mx-auto lg:overflow-hidden'
              : 'flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto'
          }
        >
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
};
