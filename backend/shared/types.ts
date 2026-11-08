export type UserRole = 'DOCTOR' | 'USER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  specialty?: string;
  organization?: string;
  license_code?: string;
  phone?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: number;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  clinical_history?: string;
  symptoms?: string;
  status: string;
  last_scan_date?: string;
  created_at: string;
  updated_at: string;
}

export type ScanStatus = 'PENDING_MODEL' | 'ANALYZED' | 'REVIEWED';

export interface MriScan {
  id: number;
  scan_code: string;
  patient_id?: number;
  patient_name: string;
  file_name: string;
  file_key: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  slice_type: string;
  sequence_type: string;
  status: ScanStatus;
  predicted_label?: string | null;
  confidence?: number | null;
  probabilities_json?: string | null;
  findings_summary?: string;
  doctor_notes?: string;
  doctor_approved: number;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RagChunk {
  id?: number;
  chunk_id: string;
  title: string;
  category: string;
  content: string;
  source: string;
  embedding_model?: string;
  embedding_dim?: number;
  embedding_json?: string;
  similarity?: number;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface RagTraceInfo {
  pipeline: string;
  embeddingModel: string;
  llmModel: string;
  vectorBackend: string;
  totalChunksIndexed: number;
  topChunks: Array<{
    chunk_id: string;
    title: string;
    category: string;
    source: string;
    similarity?: number;
  }>;
}

export interface ChatResponseData {
  reply: string;
  intent: 'medical_info' | 'emergency_alert' | 'general' | 'patient_lookup';
  isEmergency: boolean;
  emergencyInstructions?: string;
  ragTrace?: RagTraceInfo;
  sources?: Array<{
    title: string;
    source: string;
    category: string;
  }>;
  suggestions: string[];
}
