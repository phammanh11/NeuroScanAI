import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  FileText,
  UserCheck,
  Stethoscope,
  Save,
  Loader2,
  Eye,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import {
  MRIUploader,
  createSyntheticDemoFile,
  getImageDimensions,
} from '@/components/medical/MRIUploader';
import { MRIViewer } from '@/components/medical/MRIViewer';
import { PredictionCard } from '@/components/medical/PredictionCard';
import { ProbabilityChart } from '@/components/charts/ProbabilityChart';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import {
  AI_ASSESSMENT_VERDICT_META,
} from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { SYNTHETIC_MRI_SLICES } from '@/assets/mriIllustrations';
import { formatPercent } from '@/utils/formatters';
import type {
  AIAssessmentVerdict,
  DoctorReviewStatus,
  MRIAnalysisRecord,
  PatientRecord,
  TumorLabel,
} from '@/types/domain';

type PipelineStep =
  | 'IDLE'
  | 'VALIDATING'
  | 'ROI_CROPPING'
  | 'CLAHE_ENHANCING'
  | 'FEATURE_EXTRACTION'
  | 'GRADCAM_SYNTHESIS'
  | 'SOFTMAX_SCORING'
  | 'COMPLETED';

const PIPELINE_STEPS_META: { key: PipelineStep; title: string; desc: string }[] = [
  {
    key: 'VALIDATING',
    title: '1. Kiểm định Ma trận Pixel & Định dạng Lát cắt',
    desc: 'Kiểm tra tỷ lệ aspect ratio 1:1, phân giải 512x512 và loại bỏ siêu dữ liệu định danh.',
  },
  {
    key: 'ROI_CROPPING',
    title: '2. Cắt Vùng Não Quan tâm (Otsu Contour ROI Bounding Box)',
    desc: 'Loại bỏ phần xương sọ ngoài và nền đen dư thừa, tập trung vào mô nhu mô não.',
  },
  {
    key: 'CLAHE_ENHANCING',
    title: '3. Tăng Tương phản Cục bộ Thích nghi (CLAHE)',
    desc: 'Tăng cường gradient độ sáng cục bộ để làm rõ ranh giới ranh u và phù não.',
  },
  {
    key: 'FEATURE_EXTRACTION',
    title: '4. Trích xuất Đặc trưng Đa Kiến trúc Backbone (Ensemble)',
    desc: 'Hợp nhất đặc trưng không gian từ ResNet50, EfficientNet-B0 và Vision Transformer (ViT).',
  },
  {
    key: 'GRADCAM_SYNTHESIS',
    title: '5. Sinh Bản đồ Chú ý Thị giác Grad-CAM',
    desc: 'Trực quan hóa vùng nơ-ron kích hoạt mạnh nhất đối với nhãn u dự đoán.',
  },
  {
    key: 'SOFTMAX_SCORING',
    title: '6. Phân phối Xác suất Softmax 4 Lớp Tham khảo',
    desc: 'Tính toán xác suất tương đối giữa Glioma, Meningioma, Pituitary và No Tumor.',
  },
];

export const DoctorVisionAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  // Patients list for assignment
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Vision Pipeline Options
  const [enableRoiCropping, setEnableRoiCropping] = useState(true);
  const [enableClahe, setEnableClahe] = useState(true);
  const [selectedBackbone, setSelectedBackbone] = useState<'ensemble' | 'resnet' | 'vit'>('ensemble');

  // Uploaded Image & Presets
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDimensions, setFileDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [uploaderError, setUploaderError] = useState<string | null>(null);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<TumorLabel>('Glioma');

  // Pipeline Execution State
  const [currentStep, setCurrentStep] = useState<PipelineStep>('IDLE');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedRecord, setAnalyzedRecord] = useState<MRIAnalysisRecord | null>(null);

  // Doctor Review Form within Vision Lab
  const [clinicalNote, setClinicalNote] = useState('');
  const [recommendedStep, setRecommendedStep] = useState('Chụp MRI có tiêm đối quang từ và hội chẩn Ngoại thần kinh.');
  const [reviewStatus, setReviewStatus] = useState<Exclude<DoctorReviewStatus, 'NONE'>>('REVIEWED');
  const [aiVerdict, setAiVerdict] = useState<AIAssessmentVerdict>('PARTIAL_CONCORDANCE');
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Load patients on mount
  useEffect(() => {
    async function loadDoctorPatients() {
      if (!user) return;
      try {
        const list = await neuroscanAdapter.getDoctorPatients(user.id);
        setPatients(list);
        const queryPatientId = searchParams.get('patientId');
        if (queryPatientId && list.some((p) => p.id === queryPatientId)) {
          setSelectedPatientId(queryPatientId);
        } else if (list.length > 0) {
          setSelectedPatientId(list[0].id);
        }
      } catch {
        setPatients([]);
      }
    }
    void loadDoctorPatients();
  }, [user, searchParams]);

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Handle Preset Selection
  const handleSelectPreset = (label: TumorLabel) => {
    setSelectedPresetLabel(label);
    const sample = createSyntheticDemoFile(label);
    setUploadedFile(sample.file);
    setFileDimensions({ width: 512, height: 512 });
    setPreviewDataUrl(sample.previewUrl);
    setUploaderError(null);
    setAnalyzedRecord(null);
    setCurrentStep('IDLE');
  };

  // Run Computer Vision Pipeline
  const runVisionPipeline = async () => {
    if (!uploadedFile) {
      showToast({
        variant: 'warning',
        title: 'Chưa chọn lát cắt MRI',
        description: 'Vui lòng tải ảnh lát cắt hoặc chọn một preset lát cắt chuẩn bên dưới.',
      });
      return;
    }
    if (!selectedPatientId || !user) {
      showToast({
        variant: 'warning',
        title: 'Chưa chọn bệnh nhân',
        description: 'Vui lòng chọn hồ sơ bệnh nhân để gán phiên phân tích Computer Vision.',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalyzedRecord(null);

    // Simulate Step-by-Step Vision Pipeline Execution
    const steps: PipelineStep[] = [
      'VALIDATING',
      'ROI_CROPPING',
      'CLAHE_ENHANCING',
      'FEATURE_EXTRACTION',
      'GRADCAM_SYNTHESIS',
      'SOFTMAX_SCORING',
    ];

    for (const step of steps) {
      setCurrentStep(step);
      await new Promise((r) => setTimeout(r, 450));
    }

    try {
      const record = await neuroscanAdapter.createAnalysis(
        {
          file: uploadedFile,
          consentAccepted: true,
          symptomNote: selectedPatient
            ? `[Bác sĩ tải qua Computer Vision Lab] BN: ${selectedPatient.fullName} (${selectedPatient.patientCode}). Triệu chứng: ${selectedPatient.symptomsInitial || 'Chưa ghi nhận'}`
            : 'Bác sĩ tải trực tiếp qua Computer Vision Lab.',
          imageDimensions: fileDimensions || { width: 512, height: 512 },
          targetPatientId: selectedPatientId,
        },
        user,
        previewDataUrl || SYNTHETIC_MRI_SLICES[selectedPresetLabel]
      );

      setAnalyzedRecord(record);
      setCurrentStep('COMPLETED');
      setClinicalNote(
        `[Đánh giá lâm sàng Bác sĩ] Lát cắt sọ não qua tiền xử lý ROI Contour & CLAHE cho thấy cấu trúc tổn thương vùng nhu mô não. Kết quả phân loại tham khảo của AI gợi ý nhãn ${record.predictedLabel} (độ tin cậy ${formatPercent(record.confidenceScore)}). Đề nghị phối hợp thêm dữ liệu chuỗi xung T1ce để đánh giá mức độ bắt thuốc viền.`
      );
      showToast({
        variant: 'success',
        title: 'Pipeline Computer Vision hoàn tất',
        description: `Đã xử lý lát cắt cho bệnh nhân ${selectedPatient?.fullName}. Mời bác sĩ hoàn tất phiếu nhận xét.`,
      });
    } catch (err) {
      setCurrentStep('IDLE');
      showToast({
        variant: 'error',
        title: 'Lỗi thực thi Vision Pipeline',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Doctor Clinical Review & Synchronize
  const handleSaveAndSyncReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzedRecord || !user) return;
    if (!clinicalNote.trim()) {
      showToast({ variant: 'warning', title: 'Vui lòng nhập nhận xét lâm sàng cho bệnh nhân' });
      return;
    }

    setIsSavingRecord(true);
    try {
      const updated = await neuroscanAdapter.submitDoctorReview(
        {
          analysisId: analyzedRecord.id,
          status: reviewStatus,
          aiAssessment: aiVerdict,
          clinicalNoteForPatient: clinicalNote.trim(),
          recommendedNextStep: recommendedStep.trim() || 'Tái khám chuyên khoa định kỳ.',
          internalTechnicalNote: `Pipeline: ${selectedBackbone.toUpperCase()} Ensemble. CLAHE: ${enableClahe ? 'ON' : 'OFF'}, ROI: ${enableRoiCropping ? 'ON' : 'OFF'}.`,
        },
        user
      );
      setAnalyzedRecord(updated);
      showToast({
        variant: 'success',
        title: 'Đã lưu & Đồng bộ vào Hồ sơ Bệnh nhân',
        description: `Bệnh nhân ${selectedPatient?.fullName} sẽ xem được ảnh lát cắt và nhận xét này trong trang cá nhân của họ.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Đồng bộ thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSavingRecord(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Computer Vision MRI Workstation • Vai trò DOCTOR"
        title="Trạm Phân tích Thị giác Máy tính (Computer Vision MRI Lab)"
        description="Quy trình chuyên sâu dành cho Bác sĩ: Cắt vùng viền não Otsu ROI, Tăng tương phản CLAHE, Trích xuất đặc trưng Ensemble và Gán trực tiếp vào hồ sơ khách hàng/bệnh nhân."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/doctor/patients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100"
            >
              <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Quay lại Danh sách Bệnh nhân</span>
            </Link>
            <Link
              to="/doctor/cases"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Danh sách Ca MRI</span>
            </Link>
          </div>
        }
      />

      {/* SECTION 1: PATIENT ASSIGNMENT & VISION LAB CONTROLS */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Gán Ca Phân tích vào Hồ sơ Bệnh nhân
              </h2>
              <p className="text-xs text-slate-500">
                Lát cắt sau khi phân tích sẽ lập tức hiển thị trên Dashboard và Lịch sử của Bệnh nhân này.
              </p>
            </div>
          </div>

          <Link
            to="/doctor/patients"
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
          >
            <span>+ Tiếp nhận bệnh nhân mới nếu chưa có</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="patient-select-lab" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chọn Bệnh nhân tiếp nhận phân tích:
            </label>
            <select
              id="patient-select-lab"
              disabled={isAnalyzing}
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patientCode} — {p.fullName} ({p.gender}, sinh {p.dateOfBirth})
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <div className="md:col-span-6 p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-500/30 text-xs space-y-1">
              <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center justify-between">
                <span>Hồ sơ: {selectedPatient.fullName} ({selectedPatient.patientCode})</span>
                <span className="font-mono text-[11px] text-teal-700 dark:text-teal-300">SĐT: {selectedPatient.phone}</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <strong>Triệu chứng ghi nhận:</strong> {selectedPatient.symptomsInitial || 'Chưa ghi nhận'}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                <strong>Tiền sử y khoa:</strong> {selectedPatient.medicalHistory || 'Không'}
              </div>
            </div>
          )}
        </div>

        {/* Vision Parameters */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>2. Tùy chọn Tham số Thuật toán Computer Vision</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
              <input
                type="checkbox"
                checked={enableRoiCropping}
                onChange={(e) => setEnableRoiCropping(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Otsu ROI Contour Cropping
                </span>
                <span className="text-slate-500 text-[11px]">Cắt tự động vùng viền sọ não</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
              <input
                type="checkbox"
                checked={enableClahe}
                onChange={(e) => setEnableClahe(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  CLAHE Adaptive Equalization
                </span>
                <span className="text-slate-500 text-[11px]">Tăng độ tương phản vi mô cục bộ</span>
              </div>
            </label>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Kiến trúc Backbone
              </span>
              <select
                value={selectedBackbone}
                onChange={(e) => setSelectedBackbone(e.target.value as 'ensemble' | 'resnet' | 'vit')}
                className="w-full text-xs font-semibold bg-transparent border-0 focus:ring-0 text-teal-600 dark:text-teal-400 p-0 cursor-pointer"
              >
                <option value="ensemble">Ensemble (ResNet50 + EfficientNet + ViT)</option>
                <option value="resnet">ResNet-50 Feature Extractor</option>
                <option value="vit">Vision Transformer (ViT-B/16)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: UPLOAD OR SELECT CLINICAL PRESETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Upload or Preset Picker (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  3. Chọn Lát cắt MRI để Thực thi
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-500/30">
                Hỗ trợ PNG / JPG
              </span>
            </div>

            {/* Quick Clinical Slices Presets */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Chọn nhanh từ Thư viện Lát cắt Chuẩn lâm sàng (Preset):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'] as TumorLabel[]).map((label) => {
                  const isSelected = selectedPresetLabel === label && !uploadedFile;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSelectPreset(label)}
                      className={`p-2.5 rounded-xl border text-left transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                      }`}
                    >
                      <img
                        src={SYNTHETIC_MRI_SLICES[label]}
                        alt={label}
                        className="w-full h-16 rounded-lg object-cover bg-black"
                      />
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {label}
                      </div>
                      <div className="text-[10px] text-slate-500">Chuỗi xung T1/T2</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative py-2 text-center text-xs text-slate-400">
              <span className="bg-white dark:bg-slate-900 px-3 relative z-10">hoặc tải lát cắt tùy ý từ máy tính</span>
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-200 dark:border-slate-800" />
            </div>

            {/* File Upload Dropzone */}
            <MRIUploader
              disabled={isAnalyzing}
              selectedFile={uploadedFile}
              previewUrl={previewDataUrl}
              validationError={uploaderError}
              onSelectFile={async (file, previewUrl) => {
                setUploadedFile(file);
                setPreviewDataUrl(previewUrl);
                setUploaderError(null);
                setAnalyzedRecord(null);
                setCurrentStep('IDLE');
                try {
                  const dims = await getImageDimensions(previewUrl);
                  setFileDimensions(dims);
                } catch {
                  setFileDimensions({ width: 512, height: 512 });
                }
              }}
              onValidationError={(msg) => setUploaderError(msg)}
              onClearFile={() => {
                setUploadedFile(null);
                setFileDimensions(null);
                setPreviewDataUrl(null);
                setUploaderError(null);
                setAnalyzedRecord(null);
                setCurrentStep('IDLE');
              }}
              onUseSyntheticSample={(label) => handleSelectPreset(label)}
            />

            {/* Run Button */}
            <button
              type="button"
              disabled={isAnalyzing || !uploadedFile}
              onClick={runVisionPipeline}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white flex items-center justify-center gap-2.5 transition-all shadow-md"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang thực thi Pipeline Thị giác Máy tính...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Bắt đầu Phân tích Computer Vision ({selectedPresetLabel})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Vision Pipeline Stepper / Progress (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tiến trình Xử lý Thị giác Máy tính (Pipeline Stages)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {currentStep === 'COMPLETED' ? '6/6 HOÀN TẤT' : isAnalyzing ? 'ĐANG CHẠY' : 'SẴN SÀNG'}
              </span>
            </div>

            <div className="space-y-3">
              {PIPELINE_STEPS_META.map((step, idx) => {
                const isStepCompleted =
                  currentStep === 'COMPLETED' ||
                  (isAnalyzing && idx < PIPELINE_STEPS_META.findIndex((s) => s.key === currentStep));
                const isStepActive = isAnalyzing && currentStep === step.key;

                return (
                  <div
                    key={step.key}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isStepActive
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20'
                        : isStepCompleted
                          ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/15'
                          : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 opacity-70'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isStepActive ? (
                        <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                      ) : isStepCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 text-[10px] flex items-center justify-center font-bold text-slate-400">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {step.title}
                      </div>
                      <div className="text-slate-500 text-[11px] leading-relaxed">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: VISUAL RESULTS & CLINICAL EVALUATION */}
      {analyzedRecord && (
        <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Kết quả Phân tích Thị giác & Bản đồ Chú ý (Grad-CAM)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Phiên: <strong>{analyzedRecord.sessionCode}</strong> • Bệnh nhân:{' '}
                <strong>{selectedPatient?.fullName}</strong> ({selectedPatient?.patientCode})
              </p>
            </div>
            <Link
              to={`/mri-results/${analyzedRecord.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
            >
              <Eye className="w-3.5 h-3.5 text-teal-600" />
              <span>Mở trang Kết quả Bệnh nhân</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: MRI Multi-layer Viewer + Probability Chart (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <MRIViewer
                imageUrl={analyzedRecord.imageUrl}
                preprocessedImageUrl={analyzedRecord.preprocessedImageUrl}
                gradcamUrl={analyzedRecord.gradcamUrl}
                sessionCode={analyzedRecord.sessionCode}
                sanitizedFileName={analyzedRecord.sanitizedFileName}
                dimensions={analyzedRecord.imageDimensions}
                isDemoFixture={analyzedRecord.isDemoFixture}
              />

              <ProbabilityChart
                probabilities={analyzedRecord.probabilities}
                isDemoFixture={analyzedRecord.isDemoFixture}
              />
            </div>

            {/* Right: Doctor Clinical Evaluation Form (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <form
                onSubmit={handleSaveAndSyncReview}
                className="rounded-2xl border-2 border-teal-500/40 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Phiếu Nhận xét Lâm sàng Bác sĩ
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                    Đồng bộ Bệnh nhân
                  </span>
                </div>

                <div className="space-y-1">
                  <label htmlFor="cv-status-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Trạng thái ca bệnh
                  </label>
                  <select
                    id="cv-status-select"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as Exclude<DoctorReviewStatus, 'NONE'>)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold"
                  >
                    <option value="REVIEWED">Đã xem xét — Hoàn tất nhận xét cho bệnh nhân</option>
                    <option value="IN_REVIEW">Đang tiếp tục đối chiếu lâm sàng</option>
                    <option value="NEEDS_MORE_INFO">Cần bổ sung chuỗi xung / Bệnh án</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="cv-verdict-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Đánh giá kết quả phân loại của AI ({analyzedRecord.predictedLabel})
                  </label>
                  <select
                    id="cv-verdict-select"
                    value={aiVerdict}
                    onChange={(e) => setAiVerdict(e.target.value as AIAssessmentVerdict)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
                  >
                    {Object.entries(AI_ASSESSMENT_VERDICT_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="cv-clinical-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nhận xét lâm sàng gửi cho Bệnh nhân <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="cv-clinical-note"
                    rows={4}
                    required
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    placeholder="Nhập nhận xét chuyên môn của bác sĩ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cv-rec-step" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Khuyến nghị bước tiếp theo
                  </label>
                  <input
                    id="cv-rec-step"
                    type="text"
                    value={recommendedStep}
                    onChange={(e) => setRecommendedStep(e.target.value)}
                    placeholder="Chụp MRI có tiêm đối quang từ, hội chẩn ngoại thần kinh..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  {isSavingRecord ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Lưu & Đồng bộ vào Hồ sơ Bệnh nhân</span>
                </button>
              </form>

              <PredictionCard
                predictedLabel={analyzedRecord.predictedLabel}
                confidenceScore={analyzedRecord.confidenceScore}
                isDemoFixture={analyzedRecord.isDemoFixture}
              />
            </div>
          </div>
        </div>
      )}

      <MedicalDisclaimer />
    </div>
  );
};
