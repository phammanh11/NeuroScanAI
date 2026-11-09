export type UserRole = 'patient' | 'doctor' | 'admin' | 'USER' | 'DOCTOR' | 'ADMIN';
export type TumorLabel = 'Glioma' | 'Meningioma' | 'Pituitary' | 'No Tumor';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'patient' | 'doctor' | 'admin';
  created_at: string;
  updated_at?: string;
  specialty?: string;
  license_no?: string;
  organization?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface PatientProfile {
  user_id: number;
  date_of_birth?: string;
  phone?: string;
  gender?: string;
  address?: string;
  medical_history?: string;
  emergency_contact?: string;
  created_at: string;
  updated_at?: string;
}

export interface DoctorProfile {
  user_id: number;
  specialty?: string;
  license_no?: string;
  organization?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

export interface MriScan {
  id: number;
  patient_id: number;
  r2_key: string;
  uploaded_at: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  slice_type: string;
  sequence_type: string;
  file_url?: string;
  patient_name?: string;
}

export interface PredictionProbabilities {
  Glioma: number;
  Meningioma: number;
  Pituitary: number;
  'No Tumor': number;
}

export interface Prediction {
  id: number;
  scan_id: number;
  label: TumorLabel;
  confidence: number;
  probabilities: string | PredictionProbabilities;
  model_version: string;
  inference_time_ms: number;
  created_at: string;
  scan?: MriScan;
  review?: DoctorReview | null;
}

export interface DoctorReview {
  id: number;
  prediction_id: number;
  doctor_id: number;
  confirmed_label: TumorLabel;
  note: string;
  ai_assessment?: 'CONCORDANT' | 'PARTIAL_CONCORDANCE' | 'DISCORDANT';
  recommended_step?: string;
  created_at: string;
  updated_at?: string;
  doctor_name?: string;
}

export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  linked_prediction_id?: number | null;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  sender: 'user' | 'bot' | 'assistant';
  content: string;
  is_emergency?: number;
  sources_json?: string;
  created_at: string;
}

export interface FaqDocument {
  id: number;
  title: string;
  content: string;
  source: string;
  category: string;
  created_at?: string;
  updated_at?: string;
  similarity?: number;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface MatchedScanSummary {
  id: number | string;
  sessionCode: string;
  patientCode: string;
  patientName: string;
  predictedLabel: TumorLabel;
  confidence: number;
  reviewStatus: string;
  doctorName: string;
  doctorNote: string;
  imageUrl: string;
  createdAt: string;
}

export interface RagTraceInfo {
  pipeline: string;
  embeddingModel: string;
  llmModel: string;
  vectorBackend: string;
  totalChunksIndexed: number;
  topChunks: Array<{
    id: string | number;
    title: string;
    category: string;
    source?: string;
    similarity?: number;
    score?: number;
  }>;
}

export interface ChatResponseData {
  reply: string;
  intent: string;
  isEmergency: boolean;
  urgency?: 'emergency' | 'prompt_evaluation' | 'routine_or_prompt_evaluation' | 'informational';
  emergencyInstructions?: string;
  ragTrace?: RagTraceInfo;
  matchedScans?: MatchedScanSummary[];
  sources?: Array<{
    title: string;
    source: string;
    category: string;
    organization?: string;
    url?: string;
  }>;
  suggestions?: string[];
}
