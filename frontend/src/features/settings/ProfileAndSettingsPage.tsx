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
  organizationOrUnit: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfileAndSettingsPage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const preferenceSavingRef = useRef(false);
  const profileDefaults = useMemo(
    () => ({
      fullName: user?.fullName || '',
      organizationOrUnit: user?.organizationOrUnit || '',
      phone: user?.phone || '',
    }),
    [user?.fullName, user?.organizationOrUnit, user?.phone],
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

  useEffect(() => {
    reset(profileDefaults);
  }, [profileDefaults, reset]);

  if (!user) return null;

  const onSaveProfile = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await updateCurrentUser({
        fullName: values.fullName,
        organizationOrUnit: values.organizationOrUnit,
        phone: values.phone,
      });
      showToast({
        variant: 'success',
        title: 'Đã cập nhật thông tin hồ sơ trong phiên làm việc',
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
        description="Quản lý thông tin tài khoản giả lập, giao diện Sáng/Tối, tùy chọn thông báo và quyền kiểm soát dữ liệu phân tích MRI."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Profile Overview Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-navy-800 dark:bg-teal-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                {user.role === 'DOCTOR' ? (
                  <Stethoscope className="w-8 h-8" />
                ) : (
                  <UserCircle className="w-8 h-8" />
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 mb-1">
                  TÀI KHOẢN GIẢ LẬP (DEMO)
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.fullName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Vai trò hệ thống (RBAC):</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                  {user.role}
                </span>
              </div>
              {user.specialty && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Chuyên khoa:</span>
                  <span className="font-medium text-right">{user.specialty}</span>
                </div>
              )}
              {user.licenseCodeDemo && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Mã CCHN (Giả lập):</span>
                  <span className="font-mono">{user.licenseCodeDemo}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày khởi tạo:</span>
                <span>{formatDateVN(user.joinedAt)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Lưu ý phân quyền (RBAC):</strong> Vai trò <code>{user.role}</code> được bảo vệ
              cố định. Người dùng không thể tự chỉnh sửa vai trò sang <code>DOCTOR</code> từ phía
              Frontend.
            </div>
          </div>

          {/* Theme Switcher Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Palette className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Giao diện Sáng / Tối (Theme)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn chế độ màu phù hợp với môi trường làm việc hoặc phòng đọc phim tối.
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

        {/* Right: Edit Profile, Notifications & Privacy (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Edit Profile Form */}
          <form
            onSubmit={handleSubmit(onSaveProfile)}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Chỉnh sửa thông tin hiển thị (Trong phiên Demo)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="prof-fullname"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Họ và tên hiển thị
                </label>
                <input
                  id="prof-fullname"
                  type="text"
                  {...register('fullName')}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.fullName && (
                  <p className="text-xs text-rose-600">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="prof-phone"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Số điện thoại liên hệ (Giả lập)
                </label>
                <input
                  id="prof-phone"
                  type="text"
                  {...register('phone')}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="prof-org"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Đơn vị học tập / Công tác (Giả lập)
              </label>
              <input
                id="prof-org"
                type="text"
                {...register('organizationOrUnit')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving || isSavingPreference}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Lưu thay đổi hồ sơ</span>
              </button>
            </div>
          </form>

          {/* Notification & Privacy Toggles */}
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

          {/* Data Governance & Clear Session History */}
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
