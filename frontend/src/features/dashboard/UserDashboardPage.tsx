import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  MessageSquareHeart,
  BookOpen,
  History,
  Activity,
  Clock,
  ArrowRight,
  Stethoscope,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/app/providers/AuthProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import {
  DOCTOR_REVIEW_STATUS_META,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatDateTimeVN, formatPercent } from '@/utils/formatters';
import type { ChatSessionRecord, MRIAnalysisRecord, TumorLabel } from '@/types/domain';

function buildUsageHistorySeries(
  analyses: MRIAnalysisRecord[],
  chatSessions: ChatSessionRecord[],
) {
  const now = new Date();
  const endOfCurrentWeek = new Date(now);
  endOfCurrentWeek.setHours(23, 59, 59, 999);
  const dayFromMonday = (endOfCurrentWeek.getDay() + 6) % 7;
  endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + (6 - dayFromMonday));
  const dateLabel = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });
  const userMessages = chatSessions.flatMap((session) =>
    session.messages.filter((message) => message.sender === 'user'),
  );

  return Array.from({ length: 4 }, (_, index) => {
    const weeksAgo = 3 - index;
    const end = new Date(endOfCurrentWeek);
    end.setDate(end.getDate() - weeksAgo * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const isInRange = (isoDate: string) => {
      const value = new Date(isoDate).getTime();
      return value >= startMs && value <= endMs;
    };

    return {
      period: `${dateLabel.format(start)}–${dateLabel.format(end)}`,
      analysesCount: analyses.filter((record) => isInRange(record.createdAt)).length,
      chatQueries: userMessages.filter((message) => isInRange(message.createdAt)).length,
    };
  });
}

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<MRIAnalysisRecord[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [anaList, chatList] = await Promise.all([
        neuroscanAdapter.getUserAnalyses(user.id),
        neuroscanAdapter.getChatSessions(user.id),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setAnalyses(anaList);
      setChatSessions(chatList);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tải dữ liệu bảng điều khiển.',
      );
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboardData();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <LoadingState
        title="Đang tải Bảng điều khiển cá nhân..."
        description="Đang đồng bộ danh sách phiên phân tích MRI và hội thoại Demo."
      />
    );
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} onRetry={loadDashboardData} />;
  }

  const latestAnalysis = analyses[0] ?? null;
  const reviewedByDoctorCount = analyses.filter((a) => a.reviewStatus === 'REVIEWED').length;
  const usageHistorySeries = buildUsageHistorySeries(analyses, chatSessions);

  const labelDistributionData = (
    ['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'] as TumorLabel[]
  ).map((label) => ({
    label,
    count: analyses.filter((a) => a.predictedLabel === label).length,
    color: TUMOR_LABEL_METADATA[label].chartColor,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Không gian Người sử dụng (USER) • Dữ liệu DEMO"
        title={`Xin chào, ${user?.fullName || 'Người dùng Demo'}`}
        description="Theo dõi các phiên phân tích ảnh MRI minh họa, xem phản hồi chuyên môn từ Bác sĩ được chia sẻ và tra cứu Trợ lý AI Y tế."
        actions={
          <>
            <Link
              to="/mri-analysis"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-xs transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span>Phân tích ảnh MRI mới</span>
            </Link>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
            >
              <MessageSquareHeart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Hỏi Trợ lý AI</span>
            </Link>
          </>
        }
      />

      {/* Welcome & Demo Notice Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 text-white p-6 shadow-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
            CHẾ ĐỘ DEMO MINH HỌA (VITE_MOCK_MODE=true)
          </div>
          <h2 className="text-lg sm:text-xl font-bold">
            Hỗ trợ đọc hiểu kết quả phân loại MRI & Kết nối Bác sĩ xem xét
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Mọi chỉ số trên bảng điều khiển này đều là <strong>dữ liệu DEMO giả lập</strong> phục
            vụ trình bày giao diện và kiểm thử luồng RBAC (Người dùng tải MRI → Nhận nhãn tham khảo
            → Đồng ý chia sẻ cho Bác sĩ → Xem nhận xét chuyên môn).
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            to="/knowledge"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-teal-300" />
            <span>Thư viện 7 nhóm kiến thức</span>
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors"
          >
            <History className="w-4 h-4" />
            <span>Xem lịch sử phiên</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng lượt phân tích (DEMO)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              DEMO
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analyses.length} phiên
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bao gồm {reviewedByDoctorCount} phiên đã có nhận xét của Bác sĩ Demo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Lần phân tích gần nhất (DEMO)
            </span>
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {latestAnalysis
              ? `${latestAnalysis.sessionCode} (${latestAnalysis.predictedLabel})`
              : 'Chưa có phiên'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {latestAnalysis
              ? formatDateTimeVN(latestAnalysis.createdAt)
              : 'Hãy tải ảnh MRI mẫu để bắt đầu'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Phiên hội thoại AI (DEMO)
            </span>
            <MessageSquareHeart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {chatSessions.length} cuộc trò chuyện
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tra cứu từ bộ câu hỏi FAQ đã xác minh nguồn
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Trạng thái Hệ thống
            </span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Mock Adapter Sẵn sàng</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sẵn sàng chuyển sang FastAPI qua biến môi trường
          </p>
        </div>
      </div>

      {/* Doctor Evaluations & Doctor Uploaded MRI Slices Section */}
      {(() => {
        const doctorCases = analyses.filter(
          (a) => a.doctorReview || a.uploadedByRole === 'DOCTOR'
        );
        if (doctorCases.length === 0) return null;

        return (
          <div className="rounded-2xl border-2 border-sky-500/35 bg-gradient-to-br from-sky-50/50 via-white to-slate-50 dark:from-sky-950/20 dark:via-slate-900 dark:to-slate-900/90 p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Đánh giá & Ảnh bệnh từ Bác sĩ điều trị</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-800 dark:text-sky-300">
                      {doctorCases.length} ca có phản hồi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bao gồm các ca do Bác sĩ tải lên bằng Computer Vision Lab và các ca đã hoàn tất nhận xét lâm sàng.
                  </p>
                </div>
              </div>

              <Link
                to="/history"
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Xem toàn bộ lịch sử</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorCases.slice(0, 4).map((item) => {
                const labelMeta = TUMOR_LABEL_METADATA[item.predictedLabel];
                const rev = item.doctorReview;
                const isUploadedByDoctor = item.uploadedByRole === 'DOCTOR';

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-sky-500/25 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 hover:border-sky-500/45 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.sessionCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isUploadedByDoctor
                              ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30'
                              : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isUploadedByDoctor
                            ? 'Bác sĩ tải lên (CV Lab)'
                            : 'Đã có nhận xét Bác sĩ'}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.sessionCode}
                          className="w-20 h-20 rounded-xl object-cover bg-black border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0 space-y-1 text-xs">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Bác sĩ phụ trách:{' '}
                            <span className="text-sky-600 dark:text-sky-400">
                              {rev?.doctorName || item.uploadedDoctorName || 'BS.CKII Trần Quốc Bảo'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${labelMeta.badgeColorClass}`}
                            >
                              Gợi ý AI: {item.predictedLabel} ({formatPercent(item.confidenceScore)})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Cập nhật: {formatDateTimeVN(rev?.updatedAt || item.createdAt)}
                          </div>
                        </div>
                      </div>

                      {rev?.clinicalNoteForPatient ? (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
                          <strong className="text-slate-800 dark:text-slate-200 block">
                            Lời dặn của Bác sĩ:
                          </strong>
                          <p className="text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                            {rev.clinicalNoteForPatient}
                          </p>
                          {rev.recommendedNextStep && (
                            <div className="text-[11px] text-sky-700 dark:text-sky-300 pt-1 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Khuyến nghị: {rev.recommendedNextStep}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                          Ảnh được Bác sĩ tải lên và đối chiếu qua quy trình Computer Vision. Bác sĩ đang cập nhật phác đồ chi tiết.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {item.preprocessedImageUrl ? 'Có ảnh tiền xử lý CLAHE' : 'Ảnh lát cắt chuẩn'}
                      </span>
                      <Link
                        to={`/mri-results/${item.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết & Đánh giá</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4-Class Distribution Chart */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Phân bố 4 nhãn MRI trong phiên của bạn (DEMO)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thống kê số lượng phiên minh họa theo nhãn dự đoán của mô hình
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-800 dark:text-amber-300">
              DỮ LIỆU DEMO
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={labelDistributionData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  formatter={(val: number) => [`${val} phiên (Demo)`, 'Số lượng']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 700, marginBottom: '4px' }}
                  itemStyle={{ color: '#5eead4', fontWeight: 600 }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={38}>
                  {labelDistributionData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Usage History Chart */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Tần suất sử dụng của tài khoản trong 4 tuần gần nhất
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tính trực tiếp từ các phiên MRI và câu hỏi hiện có trong bộ nhớ Demo
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-800 dark:text-amber-300">
              DỮ LIỆU DEMO
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageHistorySeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 700, marginBottom: '4px' }}
                  itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="analysesCount"
                  name="Phân tích MRI (Demo)"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="chatQueries"
                  name="Câu hỏi Trợ lý AI (Demo)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Analyses Table + Quick Chatbot Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Các phiên phân tích MRI gần đây (DEMO)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhấn vào từng phiên để xem trình đọc ảnh MRI, xác suất 4 lớp và phản hồi của Bác sĩ
              </p>
            </div>
            <Link
              to="/history"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {analyses.length === 0 ? (
            <EmptyState
              title="Chưa có phiên phân tích MRI nào"
              description="Bạn có thể tải ảnh MRI mẫu ở trang Phân tích MRI để kiểm thử luồng hoạt động."
              action={
                <Link
                  to="/mri-analysis"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
                >
                  Tải ảnh MRI ngay
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-3 font-semibold">Mã phiên</th>
                    <th className="py-3 px-3 font-semibold">Nhãn dự đoán (AI)</th>
                    <th className="py-3 px-3 font-semibold">Confidence</th>
                    <th className="py-3 px-3 font-semibold">Trạng thái Bác sĩ</th>
                    <th className="py-3 pl-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {analyses.slice(0, 4).map((item) => {
                    const labelMeta = TUMOR_LABEL_METADATA[item.predictedLabel];
                    const reviewMeta = DOCTOR_REVIEW_STATUS_META[item.reviewStatus];
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 pr-3">
                          <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {item.sessionCode}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatDateTimeVN(item.createdAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${labelMeta.badgeColorClass}`}
                          >
                            {item.predictedLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-semibold">
                          {formatPercent(item.confidenceScore)}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${reviewMeta.badgeClass}`}
                          >
                            {reviewMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <Link
                            to={`/mri-results/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-teal-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-600 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
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

        {/* Quick Access Card to Chatbot & Doctor Review Workflow */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Trợ lý AI Y tế (FAQ & Nguồn kiểm duyệt)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Đặt câu hỏi nhanh về ý nghĩa các nhãn Glioma, Meningioma, Pituitary, cách đọc kết quả
              MRI hoặc chuẩn bị hồ sơ trước khi khám chuyên khoa.
            </p>
            <div className="space-y-1.5 pt-1">
              {[
                'U não Glioma là gì?',
                'Meningioma khác gì Glioma?',
                'Cần chuẩn bị gì trước khi khám chuyên khoa?',
              ].map((q) => (
                <Link
                  key={q}
                  to={`/ai-assistant?prompt=${encodeURIComponent(q)}`}
                  className="block px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 hover:bg-teal-500/10 dark:bg-slate-800/70 dark:hover:bg-teal-500/20 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 transition-colors"
                >
                  “{q}”
                </Link>
              ))}
            </div>
            <Link
              to="/ai-assistant"
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
            >
              <span>Mở Trợ lý AI Y tế</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-sky-500/25 bg-sky-50/60 dark:bg-sky-950/20 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              <Stethoscope className="w-4 h-4" />
              <span>Quy trình Bác sĩ xem xét (Doctor Review)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tại trang chi tiết kết quả MRI, bạn có thể nhấn{' '}
              <strong>“Gửi yêu cầu Bác sĩ xem xét”</strong>. Sau đó chuyển sang vai trò{' '}
              <strong>DOCTOR</strong> ở thanh trên cùng để trực tiếp xử lý ca và viết nhận xét
              chuyên môn.
            </p>
          </div>
        </div>
      </div>

      <MedicalDisclaimer compact />
    </div>
  );
};
