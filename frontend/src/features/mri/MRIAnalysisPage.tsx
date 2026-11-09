import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ArrowRight,
  Info,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import {
  MRIUploader,
  getImageDimensions,
} from '@/components/medical/MRIUploader';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatBytes, formatPercent, sanitizeMedicalFileName } from '@/utils/formatters';

const PIPELINE_STEPS = [
  {
    id: 1,
    title: 'Kiểm tra ảnh',
    desc: 'Xác thực định dạng PNG/JPG/JPEG, kích thước và ẩn danh tên file.',
  },
  {
    id: 2,
    title: 'Tiền xử lý ảnh',
    desc: 'Chuẩn hóa ma trận điểm ảnh [1, 3, 256, 256] và ImageNet mean/std.',
  },
  {
    id: 3,
    title: 'Suy luận ONNX',
    desc: 'Chạy mô hình học sâu brain_mri_student.onnx phân loại 4 lớp.',
  },
  {
    id: 4,
    title: 'Hoàn thành & Lưu trữ',
    desc: 'Lưu ảnh vào Cloudflare R2 và ghi kết quả vào D1 predictions.',
  },
];

export const MRIAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [symptomNote, setSymptomNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const analysisRunRef = useRef(0);
  const analysisAbortRef = useRef<AbortController | null>(null);

  // Cleanup blob preview URL to prevent memory leaks
  useEffect(() => {
    return () => {
      analysisRunRef.current += 1;
      analysisAbortRef.current?.abort();
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSelectFile = (file: File, url: string) => {
    analysisRunRef.current += 1;
    analysisAbortRef.current?.abort();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(url);
    setPreviewLoadError(false);
    setValidationError(null);
    setApiError(null);
    setCurrentStep(0);
  };

  const handleClearFile = () => {
    analysisRunRef.current += 1;
    analysisAbortRef.current?.abort();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    setPreviewLoadError(false);
    setIsValidatingFile(false);
    setConsentChecked(false);
    setSymptomNote('');
    setApiError(null);
    setCurrentStep(0);
  };

  const runAnalysis = async () => {
    if (!selectedFile || !previewUrl) {
      setValidationError('Vui lòng chọn hoặc nạp một file ảnh MRI hợp lệ trước khi phân tích.');
      return;
    }
    if (isValidatingFile) {
      setValidationError('Vui lòng chờ quá trình kiểm tra ảnh hoàn tất trước khi phân tích.');
      return;
    }
    if (previewLoadError) {
      setValidationError('Ảnh xem trước không thể hiển thị. Vui lòng chọn lại file ảnh hợp lệ.');
      return;
    }
    if (validationError) {
      return;
    }
    if (!consentChecked) {
      setValidationError(
        'Vui lòng tích vào ô xác nhận đồng ý xử lý dữ liệu và hiểu rõ giới hạn tham khảo của AI.',
      );
      return;
    }
    if (!user) return;

    setValidationError(null);
    setApiError(null);
    setIsAnalyzing(true);
    const runId = ++analysisRunRef.current;
    const abortController = new AbortController();
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = abortController;
    let ownedRecordUrl: string | null = null;
    let recordCreated = false;

    try {
      setCurrentStep(1);
      await new Promise((r) => setTimeout(r, 450));
      if (runId !== analysisRunRef.current) return;
      setCurrentStep(2);
      await new Promise((r) => setTimeout(r, 550));
      if (runId !== analysisRunRef.current) return;
      setCurrentStep(3);

      const imageDimensions = await getImageDimensions(previewUrl);
      if (runId !== analysisRunRef.current || abortController.signal.aborted) return;

      const durablePreviewUrl =
        neuroscanAdapter.isMockMode() && previewUrl.startsWith('blob:')
          ? (ownedRecordUrl = URL.createObjectURL(selectedFile))
          : previewUrl;

      const createdRecord = await neuroscanAdapter.createAnalysis(
        {
          file: selectedFile,
          consentAccepted: consentChecked,
          symptomNote,
          imageDimensions,
        },
        user,
        durablePreviewUrl,
        abortController.signal,
      );
      recordCreated = true;

      if (runId !== analysisRunRef.current) return;
      setCurrentStep(4);
      await new Promise((r) => setTimeout(r, 450));
      if (runId !== analysisRunRef.current) return;

      showToast({
        variant: 'success',
        title: `Phân tích AI hoàn tất: ${createdRecord.predictedLabel}`,
        description: `Độ tin cậy: ${formatPercent(createdRecord.confidenceScore)} • Suy luận ONNX: ${createdRecord.modelMetadata.inferenceTimeMs}ms • Lưu trữ Cloudflare R2 & D1.`,
      });
      navigate(`/mri-results/${createdRecord.id}`);
    } catch (err) {
      if (abortController.signal.aborted) return;
      setApiError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải ảnh MRI lên máy chủ.',
      );
    } finally {
      if (runId === analysisRunRef.current) {
        setIsAnalyzing(false);
      }
      if (!recordCreated && ownedRecordUrl) {
        URL.revokeObjectURL(ownedRecordUrl);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Tính năng Trọng tâm • Tải lên & Phân tích MRI"
        title="Phân tích ảnh MRI sọ não (Hỗ trợ 4 lớp WHO CNS5)"
        description="Tải lên ảnh lát cắt MRI (PNG, JPG, JPEG) từ thiết bị để thực hiện kiểm tra ma trận điểm ảnh, suy luận mô hình AI và lưu trữ an toàn trên Cloudflare R2 & D1."
      />

      {/* 3-Area Desktop Layout: Left (Upload + Settings) & Right (MRI Preview + Pipeline Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Upload Zone & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Khu vực tải ảnh MRI (Upload Zone)
              </h2>
              <span className="text-xs font-mono text-slate-500">PNG • JPG • JPEG (≤ 15MB)</span>
            </div>

            <MRIUploader
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              validationError={validationError}
              disabled={isAnalyzing}
              anonymizationScope={user?.id ?? 'anonymous'}
              onSelectFile={handleSelectFile}
              onValidationError={setValidationError}
              onClearFile={handleClearFile}
              onValidationStateChange={setIsValidatingFile}
            />

            {/* Optional Symptom / Context Note */}
            <div className="space-y-1.5">
              <label
                htmlFor="symptom-note-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Ghi chú triệu chứng hoặc câu hỏi kèm theo (Tùy chọn — Dùng khi chia sẻ với Bác sĩ)
              </label>
              <textarea
                id="symptom-note-input"
                rows={2}
                maxLength={1000}
                disabled={isAnalyzing}
                value={symptomNote}
                onChange={(e) => setSymptomNote(e.target.value)}
                placeholder="Ví dụ: Đau đầu vùng thái dương 2 tuần nay, muốn tìm hiểu ý nghĩa nhãn dự đoán (Không nhập thông tin định danh nhạy cảm)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  disabled={isAnalyzing}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    if (e.target.checked) setValidationError(null);
                  }}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="leading-relaxed">
                  <strong>Đồng ý xử lý dữ liệu & Hiểu rõ giới hạn y tế:</strong> Tôi xác nhận ảnh tải
                  lên không chứa thông tin định danh cá nhân chưa được bảo vệ, và hiểu rằng kết quả
                  phân loại của hệ thống chỉ mang tính chất <strong>tham khảo / minh họa</strong>,
                  không thay thế chẩn đoán lâm sàng của bác sĩ.
                </span>
              </label>
            </div>

            {/* Error state with Retry & Reset */}
            {apiError && (
              <div className="space-y-3">
                <ErrorState
                  title="Quá trình phân tích bị gián đoạn"
                  message={apiError}
                  onRetry={runAnalysis}
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleClearFile}
                    disabled={isValidatingFile}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại toàn bộ (Reset)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={!selectedFile || isAnalyzing || isValidatingFile}
                onClick={handleClearFile}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Đặt lại (Reset)
              </button>

              <button
                type="button"
                disabled={isAnalyzing || isValidatingFile || previewLoadError}
                onClick={runAnalysis}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-soft disabled:opacity-60 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang chạy suy luận AI ONNX Runtime...</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    <span>Phân tích ảnh MRI</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: MRI Preview & Analysis Pipeline Stepper (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preview Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                2. Xem trước ảnh MRI (Aspect Ratio Chuẩn)
              </h2>
              {selectedFile && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-teal-500/20 text-teal-300">
                  {formatBytes(selectedFile.size)}
                </span>
              )}
            </div>

            <div className="min-h-[260px] rounded-2xl bg-[#060911] border border-slate-800 flex items-center justify-center p-4 overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Xem trước ảnh MRI tải lên"
                  onLoad={() => setPreviewLoadError(false)}
                  onError={() => {
                    setPreviewLoadError(true);
                    setValidationError(
                      'Không thể hiển thị ảnh xem trước. Vui lòng chọn lại file ảnh.',
                    );
                  }}
                  className="max-h-[260px] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="text-center space-y-2 text-slate-500 p-6">
                  <ScanLine className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-xs">
                    Chưa có ảnh được chọn. Hãy kéo thả hoặc chọn file ảnh lát cắt MRI từ thiết bị ở
                    cột bên trái.
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">TÊN FILE ĐÃ ẨN DANH</span>
                  <span className="text-slate-200 truncate block">
                    {sanitizeMedicalFileName(selectedFile.name, user?.id ?? 'anonymous')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ĐỊNH DẠNG KIỂM TRA</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" /> Hợp lệ (Client)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stepper & Analysis Information */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                3. Trạng thái quy trình (UI Stepper)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                Quy trình thực tế
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                Hệ thống nạp trực tiếp mô hình ONNX Student (15.3 MB) vào trình duyệt qua ONNX Runtime Web để tính toán phân bố xác suất Softmax 4 lớp theo thời gian thực.
              </span>
            </div>

            <ol className="space-y-3 pt-1">
              {PIPELINE_STEPS.map((step) => {
                const isDone = currentStep > step.id;
                const isActive = currentStep === step.id;
                return (
                  <li
                    key={step.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/30'
                        : isDone
                          ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/15'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isActive
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
};
