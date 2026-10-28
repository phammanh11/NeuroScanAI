import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Stethoscope,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Eye,
  Save,
  Loader2,
  ArrowLeft,
  UserCheck,
  Users,
  ScanLine,
  MessageSquareHeart,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { MRIViewer } from '@/components/medical/MRIViewer';
import { PredictionCard } from '@/components/medical/PredictionCard';
import { ProbabilityChart } from '@/components/charts/ProbabilityChart';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import {
  AI_ASSESSMENT_VERDICT_META,
  DOCTOR_REVIEW_STATUS_META,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatDateTimeVN, formatPercent, normalizeSearchText } from '@/utils/formatters';
import type {
  AIAssessmentVerdict,
  DoctorReviewStatus,
  MRIAnalysisRecord,
  TumorLabel,
} from '@/types/domain';

/**
 * 1. DOCTOR DASHBOARD — /doctor/dashboard
 * Thiết kế riêng cho vai trò Bác sĩ: tập trung vào quy trình xử lý ca bệnh được phân công,
 * tách biệt rõ nhận định lâm sàng với kết quả tự động của AI.
 */
export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<MRIAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loadCasesRequestRef = useRef(0);

  const loadCases = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadCasesRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await neuroscanAdapter.getDoctorCases(user.id);
      if (requestId !== loadCasesRequestRef.current) return;
      setCases(list);
    } catch (err) {
      if (requestId !== loadCasesRequestRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách ca bệnh.');
    } finally {
      if (requestId === loadCasesRequestRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadCases();
    return () => {
      loadCasesRequestRef.current += 1;
    };
  }, [loadCases]);

  if (isLoading) {
    return (
      <LoadingState
        title="Đang tải Bảng điều khiển Chuyên môn Bác sĩ..."
        description="Đang đồng bộ danh sách các ca MRI được người dùng đồng ý chia sẻ."
      />
    );
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} onRetry={loadCases} />;
  }

  const pendingCount = cases.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length;
  const inReviewCount = cases.filter((c) => c.reviewStatus === 'IN_REVIEW').length;
  const reviewedCount = cases.filter((c) => c.reviewStatus === 'REVIEWED').length;
  const needsInfoCount = cases.filter((c) => c.reviewStatus === 'NEEDS_MORE_INFO').length;

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Doctor Workstation (RBAC: DOCTOR) • Dữ liệu Ca bệnh Giả lập"
        title={`Bảng điều khiển Bác sĩ: ${user?.fullName}`}
        description={`${user?.specialty || 'Chẩn đoán hình ảnh Thần kinh'} • Chỉ hiển thị các ca MRI đã được người sử dụng đồng ý chia sẻ hợp lệ.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/doctor/patients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Danh sách Bệnh nhân</span>
            </Link>
            <Link
              to="/doctor/vision-analysis"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-teal-500/40 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span>Computer Vision Lab</span>
            </Link>
            <Link
              to="/doctor/ai-assistant"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100"
            >
              <MessageSquareHeart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Trợ lý AI Bác sĩ</span>
            </Link>
            <Link
              to="/doctor/cases"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Ca MRI ({cases.length})</span>
            </Link>
          </div>
        }
      />

      {/* Clinical Queue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
            <span>Chờ xem xét (Pending)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {pendingCount} ca
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Yêu cầu mới từ người dùng chờ tiếp nhận
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800 dark:text-sky-300">
            <span>Đang xem xét (In Review)</span>
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {inReviewCount} ca
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Đang đối chiếu hình ảnh & triệu chứng
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>Đã hoàn tất xem xét</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {reviewedCount} ca
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Đã gửi nhận xét chuyên môn cho người dùng
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
            <span>Cần bổ sung thông tin</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {needsInfoCount} ca
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Thiếu chuỗi xung DICOM hoặc dữ liệu lâm sàng
          </p>
        </div>
      </div>

      {/* Priority Queue Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Danh sách yêu cầu xem xét MRI được phân công (DEMO)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhấn “Mở Trạm Đọc & Review” để xem MRI Viewer, đối chiếu xác suất AI và ghi chú
              chuyên môn.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
            Chỉ hiển thị ca có Consent hợp lệ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-3 font-semibold">Mã phiên & Mã hồ sơ</th>
                <th className="py-3 px-3 font-semibold">Triệu chứng người bệnh gửi</th>
                <th className="py-3 px-3 font-semibold">Gợi ý từ AI (Tham khảo)</th>
                <th className="py-3 px-3 font-semibold">Trạng thái xử lý ca</th>
                <th className="py-3 pl-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {cases.map((c) => {
                const labelMeta = TUMOR_LABEL_METADATA[c.predictedLabel];
                const statusMeta = DOCTOR_REVIEW_STATUS_META[c.reviewStatus];
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 pr-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.sessionCode}
                      </div>
                      <div className="text-[11px] text-slate-500">{c.ownerDisplayCode}</div>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                        {c.patientSymptomNote || 'Không có ghi chú triệu chứng kèm theo'}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${labelMeta.badgeColorClass}`}
                      >
                        {c.predictedLabel} ({formatPercent(c.confidenceScore)})
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <Link
                        to={`/doctor/cases/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mở Trạm Đọc & Review</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MedicalDisclaimer compact />
    </div>
  );
};

/**
 * 2. DOCTOR CASES LIST — /doctor/cases
 */
export const DoctorCasesListPage: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<MRIAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<DoctorReviewStatus | 'ALL'>('ALL');
  const [labelFilter, setLabelFilter] = useState<TumorLabel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCases = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await neuroscanAdapter.getDoctorCases(user.id);
      setCases(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi tải danh sách ca MRI.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== 'ALL' && c.reviewStatus !== statusFilter) return false;
      if (labelFilter !== 'ALL' && c.predictedLabel !== labelFilter) return false;
      const q = normalizeSearchText(searchQuery);
      if (
        q &&
        !normalizeSearchText(c.sessionCode).includes(q) &&
        !normalizeSearchText(c.ownerDisplayCode).includes(q) &&
        !normalizeSearchText(c.patientSymptomNote || '').includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [cases, statusFilter, labelFilter, searchQuery]);

  if (isLoading) return <LoadingState title="Đang tải danh sách ca MRI..." />;
  if (errorMsg) return <ErrorState message={errorMsg} onRetry={loadCases} />;

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Quản lý Ca MRI • Vai trò DOCTOR"
        title="Danh sách các ca MRI được phân công xem xét"
        description="Lọc theo trạng thái xử lý ca, nhãn gợi ý của AI hoặc tìm kiếm theo mã phiên phân tích."
      />

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label
            htmlFor="doc-search"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Tìm kiếm mã ca / triệu chứng
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="doc-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="NS-2026-1001, đau đầu..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="doc-status-filter"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Trạng thái xử lý ca
          </label>
          <select
            id="doc-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DoctorReviewStatus | 'ALL')}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_REVIEW">Chờ xem xét</option>
            <option value="IN_REVIEW">Đang xem xét</option>
            <option value="REVIEWED">Đã xem xét</option>
            <option value="NEEDS_MORE_INFO">Cần bổ sung thông tin</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="doc-label-filter"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Nhãn dự đoán từ AI
          </label>
          <select
            id="doc-label-filter"
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value as TumorLabel | 'ALL')}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
          >
            <option value="ALL">Tất cả 4 nhãn</option>
            <option value="Glioma">Glioma</option>
            <option value="Meningioma">Meningioma</option>
            <option value="Pituitary">Pituitary</option>
            <option value="No Tumor">No Tumor</option>
          </select>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <EmptyState
          title="Không có ca bệnh nào khớp bộ lọc"
          description="Thử chọn lại trạng thái xử lý hoặc nhãn dự đoán."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCases.map((c) => {
            const labelMeta = TUMOR_LABEL_METADATA[c.predictedLabel];
            const statusMeta = DOCTOR_REVIEW_STATUS_META[c.reviewStatus];

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {c.sessionCode}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={c.imageUrl}
                      alt={`Ảnh MRI minh họa ca ${c.sessionCode}, nhãn AI ${c.predictedLabel}`}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0 space-y-1 text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.ownerDisplayCode}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-bold border ${labelMeta.badgeColorClass}`}
                        >
                          AI: {c.predictedLabel} ({formatPercent(c.confidenceScore)})
                        </span>
                        <span className="text-slate-400">
                          Chia sẻ: {formatDateTimeVN(c.sharedWithDoctorAt || c.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                    <strong>Triệu chứng ghi nhận:</strong>{' '}
                    {c.patientSymptomNote || 'Chưa cung cấp mô tả triệu chứng.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500">
                    {c.doctorReview
                      ? `Đã cập nhật bởi ${c.doctorReview.doctorName}`
                      : 'Chưa có ghi chú chuyên môn'}
                  </span>
                  <Link
                    to={`/doctor/cases/${c.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Xem & Cập nhật Review</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * 3. DOCTOR CASE DETAIL & CLINICAL REVIEW WORKSTATION — /doctor/cases/:id
 */
export const DoctorCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [record, setRecord] = useState<MRIAnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [status, setStatus] =
    useState<Exclude<DoctorReviewStatus, 'NONE'>>('IN_REVIEW');
  const [aiAssessment, setAiAssessment] =
    useState<AIAssessmentVerdict>('PARTIAL_CONCORDANCE');
  const [clinicalNote, setClinicalNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [recommendedStep, setRecommendedStep] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const loadRequestRef = useRef(0);

  const loadCaseDetail = useCallback(async () => {
    if (!id) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await neuroscanAdapter.getAnalysisById(id);
      if (requestId !== loadRequestRef.current) return;
      setRecord(data);
      if (data.doctorReview && data.reviewStatus !== 'PENDING_REVIEW') {
        setStatus(data.doctorReview.status);
        setAiAssessment(data.doctorReview.aiAssessment);
        setClinicalNote(data.doctorReview.clinicalNoteForPatient);
        setInternalNote(data.doctorReview.internalTechnicalNote || '');
        setRecommendedStep(data.doctorReview.recommendedNextStep);
      } else {
        setStatus(data.reviewStatus === 'NEEDS_MORE_INFO' ? 'NEEDS_MORE_INFO' : 'IN_REVIEW');
        setClinicalNote(
          '[Nhận xét minh họa] Đã xem lát cắt MRI và đối chiếu với nhãn gợi ý của mô hình AI. Khuyến nghị mang đầy đủ chuỗi xung DICOM để đánh giá toàn diện.',
        );
        setRecommendedStep(
          'Khám trực tiếp chuyên khoa Ngoại Thần kinh / Chẩn đoán hình ảnh.',
        );
      }
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải chi tiết ca bệnh.');
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCaseDetail();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadCaseDetail]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !user) return;
    if (!clinicalNote.trim()) {
      showToast({
        variant: 'warning',
        title: 'Vui lòng nhập ghi chú chuyên môn dành cho người bệnh',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await neuroscanAdapter.submitDoctorReview(
        {
          analysisId: record.id,
          status,
          aiAssessment,
          clinicalNoteForPatient: clinicalNote,
          internalTechnicalNote: internalNote,
          recommendedNextStep:
            recommendedStep || 'Khám chuyên khoa kèm dữ liệu DICOM gốc.',
        },
        user,
      );
      setRecord(updated);
      showToast({
        variant: 'success',
        title: `Đã lưu nhận xét chuyên môn & cập nhật trạng thái: ${DOCTOR_REVIEW_STATUS_META[status].label}`,
        description:
          'Người sử dụng (USER) sẽ nhìn thấy phản hồi này ngay trong trang Kết quả MRI của họ.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Lưu nhận xét thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState title="Đang mở Trạm Đọc Phim & Đánh giá Ca MRI..." />;
  if (errorMsg || !record) {
    return (
      <ErrorState
        message={errorMsg || 'Không tìm thấy ca MRI được phân công.'}
        onRetry={loadCaseDetail}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/doctor/cases"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách ca MRI</span>
        </Link>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
          Hồ sơ chia sẻ hợp lệ: {record.ownerDisplayCode}
        </span>
      </div>

      <PageHeader
        badgeText={`Trạm xử lý ca ${record.sessionCode} • Vai trò DOCTOR`}
        title={`Đánh giá chuyên môn ca MRI: ${record.sessionCode}`}
        description="Quan sát lát cắt MRI, ảnh tiền xử lý ROI/CLAHE (nếu có), kiểm tra xác suất 4 lớp của AI và ghi nhận định chuyên môn độc lập."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: MRI Viewer + AI Probabilities (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <MRIViewer
            imageUrl={record.imageUrl}
            preprocessedImageUrl={record.preprocessedImageUrl}
            gradcamUrl={record.gradcamUrl}
            sessionCode={record.sessionCode}
            sanitizedFileName={record.sanitizedFileName}
            dimensions={record.imageDimensions}
            isDemoFixture={record.isDemoFixture}
          />

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>Thông tin triệu chứng do người sử dụng cung cấp</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {record.patientSymptomNote ||
                'Người sử dụng không đính kèm mô tả triệu chứng cụ thể.'}
            </p>
          </div>

          <ProbabilityChart
            probabilities={record.probabilities}
            isDemoFixture={record.isDemoFixture}
          />
        </div>

        {/* Right: Doctor Review Form + AI Prediction Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Doctor Clinical Review Form */}
          <form
            onSubmit={handleSaveReview}
            className="rounded-2xl border-2 border-sky-500/35 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Phiếu Nhận xét Chuyên môn của Bác sĩ
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                Độc lập với AI
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="review-status-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                1. Cập nhật trạng thái ca bệnh
              </label>
              <select
                id="review-status-select"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Exclude<DoctorReviewStatus, 'NONE'>)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold"
              >
                <option value="IN_REVIEW">Đang xem xét (In Review)</option>
                <option value="REVIEWED">Đã xem xét — Hoàn tất phản hồi (Reviewed)</option>
                <option value="NEEDS_MORE_INFO">
                  Cần bổ sung thông tin / Chuỗi xung (Needs More Info)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ai-verdict-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                2. Đánh giá kết quả phân loại tự động của AI ({record.predictedLabel})
              </label>
              <select
                id="ai-verdict-select"
                value={aiAssessment}
                onChange={(e) => setAiAssessment(e.target.value as AIAssessmentVerdict)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
              >
                {Object.entries(AI_ASSESSMENT_VERDICT_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="clinical-note-patient"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                3. Ghi chú chuyên môn chia sẻ cho người sử dụng
              </label>
              <textarea
                id="clinical-note-patient"
                rows={4}
                maxLength={4000}
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                placeholder="Nhập nhận xét chuyên môn rõ ràng, phân biệt với nhãn tự động của AI..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="recommended-step"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                4. Khuyến nghị bước tiếp theo cho người bệnh
              </label>
              <input
                id="recommended-step"
                type="text"
                value={recommendedStep}
                maxLength={1000}
                onChange={(e) => setRecommendedStep(e.target.value)}
                placeholder="Ví dụ: Mang đĩa DICOM khám chuyên khoa Ngoại Thần kinh..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="internal-tech-note"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                5. Ghi chú kỹ thuật nội bộ (Dành cho nhóm nghiên cứu AI & Bác sĩ)
              </label>
              <textarea
                id="internal-tech-note"
                rows={2}
                maxLength={4000}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Ghi chú về chất lượng lát cắt, hiện tượng nhiễu viền hoặc domain shift..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu Nhận xét Chuyên môn & Cập nhật Trạng thái</span>
            </button>
          </form>

          <PredictionCard
            predictedLabel={record.predictedLabel}
            confidenceScore={record.confidenceScore}
            isDemoFixture={record.isDemoFixture}
          />
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};

/**
 * 4. DOCTOR REVIEWS SUMMARY — /doctor/reviews
 */
export const DoctorReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<MRIAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loadReviewsRequestRef = useRef(0);

  const loadReviews = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadReviewsRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await neuroscanAdapter.getDoctorCases(user.id);
      if (requestId !== loadReviewsRequestRef.current) return;
      setCases(list.filter((c) => Boolean(c.doctorReview)));
    } catch (err) {
      if (requestId !== loadReviewsRequestRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách đánh giá.');
    } finally {
      if (requestId === loadReviewsRequestRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadReviews();
    return () => {
      loadReviewsRequestRef.current += 1;
    };
  }, [loadReviews]);

  if (isLoading) return <LoadingState title="Đang tải danh sách đánh giá kết quả AI..." />;
  if (errorMsg) {
    return (
      <ErrorState
        message={errorMsg}
        onRetry={loadReviews}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Đánh giá Kết quả AI • Vai trò DOCTOR"
        title="Tổng hợp nhận xét chuyên môn & Đối chiếu nhãn AI"
        description="Theo dõi mức độ đồng thuận giữa nhãn dự đoán tự động của AI và nhận định chuyên môn của Bác sĩ trên các ca giả lập."
      />

      {cases.length === 0 ? (
        <EmptyState
          title="Chưa có bản ghi đánh giá nào"
          description="Hãy mở một ca bệnh trong danh sách ca MRI để lưu nhận xét chuyên môn."
        />
      ) : (
        <div className="space-y-4">
          {cases.map((c) => {
            const rev = c.doctorReview!;
            const verdictMeta = AI_ASSESSMENT_VERDICT_META[rev.aiAssessment];
            const statusMeta = DOCTOR_REVIEW_STATUS_META[c.reviewStatus];

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {c.sessionCode}
                    </span>
                    <span className="text-xs text-slate-500">• Nhãn AI: {c.predictedLabel}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${verdictMeta.badgeClass}`}
                    >
                      {verdictMeta.label}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong>Nhận xét gửi người bệnh:</strong> {rev.clinicalNoteForPatient}
                </p>

                {rev.internalTechnicalNote && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                    <strong>Ghi chú kỹ thuật nội bộ:</strong> {rev.internalTechnicalNote}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>Cập nhật lúc: {formatDateTimeVN(rev.updatedAt)}</span>
                  <Link
                    to={`/doctor/cases/${c.id}`}
                    className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Chỉnh sửa nhận xét →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * 5. DOCTOR HISTORY — /doctor/history
 */
export const DoctorHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<MRIAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loadHistoryRequestRef = useRef(0);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadHistoryRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await neuroscanAdapter.getDoctorCases(user.id);
      if (requestId !== loadHistoryRequestRef.current) return;
      setCases(
        list.filter(
          (c) => c.reviewStatus === 'REVIEWED' || c.reviewStatus === 'NEEDS_MORE_INFO',
        ),
      );
    } catch (err) {
      if (requestId !== loadHistoryRequestRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải lịch sử xử lý ca.');
    } finally {
      if (requestId === loadHistoryRequestRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
    return () => {
      loadHistoryRequestRef.current += 1;
    };
  }, [loadHistory]);

  if (isLoading) return <LoadingState title="Đang tải lịch sử các ca đã xử lý..." />;
  if (errorMsg) {
    return (
      <ErrorState
        message={errorMsg}
        onRetry={loadHistory}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Lịch sử Xử lý Ca • Vai trò DOCTOR"
        title="Lịch sử các ca MRI Bác sĩ đã hoàn tất xem xét"
        description="Danh sách các phiên đã được Bác sĩ phản hồi (Đã xem xét hoặc Yêu cầu bổ sung thông tin)."
      />

      {cases.length === 0 ? (
        <EmptyState
          title="Chưa có ca bệnh nào hoàn tất xử lý"
          description="Khi bạn cập nhật trạng thái ca thành 'Đã xem xét', bản ghi sẽ lưu tại đây."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3.5 px-4 font-semibold">Mã phiên</th>
                  <th className="py-3.5 px-4 font-semibold">Hồ sơ giả lập</th>
                  <th className="py-3.5 px-4 font-semibold">Nhãn AI</th>
                  <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3.5 px-4 font-semibold">Cập nhật</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3.5 px-4 font-mono font-bold">{c.sessionCode}</td>
                    <td className="py-3.5 px-4">{c.ownerDisplayCode}</td>
                    <td className="py-3.5 px-4 font-semibold">{c.predictedLabel}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          DOCTOR_REVIEW_STATUS_META[c.reviewStatus].badgeClass
                        }`}
                      >
                        {DOCTOR_REVIEW_STATUS_META[c.reviewStatus].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateTimeVN(c.doctorReview?.updatedAt || c.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/doctor/cases/${c.id}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white transition-colors"
                      >
                        Xem lại ca
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
