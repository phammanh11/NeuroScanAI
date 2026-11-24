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
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { MRIViewer } from '@/components/medical/MRIViewer';
import { PredictionCard } from '@/components/medical/PredictionCard';
import { ClinicalReviewReportCard } from '@/components/medical/ClinicalReviewReportCard';
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
        badgeText="Doctor Workstation (RBAC: DOCTOR) • Cloudflare D1 & ONNX Runtime"
        title={`Bảng điều khiển Bác sĩ: ${user?.fullName}`}
        description={`${user?.specialty || 'Chẩn đoán hình ảnh Thần kinh'} • Quản lý hàng đợi thẩm định chuyên môn các ca chụp MRI sọ não.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/doctor/patients"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Danh sách Bệnh nhân</span>
            </Link>
            <Link
              to="/doctor/vision-analysis"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-teal-500/40 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-colors whitespace-nowrap"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Computer Vision Lab</span>
            </Link>
            <Link
              to="/doctor/ai-assistant"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 whitespace-nowrap"
            >
              <MessageSquareHeart className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Trợ lý AI Bác sĩ</span>
            </Link>
            <Link
              to="/doctor/cases"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-colors whitespace-nowrap"
            >
              <ClipboardList className="w-3.5 h-3.5" />
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
              Danh sách yêu cầu xem xét MRI được phân công
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

        {cases.length === 0 ? (
          <EmptyState
            title="Chưa có ca chụp MRI nào trong hàng đợi"
            description="Bác sĩ có thể mở Computer Vision Lab để tải và phân tích lát cắt MRI mới hoặc kiểm tra danh sách bệnh nhân."
            action={
              <Link
                to="/doctor/vision-analysis"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span>Mở Computer Vision Lab</span>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-3 font-semibold">Ảnh & Mã phiên MRI</th>
                  <th className="py-3 px-3 font-semibold">Triệu chứng & Ghi chú lâm sàng</th>
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
                        <div className="flex items-center gap-3">
                          <img
                            src={c.imageUrl}
                            alt={c.sessionCode}
                            className="w-11 h-11 rounded-lg object-cover bg-slate-950 border border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {c.sessionCode}
                            </div>
                            <div className="text-[11px] text-slate-500">{c.ownerDisplayCode}</div>
                          </div>
                        </div>
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors whitespace-nowrap"
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
        )}
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

const CLINICAL_TUMOR_OPTIONS: {
  value: TumorLabel;
  shortVi: string;
}[] = [
  { value: 'Glioma', shortVi: 'U thần kinh đệm' },
  { value: 'Meningioma', shortVi: 'U màng não' },
  { value: 'Pituitary', shortVi: 'U tuyến yên' },
  { value: 'No Tumor', shortVi: 'Không phát hiện u' },
];

const CLINICAL_AI_VERDICT_OPTIONS: {
  value: AIAssessmentVerdict;
  shortLabel: string;
  activeClass: string;
}[] = [
  {
    value: 'CONCORDANT',
    shortLabel: 'Phù hợp quan sát',
    activeClass:
      'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30',
  },
  {
    value: 'PARTIAL_CONCORDANCE',
    shortLabel: 'Cần thêm chuỗi xung',
    activeClass:
      'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30',
  },
  {
    value: 'DISCORDANT',
    shortLabel: 'Không đồng thuận AI',
    activeClass:
      'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/30',
  },
  {
    value: 'INCONCLUSIVE_IMAGE',
    shortLabel: 'Ảnh chưa đủ kết luận',
    activeClass:
      'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 ring-1 ring-slate-500/30',
  },
];

const CLINICAL_STATUS_OPTIONS: {
  value: Exclude<DoctorReviewStatus, 'NONE'>;
  shortLabel: string;
  activeClass: string;
}[] = [
  {
    value: 'IN_REVIEW',
    shortLabel: 'Đang xem xét',
    activeClass:
      'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200',
  },
  {
    value: 'REVIEWED',
    shortLabel: 'Hoàn tất phản hồi',
    activeClass:
      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
  },
  {
    value: 'NEEDS_MORE_INFO',
    shortLabel: 'Cần bổ sung',
    activeClass:
      'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200',
  },
];

const CLINICAL_NOTE_MACROS: { title: string; text: string }[] = [
  {
    title: 'Cần thêm T1+C / FLAIR',
    text: 'Đã xem lát cắt MRI và đối chiếu với vùng gợi ý của AI. Hình ảnh đơn lát cắt chưa đủ cơ sở khẳng định bản chất tổn thương; khuyến nghị bổ sung đầy đủ chuỗi xung (T1, T1+C, T2, FLAIR) để đánh giá toàn diện.',
  },
  {
    title: 'Đồng thuận hình thái gợi ý',
    text: 'Quan sát hình thái trên lát cắt MRI phù hợp với phân loại gợi ý sơ bộ. Đề nghị người bệnh mang đầy đủ bộ phim gốc/file DICOM đến khám trực tiếp bác sĩ chuyên khoa để lập kế hoạch theo dõi hoặc xử trí phù hợp.',
  },
  {
    title: 'Chưa thấy khối bất thường rõ',
    text: 'Trên lát cắt MRI cung cấp hiện chưa ghi nhận hình ảnh khối choán chỗ bất thường rõ rệt. Tuy nhiên một lát cắt đơn lẻ không thể loại trừ hoàn toàn tổn thương nhỏ hoặc ở mặt cắt khác; cần đối chiếu thêm triệu chứng lâm sàng.',
  },
  {
    title: 'Chất lượng ảnh hạn chế',
    text: 'Lát cắt MRI tải lên có độ phân giải thấp hoặc nhiễu chuyển động, hạn chế khả năng quan sát ranh giới giải phẫu. Đề nghị cung cấp bản chụp gốc định dạng DICOM hoặc ảnh rõ nét hơn.',
  },
];

const RECOMMENDED_STEP_CHIPS: string[] = [
  'Khám trực tiếp chuyên khoa Ngoại Thần kinh / Chẩn đoán hình ảnh kèm file DICOM gốc.',
  'Chụp bổ sung MRI sọ não có tiêm thuốc đối quang từ (T1+C, T2, FLAIR).',
  'Khám chuyên khoa Nội tiết & đo thị trường (đối với tổn thương vùng hố yên).',
  'Theo dõi triệu chứng lâm sàng và tái khám định kỳ sau 6 tháng.',
];

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
    useState<Exclude<DoctorReviewStatus, 'NONE'>>('REVIEWED');
  const [confirmedLabel, setConfirmedLabel] = useState<TumorLabel>('Glioma');
  const [aiAssessment, setAiAssessment] =
    useState<AIAssessmentVerdict>('PARTIAL_CONCORDANCE');
  const [clinicalNote, setClinicalNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [recommendedStep, setRecommendedStep] = useState('');
  const [formMode, setFormMode] = useState<'edit' | 'preview'>('edit');
  const [showInternalNote, setShowInternalNote] = useState(false);
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
      setConfirmedLabel(data.doctorReview?.confirmedLabel || data.predictedLabel || 'Glioma');
      if (data.doctorReview && data.reviewStatus !== 'PENDING_REVIEW') {
        setStatus(data.doctorReview.status);
        setAiAssessment(data.doctorReview.aiAssessment);
        setClinicalNote(data.doctorReview.clinicalNoteForPatient);
        setInternalNote(data.doctorReview.internalTechnicalNote || '');
        setShowInternalNote(Boolean(data.doctorReview.internalTechnicalNote));
        setRecommendedStep(data.doctorReview.recommendedNextStep);
      } else {
        setStatus(data.reviewStatus === 'NEEDS_MORE_INFO' ? 'NEEDS_MORE_INFO' : 'REVIEWED');
        setAiAssessment('PARTIAL_CONCORDANCE');
        setClinicalNote('');
        setInternalNote('');
        setShowInternalNote(false);
        setRecommendedStep(
          'Khám trực tiếp chuyên khoa Ngoại Thần kinh / Chẩn đoán hình ảnh kèm file DICOM gốc.',
        );
      }
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải chi tiết ca bệnh.');
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [id]);

  const handleSelectConfirmedLabel = (nextLabel: TumorLabel) => {
    setConfirmedLabel(nextLabel);
    if (!record) return;
    if (nextLabel !== record.predictedLabel && aiAssessment === 'CONCORDANT') {
      setAiAssessment('DISCORDANT');
    } else if (nextLabel === record.predictedLabel && aiAssessment === 'DISCORDANT') {
      setAiAssessment('CONCORDANT');
    }
  };

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
          confirmedLabel,
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
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-150 active:scale-98 group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:-translate-x-0.5 transition-all" />
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

        {/* Right: Structured Doctor Clinical Review Workstation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSaveReview}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden"
          >
            {/* Form Header + Edit/Preview Toggle */}
            <div className="px-5 py-4 bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      Phiếu Đánh Giá Lâm Sàng
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Kết luận chuyên môn độc lập của Bác sĩ
                    </p>
                  </div>
                </div>

                {/* Mode Switcher: Edit vs Patient Preview */}
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setFormMode('edit')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      formMode === 'edit'
                        ? 'bg-slate-900 text-white dark:bg-teal-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Soạn phiếu
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('preview')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                      formMode === 'preview'
                        ? 'bg-slate-900 text-white dark:bg-teal-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Xem trước</span>
                  </button>
                </div>
              </div>

              {/* Compact AI Reference Strip */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Gợi ý từ AI:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {record.predictedLabel}{' '}
                  <span className="font-mono text-teal-600 dark:text-teal-400">
                    ({formatPercent(record.confidenceScore)})
                  </span>
                </span>
              </div>
            </div>

            {formMode === 'preview' ? (
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Đây là giao diện chính xác mà bệnh nhân sẽ nhìn thấy sau khi bạn bấm lưu:
                </p>
                <ClinicalReviewReportCard
                  review={{
                    doctorName: user?.fullName || 'Bác sĩ chuyên khoa',
                    doctorSpecialty:
                      user?.specialty || 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
                    confirmedLabel,
                    aiAssessment,
                    clinicalNoteForPatient:
                      clinicalNote.trim() || '(Chưa nhập nhận xét chuyên môn)',
                    recommendedNextStep:
                      recommendedStep.trim() ||
                      'Khám chuyên khoa kèm dữ liệu DICOM gốc.',
                    updatedAt: new Date().toISOString(),
                  }}
                  aiPredictedLabel={record.predictedLabel}
                  reviewStatus={status}
                  isPreview
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormMode('edit')}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Quay lại chỉnh sửa
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Ký duyệt & Lưu</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Step 1: 1-Click Visual Tumor Label Selector */}
                <fieldset className="space-y-2.5">
                  <legend className="flex items-center justify-between w-full text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span>1. Xác nhận / Hiệu chỉnh Kết luận Hình ảnh</span>
                    {confirmedLabel !== record.predictedLabel && (
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        Đã hiệu chỉnh so với AI
                      </span>
                    )}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {CLINICAL_TUMOR_OPTIONS.map((opt) => {
                      const isSelected = confirmedLabel === opt.value;
                      const isAiSuggested = record.predictedLabel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectConfirmedLabel(opt.value)}
                          className={`text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer relative ${
                            isSelected
                              ? 'border-teal-600 dark:border-teal-400 bg-teal-50/70 dark:bg-teal-950/35 ring-1 ring-teal-500/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs sm:text-sm font-bold ${
                                isSelected
                                  ? 'text-teal-900 dark:text-teal-200'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {opt.value}
                            </span>
                            {isAiSuggested && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                AI gợi ý
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {opt.shortVi}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Step 2: 1-Click AI Concordance Verdict */}
                <fieldset className="space-y-2">
                  <legend className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    2. Đánh giá độ phù hợp của AI ({record.predictedLabel})
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {CLINICAL_AI_VERDICT_OPTIONS.map((opt) => {
                      const isSelected = aiAssessment === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAiAssessment(opt.value)}
                          className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? opt.activeClass
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {opt.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {AI_ASSESSMENT_VERDICT_META[aiAssessment].description}
                  </p>
                </fieldset>

                {/* Step 3: Patient-Facing Clinical Findings & Next Steps + Quick Macros */}
                <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="clinical-note-patient"
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>3. Nhận xét lâm sàng gửi Bệnh nhân</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {clinicalNote.length}/4000
                      </span>
                    </div>

                    {/* 1-Click Clinical Macros */}
                    <div className="flex flex-wrap gap-1.5">
                      {CLINICAL_NOTE_MACROS.map((macro) => (
                        <button
                          key={macro.title}
                          type="button"
                          onClick={() => setClinicalNote(macro.text)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-teal-500/50 hover:text-teal-700 dark:hover:text-teal-300 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          + {macro.title}
                        </button>
                      ))}
                    </div>

                    <textarea
                      id="clinical-note-patient"
                      rows={4}
                      maxLength={4000}
                      value={clinicalNote}
                      onChange={(e) => setClinicalNote(e.target.value)}
                      placeholder="Chọn mẫu câu nhanh phía trên hoặc nhập mô tả hình ảnh và nhận định chuyên môn dành cho người bệnh..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                    />
                  </div>

                  {/* Recommended Next Step + Quick Chips */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="recommended-step"
                      className="block text-xs font-bold text-slate-900 dark:text-slate-100"
                    >
                      Khuyến nghị bước tiếp theo
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {RECOMMENDED_STEP_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRecommendedStep(chip)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-teal-500/50 hover:text-teal-700 dark:hover:text-teal-300 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer text-left"
                        >
                          + {chip.split('(')[0].trim().slice(0, 34)}
                          {chip.length > 34 ? '…' : ''}
                        </button>
                      ))}
                    </div>
                    <input
                      id="recommended-step"
                      type="text"
                      value={recommendedStep}
                      maxLength={1000}
                      onChange={(e) => setRecommendedStep(e.target.value)}
                      placeholder="Ví dụ: Khám trực tiếp chuyên khoa Ngoại Thần kinh kèm file DICOM gốc..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Step 4: 1-Click Case Status Segmented Control */}
                <fieldset className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <legend className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    4. Trạng thái xử lý ca bệnh
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {CLINICAL_STATUS_OPTIONS.map((opt) => {
                      const isSelected = status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`px-2 py-2 rounded-xl border text-[11px] sm:text-xs font-semibold text-center transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? opt.activeClass
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {opt.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Separate Collapsible Internal Technical Note (Hidden from Patient) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowInternalNote((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ghi chú kỹ thuật nội bộ</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        (Ẩn với Bệnh nhân)
                      </span>
                    </span>
                    {showInternalNote ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {showInternalNote && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                      <textarea
                        id="internal-tech-note"
                        rows={2}
                        maxLength={4000}
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        placeholder="Ghi chú riêng cho Bác sĩ & nhóm phát triển AI về chất lượng ảnh, nhiễu viền hoặc domain shift..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                    </div>
                  )}
                </div>

                {/* Primary Save Action */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Ký duyệt & Lưu Nhận xét Chuyên môn</span>
                </button>
              </div>
            )}
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

            const confirmed = rev.confirmedLabel || c.predictedLabel;
            const isOverridden = Boolean(rev.confirmedLabel) && rev.confirmedLabel !== c.predictedLabel;

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card"
              >
                <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {c.sessionCode}
                    </span>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      AI: <strong className="text-slate-800 dark:text-slate-200">{c.predictedLabel}</strong>
                    </span>
                    <span className="text-xs text-slate-400">→</span>
                    <span
                      className={`text-xs font-bold ${
                        isOverridden
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-teal-700 dark:text-teal-300'
                      }`}
                    >
                      Bác sĩ: {confirmed}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${verdictMeta.badgeClass}`}
                    >
                      {verdictMeta.label}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="pl-3.5 border-l-2 border-teal-500/60 dark:border-teal-400/50">
                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                      {rev.clinicalNoteForPatient}
                    </p>
                  </div>

                  {rev.recommendedNextStep && (
                    <div className="text-xs text-teal-800 dark:text-teal-300 bg-teal-50/60 dark:bg-teal-950/25 border border-teal-200/70 dark:border-teal-800/50 px-3 py-2 rounded-xl">
                      <strong>Khuyến nghị:</strong> {rev.recommendedNextStep}
                    </div>
                  )}

                  {rev.internalTechnicalNote && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>
                        <strong>Ghi chú nội bộ:</strong> {rev.internalTechnicalNote}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <span>Cập nhật lúc: {formatDateTimeVN(rev.updatedAt)}</span>
                    <Link
                      to={`/doctor/cases/${c.id}`}
                      className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Mở phiếu & chỉnh sửa →
                    </Link>
                  </div>
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
