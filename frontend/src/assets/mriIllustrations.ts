import type { TumorLabel } from '../types/domain';

/**
 * Thư viện ảnh lát cắt MRI sọ não thực tế phục vụ tham chiếu lâm sàng & kiểm thử Computer Vision.
 * Gồm 4 phân nhóm chuẩn WHO CNS5:
 * - Glioma: Axial T1+C tổn thương ngấm thuốc dạng vòng vùng đỉnh - chẩm phải kèm hoại tử trung tâm
 * - Meningioma: Axial T1+C khối choán chỗ ngoài trục bám màng cứng vùng trước cầu não - nền sọ
 * - Pituitary: Coronal T1+C u tuyến yên vùng hố yên mở rộng lồi lên bể trên yên
 * - No Tumor: Axial FLAIR/T2 nhu mô não bình thường, hệ thống não thất cân đối hai bên
 */
export const SYNTHETIC_MRI_SLICES: Record<TumorLabel, string> = {
  Glioma: '/sample_scans/sample_glioma_axial.jpg',
  Meningioma: '/sample_scans/sample_meningioma_axial.jpg',
  Pituitary: '/sample_scans/sample_pituitary_coronal.jpg',
  'No Tumor': '/sample_scans/sample_notumor_axial.jpg',
};

export const DEMO_SAMPLE_SCANS: {
  id: string;
  label: TumorLabel;
  title: string;
  subtitle: string;
  fileName: string;
  description: string;
  imageUrl: string;
}[] = [
  {
    id: 'preset-glioma',
    label: 'Glioma',
    title: 'Mẫu 1 — Nghi ngờ U thần kinh đệm (Glioma)',
    subtitle: 'Lát cắt Axial T1-Gd • Vùng đỉnh - chẩm bán cầu phải',
    fileName: 'sample_glioma_axial.jpg',
    description:
      'Ảnh chụp MRI sọ não thực tế mặt phẳng Axial T1W có tiêm thuốc đối quang từ (T1+C): Tổn thương nội trục vùng đỉnh - chẩm phải ngấm thuốc dạng vòng không đều, trung tâm giảm tín hiệu hoại tử và phù não vận mạch xung quanh.',
    imageUrl: SYNTHETIC_MRI_SLICES.Glioma,
  },
  {
    id: 'preset-meningioma',
    label: 'Meningioma',
    title: 'Mẫu 2 — Nghi ngờ U màng não (Meningioma)',
    subtitle: 'Lát cắt Axial T1-Gd • Ngoài trục vùng nền sọ - trước cầu não',
    fileName: 'sample_meningioma_axial.jpg',
    description:
      'Ảnh chụp MRI sọ não thực tế mặt phẳng Axial T1W sau tiêm đối quang: Khối choán chỗ ngoài trục ranh giới rõ, ngấm thuốc mạnh đồng nhất, chân bám rộng vào màng cứng vùng dốc nền - trước cầu não có dấu hiệu đuôi màng cứng (dural tail).',
    imageUrl: SYNTHETIC_MRI_SLICES.Meningioma,
  },
  {
    id: 'preset-pituitary',
    label: 'Pituitary',
    title: 'Mẫu 3 — Nghi ngờ U tuyến yên (Pituitary)',
    subtitle: 'Lát cắt Coronal T1-Gd • Vùng hố yên & trên yên (Sellar)',
    fileName: 'sample_pituitary_coronal.jpg',
    description:
      'Ảnh chụp MRI sọ não thực tế mặt phẳng đứng ngang (Coronal T1+C): Tổn thương khu trú tại vùng hố yên mở rộng nhẹ lên bể trên yên, ranh giới rõ với xoang hang hai bên và giao thoa thị giác.',
    imageUrl: SYNTHETIC_MRI_SLICES.Pituitary,
  },
  {
    id: 'preset-notumor',
    label: 'No Tumor',
    title: 'Mẫu 4 — Nhu mô não bình thường (No Tumor)',
    subtitle: 'Lát cắt Axial T2/FLAIR • Đối xứng hai bán cầu đại não',
    fileName: 'sample_notumor_axial.jpg',
    description:
      'Ảnh chụp MRI sọ não thực tế mặt phẳng Axial: Nhu mô hai bán cầu đại não tín hiệu đồng nhất, đường giữa cân đối, hệ thống não thất bên và các rãnh cuộn não hoàn toàn bình thường, không ghi nhận khối choán chỗ.',
    imageUrl: SYNTHETIC_MRI_SLICES['No Tumor'],
  },
];
