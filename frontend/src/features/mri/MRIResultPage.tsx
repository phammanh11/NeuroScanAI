import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ScanLine,
  MessageSquareHeart,
  History,
  Download,
  Stethoscope,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { MRIViewer } from '@/components/medical/MRIViewer';
import { PredictionCard } from '@/components/medical/PredictionCard';
import { ProbabilityChart } from '@/components/charts/ProbabilityChart';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import {
  AI_ASSESSMENT_VERDICT_META,
  DOCTOR_REVIEW_STATUS_META,
  PERMANENT_MEDICAL_DISCLAIMER,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatBytes, formatDateTimeVN, formatPercent } from '@/utils/formatters';
import type { MRIAnalysisRecord } from '@/types/domain';

export const MRIResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [record, setRecord] = useState<MRIAnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Doctor review request modal/form state
  const [shareConsent, setShareConsent] = useState(false);
  const [symptomNoteInput, setSymptomNoteInput] = useState('');
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const loadRequestRef = useRef(0);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    setShareConsent(false);
    setSymptomNoteInput('');
    try {
      const data = await neuroscanAdapter.getAnalysisById(id);
      if (requestId !== loadRequestRef.current) return;
      setRecord(data);
      setSymptomNoteInput(data.patientSymptomNote || '');
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tải chi tiết phiên phân tích MRI.',
      );
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadDetail]);

  const handleRequestDoctorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!shareConsent) {
      showToast({
        variant: 'warning',
        title: 'Chưa xác nhận đồng ý chia sẻ dữ liệu',
        description: 'Vui lòng tích chọn đồng ý chia sẻ phiên phân tích với Bác sĩ.',
      });
      return;
    }
    setIsSubmittingShare(true);
    try {
      const updated = await neuroscanAdapter.requestDoctorReview({
        analysisId: record.id,
        consentToShareWithDoctor: shareConsent,
        patientSymptomNote:
          symptomNoteInput.trim() ||
          'Người dùng gửi yêu cầu bác sĩ xem xét kết quả phân loại tham khảo.',
      });
      setRecord(updated);
      showToast({
        variant: 'success',
        title: 'Đã gửi yêu cầu Bác sĩ xem xét',
        description:
          'Bạn có thể chuyển sang vai trò DOCTOR trên thanh Header để trực tiếp xử lý ca này.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không thể gửi yêu cầu xem xét',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmittingShare(false);
    }
  };

  const handleDownloadDemoReport = () => {
    if (!record) return;
    const labelMeta = TUMOR_LABEL_METADATA[record.predictedLabel];
    const reportContent = [
      '====================================================================',
      'BÁO CÁO MINH HỌA — KHÔNG CÓ GIÁ TRỊ CHẨN ĐOÁN Y KHOA',
      'NEUROSCAN AI (CHẾ ĐỘ DEMO HỌC THUẬT)',
      '====================================================================',
      `Mã phiên phân tích : ${record.sessionCode}`,
      `Thời gian tạo      : ${formatDateTimeVN(record.createdAt)}`,
      `Tên file xuất       : ${
        user?.preferences.anonymizeExports === false
          ? record.originalFileName || record.sanitizedFileName
          : record.sanitizedFileName
      }`,
      `Chế độ mô hình     : ${record.modelMetadata.modelVersion}`,
      '--------------------------------------------------------------------',
      '1. KẾT QUẢ PHÂN LOẠI THAM KHẢO TỪ AI (4 LỚP):',
      `   - Nhãn dự đoán cao nhất : ${record.predictedLabel} (${labelMeta.vietnameseTitle})`,
      `   - Confidence Score      : ${formatPercent(record.confidenceScore)} (Lưu ý: KHÔNG phải xác suất chẩn đoán đúng)`,
      record.probabilities
        ? `   - Phân bố Softmax 4 lớp : Glioma=${formatPercent(record.probabilities.Glioma)}, Meningioma=${formatPercent(record.probabilities.Meningioma)}, Pituitary=${formatPercent(record.probabilities.Pituitary)}, No Tumor=${formatPercent(record.probabilities['No Tumor'])}`
        : '   - Phân bố Softmax 4 lớp : Chưa cung cấp',
      '--------------------------------------------------------------------',
      '2. NHẬN XÉT CHUYÊN MÔN CỦA BÁC SĨ (ĐỘC LẬP VỚI AI):',
      record.doctorReview
        ? [
            `   - Bác sĩ phụ trách      : ${record.doctorReview.doctorName}`,
            `   - Trạng thái ca         : ${DOCTOR_REVIEW_STATUS_META[record.reviewStatus].label}`,
            `   - Đánh giá kết quả AI   : ${AI_ASSESSMENT_VERDICT_META[record.doctorReview.aiAssessment].label}`,
            `   - Nhận xét chuyên môn   : ${record.doctorReview.clinicalNoteForPatient}`,
            `   - Khuyến nghị tiếp theo : ${record.doctorReview.recommendedNextStep}`,
          ].join('\n')
        : `   - Trạng thái: ${DOCTOR_REVIEW_STATUS_META[record.reviewStatus].label}`,
      '--------------------------------------------------------------------',
      '3. KHUYẾN CÁO AN TOÀN Y TẾ BẮT BUỘC:',
      `   ${PERMANENT_MEDICAL_DISCLAIMER}`,
      '====================================================================',
    ].join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Minh_Hoa_${record.sessionCode}_KHONG_CO_GIA_TRI_CHAN_DOAN.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast({
      variant: 'info',
      title: 'Đã tải xuống Báo cáo Minh họa',
      description: 'Báo cáo đã gắn nhãn rõ: "Báo cáo minh họa — không có giá trị chẩn đoán".',
    });
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Đang tải kết quả phiên phân tích MRI..."
        description="Đang chuẩn bị trình xem ảnh y tế và biểu đồ phân bố xác suất 4 lớp."
      />
    );
  }

  if (errorMsg || !record) {
    return (
      <ErrorState
        message={errorMsg || 'Không tìm thấy dữ liệu phiên phân tích.'}
        onRetry={loadDetail}
      />
    );
  }

  const reviewStatusMeta = DOCTOR_REVIEW_STATUS_META[record.reviewStatus];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText={`Phiên phân tích ${record.sessionCode} • Kết quả minh họa`}
        title={`Kết quả phân tích MRI tham khảo: ${record.sessionCode}`}
        description="Giao diện hỗ trợ đọc ảnh MRI, biểu đồ phân bố xác suất 4 lớp và kết nối nhận xét chuyên môn từ Bác sĩ."
        actions={
          <>
            <Link
              to="/mri-analysis"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Phân tích ảnh mới</span>
            </Link>
            <Link
              to={`/ai-assistant?analysisId=${record.id}&prompt=${encodeURIComponent(
                `Hãy giải thích ý nghĩa nhãn ${record.predictedLabel} trong kết quả tham khảo`,
              )}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            >
              <MessageSquareHeart className="w-4 h-4" />
              <span>Hỏi chatbot về nhãn {record.predictedLabel}</span>
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <History className="w-4 h-4" />
              <span>Xem lịch sử</span>
            </Link>
            <button
              type="button"
              onClick={handleDownloadDemoReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 text-white"
            >
              <Download className="w-4 h-4" />
              <span>Tải báo cáo minh họa</span>
            </button>
          </>
        }
      />

      {/* Doctor Upload Indicator Banner */}
      {record.uploadedByRole === 'DOCTOR' && (
        <div className="rounded-2xl border-2 border-purple-500/35 bg-purple-50/70 dark:bg-purple-950/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-purple-950 dark:text-purple-200">
                Ca phân tích do Bác sĩ {record.uploadedDoctorName || 'chuyên khoa'} tải lên qua Computer Vision Lab
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">
                Hình ảnh lát cắt và kết quả xử lý thị giác máy tính đã được đồng bộ trực tiếp vào hồ sơ theo dõi sức khỏe của bạn.
              </p>
            </div>
          </div>
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/40">
            Hồ sơ Bác sĩ quản lý
          </span>
        </div>
      )}

      {/* Session Metadata Summary Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-soft grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block">Mã phiên</span>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
            {record.sessionCode}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Thời gian phân tích</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
            {formatDateTimeVN(record.createdAt)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Tên file đã ẩn danh</span>
          <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate block">
            {record.sanitizedFileName}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Định dạng & Dung lượng</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
            {record.fileFormat} • {formatBytes(record.fileSizeBytes)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Trạng thái mô hình</span>
          <span className="font-semibold text-amber-700 dark:text-amber-300 mt-0.5 block">
            {record.modelMetadata.pipelineMode === 'MOCK_FIXTURE'
              ? 'Fixture Minh họa Cố định'
              : 'PyTorch Backend'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Trạng thái Bác sĩ xem xét</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border mt-0.5 ${reviewStatusMeta.badgeClass}`}
          >
            {reviewStatusMeta.label}
          </span>
        </div>
      </div>

      {/* Main Two-Column Medical Workstation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: MRI Image Viewer (7 cols) */}
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

          {/* Doctor Review Workflow Section (Separating Clinical Review from AI Output) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nhận xét chuyên môn của Bác sĩ (Tách biệt với kết quả AI)
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${reviewStatusMeta.badgeClass}`}
              >
                {reviewStatusMeta.label}
              </span>
            </div>

            {record.doctorReview && record.reviewStatus !== 'PENDING_REVIEW' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-sky-950 dark:text-sky-200">
                      Bác sĩ phản hồi: {record.doctorReview.doctorName} (
                      {record.doctorReview.doctorSpecialty})
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Cập nhật: {formatDateTimeVN(record.doctorReview.updatedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Đánh giá của Bác sĩ đối với nhãn AI:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                        AI_ASSESSMENT_VERDICT_META[record.doctorReview.aiAssessment].badgeClass
                      }`}
                    >
                      {AI_ASSESSMENT_VERDICT_META[record.doctorReview.aiAssessment].label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Ghi chú lâm sàng gửi người sử dụng:
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      {record.doctorReview.clinicalNoteForPatient}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-sky-900 dark:text-sky-200 pt-1">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Khuyến nghị bước tiếp theo:</strong>{' '}
                      {record.doctorReview.recommendedNextStep}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {record.reviewStatus === 'PENDING_REVIEW' ? (
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/30 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                  <span>Đã gửi yêu cầu xem xét tới {record.assignedDoctorName}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ghi chú triệu chứng đã gửi: <em>“{record.patientSymptomNote}”</em>. Bạn có thể
                  nhấn nút <strong>“Đổi vai trò Demo: Sang Bác sĩ”</strong> trên thanh Header để
                  đóng vai Bác sĩ tiếp nhận và phản hồi ca này ngay lập tức.
                </p>
              </div>
            ) : !record.doctorReview || record.reviewStatus === 'NEEDS_MORE_INFO' ? (
              <form onSubmit={handleRequestDoctorReview} className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {record.reviewStatus === 'NEEDS_MORE_INFO'
                    ? 'Bác sĩ cần thêm thông tin. Hãy cập nhật mô tả triệu chứng hoặc thông tin bổ sung rồi xác nhận gửi lại ca để tiếp tục xem xét.'
                    : 'Bạn muốn gửi lát cắt MRI này cùng kết quả tham khảo của AI để Bác sĩ chuyên khoa xem xét? Vui lòng cung cấp thêm mô tả triệu chứng và xác nhận đồng ý chia sẻ dữ liệu phiên phân tích.'}
                </p>

                <div className="space-y-1.5">
                  <label
                    htmlFor="share-symptom-note"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Mô tả triệu chứng / Lý do gửi Bác sĩ xem xét (Giả lập)
                  </label>
                  <textarea
                    id="share-symptom-note"
                    rows={2}
                    maxLength={1000}
                    value={symptomNoteInput}
                    onChange={(e) => setSymptomNoteInput(e.target.value)}
                    placeholder="Ví dụ: Em muốn nhờ Bác sĩ xem giúp lát cắt này và tư vấn cần chụp thêm chuỗi xung nào..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareConsent}
                    onChange={(e) => setShareConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    <ShieldCheck className="w-3.5 h-3.5 inline text-teal-600 mr-1" />
                    Tôi đồng ý chia sẻ ảnh MRI đã ẩn danh và thông tin phiên phân tích{' '}
                    <strong>{record.sessionCode}</strong> cho Bác sĩ được phân công trên hệ thống.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingShare}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmittingShare
                      ? 'Đang gửi yêu cầu...'
                      : record.reviewStatus === 'NEEDS_MORE_INFO'
                        ? 'Bổ sung thông tin và gửi lại Bác sĩ'
                        : 'Gửi yêu cầu Bác sĩ xem xét kết quả này'}
                  </span>
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {/* Right: Prediction Card & 4-Class Probability Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <PredictionCard
            predictedLabel={record.predictedLabel}
            confidenceScore={record.confidenceScore}
            isDemoFixture={record.isDemoFixture}
          />

          <ProbabilityChart
            probabilities={record.probabilities}
            isDemoFixture={record.isDemoFixture}
          />

          {/* Technical Pipeline Metadata Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Thông tin Pipeline & Báo cáo Minh họa</span>
            </div>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div>
                <strong>Phiên bản mô hình:</strong> {record.modelMetadata.modelVersion}
              </div>
              <div>
                <strong>Tiền xử lý ghi nhận:</strong>{' '}
                {record.modelMetadata.preprocessingApplied.join(', ')}
              </div>
              <div>
                <strong>Lưu ý xuất file báo cáo:</strong> Khi tải báo cáo minh họa, văn bản luôn đóng
                dấu rõ <em>“Báo cáo minh họa — không có giá trị chẩn đoán”</em>.
              </div>
            </div>
          </div>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};
