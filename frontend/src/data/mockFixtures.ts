import {
  SYNTHETIC_MRI_SLICES,
  SYNTHETIC_PREPROCESSED_ROI_GLIOMA,
} from '@/assets/mriIllustrations';
import type {
  MRIAnalysisRecord,
  PatientRecord,
  TumorLabel,
  UserProfile,
} from '@/types/domain';

export const DEMO_USERS: Record<'USER' | 'DOCTOR', UserProfile> = {
  USER: {
    id: 'usr-demo-patient-01',
    email: 'demo.user@neuroscan.vn',
    fullName: 'Nguyễn Minh An (Tài khoản Giả lập)',
    role: 'USER',
    isDemoAccount: true,
    organizationOrUnit: 'Người dùng cá nhân / Bệnh nhân theo dõi (Demo)',
    phone: '0901 000 111',
    joinedAt: '2026-09-15T08:30:00.000Z',
    preferences: {
      emailNotifications: true,
      doctorReviewAlerts: true,
      saveHistoryConsent: true,
      anonymizeExports: true,
    },
  },
  DOCTOR: {
    id: 'doc-demo-specialist-01',
    email: 'demo.doctor@neuroscan.vn',
    fullName: 'BS.CKII Trần Quốc Bảo (Tài khoản Giả lập)',
    role: 'DOCTOR',
    isDemoAccount: true,
    organizationOrUnit: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh (Đơn vị Minh họa)',
    specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
    licenseCodeDemo: 'DEMO-CCHN-2026-8841',
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
 * Các bộ kết quả cố định (Deterministic Fixtures) sử dụng trong Mock Mode.
 * Tuyệt đối không dùng Math.random() hay đoán từ tên file/màu sắc ảnh để tạo kết quả lâm sàng.
 */
export const DEMO_UPLOAD_FIXTURE_PRESETS: DemoUploadFixturePreset[] = [
  {
    id: 'fixture-glioma',
    title: 'Mẫu minh họa A — Nhãn Glioma (Có ảnh tiền xử lý ROI/CLAHE demo)',
    label: 'Glioma',
    description:
      'Fixture cố định minh họa trường hợp mô hình trả về nhãn dự đoán cao nhất ở lớp Glioma kèm ảnh so sánh tiền xử lý ROI.',
    confidenceScore: 0.89,
    probabilities: {
      Glioma: 0.89,
      Meningioma: 0.07,
      Pituitary: 0.02,
      'No Tumor': 0.02,
    },
    hasPreprocessedDemo: true,
  },
  {
    id: 'fixture-meningioma',
    title: 'Mẫu minh họa B — Nhãn Meningioma',
    label: 'Meningioma',
    description:
      'Fixture cố định minh họa trường hợp mô hình trả về nhãn dự đoán cao nhất ở lớp Meningioma.',
    confidenceScore: 0.86,
    probabilities: {
      Glioma: 0.08,
      Meningioma: 0.86,
      Pituitary: 0.04,
      'No Tumor': 0.02,
    },
    hasPreprocessedDemo: false,
  },
  {
    id: 'fixture-pituitary',
    title: 'Mẫu minh họa C — Nhãn Pituitary',
    label: 'Pituitary',
    description:
      'Fixture cố định minh họa trường hợp mô hình trả về nhãn dự đoán cao nhất ở lớp Pituitary.',
    confidenceScore: 0.91,
    probabilities: {
      Glioma: 0.03,
      Meningioma: 0.04,
      Pituitary: 0.91,
      'No Tumor': 0.02,
    },
    hasPreprocessedDemo: false,
  },
  {
    id: 'fixture-notumor',
    title: 'Mẫu minh họa D — Nhãn No Tumor',
    label: 'No Tumor',
    description:
      'Fixture cố định minh họa trường hợp không phát hiện dấu hiệu thuộc 3 lớp u trên lát cắt tham chiếu.',
    confidenceScore: 0.94,
    probabilities: {
      Glioma: 0.02,
      Meningioma: 0.02,
      Pituitary: 0.02,
      'No Tumor': 0.94,
    },
    hasPreprocessedDemo: false,
  },
];

/**
 * Danh sách Bệnh nhân / Khách hàng ban đầu (Patient Records) dành cho Bác sĩ quản lý
 */
export const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: 'pat-001',
    patientCode: 'BN-2026-001',
    fullName: 'Nguyễn Minh An',
    gender: 'Nam',
    dateOfBirth: '1992-05-14',
    age: 34,
    phone: '0901 000 111',
    email: 'demo.user@neuroscan.vn',
    address: 'Quận 1, TP. Hồ Chí Minh',
    medicalHistory: 'Đau đầu âm ỉ vùng thái dương trái 3 tuần, huyết áp bình thường, không tiền sử co giật.',
    symptomsInitial: 'Thường xuyên đau nửa đầu về chiều, đôi khi mỏi mắt khi tập trung làm việc.',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
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
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
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
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
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
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-12T11:30:00.000Z',
  },
];

export const INITIAL_MOCK_ANALYSES: MRIAnalysisRecord[] = [
  {
    id: 'ana-demo-1001',
    sessionCode: 'NS-2026-1001',
    ownerUserId: 'usr-demo-patient-01',
    ownerDisplayCode: 'BN-2026-001 (Nguyễn Minh An)',
    uploadedByRole: 'USER',
    patientId: 'pat-001',
    sanitizedFileName: 'mri_anon_axial_t1ce_01.png',
    fileFormat: 'PNG',
    fileSizeBytes: 428_500,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-10-20T09:15:00.000Z',
    isDemoFixture: true,
    imageUrl: SYNTHETIC_MRI_SLICES.Glioma,
    preprocessedImageUrl: SYNTHETIC_PREPROCESSED_ROI_GLIOMA,
    gradcamUrl: null,
    predictedLabel: 'Glioma',
    confidenceScore: 0.89,
    probabilities: {
      Glioma: 0.89,
      Meningioma: 0.07,
      Pituitary: 0.02,
      'No Tumor': 0.02,
    },
    modelMetadata: {
      modelVersion: 'Computer Vision Multi-Backbone (ConvNeXt + SwinV2)',
      pipelineMode: 'MOCK_FIXTURE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (OpenCV Otsu)',
        'CLAHE Adaptive Histogram Equalization',
        'Z-score Signal Normalization',
      ],
      inferenceTimeMs: 420,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Đau đầu âm ỉ vùng thái dương trái khoảng 3 tuần nay, đôi khi mỏi mắt khi tập trung lâu (Dữ liệu giả lập).',
    sharedWithDoctorAt: '2026-10-20T09:25:00.000Z',
    reviewStatus: 'REVIEWED',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
    doctorReview: {
      reviewId: 'rev-demo-501',
      doctorId: 'doc-demo-specialist-01',
      doctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
      doctorSpecialty: 'Chẩn đoán hình ảnh Thần kinh',
      status: 'REVIEWED',
      aiAssessment: 'PARTIAL_CONCORDANCE',
      clinicalNoteForPatient:
        '[Nhận xét chuyên môn] Lát cắt đơn lẻ ghi nhận vùng thay đổi tín hiệu nhu mô bán cầu trái tương ứng với vùng mô hình AI gợi ý (Glioma). Tuy nhiên, một lát cắt 2D không đủ cơ sở chẩn đoán xác định. Bác sĩ khuyến nghị bạn mang đĩa DICOM đầy đủ các chuỗi xung (T1, T1ce, T2, FLAIR) đến khám trực tiếp tại Khoa Ngoại Thần kinh.',
      internalTechnicalNote:
        'Cần kiểm tra thêm chuỗi FLAIR và T1 có tiêm đối quang từ trên PACS để đánh giá ranh giới ngấm thuốc và phù quanh tổn thương.',
      recommendedNextStep:
        'Khám chuyên khoa Ngoại Thần kinh và mang theo toàn bộ dữ liệu gốc DICOM.',
      updatedAt: '2026-10-20T14:10:00.000Z',
    },
  },
  {
    id: 'ana-demo-1002',
    sessionCode: 'NS-2026-1002',
    ownerUserId: 'usr-demo-patient-01',
    ownerDisplayCode: 'BN-2026-001 (Nguyễn Minh An)',
    uploadedByRole: 'USER',
    patientId: 'pat-001',
    sanitizedFileName: 'mri_anon_dural_slice_02.jpg',
    fileFormat: 'JPG',
    fileSizeBytes: 382_120,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-10-21T07:40:00.000Z',
    isDemoFixture: true,
    imageUrl: SYNTHETIC_MRI_SLICES.Meningioma,
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'Meningioma',
    confidenceScore: 0.86,
    probabilities: {
      Glioma: 0.08,
      Meningioma: 0.86,
      Pituitary: 0.04,
      'No Tumor': 0.02,
    },
    modelMetadata: {
      modelVersion: 'Computer Vision Multi-Backbone (ConvNeXt + SwinV2)',
      pipelineMode: 'MOCK_FIXTURE',
      preprocessingApplied: ['Resize 384x384 (Minh họa)'],
      inferenceTimeMs: 390,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Tình cờ chụp kiểm tra sức khỏe định kỳ, hiện không có triệu chứng yếu liệt tay chân (Dữ liệu giả lập).',
    sharedWithDoctorAt: '2026-10-21T08:00:00.000Z',
    reviewStatus: 'PENDING_REVIEW',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
  },
  {
    id: 'ana-demo-1003',
    sessionCode: 'NS-2026-1003',
    ownerUserId: 'usr-demo-patient-01',
    ownerDisplayCode: 'BN-2026-001 (Nguyễn Minh An)',
    uploadedByRole: 'DOCTOR', // Ca do Bác sĩ trực tiếp upload bằng Computer Vision cho bệnh nhân!
    uploadedDoctorId: 'doc-demo-specialist-01',
    uploadedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
    patientId: 'pat-001',
    sanitizedFileName: 'mri_vision_doc_coronal_sellar.png',
    fileFormat: 'PNG',
    fileSizeBytes: 395_400,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-10-22T10:15:00.000Z',
    isDemoFixture: true,
    imageUrl: SYNTHETIC_MRI_SLICES.Pituitary,
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'Pituitary',
    confidenceScore: 0.91,
    probabilities: {
      Glioma: 0.03,
      Meningioma: 0.04,
      Pituitary: 0.91,
      'No Tumor': 0.02,
    },
    modelMetadata: {
      modelVersion: 'Clinical Computer Vision Lab v2.0 (FastAPI Pipeline)',
      pipelineMode: 'MOCK_FIXTURE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (Bác sĩ upload)',
        'CLAHE Signal Equalization',
        'Z-score Multi-scanner Normalization',
      ],
      inferenceTimeMs: 410,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Bác sĩ Bảo trực tiếp tải lên lát cắt Coronal vùng hố yên để phân tích Computer Vision và đánh giá chuyên môn cho bệnh nhân Nguyễn Minh An.',
    sharedWithDoctorAt: '2026-10-22T10:20:00.000Z',
    reviewStatus: 'REVIEWED',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
    doctorReview: {
      reviewId: 'rev-demo-502',
      doctorId: 'doc-demo-specialist-01',
      doctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
      doctorSpecialty: 'Chẩn đoán hình ảnh Thần kinh',
      status: 'REVIEWED',
      aiAssessment: 'CONCORDANT',
      clinicalNoteForPatient:
        '[Đánh giá do Bác sĩ tải ảnh & phân tích]: Hình ảnh lát cắt coronal qua hố yên ghi nhận sự dày khu trú nhẹ vùng tuyến yên, tương đồng với phân loại của Computer Vision. Bệnh nhân không cần quá lo lắng, nên sắp xếp đo thị trường mắt và xét nghiệm bộ hormone tuyến yên (Prolactin, ACTH) tại bệnh viện.',
      internalTechnicalNote:
        'Khối khu trú vùng hố yên khá rõ trên mặt phẳng coronal minh họa. Cần thêm xét nghiệm Prolactin, Cortisol, TSH, IGF-1.',
      recommendedNextStep:
        'Đo thị trường chu biên mắt và xét nghiệm kiểm tra bộ hormone tuyến yên định kỳ.',
      updatedAt: '2026-10-22T11:00:00.000Z',
    },
  },
  {
    id: 'ana-demo-1004',
    sessionCode: 'NS-2026-1004',
    ownerUserId: 'usr-demo-patient-01',
    ownerDisplayCode: 'BN-2026-001 (Nguyễn Minh An)',
    uploadedByRole: 'USER',
    patientId: 'pat-001',
    sanitizedFileName: 'mri_anon_axial_check_04.png',
    fileFormat: 'PNG',
    fileSizeBytes: 350_000,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-10-12T11:05:00.000Z',
    isDemoFixture: true,
    imageUrl: SYNTHETIC_MRI_SLICES['No Tumor'],
    preprocessedImageUrl: null,
    gradcamUrl: null,
    predictedLabel: 'No Tumor',
    confidenceScore: 0.94,
    probabilities: {
      Glioma: 0.02,
      Meningioma: 0.02,
      Pituitary: 0.02,
      'No Tumor': 0.94,
    },
    modelMetadata: {
      modelVersion: 'Mock-Fixture-v1.0 (Chưa kết nối PyTorch)',
      pipelineMode: 'MOCK_FIXTURE',
      preprocessingApplied: ['Resize 384x384 (Minh họa)'],
      inferenceTimeMs: 365,
    },
    patientSharedConsent: false,
    reviewStatus: 'NONE',
  },
  {
    id: 'ana-demo-1005',
    sessionCode: 'NS-2026-1005',
    ownerUserId: 'usr-demo-patient-03',
    ownerDisplayCode: 'BN-2026-003 (Hoàng Văn Đức)',
    uploadedByRole: 'DOCTOR',
    uploadedDoctorId: 'doc-demo-specialist-01',
    uploadedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
    patientId: 'pat-003',
    sanitizedFileName: 'mri_vision_doc_referral_duc.jpg',
    fileFormat: 'JPG',
    fileSizeBytes: 412_900,
    imageDimensions: { width: 512, height: 512 },
    createdAt: '2026-10-16T13:30:00.000Z',
    isDemoFixture: true,
    imageUrl: SYNTHETIC_MRI_SLICES.Glioma,
    preprocessedImageUrl: SYNTHETIC_PREPROCESSED_ROI_GLIOMA,
    gradcamUrl: null,
    predictedLabel: 'Glioma',
    confidenceScore: 0.78,
    probabilities: {
      Glioma: 0.78,
      Meningioma: 0.16,
      Pituitary: 0.03,
      'No Tumor': 0.03,
    },
    modelMetadata: {
      modelVersion: 'Computer Vision Multi-Backbone (ConvNeXt + SwinV2)',
      pipelineMode: 'MOCK_FIXTURE',
      preprocessingApplied: [
        'Brain Contour ROI Cropping (Minh họa)',
        'CLAHE Adaptive Histogram (Minh họa)',
      ],
      inferenceTimeMs: 440,
    },
    patientSharedConsent: true,
    patientSymptomNote:
      'Bác sĩ tải ảnh lên phân tích Computer Vision: Nghi ngờ tổn thương lan tỏa bán cầu trái, cần đối chiếu chuỗi xung FLAIR/T2.',
    sharedWithDoctorAt: '2026-10-16T14:00:00.000Z',
    reviewStatus: 'NEEDS_MORE_INFO',
    assignedDoctorId: 'doc-demo-specialist-01',
    assignedDoctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
    doctorReview: {
      reviewId: 'rev-demo-503',
      doctorId: 'doc-demo-specialist-01',
      doctorName: 'BS.CKII Trần Quốc Bảo (Demo)',
      doctorSpecialty: 'Chẩn đoán hình ảnh Thần kinh',
      status: 'NEEDS_MORE_INFO',
      aiAssessment: 'INCONCLUSIVE_IMAGE',
      clinicalNoteForPatient:
        '[Nhận xét chuyên môn] Ảnh lát cắt đơn lẻ cho thấy độ tin cậy AI phân tán (78% Glioma vs 16% Meningioma). Bác sĩ yêu cầu bệnh nhân cần bổ sung chuỗi xung T2/FLAIR và chụp có tiêm thuốc đối quang từ trước khi đưa ra kết luận.',
      internalTechnicalNote:
        'Xác suất AI phân tán giữa Glioma (78%) và Meningioma (16%). Cần chuỗi xung đa mặt phẳng.',
      recommendedNextStep:
        'Bổ sung hồ sơ hình ảnh DICOM đầy đủ hoặc chụp lại MRI có tiêm đối quang từ.',
      updatedAt: '2026-10-17T09:15:00.000Z',
    },
  },
];

export const DEMO_USAGE_HISTORY_SERIES = [
  { period: 'Tuần 1 (Demo)', analysesCount: 3, chatQueries: 7 },
  { period: 'Tuần 2 (Demo)', analysesCount: 5, chatQueries: 11 },
  { period: 'Tuần 3 (Demo)', analysesCount: 4, chatQueries: 9 },
  { period: 'Tuần 4 (Demo)', analysesCount: 6, chatQueries: 14 },
  { period: 'Tuần 5 (Demo)', analysesCount: 5, chatQueries: 12 },
  { period: 'Tuần 6 (Demo)', analysesCount: 7, chatQueries: 16 },
];
