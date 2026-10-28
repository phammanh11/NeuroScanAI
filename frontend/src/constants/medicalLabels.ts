import type {
  AIAssessmentVerdict,
  DoctorReviewStatus,
  KnowledgeCategoryKey,
  TumorLabel,
} from '@/types/domain';

export interface TumorLabelExplanation {
  label: TumorLabel;
  vietnameseTitle: string;
  anatomicalLocation: string;
  overview: string;
  keyPoints: string[];
  importantLimitation: string;
  badgeColorClass: string;
  chartColor: string;
}

export const TUMOR_LABEL_METADATA: Record<TumorLabel, TumorLabelExplanation> = {
  Glioma: {
    label: 'Glioma',
    vietnameseTitle: 'Nhóm u thần kinh đệm (Glioma)',
    anatomicalLocation: 'Mô nhu mô não (xuất phát từ các tế bào thần kinh đệm nâng đỡ nơ-ron)',
    overview:
      'Glioma là nhóm u nội sọ bắt nguồn từ tế bào thần kinh đệm (astrocytes, oligodendrocytes hoặc ependymal cells). Trên ảnh MRI, tổn thương thuộc nhóm này thường biểu hiện sự thay đổi tín hiệu trong nhu mô não và có thể kèm vùng phù nề quanh tổn thương.',
    keyPoints: [
      'Nhãn "Glioma" trong bộ dữ liệu MRI chỉ phản ánh đặc trưng hình ảnh học gợi ý tổn thương dạng u thần kinh đệm.',
      'Không tự xác định cấp độ mô học (WHO Grade) hay bản chất lành tính/ác tính chỉ từ một ảnh MRI đơn lẻ.',
      'Cần bác sĩ Chẩn đoán hình ảnh và Ngoại thần kinh đánh giá chuỗi xung đầy đủ (T1, T1ce, T2, FLAIR) và lâm sàng.',
    ],
    importantLimitation:
      'Giai đoạn sớm hoặc vùng ranh giới mờ có thể có đặc trưng tín hiệu xám gần giống Meningioma hoặc tổn thương viêm.',
    badgeColorClass:
      'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    chartColor: '#f59e0b',
  },
  Meningioma: {
    label: 'Meningioma',
    vietnameseTitle: 'Nhóm u màng não (Meningioma)',
    anatomicalLocation: 'Màng nhện / màng cứng bao quanh bề mặt não (ngoài trục - extra-axial)',
    overview:
      'Meningioma là nhóm u phát triển từ tế bào màng nhện của màng não (nằm ngoài nhu mô não nhưng có thể chèn ép vào bề mặt bán cầu não). Trên MRI có tiêm thuốc đối quang từ, vùng tổn thương thường có ranh giới khá rõ và bám sát màng cứng.',
    keyPoints: [
      'Nhãn "Meningioma" cho biết mô hình nhận thấy đặc trưng hình thái gần với nhóm u vùng màng não trong tập huấn luyện.',
      'Dù phần lớn u màng não phát triển chậm, mô hình AI tuyệt đối không thể tự kết luận lành tính hay ác tính.',
      'Quyết định theo dõi định kỳ hay can thiệp phụ thuộc vào triệu chứng thần kinh, kích thước và đánh giá của bác sĩ chuyên khoa.',
    ],
    importantLimitation:
      'Ảnh cắt lát đơn lẻ hoặc góc chụp sát vòm sọ đôi khi gây nhầm lẫn hình thái với các tổn thương nội sọ khác.',
    badgeColorClass:
      'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
    chartColor: '#0284c7',
  },
  Pituitary: {
    label: 'Pituitary',
    vietnameseTitle: 'Nhóm tổn thương vùng tuyến yên (Pituitary)',
    anatomicalLocation: 'Hố yên (Sella turcica) ở nền sọ, gần giao thoa thị giác',
    overview:
      'Nhóm nhãn Pituitary đại diện cho các khối khu trú tại vùng tuyến yên ở nền sọ. Do tuyến yên nằm gần giao thoa thị giác và điều hòa nội tiết, các bất thường tại đây thường được đánh giá kết hợp giữa MRI hố yên và xét nghiệm nội tiết.',
    keyPoints: [
      'Nhãn "Pituitary" phản ánh sự bất thường hình thái tại khu vực hố yên trên lát cắt MRI tương ứng.',
      'Không phân biệt được u tiết hormone hay không tiết hormone chỉ dựa vào ảnh phân loại 4 lớp.',
      'Cần kết hợp khám chuyên khoa Nội tiết, Nhãn khoa (đo thị trường) và Ngoại thần kinh.',
    ],
    importantLimitation:
      'Các lát cắt không đi qua vùng hố yên hoặc độ phân giải thấp không đủ cơ sở để loại trừ tổn thương nhỏ (microadenoma).',
    badgeColorClass:
      'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
    chartColor: '#6366f1',
  },
  'No Tumor': {
    label: 'No Tumor',
    vietnameseTitle: 'Không phát hiện dấu hiệu u thuộc 3 nhóm trên (No Tumor)',
    anatomicalLocation: 'Toàn bộ lát cắt mô não được quan sát',
    overview:
      'Nhãn "No Tumor" có nghĩa là trên lát cắt MRI được tải lên, mô hình không nhận thấy đặc trưng hình ảnh tương đồng với 3 nhóm u (Glioma, Meningioma, Pituitary) của bộ dữ liệu tham chiếu.',
    keyPoints: [
      'Kết quả "No Tumor" KHÔNG đồng nghĩa với kết luận y khoa "não hoàn toàn bình thường".',
      'Một lát cắt 2D đơn lẻ không thể đại diện cho toàn bộ thể tích hộp sọ hoặc các bệnh lý mạch máu, viêm nhiễm, thoái hóa.',
      'Nếu người bệnh có triệu chứng đau đầu kéo dài, co giật, mờ mắt hoặc yếu chi, vẫn cần gặp bác sĩ chuyên khoa.',
    ],
    importantLimitation:
      'Tổn thương kích thước rất nhỏ hoặc nằm ở lát cắt khác ngoài ảnh tải lên sẽ không xuất hiện trên ảnh phân tích.',
    badgeColorClass:
      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    chartColor: '#10b981',
  },
};

export const DOCTOR_REVIEW_STATUS_META: Record<
  DoctorReviewStatus,
  { label: string; description: string; badgeClass: string }
> = {
  NONE: {
    label: 'Chưa gửi bác sĩ',
    description: 'Phiên phân tích mới chỉ có kết quả tham khảo từ AI.',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30',
  },
  PENDING_REVIEW: {
    label: 'Chờ xem xét',
    description: 'Người dùng đã đồng ý chia sẻ và đang chờ bác sĩ chuyên khoa tiếp nhận.',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  IN_REVIEW: {
    label: 'Đang xem xét',
    description: 'Bác sĩ đã tiếp nhận ca và đang đối chiếu hình ảnh MRI cùng kết quả AI.',
    badgeClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
  },
  REVIEWED: {
    label: 'Đã xem xét',
    description: 'Bác sĩ đã hoàn tất ghi chú chuyên môn và phản hồi cho người dùng.',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  },
  NEEDS_MORE_INFO: {
    label: 'Cần bổ sung thông tin',
    description: 'Bác sĩ yêu cầu bổ sung chuỗi xung MRI hoặc thông tin triệu chứng lâm sàng.',
    badgeClass: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
  },
};

export const AI_ASSESSMENT_VERDICT_META: Record<
  AIAssessmentVerdict,
  { label: string; description: string; badgeClass: string }
> = {
  CONCORDANT: {
    label: 'Phù hợp với quan sát sơ bộ trên lát cắt',
    description: 'Nhãn dự đoán của AI phù hợp với vị trí/hình thái gợi ý trên lát cắt hiện tại.',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  },
  PARTIAL_CONCORDANCE: {
    label: 'Cần đối chiếu thêm chuỗi xung khác',
    description: 'Có dấu hiệu gợi ý nhưng cần thêm chuỗi T1ce/T2/FLAIR để đánh giá đầy đủ.',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  DISCORDANT: {
    label: 'Không đồng thuận với nhãn AI',
    description: 'Nhận định chuyên môn trên ảnh khác với nhãn gợi ý tự động của mô hình.',
    badgeClass: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
  },
  INCONCLUSIVE_IMAGE: {
    label: 'Chất lượng/lát cắt ảnh chưa đủ kết luận',
    description: 'Ảnh bị nhiễu, cắt thiếu vùng quan tâm hoặc không đúng mặt phẳng giải phẫu.',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30',
  },
};

export const KNOWLEDGE_CATEGORIES: {
  key: KnowledgeCategoryKey;
  number: string;
  label: string;
  shortLabel: string;
  priority: string;
  description: string;
}[] = [
  {
    key: 'symptoms',
    number: '3.1',
    label: 'Triệu chứng và dấu hiệu cảnh báo',
    shortLabel: 'Triệu chứng & Cảnh báo',
    priority: 'Ưu tiên rất cao',
    description:
      'Đau đầu kéo dài, co giật, suy giảm thị lực, yếu tay chân và các dấu hiệu cần đánh giá y tế sớm hoặc cấp cứu.',
  },
  {
    key: 'tumor_classification',
    number: '3.2',
    label: 'Kiến thức u não và phân loại',
    shortLabel: 'U não & Phân loại 4 lớp',
    priority: 'Ưu tiên rất cao',
    description:
      'Giải thích Glioma, Meningioma, Pituitary và No Tumor theo phạm vi mô hình, vị trí giải phẫu và giới hạn chẩn đoán.',
  },
  {
    key: 'mri_ai_explanation',
    number: '3.3',
    label: 'MRI và giải thích kết quả AI',
    shortLabel: 'MRI & Giải thích AI',
    priority: 'Ưu tiên rất cao',
    description:
      'Giải thích nguyên lý chụp cộng hưởng từ (MRI), điểm tự tin (confidence score), tiền xử lý ROI/CLAHE và giới hạn mô hình.',
  },
  {
    key: 'treatment_care',
    number: '3.4',
    label: 'Điều trị và chăm sóc',
    shortLabel: 'Điều trị & Chăm sóc',
    priority: 'Ưu tiên cao',
    description:
      'Thông tin tổng quan về phẫu thuật, xạ trị, hóa trị, theo dõi định kỳ và câu hỏi gợi ý khi trao đổi với bác sĩ.',
  },
  {
    key: 'faq_visit_guide',
    number: '3.5',
    label: 'FAQ và hướng dẫn khám',
    shortLabel: 'FAQ & Hướng dẫn khám',
    priority: 'Ưu tiên cao',
    description:
      'Chuẩn bị hồ sơ trước khi khám chuyên khoa Thần kinh / Ung bướu và giải đáp các câu hỏi thường gặp.',
  },
  {
    key: 'prevention_risk',
    number: '3.6',
    label: 'Phòng ngừa và yếu tố nguy cơ',
    shortLabel: 'Phòng ngừa & Nguy cơ',
    priority: 'Ưu tiên trung bình',
    description:
      'Các yếu tố nguy cơ đã có bằng chứng y học (như bức xạ ion hóa, hội chứng di truyền) và chăm sóc sức khỏe tổng quát.',
  },
  {
    key: 'sources_safety',
    number: '3.7',
    label: 'Nguồn tham khảo và quy tắc an toàn',
    shortLabel: 'Nguồn & Quy tắc an toàn',
    priority: 'Ưu tiên rất cao',
    description:
      'Tiêu chuẩn kiểm duyệt nguồn (WHO, NCI, NHS, Bộ Y tế), quy tắc không tự chẩn đoán và hướng dẫn xử trí tình huống khẩn cấp.',
  },
];

export const PERMANENT_MEDICAL_DISCLAIMER =
  'Trợ lý AI và hệ thống phân loại ảnh MRI chỉ cung cấp thông tin tham khảo phục vụ học tập, nghiên cứu và hỗ trợ tra cứu; hoàn toàn không thay thế tư vấn, chẩn đoán lâm sàng hoặc phác đồ điều trị từ bác sĩ chuyên khoa.';
