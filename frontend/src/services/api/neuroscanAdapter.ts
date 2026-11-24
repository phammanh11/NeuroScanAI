import { API_ENDPOINTS, ENV_CONFIG } from '@/constants/apiEndpoints';
import {
  hasHttpAuthToken,
  httpClient,
  setCookieAuthActive,
  setHttpAuthToken,
} from '@/services/api/httpClient';
import { mockStore } from '@/services/mock/mockStore';

export const GUEST_OWNER_ID = 'guest-session';
import { runMriOnnxInference } from '@/services/ai/mriInferenceService';
import type {
  AuthSession,
  ChatMessageRecord,
  ChatSessionRecord,
  CreateAnalysisPayload,
  CreatePatientPayload,
  KnowledgeArticle,
  MRIAnalysisRecord,
  PatientRecord,
  RequestDoctorReviewPayload,
  SubmitDoctorReviewPayload,
  UpdatePatientPayload,
  UserProfile,
  UserRole,
} from '@/types/domain';

interface ApiErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: { message?: string };
    };
  };
}

interface BackendPatientRow {
  id?: number | string;
  user_id?: number | string;
  full_name?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  medical_history?: string;
  symptoms_initial?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendPredictionRow {
  id?: number | string;
  scan_id?: number | string;
  patient_name?: string;
  label?: MRIAnalysisRecord['predictedLabel'];
  confidence?: number | string;
  probabilities?: string | MRIAnalysisRecord['probabilities'];
  model_version?: string;
  inference_time_ms?: number;
  created_at?: string;
  shared_with_doctor?: number | boolean;
  symptom_note?: string;
  shared_at?: string;
  preprocessed_image_url?: string | null;
  preprocessedImageUrl?: string | null;
  gradcam_url?: string | null;
  gradcamUrl?: string | null;
  scan?: {
    file_url?: string;
    r2_key?: string;
    file_key?: string;
    patient_id?: number | string;
    patient_name?: string;
    file_name?: string;
    file_size?: number;
    findings_summary?: string;
    notes?: string;
  };
  review?: {
    id?: number | string;
    doctor_id?: number | string;
    doctor_name?: string;
    confirmed_label?: MRIAnalysisRecord['predictedLabel'];
    ai_assessment?: NonNullable<MRIAnalysisRecord['doctorReview']>['aiAssessment'];
    note?: string;
    doctor_note?: string;
    recommended_step?: string;
    created_at?: string;
  } | null;
}

interface BackendChatSource {
  organization?: string;
  source?: string;
  title?: string;
  name?: string;
  url?: string;
  lastVerified?: string;
}

interface BackendChatMessageRow {
  id?: number | string;
  sender?: string;
  content?: string;
  created_at?: string;
  is_emergency?: number | boolean;
  sources_json?: string | Record<string, unknown> | BackendChatSource[] | null;
}

export interface BackendFaqDoc {
  id: number;
  title: string;
  content: string;
  source: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminDoctorRecord {
  id: number;
  email: string;
  fullName: string;
  role: 'doctor' | 'admin';
  isActive: boolean;
  specialty: string;
  licenseNo: string;
  organization: string;
  phone: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actor_user_id: number | null;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface TelemetryErrorRecord {
  id: number;
  source: string;
  level: string;
  message: string;
  stack: string;
  route: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
}

function asApiError(err: unknown): ApiErrorLike {
  if (typeof err === 'object' && err !== null) {
    return err as ApiErrorLike;
  }
  return { message: String(err) };
}

function mapBackendPatientToRecord(p: BackendPatientRow): PatientRecord {
  const birthYear = p.date_of_birth ? new Date(p.date_of_birth).getFullYear() : 1985;
  const age = new Date().getFullYear() - birthYear;
  return {
    id: String(p.id || p.user_id),
    patientCode: `BN-2026-${String(p.id || p.user_id).padStart(3, '0')}`,
    fullName: p.full_name || 'Bệnh nhân',
    gender: p.gender || 'Nam',
    dateOfBirth: p.date_of_birth || '1985-01-01',
    age: isNaN(age) || age <= 0 ? 38 : age,
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    medicalHistory: p.medical_history || '',
    symptomsInitial: p.symptoms_initial || '',
    assignedDoctorId: '1',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
    linkedUserId: String(p.id || p.user_id),
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.updated_at || new Date().toISOString(),
  };
}

function mapPredictionToAnalysisRecord(item: BackendPredictionRow, owner?: UserProfile): MRIAnalysisRecord {
  const scan = item.scan || {};
  const review = item.review;
  const predId = String(item.id || item.scan_id || Date.now());
  const scanCode = `NS-2026-${String(predId).padStart(4, '0')}`;
  let fileUrl = scan.file_url || '';
  if (fileUrl.startsWith('/api/files/sample_scans/')) {
    fileUrl = fileUrl.replace('/api/files/sample_scans/', '/sample_scans/');
  }
  if (!fileUrl && scan.r2_key) {
    fileUrl = scan.r2_key.startsWith('sample_scans') ? `/${scan.r2_key}` : `/api/files/${scan.r2_key}`;
  } else if (!fileUrl && scan.file_key) {
    fileUrl = scan.file_key.startsWith('sample_scans') ? `/${scan.file_key}` : `/api/files/${scan.file_key}`;
  }
  if (!fileUrl) {
    fileUrl = '/sample_scans/sample_glioma_axial.jpg';
  }

  let probObj: MRIAnalysisRecord['probabilities'] = null;
  if (typeof item.probabilities === 'string') {
    try {
      probObj = JSON.parse(item.probabilities) as MRIAnalysisRecord['probabilities'];
    } catch {
      probObj = null;
    }
  } else if (item.probabilities) {
    probObj = item.probabilities;
  }

  const role = owner?.role === 'DOCTOR' || owner?.role === 'doctor' ? 'DOCTOR' : 'USER';

  return {
    id: predId,
    sessionCode: scanCode,
    ownerUserId: owner?.id || String(scan.patient_id || '2'),
    ownerDisplayCode: owner?.fullName || scan.patient_name || item.patient_name || 'Bệnh nhân',
    uploadedByRole: role,
    patientId: scan.patient_id ? String(scan.patient_id) : undefined,
    uploadedDoctorId: review?.doctor_id ? String(review.doctor_id) : '1',
    uploadedDoctorName: review?.doctor_name || 'BS.CKII Trần Quốc Bảo',
    sanitizedFileName: scan.file_name || 'mri_scan.png',
    fileFormat: scan.file_name?.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG',
    fileSizeBytes: scan.file_size || 250000,
    imageDimensions: { width: 512, height: 512 },
    createdAt: item.created_at || new Date().toISOString(),
    isDemoFixture: false,
    imageUrl: fileUrl,
    preprocessedImageUrl: item.preprocessed_image_url || item.preprocessedImageUrl || null,
    gradcamUrl: item.gradcam_url || item.gradcamUrl || null,
    predictedLabel: item.label || 'No Tumor',
    confidenceScore: item.confidence ? Number(item.confidence) : 0.9,
    probabilities: probObj,
    modelMetadata: {
      modelVersion: item.model_version || 'brain_mri_student_v1_onnx',
      pipelineMode: 'BACKEND_INFERENCE',
      preprocessingApplied: ['Cloudflare R2 Object Storage', 'ONNX Runtime Student Inference (256x256)', 'Cloudflare D1 Persistence'],
      inferenceTimeMs: item.inference_time_ms || 42,
    },
    patientSharedConsent: item.shared_with_doctor !== undefined ? Boolean(item.shared_with_doctor) : true,
    patientSymptomNote:
      item.symptom_note ||
      scan.findings_summary ||
      scan.notes ||
      'Triệu chứng lâm sàng và ảnh chụp MRI đã được đồng bộ trên hệ thống Cloudflare D1 & R2.',
    sharedWithDoctorAt: item.shared_at || item.created_at || new Date().toISOString(),
    reviewStatus: review ? 'REVIEWED' : 'PENDING_REVIEW',
    assignedDoctorId: String(review?.doctor_id || '1'),
    assignedDoctorName: review?.doctor_name || 'BS.CKII Trần Quốc Bảo',
    doctorReview: review
      ? {
          reviewId: `rev-${review.id || predId}`,
          doctorId: String(review.doctor_id || '1'),
          doctorName: review.doctor_name || 'BS.CKII Trần Quốc Bảo',
          doctorSpecialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
          confirmedLabel: review.confirmed_label,
          status: 'REVIEWED',
          aiAssessment: review.ai_assessment || 'CONCORDANT',
          clinicalNoteForPatient: review.note || review.doctor_note || '',
          recommendedNextStep: review.recommended_step || 'Theo dõi định kỳ hoặc chụp thêm chuỗi xung theo chỉ định',
          updatedAt: review.created_at || new Date().toISOString(),
        }
      : undefined,
  };
}

interface BackendUserRow {
  id: number | string;
  email: string;
  full_name: string;
  role: string;
  specialty?: string;
  organization?: string;
  phone?: string;
  avatar_url?: string;
  preferences_json?: string;
  created_at?: string;
}

function mapBackendUserToProfile(u: BackendUserRow, fallbackRole?: UserRole): UserProfile {
  const mappedRole: UserRole =
    u.role === 'doctor' || u.role === 'DOCTOR'
      ? 'DOCTOR'
      : u.role === 'admin' || u.role === 'ADMIN'
        ? 'ADMIN'
        : fallbackRole || 'USER';

  const defaultPreferences = {
    emailNotifications: true,
    doctorReviewAlerts: true,
    saveHistoryConsent: true,
    anonymizeExports: true,
  };

  let parsedPreferences = defaultPreferences;
  if (u.preferences_json) {
    try {
      const parsed = JSON.parse(u.preferences_json) as Partial<UserProfile['preferences']>;
      if (parsed && typeof parsed === 'object') {
        parsedPreferences = {
          emailNotifications: parsed.emailNotifications ?? true,
          doctorReviewAlerts: parsed.doctorReviewAlerts ?? true,
          saveHistoryConsent: parsed.saveHistoryConsent ?? true,
          anonymizeExports: parsed.anonymizeExports ?? true,
        };
      }
    } catch {
      parsedPreferences = defaultPreferences;
    }
  }

  return {
    id: String(u.id),
    email: u.email,
    fullName: u.full_name,
    role: mappedRole,
    specialty: u.specialty,
    organizationOrUnit: u.organization || '',
    phone: u.phone || '',
    avatarUrl: u.avatar_url || undefined,
    isDemoAccount: false,
    joinedAt: u.created_at || new Date().toISOString(),
    preferences: parsedPreferences,
  };
}

export const neuroscanAdapter = {
  isMockMode(): boolean {
    return ENV_CONFIG.MOCK_MODE;
  },

  setControlledErrorSimulation(enabled: boolean) {
    mockStore.setSimulateError(enabled);
  },

  getControlledErrorSimulation(): boolean {
    return mockStore.getSimulateError();
  },

  // Khôi phục phiên đăng nhập từ HttpOnly Cookie (GET /api/auth/me) khi người dùng F5 / tải lại trang
  async restoreSession(): Promise<AuthSession | null> {
    if (ENV_CONFIG.MOCK_MODE) {
      return null;
    }
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.AUTH.ME);
      if (data?.success && data?.data?.user) {
        const u = data.data.user as BackendUserRow;
        setCookieAuthActive(true);

        const authSession: AuthSession = {
          user: mapBackendUserToProfile(u),
          accessTokenDemo: '',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        mockStore.setCurrentSession(authSession);
        return authSession;
      }
    } catch {
      setCookieAuthActive(false);
    }
    return null;
  },

  async loginWithEmailPassword(
    email: string,
    password: string,
    preferredRole?: UserRole
  ): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(250);
      const session = preferredRole
        ? mockStore.loginWithRole(preferredRole === 'DOCTOR' || preferredRole === 'doctor' ? 'DOCTOR' : 'USER')
        : mockStore.loginWithCredentials(cleanEmail);
      setHttpAuthToken(session.accessTokenDemo);
      return session;
    }

    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: cleanEmail,
        password,
      });

      if (data?.success && data?.data) {
        const u = data.data.user as BackendUserRow;
        const token = data.data.token;
        setHttpAuthToken(token);

        const authSession: AuthSession = {
          user: mapBackendUserToProfile(u),
          accessTokenDemo: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        mockStore.setCurrentSession(authSession);
        return authSession;
      }
      throw new Error(data?.error?.message || data?.message || 'Đăng nhập không thành công.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;
      throw new Error(serverMsg || 'Không thể kết nối máy chủ xác thực. Vui lòng thử lại.');
    }
  },

  async registerUser(
    fullName: string,
    email: string,
    password: string,
    role: UserRole = 'USER'
  ): Promise<AuthSession> {
    void role;
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.REGISTER, {
        fullName,
        email,
        password,
        role: 'patient',
      });

      if (data?.success && data?.data) {
        const u = data.data.user as BackendUserRow;
        const token = data.data.token;
        setHttpAuthToken(token);

        const authSession: AuthSession = {
          user: mapBackendUserToProfile(u),
          accessTokenDemo: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        mockStore.setCurrentSession(authSession);
        return authSession;
      }
      throw new Error(data?.error?.message || data?.message || 'Đăng ký tài khoản không thành công.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;
      throw new Error(serverMsg || 'Không thể kết nối máy chủ đăng ký. Vui lòng thử lại.');
    }
  },

  async requestPasswordReset(
    email: string
  ): Promise<{ message: string; devResetCode?: string; emailDelivered?: boolean; notice?: string }> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.trim().toLowerCase(),
      });
      return {
        message:
          data?.message ||
          'Nếu địa chỉ email tồn tại trên hệ thống, mã xác nhận đặt lại mật khẩu đã được gửi.',
        devResetCode: data?.data?.devResetCode,
        emailDelivered: data?.data?.emailDelivered,
        notice: data?.data?.notice,
      };
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Không thể gửi yêu cầu khôi phục mật khẩu.'
      );
    }
  },

  async confirmPasswordReset(
    email: string,
    resetCode: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: email.trim().toLowerCase(),
        resetCode,
        newPassword,
      });
      if (data?.success) {
        return { message: data?.message || 'Đặt lại mật khẩu thành công.' };
      }
      throw new Error(data?.error?.message || 'Không thể đặt lại mật khẩu.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Mã xác nhận không hợp lệ hoặc đã hết hạn.'
      );
    }
  },

  async getAdminDoctors(): Promise<AdminDoctorRecord[]> {
    const { data } = await httpClient.get(API_ENDPOINTS.ADMIN.DOCTORS);
    if (data?.success && Array.isArray(data?.data?.doctors)) {
      return data.data.doctors as AdminDoctorRecord[];
    }
    throw new Error(data?.error?.message || 'Không thể tải danh sách tài khoản Bác sĩ.');
  },

  async createDoctorAccount(payload: {
    fullName: string;
    email: string;
    password: string;
    licenseNo: string;
    specialty?: string;
    organization?: string;
    phone?: string;
  }): Promise<AdminDoctorRecord> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.ADMIN.DOCTORS, payload);
      if (data?.success && data?.data?.doctor) {
        return data.data.doctor as AdminDoctorRecord;
      }
      throw new Error(data?.error?.message || 'Không thể tạo tài khoản Bác sĩ.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi cấp tài khoản Bác sĩ.'
      );
    }
  },

  async toggleDoctorAccountStatus(id: number, isActive: boolean): Promise<boolean> {
    try {
      const { data } = await httpClient.patch(API_ENDPOINTS.ADMIN.DOCTOR_STATUS(id), { isActive });
      return Boolean(data?.success);
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Không thể cập nhật trạng thái tài khoản.'
      );
    }
  },

  async getAuditLogs(): Promise<AuditLogRecord[]> {
    const { data } = await httpClient.get(API_ENDPOINTS.ADMIN.AUDIT_LOGS);
    if (data?.success && Array.isArray(data?.data?.logs)) {
      return data.data.logs as AuditLogRecord[];
    }
    throw new Error(data?.error?.message || 'Không thể tải Nhật ký Kiểm toán.');
  },

  async getTelemetryErrors(): Promise<TelemetryErrorRecord[]> {
    const { data } = await httpClient.get(API_ENDPOINTS.ADMIN.TELEMETRY);
    if (data?.success && Array.isArray(data?.data?.errors)) {
      return data.data.errors as TelemetryErrorRecord[];
    }
    throw new Error(data?.error?.message || 'Không thể tải Nhật ký Giám sát lỗi.');
  },

  async triggerRagIndex(): Promise<string> {
    const { data } = await httpClient.post(API_ENDPOINTS.RAG.INDEX);
    return data?.message || 'Đã đồng bộ tri thức RAG thành công.';
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Ignore network errors during logout cleanup
    }
    setCookieAuthActive(false);
    setHttpAuthToken(null);
    mockStore.logout();
  },

  // ==========================================
  // PATIENT MANAGEMENT
  // ==========================================

  async getDoctorPatients(doctorId: string): Promise<PatientRecord[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.PATIENTS.LIST);
      if (data?.success && Array.isArray(data?.data?.patients) && data.data.patients.length > 0) {
        return data.data.patients.map(mapBackendPatientToRecord);
      }
    } catch {
      // Fallback to local store when API is unreachable
    }
    return mockStore.getDoctorPatients(doctorId || 'usr-doc-01');
  },

  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.PATIENTS.DETAIL(patientId));
      if (data?.success && data?.data?.patient) {
        return mapBackendPatientToRecord(data.data.patient);
      }
    } catch {
      // Fallback to local store when API is unreachable
    }
    return mockStore.getPatientById(patientId);
  },

  async createPatient(payload: CreatePatientPayload, doctor: UserProfile): Promise<PatientRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      return mockStore.createPatient(payload, doctor);
    }
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.PATIENTS.CREATE, {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        address: payload.address,
        medicalHistory: payload.medicalHistory,
      });
      if (data?.success && data?.data?.patient) {
        return mapBackendPatientToRecord(data.data.patient);
      }
      throw new Error(data?.error?.message || 'Không thể tạo hồ sơ bệnh nhân.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi lưu hồ sơ bệnh nhân lên máy chủ.'
      );
    }
  },

  async updatePatient(payload: UpdatePatientPayload): Promise<PatientRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      return mockStore.updatePatient(payload);
    }
    try {
      const { data } = await httpClient.put(API_ENDPOINTS.PATIENTS.UPDATE(payload.id), {
        fullName: payload.fullName,
        phone: payload.phone,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        address: payload.address,
        medicalHistory: payload.medicalHistory,
      });
      if (data?.success && data?.data?.patient) {
        return mapBackendPatientToRecord(data.data.patient);
      }
      throw new Error(data?.error?.message || 'Không thể cập nhật hồ sơ bệnh nhân.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi cập nhật hồ sơ bệnh nhân.'
      );
    }
  },

  async deletePatient(patientId: string): Promise<boolean> {
    if (ENV_CONFIG.MOCK_MODE) {
      return mockStore.deletePatient(patientId);
    }
    try {
      const { data } = await httpClient.delete(API_ENDPOINTS.PATIENTS.DELETE(patientId));
      if (data?.success) {
        mockStore.deletePatient(patientId);
        return true;
      }
      throw new Error(data?.error?.message || 'Không thể xóa hồ sơ bệnh nhân.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi xóa hồ sơ bệnh nhân.'
      );
    }
  },

  async getPatientAnalyses(patientId: string): Promise<MRIAnalysisRecord[]> {
    const all = await this.getUserAnalyses(patientId);
    const cleanId = String(patientId).replace(/^pt-|^usr-user-0|^usr-user-/, '');
    const filtered = all.filter(
      (a) =>
        a.patientId === patientId ||
        a.ownerUserId === patientId ||
        (cleanId && (a.patientId === cleanId || a.ownerUserId === cleanId))
    );
    return filtered;
  },

  // ==========================================
  // MRI UPLOADS & ONNX PREDICTIONS (CLOUDFLARE R2 & D1)
  // ==========================================

  async getUserAnalyses(userId?: string): Promise<MRIAnalysisRecord[]> {
    // Khách chưa đăng nhập chỉ xem được phiên tạm trong bộ nhớ trình duyệt, tuyệt đối không lấy dữ liệu tài khoản khác từ backend
    if (!hasHttpAuthToken() || !userId || userId === GUEST_OWNER_ID) {
      return mockStore.getUserAnalyses(GUEST_OWNER_ID);
    }

    try {
      const { data } = await httpClient.get(API_ENDPOINTS.MRI.PREDICTIONS);
      if (data?.success && Array.isArray(data?.data?.predictions)) {
        return data.data.predictions.map((p: BackendPredictionRow) => mapPredictionToAnalysisRecord(p));
      }
    } catch {
      // Fallback to local store when API is unreachable
    }

    return mockStore.getUserAnalyses(userId);
  },

  async getAnalysisById(id: string): Promise<MRIAnalysisRecord> {
    if (hasHttpAuthToken()) {
      try {
        const { data } = await httpClient.get(API_ENDPOINTS.MRI.PREDICTION_DETAIL(id));
        if (data?.success && data?.data?.prediction) {
          return mapPredictionToAnalysisRecord(data.data.prediction);
        }
      } catch {
        // Fallback to local store when API is unreachable
      }
    }

    const found = mockStore.getAnalysisById(id);
    if (found && (hasHttpAuthToken() || found.ownerUserId === GUEST_OWNER_ID || found.isDemoFixture)) {
      return found;
    }
    throw new Error(`Không tìm thấy phiên phân tích MRI mã ${id}`);
  },

  // Tải file trực tiếp lên Cloudflare R2 và chạy suy luận mô hình ONNX (chỉ đồng bộ server khi đã đăng nhập)
  async createAnalysis(
    payload: CreateAnalysisPayload,
    owner: UserProfile,
    previewObjectUrl: string,
    signal?: AbortSignal
  ): Promise<MRIAnalysisRecord> {
    // 1. Chạy suy luận mô hình ONNX student thật (256x256, 4 lớp) trực tiếp trên trình duyệt
    const aiResult = await runMriOnnxInference(payload.file, payload.file.name);

    const canSyncToCloud =
      hasHttpAuthToken() && !owner.isDemoAccount && owner.id !== GUEST_OWNER_ID;

    // Khách chưa đăng nhập: chỉ chạy ONNX cục bộ, KHÔNG tải lên R2/D1 và KHÔNG gửi sang hàng đợi Bác sĩ
    if (!canSyncToCloud) {
      return mockStore.createMockAnalysis(payload, owner, previewObjectUrl, aiResult);
    }

    try {
      // 2. Tải ảnh lên Cloudflare R2 Bucket qua endpoint POST /api/scans
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('sliceType', 'Axial (Trục ngang)');
      formData.append('sequenceType', 'T1-Gd (Contrast)');
      if (payload.targetPatientId && (owner.role === 'DOCTOR' || owner.role === 'ADMIN')) {
        formData.append('patientId', String(payload.targetPatientId));
      }

      const uploadRes = await httpClient.post(API_ENDPOINTS.MRI.UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
      });

      const scan = uploadRes.data?.data?.scan;
      if (!scan?.id) throw new Error('Không thể tải ảnh lên Cloudflare R2');

      // 3. Ghi bản ghi dự đoán vào bảng predictions của D1 qua POST /api/predict
      //    (kèm ảnh tiền xử lý ROI/CLAHE & bản đồ nhiệt Grad-CAM để lưu lên R2)
      const predictRes = await httpClient.post(API_ENDPOINTS.MRI.PREDICT, {
        scan_id: scan.id,
        label: aiResult.label,
        confidence: aiResult.confidence,
        probabilities: aiResult.probabilities,
        model_version: aiResult.modelVersion,
        inference_time_ms: aiResult.inferenceTimeMs,
        preprocessed_image_url: aiResult.preprocessedImageUrl || null,
        gradcam_url: aiResult.gradcamUrl || null,
      });

      if (predictRes.data?.data?.prediction) {
        const mapped = mapPredictionToAnalysisRecord(predictRes.data.data.prediction, owner);
        if (!mapped.gradcamUrl && aiResult?.gradcamUrl) {
          mapped.gradcamUrl = aiResult.gradcamUrl;
        }
        if (!mapped.preprocessedImageUrl && aiResult?.preprocessedImageUrl) {
          mapped.preprocessedImageUrl = aiResult.preprocessedImageUrl;
        }
        if (aiResult?.qualityWarning) {
          mapped.modelMetadata.qualityWarning = aiResult.qualityWarning;
        }
        return mapped;
      }
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error(
          err.response?.data?.error?.message ||
            'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
        );
      }
      console.warn('[Real AI Pipeline Warning, continuing with client ONNX inference]:', err.message);
    }

    // Client ONNX execution fallback (khi chạy local không có Cloudflare Worker)
    return mockStore.createMockAnalysis(payload, owner, previewObjectUrl, aiResult);
  },

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    if (hasHttpAuthToken() && userId !== GUEST_OWNER_ID) {
      try {
        await httpClient.delete(`/predictions/${id}`);
      } catch {
        // Continue deleting from local cache even if backend request failed
      }
    }
    mockStore.deleteAnalysis(id, userId);
  },

  async clearAllUserAnalyses(userId: string): Promise<number> {
    return mockStore.clearAllUserAnalyses(userId);
  },

  async requestDoctorReview(payload: RequestDoctorReviewPayload): Promise<MRIAnalysisRecord> {
    if (!hasHttpAuthToken()) {
      throw new Error('Vui lòng đăng nhập tài khoản để gửi yêu cầu Bác sĩ xem xét.');
    }
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.MRI.REQUEST_REVIEW(payload.analysisId), {
        consentToShareWithDoctor: payload.consentToShareWithDoctor,
        patientSymptomNote: payload.patientSymptomNote,
      });
      if (data?.success) {
        return this.getAnalysisById(payload.analysisId);
      }
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 400) {
        throw new Error(
          err.response?.data?.error?.message ||
            'Không thể gửi yêu cầu Bác sĩ xem xét. Vui lòng thử lại.',
        );
      }
      console.warn('[Request Review API Warning]:', err.message);
    }
    return mockStore.requestDoctorReview(payload);
  },

  async getDoctorCases(doctorId?: string): Promise<MRIAnalysisRecord[]> {
    if (hasHttpAuthToken()) {
      try {
        const { data } = await httpClient.get(API_ENDPOINTS.MRI.PREDICTIONS);
        if (data?.success && Array.isArray(data?.data?.predictions)) {
          return data.data.predictions.map((p: BackendPredictionRow) => mapPredictionToAnalysisRecord(p));
        }
      } catch {
        // Fallback to local store when API is unreachable
      }
    }

    return mockStore.getDoctorAssignedCases(doctorId || '1');
  },

  // Bác sĩ lưu ý kiến chuyên môn và xác nhận / hiệu chỉnh nhãn u não (UC02, FR05)
  async submitDoctorReview(
    payload: SubmitDoctorReviewPayload,
    doctor: UserProfile
  ): Promise<MRIAnalysisRecord> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.MRI.REVIEW, {
        prediction_id: Number(payload.analysisId),
        confirmed_label: payload.confirmedLabel || 'Glioma',
        note: payload.clinicalNoteForPatient,
        ai_assessment: payload.aiAssessment,
        recommended_step: payload.recommendedNextStep,
      });

      if (data?.success) {
        return this.getAnalysisById(payload.analysisId);
      }
      throw new Error(data?.error?.message || 'Không thể lưu đánh giá chuyên môn.');
    } catch (rawErr: unknown) {
      if (ENV_CONFIG.MOCK_MODE) {
        return mockStore.submitDoctorReview(payload, doctor);
      }
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi gửi nhận xét chuyên môn lên máy chủ.'
      );
    }
  },

  // ==========================================
  // MEDICAL RAG CHATBOT (WORKERS AI + D1)
  // ==========================================

  async getChatSessions(userId: string): Promise<ChatSessionRecord[]> {
    const parseBackendMsg = (m: BackendChatMessageRow, sessId: string): ChatMessageRecord => {
      let parsedMeta: Record<string, unknown> | BackendChatSource[] | null = null;
      if (m.sources_json) {
        try {
          parsedMeta =
            typeof m.sources_json === 'string'
              ? (JSON.parse(m.sources_json) as Record<string, unknown> | BackendChatSource[])
              : m.sources_json;
        } catch {
          parsedMeta = null;
        }
      }

      const metaObj = parsedMeta && !Array.isArray(parsedMeta) ? parsedMeta : null;
      const rawSources: BackendChatSource[] = Array.isArray(parsedMeta)
        ? parsedMeta
        : Array.isArray(metaObj?.sources)
          ? (metaObj.sources as BackendChatSource[])
          : [];

      const sources = rawSources.map((s) => ({
        organization: s.organization || s.source || 'WHO CNS5 / ACR Guidelines',
        title: s.title || s.name || 'Tài liệu Y khoa NeuroScan',
        url: s.url || 'https://radiopaedia.org',
        lastVerified: s.lastVerified || '2026-04-01',
        reviewStatus: 'verified' as const,
      }));

      return {
        id: String(m.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        sessionId: sessId,
        sender: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content || '',
        createdAt: m.created_at || new Date().toISOString(),
        urgency:
          (metaObj?.urgency as ChatMessageRecord['urgency']) ||
          (m.is_emergency ? 'emergency' : 'informational'),
        sources: sources.length > 0 ? sources : undefined,
        ragTrace: (metaObj?.ragTrace as ChatMessageRecord['ragTrace']) || undefined,
        matchedScans: Array.isArray(metaObj?.matchedScans)
          ? (metaObj.matchedScans as ChatMessageRecord['matchedScans'])
          : undefined,
        suggestions: Array.isArray(metaObj?.suggestions)
          ? (metaObj.suggestions as string[])
          : undefined,
        isOutOfScope: false,
        isDemoIllustration: false,
      };
    };

    // Khách chưa đăng nhập chỉ dùng phiên chat cục bộ trên trình duyệt, không truy xuất lịch sử D1 của tài khoản khác
    if (!hasHttpAuthToken() || !userId || userId === GUEST_OWNER_ID) {
      return mockStore.getChatSessions(GUEST_OWNER_ID);
    }

    try {
      const { data } = await httpClient.get(API_ENDPOINTS.CHAT.SESSIONS);
      if (data?.success && Array.isArray(data?.data?.sessions) && data.data.sessions.length > 0) {
        const mappedSessions: ChatSessionRecord[] = [];
        for (const s of data.data.sessions) {
          const sessId = String(s.id);
          let rawMsgs: BackendChatMessageRow[] = Array.isArray(s.messages) ? s.messages : [];
          if (rawMsgs.length === 0) {
            try {
              const histRes = await httpClient.get(`${API_ENDPOINTS.CHAT.HISTORY}?sessionId=${s.id}`);
              if (histRes.data?.success && Array.isArray(histRes.data?.data?.messages)) {
                rawMsgs = histRes.data.data.messages;
              }
            } catch {
              // Keep empty messages list if history endpoint fails
            }
          }

          const messages: ChatMessageRecord[] =
            rawMsgs.length > 0
              ? rawMsgs.map((m) => parseBackendMsg(m, sessId))
              : [
                  {
                    id: `msg-welcome-${sessId}`,
                    sessionId: sessId,
                    sender: 'assistant',
                    createdAt: s.created_at || new Date().toISOString(),
                    urgency: 'informational',
                    content:
                      'Xin chào! Tôi là **Trợ lý AI Y tế Thần kinh — NeuroScan Clinical Assistant** (vận hành trên kiến trúc **RAG Vector DB + Cloudflare Workers AI**).\n\n' +
                      'Tôi có thể hỗ trợ bạn:\n' +
                      '- **Giải thích 4 nhãn phân loại MRI:** *Glioma (U thần kinh đệm)*, *Meningioma (U màng não)*, *Pituitary (U tuyến yên)* và *No Tumor* theo tiêu chuẩn WHO CNS5.\n' +
                      '- **Giải thích kỹ thuật MRI & AI:** Ý nghĩa chuỗi xung *T1W, T2W, FLAIR, T1-Gd*, tiền xử lý *Otsu/CLAHE* và bản đồ nhiệt *Grad-CAM*.\n' +
                      '- **Tra cứu nhanh ca chụp MRI & Hồ sơ bệnh nhân:** Nhập mã ca (`NS-2026-0001`) hoặc mã bệnh nhân (`BN-2026-002`) ngay tại đây.',
                  },
                ];

          mappedSessions.push({
            id: sessId,
            ownerUserId: String(s.user_id || userId),
            title: s.title || 'Tư vấn Y khoa Thần kinh',
            createdAt: s.created_at || new Date().toISOString(),
            updatedAt: messages[messages.length - 1]?.createdAt || s.created_at || new Date().toISOString(),
            linkedAnalysisId: s.linked_prediction_id ? String(s.linked_prediction_id) : undefined,
            messages,
          });
        }

        return mappedSessions;
      }
    } catch {
      // Fallback to local store when API is unreachable
    }

    return mockStore.getChatSessions(userId);
  },

  async createChatSession(
    userId: string,
    linkedAnalysis?: MRIAnalysisRecord | null
  ): Promise<ChatSessionRecord> {
    if (!hasHttpAuthToken() || !userId || userId === GUEST_OWNER_ID) {
      return mockStore.createChatSession(GUEST_OWNER_ID, linkedAnalysis);
    }
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.CHAT.SESSIONS, {
        title: linkedAnalysis
          ? `Hỏi về ca ${linkedAnalysis.sessionCode} (${linkedAnalysis.predictedLabel})`
          : 'Hội thoại Y tế Mới',
        linked_prediction_id: linkedAnalysis?.id ? Number(linkedAnalysis.id) : null,
      });

      if (data?.success && data?.data?.session) {
        const s = data.data.session;
        const sessId = String(s.id);
        const welcomeContent = linkedAnalysis
          ? `Xin chào! Tôi đã sẵn sàng giải thích thông tin xoay quanh **Ca chụp ${linkedAnalysis.sessionCode}** (Nhãn dự đoán: **${linkedAnalysis.predictedLabel}**).\n\nBạn có thể hỏi về đặc điểm hình ảnh trên chuỗi xung T1/T2/FLAIR/T1-Gd, ý nghĩa vùng nhiệt Grad-CAM hoặc các bước chuẩn bị thăm khám chuyên khoa.`
          : 'Xin chào! Tôi là **Trợ lý AI Y tế Thần kinh — NeuroScan Clinical Assistant** (vận hành trên kiến trúc **RAG Vector DB + Cloudflare Workers AI**).\n\nTôi có thể hỗ trợ giải thích 4 nhãn phân loại u não (*Glioma, Meningioma, Pituitary, No Tumor*), ý nghĩa các chuỗi xung MRI, bản đồ nhiệt Grad-CAM hoặc tra cứu nhanh kết quả chụp MRI của bạn.';

        return {
          id: sessId,
          ownerUserId: String(s.user_id || userId),
          title: s.title,
          createdAt: s.created_at || new Date().toISOString(),
          updatedAt: s.created_at || new Date().toISOString(),
          linkedAnalysisId: s.linked_prediction_id ? String(s.linked_prediction_id) : linkedAnalysis?.id,
          linkedAnalysisSessionCode: linkedAnalysis?.sessionCode,
          linkedAnalysisLabel: linkedAnalysis?.predictedLabel,
          messages: [
            {
              id: `msg-welcome-${sessId}`,
              sessionId: sessId,
              sender: 'assistant',
              createdAt: s.created_at || new Date().toISOString(),
              urgency: 'informational',
              content: welcomeContent,
              linkedAnalysisId: linkedAnalysis?.id,
              linkedAnalysisLabel: linkedAnalysis?.predictedLabel,
            },
          ],
        };
      }
    } catch {
      // Fallback to local store when API is unreachable
    }

    return mockStore.createChatSession(userId, linkedAnalysis);
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    if (hasHttpAuthToken() && !isNaN(Number(sessionId))) {
      try {
        await httpClient.delete(`${API_ENDPOINTS.CHAT.SESSIONS}/${sessionId}`);
      } catch {
        // Ignore network errors while removing local session
      }
    }
    mockStore.deleteChatSession(sessionId);
  },

  // Gửi tin nhắn tới Medical RAG Chatbot
  async sendChatMessage(
    sessionId: string,
    questionText: string,
    historyMessages: ChatMessageRecord[] = []
  ): Promise<{ userMessage: ChatMessageRecord; assistantMessage: ChatMessageRecord }> {
    const userMsg: ChatMessageRecord = {
      id: `msg-u-${Date.now()}`,
      sessionId,
      sender: 'user',
      createdAt: new Date().toISOString(),
      content: questionText,
      urgency: 'informational',
    };

    const historyPayload = historyMessages.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      const { data } = await httpClient.post(API_ENDPOINTS.CHAT.SEND, {
        message: questionText,
        sessionId: isNaN(Number(sessionId)) ? 1 : Number(sessionId),
        history: historyPayload,
      });

      if (data?.success && data?.data) {
        const resp = data.data;
        const assistantMsg: ChatMessageRecord = {
          id: `msg-a-${Date.now()}`,
          sessionId,
          sender: 'assistant',
          createdAt: new Date().toISOString(),
          urgency: resp.urgency || (resp.isEmergency ? 'emergency' : 'informational'),
          content: resp.reply,
          sources: resp.sources?.map((s: BackendChatSource) => ({
            organization: s.organization || s.source || 'WHO CNS5 / ACR Guidelines',
            title: s.title || 'Tài liệu Y khoa NeuroScan',
            url: s.url || 'https://radiopaedia.org',
            lastVerified: '2026-04-01',
            reviewStatus: 'verified' as const,
          })),
          ragTrace: resp.ragTrace || resp.rag || undefined,
          matchedScans: Array.isArray(resp.matchedScans) ? resp.matchedScans : undefined,
          suggestions: Array.isArray(resp.suggestions) ? resp.suggestions : undefined,
          isOutOfScope: false,
          isDemoIllustration: false,
        };

        mockStore.appendCustomExchange(sessionId, userMsg, assistantMsg);
        return { userMessage: userMsg, assistantMessage: assistantMsg };
      }
      throw new Error(data?.message || 'Không thể nhận phản hồi từ Trợ lý AI Y tế');
    } catch {
      return mockStore.sendChatMessage(sessionId, questionText);
    }
  },

  async getKnowledgeArticles(includeUnpublished = false): Promise<KnowledgeArticle[]> {
    return mockStore.getKnowledgeArticles(includeUnpublished);
  },

  // Quản lý bộ câu hỏi đáp y tế cho Quản trị viên (FR08)
  async getFaqDocuments(): Promise<BackendFaqDoc[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.FAQ.LIST);
      if (data?.success && Array.isArray(data?.data?.documents)) {
        return data.data.documents as BackendFaqDoc[];
      }
    } catch {
      // Return empty list if FAQ endpoint is unreachable
    }
    return [];
  },

  async createFaqDocument(doc: {
    title: string;
    content: string;
    source: string;
    category: string;
  }): Promise<BackendFaqDoc | undefined> {
    const { data } = await httpClient.post(API_ENDPOINTS.FAQ.CREATE, doc);
    return data?.data?.document as BackendFaqDoc | undefined;
  },

  async updateFaqDocument(
    id: number | string,
    doc: Partial<{ title: string; content: string; source: string; category: string }>
  ): Promise<BackendFaqDoc | undefined> {
    const { data } = await httpClient.put(API_ENDPOINTS.FAQ.UPDATE(id), doc);
    return data?.data?.document as BackendFaqDoc | undefined;
  },

  async deleteFaqDocument(id: number | string): Promise<boolean> {
    const { data } = await httpClient.delete(API_ENDPOINTS.FAQ.DELETE(id));
    return !!data?.data?.deleted;
  },

  async updateUserProfile(
    userId: string,
    role: UserRole,
    patch: Partial<UserProfile>
  ): Promise<UserProfile> {
    if (ENV_CONFIG.MOCK_MODE || userId === GUEST_OWNER_ID) {
      return mockStore.updateProfile(userId, patch);
    }

    try {
      const { data } = await httpClient.put(API_ENDPOINTS.AUTH.PROFILE, {
        fullName: patch.fullName,
        email: patch.email,
        phone: patch.phone,
        organizationOrUnit: patch.organizationOrUnit,
        specialty: patch.specialty,
        avatarUrl: patch.avatarUrl,
        preferences: patch.preferences,
      });
      if (data?.success && data?.data?.user) {
        const mapped = mapBackendUserToProfile(data.data.user as BackendUserRow, role);
        mockStore.updateProfile(userId, mapped);
        return mapped;
      }
      throw new Error(data?.error?.message || 'Không thể lưu thay đổi hồ sơ lên máy chủ.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi lưu thông tin hồ sơ lên máy chủ.'
      );
    }
  },

  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<boolean> {
    if (ENV_CONFIG.MOCK_MODE || userId === GUEST_OWNER_ID) {
      return mockStore.changePassword(userId, currentPass, newPass);
    }

    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: currentPass,
        newPassword: newPass,
      });
      if (data?.success) {
        return true;
      }
      throw new Error(data?.error?.message || 'Đổi mật khẩu không thành công.');
    } catch (rawErr: unknown) {
      const err = asApiError(rawErr);
      throw new Error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Mật khẩu hiện tại không chính xác hoặc máy chủ gặp lỗi.'
      );
    }
  },
};
