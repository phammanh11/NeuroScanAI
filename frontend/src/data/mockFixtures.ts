import type {
  MRIAnalysisRecord,
  PatientRecord,
  TumorLabel,
  UserProfile,
} from '@/types/domain';

export const DEMO_USERS: Record<'USER' | 'DOCTOR', UserProfile> = {
  USER: {
    id: '2',
    email: 'demo.user@neuroscan.vn',
    fullName: 'Nguyễn Minh An',
    role: 'USER',
    isDemoAccount: false,
    organizationOrUnit: 'Bệnh nhân khám ngoại trú',
    phone: '0912 345 678',
    joinedAt: '2026-09-15T08:30:00.000Z',
    preferences: {
      emailNotifications: true,
      doctorReviewAlerts: true,
      saveHistoryConsent: true,
      anonymizeExports: true,
    },
  },
  DOCTOR: {
    id: '1',
    email: 'demo.doctor@neuroscan.vn',
    fullName: 'BS.CKII Trần Quốc Bảo',
    role: 'DOCTOR',
    isDemoAccount: false,
    organizationOrUnit: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
    specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
    licenseCodeDemo: 'CCHN-2026-NEURO-8841',
    phone: '0909 000 222',
    joinedAt: '2026-08-01T08:00:00.000Z',
    preferences: {
      emailNotifications: true,
      doctorReviewAlerts: true,
      saveHistoryConsent: true,
      anonymizeExports: true,
    },
  },
};

export interface DemoUploadFixturePreset {
  id: string;
  title: string;
  label: TumorLabel;
  description: string;
  confidenceScore: number;
  probabilities: {
    Glioma: number;
    Meningioma: number;
    Pituitary: number;
    'No Tumor': number;
  };
  hasPreprocessedDemo: boolean;
}

/**
 * Các bộ kết quả tham chiếu tiêu chuẩn (Reference Clinical Presets)
 */
export const DEMO_UPLOAD_FIXTURE_PRESETS: DemoUploadFixturePreset[] = [
  {
    id: 'fixture-glioma',
    title: 'Mẫu tham chiếu A — Glioma (U thần kinh đệm thùy trán)',
    label: 'Glioma',
    description: 'Lát cắt Axial T1-Gd có tiêm đối quang từ ghi nhận tổn thương ngấm thuốc dạng viền thùy trán.',
    confidenceScore: 0.892,
    probabilities: {
      Glioma: 0.892,
      Meningioma: 0.054,
      Pituitary: 0.021,
      'No Tumor': 0.033,
    },
    hasPreprocessedDemo: true,
  },
  {
    id: 'fixture-meningioma',
    title: 'Mẫu tham chiếu B — Meningioma (U màng não ngoài trục)',
    label: 'Meningioma',
    description: 'Lát cắt Sagittal T1-Gd ghi nhận khối ngoài trục bắt thuốc mạnh kèm dấu hiệu đuôi màng cứng.',
    confidenceScore: 0.865,
    probabilities: {
      Glioma: 0.048,
      Meningioma: 0.865,
      Pituitary: 0.032,
      'No Tumor': 0.055,
    },
    hasPreprocessedDemo: false,
  },
  {
    id: 'fixture-pituitary',
    title: 'Mẫu tham chiếu C — Pituitary (U tuyến yên hố yên)',
    label: 'Pituitary',
    description: 'Lát cắt Coronal T1 ghi nhận khối phì đại tuyến yên trong hố yên có chèn ép giao thoa thị giác.',
    confidenceScore: 0.912,
    probabilities: {
      Glioma: 0.025,
      Meningioma: 0.035,
      Pituitary: 0.912,
      'No Tumor': 0.028,
    },
    hasPreprocessedDemo: false,
  },
  {
    id: 'fixture-notumor',
    title: 'Mẫu tham chiếu D — No Tumor (Nhu mô não bình thường)',
    label: 'No Tumor',
    description: 'Lát cắt Axial T2-FLAIR không ghi nhận khối choán chỗ, não thất cân đối, không phù não.',
    confidenceScore: 0.941,
    probabilities: {
      Glioma: 0.012,
      Meningioma: 0.018,
      Pituitary: 0.029,
      'No Tumor': 0.941,
    },
    hasPreprocessedDemo: false,
  },
];

/**
 * Danh sách Bệnh nhân ban đầu (Patient Records) đồng bộ với bảng patients trong Database
 */
export const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: 'pat-001',
    patientCode: 'BN-2026-001',
    fullName: 'Nguyễn Minh An',
    gender: 'Nam',
    dateOfBirth: '1992-05-14',
    age: 34,
    phone: '0912 345 678',
    email: 'demo.user@neuroscan.vn',
    address: 'Quận 1, TP. Hồ Chí Minh',
    medicalHistory: 'Đau đầu âm ỉ vùng thái dương trái 3 tuần, huyết áp bình thường, không tiền sử co giật.',
    symptomsInitial: 'Thường xuyên đau nửa đầu về chiều, đôi khi mỏi mắt khi tập trung làm việc.',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
    linkedUserId: 'usr-demo-patient-01',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-21T10:00:00.000Z',
  },
  {
    id: 'pat-002',
    patientCode: 'BN-2026-002',
    fullName: 'Trần Thị Mai',
    gender: 'Nữ',
    dateOfBirth: '1978-08-22',
    age: 48,
    phone: '0912 345 678',
    email: 'mai.tran@example.com',
    address: 'Cầu Giấy, Hà Nội',
    medicalHistory: 'Theo dõi u màng não nhỏ ngoài trục vùng đỉnh phải 2 năm định kỳ.',
    symptomsInitial: 'Chóng mặt nhẹ khi đổi tư thế đột ngột, thị lực hai mắt bình thường.',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
    createdAt: '2026-10-18T09:30:00.000Z',
    updatedAt: '2026-10-22T14:15:00.000Z',
  },
  {
    id: 'pat-003',
    patientCode: 'BN-2026-003',
    fullName: 'Hoàng Văn Đức',
    gender: 'Nam',
    dateOfBirth: '1971-11-03',
    age: 55,
    phone: '0988 777 666',
    email: 'duc.hoang@example.com',
    address: 'Hải Châu, Đà Nẵng',
    medicalHistory: 'Tăng huyết áp 5 năm đang điều trị, hút thuốc lá 20 năm.',
    symptomsInitial: 'Đau đầu tăng dần kèm buồn nôn, tê bì nhẹ bàn tay phải buổi sáng.',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
    createdAt: '2026-10-16T11:00:00.000Z',
    updatedAt: '2026-10-20T16:45:00.000Z',
  },
  {
    id: 'pat-004',
    patientCode: 'BN-2026-004',
    fullName: 'Lê Thu Hằng',
    gender: 'Nữ',
    dateOfBirth: '1994-03-19',
    age: 32,
    phone: '0903 222 333',
    email: 'hang.le@example.com',
    address: 'Ninh Kiều, Cần Thơ',
    medicalHistory: 'Khám tầm soát kiểm tra sức khỏe tổng quát định kỳ.',
    symptomsInitial: 'Không có triệu chứng thần kinh khu trú, muốn kiểm tra hình ảnh học sọ não.',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-12T11:30:00.000Z',
  },
];

/**
 * Danh sách phiên phân tích MRI chuẩn (4 ca chụp thực tế đồng bộ với Cloudflare D1)
 */
export const INITIAL_MOCK_ANALYSES: MRIAnalysisRecord[] = [
  {
    id: '1',
    sessionCode: 'NS-2026-0001',
    ownerUserId: '2',
    ownerDisplayCode: 'BN-2026-002 (Nguyễn Minh An)',
    uploadedByRole: 'USER',
    patientId: '2',
    originalFileName: 'sample_glioma_axial.jpg',
    sanitizedFileName: 'mri_scan_1_glioma.jpg',
    fileFormat: 'JPG',
    fileSizeBytes: 22122,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-10-28T09:15:05.000Z',
    isDemoFixture: false,
    imageUrl: '/sample_scans/sample_glioma_axial.jpg',
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'Glioma',
    confidenceScore: 0.934,
    probabilities: {
      Glioma: 0.934,
      Meningioma: 0.041,
      Pituitary: 0.015,
      'No Tumor': 0.01,
    },
    modelMetadata: {
      modelVersion: 'brain_mri_student_v1_onnx',
      pipelineMode: 'CLIENT_ONNX_INFERENCE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (Otsu)',
        'CLAHE Contrast Enhancement',
        'Normalization (256x256, ImageNet mean/std)',
      ],
      inferenceTimeMs: 45,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Đau đầu âm ỉ vùng đỉnh - chẩm phải 3 tuần, nhìn mờ thoáng qua (Axial (Trục ngang) • T1-Gd (Contrast))',
    sharedWithDoctorAt: '2026-10-28T09:20:00.000Z',
    reviewStatus: 'REVIEWED',
    assignedDoctorId: '1',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
    doctorReview: {
      reviewId: '1',
      doctorId: '1',
      doctorName: 'BS.CKII Trần Quốc Bảo',
      doctorSpecialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
      status: 'REVIEWED',
      aiAssessment: 'CONCORDANT',
      clinicalNoteForPatient:
        'Vùng tổn thương nội trục ngấm thuốc dạng vòng vùng đỉnh - chẩm phải kèm hoại tử trung tâm và phù não vận mạch xung quanh, đồng thuận với dự đoán Glioma của AI.',
      recommendedNextStep:
        'Chụp bổ sung cộng hưởng từ phổ (MRS), tưới máu (Perfusion MRI) và hội chẩn Ngoại Thần kinh.',
      updatedAt: '2026-10-28T11:20:00.000Z',
    },
  },
  {
    id: '2',
    sessionCode: 'NS-2026-0002',
    ownerUserId: '4',
    ownerDisplayCode: 'BN-2026-004 (Trần Thị Mai)',
    uploadedByRole: 'DOCTOR',
    uploadedDoctorId: '1',
    uploadedDoctorName: 'BS.CKII Trần Quốc Bảo',
    patientId: '4',
    originalFileName: 'sample_meningioma_axial.jpg',
    sanitizedFileName: 'mri_scan_2_meningioma.jpg',
    fileFormat: 'JPG',
    fileSizeBytes: 41726,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-11-01T14:30:04.000Z',
    isDemoFixture: false,
    imageUrl: '/sample_scans/sample_meningioma_axial.jpg',
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'Meningioma',
    confidenceScore: 0.918,
    probabilities: {
      Glioma: 0.032,
      Meningioma: 0.918,
      Pituitary: 0.035,
      'No Tumor': 0.015,
    },
    modelMetadata: {
      modelVersion: 'brain_mri_student_v1_onnx',
      pipelineMode: 'CLIENT_ONNX_INFERENCE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (Otsu)',
        'CLAHE Contrast Enhancement',
        'Normalization (256x256, ImageNet mean/std)',
      ],
      inferenceTimeMs: 42,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Chóng mặt khi thay đổi tư thế, đau đầu vùng chẩm - nền sọ (Axial (Trục ngang) • T1-Gd (Contrast))',
    sharedWithDoctorAt: '2026-11-01T14:35:00.000Z',
    reviewStatus: 'PENDING_REVIEW',
    assignedDoctorId: '1',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
  },
  {
    id: '3',
    sessionCode: 'NS-2026-0003',
    ownerUserId: '5',
    ownerDisplayCode: 'BN-2026-005 (Hoàng Văn Đức)',
    uploadedByRole: 'DOCTOR',
    uploadedDoctorId: '1',
    uploadedDoctorName: 'BS.CKII Trần Quốc Bảo',
    patientId: '5',
    originalFileName: 'sample_pituitary_coronal.jpg',
    sanitizedFileName: 'mri_scan_3_pituitary.jpg',
    fileFormat: 'JPG',
    fileSizeBytes: 38936,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-11-04T11:20:03.000Z',
    isDemoFixture: false,
    imageUrl: '/sample_scans/sample_pituitary_coronal.jpg',
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'Pituitary',
    confidenceScore: 0.905,
    probabilities: {
      Glioma: 0.024,
      Meningioma: 0.048,
      Pituitary: 0.905,
      'No Tumor': 0.023,
    },
    modelMetadata: {
      modelVersion: 'brain_mri_student_v1_onnx',
      pipelineMode: 'CLIENT_ONNX_INFERENCE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (Otsu)',
        'CLAHE Contrast Enhancement',
        'Normalization (256x256, ImageNet mean/std)',
      ],
      inferenceTimeMs: 39,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Giảm thị lực hai bên thái dương tiến triển 2 tháng (Coronal (Đứng ngang) • T1-Gd (Contrast))',
    sharedWithDoctorAt: '2026-11-04T11:25:00.000Z',
    reviewStatus: 'PENDING_REVIEW',
    assignedDoctorId: '1',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
  },
  {
    id: '4',
    sessionCode: 'NS-2026-0004',
    ownerUserId: '2',
    ownerDisplayCode: 'BN-2026-002 (Nguyễn Minh An)',
    uploadedByRole: 'USER',
    patientId: '2',
    originalFileName: 'sample_notumor_axial.jpg',
    sanitizedFileName: 'mri_scan_4_notumor.jpg',
    fileFormat: 'JPG',
    fileSizeBytes: 8456,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-11-05T10:00:03.000Z',
    isDemoFixture: false,
    imageUrl: '/sample_scans/sample_notumor_axial.jpg',
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'No Tumor',
    confidenceScore: 0.968,
    probabilities: {
      Glioma: 0.008,
      Meningioma: 0.012,
      Pituitary: 0.012,
      'No Tumor': 0.968,
    },
    modelMetadata: {
      modelVersion: 'brain_mri_student_v1_onnx',
      pipelineMode: 'CLIENT_ONNX_INFERENCE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (Otsu)',
        'CLAHE Contrast Enhancement',
        'Normalization (256x256, ImageNet mean/std)',
      ],
      inferenceTimeMs: 38,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Lát cắt đối chứng kiểm tra nhu mô não ngang não thất bên (Axial (Trục ngang) • T2-FLAIR)',
    sharedWithDoctorAt: '2026-11-05T10:05:00.000Z',
    reviewStatus: 'PENDING_REVIEW',
    assignedDoctorId: '1',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo',
  },
];

export const DEMO_USAGE_HISTORY_SERIES = [
  { period: 'Tuần 1', analysesCount: 3, chatQueries: 7 },
  { period: 'Tuần 2', analysesCount: 5, chatQueries: 11 },
  { period: 'Tuần 3', analysesCount: 4, chatQueries: 9 },
  { period: 'Tuần 4', analysesCount: 6, chatQueries: 14 },
  { period: 'Tuần 5', analysesCount: 5, chatQueries: 12 },
  { period: 'Tuần 6', analysesCount: 7, chatQueries: 16 },
];
