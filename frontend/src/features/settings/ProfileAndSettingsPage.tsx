import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserCircle,
  ShieldCheck,
  Bell,
  Palette,
  Trash2,
  Save,
  Loader2,
  Stethoscope,
  Camera,
  Upload,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatDateVN } from '@/utils/formatters';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự.'),
  email: z.string().trim().email('Địa chỉ email không đúng định dạng.').min(5, 'Email không được để trống.'),
  organizationOrUnit: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

/**
 * Nén và resize ảnh người dùng tải lên về dạng data URL gọn nhẹ (256x256 max)
 */
function resizeImageToDataUrl(file: File, maxDimension = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ProfileAndSettingsPage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const preferenceSavingRef = useRef(false);

  // Avatar Upload State
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password Change State
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileDefaults = useMemo(
    () => ({
      fullName: user?.fullName || '',
      email: user?.email || '',
      organizationOrUnit: user?.organizationOrUnit || '',
      phone: user?.phone || '',
    }),
    [user?.fullName, user?.email, user?.organizationOrUnit, user?.phone],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults,
  });

  const {
    register: registerPass,
    handleSubmit: handleSubmitPass,
    reset: resetPass,
    formState: { errors: passErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    reset(profileDefaults);
  }, [profileDefaults, reset]);

  if (!user) return null;

  // 1. Lưu thông tin hồ sơ & Email
  const onSaveProfile = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await updateCurrentUser({
        fullName: values.fullName,
        email: values.email,
        organizationOrUnit: values.organizationOrUnit,
        phone: values.phone,
      });
      showToast({
        variant: 'success',
        title: 'Đã cập nhật thông tin hồ sơ & Email thành công',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Cập nhật hồ sơ thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Tải và cập nhật ảnh đại diện
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        variant: 'error',
        title: 'Tệp không hợp lệ',
        description: 'Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP).',
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast({
        variant: 'error',
        title: 'Dung lượng ảnh quá lớn',
        description: 'Vui lòng chọn ảnh có kích thước dưới 8MB.',
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      await updateCurrentUser({ avatarUrl: dataUrl });
      showToast({
        variant: 'success',
        title: 'Đã cập nhật ảnh đại diện mới thành công',
      });
    } catch {
      showToast({
        variant: 'error',
        title: 'Không thể xử lý ảnh đại diện',
        description: 'Vui lòng thử lại với một ảnh khác.',
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await updateCurrentUser({ avatarUrl: '' });
      showToast({
        variant: 'info',
        title: 'Đã đặt lại ảnh đại diện mặc định',
      });
    } catch {
      showToast({
        variant: 'error',
        title: 'Không thể xóa ảnh đại diện',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 3. Đổi mật khẩu tài khoản
  const onChangePassword = async (values: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      await neuroscanAdapter.changePassword(
        user.id,
        values.currentPassword,
        values.newPassword,
      );
      resetPass({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showToast({
        variant: 'success',
        title: 'Đã đổi mật khẩu tài khoản thành công',
        description: 'Mật khẩu mới đã được cập nhật cho tài khoản của bạn.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Đổi mật khẩu thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTogglePreference = async (
    key: keyof typeof user.preferences,
    nextVal: boolean,
  ) => {
    if (isSaving || preferenceSavingRef.current) return;
    preferenceSavingRef.current = true;
    setIsSavingPreference(true);
    try {
      await updateCurrentUser({
        preferences: {
          ...user.preferences,
          [key]: nextVal,
        },
      });
      showToast({
        variant: 'info',
        title: 'Đã cập nhật tùy chọn quyền riêng tư & thông báo',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không thể cập nhật tùy chọn',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      preferenceSavingRef.current = false;
      setIsSavingPreference(false);
    }
  };

  const handleClearAllAnalyses = async () => {
    setIsClearingHistory(true);
    try {
      const removedCount = await neuroscanAdapter.clearAllUserAnalyses(user.id);
      setConfirmClearOpen(false);
      showToast({
        variant: 'success',
        title: `Đã xóa ${removedCount} bản ghi phân tích MRI khỏi phiên hiện tại`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Xóa lịch sử thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsClearingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText={`Hồ sơ & Cài đặt • Vai trò ${user.role}`}
        title={
          user.role === 'DOCTOR'
            ? 'Hồ sơ Chuyên môn Bác sĩ & Cài đặt Hệ thống'
            : 'Hồ sơ Cá nhân & Cài đặt Quyền riêng tư'
        }
        description="Quản lý thông tin tài khoản, ảnh đại diện, bảo mật mật khẩu, giao diện Sáng/Tối và quyền kiểm soát dữ liệu phân tích MRI."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Avatar & Profile Overview Card (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-5">
            {/* Avatar Section with Upload trigger */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative group">
                <div className="w-24 h-24 rounded-3xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center text-2xl font-bold shadow-md overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : user.role === 'DOCTOR' ? (
                    <Stethoscope className="w-12 h-12 text-teal-300" />
                  ) : (
                    <UserCircle className="w-12 h-12 text-slate-200" />
                  )}
                </div>

                {/* Upload Button Overlay */}
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  title="Tải ảnh mới làm ảnh đại diện"
                  className="absolute bottom-0 right-0 p-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                {/* Hidden File Input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {user.fullName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {user.email}
                </p>
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                    ROLE: {user.role} {user.isDemoAccount ? '(Tài khoản kiểm thử)' : ''}
                  </span>
                </div>
              </div>

              {/* Avatar Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Đổi ảnh đại diện</span>
                </button>

                {user.avatarUrl && (
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Xóa ảnh tùy chỉnh và quay về mặc định"
                  >
                    <span>Gỡ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Account Metadata */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 shrink-0 whitespace-nowrap">Vai trò hệ thống (RBAC):</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                  {user.role}
                </span>
              </div>
              {user.specialty && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500 shrink-0 whitespace-nowrap">Chuyên khoa:</span>
                  <span className="font-medium text-right text-slate-800 dark:text-slate-200 leading-snug">
                    {user.specialty}
                  </span>
                </div>
              )}
              {user.licenseCodeDemo && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 shrink-0 whitespace-nowrap">Mã CCHN:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{user.licenseCodeDemo}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 shrink-0 whitespace-nowrap">Ngày tham gia:</span>
                <span className="text-slate-800 dark:text-slate-200">{formatDateVN(user.joinedAt)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Bảo vệ phân quyền (RBAC):</strong> Vai trò <code>{user.role}</code> được cấp phát
              và kiểm soát an toàn từ máy chủ. Người dùng không thể tự cấp quyền vượt cấp.
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('neuroscan:request-logout'))}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất khỏi tài khoản</span>
            </button>
          </div>

          {/* Theme Switcher Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Palette className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Giao diện Sáng / Tối (Theme)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn chế độ hiển thị phù hợp với môi trường làm việc hoặc phòng đọc phim MRI tối.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                  theme === 'light'
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Chế độ Sáng (Light)
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                  theme === 'dark'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Chế độ Tối (Dark)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile + Change Password + Notifications (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Form Chỉnh sửa thông tin hồ sơ & Email */}
          <form
            onSubmit={handleSubmit(onSaveProfile)}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Thông tin Cá nhân & Liên hệ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cập nhật họ tên, địa chỉ email và thông tin đơn vị công tác của tài khoản.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Họ và tên */}
              <div className="space-y-1.5">
                <label
                  htmlFor="prof-fullname"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Họ và tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  id="prof-fullname"
                  type="text"
                  {...register('fullName')}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.fullName && (
                  <p className="text-xs text-rose-600">{errors.fullName.message}</p>
                )}
              </div>

              {/* Địa chỉ Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="prof-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Địa chỉ Email tài khoản <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="prof-email"
                    type="email"
                    {...register('email')}
                    placeholder="tenban@neuroscan.vn"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1.5">
                <label
                  htmlFor="prof-phone"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Số điện thoại liên hệ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="prof-phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="0912 345 678"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Đơn vị công tác */}
              <div className="space-y-1.5">
                <label
                  htmlFor="prof-org"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Đơn vị học tập / Công tác
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="prof-org"
                    type="text"
                    {...register('organizationOrUnit')}
                    placeholder="Khoa Chẩn đoán Hình ảnh..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving || isSavingPreference}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors shadow-xs active:scale-95"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Lưu thông tin hồ sơ & Email</span>
              </button>
            </div>
          </form>

          {/* 2. Form Đổi Mật Khẩu Tài Khoản */}
          <form
            onSubmit={handleSubmitPass(onChangePassword)}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-500/25">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Đổi Mật Khẩu Tài Khoản
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bảo mật tài khoản với mật khẩu mạnh có ít nhất 6 ký tự.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mật khẩu hiện tại */}
              <div className="space-y-1.5">
                <label
                  htmlFor="pass-current"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="pass-current"
                    type={showCurrentPass ? 'text' : 'password'}
                    {...registerPass('currentPassword')}
                    placeholder="Nhập mật khẩu cũ..."
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.currentPassword && (
                  <p className="text-xs text-rose-600">{passErrors.currentPassword.message}</p>
                )}
              </div>

              {/* Mật khẩu mới */}
              <div className="space-y-1.5">
                <label
                  htmlFor="pass-new"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="pass-new"
                    type={showNewPass ? 'text' : 'password'}
                    {...registerPass('newPassword')}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.newPassword && (
                  <p className="text-xs text-rose-600">{passErrors.newPassword.message}</p>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="space-y-1.5">
                <label
                  htmlFor="pass-confirm"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="pass-confirm"
                    type={showConfirmPass ? 'text' : 'password'}
                    {...registerPass('confirmPassword')}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.confirmPassword && (
                  <p className="text-xs text-rose-600">{passErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs active:scale-95"
              >
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Xác nhận đổi mật khẩu</span>
              </button>
            </div>
          </form>

          {/* 3. Notification & Privacy Toggles */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3>Tùy chọn Thông báo & Quyền riêng tư Dữ liệu</h3>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs sm:text-sm">
              {[
                {
                  key: 'emailNotifications' as const,
                  title: 'Cho phép thông báo qua email',
                  desc: 'Lưu tùy chọn để dùng khi hệ thống thông báo được kết nối.',
                },
                {
                  key: 'doctorReviewAlerts' as const,
                  title: 'Thông báo khi Bác sĩ cập nhật nhận xét chuyên môn',
                  desc: 'Hiển thị thông báo ngay khi ca MRI bạn chia sẻ được Bác sĩ đánh giá.',
                },
                {
                  key: 'saveHistoryConsent' as const,
                  title: 'Hiển thị ảnh thu nhỏ (Thumbnail) trong bảng Lịch sử phân tích',
                  desc: 'Khi tắt, bảng lịch sử sẽ ẩn ảnh thu nhỏ MRI để bảo vệ quyền riêng tư khi nhìn màn hình.',
                },
                {
                  key: 'anonymizeExports' as const,
                  title: 'Luôn ẩn danh tên file khi tải xuống báo cáo minh họa',
                  desc: 'Thay thế tên file gốc bằng mã định danh ẩn danh trong file báo cáo.',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={user.preferences[item.key]}
                    disabled={isSavingPreference || isSaving}
                    onChange={(e) => void handleTogglePreference(item.key, e.target.checked)}
                    aria-label={item.title}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4. Data Governance & Clear Session History (Only for USER) */}
          {user.role === 'USER' && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Quản lý & Xóa toàn bộ dữ liệu lịch sử phân tích</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Bạn có toàn quyền xóa toàn bộ các phiên phân tích MRI của mình khỏi bộ nhớ phiên
                hiện tại. Các hội thoại đang gắn trực tiếp với những phiên MRI bị xóa cũng sẽ được
                xóa để không còn ngữ cảnh mồ côi; hội thoại độc lập vẫn được giữ lại.
              </p>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa toàn bộ lịch sử phân tích MRI của tôi</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Xác nhận xóa toàn bộ lịch sử phân tích"
        description="Toàn bộ phiên phân tích MRI và các hội thoại đang gắn với những phiên đó sẽ bị xóa khỏi phiên làm việc hiện tại. Hội thoại độc lập không bị ảnh hưởng. Hành động này không thể hoàn tác."
        confirmLabel="Xóa toàn bộ lịch sử"
        isLoading={isClearingHistory}
        onConfirm={handleClearAllAnalyses}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};
