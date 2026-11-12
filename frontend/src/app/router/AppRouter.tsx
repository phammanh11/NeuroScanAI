import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { UserLayout } from '@/components/layout/UserLayout';
import { DoctorLayout } from '@/components/layout/DoctorLayout';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';
import { LoadingState } from '@/components/common/LoadingState';
import { MOCK_ERROR_SIMULATION_EVENT } from '@/constants/appEvents';

const LandingPage = lazy(() =>
  import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import('@/features/auth/AuthPages').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/AuthPages').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })),
);
const UserDashboardPage = lazy(() =>
  import('@/features/dashboard/UserDashboardPage').then((m) => ({
    default: m.UserDashboardPage,
  })),
);
const MRIAnalysisPage = lazy(() =>
  import('@/features/mri/MRIAnalysisPage').then((m) => ({ default: m.MRIAnalysisPage })),
);
const MRIResultPage = lazy(() =>
  import('@/features/mri/MRIResultPage').then((m) => ({ default: m.MRIResultPage })),
);
const AIMedicalChatbotPage = lazy(() =>
  import('@/features/chatbot/AIMedicalChatbotPage').then((m) => ({
    default: m.AIMedicalChatbotPage,
  })),
);
const KnowledgeBasePage = lazy(() =>
  import('@/features/knowledge/KnowledgeBasePage').then((m) => ({
    default: m.KnowledgeBasePage,
  })),
);
const AnalysisHistoryPage = lazy(() =>
  import('@/features/history/AnalysisHistoryPage').then((m) => ({
    default: m.AnalysisHistoryPage,
  })),
);
const ProfileAndSettingsPage = lazy(() =>
  import('@/features/settings/ProfileAndSettingsPage').then((m) => ({
    default: m.ProfileAndSettingsPage,
  })),
);
const ModelOverviewPage = lazy(() =>
  import('@/features/research/ModelOverviewPage').then((m) => ({
    default: m.ModelOverviewPage,
  })),
);
const DoctorDashboardPage = lazy(() =>
  import('@/features/doctor/DoctorPages').then((m) => ({
    default: m.DoctorDashboardPage,
  })),
);
const DoctorCasesListPage = lazy(() =>
  import('@/features/doctor/DoctorPages').then((m) => ({
    default: m.DoctorCasesListPage,
  })),
);
const DoctorCaseDetailPage = lazy(() =>
  import('@/features/doctor/DoctorPages').then((m) => ({
    default: m.DoctorCaseDetailPage,
  })),
);
const DoctorReviewsPage = lazy(() =>
  import('@/features/doctor/DoctorPages').then((m) => ({
    default: m.DoctorReviewsPage,
  })),
);
const DoctorHistoryPage = lazy(() =>
  import('@/features/doctor/DoctorPages').then((m) => ({
    default: m.DoctorHistoryPage,
  })),
);
const DoctorPatientsPage = lazy(() =>
  import('@/features/doctor/DoctorPatientsPage').then((m) => ({
    default: m.DoctorPatientsPage,
  })),
);
const DoctorVisionAnalysisPage = lazy(() =>
  import('@/features/doctor/DoctorVisionAnalysisPage').then((m) => ({
    default: m.DoctorVisionAnalysisPage,
  })),
);

const PublicPageLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isChatbotRoute =
    pathname.includes('/ai-assistant') || pathname.includes('/ai-chatbot');

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
        isChatbotRoute ? 'lg:h-dvh lg:overflow-hidden' : ''
      }`}
    >
      <PublicHeader />
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
  );
};

const PublicOrRoleLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    return <PublicPageLayout />;
  }
  if (user.role === 'DOCTOR' || user.role === 'doctor') {
    return <DoctorLayout />;
  }
  return <UserLayout />;
};

export const AppRouter: React.FC = () => {
  const [mockErrorRevision, setMockErrorRevision] = useState(0);

  useEffect(() => {
    const handleMockErrorChange = () => {
      setMockErrorRevision((revision) => revision + 1);
    };

    window.addEventListener(MOCK_ERROR_SIMULATION_EVENT, handleMockErrorChange);
    return () => window.removeEventListener(MOCK_ERROR_SIMULATION_EVENT, handleMockErrorChange);
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState variant="page" title="Đang tải giao diện NeuroScan AI..." />}>
        <Routes key={mockErrorRevision}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Publicly Accessible & Role-Aware Routes (No forced redirect to /login) */}
          <Route element={<PublicOrRoleLayout />}>
            <Route path="/mri-analysis" element={<MRIAnalysisPage />} />
            <Route path="/mri-results/:id" element={<MRIResultPage />} />
            <Route path="/ai-assistant" element={<AIMedicalChatbotPage />} />
            <Route path="/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/medical-knowledge" element={<KnowledgeBasePage />} />
            <Route path="/model-overview" element={<ModelOverviewPage />} />
            <Route path="/history" element={<AnalysisHistoryPage />} />
          </Route>

          {/* USER Role Protected Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<UserDashboardPage />} />
            <Route path="/profile" element={<ProfileAndSettingsPage />} />
            <Route path="/settings" element={<ProfileAndSettingsPage />} />
          </Route>

          {/* DOCTOR Role Protected Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['DOCTOR']}>
                <DoctorLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
            <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
            <Route path="/doctor/vision-analysis" element={<DoctorVisionAnalysisPage />} />
            <Route path="/doctor/cases" element={<DoctorCasesListPage />} />
            <Route path="/doctor/cases/:id" element={<DoctorCaseDetailPage />} />
            <Route path="/doctor/reviews" element={<DoctorReviewsPage />} />
            <Route path="/doctor/history" element={<DoctorHistoryPage />} />
            <Route path="/doctor/ai-assistant" element={<AIMedicalChatbotPage />} />
            <Route path="/doctor/profile" element={<ProfileAndSettingsPage />} />
          </Route>

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
