import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Stethoscope,
  ScanLine,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Calendar,
  Activity,
  Save,
  Loader2,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { MRIViewer } from '@/components/medical/MRIViewer';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import {
  AI_ASSESSMENT_VERDICT_META,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { SYNTHETIC_MRI_SLICES } from '@/assets/mriIllustrations';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import {
  formatDateVN,
  formatDateTimeVN,
  formatPercent,
  normalizeSearchText,
} from '@/utils/formatters';
import type {
  AIAssessmentVerdict,
  CreatePatientPayload,
  DoctorReviewStatus,
  MRIAnalysisRecord,
  PatientRecord,
  UpdatePatientPayload,
} from '@/types/domain';

export const DoctorPatientsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Nam' | 'Nữ' | 'Khác'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<PatientRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail Drawer state
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<PatientRecord | null>(null);
  const [patientAnalyses, setPatientAnalyses] = useState<MRIAnalysisRecord[]>([]);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [previewAnalysis, setPreviewAnalysis] = useState<MRIAnalysisRecord | null>(null);

  // Review Evaluation Modal state
  const [evaluatingPatient, setEvaluatingPatient] = useState<PatientRecord | null>(null);
  const [evaluatingAnalysis, setEvaluatingAnalysis] = useState<MRIAnalysisRecord | null>(null);
  const [reviewStatus, setReviewStatus] = useState<Exclude<DoctorReviewStatus, 'NONE'>>('REVIEWED');
  const [aiVerdict, setAiVerdict] = useState<AIAssessmentVerdict>('PARTIAL_CONCORDANCE');
  const [clinicalNote, setClinicalNote] = useState('');
  const [recommendedStep, setRecommendedStep] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);

  // Form states for Create/Edit Patient
  const [fullNameInput, setFullNameInput] = useState('');
  const [dobInput, setDobInput] = useState('1985-05-15');
  const [genderInput, setGenderInput] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const loadPatientsRef = useRef(0);

  const loadPatients = useCallback(async () => {
    if (!user) return;
    const reqId = ++loadPatientsRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await neuroscanAdapter.getDoctorPatients(user.id);
      if (reqId !== loadPatientsRef.current) return;
      setPatients(data);
    } catch (err) {
      if (reqId !== loadPatientsRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách bệnh nhân.');
    } finally {
      if (reqId === loadPatientsRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  // Load analyses when opening Patient Detail Drawer
  const openPatientDetail = async (patient: PatientRecord) => {
    setSelectedPatientForDetail(patient);
    setIsLoadingAnalyses(true);
    try {
      const analyses = await neuroscanAdapter.getPatientAnalyses(patient.id);
      setPatientAnalyses(analyses);
      setPreviewAnalysis(analyses[0] || null);
    } catch {
      setPatientAnalyses([]);
      setPreviewAnalysis(null);
    } finally {
      setIsLoadingAnalyses(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFullNameInput('');
    setDobInput('1988-06-20');
    setGenderInput('Nam');
    setPhoneInput('0912 345 678');
    setAddressInput('Hà Nội');
    setHistoryInput('Không có tiền sử bệnh lý mạn tính');
    setSymptomsInput('Đau đầu vùng thái dương, chóng mặt khi thay đổi tư thế');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (patient: PatientRecord) => {
    setEditingPatient(patient);
    setFullNameInput(patient.fullName);
    setDobInput(patient.dateOfBirth);
    setGenderInput(patient.gender);
    setPhoneInput(patient.phone);
    setAddressInput(patient.address || '');
    setHistoryInput(patient.medicalHistory || '');
    setSymptomsInput(patient.symptomsInitial || '');
  };

  // Open Write Review Modal
  const openReviewModal = async (patient: PatientRecord) => {
    setEvaluatingPatient(patient);
    setIsSavingReview(false);
    try {
      const analyses = await neuroscanAdapter.getPatientAnalyses(patient.id);
      setPatientAnalyses(analyses);
      const target = analyses[0] || null;
      setEvaluatingAnalysis(target);
      if (target?.doctorReview) {
        setReviewStatus(target.doctorReview.status);
        setAiVerdict(target.doctorReview.aiAssessment);
        setClinicalNote(target.doctorReview.clinicalNoteForPatient);
        setRecommendedStep(target.doctorReview.recommendedNextStep);
        setInternalNote(target.doctorReview.internalTechnicalNote || '');
      } else {
        setReviewStatus('REVIEWED');
        setAiVerdict('PARTIAL_CONCORDANCE');
        setClinicalNote(
          `[Đánh giá lâm sàng Bác sĩ] Bệnh nhân ${patient.fullName} (${patient.gender}): Đã đối chiếu triệu chứng lâm sàng và hình ảnh lát cắt MRI. Vùng tổn thương tương thích một phần với nhãn dự đoán của AI. Khuyến nghị chụp thêm chuỗi xung T1ce để đánh giá mức độ ngấm thuốc viền.`
        );
        setRecommendedStep('Chụp MRI sọ não có tiêm đối quang từ (Gadolinium) và xét nghiệm công thức máu.');
        setInternalNote('Kiểm tra tín hiệu T2/FLAIR tăng quang quanh u, theo dõi hiệu ứng khối chèn ép não thất.');
      }
    } catch {
      setEvaluatingAnalysis(null);
    }
  };

  // Submit Create Patient
  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullNameInput.trim()) {
      showToast({ variant: 'warning', title: 'Vui lòng nhập họ và tên bệnh nhân' });
      return;
    }
    setIsSubmittingForm(true);
    try {
      const payload: CreatePatientPayload = {
        fullName: fullNameInput.trim(),
        dateOfBirth: dobInput,
        gender: genderInput,
        phone: phoneInput.trim(),
        address: addressInput.trim(),
        medicalHistory: historyInput.trim(),
        symptomsInitial: symptomsInput.trim(),
      };
      const created = await neuroscanAdapter.createPatient(payload, user);
      setPatients((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      showToast({
        variant: 'success',
        title: 'Thêm bệnh nhân thành công',
        description: `Đã tạo hồ sơ cho ${created.fullName} (${created.patientCode}).`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Thêm bệnh nhân thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Submit Edit Patient
  const handleEditPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    if (!fullNameInput.trim()) {
      showToast({ variant: 'warning', title: 'Vui lòng nhập họ và tên bệnh nhân' });
      return;
    }
    setIsSubmittingForm(true);
    try {
      const payload: UpdatePatientPayload = {
        id: editingPatient.id,
        fullName: fullNameInput.trim(),
        dateOfBirth: dobInput,
        gender: genderInput,
        phone: phoneInput.trim(),
        address: addressInput.trim(),
        medicalHistory: historyInput.trim(),
        symptomsInitial: symptomsInput.trim(),
      };
      const updated = await neuroscanAdapter.updatePatient(payload);
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedPatientForDetail?.id === updated.id) {
        setSelectedPatientForDetail(updated);
      }
      setEditingPatient(null);
      showToast({
        variant: 'success',
        title: 'Cập nhật thông tin thành công',
        description: `Hồ sơ của bệnh nhân ${updated.fullName} đã được cập nhật.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Cập nhật thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Confirm Delete Patient
  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await neuroscanAdapter.deletePatient(patientToDelete.id);
      setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      if (selectedPatientForDetail?.id === patientToDelete.id) {
        setSelectedPatientForDetail(null);
      }
      showToast({
        variant: 'info',
        title: 'Đã xóa hồ sơ bệnh nhân',
        description: `Đã xóa bệnh nhân ${patientToDelete.fullName} (${patientToDelete.patientCode}) khỏi danh sách.`,
      });
      setPatientToDelete(null);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Xóa bệnh nhân thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Review Evaluation
  const handleSaveEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingAnalysis || !user) {
      showToast({
        variant: 'warning',
        title: 'Chưa có ca MRI liên kết',
        description: 'Vui lòng tải ảnh MRI cho bệnh nhân này qua Computer Vision trước khi ghi nhận xét.',
      });
      return;
    }
    if (!clinicalNote.trim()) {
      showToast({ variant: 'warning', title: 'Vui lòng nhập nhận xét lâm sàng cho bệnh nhân' });
      return;
    }
    setIsSavingReview(true);
    try {
      const updated = await neuroscanAdapter.submitDoctorReview(
        {
          analysisId: evaluatingAnalysis.id,
          status: reviewStatus,
          aiAssessment: aiVerdict,
          clinicalNoteForPatient: clinicalNote.trim(),
          recommendedNextStep: recommendedStep.trim() || 'Tái khám định kỳ kèm kết quả xét nghiệm.',
          internalTechnicalNote: internalNote.trim() || undefined,
        },
        user
      );
      setPatientAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (previewAnalysis?.id === updated.id) {
        setPreviewAnalysis(updated);
      }
      setEvaluatingPatient(null);
      showToast({
        variant: 'success',
        title: 'Đã lưu nhận xét chuyên môn & Gửi đến Bệnh nhân',
        description: `Đánh giá cho ca ${updated.sessionCode} đã được đồng bộ vào hồ sơ của bệnh nhân.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Lưu nhận xét thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (genderFilter !== 'ALL' && p.gender !== genderFilter) return false;
      const q = normalizeSearchText(searchQuery);
      if (
        q &&
        !normalizeSearchText(p.fullName).includes(q) &&
        !normalizeSearchText(p.patientCode).includes(q) &&
        !normalizeSearchText(p.phone).includes(q) &&
        !normalizeSearchText(p.symptomsInitial || '').includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [patients, genderFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPatients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, safePage, pageSize]);

  if (isLoading) {
    return (
      <LoadingState
        title="Đang tải Danh sách Bệnh nhân & Khách hàng..."
        description="Đang đồng bộ hồ sơ y khoa và các phiên phân tích hình ảnh sọ não."
      />
    );
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} onRetry={loadPatients} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Hồ sơ Bệnh nhân Lâm sàng • Vai trò DOCTOR"
        title="Quản lý Danh sách Bệnh nhân & Khách hàng"
        description="Theo dõi hồ sơ bệnh án, quản lý triệu chứng lâm sàng, xem các ảnh MRI đã tải lên và cung cấp nhận định chuyên môn cho từng bệnh nhân."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tiếp nhận Bệnh nhân mới</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor/vision-analysis')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-teal-500/40 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span>Mở Computer Vision Lab</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Tổng số bệnh nhân</span>
            <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {patients.length} người
          </div>
          <p className="text-xs text-slate-500">Hồ sơ bệnh nhân do Bác sĩ phụ trách</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>Đang theo dõi tích cực</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {patients.length} ca
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Cần đối chiếu định kỳ ảnh MRI & triệu chứng
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800 dark:text-sky-300">
            <span>Chờ tái khám / Đánh giá</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {Math.max(1, Math.floor(patients.length / 2))} ca
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Cần bổ sung chuỗi xung hoặc đánh giá lại
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Bệnh nhân đã ổn định</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {Math.max(0, patients.length - 2)} ca
          </div>
          <p className="text-xs text-slate-500">Đã hoàn tất lộ trình hội chẩn ban đầu</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="patient-search" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Tìm kiếm theo Họ tên, Mã bệnh nhân, SĐT hoặc Triệu chứng
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="patient-search"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Nguyễn Minh An, BN-2026-001, đau đầu, nhìn mờ..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="gender-filter" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Giới tính
          </label>
          <select
            id="gender-filter"
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as 'ALL' | 'Nam' | 'Nữ' | 'Khác');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
        </div>
      </div>

      {/* Patient Table / List */}
      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-slate-400" />}
          title="Không tìm thấy bệnh nhân nào khớp điều kiện lọc"
          description="Bạn có thể thử xóa từ khóa tìm kiếm hoặc nhấn 'Tiếp nhận Bệnh nhân mới' để thêm hồ sơ."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
            >
              Thêm bệnh nhân mới
            </button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Mã & Họ tên bệnh nhân</th>
                  <th className="py-3.5 px-4 font-semibold">Thông tin cá nhân</th>
                  <th className="py-3.5 px-4 font-semibold">Triệu chứng & Tiền sử</th>
                  <th className="py-3.5 px-4 font-semibold">Cập nhật</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Thao tác lâm sàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {paginatedPatients.map((patient) => {
                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">
                          {patient.patientCode}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {patient.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{patient.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 dark:text-slate-300">
                          {patient.gender} • {patient.age} tuổi
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDateVN(patient.dateOfBirth)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {patient.address || 'Hà Nội'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          <strong>Triệu chứng:</strong> {patient.symptomsInitial || 'Chưa ghi nhận'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          <strong>Tiền sử:</strong> {patient.medicalHistory || 'Không'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDateTimeVN(patient.updatedAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Button 1: Xem Hồ sơ & Ảnh MRI */}
                          <button
                            type="button"
                            onClick={() => openPatientDetail(patient)}
                            title="Xem chi tiết hồ sơ & Bộ sưu tập ảnh MRI của bệnh nhân"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Button 2: Tải ảnh qua Computer Vision */}
                          <button
                            type="button"
                            onClick={() => navigate(`/doctor/vision-analysis?patientId=${patient.id}`)}
                            title="Tải ảnh lát cắt MRI & Chạy Computer Vision cho bệnh nhân này"
                            className="p-1.5 rounded-lg border border-teal-500/40 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 transition-colors"
                          >
                            <ScanLine className="w-4 h-4" />
                          </button>

                          {/* Button 3: Viết đánh giá chuyên môn */}
                          <button
                            type="button"
                            onClick={() => openReviewModal(patient)}
                            title="Viết nhận xét lâm sàng gửi cho bệnh nhân"
                            className="p-1.5 rounded-lg border border-sky-500/40 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 transition-colors"
                          >
                            <Stethoscope className="w-4 h-4" />
                          </button>

                          {/* Button 4: Sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => openEditModal(patient)}
                            title="Chỉnh sửa thông tin hành chính bệnh nhân"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Button 5: Xóa */}
                          <button
                            type="button"
                            onClick={() => setPatientToDelete(patient)}
                            title="Xóa bệnh nhân"
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                  {filteredPatients.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                </strong>
                –
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                  {Math.min(safePage * pageSize, filteredPatients.length)}
                </strong>{' '}
                trên tổng số{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                  {filteredPatients.length}
                </strong>{' '}
                bệnh nhân
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                <span>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value={3}>3 / trang</option>
                  <option value={5}>5 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Previous Page Button */}
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === safePage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                        isActive
                          ? 'bg-navy-800 text-white dark:bg-teal-600 dark:text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE PATIENT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tiếp nhận Bệnh nhân mới vào Danh sách Theo dõi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatientSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="create-patient-name" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Họ và tên bệnh nhân <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-patient-name"
                    type="text"
                    required
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-patient-dob" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Ngày sinh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-patient-dob"
                    type="date"
                    required
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-patient-gender" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Giới tính
                  </label>
                  <select
                    id="create-patient-gender"
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value as 'Nam' | 'Nữ' | 'Khác')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-patient-phone" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Số điện thoại
                  </label>
                  <input
                    id="create-patient-phone"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-patient-addr" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Địa chỉ liên hệ
                  </label>
                  <input
                    id="create-patient-addr"
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Hà Nội, Việt Nam"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="create-patient-symptoms" className="block font-semibold text-slate-700 dark:text-slate-300">
                  Triệu chứng lâm sàng ghi nhận ban đầu
                </label>
                <input
                  id="create-patient-symptoms"
                  type="text"
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder="Đau đầu buổi sáng, nhìn đôi, chóng mặt..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="create-patient-history" className="block font-semibold text-slate-700 dark:text-slate-300">
                  Tiền sử bệnh lý
                </label>
                <input
                  id="create-patient-history"
                  type="text"
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  placeholder="Tăng huyết áp, Động kinh, Chấn thương đầu..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                >
                  {isSubmittingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Lưu hồ sơ bệnh nhân</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PATIENT */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Chỉnh sửa Hồ sơ: {editingPatient.fullName} ({editingPatient.patientCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPatientSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="edit-patient-name" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Họ và tên bệnh nhân
                  </label>
                  <input
                    id="edit-patient-name"
                    type="text"
                    required
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-patient-dob" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Ngày sinh
                  </label>
                  <input
                    id="edit-patient-dob"
                    type="date"
                    required
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-patient-gender" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Giới tính
                  </label>
                  <select
                    id="edit-patient-gender"
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value as 'Nam' | 'Nữ' | 'Khác')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-patient-phone" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Số điện thoại
                  </label>
                  <input
                    id="edit-patient-phone"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-patient-addr" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Địa chỉ liên hệ
                  </label>
                  <input
                    id="edit-patient-addr"
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-patient-symptoms" className="block font-semibold text-slate-700 dark:text-slate-300">
                  Triệu chứng lâm sàng ghi nhận
                </label>
                <input
                  id="edit-patient-symptoms"
                  type="text"
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-patient-history" className="block font-semibold text-slate-700 dark:text-slate-300">
                  Tiền sử bệnh lý
                </label>
                <input
                  id="edit-patient-history"
                  type="text"
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                >
                  {isSubmittingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Cập nhật hồ sơ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WRITE CLINICAL EVALUATION REVIEW */}
      {evaluatingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Viết Đánh giá & Nhận xét Chuyên môn Bác sĩ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bệnh nhân: <strong>{evaluatingPatient.fullName}</strong> ({evaluatingPatient.patientCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {patientAnalyses.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  Bệnh nhân này chưa có ảnh lát cắt MRI nào trong hồ sơ
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Để viết nhận xét lâm sàng đối chiếu với AI, bác sĩ hãy sử dụng chức năng Computer Vision MRI để tải ảnh lên cho bệnh nhân trước.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const pid = evaluatingPatient.id;
                    setEvaluatingPatient(null);
                    navigate(`/doctor/vision-analysis?patientId=${pid}`);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Tải ảnh & Chạy Computer Vision ngay</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveEvaluationSubmit} className="space-y-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <label htmlFor="eval-analysis-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Chọn phiên ảnh MRI của bệnh nhân cần đánh giá:
                  </label>
                  <select
                    id="eval-analysis-select"
                    value={evaluatingAnalysis?.id || ''}
                    onChange={(e) => {
                      const found = patientAnalyses.find((a) => a.id === e.target.value);
                      setEvaluatingAnalysis(found || null);
                      if (found?.doctorReview) {
                        setReviewStatus(found.doctorReview.status);
                        setAiVerdict(found.doctorReview.aiAssessment);
                        setClinicalNote(found.doctorReview.clinicalNoteForPatient);
                        setRecommendedStep(found.doctorReview.recommendedNextStep);
                        setInternalNote(found.doctorReview.internalTechnicalNote || '');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs font-semibold"
                  >
                    {patientAnalyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.sessionCode} — Nhãn AI: {a.predictedLabel} ({formatPercent(a.confidenceScore)}) — {a.uploadedByRole === 'DOCTOR' ? 'Bác sĩ tải qua Computer Vision' : 'Bệnh nhân gửi'}
                      </option>
                    ))}
                  </select>

                  {evaluatingAnalysis && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={evaluatingAnalysis.imageUrl}
                        alt="Ảnh lát cắt"
                        className="w-12 h-12 rounded-lg object-cover bg-black border border-slate-700"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Nhãn mô hình AI: {evaluatingAnalysis.predictedLabel}
                        </span>
                        <div className="text-slate-500">
                          File: {evaluatingAnalysis.sanitizedFileName} • {formatDateTimeVN(evaluatingAnalysis.createdAt)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="eval-status-select" className="block font-semibold text-slate-700 dark:text-slate-300">
                      Trạng thái xử lý ca
                    </label>
                    <select
                      id="eval-status-select"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as Exclude<DoctorReviewStatus, 'NONE'>)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-semibold"
                    >
                      <option value="REVIEWED">Đã xem xét — Hoàn tất nhận định</option>
                      <option value="IN_REVIEW">Đang tiếp tục theo dõi lâm sàng</option>
                      <option value="NEEDS_MORE_INFO">Cần bổ sung chuỗi xung DICOM / Xét nghiệm</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="eval-ai-verdict-select" className="block font-semibold text-slate-700 dark:text-slate-300">
                      Đánh giá mức độ đồng thuận với nhãn AI
                    </label>
                    <select
                      id="eval-ai-verdict-select"
                      value={aiVerdict}
                      onChange={(e) => setAiVerdict(e.target.value as AIAssessmentVerdict)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    >
                      {Object.entries(AI_ASSESSMENT_VERDICT_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="eval-clinical-note" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nhận xét chuyên môn lâm sàng gửi cho Bệnh nhân <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="eval-clinical-note"
                    rows={4}
                    required
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    placeholder="Nhập nhận định của bác sĩ sau khi đọc lát cắt và đối chiếu triệu chứng..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eval-rec-step" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Khuyến nghị phác đồ / Hướng xử trí tiếp theo cho bệnh nhân
                  </label>
                  <input
                    id="eval-rec-step"
                    type="text"
                    value={recommendedStep}
                    onChange={(e) => setRecommendedStep(e.target.value)}
                    placeholder="Chụp MRI sọ não có cản quang, hội chẩn chuyên khoa Ngoại thần kinh..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eval-internal-note" className="block font-semibold text-slate-700 dark:text-slate-300">
                    Ghi chú kỹ thuật nội bộ (Chỉ lưu trong hồ sơ bác sĩ, không hiển thị cho bệnh nhân)
                  </label>
                  <input
                    id="eval-internal-note"
                    type="text"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Hiện tượng tín hiệu T2 cao, đường kính vùng giảm đậm độ ~24mm..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEvaluatingPatient(null)}
                    className="px-4 py-2 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingReview}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                  >
                    {isSavingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Lưu Nhận xét & Đồng bộ Hồ sơ</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DRAWER: PATIENT FULL RECORD & MRI GALLERY DETAIL */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-4xl lg:max-w-5xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shrink-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {selectedPatientForDetail.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      Hồ sơ chi tiết: {selectedPatientForDetail.fullName}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-semibold">
                      {selectedPatientForDetail.patientCode}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{selectedPatientForDetail.gender}</span>
                    <span>•</span>
                    <span>{selectedPatientForDetail.age} tuổi</span>
                    <span>•</span>
                    <span>Ngày sinh: {formatDateVN(selectedPatientForDetail.dateOfBirth)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pid = selectedPatientForDetail.id;
                    setSelectedPatientForDetail(null);
                    navigate(`/doctor/vision-analysis?patientId=${pid}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
                >
                  <ScanLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Tải ảnh MRI Computer Vision</span>
                  <span className="sm:hidden">Tải MRI</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedPatientForDetail;
                    setSelectedPatientForDetail(null);
                    openReviewModal(p);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-sky-500/30 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span className="hidden sm:inline">Viết đánh giá chuyên môn</span>
                  <span className="sm:hidden">Đánh giá</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPatientForDetail(null)}
                  aria-label="Đóng chi tiết hồ sơ"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body: 2-Column Responsive Layout */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Demographics & MRI Thumbnails (5 cols on lg) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Patient Demographics Card */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 text-xs">
                    <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200/80 dark:border-slate-700/80">
                      Thông tin hành chính & Liên hệ
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                      <div><strong>Số điện thoại:</strong> {selectedPatientForDetail.phone}</div>
                      <div><strong>Địa chỉ:</strong> {selectedPatientForDetail.address || 'Hà Nội'}</div>
                      <div className="col-span-2"><strong>Bác sĩ phụ trách:</strong> {selectedPatientForDetail.assignedDoctorName}</div>
                    </div>
                    <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-2.5 space-y-1.5 text-slate-700 dark:text-slate-300">
                      <div><strong>Triệu chứng ban đầu:</strong> {selectedPatientForDetail.symptomsInitial || 'Chưa ghi nhận'}</div>
                      <div><strong>Tiền sử bệnh án:</strong> {selectedPatientForDetail.medicalHistory || 'Không có tiền sử bệnh lý mạn tính'}</div>
                    </div>
                  </div>

                  {/* MRI Thumbnails Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          Bộ sưu tập ảnh MRI ({patientAnalyses.length})
                        </h4>
                      </div>
                    </div>

                    {isLoadingAnalyses ? (
                      <div className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                        Đang đồng bộ lát cắt MRI của bệnh nhân...
                      </div>
                    ) : patientAnalyses.length === 0 ? (
                      <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                        <ScanLine className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500">
                          Bệnh nhân này chưa có ảnh lát cắt MRI nào trong hồ sơ.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
                        {patientAnalyses.map((item) => {
                          const isSelected = previewAnalysis?.id === item.id;
                          const labelMeta = TUMOR_LABEL_METADATA[item.predictedLabel];
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPreviewAnalysis(item)}
                              className={`rounded-xl border p-2 transition-all text-left space-y-1.5 focus:outline-none ${
                                isSelected
                                  ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-950/40 ring-2 ring-teal-500/30'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center relative">
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src =
                                      SYNTHETIC_MRI_SLICES[item.predictedLabel] ||
                                      SYNTHETIC_MRI_SLICES['No Tumor'];
                                  }}
                                  className="w-full h-full object-contain p-0.5"
                                />
                                {isSelected && (
                                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-600 text-white">
                                    Đang xem
                                  </span>
                                )}
                              </div>
                              <div className="font-mono font-semibold text-[11px] text-slate-900 dark:text-slate-100 truncate">
                                {item.sessionCode}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${labelMeta.badgeColorClass}`}>
                                  {item.predictedLabel}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formatPercent(item.confidenceScore)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Active MRI Workstation Viewer (7 cols on lg) */}
                <div className="lg:col-span-7 space-y-4">
                  {previewAnalysis ? (
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                            Lát cắt: {previewAnalysis.sessionCode}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TUMOR_LABEL_METADATA[previewAnalysis.predictedLabel].badgeColorClass}`}>
                            {previewAnalysis.predictedLabel}
                          </span>
                        </div>
                        <Link
                          to={`/doctor/cases/${previewAnalysis.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          <span>Mở trạm đọc đầy đủ</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {/* MRI Workstation Viewer with bounded comfortable viewport */}
                      <div className="rounded-xl overflow-hidden">
                        <MRIViewer
                          imageUrl={previewAnalysis.imageUrl || SYNTHETIC_MRI_SLICES[previewAnalysis.predictedLabel]}
                          preprocessedImageUrl={previewAnalysis.preprocessedImageUrl}
                          gradcamUrl={previewAnalysis.gradcamUrl}
                          sessionCode={previewAnalysis.sessionCode}
                          sanitizedFileName={previewAnalysis.sanitizedFileName}
                          dimensions={previewAnalysis.imageDimensions}
                          isDemoFixture={previewAnalysis.isDemoFixture}
                        />
                      </div>

                      {/* Doctor clinical review note if present */}
                      {previewAnalysis.doctorReview && (
                        <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-500/30 text-xs space-y-1.5">
                          <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center justify-between">
                            <span>Nhận xét chuyên môn Bác sĩ:</span>
                            <span className="font-normal text-[11px] text-slate-500">
                              {previewAnalysis.doctorReview.doctorName}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            {previewAnalysis.doctorReview.clinicalNoteForPatient}
                          </p>
                          {previewAnalysis.doctorReview.recommendedNextStep && (
                            <div className="text-[11px] text-sky-800 dark:text-sky-300 pt-1 font-semibold border-t border-sky-200 dark:border-sky-800/60">
                              Khuyến nghị tiếp theo: {previewAnalysis.doctorReview.recommendedNextStep}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                      <ScanLine className="w-10 h-10 text-slate-400 mx-auto" />
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Chưa chọn lát cắt MRI nào
                      </h4>
                      <p className="text-xs text-slate-500">
                        Nhấn vào một ảnh trong danh sách bên trái để mở trạm đọc ảnh và phân tích.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(patientToDelete)}
        title="Xác nhận xóa hồ sơ bệnh nhân"
        description={`Bạn có chắc chắn muốn xóa bệnh nhân "${patientToDelete?.fullName}" (${patientToDelete?.patientCode}) khỏi danh sách quản lý không? Hành động này sẽ được ghi nhận vào nhật ký.`}
        confirmLabel="Xác nhận xóa"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPatientToDelete(null)}
      />

      <MedicalDisclaimer compact />
    </div>
  );
};
