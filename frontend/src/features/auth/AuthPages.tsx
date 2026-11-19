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
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ScanLine,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';

const loginSchema = z.object({
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { loginWithCredentials, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resolveRouteForRole = (role: string, requestedFrom?: string): string => {
    const isDoc = role === 'DOCTOR' || role === 'doctor' || role === 'ADMIN' || role === 'admin';
    if (isDoc) {
      if (requestedFrom && requestedFrom.startsWith('/doctor')) {
        return requestedFrom;
      }
      return '/doctor/dashboard';
    }
    if (
      requestedFrom &&
      !requestedFrom.startsWith('/doctor') &&
      requestedFrom !== '/login' &&
      requestedFrom !== '/register'
    ) {
      return requestedFrom;
    }
    return '/dashboard';
  };

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const profile = await loginWithCredentials(values.email, values.password);
      showToast({
        variant: 'success',
        title: `Đăng nhập thành công`,
        description: `Xin chào ${profile.fullName}`,
      });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(resolveRouteForRole(profile.role, from), {
        replace: true,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
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
          <p className="text-xs uppercase tracking-[0.12em] text-teal-400 font-semibold">
            Neuroradiology Platform • RBAC
          </p>

          <h1 className="text-2xl xl:text-3xl font-bold text-white tracking-tight leading-[1.2]">
            Hệ thống hỗ trợ phân tích MRI sọ não & hội chẩn lâm sàng
          </h1>

          <p className="text-xs xl:text-sm text-slate-400 leading-relaxed">
            Phân quyền tách biệt cho Người dùng, Bác sĩ chuyên khoa (xác minh CCHN) và Quản trị viên bệnh viện.
          </p>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-start gap-3">
              <ScanLine className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-white">Phân loại 4 nhóm WHO CNS5 & Real CNN CAM</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hỗ trợ Glioma, Meningioma, Pituitary, No Tumor cùng tệp DICOM (.dcm) và xuất PDF A4.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Stethoscope className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-white">Trợ lý Y khoa RAG & Giám sát Kiểm toán</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tra cứu 198 tài liệu chuẩn WHO/ACR/NCI, cảnh báo cờ đỏ cấp cứu 115 và nhật ký kiểm toán đầy đủ.
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
        <div className="flex items-center justify-between w-full shrink-0 mb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-150 active:scale-98 group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:-translate-x-0.5 transition-all" />
            <span>Về trang giới thiệu</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Center Card Content */}
        <div className="w-full max-w-md mx-auto my-auto p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3.5">
          <div className="text-center space-y-1">
            <div className="lg:hidden w-10 h-10 mx-auto rounded-2xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs mb-2">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Đăng nhập NeuroScan AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống tự động điều hướng theo vai trò tài khoản được cấp phép trên máy chủ.
            </p>
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
                placeholder="email@domain.com"
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
      await registerAccount(values.fullName, values.email, values.password, 'USER');
      showToast({
        variant: 'success',
        title: 'Đăng ký tài khoản thành công',
        description: 'Hệ thống đã chuyển bạn tới Bảng điều khiển cá nhân.',
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
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-150 active:scale-98 group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:-translate-x-0.5 transition-all" />
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
                Họ và tên
              </label>
              <input
                id="reg-fullname"
                type="text"
                {...register('fullName')}
                placeholder="Ví dụ: Nguyễn Văn A"
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
                placeholder="nguyenvana@gmail.com"
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
              <span>Tạo tài khoản</span>
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
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [targetEmail, setTargetEmail] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [devResetCode, setDevResetCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailDelivered, setEmailDelivered] = useState<boolean | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onRequestSubmit = async (values: ForgotFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await neuroscanAdapter.requestPasswordReset(values.email);
      setTargetEmail(values.email.trim().toLowerCase());
      setSubmittedMessage(res.message);
      setDevResetCode(res.devResetCode ?? null);
      setNotice(res.notice ?? null);
      setEmailDelivered(res.emailDelivered ?? false);
      if (res.devResetCode) {
        setResetCode(res.devResetCode);
      }
      setStep('reset');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!resetCode.trim()) {
      setErrorMsg('Vui lòng nhập mã xác nhận 6 chữ số.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await neuroscanAdapter.confirmPasswordReset(
        targetEmail,
        resetCode.trim(),
        newPassword
      );
      showToast({
        variant: 'success',
        title: 'Đặt lại mật khẩu thành công',
        description: res.message,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-150 active:scale-98 group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:-translate-x-0.5 transition-all" />
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
              {step === 'request'
                ? 'Nhập email tài khoản để nhận mã xác nhận đặt lại mật khẩu (hiệu lực 15 phút).'
                : `Nhập mã xác nhận đã gửi tới ${targetEmail} cùng mật khẩu mới.`}
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

          {step === 'request' ? (
            <form onSubmit={handleSubmit(onRequestSubmit)} className="space-y-4" noValidate>
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
                  placeholder="email@domain.com"
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
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Gửi mã xác nhận</span>
              </button>
            </form>
          ) : (
            <form onSubmit={onResetSubmit} className="space-y-4" noValidate>
              {notice ? (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                    emailDelivered
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {emailDelivered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <span>{emailDelivered ? 'Đã phát email thành công' : 'Chế độ Thử nghiệm Resend / Khẩn cấp'}</span>
                  </div>
                  <p className="leading-relaxed">{notice}</p>
                  {emailDelivered && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      💡 Mẹo: Nếu không thấy trong Hộp thư chính, vui lòng kiểm tra mục <strong>Thư rác (Spam)</strong> hoặc tab <strong>Quảng cáo (Promotions)</strong> của Gmail.
                    </p>
                  )}
                  {devResetCode && (
                    <div className="pt-1 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Mã xác nhận cấp trực tiếp:</div>
                        <div className="font-mono font-bold text-base text-amber-600 dark:text-amber-400 tracking-wider">
                          {devResetCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResetCode(devResetCode)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors cursor-pointer"
                      >
                        Điền mã ngay
                      </button>
                    </div>
                  )}
                </div>
              ) : submittedMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Đã khởi tạo mã xác nhận</span>
                  </div>
                  <p>{submittedMessage}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="reset-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã xác nhận (6 chữ số)
                </label>
                <input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reset-new-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reset-confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Xác nhận đặt lại mật khẩu</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
