import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Stethoscope,
  Activity,
  BookOpen,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/app/providers/ToastProvider';
import {
  neuroscanAdapter,
  type AdminDoctorRecord,
  type AuditLogRecord,
  type BackendFaqDoc,
  type TelemetryErrorRecord,
} from '@/services/api/neuroscanAdapter';

type AdminTab = 'doctors' | 'audit' | 'faq' | 'telemetry';

export const AdminPortalPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('doctors');

  // Doctors state
  const [doctors, setDoctors] = useState<AdminDoctorRecord[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [docForm, setDocForm] = useState({
    fullName: '',
    email: '',
    password: '',
    licenseNo: '',
    specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
    organization: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
    phone: '',
  });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  // FAQ state
  const [faqs, setFaqs] = useState<BackendFaqDoc[]>([]);
  const [loadingFaq, setLoadingFaq] = useState(false);
  const [indexingRag, setIndexingRag] = useState(false);
  const [creatingFaq, setCreatingFaq] = useState(false);
  const [faqForm, setFaqForm] = useState({
    title: '',
    content: '',
    source: 'WHO CNS5 / ACR Guidelines',
    category: 'tumor_classification',
  });

  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const list = await neuroscanAdapter.getAdminDoctors();
      setDoctors(list);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không tải được danh sách Bác sĩ',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setLoadingDoctors(false);
    }
  }, [showToast]);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const logs = await neuroscanAdapter.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không tải được Nhật ký Kiểm toán',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setLoadingAudit(false);
    }
  }, [showToast]);

  const loadFaqs = useCallback(async () => {
    setLoadingFaq(true);
    try {
      const docs = await neuroscanAdapter.getFaqDocuments();
      setFaqs(docs);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không tải được kho FAQ',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setLoadingFaq(false);
    }
  }, [showToast]);

  // Telemetry state
  const [telemetryErrors, setTelemetryErrors] = useState<TelemetryErrorRecord[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  const loadTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      const list = await neuroscanAdapter.getTelemetryErrors();
      setTelemetryErrors(list);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không tải được Nhật ký Giám sát lỗi',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setLoadingTelemetry(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0) {
      void loadAuditLogs();
    } else if (activeTab === 'faq' && faqs.length === 0) {
      void loadFaqs();
    } else if (activeTab === 'telemetry' && telemetryErrors.length === 0) {
      void loadTelemetry();
    }
  }, [activeTab, auditLogs.length, faqs.length, telemetryErrors.length, loadAuditLogs, loadFaqs, loadTelemetry]);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.fullName.trim() || !docForm.email.trim() || docForm.password.length < 6 || !docForm.licenseNo.trim()) {
      showToast({
        variant: 'warning',
        title: 'Thiếu thông tin bắt buộc',
        description: 'Vui lòng nhập đầy đủ Họ tên, Email, Mật khẩu (>= 6 ký tự) và Số CCHN.',
      });
      return;
    }

    setCreatingDoctor(true);
    try {
      const created = await neuroscanAdapter.createDoctorAccount(docForm);
      setDoctors((prev) => [created, ...prev]);
      setDocForm({
        fullName: '',
        email: '',
        password: '',
        licenseNo: '',
        specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
        organization: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
        phone: '',
      });
      setShowCreateForm(false);
      showToast({
        variant: 'success',
        title: 'Cấp tài khoản Bác sĩ thành công',
        description: `${created.fullName} (${created.email}) đã sẵn sàng đăng nhập.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không thể cấp tài khoản Bác sĩ',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleToggleStatus = async (doc: AdminDoctorRecord) => {
    setTogglingId(doc.id);
    try {
      const nextActive = !doc.isActive;
      await neuroscanAdapter.toggleDoctorAccountStatus(doc.id, nextActive);
      setDoctors((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, isActive: nextActive } : item))
      );
      showToast({
        variant: 'success',
        title: nextActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản & thu hồi phiên',
        description: doc.email,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Thao tác thất bại',
        description: err instanceof Error ? err.message : 'Không thể cập nhật trạng thái tài khoản.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.title.trim() || !faqForm.content.trim()) {
      showToast({
        variant: 'warning',
        title: 'Thiếu nội dung tài liệu',
        description: 'Vui lòng nhập Tiêu đề và Nội dung kiến thức y khoa.',
      });
      return;
    }
    setCreatingFaq(true);
    try {
      await neuroscanAdapter.createFaqDocument(faqForm);
      setFaqForm({
        title: '',
        content: '',
        source: 'WHO CNS5 / ACR Guidelines',
        category: 'tumor_classification',
      });
      await loadFaqs();
      showToast({
        variant: 'success',
        title: 'Đã thêm tài liệu FAQ mới',
        description: 'Hãy bấm "Đồng bộ Vectorize RAG" để Trợ lý AI sử dụng ngay tài liệu này.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Thêm FAQ thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setCreatingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    try {
      await neuroscanAdapter.deleteFaqDocument(id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      showToast({ variant: 'success', title: 'Đã xóa tài liệu FAQ' });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không thể xóa tài liệu',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    }
  };

  const handleReindexRag = async () => {
    setIndexingRag(true);
    try {
      const msg = await neuroscanAdapter.triggerRagIndex();
      showToast({
        variant: 'success',
        title: 'Đồng bộ Vectorize RAG thành công',
        description: msg,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Đồng bộ RAG thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setIndexingRag(false);
    }
  };

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.actor_email.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.resource_type.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Cổng Quản trị Bệnh viện (ADMIN)"
        title="Quản trị Tài khoản Bác sĩ, Kiểm toán & Tri thức Y khoa"
        description="Cấp phát & quản lý tài khoản Bác sĩ có Chứng chỉ Hành nghề (CCHN), theo dõi Nhật ký Kiểm toán bảo mật và đồng bộ kho tri thức RAG."
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('doctors')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'doctors'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Tài khoản Bác sĩ ({doctors.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Nhật ký Kiểm toán (Audit Logs)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Kho Kiến thức FAQ / RAG
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telemetry')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Giám sát Lỗi 24/7
        </button>
      </div>

      {/* TAB 1: DOCTORS MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="motion-tab-enter space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Đăng ký công khai chỉ cấp quyền USER. Tài khoản Bác sĩ chỉ do Quản trị viên cấp tại đây.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadDoctors()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {showCreateForm ? 'Đóng biểu mẫu' : 'Cấp tài khoản Bác sĩ'}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <form
              onSubmit={handleCreateDoctor}
              className="rounded-2xl border border-teal-500/30 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Thông tin Cấp tài khoản Bác sĩ Chuyên khoa mới
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Họ và tên Bác sĩ *
                  </label>
                  <input
                    type="text"
                    required
                    value={docForm.fullName}
                    onChange={(e) => setDocForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="BS.CKI Nguyễn Văn Hùng"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email công vụ *
                  </label>
                  <input
                    type="email"
                    required
                    value={docForm.email}
                    onChange={(e) => setDocForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="bs.hung@hospital.vn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mật khẩu khởi tạo (tối thiểu 6 ký tự) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={docForm.password}
                    onChange={(e) => setDocForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Số Chứng chỉ Hành nghề (CCHN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={docForm.licenseNo}
                    onChange={(e) => setDocForm((p) => ({ ...p, licenseNo: e.target.value }))}
                    placeholder="CCHN-2026-NEURO-9001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Chuyên khoa
                  </label>
                  <input
                    type="text"
                    value={docForm.specialty}
                    onChange={(e) => setDocForm((p) => ({ ...p, specialty: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Đơn vị / Bệnh viện
                  </label>
                  <input
                    type="text"
                    value={docForm.organization}
                    onChange={(e) => setDocForm((p) => ({ ...p, organization: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingDoctor}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  {creatingDoctor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận Cấp tài khoản
                </button>
              </div>
            </form>
          )}

          {loadingDoctors ? (
            <LoadingState title="Đang tải danh sách tài khoản Bác sĩ..." />
          ) : doctors.length === 0 ? (
            <EmptyState
              title="Chưa có tài khoản Bác sĩ nào"
              description="Bấm 'Cấp tài khoản Bác sĩ' để khởi tạo tài khoản chuyên khoa mới."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-card">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Bác sĩ / Quản trị</th>
                    <th className="py-3 px-4 font-semibold">Vai trò</th>
                    <th className="py-3 px-4 font-semibold">Số CCHN & Chuyên khoa</th>
                    <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{doc.fullName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{doc.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            doc.role === 'admin'
                              ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                              : 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                          }`}
                        >
                          {doc.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {doc.licenseNo || '—'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {doc.specialty}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {doc.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={togglingId === doc.id || doc.role === 'admin'}
                          onClick={() => void handleToggleStatus(doc)}
                          title={doc.role === 'admin' ? 'Không thể khóa tài khoản quản trị' : undefined}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer ${
                            doc.isActive
                              ? 'border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {togglingId === doc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : doc.isActive ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          {doc.isActive ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="motion-tab-enter space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Lọc theo hành động, email, chi tiết..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadAuditLogs()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tải lại nhật ký
            </button>
          </div>

          {loadingAudit ? (
            <LoadingState title="Đang tải Nhật ký Kiểm toán..." />
          ) : filteredAuditLogs.length === 0 ? (
            <EmptyState
              title="Chưa có bản ghi kiểm toán phù hợp"
              description="Các sự kiện đăng nhập, duyệt ca chụp, xóa dữ liệu hoặc cấp tài khoản sẽ xuất hiện tại đây."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Thời gian</th>
                    <th className="py-3 px-4 font-semibold">Tài khoản</th>
                    <th className="py-3 px-4 font-semibold">Hành động</th>
                    <th className="py-3 px-4 font-semibold">Tài nguyên</th>
                    <th className="py-3 px-4 font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.created_at}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {log.actor_email || 'Khách / Hệ thống'}
                        </div>
                        <div className="text-[10px] uppercase text-slate-400">{log.actor_role}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {log.resource_type}
                        {log.resource_id ? ` #${log.resource_id}` : ''}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FAQ & RAG KNOWLEDGE MANAGEMENT */}
      {activeTab === 'faq' && (
        <div className="motion-tab-enter space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng số tài liệu y khoa đang lưu trên D1: <strong>{faqs.length}</strong>
            </p>
            <button
              type="button"
              disabled={indexingRag}
              onClick={() => void handleReindexRag()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60 cursor-pointer"
            >
              {indexingRag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Đồng bộ Vectorize RAG
            </button>
          </div>

          <form
            onSubmit={handleCreateFaq}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Bổ sung Tài liệu Tri thức Y khoa mới
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={faqForm.title}
                onChange={(e) => setFaqForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Tiêu đề tài liệu / câu hỏi y khoa..."
                className="md:col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
              />
              <input
                type="text"
                value={faqForm.source}
                onChange={(e) => setFaqForm((p) => ({ ...p, source: e.target.value }))}
                placeholder="Nguồn dẫn (WHO / ACR / NCI)"
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
              />
            </div>
            <textarea
              rows={3}
              required
              value={faqForm.content}
              onChange={(e) => setFaqForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Nội dung kiến thức y khoa chuẩn hóa phục vụ RAG..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingFaq}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white disabled:opacity-60 cursor-pointer"
              >
                {creatingFaq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Lưu tài liệu FAQ
              </button>
            </div>
          </form>

          {loadingFaq ? (
            <LoadingState title="Đang tải kho tài liệu FAQ..." />
          ) : (
            <div className="space-y-2.5">
              {faqs.slice(0, 30).map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        #{doc.id} • {doc.category}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {doc.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {doc.content}
                    </p>
                    <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                      Nguồn: {doc.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFaq(doc.id)}
                    aria-label={`Xóa tài liệu ${doc.title}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRODUCTION ERROR TELEMETRY (24/7 OBSERVABILITY) */}
      {activeTab === 'telemetry' && (
        <div className="motion-tab-enter space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống tự động ghi nhận lỗi runtime ẩn danh từ Trình duyệt (Window / React ErrorBoundary) và Cloudflare Worker (HTTP 500).
            </p>
            <button
              type="button"
              onClick={() => void loadTelemetry()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới Telemetry
            </button>
          </div>

          {loadingTelemetry ? (
            <LoadingState title="Đang tải Nhật ký Giám sát lỗi..." />
          ) : telemetryErrors.length === 0 ? (
            <EmptyState
              title="Hệ thống đang vận hành ổn định (0 lỗi ghi nhận)"
              description="Chưa phát hiện sự cố runtime nào từ phía trình duyệt hoặc máy chủ Worker."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Thời gian</th>
                    <th className="py-3 px-4 font-semibold">Nguồn</th>
                    <th className="py-3 px-4 font-semibold">Đường dẫn</th>
                    <th className="py-3 px-4 font-semibold">Thông báo lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                  {telemetryErrors.map((errItem) => (
                    <tr key={errItem.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {errItem.created_at}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          {errItem.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {errItem.route || '/'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 max-w-lg">
                        <div className="font-medium">{errItem.message}</div>
                        {errItem.stack && (
                          <pre className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 whitespace-pre-wrap line-clamp-2 font-mono">
                            {errItem.stack}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
