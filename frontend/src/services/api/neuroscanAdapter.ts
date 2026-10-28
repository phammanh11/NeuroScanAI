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

  async loginWithDemoRole(role: UserRole): Promise<AuthSession> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(450);
      const session = mockStore.loginWithRole(role);
      setHttpAuthToken(session.accessTokenDemo);
      return session;
    }
    const { data } = await httpClient.post<AuthSession>(API_ENDPOINTS.AUTH.LOGIN, {
      demoRole: role,
    });
    setHttpAuthToken(data.accessTokenDemo);
    return data;
  },

  async loginWithEmailPassword(email: string, password: string): Promise<AuthSession> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(500);
      if (!password || password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      }
      const session = mockStore.loginWithCredentials(email);
      setHttpAuthToken(session.accessTokenDemo);
      return session;
    }
    const { data } = await httpClient.post<AuthSession>(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    setHttpAuthToken(data.accessTokenDemo);
    return data;
  },

  async registerUser(fullName: string, email: string, password: string): Promise<AuthSession> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(550);
      if (!password || password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      }
      const session = mockStore.registerDemoUser(fullName, email);
      setHttpAuthToken(session.accessTokenDemo);
      return session;
    }
    const { data } = await httpClient.post<AuthSession>(API_ENDPOINTS.AUTH.REGISTER, {
      fullName,
      email,
      password,
    });
    setHttpAuthToken(data.accessTokenDemo);
    return data;
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(450);
      return {
        message:
          '[Chế độ Demo] Nếu địa chỉ email hợp lệ, hệ thống đã ghi nhận yêu cầu đặt lại mật khẩu. Khi kết nối dịch vụ thật, email xác thực sẽ được gửi qua SMTP.',
      };
    }
    const { data } = await httpClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
    );
    return data;
  },

  logout() {
    mockStore.logout();
    setHttpAuthToken(null);
  },

  // ==========================================
  // PATIENT / CUSTOMER MANAGEMENT (FOR DOCTOR)
  // ==========================================

  async getDoctorPatients(doctorId: string): Promise<PatientRecord[]> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(350);
      return mockStore.getDoctorPatients(doctorId);
    }
    const { data } = await httpClient.get<PatientRecord[]>('/doctor/patients');
    return data;
  },

  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(200);
      return mockStore.getPatientById(patientId);
    }
    const { data } = await httpClient.get<PatientRecord>(`/doctor/patients/${patientId}`);
    return data;
  },

  async createPatient(
    payload: CreatePatientPayload,
    doctor: UserProfile,
  ): Promise<PatientRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(400);
      return mockStore.createPatient(payload, doctor);
    }
    const { data } = await httpClient.post<PatientRecord>('/doctor/patients', payload);
    return data;
  },

  async updatePatient(payload: UpdatePatientPayload): Promise<PatientRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(350);
      return mockStore.updatePatient(payload);
    }
    const { data } = await httpClient.put<PatientRecord>(`/doctor/patients/${payload.id}`, payload);
    return data;
  },

  async deletePatient(patientId: string): Promise<boolean> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(300);
      return mockStore.deletePatient(patientId);
    }
    await httpClient.delete(`/doctor/patients/${patientId}`);
    return true;
  },

  async getPatientAnalyses(patientId: string): Promise<MRIAnalysisRecord[]> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(300);
      return mockStore.getPatientAnalyses(patientId);
    }
    const { data } = await httpClient.get<MRIAnalysisRecord[]>(`/doctor/patients/${patientId}/analyses`);
    return data;
  },

  // ==========================================
  // MRI ANALYSES & COMPUTER VISION
  // ==========================================

  async getUserAnalyses(userId: string): Promise<MRIAnalysisRecord[]> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(380);
      return mockStore.getUserAnalyses(userId);
    }
    const { data } = await httpClient.get<MRIAnalysisRecord[]>(API_ENDPOINTS.MRI.ANALYSES);
    return data;
  },

  async getAnalysisById(id: string): Promise<MRIAnalysisRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(350);
      const found = mockStore.getAnalysisById(id);
      if (!found) {
        throw new Error(`Không tìm thấy phiên phân tích MRI với mã "${id}".`);
      }
      return found;
    }
    const { data } = await httpClient.get<MRIAnalysisRecord>(
      API_ENDPOINTS.MRI.ANALYSIS_DETAIL(id),
    );
    return data;
  },

  async createAnalysis(
    payload: CreateAnalysisPayload,
    owner: UserProfile,
    previewObjectUrl: string,
    signal?: AbortSignal,
  ): Promise<MRIAnalysisRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(500);
      if (signal?.aborted) throw new DOMException('Yêu cầu đã bị hủy.', 'AbortError');
      return mockStore.createMockAnalysis(payload, owner, previewObjectUrl);
    }
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('consentAccepted', String(payload.consentAccepted));
    if (payload.symptomNote) {
      formData.append('symptomNote', payload.symptomNote);
    }
    if (payload.targetPatientId) {
      formData.append('targetPatientId', payload.targetPatientId);
    }
    const { data } = await httpClient.post<MRIAnalysisRecord>(
      API_ENDPOINTS.MRI.ANALYSES,
      formData,
      { signal },
    );
    return data;
  },

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(350);
      const deleted = mockStore.deleteAnalysis(id, userId);
      if (!deleted) {
        throw new Error('Không thể xóa phiên phân tích này hoặc bạn không có quyền sở hữu.');
      }
      return;
    }
    await httpClient.delete(API_ENDPOINTS.MRI.ANALYSIS_DETAIL(id));
  },

  async clearAllUserAnalyses(userId: string): Promise<number> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(400);
      return mockStore.clearAllUserAnalyses(userId);
    }
    const { data } = await httpClient.delete<{ deletedCount: number }>(
      API_ENDPOINTS.MRI.ANALYSES,
    );
    return data.deletedCount;
  },

  async requestDoctorReview(
    payload: RequestDoctorReviewPayload,
  ): Promise<MRIAnalysisRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(450);
      return mockStore.requestDoctorReview(payload);
    }
    const { data } = await httpClient.post<MRIAnalysisRecord>(
      API_ENDPOINTS.MRI.REQUEST_DOCTOR_REVIEW(payload.analysisId),
      payload,
    );
    return data;
  },

  async getDoctorCases(doctorId: string): Promise<MRIAnalysisRecord[]> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(400);
      return mockStore.getDoctorAssignedCases(doctorId);
    }
    const { data } = await httpClient.get<MRIAnalysisRecord[]>(API_ENDPOINTS.DOCTOR.CASES);
    return data;
  },

  async submitDoctorReview(
    payload: SubmitDoctorReviewPayload,
    doctor: UserProfile,
  ): Promise<MRIAnalysisRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(480);
      return mockStore.submitDoctorReview(payload, doctor);
    }
    const { data } = await httpClient.post<MRIAnalysisRecord>(
      API_ENDPOINTS.DOCTOR.SUBMIT_REVIEW(payload.analysisId),
      payload,
    );
    return data;
  },

  // ==========================================
  // CHATBOT SESSIONS (USER & DOCTOR)
  // ==========================================

  async getChatSessions(userId: string): Promise<ChatSessionRecord[]> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(300);
      return mockStore.getChatSessions(userId);
    }
    const { data } = await httpClient.get<ChatSessionRecord[]>(API_ENDPOINTS.CHAT.SESSIONS);
    return data;
  },

  async createChatSession(
    userId: string,
    linkedAnalysis?: MRIAnalysisRecord | null,
  ): Promise<ChatSessionRecord> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(250);
      return mockStore.createChatSession(userId, linkedAnalysis);
    }
    const { data } = await httpClient.post<ChatSessionRecord>(API_ENDPOINTS.CHAT.SESSIONS, {
      linkedAnalysisId: linkedAnalysis?.id,
    });
    return data;
  },

  async deleteChatSession(sessionId: string): Promise<void> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(250);
      mockStore.deleteChatSession(sessionId);
      return;
    }
    await httpClient.delete(API_ENDPOINTS.CHAT.SESSION_DETAIL(sessionId));
  },

  async sendChatMessage(
    sessionId: string,
    questionText: string,
  ): Promise<{ userMessage: ChatMessageRecord; assistantMessage: ChatMessageRecord }> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(650);
      return mockStore.sendChatMessage(sessionId, questionText);
    }
    const { data } = await httpClient.post<{
      userMessage: ChatMessageRecord;
      assistantMessage: ChatMessageRecord;
    }>(API_ENDPOINTS.CHAT.MESSAGES, {
      sessionId,
      content: questionText,
    });
    return data;
  },

  async getKnowledgeArticles(includeUnpublished = false): Promise<KnowledgeArticle[]> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(300);
      return mockStore.getKnowledgeArticles(includeUnpublished);
    }
    const { data } = await httpClient.get<KnowledgeArticle[]>(
      API_ENDPOINTS.KNOWLEDGE.ARTICLES,
      { params: { includeUnpublished } },
    );
    return data;
  },

  async updateUserProfile(
    userId: string,
    _role: UserRole,
    patch: Partial<UserProfile>,
  ): Promise<UserProfile> {
    if (ENV_CONFIG.MOCK_MODE) {
      await mockStore.delay(400);
      return mockStore.updateProfile(userId, patch);
    }
    const { data } = await httpClient.patch<UserProfile>(API_ENDPOINTS.PROFILE.UPDATE, patch);
    return data;
  },
};
