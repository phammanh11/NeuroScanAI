import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Brain,
  Eye,
  EyeOff,
  Loader2,
  Stethoscope,
  User,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ScanLine,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { DEMO_USERS } from '@/data/mockFixtures';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';

const loginSchema = z.object({
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { loginWithCredentials, loginAsDemoRole, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'demo.doctor@neuroscan.vn',
      password: 'Doctor@123',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const profile = await loginWithCredentials(values.email, values.password);
      showToast({
        variant: 'success',
        title: `Đăng nhập thành công (${profile.role})`,
        description: `Xin chào ${profile.fullName}`,
      });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || '/doctor/dashboard', {
        replace: true,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    }
  };

  const handleQuickDemoLogin = async (role: 'DOCTOR' | 'USER') => {
    setFormError(null);
    try {
      if (role === 'DOCTOR') {
        setValue('email', 'demo.doctor@neuroscan.vn');
        setValue('password', 'Doctor@123');
        const profile = await loginAsDemoRole('DOCTOR');
        showToast({
          variant: 'success',
          title: `Đã đăng nhập vai trò Bác sĩ (DOCTOR)`,
          description: profile.fullName,
        });
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from || '/doctor/dashboard', {
          replace: true,
        });
      } else {
        setValue('email', 'demo.user@neuroscan.vn');
        setValue('password', 'User@123');
        const profile = await loginAsDemoRole('USER');
        showToast({
          variant: 'success',
          title: `Đã đăng nhập vai trò Người dùng (USER)`,
          description: profile.fullName,
        });
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from || '/dashboard', {
          replace: true,
        });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể đăng nhập tài khoản kiểm thử.');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Column: Healthcare AI Hero Showcase (Hidden on mobile/tablet, 5 cols on lg, 6 cols on xl) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 bg-slate-900 text-white p-8 xl:p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        {/* Subtle Decorative Background Gradients */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-navy-700/40 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">NeuroScan AI</span>
            <span className="block text-[10px] text-teal-300 font-mono tracking-wider">BRAIN MRI & CLINICAL ASSISTANT</span>
          </div>
        </div>

        {/* Showcase Content */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/25">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Nền tảng Trợ lý AI Chẩn đoán Hình ảnh Y tế</span>
          </div>

          <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug">
            Phân tích MRI u não đa chuỗi xung & Hỗ trợ quyết định lâm sàng
          </h1>

          <p className="text-xs xl:text-sm text-slate-300 leading-relaxed">
            Hệ thống phân quyền RBAC đa cấp độ: Bác sĩ chuyên khoa quản lý hồ sơ, hội chẩn và duyệt kết quả; Người bệnh tra cứu và nhận tư vấn tham vấn y tế an toàn.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0 mt-0.5">
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Phân loại 4 nhóm theo WHO CNS5</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Nhận diện Glioma, Meningioma, U tuyến yên (Pituitary) và Não không u kèm bản đồ nhiệt Grad-CAM.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 backdrop-blur-xs">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 shrink-0 mt-0.5">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Hội đồng Y tế & Trợ lý RAG Edge</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Hỏi đáp chuyên sâu dựa trên tài liệu thẩm định từ NCI/WHO, vận hành trên Cloudflare Edge an toàn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Mã hóa bảo mật Cloudflare D1 & R2</span>
          </div>
          <span className="font-mono text-[11px]">NeuroScan Edge v2.0</span>
        </div>
      </div>

      {/* Right Column: Compact, Scroll-Free Login Form (7 cols on lg, 6 cols on xl) */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 h-full overflow-y-auto lg:overflow-hidden">
        {/* Top Navigation */}
        <div className="flex items-center justify-between w-full shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về trang giới thiệu</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Center Card Content */}
        <div className="w-full max-w-md mx-auto my-auto py-2 sm:py-4 space-y-3.5">
          <div className="text-center space-y-1">
            <div className="lg:hidden w-10 h-10 mx-auto rounded-2xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs mb-2">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Đăng nhập NeuroScan AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống RBAC: tự động điều hướng theo vai trò <strong>USER</strong> hoặc <strong>DOCTOR</strong>.
            </p>
          </div>

          {/* Quick Login Test Roles */}
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Đăng nhập nhanh kiểm thử
              </span>
              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 font-mono">
                1-Click Fast Login
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Doctor Quick Login */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickDemoLogin('DOCTOR')}
                className="group p-2.5 rounded-xl border border-teal-500/30 bg-teal-50/80 hover:bg-teal-600 hover:text-white dark:bg-teal-950/40 dark:hover:bg-teal-600 text-left transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs active:scale-98"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-800 dark:text-teal-200 group-hover:bg-white/20 group-hover:text-white">
                    ROLE: DOCTOR
                  </span>
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover:text-white" />
                </div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-white truncate">
                  BS. Trần Quốc Bảo
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-teal-100 truncate">
                  demo.doctor@neuroscan.vn
                </div>
              </button>

              {/* User Quick Login */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickDemoLogin('USER')}
                className="group p-2.5 rounded-xl border border-sky-500/30 bg-sky-50/80 hover:bg-sky-600 hover:text-white dark:bg-sky-950/40 dark:hover:bg-sky-600 text-left transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs active:scale-98"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-800 dark:text-sky-200 group-hover:bg-white/20 group-hover:text-white">
                    ROLE: USER
                  </span>
                  <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 group-hover:text-white" />
                </div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-white truncate">
                  Nguyễn Minh An
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-sky-100 truncate">
                  demo.user@neuroscan.vn
                </div>
              </button>
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300"
            >
              {formError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Địa chỉ Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                {...register('email')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="demo.doctor@neuroscan.vn"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-98"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Đăng nhập vào hệ thống</span>
            </button>
          </form>

          {/* Bottom Links & Disclaimer */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-center space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <p>
              Chưa có tài khoản người dùng?{' '}
              <Link
                to="/register"
                className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Đăng ký tài khoản USER
              </Link>
            </p>
            <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span>Không lưu mật khẩu hay dữ liệu sức khỏe thực tế vào localStorage.</span>
            </p>
          </div>
        </div>

        {/* Bottom subtle copyright */}
        <div className="text-center text-[11px] text-slate-400 shrink-0 pt-2">
          © 2026 NeuroScan AI • Nền tảng Đám mây Edge Y tế
        </div>
      </div>
    </div>
  );
};

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự.'),
    email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ.'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
    confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu.'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Bạn cần đồng ý với điều khoản sử dụng và giới hạn y tế của hệ thống.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { registerAccount, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMsg(null);
    try {
      await registerAccount(values.fullName, values.email, values.password);
      showToast({
        variant: 'success',
        title: 'Đăng ký tài khoản giả lập (USER) thành công',
        description: 'Hệ thống đã chuyển bạn tới User Dashboard.',
      });
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Đăng nhập</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Đăng ký tài khoản Người sử dụng
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Theo quy định phân quyền RBAC, người dùng tự đăng ký mặc định nhận vai trò{' '}
              <strong>USER</strong>. Tài khoản <strong>DOCTOR</strong> chỉ được cấp quyền và xác
              minh bởi hệ thống quản trị bệnh viện ở Backend.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label
                htmlFor="reg-fullname"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Họ và tên (Khuyến nghị dùng tên giả lập khi demo)
              </label>
              <input
                id="reg-fullname"
                type="text"
                {...register('fullName')}
                placeholder="Ví dụ: Lê Hoàng Nam"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.fullName && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                {...register('email')}
                placeholder="user.demo@neuroscan.vn"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.email && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Hiện hoặc ẩn mật khẩu"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-confirm"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Xác nhận mật khẩu
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('acceptTerms')}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  Tôi hiểu đây là hệ thống hỗ trợ phân loại và tra cứu thông tin tham khảo, không
                  thay thế chẩn đoán y khoa từ bác sĩ.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Tạo tài khoản USER (Giả lập)</span>
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-teal-600 dark:text-teal-400">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const forgotSchema = z.object({
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ.'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: DEMO_USERS.USER.email },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await neuroscanAdapter.requestPasswordReset(values.email);
      setSubmittedMessage(res.message);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Đăng nhập</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Khôi phục mật khẩu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu.
            </p>
          </div>

          {submittedMessage ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Đã ghi nhận yêu cầu</span>
              </div>
              <p className="leading-relaxed">{submittedMessage}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-300 underline"
              >
                Quay lại màn hình đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300"
                >
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Địa chỉ Email đăng ký
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  {...register('email')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Gửi yêu cầu khôi phục</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
