export type UserRole = 'USER' | 'DOCTOR';

export type TumorLabel = 'Glioma' | 'Meningioma' | 'Pituitary' | 'No Tumor';

export type DoctorReviewStatus =
  | 'NONE'
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'REVIEWED'
  | 'NEEDS_MORE_INFO';

export type AIAssessmentVerdict =
  | 'CONCORDANT'
  | 'PARTIAL_CONCORDANCE'
  | 'DISCORDANT'
  | 'INCONCLUSIVE_IMAGE';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isDemoAccount: boolean;
  organizationOrUnit?: string;
  specialty?: string;
  licenseCodeDemo?: string;
  phone?: string;
  joinedAt: string;
  preferences: {
    emailNotifications: boolean;
    doctorReviewAlerts: boolean;
    saveHistoryConsent: boolean;
    anonymizeExports: boolean;
  };
}

export interface AuthSession {
  user: UserProfile;
  accessTokenDemo: string;
  expiresAt: string;
}

export interface ClassProbabilities {
  Glioma: number;
  Meningioma: number;
  Pituitary: number;
  'No Tumor': number;
}

export interface DoctorClinicalReview {
  reviewId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  status: Exclude<DoctorReviewStatus, 'NONE'>;
  aiAssessment: AIAssessmentVerdict;
  clinicalNoteForPatient: string;
  internalTechnicalNote?: string;
  recommendedNextStep: string;
  updatedAt: string;
}

export interface PatientRecord {
  id: string;
  patientCode: string; // VD: BN-2026-001
  fullName: string;
  gender: 'Nam' | 'Nữ' | 'Khác';
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  phone: string;
  email?: string;
  address?: string;
  medicalHistory?: string; // Tiền sử bệnh
  symptomsInitial?: string; // Triệu chứng ban đầu
  assignedDoctorId: string;
  assignedDoctorName: string;
  linkedUserId?: string; // Liên kết với tài khoản USER (ví dụ 'usr-demo-patient-01')
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientPayload {
  fullName: string;
  gender: 'Nam' | 'Nữ' | 'Khác';
  dateOfBirth: string;
  phone: string;
  email?: string;
  address?: string;
  medicalHistory?: string;
  symptomsInitial?: string;
  linkedUserId?: string;
}

export interface UpdatePatientPayload extends Partial<CreatePatientPayload> {
  id: string;
}

export interface MRIAnalysisRecord {
  id: string;
  sessionCode: string;
  ownerUserId: string;
  ownerDisplayCode: string;
  /** Vai trò của người upload: USER (bệnh nhân) hoặc DOCTOR (bác sĩ phân tích Computer Vision) */
  uploadedByRole?: 'USER' | 'DOCTOR';
  /** Liên kết trực tiếp với hồ sơ bệnh nhân trong danh sách khách hàng */
  patientId?: string;
  uploadedDoctorId?: string;
  uploadedDoctorName?: string;
  /** Chỉ giữ trong bộ nhớ phiên Demo để người dùng có thể chủ động xuất tên gốc. */
  originalFileName?: string;
  sanitizedFileName: string;
  fileFormat: 'PNG' | 'JPG' | 'JPEG' | 'SVG';
  fileSizeBytes: number;
  imageDimensions: {
    width: number;
    height: number;
  };
  createdAt: string;
  isDemoFixture: boolean;
  /** SVG data URL or safe local illustration representing MRI slice */
  imageUrl: string;
  /** Only populated if Backend AI Service actually returns preprocessed ROI/CLAHE image */
  preprocessedImageUrl: string | null;
  /** Only populated if Backend AI Service actually returns Grad-CAM heatmap */
  gradcamUrl: string | null;
  predictedLabel: TumorLabel;
  /** Model confidence score [0..1], explicitly NOT diagnostic probability */
  confidenceScore: number | null;
  probabilities: ClassProbabilities | null;
  modelMetadata: {
    modelVersion: string;
    pipelineMode: 'MOCK_FIXTURE' | 'BACKEND_INFERENCE';
    preprocessingApplied: string[];
    inferenceTimeMs?: number;
  };
  patientSharedConsent: boolean;
  patientSymptomNote?: string;
  sharedWithDoctorAt?: string;
  reviewStatus: DoctorReviewStatus;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  doctorReview?: DoctorClinicalReview;
}

export type UrgencyLevel =
  | 'emergency'
  | 'prompt_evaluation'
  | 'routine_or_prompt_evaluation'
  | 'informational';

export type ContentReviewStatus = 'verified' | 'pending' | 'demo_illustration';

export interface KnowledgeSourceMetadata {
  organization: string;
  title: string;
  url: string;
  lastVerified: string;
  reviewStatus: ContentReviewStatus;
}

export type KnowledgeCategoryKey =
  | 'symptoms'
  | 'tumor_classification'
  | 'mri_ai_explanation'
  | 'treatment_care'
  | 'faq_visit_guide'
  | 'prevention_risk'
  | 'sources_safety';

export interface FAQKnowledgeRecord {
  id: string;
  category: KnowledgeCategoryKey;
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
  urgency: UrgencyLevel;
  source: KnowledgeSourceMetadata;
  language: 'vi';
  reviewStatus: ContentReviewStatus;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  sender: 'user' | 'assistant';
  content: string;
  createdAt: string;
  urgency?: UrgencyLevel;
  isOutOfScope?: boolean;
  isDemoIllustration?: boolean;
  sources?: KnowledgeSourceMetadata[];
  linkedAnalysisId?: string;
  linkedAnalysisLabel?: TumorLabel;
}

export interface ChatSessionRecord {
  id: string;
  ownerUserId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  linkedAnalysisId?: string;
  linkedAnalysisSessionCode?: string;
  linkedAnalysisLabel?: TumorLabel;
  messages: ChatMessageRecord[];
}

export interface KnowledgeArticle {
  id: string;
  slug: string;
  category: KnowledgeCategoryKey;
  title: string;
  summary: string;
  readingTimeMinutes: number;
  sections: {
    heading: string;
    body: string;
    bulletPoints?: string[];
  }[];
  clinicalTakeaway: string;
  keywords: string[];
  urgency: UrgencyLevel;
  source: KnowledgeSourceMetadata;
  reviewStatus: ContentReviewStatus;
  relatedArticleIds: string[];
}

export interface CreateAnalysisPayload {
  file: File;
  consentAccepted: boolean;
  symptomNote?: string;
  selectedDemoPresetId?: string;
  imageDimensions?: {
    width: number;
    height: number;
  };
  /** Bác sĩ có thể gán ca phân tích cho bệnh nhân cụ thể */
  targetPatientId?: string;
}

export interface RequestDoctorReviewPayload {
  analysisId: string;
  consentToShareWithDoctor: boolean;
  patientSymptomNote: string;
}

export interface SubmitDoctorReviewPayload {
  analysisId: string;
  status: Exclude<DoctorReviewStatus, 'NONE'>;
  aiAssessment: AIAssessmentVerdict;
  clinicalNoteForPatient: string;
  internalTechnicalNote?: string;
  recommendedNextStep: string;
}
