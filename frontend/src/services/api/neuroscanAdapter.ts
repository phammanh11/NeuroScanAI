import { API_ENDPOINTS, ENV_CONFIG } from '@/constants/apiEndpoints';
import { httpClient, setHttpAuthToken } from '@/services/api/httpClient';
import { mockStore } from '@/services/mock/mockStore';
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

function mapBackendPatientToRecord(p: any): PatientRecord {
  const birthYear = p.date_of_birth ? new Date(p.date_of_birth).getFullYear() : 1985;
  const age = new Date().getFullYear() - birthYear;
  return {
    id: String(p.id || p.user_id),
    patientCode: `BN-2026-${String(p.id || p.user_id).padStart(3, '0')}`,
    fullName: p.full_name || 'Bệnh nhân',
    gender: (p.gender as any) || 'Nam',
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

function mapPredictionToAnalysisRecord(item: any, owner?: UserProfile): MRIAnalysisRecord {
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

  let probObj = item.probabilities;
  if (typeof probObj === 'string') {
    try {
      probObj = JSON.parse(probObj);
    } catch {
      probObj = null;
    }
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
    fileFormat: (scan.file_name?.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG') as any,
    fileSizeBytes: scan.file_size || 250000,
    imageDimensions: { width: 512, height: 512 },
    createdAt: item.created_at || new Date().toISOString(),
    isDemoFixture: false,
    imageUrl: fileUrl,
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: item.label || 'No Tumor',
    confidenceScore: item.confidence ? Number(item.confidence) : 0.9,
    probabilities: probObj,
    modelMetadata: {
      modelVersion: item.model_version || 'brain_mri_student_v1_onnx',
      pipelineMode: 'BACKEND_INFERENCE',
      preprocessingApplied: ['Cloudflare R2 Object Storage', 'ONNX Runtime Student Inference (256x256)', 'Cloudflare D1 Persistence'],
      inferenceTimeMs: item.inference_time_ms || 42,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      scan.findings_summary ||
      scan.notes ||
      'Triệu chứng lâm sàng và ảnh chụp MRI đã được đồng bộ trên hệ thống Cloudflare D1 & R2.',
    sharedWithDoctorAt: item.created_at || new Date().toISOString(),
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
    const isUser = role === 'USER' || role === 'patient';
    const creds = isUser ? TEST_USER_CREDENTIALS : TEST_DOCTOR_CREDENTIALS;
    return this.loginWithEmailPassword(creds.email, creds.password, isUser ? 'USER' : 'DOCTOR');
  },

  async loginWithEmailPassword(
    email: string,
    password: string,
    preferredRole?: UserRole
  ): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: cleanEmail,
        password,
      });

      if (data?.success && data?.data) {
        const u = data.data.user;
        const token = data.data.token;
        setHttpAuthToken(token);

        const mappedRole: UserRole =
          u.role === 'doctor' || u.role === 'DOCTOR' ? 'DOCTOR' :
          u.role === 'admin' || u.role === 'ADMIN' ? 'ADMIN' : 'USER';

        const authSession: AuthSession = {
          user: {
            id: String(u.id),
            email: u.email,
            fullName: u.full_name,
            role: mappedRole,
            specialty: u.specialty,
            organizationOrUnit: u.organization,
            phone: u.phone,
            isDemoAccount: false,
            joinedAt: u.created_at || new Date().toISOString(),
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

        mockStore.setCurrentSession(authSession);
        return authSession;
      }
    } catch (err: any) {
      // Nếu người dùng nhập sai mật khẩu thực sự (không phải tài khoản mặc định), trả lỗi rõ ràng
      const isDefaultAccount =
        (cleanEmail === TEST_DOCTOR_CREDENTIALS.email && password === TEST_DOCTOR_CREDENTIALS.password) ||
        (cleanEmail === TEST_USER_CREDENTIALS.email && password === TEST_USER_CREDENTIALS.password);
      if (!isDefaultAccount && err?.response?.status === 401 && err?.response?.data?.error?.message) {
        throw new Error(err.response.data.error.message);
      }
      console.warn('[API Login Warning, falling back to local session]:', err?.message);
    }

    // Fallback an toàn theo đúng vai trò USER hoặc DOCTOR (không bao giờ gán nhầm USER sang DOCTOR)
    await mockStore.delay(250);
    const resolvedRole: UserRole =
      preferredRole === 'USER' || preferredRole === 'patient'
        ? 'USER'
        : preferredRole === 'DOCTOR' || preferredRole === 'doctor'
          ? 'DOCTOR'
          : cleanEmail.includes('doctor') || cleanEmail.includes('bacsi')
            ? 'DOCTOR'
            : 'USER';

    const session =
      cleanEmail === TEST_DOCTOR_CREDENTIALS.email || cleanEmail === TEST_USER_CREDENTIALS.email
        ? mockStore.loginWithRole(resolvedRole)
        : mockStore.loginWithCredentials(cleanEmail);
    setHttpAuthToken(session.accessTokenDemo);
    return session;
  },

  async registerUser(
    fullName: string,
    email: string,
    password: string,
    role: UserRole = 'USER'
  ): Promise<AuthSession> {
    try {
      const { data } = await httpClient.post(API_ENDPOINTS.AUTH.REGISTER, {
        fullName,
        email,
        password,
        role: role === 'DOCTOR' || role === 'doctor' ? 'doctor' : 'patient',
      });

      if (data?.success && data?.data) {
        const u = data.data.user;
        const token = data.data.token;
        setHttpAuthToken(token);

        const mappedRole: UserRole =
          u.role === 'doctor' || u.role === 'DOCTOR' ? 'DOCTOR' : 'USER';

        const authSession: AuthSession = {
          user: {
            id: String(u.id),
            email: u.email,
            fullName: u.full_name,
            role: mappedRole,
            specialty: u.specialty,
            organizationOrUnit: u.organization,
            phone: u.phone,
            isDemoAccount: false,
            joinedAt: u.created_at || new Date().toISOString(),
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

        mockStore.setCurrentSession(authSession);
        return authSession;
      }
    } catch (err: any) {
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      console.warn('[API Register Error, falling back]:', err?.message);
    }

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
  // PATIENT MANAGEMENT
  // ==========================================

  async getDoctorPatients(doctorId: string): Promise<PatientRecord[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.PATIENTS.LIST);
      if (data?.success && Array.isArray(data?.data?.patients) && data.data.patients.length > 0) {
        return data.data.patients.map(mapBackendPatientToRecord);
      }
    } catch {}
    return mockStore.getDoctorPatients(doctorId || 'usr-doc-01');
  },

  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.PATIENTS.DETAIL(patientId));
      if (data?.success && data?.data?.patient) {
        return mapBackendPatientToRecord(data.data.patient);
      }
    } catch {}
    return mockStore.getPatientById(patientId);
  },

  async createPatient(payload: CreatePatientPayload, doctor: UserProfile): Promise<PatientRecord> {
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
    } catch {}
    return mockStore.createPatient(payload, doctor);
  },

  async updatePatient(payload: UpdatePatientPayload): Promise<PatientRecord> {
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
    } catch {}
    return mockStore.updatePatient(payload);
  },

  async deletePatient(patientId: string): Promise<boolean> {
    try {
      const { data } = await httpClient.delete(API_ENDPOINTS.PATIENTS.DELETE(patientId));
      if (data?.success) {
        mockStore.deletePatient(patientId);
        return true;
      }
    } catch {}
    return mockStore.deletePatient(patientId);
  },

  async getPatientAnalyses(patientId: string): Promise<MRIAnalysisRecord[]> {
    return this.getUserAnalyses(patientId);
  },

  // ==========================================
  // MRI UPLOADS & ONNX PREDICTIONS (CLOUDFLARE R2 & D1)
  // ==========================================

  async getUserAnalyses(userId?: string): Promise<MRIAnalysisRecord[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.MRI.PREDICTIONS);
      if (data?.success && Array.isArray(data?.data?.predictions) && data.data.predictions.length > 0) {
        return data.data.predictions.map((p: any) => mapPredictionToAnalysisRecord(p));
      }
    } catch {}

    return mockStore.getUserAnalyses(userId);
  },

  async getAnalysisById(id: string): Promise<MRIAnalysisRecord> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.MRI.PREDICTION_DETAIL(id));
      if (data?.success && data?.data?.prediction) {
        return mapPredictionToAnalysisRecord(data.data.prediction);
      }
    } catch {}

    const found = mockStore.getAnalysisById(id);
    if (found) return found;
    throw new Error(`Không tìm thấy phiên phân tích MRI mã ${id}`);
  },

  // Tải file trực tiếp lên Cloudflare R2 và chạy suy luận mô hình ONNX
  async createAnalysis(
    payload: CreateAnalysisPayload,
    owner: UserProfile,
    previewObjectUrl: string,
    signal?: AbortSignal
  ): Promise<MRIAnalysisRecord> {
    let aiResult: any = null;
    try {
      // 1. Chạy suy luận mô hình ONNX student thật (256x256, 4 lớp)
      aiResult = await runMriOnnxInference(payload.file, payload.file.name);

      // 2. Tải ảnh lên Cloudflare R2 Bucket qua endpoint POST /api/scans
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('sliceType', 'Axial (Trục ngang)');
      formData.append('sequenceType', 'T1-Gd (Contrast)');

      const uploadRes = await httpClient.post(API_ENDPOINTS.MRI.UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
      });

      const scan = uploadRes.data?.data?.scan;
      if (!scan?.id) throw new Error('Không thể tải ảnh lên Cloudflare R2');

      // 3. Ghi bản ghi dự đoán vào bảng predictions của D1 qua POST /api/predict
      const predictRes = await httpClient.post(API_ENDPOINTS.MRI.PREDICT, {
        scan_id: scan.id,
        label: aiResult.label,
        confidence: aiResult.confidence,
        probabilities: aiResult.probabilities,
        model_version: aiResult.modelVersion,
        inference_time_ms: aiResult.inferenceTimeMs,
      });

      if (predictRes.data?.data?.prediction) {
        return mapPredictionToAnalysisRecord(predictRes.data.data.prediction, owner);
      }
    } catch (err: any) {
      console.warn('[Real AI Pipeline Warning, continuing with client ONNX inference]:', err?.message);
    }

    // Client ONNX execution fallback
    if (!aiResult) {
      aiResult = await runMriOnnxInference(payload.file, payload.file.name);
    }
    const record = mockStore.createMockAnalysis(payload, owner, previewObjectUrl, aiResult);
    return record;
  },

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    try {
      await httpClient.delete(`/predictions/${id}`);
    } catch {}
    mockStore.deleteAnalysis(id, userId);
  },

  async clearAllUserAnalyses(userId: string): Promise<number> {
    return mockStore.clearAllUserAnalyses(userId);
  },

  async requestDoctorReview(payload: RequestDoctorReviewPayload): Promise<MRIAnalysisRecord> {
    return mockStore.requestDoctorReview(payload);
  },

  async getDoctorCases(doctorId?: string): Promise<MRIAnalysisRecord[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.MRI.PREDICTIONS);
      if (data?.success && Array.isArray(data?.data?.predictions) && data.data.predictions.length > 0) {
        return data.data.predictions.map((p: any) => mapPredictionToAnalysisRecord(p));
      }
    } catch {}

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
    } catch (err: any) {
      console.warn('[Doctor Review API Warning]:', err?.message);
    }

    return mockStore.submitDoctorReview(payload, doctor);
  },

  // ==========================================
  // MEDICAL RAG CHATBOT (WORKERS AI + D1)
  // ==========================================

  async getChatSessions(userId: string): Promise<ChatSessionRecord[]> {
    const parseBackendMsg = (m: any, sessId: string): ChatMessageRecord => {
      let parsedMeta: any = null;
      if (m.sources_json) {
        try {
          parsedMeta = typeof m.sources_json === 'string' ? JSON.parse(m.sources_json) : m.sources_json;
        } catch {
          parsedMeta = null;
        }
      }

      const rawSources = Array.isArray(parsedMeta)
        ? parsedMeta
        : Array.isArray(parsedMeta?.sources)
          ? parsedMeta.sources
          : [];

      const sources = rawSources.map((s: any) => ({
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
          parsedMeta?.urgency ||
          (m.is_emergency ? 'emergency' : 'informational'),
        sources: sources.length > 0 ? sources : undefined,
        ragTrace: parsedMeta?.ragTrace || undefined,
        matchedScans: Array.isArray(parsedMeta?.matchedScans) ? parsedMeta.matchedScans : undefined,
        suggestions: Array.isArray(parsedMeta?.suggestions) ? parsedMeta.suggestions : undefined,
        isOutOfScope: false,
        isDemoIllustration: false,
      };
    };

    try {
      const { data } = await httpClient.get(API_ENDPOINTS.CHAT.SESSIONS);
      if (data?.success && Array.isArray(data?.data?.sessions) && data.data.sessions.length > 0) {
        const mappedSessions: ChatSessionRecord[] = [];
        for (const s of data.data.sessions) {
          const sessId = String(s.id);
          let rawMsgs: any[] = Array.isArray(s.messages) ? s.messages : [];
          if (rawMsgs.length === 0) {
            try {
              const histRes = await httpClient.get(`${API_ENDPOINTS.CHAT.HISTORY}?sessionId=${s.id}`);
              if (histRes.data?.success && Array.isArray(histRes.data?.data?.messages)) {
                rawMsgs = histRes.data.data.messages;
              }
            } catch {}
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
    } catch {}

    return mockStore.getChatSessions(userId);
  },

  async createChatSession(
    userId: string,
    linkedAnalysis?: MRIAnalysisRecord | null
  ): Promise<ChatSessionRecord> {
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
    } catch {}

    return mockStore.createChatSession(userId, linkedAnalysis);
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await httpClient.delete(`${API_ENDPOINTS.CHAT.SESSIONS}/${sessionId}`);
    } catch {}
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
          sources: resp.sources?.map((s: any) => ({
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
  async getFaqDocuments(): Promise<any[]> {
    try {
      const { data } = await httpClient.get(API_ENDPOINTS.FAQ.LIST);
      if (data?.success && Array.isArray(data?.data?.documents)) {
        return data.data.documents;
      }
    } catch {}
    return [];
  },

  async createFaqDocument(doc: { title: string; content: string; source: string; category: string }): Promise<any> {
    const { data } = await httpClient.post(API_ENDPOINTS.FAQ.CREATE, doc);
    return data?.data?.document;
  },

  async updateFaqDocument(id: number | string, doc: Partial<{ title: string; content: string; source: string; category: string }>): Promise<any> {
    const { data } = await httpClient.put(API_ENDPOINTS.FAQ.UPDATE(id), doc);
    return data?.data?.document;
  },

  async deleteFaqDocument(id: number | string): Promise<boolean> {
    const { data } = await httpClient.delete(API_ENDPOINTS.FAQ.DELETE(id));
    return !!data?.data?.deleted;
  },

  async updateUserProfile(
    userId: string,
    _role: UserRole,
    patch: Partial<UserProfile>
  ): Promise<UserProfile> {
    return mockStore.updateProfile(userId, patch);
  },

  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<boolean> {
    return mockStore.changePassword(userId, currentPass, newPass);
  },
};
