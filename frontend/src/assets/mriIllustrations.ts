import type { TumorLabel } from '@/types/domain';

/**
 * Đường dẫn ảnh lát cắt MRI não thực tế từ tập dữ liệu huấn luyện (Training / Evaluation Dataset)
 * Thay thế toàn bộ hình minh họa vector SVG tổng hợp bằng ảnh quét MRI thực tế độ phân giải cao.
 */
export const SYNTHETIC_MRI_SLICES: Record<TumorLabel, string> = {
  Glioma: '/sample_scans/sample_glioma_axial.jpg',
  Meningioma: '/sample_scans/sample_glioma_axial.jpg',
  Pituitary: '/sample_scans/sample_notumor_slice2.jpg',
  'No Tumor': '/sample_scans/sample_notumor_axial.jpg',
};

export const SYNTHETIC_PREPROCESSED_ROI_GLIOMA = '/sample_scans/sample_glioma_axial.jpg';
