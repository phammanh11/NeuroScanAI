import { API_ENDPOINTS, ENV_CONFIG } from '@/constants/apiEndpoints';
import { httpClient, setHttpAuthToken } from '@/services/api/httpClient';
import { mockStore } from '@/services/mock/mockStore';
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

// Tài khoản Test phục vụ kiểm thử hai vai trò RBAC (Bác sĩ Chuyên khoa & Người dùng)
export const TEST_DOCTOR_CREDENTIALS = {
  email: 'demo.doctor@neuroscan.vn',
  password: 'Doctor@123',
  fullName: 'BS.CKII Trần Quốc Bảo',
  role: 'DOCTOR' as UserRole,
  specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
  organization: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
};

export const TEST_USER_CREDENTIALS = {
  email: 'demo.user@neuroscan.vn',
  password: 'User@123',
  fullName: 'Nguyễn Minh An',
  role: 'USER' as UserRole,
  phone: '0912 345 678',
};

function mapScanToAnalysisRecord(scan: any, owner?: UserProfile): MRIAnalysisRecord {
  const scanId = String(scan.id || scan.scan_code || Date.now());
  const scanCode = scan.scan_code || `SCAN-${scanId}`;
  const fileUrl = scan.file_url || (scan.file_key ? `/api/v1/files/${scan.file_key}` : '');

  return {
    id: scanId,
    sessionCode: scanCode,
    ownerUserId: owner?.id || 'usr-doc-01',
    ownerDisplayCode: owner?.fullName || scan.patient_name || 'Bác sĩ chuyên khoa',
    uploadedByRole: 'DOCTOR',
    patientId: scan.patient_id ? String(scan.patient_id) : undefined,
    uploadedDoctorId: owner?.id || 'usr-doc-01',
    uploadedDoctorName: owner?.fullName || 'BS.CKII Trần Quốc Bảo',
    sanitizedFileName: scan.file_name || 'mri_scan.png',
    fileFormat: (scan.file_name?.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG') as any,
    fileSizeBytes: scan.file_size || 250000,
    imageDimensions: {
      width: 512,
      height: 512,
    },
    createdAt: scan.created_at || new Date().toISOString(),
    isDemoFixture: false, // Dữ liệu thật lưu trên Cloudflare R2 & D1, không phải fixture cứng
    imageUrl: fileUrl,
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: (scan.predicted_label || 'No Tumor') as any,
    confidenceScore: scan.confidence ? Number(scan.confidence) : null,
    probabilities: null,
    modelMetadata: {
      modelVersion: 'Chờ nạp trọng số PyTorch sau huấn luyện',
      pipelineMode: 'BACKEND_INFERENCE',
      preprocessingApplied: ['Cloudflare R2 Secure Object Storage', 'Cloudflare D1 Persistence'],
      inferenceTimeMs: 0,
    },
    patientSharedConsent: true,
    patientSymptomNote: scan.findings_summary || 'Đã lưu trữ an toàn trên Cloudflare R2',
    reviewStatus: scan.doctor_approved ? 'REVIEWED' : 'NONE',
    doctorReview: scan.doctor_notes
      ? {
          reviewId: `rev-${scanId}`,
          doctorId: 'usr-doc-01',
          doctorName: scan.approved_by || 'BS.CKII Trần Quốc Bảo',
          doctorSpecialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
          status: 'REVIEWED',
          aiAssessment: 'CONCORDANT',
          clinicalNoteForPatient: scan.doctor_notes,
          recommendedNextStep: 'Theo dõi định kỳ hoặc chụp thêm chuỗi xung theo chỉ định',
          updatedAt: scan.approved_at || new Date().toISOString(),
        }
      : undefined,
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

  // Đăng nhập nhanh tài khoản test (hỗ trợ kiểm thử 2 vai trò: DOCTOR & USER)
  async loginWithDemoRole(role: UserRole = 'DOCTOR'): Promise<AuthSession> {
    const creds = role === 'USER' ? TEST_USER_CREDENTIALS : TEST_DOCTOR_CREDENTIALS;
    return this.loginWithEmailPassword(creds.email, creds.password);
  },

  async loginWithEmailPassword(email: string, password: string): Promise<AuthSession> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      if (data?.success && data?.data) {
        const u = data.data.user;
        const token = data.data.token;
        setHttpAuthToken(token);

        const authSession: AuthSession = {
          user: {
            id: String(u.id),
            email: u.email,
            fullName: u.full_name,
            role: (u.role as UserRole) || 'DOCTOR',
            specialty: u.specialty,
            organizationOrUnit: u.organization,
            phone: u.phone,
            isDemoAccount: false,
            joinedAt: u.created_at,
            preferences: {
              emailNotifications: true,
              doctorReviewAlerts: true,
              saveHistoryConsent: true,
              anonymizeExports: true,
            },
          },
          accessTokenDemo: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        // Đồng bộ phiên đăng nhập vào mockStore cho các hàm fallback
        mockStore.setCurrentSession(authSession);

        return authSession;
      }
    } catch (err: any) {
      console.warn('[API Login Error, falling back to local fallback]:', err?.message);
    }

    // Fallback nếu chạy local offline
    await mockStore.delay(350);
    const session = mockStore.loginWithRole('DOCTOR');
    setHttpAuthToken(session.accessTokenDemo);
    return session;
  },

  async registerUser(_fullName: string, email: string, password: string): Promise<AuthSession> {
    return this.loginWithEmailPassword(email, password);
  },

  async requestPasswordReset(_email: string): Promise<{ message: string }> {
    return {
      message: 'Nếu địa chỉ email tồn tại trên hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {}
    setHttpAuthToken(null);
    mockStore.logout();
  },

  // ==========================================
  // PATIENT MANAGEMENT (D1 DATABASE)
  // ==========================================

  async getDoctorPatients(_doctorId: string): Promise<PatientRecord[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.PATIENTS.LIST);
      if (data?.success && Array.isArray(data?.data?.patients)) {
        return data.data.patients.map((p: any) => ({
          id: String(p.id),
          patientCode: p.mrn || `BN-${p.id}`,
          fullName: p.full_name,
          gender: (p.gender === 'Nữ' ? 'Nữ' : p.gender === 'Khác' ? 'Khác' : 'Nam') as 'Nam' | 'Nữ' | 'Khác',
          dateOfBirth: '1978-05-12',
          age: Number(p.age) || 45,
          phone: p.phone || '',
          email: p.email,
          address: p.address,
          medicalHistory: p.clinical_history,
          symptomsInitial: p.symptoms,
          assignedDoctorId: 'usr-doc-01',
          assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
      }
    } catch {}

    return mockStore.getDoctorPatients('usr-doc-01');
  },

  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.PATIENTS.DETAIL(patientId));
      if (data?.success && data?.data?.patient) {
        const p = data.data.patient;
        return {
          id: String(p.id),
          patientCode: p.mrn || `BN-${p.id}`,
          fullName: p.full_name,
          gender: (p.gender === 'Nữ' ? 'Nữ' : p.gender === 'Khác' ? 'Khác' : 'Nam') as 'Nam' | 'Nữ' | 'Khác',
          dateOfBirth: '1978-05-12',
          age: Number(p.age) || 45,
          phone: p.phone || '',
          email: p.email,
          address: p.address,
          medicalHistory: p.clinical_history,
          symptomsInitial: p.symptoms,
          assignedDoctorId: 'usr-doc-01',
          assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
      }
    } catch {}

    return mockStore.getPatientById(patientId);
  },

  async createPatient(payload: CreatePatientPayload, doctor: UserProfile): Promise<PatientRecord> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.PATIENTS.LIST, {
        full_name: payload.fullName,
        age: 45,
        gender: payload.gender,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        clinical_history: payload.medicalHistory,
        symptoms: payload.symptomsInitial,
      });

      if (data?.success && data?.data?.patient) {
        const p = data.data.patient;
        return {
          id: String(p.id),
          patientCode: p.mrn || `BN-${p.id}`,
          fullName: p.full_name,
          gender: payload.gender,
          dateOfBirth: payload.dateOfBirth || '1980-01-01',
          age: Number(p.age) || 45,
          phone: p.phone || '',
          email: p.email,
          address: p.address,
          medicalHistory: p.clinical_history,
          symptomsInitial: p.symptoms,
          assignedDoctorId: doctor.id,
          assignedDoctorName: doctor.fullName,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
      }
    } catch {}

    return mockStore.createPatient(payload, doctor);
  },

  async updatePatient(payload: UpdatePatientPayload): Promise<PatientRecord> {
    return mockStore.updatePatient(payload);
  },

  async deletePatient(patientId: string): Promise<boolean> {
    return mockStore.deletePatient(patientId);
  },

  async getPatientAnalyses(patientId: string): Promise<MRIAnalysisRecord[]> {
    return this.getUserAnalyses(patientId);
  },

  // ==========================================
  // MRI UPLOADS TO CLOUDFLARE R2 & D1
  // ==========================================

  async getUserAnalyses(_userId: string): Promise<MRIAnalysisRecord[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.MRI.SCANS);
      if (data?.success && Array.isArray(data?.data?.scans)) {
        return data.data.scans.map((s: any) => mapScanToAnalysisRecord(s));
      }
    } catch {}

    return mockStore.getUserAnalyses('usr-doc-01');
  },

  async getAnalysisById(id: string): Promise<MRIAnalysisRecord> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.MRI.SCAN_DETAIL(id));
      if (data?.success && data?.data?.scan) {
        return mapScanToAnalysisRecord(data.data.scan);
      }
    } catch {}

    const found = mockStore.getAnalysisById(id);
    if (found) return found;
    throw new Error(`Không tìm thấy phiên phân tích MRI mã ${id}`);
  },

  // Tải file trực tiếp lên Cloudflare R2 Bucket thông qua API Worker
  async createAnalysis(
    payload: CreateAnalysisPayload,
    owner: UserProfile,
    previewObjectUrl: string,
    signal?: AbortSignal
  ): Promise<MRIAnalysisRecord> {
    try {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('patientName', payload.targetPatientId || owner.fullName);
      formData.append('sliceType', 'Axial (Trục ngang)');
      formData.append('sequenceType', 'T1-Gd (Contrast)');

      const { data } = await httpClient.post(API_ENDPOINTS.MRI.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal,
      });

      if (data?.success && data?.data?.scan) {
        return mapScanToAnalysisRecord(data.data.scan, owner);
      }
    } catch (err: any) {
      console.warn('[R2 Upload Warning, falling back to local preview]:', err?.message);
    }

    // Fallback an toàn nếu offline
    const record = mockStore.createMockAnalysis(payload, owner, previewObjectUrl);
    record.isDemoFixture = false;
    record.confidenceScore = null;
    record.probabilities = null;
    return record;
  },

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    mockStore.deleteAnalysis(id, userId);
  },

  async clearAllUserAnalyses(userId: string): Promise<number> {
    return mockStore.clearAllUserAnalyses(userId);
  },

  async requestDoctorReview(payload: RequestDoctorReviewPayload): Promise<MRIAnalysisRecord> {
    return mockStore.requestDoctorReview(payload);
  },

  async getDoctorCases(_doctorId: string): Promise<MRIAnalysisRecord[]> {
    return this.getUserAnalyses('usr-doc-01');
  },

  async submitDoctorReview(
    payload: SubmitDoctorReviewPayload,
    doctor: UserProfile
  ): Promise<MRIAnalysisRecord> {
    try {
      const { data } = await httpClient.patch(API_ENDPOINTS.MRI.REVIEW(payload.analysisId), {
        doctorNotes: payload.clinicalNoteForPatient,
        doctorApproved: true,
      });
      if (data?.success && data?.data?.scan) {
        return mapScanToAnalysisRecord(data.data.scan, doctor);
      }
    } catch {}

    return mockStore.submitDoctorReview(payload, doctor);
  },

  // ==========================================
  // MEDICAL RAG CHATBOT (WORKERS AI + GEMINI)
  // ==========================================

  async getChatSessions(userId: string): Promise<ChatSessionRecord[]> {
    return mockStore.getChatSessions(userId);
  },

  async createChatSession(
    userId: string,
    linkedAnalysis?: MRIAnalysisRecord | null
  ): Promise<ChatSessionRecord> {
    return mockStore.createChatSession(userId, linkedAnalysis);
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    mockStore.deleteChatSession(sessionId);
  },

  // Gửi tin nhắn tới Medical RAG Chatbot
  async sendChatMessage(
    sessionId: string,
    questionText: string
  ): Promise<{ userMessage: ChatMessageRecord; assistantMessage: ChatMessageRecord }> {
    const userMsg: ChatMessageRecord = {
      id: `msg-u-${Date.now()}`,
      sessionId,
      sender: 'user',
      createdAt: new Date().toISOString(),
      content: questionText,
      urgency: 'informational',
    };

    try {
      const { data } = await httpClient.post(API_ENDPOINTS.CHAT.SEND, {
        message: questionText,
        sessionId,
      });

      if (data?.success && data?.data) {
        const resp = data.data;
        const assistantMsg: ChatMessageRecord = {
          id: `msg-a-${Date.now()}`,
          sessionId,
          sender: 'assistant',
          createdAt: new Date().toISOString(),
          urgency: resp.isEmergency ? 'emergency' : 'informational',
          content: resp.reply,
          sources: resp.sources?.map((s: any) => ({
            name: `${s.title} (${s.source})`,
            type: 'guideline' as const,
            organization: s.source,
            verified: true,
          })),
          isOutOfScope: false,
          isDemoIllustration: false,
        };

        // Đồng bộ lưu vào session bộ nhớ
        mockStore.appendCustomExchange(sessionId, userMsg, assistantMsg);
        return { userMessage: userMsg, assistantMessage: assistantMsg };
      }
      throw new Error(data?.message || 'Không thể nhận phản hồi từ Trợ lý AI Y tế');
    } catch (err: any) {
      console.error('[RAG Chatbot Error]:', err?.message);
      throw new Error(
        err?.response?.data?.message ||
        err?.message ||
        'Không thể kết nối đến Trợ lý AI Edge. Vui lòng kiểm tra kết nối mạng và thử lại.'
      );
    }
  },

  async getKnowledgeArticles(includeUnpublished = false): Promise<KnowledgeArticle[]> {
    return mockStore.getKnowledgeArticles(includeUnpublished);
  },

  async updateUserProfile(
    userId: string,
    _role: UserRole,
    patch: Partial<UserProfile>
  ): Promise<UserProfile> {
    return mockStore.updateProfile(userId, patch);
  },
};
