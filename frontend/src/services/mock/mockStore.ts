import {
  DEMO_UPLOAD_FIXTURE_PRESETS,
  DEMO_USERS,
  INITIAL_MOCK_ANALYSES,
  INITIAL_PATIENTS,
} from '@/data/mockFixtures';
import {
  EMERGENCY_KEYWORDS_VI,
  INITIAL_CHAT_SESSIONS,
  KNOWLEDGE_ARTICLES_DATA,
  VERIFIED_FAQ_RECORDS,
} from '@/data/knowledgeAndFaqData';
import {
  SYNTHETIC_MRI_SLICES,
  SYNTHETIC_PREPROCESSED_ROI_GLIOMA,
} from '@/assets/mriIllustrations';
import { ENV_CONFIG } from '@/constants/apiEndpoints';
import { sanitizeMedicalFileName } from '@/utils/formatters';
import type {
  AuthSession,
  ChatMessageRecord,
  ChatSessionRecord,
  CreateAnalysisPayload,
  CreatePatientPayload,
  MRIAnalysisRecord,
  PatientRecord,
  RequestDoctorReviewPayload,
  SubmitDoctorReviewPayload,
  UpdatePatientPayload,
  UserProfile,
  UserRole,
} from '@/types/domain';

/**
 * In-memory Mock Store (chỉ lưu trong bộ nhớ phiên làm việc của trình duyệt,
 * tuyệt đối không lưu ảnh MRI hay dữ liệu sức khỏe nhạy cảm vào localStorage).
 */
class InMemoryMockStore {
  private analyses: MRIAnalysisRecord[] = structuredClone(INITIAL_MOCK_ANALYSES);
  private patients: PatientRecord[] = structuredClone(INITIAL_PATIENTS);
  private chatSessions: ChatSessionRecord[] = structuredClone(INITIAL_CHAT_SESSIONS);
  private profilesById: Record<string, UserProfile> = Object.values(DEMO_USERS).reduce(
    (profiles, profile) => {
      profiles[profile.id] = structuredClone(profile);
      return profiles;
    },
    {} as Record<string, UserProfile>,
  );
  private currentSession: AuthSession | null = null;
  private simulateNetworkError = false;
  private sequence = 0;
  private readonly maxMessagesPerSession = 100;

  private revokeOwnedImageUrl(record: MRIAnalysisRecord): void {
    if (record.imageUrl.startsWith('blob:')) URL.revokeObjectURL(record.imageUrl);
  }

  private trimChatMessages(session: ChatSessionRecord): void {
    if (session.messages.length <= this.maxMessagesPerSession) return;
    const welcomeMessage = session.messages[0];
    const recentMessages = session.messages.slice(-(this.maxMessagesPerSession - 1));
    session.messages = welcomeMessage
      ? [welcomeMessage, ...recentMessages.filter((message) => message.id !== welcomeMessage.id)]
      : recentMessages;
  }

  private createId(prefix: string): string {
    const uuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${this.sequence++}`;
    return `${prefix}-${uuid}`;
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private redactForUser(record: MRIAnalysisRecord): MRIAnalysisRecord {
    const redacted = structuredClone(record);
    if (redacted.doctorReview) {
      delete redacted.doctorReview.internalTechnicalNote;
    }
    return redacted;
  }

  private createSession(profile: UserProfile): AuthSession {
    const session: AuthSession = {
      user: structuredClone(profile),
      accessTokenDemo: this.createId(`mock-jwt-${profile.role.toLowerCase()}`),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    };
    this.currentSession = session;
    return session;
  }

  public async delay(ms = ENV_CONFIG.MOCK_LATENCY_MS): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    if (this.simulateNetworkError) {
      throw new Error(
        'Mô phỏng lỗi kết nối dịch vụ (Chế độ kiểm thử Error/Retry đang bật). Vui lòng thử lại hoặc tắt mô phỏng lỗi.',
      );
    }
  }

  public setSimulateError(enabled: boolean) {
    this.simulateNetworkError = enabled;
  }

  public getSimulateError(): boolean {
    return this.simulateNetworkError;
  }

  public getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  public loginWithRole(role: UserRole): AuthSession {
    const demoProfile = DEMO_USERS[role];
    const profile = this.profilesById[demoProfile.id] ?? structuredClone(demoProfile);
    this.profilesById[profile.id] = structuredClone(profile);
    return this.createSession(profile);
  }

  public loginWithCredentials(email: string): AuthSession {
    const normalized = email.trim().toLowerCase();
    const existing = Object.values(this.profilesById).find((profile) => profile.email === normalized);
    if (existing) {
      return this.createSession(existing);
    }

    const role: UserRole =
      normalized.includes('doctor') || normalized.includes('bacsi') ? 'DOCTOR' : 'USER';
    const base = DEMO_USERS[role];
    const profile: UserProfile = {
      ...structuredClone(base),
      id: this.createId(role === 'DOCTOR' ? 'doc-demo-user' : 'usr-demo-user'),
      email: normalized,
      fullName: `${role === 'DOCTOR' ? 'Bác sĩ Demo' : 'Người dùng Demo'} (${normalized})`,
    };
    this.profilesById[profile.id] = profile;
    return this.createSession(profile);
  }

  public registerDemoUser(fullName: string, email: string): AuthSession {
    if (fullName.trim().length < 2) {
      throw new Error('Họ và tên phải có ít nhất 2 ký tự không tính khoảng trắng.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (Object.values(this.profilesById).some((profile) => profile.email === normalizedEmail)) {
      throw new Error('Email này đã được đăng ký trong phiên Demo.');
    }
    const updatedUser: UserProfile = {
      ...structuredClone(DEMO_USERS.USER),
      id: this.createId('usr-demo-registered'),
      fullName: `${fullName.trim()} (Tài khoản Giả lập)`,
      email: normalizedEmail,
      isDemoAccount: true,
      role: 'USER',
    };
    this.profilesById[updatedUser.id] = updatedUser;
    return this.createSession(updatedUser);
  }

  public logout() {
    this.currentSession = null;
  }

  public updateProfile(userId: string, patch: Partial<UserProfile>): UserProfile {
    if (this.currentSession?.user.id !== userId) {
      throw new Error('Bạn không có quyền cập nhật hồ sơ tài khoản khác.');
    }
    const current = this.profilesById[userId];
    if (!current) {
      throw new Error('Không tìm thấy hồ sơ người dùng trong phiên Demo.');
    }

    const next: UserProfile = {
      ...current,
      role: current.role,
      fullName: patch.fullName?.trim() || current.fullName,
      organizationOrUnit: patch.organizationOrUnit ?? current.organizationOrUnit,
      phone: patch.phone ?? current.phone,
      preferences: {
        ...current.preferences,
        ...(patch.preferences ?? {}),
      },
    };
    this.profilesById[userId] = next;
    if (this.currentSession?.user.id === userId) {
      this.currentSession = {
        ...this.currentSession,
        user: structuredClone(next),
      };
    }
    return structuredClone(next);
  }

  // ==========================================
  // PATIENT / CUSTOMER MANAGEMENT (FOR DOCTOR)
  // ==========================================

  public getDoctorPatients(doctorId: string): PatientRecord[] {
    if (this.currentSession?.user.id !== doctorId || this.currentSession.user.role !== 'DOCTOR') {
      throw new Error('Chỉ có Bác sĩ mới có quyền truy cập danh sách bệnh nhân.');
    }
    return structuredClone(
      this.patients.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    );
  }

  public getPatientById(patientId: string): PatientRecord | null {
    const found = this.patients.find((p) => p.id === patientId);
    return found ? structuredClone(found) : null;
  }

  public createPatient(
    payload: CreatePatientPayload,
    doctor: UserProfile,
  ): PatientRecord {
    if (this.currentSession?.user.role !== 'DOCTOR') {
      throw new Error('Chỉ Bác sĩ mới có quyền thêm hồ sơ bệnh nhân.');
    }
    if (!payload.fullName.trim()) {
      throw new Error('Họ và tên bệnh nhân không được để trống.');
    }
    if (!payload.phone.trim()) {
      throw new Error('Số điện thoại bệnh nhân không được để trống.');
    }

    const nextCodeNumber = this.patients.length + 1;
    const patientCode = `BN-2026-${String(nextCodeNumber).padStart(3, '0')}`;
    
    // Tính tuổi tự động từ ngày sinh
    let age = 30;
    if (payload.dateOfBirth) {
      const birthYear = new Date(payload.dateOfBirth).getFullYear();
      if (!Number.isNaN(birthYear)) {
        age = Math.max(1, new Date().getFullYear() - birthYear);
      }
    }

    const newPatient: PatientRecord = {
      id: this.createId('pat'),
      patientCode,
      fullName: payload.fullName.trim(),
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth || '1990-01-01',
      age,
      phone: payload.phone.trim(),
      email: payload.email?.trim() || undefined,
      address: payload.address?.trim() || undefined,
      medicalHistory: payload.medicalHistory?.trim() || 'Chưa ghi nhận tiền sử bệnh đặc biệt.',
      symptomsInitial: payload.symptomsInitial?.trim() || 'Thăm khám chẩn đoán hình ảnh sọ não.',
      assignedDoctorId: doctor.id,
      assignedDoctorName: doctor.fullName,
      linkedUserId: payload.linkedUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.patients.unshift(newPatient);
    return structuredClone(newPatient);
  }

  public updatePatient(payload: UpdatePatientPayload): PatientRecord {
    if (this.currentSession?.user.role !== 'DOCTOR') {
      throw new Error('Chỉ Bác sĩ mới có quyền chỉnh sửa hồ sơ bệnh nhân.');
    }
    const idx = this.patients.findIndex((p) => p.id === payload.id);
    if (idx === -1) {
      throw new Error('Không tìm thấy thông tin bệnh nhân để cập nhật.');
    }

    const current = this.patients[idx];
    let age = current.age;
    if (payload.dateOfBirth) {
      const birthYear = new Date(payload.dateOfBirth).getFullYear();
      if (!Number.isNaN(birthYear)) {
        age = Math.max(1, new Date().getFullYear() - birthYear);
      }
    }

    const updated: PatientRecord = {
      ...current,
      fullName: payload.fullName ? payload.fullName.trim() : current.fullName,
      gender: payload.gender ?? current.gender,
      dateOfBirth: payload.dateOfBirth ?? current.dateOfBirth,
      age,
      phone: payload.phone ? payload.phone.trim() : current.phone,
      email: payload.email !== undefined ? payload.email.trim() : current.email,
      address: payload.address !== undefined ? payload.address.trim() : current.address,
      medicalHistory: payload.medicalHistory !== undefined ? payload.medicalHistory.trim() : current.medicalHistory,
      symptomsInitial: payload.symptomsInitial !== undefined ? payload.symptomsInitial.trim() : current.symptomsInitial,
      updatedAt: new Date().toISOString(),
    };

    this.patients[idx] = updated;
    return structuredClone(updated);
  }

  public deletePatient(patientId: string): boolean {
    if (this.currentSession?.user.role !== 'DOCTOR') {
      throw new Error('Chỉ Bác sĩ mới có quyền xóa hồ sơ bệnh nhân.');
    }
    const idx = this.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) return false;
    this.patients.splice(idx, 1);
    return true;
  }

  public getPatientAnalyses(patientId: string): MRIAnalysisRecord[] {
    const list = this.analyses.filter((item) => item.patientId === patientId);
    return structuredClone(
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
  }

  // ==========================================
  // MRI ANALYSES & COMPUTER VISION PIPELINE
  // ==========================================

  public getUserAnalyses(userId: string): MRIAnalysisRecord[] {
    if (this.currentSession?.user.id !== userId || this.currentSession.user.role !== 'USER') {
      throw new Error('Bạn không có quyền xem lịch sử của tài khoản khác.');
    }
    // Bệnh nhân xem được các ca do chính mình upload VÀ các ca do Bác sĩ upload gán cho bệnh nhân
    return this.analyses
      .filter((item) => item.ownerUserId === userId || item.patientId === 'pat-001')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => this.redactForUser(item));
  }

  public getAnalysisById(id: string): MRIAnalysisRecord | null {
    const found = this.analyses.find((item) => item.id === id);
    const session = this.currentSession;
    const canAccess = Boolean(
      found &&
        session &&
        ((session.user.role === 'USER' && (found.ownerUserId === session.user.id || found.patientId === 'pat-001')) ||
          (session.user.role === 'DOCTOR' &&
            (found.patientSharedConsent || found.uploadedDoctorId === session.user.id || found.assignedDoctorId === session.user.id))),
    );
    return canAccess && found
      ? session?.user.role === 'USER'
        ? this.redactForUser(found)
        : structuredClone(found)
      : null;
  }

  public createMockAnalysis(
    payload: CreateAnalysisPayload,
    owner: UserProfile,
    previewObjectUrl: string,
  ): MRIAnalysisRecord {
    if (!this.currentSession || this.currentSession.user.id !== owner.id) {
      throw new Error('Phiên Demo hiện tại không khớp với người tạo phân tích.');
    }
    if (!payload.consentAccepted) {
      throw new Error('Cần xác nhận consent trước khi tạo phiên phân tích.');
    }

    const preset =
      DEMO_UPLOAD_FIXTURE_PRESETS.find((p) => p.id === payload.selectedDemoPresetId) ??
      DEMO_UPLOAD_FIXTURE_PRESETS[0];

    const ext = payload.file.name.split('.').pop()?.toUpperCase();
    const fileFormat: 'PNG' | 'JPG' | 'JPEG' | 'SVG' =
      payload.file.type === 'image/svg+xml' || ext === 'SVG'
        ? 'SVG'
        : ext === 'JPG' || ext === 'JPEG'
          ? ext
          : 'PNG';

    const highestSessionNumber = this.analyses.reduce((max, item) => {
      const number = Number(item.sessionCode.split('-').pop());
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 1000);
    const newIndex = highestSessionNumber + 1;

    // Phân biệt Bác sĩ upload qua Computer Vision hay Người dùng upload
    const isDoctor = owner.role === 'DOCTOR';
    let targetPatient: PatientRecord | undefined;
    if (payload.targetPatientId) {
      targetPatient = this.patients.find((p) => p.id === payload.targetPatientId);
    } else if (isDoctor) {
      // Mặc định gán cho bệnh nhân đầu tiên nếu bác sĩ không chọn cụ thể
      targetPatient = this.patients[0];
    }

    const record: MRIAnalysisRecord = {
      id: this.createId('ana-demo'),
      sessionCode: `NS-2026-${newIndex}`,
      ownerUserId: targetPatient?.linkedUserId || (isDoctor ? 'usr-demo-patient-01' : owner.id),
      ownerDisplayCode: targetPatient
        ? `${targetPatient.patientCode} (${targetPatient.fullName})`
        : `BN-${owner.id.slice(-8).toUpperCase()}`,
      uploadedByRole: isDoctor ? 'DOCTOR' : 'USER',
      uploadedDoctorId: isDoctor ? owner.id : undefined,
      uploadedDoctorName: isDoctor ? owner.fullName : undefined,
      patientId: targetPatient?.id || (owner.id === 'usr-demo-patient-01' ? 'pat-001' : undefined),
      originalFileName: payload.file.name.replace(/[\r\n\t]/g, ' ').trim(),
      sanitizedFileName: sanitizeMedicalFileName(payload.file.name, owner.id),
      fileFormat,
      fileSizeBytes: payload.file.size,
      imageDimensions: payload.imageDimensions ?? { width: 512, height: 512 },
      createdAt: new Date().toISOString(),
      isDemoFixture: true,
      imageUrl: previewObjectUrl || SYNTHETIC_MRI_SLICES[preset.label],
      preprocessedImageUrl: preset.hasPreprocessedDemo
        ? SYNTHETIC_PREPROCESSED_ROI_GLIOMA
        : null,
      gradcamUrl: null,
      predictedLabel: preset.label,
      confidenceScore: preset.confidenceScore,
      probabilities: structuredClone(preset.probabilities),
      modelMetadata: {
        modelVersion: isDoctor
          ? 'Clinical Computer Vision Lab (OpenCV ROI + Multi-Backbone)'
          : 'Mock-Fixture-v1.0 (Kết quả minh họa cố định)',
        pipelineMode: 'MOCK_FIXTURE',
        preprocessingApplied: preset.hasPreprocessedDemo
          ? [
              'Brain Contour ROI Cropping (Minh họa)',
              'CLAHE Adaptive Histogram (Minh họa)',
              'Z-score Normalization (Minh họa)',
            ]
          : ['Chuẩn hóa kích thước khung hình (Minh họa)'],
        inferenceTimeMs: 410,
      },
      patientSharedConsent: isDoctor ? true : false,
      patientSymptomNote: payload.symptomNote?.trim() || undefined,
      reviewStatus: isDoctor ? 'IN_REVIEW' : 'NONE',
      assignedDoctorId: isDoctor ? owner.id : undefined,
      assignedDoctorName: isDoctor ? owner.fullName : undefined,
    };

    this.analyses.unshift(record);
    return structuredClone(record);
  }

  public deleteAnalysis(id: string, userId: string): boolean {
    const session = this.currentSession;
    if (!session) return false;
    
    const idx = this.analyses.findIndex((item) => item.id === id);
    if (idx === -1) return false;

    const target = this.analyses[idx];
    const canDelete =
      (session.user.role === 'USER' && target.ownerUserId === userId) ||
      (session.user.role === 'DOCTOR' && target.uploadedDoctorId === userId);

    if (!canDelete) return false;

    const [deletedRecord] = this.analyses.splice(idx, 1);
    this.revokeOwnedImageUrl(deletedRecord);
    this.chatSessions = this.chatSessions.filter(
      (chatSess) => chatSess.linkedAnalysisId !== id,
    );
    return true;
  }

  public clearAllUserAnalyses(userId: string): number {
    if (this.currentSession?.user.id !== userId || this.currentSession.user.role !== 'USER') {
      throw new Error('Bạn không có quyền xóa lịch sử của tài khoản khác.');
    }
    const ownedRecords = this.analyses.filter((item) => item.ownerUserId === userId && item.uploadedByRole !== 'DOCTOR');
    const ownedAnalysisIds = new Set(ownedRecords.map((item) => item.id));
    ownedRecords.forEach((record) => this.revokeOwnedImageUrl(record));
    const before = this.analyses.length;
    this.analyses = this.analyses.filter((item) => !(item.ownerUserId === userId && item.uploadedByRole !== 'DOCTOR'));
    this.chatSessions = this.chatSessions.filter(
      (session) =>
        session.ownerUserId !== userId ||
        !session.linkedAnalysisId ||
        !ownedAnalysisIds.has(session.linkedAnalysisId),
    );
    return before - this.analyses.length;
  }

  public requestDoctorReview(payload: RequestDoctorReviewPayload): MRIAnalysisRecord {
    const item = this.analyses.find((a) => a.id === payload.analysisId);
    const session = this.currentSession;
    if (!item) {
      throw new Error('Không tìm thấy phiên phân tích MRI cần gửi yêu cầu.');
    }
    if (!session || session.user.role !== 'USER' || (item.ownerUserId !== session.user.id && item.patientId !== 'pat-001')) {
      throw new Error('Bạn không có quyền gửi yêu cầu cho phiên phân tích này.');
    }
    if (!payload.consentToShareWithDoctor) {
      throw new Error('Vui lòng xác nhận đồng ý chia sẻ dữ liệu phiên phân tích với bác sĩ.');
    }
    if (item.reviewStatus === 'REVIEWED' && item.doctorReview) {
      throw new Error('Phiên này đã được bác sĩ xem xét; không thể gửi lại yêu cầu mới.');
    }
    item.patientSharedConsent = true;
    item.patientSymptomNote =
      payload.patientSymptomNote.trim() ||
      'Người dùng gửi yêu cầu bác sĩ xem xét kết quả phân loại tham khảo.';
    item.sharedWithDoctorAt = new Date().toISOString();
    item.reviewStatus = 'PENDING_REVIEW';
    item.assignedDoctorId = DEMO_USERS.DOCTOR.id;
    item.assignedDoctorName = DEMO_USERS.DOCTOR.fullName;
    if (item.doctorReview?.status === 'NEEDS_MORE_INFO') {
      item.doctorReview = undefined;
    }
    return this.redactForUser(item);
  }

  public getDoctorAssignedCases(doctorId: string): MRIAnalysisRecord[] {
    if (this.currentSession?.user.id !== doctorId || this.currentSession.user.role !== 'DOCTOR') {
      throw new Error('Bạn không có quyền xem danh sách ca của bác sĩ khác.');
    }
    return structuredClone(
      this.analyses
        .filter(
          (item) =>
            item.patientSharedConsent || item.uploadedDoctorId === doctorId || item.assignedDoctorId === doctorId,
        )
        .sort((a, b) => {
          const dateA = a.sharedWithDoctorAt || a.createdAt;
          const dateB = b.sharedWithDoctorAt || b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }),
    );
  }

  public submitDoctorReview(
    payload: SubmitDoctorReviewPayload,
    doctor: UserProfile,
  ): MRIAnalysisRecord {
    const item = this.analyses.find((a) => a.id === payload.analysisId);
    if (!item) {
      throw new Error('Không tìm thấy ca bệnh cần viết đánh giá.');
    }
    if (this.currentSession?.user.role !== 'DOCTOR' || this.currentSession.user.id !== doctor.id) {
      throw new Error('Chỉ Bác sĩ mới có quyền lưu phiếu nhận xét chuyên môn.');
    }
    if (!payload.clinicalNoteForPatient.trim()) {
      throw new Error('Nhận xét gửi người bệnh không được để trống.');
    }
    if (!payload.recommendedNextStep.trim()) {
      throw new Error('Khuyến nghị tiếp theo không được để trống.');
    }
    if (payload.status === 'PENDING_REVIEW') {
      throw new Error('Không thể lưu phiếu nhận xét ở trạng thái chờ xem xét.');
    }

    item.patientSharedConsent = true;
    item.reviewStatus = payload.status;
    item.assignedDoctorId = doctor.id;
    item.assignedDoctorName = doctor.fullName;
    item.doctorReview = {
      reviewId: item.doctorReview?.reviewId || this.createId('rev-demo'),
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorSpecialty: doctor.specialty || 'Chẩn đoán hình ảnh Thần kinh',
      status: payload.status,
      aiAssessment: payload.aiAssessment,
      clinicalNoteForPatient: payload.clinicalNoteForPatient.trim(),
      internalTechnicalNote: payload.internalTechnicalNote?.trim() || undefined,
      recommendedNextStep: payload.recommendedNextStep.trim(),
      updatedAt: new Date().toISOString(),
    };
    return structuredClone(item);
  }

  // ==========================================
  // CHATBOT ASSISTANT (USER & DOCTOR SUPPORT)
  // ==========================================

  public getChatSessions(userId: string): ChatSessionRecord[] {
    if (this.currentSession?.user.id !== userId) {
      throw new Error('Bạn không có quyền xem các phiên hội thoại này.');
    }
    return structuredClone(
      this.chatSessions
        .filter((s) => s.ownerUserId === userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    );
  }

  public createChatSession(
    userId: string,
    linkedAnalysis?: MRIAnalysisRecord | null,
  ): ChatSessionRecord {
    if (this.currentSession?.user.id !== userId) {
      throw new Error('Bạn không có quyền tạo hội thoại cho tài khoản khác.');
    }
    const isDoctor = this.currentSession.user.role === 'DOCTOR';
    const now = new Date().toISOString();
    const sessionId = this.createId('chat-sess');
    const session: ChatSessionRecord = {
      id: sessionId,
      ownerUserId: userId,
      title: linkedAnalysis
        ? `Tư vấn tham khảo phiên ${linkedAnalysis.sessionCode} (${linkedAnalysis.predictedLabel})`
        : isDoctor
          ? 'Hội chẩn & Tham vấn lâm sàng AI'
          : 'Cuộc hội thoại y khoa mới',
      createdAt: now,
      updatedAt: now,
      linkedAnalysisId: linkedAnalysis?.id,
      linkedAnalysisSessionCode: linkedAnalysis?.sessionCode,
      linkedAnalysisLabel: linkedAnalysis?.predictedLabel,
      messages: [
        {
          id: this.createId('msg-welcome'),
          sessionId,
          sender: 'assistant',
          createdAt: now,
          urgency: 'informational',
          content: linkedAnalysis
            ? `Xin chào ${isDoctor ? 'Bác sĩ' : 'bạn'}! Tôi đang tải ngữ cảnh ca MRI **${linkedAnalysis.sessionCode}** (Nhãn AI: **${linkedAnalysis.predictedLabel}**). Bạn có thể hỏi về các tiêu chuẩn chẩn đoán hình ảnh, phân biệt viền màng cứng, hoặc các đặc trưng mô bệnh học.`
            : isDoctor
              ? 'Xin chào **Bác sĩ**! Tôi là **Trợ lý AI Y tế Chuyên khoa** của NeuroScan. Tôi có thể hỗ trợ bác sĩ tra cứu nhanh về tiêu chuẩn phân loại u não (Glioma, Meningioma, Pituitary), đặc trưng chuỗi xung MRI (T1, T1ce, T2, FLAIR) và các khuyến nghị y học chứng cứ từ WHO/NCI.'
              : 'Xin chào! Tôi là **Trợ lý AI Y tế NeuroScan**. Tôi cung cấp thông tin tham khảo từ bộ câu hỏi FAQ đã kiểm duyệt về u não, giải thích thuật ngữ MRI và hướng dẫn chuẩn bị khám chuyên khoa.',
        },
      ],
    };
    this.chatSessions.unshift(session);
    return structuredClone(session);
  }

  public deleteChatSession(sessionId: string): boolean {
    const session = this.currentSession;
    if (!session) return false;
    const idx = this.chatSessions.findIndex(
      (s) => s.id === sessionId && s.ownerUserId === session.user.id,
    );
    if (idx === -1) return false;
    this.chatSessions.splice(idx, 1);
    return true;
  }

  public sendChatMessage(
    sessionId: string,
    questionText: string,
  ): { userMessage: ChatMessageRecord; assistantMessage: ChatMessageRecord } {
    const session = this.chatSessions.find((s) => s.id === sessionId);
    if (!session || this.currentSession?.user.id !== session.ownerUserId) {
      throw new Error('Không tìm thấy phiên hội thoại hoặc bạn không có quyền truy cập.');
    }

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      throw new Error('Nội dung câu hỏi không được để trống.');
    }

    const userMsg: ChatMessageRecord = {
      id: this.createId('msg-u'),
      sessionId,
      sender: 'user',
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    const normalized = this.normalizeSearchText(trimmedQuestion);
    const isDoctor = this.currentSession.user.role === 'DOCTOR';

    // 1. Kiểm tra từ khóa cấp cứu / nghiêm trọng
    const isEmergency = EMERGENCY_KEYWORDS_VI.some((kw) =>
      normalized.includes(this.normalizeSearchText(kw)),
    );
    if (isEmergency && !isDoctor) {
      const emergencyReply: ChatMessageRecord = {
        id: this.createId('msg-a'),
        sessionId,
        sender: 'assistant',
        createdAt: new Date().toISOString(),
        urgency: 'emergency',
        content:
          '### CẢNH BÁO TÌNH HUỐNG Y TẾ KHẨN CẤP\n\nCâu hỏi của bạn có đề cập đến dấu hiệu thần kinh cấp tính (như co giật, ngất/rối loạn ý thức, yếu liệt đột ngột hoặc đau đầu dữ dội đột ngột).\n\n- **Hành động ưu tiên ngay lập tức:** Vui lòng gọi **Cấp cứu 115** hoặc đưa người bệnh đến **Khoa Cấp cứu của cơ sở y tế gần nhất** để được bác sĩ can thiệp kịp thời.\n- **Nguyên tắc an toàn:** Trợ lý AI ngừng phản hồi tra cứu thông thường trong tình huống khẩn cấp và tuyệt đối không thực hiện chẩn đoán từ xa.',
        sources: [
          {
            organization: 'NHS (UK National Health Service)',
            title: 'Emergency neurological symptoms guidance',
            url: 'https://www.nhs.uk/conditions/brain-tumours/symptoms/',
            lastVerified: '2026-10-21',
            reviewStatus: 'verified',
          },
        ],
      };
      session.messages.push(emergencyReply);
      this.trimChatMessages(session);
      session.updatedAt = emergencyReply.createdAt;
      return {
        userMessage: structuredClone(userMsg),
        assistantMessage: structuredClone(emergencyReply),
      };
    }

    // 2. Đối sánh với bộ FAQ đã được kiểm duyệt
    const matchedFaq = VERIFIED_FAQ_RECORDS.find(
      (faq) =>
        this.normalizeSearchText(faq.question) === normalized ||
        faq.keywords.some((kw) => normalized.includes(this.normalizeSearchText(kw))),
    );

    let assistantReply: ChatMessageRecord;
    if (matchedFaq) {
      assistantReply = {
        id: this.createId('msg-a'),
        sessionId,
        sender: 'assistant',
        createdAt: new Date().toISOString(),
        urgency: matchedFaq.urgency,
        content: matchedFaq.answer,
        sources: [matchedFaq.source],
        linkedAnalysisId: session.linkedAnalysisId,
        linkedAnalysisLabel: session.linkedAnalysisLabel,
      };
    } else {
      assistantReply = {
        id: this.createId('msg-a'),
        sessionId,
        sender: 'assistant',
        createdAt: new Date().toISOString(),
        urgency: 'informational',
        isOutOfScope: true,
        isDemoIllustration: true,
        content: isDoctor
          ? '### Tham vấn Lâm sàng Y khoa (Chế độ Trợ lý Bác sĩ)\n\nĐối với câu hỏi chuyên sâu này, hệ thống đề xuất đối chiếu thêm hình ảnh đa chuỗi xung (T1, T1ce, T2, FLAIR) kết hợp với các chỉ số sinh học phân tử (IDH mutation, 1p/19q codeletion) theo tiêu chuẩn WHO CNS5.\n\n- Bác sĩ có thể mở chức năng **Computer Vision MRI** để trích xuất bản đồ kích hoạt nơ-ron Grad-CAM và diện tích vùng tổn thương.\n- Tài liệu đối chiếu: *WHO Classification of Tumours of the Central Nervous System (5th ed.)*.'
          : '### Thông báo giới hạn phạm vi dữ liệu (Chế độ Demo FAQ)\n\nHiện tại trong chế độ Mock Demo, Trợ lý AI **chưa có bản ghi FAQ đã kiểm duyệt** khớp chính xác với câu hỏi này.\n\n- Hệ thống tuân thủ nguyên tắc **không tự suy diễn lâm sàng và không tự bịa nguồn tài liệu y khoa** khi chưa kết nối kho dữ liệu RAG / Vector Database đã thẩm định.\n- Bạn có thể chọn một trong các câu hỏi gợi ý đã được xác minh bên dưới (về *Glioma*, *Meningioma*, *Pituitary*, *ý nghĩa chụp MRI*, *triệu chứng cần đi khám*, hoặc *chuẩn bị trước khi khám chuyên khoa*), hoặc tra cứu trực tiếp tại mục **Kiến thức y khoa**.',
      };
    }

    if (session.messages.length <= 3) {
      session.title = trimmedQuestion.slice(0, 46);
    }
    session.messages.push(assistantReply);
    this.trimChatMessages(session);
    session.updatedAt = assistantReply.createdAt;

    return {
      userMessage: structuredClone(userMsg),
      assistantMessage: structuredClone(assistantReply),
    };
  }

  public getKnowledgeArticles(includeUnpublished = false) {
    const list = includeUnpublished
      ? KNOWLEDGE_ARTICLES_DATA
      : KNOWLEDGE_ARTICLES_DATA.filter((a) => a.reviewStatus === 'verified');
    return structuredClone(list);
  }
}

export const mockStore = new InMemoryMockStore();
