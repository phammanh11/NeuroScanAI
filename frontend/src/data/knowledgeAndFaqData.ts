import type {
  ChatSessionRecord,
  FAQKnowledgeRecord,
  KnowledgeArticle,
} from '@/types/domain';

/**
 * Dữ liệu FAQ chuẩn hóa theo cấu trúc JSON trong Tài liệu 3:
 * "Đề xuất thiết kế dữ liệu cho Chatbot AI Y tế trong dự án phát hiện u não từ ảnh MRI"
 * Sử dụng nguồn tổ chức y tế thực tế (NCI, NHS, WHO, Bộ Y tế). Không tự bịa URL nghiên cứu giả.
 */
export const VERIFIED_FAQ_RECORDS: FAQKnowledgeRecord[] = [
  {
    id: 'TUM001',
    category: 'tumor_classification',
    topic: 'glioma_overview',
    question: 'U não Glioma là gì?',
    answer:
      '### Khái niệm về Glioma (U thần kinh đệm)\n\n**Glioma** là nhóm u nguyên phát tại hệ thần kinh trung ương khởi phát từ **các tế bào thần kinh đệm (glial cells)** — những tế bào có vai trò nâng đỡ, bảo vệ và nuôi dưỡng tế bào thần kinh (nơ-ron).\n\n- **Các phân nhóm chính:** Astrocytoma (u tế bào hình sao), Oligodendroglioma (u tế bào ít nhánh) và Ependymoma (u màng não thất).\n- **Ý nghĩa nhãn trong NeuroScan AI:** Khi mô hình hiển thị nhãn `Glioma`, điều đó chỉ phản ánh rằng lát cắt MRI có đặc trưng hình ảnh tương đồng với nhóm mẫu Glioma trong tập dữ liệu tham chiếu.\n- **Giới hạn quan trọng:** Nhãn dự đoán từ ảnh MRI 2D **không thể tự xác định cấp độ mô học (WHO Grade)** hay khẳng định lành tính/ác tính. Chẩn đoán xác định luôn cần bác sĩ chuyên khoa Ngoại thần kinh, Chẩn đoán hình ảnh và Giải phẫu bệnh đánh giá.',
    keywords: ['glioma', 'u thần kinh đệm', 'glioma là gì', 'tế bào thần kinh đệm'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Adult Central Nervous System Tumors Treatment (PDQ) – Patient Version',
      url: 'https://www.cancer.gov/types/brain/patient/adult-brain-treatment-pdq',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
  {
    id: 'MRI001',
    category: 'mri_ai_explanation',
    topic: 'mri_brain_purpose',
    question: 'MRI não được sử dụng để làm gì?',
    answer:
      '### Vai trò của chụp cộng hưởng từ (MRI) sọ não\n\n**Chụp cộng hưởng từ não (Brain MRI)** sử dụng từ trường mạnh và sóng vô tuyến để tái tạo hình ảnh chi tiết của nhu mô não, màng não, hệ thống não thất và mạch máu nội sọ mà không dùng tia X.\n\n- **Ứng dụng lâm sàng:** Giúp bác sĩ khảo sát các bất thường cấu trúc như khối choán chỗ nội sọ, tổn thương mạch máu (nhồi máu, dị dạng mạch), viêm nhiễm hoặc bệnh lý mất myelin.\n- **Các chuỗi xung phổ biến:** T1-weighted, T1 có tiêm thuốc đối quang từ (T1ce), T2-weighted và FLAIR (giúp quan sát rõ vùng phù nề quanh tổn thương).\n- **Vai trò của AI trong hệ thống này:** Mô hình chỉ hỗ trợ phân loại sơ bộ 1 lát cắt MRI vào 4 nhóm tham chiếu (`Glioma`, `Meningioma`, `Pituitary`, `No Tumor`), không thay thế quy trình đọc toàn bộ chuỗi xung DICOM của bác sĩ Chẩn đoán hình ảnh.',
    keywords: ['mri não', 'chụp cộng hưởng từ', 'mri được sử dụng để làm gì', 'mri là gì', 't1', 'flair'],
    urgency: 'informational',
    source: {
      organization: 'NHS (UK National Health Service)',
      title: 'MRI scan – Overview and clinical uses',
      url: 'https://www.nhs.uk/conditions/mri-scan/',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
  {
    id: 'TUM002',
    category: 'tumor_classification',
    topic: 'meningioma_vs_glioma',
    question: 'Meningioma khác gì Glioma?',
    answer:
      '### Sự khác biệt cơ bản giữa Meningioma và Glioma\n\nCả hai đều là nhóm nhãn xuất hiện trong bộ dữ liệu phân loại MRI nội sọ, nhưng khác nhau về **nguồn gốc giải phẫu** và **vị trí hình ảnh học**:\n\n1. **Nguồn gốc mô học & Vị trí:**\n   - **Glioma (U nội trục - Intra-axial):** Khởi phát ngay bên trong **nhu mô não** từ các tế bào thần kinh đệm.\n   - **Meningioma (U ngoài trục - Extra-axial):** Khởi phát từ **lớp màng nhện của màng não** bao bọc bên ngoài nhu mô não, thường bám vào màng cứng và chèn ép từ ngoài vào bề mặt não.\n2. **Đặc điểm trên ảnh MRI:**\n   - **Meningioma** thường có ranh giới khá rõ với nhu mô não và nằm sát vòm sọ hoặc nền sọ.\n   - **Glioma** nằm sâu trong mô não, đôi khi có ranh giới mờ hơn.\n3. **Lưu ý về mô hình AI:** Ở một số lát cắt 2D hoặc vùng biên xám tương đồng, hai nhóm này có thể gây nhầm lẫn cho thuật toán phân loại. Vì vậy, kết quả AI luôn cần bác sĩ đối chiếu trên nhiều mặt phẳng (Axial, Coronal, Sagittal).',
    keywords: ['meningioma khác gì glioma', 'meningioma', 'u màng não', 'phân biệt glioma và meningioma'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Brain and Spinal Cord Tumors in Adults',
      url: 'https://www.cancer.gov/types/brain',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
  {
    id: 'SYM001',
    category: 'symptoms',
    topic: 'warning_symptoms',
    question: 'Những triệu chứng nào cần đi khám?',
    answer:
      '### Các triệu chứng thần kinh cần được bác sĩ đánh giá\n\nTriệu chứng thần kinh có thể bắt nguồn từ nhiều nguyên nhân khác nhau (đau nửa đầu, căng thẳng, bệnh lý mạch máu, mắt, tai mũi họng...) và **không đồng nghĩa chắc chắn với u não**. Tuy nhiên, người bệnh nên đi khám chuyên khoa Nội/Ngoại Thần kinh sớm nếu gặp:\n\n- **Đau đầu kéo dài hoặc thay đổi tính chất:** Đau đầu mới khởi phát, tăng dần mức độ theo thời gian, hoặc đau nhiều hơn vào buổi sáng kèm buồn nôn.\n- **Thay đổi thị giác hoặc thính giác:** Nhìn mờ, nhìn đôi, thu hẹp thị trường hai bên thái dương.\n- **Triệu chứng thần kinh khu trú:** Yếu hoặc tê bì một bên tay/chân, đi lại mất thăng bằng, nói khó.\n- **Thay đổi nhận thức hoặc hành vi:** Suy giảm trí nhớ rõ rệt, lú lẫn bất thường.\n\n**Dấu hiệu cần cấp cứu y tế ngay lập tức:** Co giật khởi phát lần đầu, liệt nửa người đột ngột, rối loạn ý thức/ngất, hoặc đau đầu dữ dội đột ngột.',
    keywords: ['triệu chứng', 'đi khám', 'đau đầu kéo dài', 'dấu hiệu cảnh báo', 'mờ mắt', 'yếu tay chân'],
    urgency: 'routine_or_prompt_evaluation',
    source: {
      organization: 'NHS (UK National Health Service)',
      title: 'Brain tumours – Symptoms and when to see a doctor',
      url: 'https://www.nhs.uk/conditions/brain-tumours/symptoms/',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
  {
    id: 'FAQ001',
    category: 'faq_visit_guide',
    topic: 'prepare_before_specialist_visit',
    question: 'Cần chuẩn bị gì trước khi khám chuyên khoa?',
    answer:
      '### Hướng dẫn chuẩn bị trước khi khám chuyên khoa Thần kinh / Ung bướu\n\nĐể buổi thăm khám với bác sĩ hiệu quả và đầy đủ thông tin, người bệnh và gia đình nên chuẩn bị:\n\n1. **Hồ sơ chẩn đoán hình ảnh gốc:** Mang theo **đĩa CD/DVD hoặc USB chứa file DICOM gốc** của lần chụp MRI/CT (không chỉ mang ảnh chụp màn hình điện thoại hoặc tờ phim in đơn lẻ).\n2. **Nhật ký triệu chứng:** Ghi rõ thời điểm bắt đầu triệu chứng (đau đầu, mờ mắt, tê yếu...), tần suất, mức độ và các yếu tố làm tăng/giảm triệu chứng.\n3. **Danh sách thuốc & tiền sử bệnh:** Liệt kê toàn bộ thuốc đang dùng (bao gồm thuốc chống đông, thuốc huyết áp, thực phẩm chức năng), tiền sử dị ứng thuốc cản quang/đối quang từ và tiền sử gia đình.\n4. **Câu hỏi muốn trao đổi với bác sĩ:** Ví dụ: *"Tôi có cần chụp bổ sung chuỗi xung MRI hoặc xét nghiệm nội tiết không?"*, *"Lịch theo dõi định kỳ tiếp theo như thế nào?"*',
    keywords: ['chuẩn bị gì trước khi khám', 'khám chuyên khoa', 'hướng dẫn khám', 'mang theo gì khi đi khám'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Questions to Ask Your Doctor About Brain Tumors',
      url: 'https://www.cancer.gov/types/brain/patient/adult-brain-treatment-pdq',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
  {
    id: 'TUM003',
    category: 'tumor_classification',
    topic: 'pituitary_and_notumor_meaning',
    question: 'Nhãn Pituitary và No Tumor trong kết quả AI có ý nghĩa gì?',
    answer:
      '### Giải thích nhãn Pituitary và No Tumor\n\n- **Nhãn `Pituitary`:** Cho biết mô hình nhận thấy đặc trưng trên lát cắt tập trung ở khu vực **hố yên / tuyến yên (sellar region)**. Các tổn thương vùng tuyến yên thường cần đánh giá kết hợp giữa MRI hố yên, đo thị trường mắt và xét nghiệm hormone nội tiết.\n- **Nhãn `No Tumor`:** Cho biết trên lát cắt 2D vừa tải lên, mô hình **không phát hiện đặc trưng hình ảnh thuộc 3 nhóm u (`Glioma`, `Meningioma`, `Pituitary`)** của bộ dữ liệu.\n- **Cảnh báo an toàn quan trọng:** Kết quả `No Tumor` **không đồng nghĩa với kết luận "não hoàn toàn bình thường"**, vì một lát cắt 2D đơn lẻ không khảo sát hết toàn bộ các vùng giải phẫu hoặc các bệnh lý thần kinh khác.',
    keywords: ['pituitary', 'no tumor', 'tuyến yên', 'không có u', 'ý nghĩa nhãn'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Pituitary Tumors Treatment (PDQ) – Patient Version',
      url: 'https://www.cancer.gov/types/pituitary/patient/pituitary-treatment-pdq',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
  {
    id: 'MRI002',
    category: 'mri_ai_explanation',
    topic: 'confidence_score_meaning',
    question: 'Điểm tự tin (Confidence Score) của AI có phải xác suất mắc bệnh không?',
    answer:
      '### Điểm tự tin (Confidence Score) KHÔNG phải xác suất chẩn đoán đúng\n\nTrong mô hình phân loại 4 lớp, **Confidence Score (ví dụ 89%)** chỉ là giá trị đầu ra toán học (Softmax probability) thể hiện mức độ khớp về mặt đặc trưng hình ảnh giữa bức ảnh đầu vào với các mẫu trong tập dữ liệu huấn luyện.\n\n- **Không phải xác suất mắc bệnh thực tế:** Một ảnh bị nhiễu viền hoặc khác dòng máy chụp (Domain Shift giữa máy 1.5T và 3.0T) vẫn có thể khiến mô hình xuất điểm số cao hoặc thấp sai lệch.\n- **Vai trò của Bác sĩ:** Kết quả từ NeuroScan AI chỉ dùng để hỗ trợ tra cứu và tham khảo học thuật. Nhận định lâm sàng của bác sĩ luôn là căn cứ quyết định.',
    keywords: ['confidence', 'điểm tự tin', 'xác suất', 'độ chính xác', 'softmax'],
    urgency: 'informational',
    source: {
      organization: 'World Health Organization (WHO)',
      title: 'Ethics and Governance of Artificial Intelligence for Health',
      url: 'https://www.who.int/publications/i/item/9789240029200',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    language: 'vi',
    reviewStatus: 'verified',
  },
];

export const EMERGENCY_KEYWORDS_VI = [
  'co giật',
  'động kinh',
  'ngất xỉu',
  'bất tỉnh',
  'hôn mê',
  'liệt nửa người',
  'không cử động được',
  'đau đầu dữ dội đột ngột',
  'cấp cứu',
  'nôn vọt',
  'mất ý thức',
];

export const KNOWLEDGE_ARTICLES_DATA: KnowledgeArticle[] = [
  {
    id: 'art-sym-01',
    slug: 'trieu-chung-than-kinh-va-dau-hieu-canh-bao-som',
    category: 'symptoms',
    title: 'Nhận diện triệu chứng thần kinh và các dấu hiệu cảnh báo cần đi khám sớm',
    summary:
      'Hướng dẫn phân biệt các triệu chứng đau đầu thông thường với dấu hiệu thần kinh khu trú hoặc tăng áp lực nội sọ cần được bác sĩ chuyên khoa đánh giá.',
    readingTimeMinutes: 5,
    sections: [
      {
        heading: '1. Vì sao không nên tự chẩn đoán chỉ qua triệu chứng đau đầu?',
        body: 'Đau đầu là triệu chứng rất phổ biến trong cộng đồng và phần lớn liên quan đến đau đầu căng thẳng, đau nửa đầu (Migraine), viêm xoang hoặc rối loạn giấc ngủ. Tuy nhiên, việc chú ý tới sự thay đổi tính chất đau đầu và các dấu hiệu đi kèm giúp người bệnh đi khám đúng thời điểm.',
      },
      {
        heading: '2. Các dấu hiệu cần thăm khám chuyên khoa sớm',
        body: 'Người bệnh nên chủ động đặt lịch khám chuyên khoa Nội hoặc Ngoại Thần kinh khi có một trong các biểu hiện sau:',
        bulletPoints: [
          'Đau đầu kéo dài nhiều ngày, mức độ tăng dần và kém đáp ứng với các biện pháp nghỉ ngơi thông thường.',
          'Đau đầu kèm buồn nôn hoặc nôn, đặc biệt rõ hơn vào buổi sáng sau khi thức dậy.',
          'Suy giảm thị lực, nhìn đôi, hoặc cảm giác vướng tầm nhìn hai bên thái dương (thu hẹp thị trường).',
          'Tê bì, giảm sức cơ một bên tay hoặc chân, đi lại loạng choạng hoặc nói khó.',
        ],
      },
      {
        heading: '3. Dấu hiệu khẩn cấp cần liên hệ cấp cứu 115',
        body: 'Khi xuất hiện cơn co giật khởi phát lần đầu, yếu liệt đột ngột nửa người, rối loạn ý thức, lú lẫn cấp tính hoặc đau đầu dữ dội đột ngột, người nhà cần đưa bệnh nhân tới khoa Cấp cứu gần nhất hoặc gọi 115 ngay lập tức.',
      },
    ],
    clinicalTakeaway:
      'Triệu chứng lâm sàng luôn cần được bác sĩ khám trực tiếp kết hợp thăm dò hình ảnh học khi có chỉ định.',
    keywords: ['đau đầu', 'co giật', 'thị lực', 'dấu hiệu cảnh báo', 'cấp cứu'],
    urgency: 'routine_or_prompt_evaluation',
    source: {
      organization: 'NHS (UK National Health Service)',
      title: 'Brain tumours – Symptoms and red flags',
      url: 'https://www.nhs.uk/conditions/brain-tumours/symptoms/',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-tum-02', 'art-faq-05'],
  },
  {
    id: 'art-tum-02',
    slug: 'phan-loai-4-nhom-tren-anh-mri-glioma-meningioma-pituitary-no-tumor',
    category: 'tumor_classification',
    title: 'Giải thích 4 nhãn phân loại trong mô hình MRI: Glioma, Meningioma, Pituitary và No Tumor',
    summary:
      'Tìm hiểu vị trí giải phẫu cơ bản, đặc trưng hình thái trên ảnh MRI và những giới hạn bắt buộc phải biết khi đọc nhãn dự đoán từ mô hình AI.',
    readingTimeMinutes: 6,
    sections: [
      {
        heading: '1. Phạm vi của bộ dữ liệu Brain Tumor MRI Dataset',
        body: 'Hệ thống phân loại trong dự án nghiên cứu được thiết kế xoay quanh 4 nhóm nhãn tiêu chuẩn của bộ dữ liệu tham chiếu: Glioma (nhóm u thần kinh đệm), Meningioma (nhóm u màng não), Pituitary (nhóm tổn thương vùng tuyến yên) và No Tumor (không ghi nhận đặc trưng 3 nhóm trên).',
      },
      {
        heading: '2. Đặc điểm giải phẫu học cơ bản của từng nhóm',
        body: 'Mỗi nhãn gắn liền với vùng giải phẫu khác nhau trong hộp sọ:',
        bulletPoints: [
          'Glioma: Nằm trong nhu mô não (intra-axial), xuất phát từ tế bào thần kinh đệm.',
          'Meningioma: Nằm ngoài nhu mô não (extra-axial), xuất phát từ màng nhện và thường bám sát màng cứng.',
          'Pituitary: Khu trú tại hố yên ở nền sọ, nơi chứa tuyến yên và nằm sát giao thoa thị giác.',
          'No Tumor: Không phát hiện hình thái tương đồng với 3 nhóm trên ở lát cắt được khảo sát.',
        ],
      },
      {
        heading: '3. Tại sao nhãn AI không phải là chẩn đoán lành tính hay ác tính?',
        body: 'Xác định bản chất mô học (lành tính hay ác tính, phân độ WHO Grade 1–4) đòi hỏi đánh giá đa chuỗi xung MRI, lâm sàng và tiêu chuẩn vàng là giải phẫu bệnh / sinh học phân tử. Một nhãn phân loại tự động từ ảnh 2D chỉ mang giá trị định hướng tham khảo.',
      },
    ],
    clinicalTakeaway:
      'Nhãn dự đoán của AI chỉ mô tả sự tương đồng đặc trưng hình ảnh trong phạm vi 4 lớp, không khẳng định bản chất mô bệnh học.',
    keywords: ['glioma', 'meningioma', 'pituitary', 'no tumor', 'phân loại 4 lớp'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Adult Central Nervous System Tumors Treatment (PDQ)',
      url: 'https://www.cancer.gov/types/brain/patient/adult-brain-treatment-pdq',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-mri-03', 'art-sym-01'],
  },
  {
    id: 'art-mri-03',
    slug: 'cach-doc-ket-qua-ai-confidence-score-va-tien-xu-ly-anh-mri',
    category: 'mri_ai_explanation',
    title: 'Hiểu đúng về MRI não, tiền xử lý ROI/CLAHE và điểm tự tin (Confidence Score) của AI',
    summary:
      'Giải thích quy trình tiền xử lý tách vùng hộp sọ (Brain ROI Cropping), cân bằng tương phản CLAHE và lý do điểm tự tin của mô hình không phải xác suất chẩn đoán đúng.',
    readingTimeMinutes: 6,
    sections: [
      {
        heading: '1. Hiện tượng dịch chuyển miền (Domain Shift) trong ảnh MRI',
        body: 'Ảnh MRI thu nhận từ các máy chụp có từ lực khác nhau (1.5 Tesla so với 3.0 Tesla) hoặc cấu hình chuỗi xung khác nhau sẽ có độ tương phản xám và tỷ lệ nền đen rất khác biệt. Ngoài ra, chữ in hoặc thước đo ở viền ảnh có thể gây nhiễu cho mạng nơ-ron.',
      },
      {
        heading: '2. Vai trò của tiền xử lý Brain ROI Cropping & CLAHE',
        body: 'Theo tài liệu chiến lược kỹ thuật của dự án, pipeline tiền xử lý chuẩn hóa ảnh MRI qua 3 bước:',
        bulletPoints: [
          'Brain Contour ROI Cropping: Tách bỏ phần nền đen thừa và ký tự viền xung quanh hộp sọ.',
          'CLAHE (Contrast Limited Adaptive Histogram Equalization): Tăng cường tương phản cục bộ tự nhiên mà không làm cháy sáng.',
          'Z-score Normalization: Đồng bộ thang cường độ tín hiệu xám giữa các máy chụp.',
        ],
      },
      {
        heading: '3. Diễn giải đúng về Confidence Score và Grad-CAM',
        body: 'Confidence Score là đầu ra toán học của hàm Softmax trên 4 lớp, không phải tỷ lệ phần trăm chắc chắn mắc bệnh. Tương tự, bản đồ nhiệt Grad-CAM chỉ được hiển thị khi dịch vụ AI thực sự xuất dữ liệu giải thích mô hình.',
      },
    ],
    clinicalTakeaway:
      'Luôn phân biệt rõ chỉ số toán học của mô hình AI với kết luận chẩn đoán hình ảnh của bác sĩ.',
    keywords: ['mri', 'confidence score', 'clahe', 'roi cropping', 'grad-cam', 'domain shift'],
    urgency: 'informational',
    source: {
      organization: 'World Health Organization (WHO)',
      title: 'Ethics and Governance of Artificial Intelligence for Health',
      url: 'https://www.who.int/publications/i/item/9789240029200',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-tum-02', 'art-saf-07'],
  },
  {
    id: 'art-trt-04',
    slug: 'tong-quan-cac-phuong-phap-dieu-tri-va-theo-doi-sau-dieu-tri',
    category: 'treatment_care',
    title: 'Tổng quan các phương án điều trị và theo dõi định kỳ đối với tổn thương nội sọ',
    summary:
      'Thông tin tham khảo tổng quát về theo dõi chủ động, phẫu thuật thần kinh, xạ trị, điều trị nội khoa và chăm sóc phục hồi chức năng.',
    readingTimeMinutes: 5,
    sections: [
      {
        heading: '1. Nguyên tắc cá thể hóa trong điều trị y khoa',
        body: 'Không có một phác đồ chung cho mọi tổn thương nội sọ. Hội đồng chuyên môn (gồm bác sĩ Ngoại Thần kinh, Nội Thần kinh, Ung bướu, Chẩn đoán hình ảnh và Nội tiết) sẽ căn cứ vào vị trí, kích thước, triệu chứng và thể trạng người bệnh.',
      },
      {
        heading: '2. Các hướng tiếp cận chính',
        body: 'Tùy thuộc vào chẩn đoán xác định của bác sĩ, hướng xử trí có thể bao gồm:',
        bulletPoints: [
          'Theo dõi định kỳ bằng MRI (Active Surveillance): Áp dụng cho một số tổn thương nhỏ, không gây triệu chứng chèn ép.',
          'Phẫu thuật thần kinh: Nhằm loại bỏ mô tổn thương, giải phóng chèn ép và lấy mẫu giải phẫu bệnh.',
          'Xạ trị / Phẫu thuật xạ hình (Stereotactic Radiosurgery) và hóa trị / điều trị đích theo chỉ định chuyên khoa.',
          'Phục hồi chức năng vận động, ngôn ngữ và chăm sóc giảm nhẹ triệu chứng.',
        ],
      },
    ],
    clinicalTakeaway:
      'Hệ thống AI tuyệt đối không kê đơn thuốc hoặc đề xuất phác đồ điều trị cá nhân hóa.',
    keywords: ['điều trị', 'phẫu thuật', 'xạ trị', 'theo dõi định kỳ', 'chăm sóc'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Treatment Options for Adult Central Nervous System Tumors',
      url: 'https://www.cancer.gov/types/brain/patient/adult-brain-treatment-pdq',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-faq-05', 'art-sym-01'],
  },
  {
    id: 'art-faq-05',
    slug: 'huong-dan-chuan-bi-ho-so-khi-di-kham-chuyen-khoa-than-kinh',
    category: 'faq_visit_guide',
    title: 'Cẩm nang chuẩn bị hồ sơ và câu hỏi trước khi khám chuyên khoa Thần kinh',
    summary:
      'Danh mục hồ sơ hình ảnh DICOM, danh sách thuốc đang dùng và các câu hỏi thiết thực giúp người bệnh trao đổi hiệu quả với bác sĩ.',
    readingTimeMinutes: 4,
    sections: [
      {
        heading: '1. Hồ sơ hình ảnh và xét nghiệm cần mang theo',
        body: 'Khi đi khám hoặc hội chẩn, việc mang đầy đủ dữ liệu gốc giúp bác sĩ tiết kiệm thời gian và tránh phải chụp lại không cần thiết:',
        bulletPoints: [
          'Đĩa DVD/CD hoặc USB chứa toàn bộ thư mục DICOM của lần chụp MRI/CT gần nhất VÀ các lần chụp cũ trước đó để so sánh tiến triển.',
          'Kết quả xét nghiệm máu, xét nghiệm hormone nội tiết (nếu nghi ngờ tổn thương vùng tuyến yên) và kết quả khám mắt.',
        ],
      },
      {
        heading: '2. Gợi ý các câu hỏi nên trao đổi trực tiếp với bác sĩ',
        body: 'Người bệnh hoặc người nhà có thể ghi sẵn ra giấy các câu hỏi:',
        bulletPoints: [
          'Vị trí bất thường trên phim MRI nằm ở vùng nào và có giải thích cho triệu chứng hiện tại của tôi không?',
          'Tôi có cần chụp thêm MRI có tiêm thuốc đối quang từ hoặc làm thêm xét nghiệm chuyên sâu nào khác không?',
          'Những triệu chứng nào xuất hiện tại nhà thì tôi cần quay lại bệnh viện ngay?',
        ],
      },
    ],
    clinicalTakeaway:
      'Luôn lưu giữ dữ liệu DICOM gốc qua các lần khám để bác sĩ đối chiếu theo thời gian.',
    keywords: ['hướng dẫn khám', 'dicom', 'câu hỏi cho bác sĩ', 'chuyên khoa thần kinh'],
    urgency: 'informational',
    source: {
      organization: 'NHS (UK National Health Service)',
      title: 'Diagnosis and specialist referrals for brain tumours',
      url: 'https://www.nhs.uk/conditions/brain-tumours/diagnosis/',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-sym-01', 'art-trt-04'],
  },
  {
    id: 'art-prv-06',
    slug: 'yeu-to-nguy-co-co-bang-chung-va-cham-soc-suc-khoe-nao-bo',
    category: 'prevention_risk',
    title: 'Các yếu tố nguy cơ có bằng chứng y học và lưu ý về lối sống lành mạnh',
    summary:
      'Phân tích khách quan các yếu tố nguy cơ đã được ghi nhận trong y văn (bức xạ ion hóa liều cao, hội chứng di truyền hiếm gặp) và giới hạn của các biện pháp phòng ngừa.',
    readingTimeMinutes: 4,
    sections: [
      {
        heading: '1. Những yếu tố nguy cơ đã có bằng chứng khoa học',
        body: 'Theo Viện Ung thư Quốc gia Hoa Kỳ (NCI), phần lớn các trường hợp u não nguyên phát không tìm thấy nguyên nhân đơn lẻ rõ ràng. Hai nhóm yếu tố nguy cơ được xác nhận rõ nhất bao gồm:',
        bulletPoints: [
          'Tiếp xúc với bức xạ ion hóa liều cao ở vùng đầu (ví dụ từng xạ trị vùng sọ não trước đây).',
          'Một số hội chứng di truyền gia đình hiếm gặp (như Neurofibromatosis type 1 & 2, hội chứng Li-Fraumeni, Tuberous Sclerosis).',
        ],
      },
      {
        heading: '2. Không khẳng định quá mức về chế độ ăn hay thói quen',
        body: 'Duy trì chế độ dinh dưỡng cân bằng, ngủ đủ giấc, kiểm soát huyết áp và không hút thuốc lá giúp bảo vệ sức khỏe tim mạch - não bộ tổng thể. Tuy nhiên, y học hiện tại khẳng định không có một thực phẩm chức năng hay chế độ ăn kiêng nào có thể ngăn ngừa tuyệt đối mọi trường hợp u não.',
      },
    ],
    clinicalTakeaway:
      'Cảnh giác với các thông tin quảng cáo thực phẩm chức năng tự nhận chữa khỏi hoặc ngăn ngừa tuyệt đối u não.',
    keywords: ['yếu tố nguy cơ', 'phòng ngừa', 'bức xạ ion hóa', 'di truyền', 'lối sống'],
    urgency: 'informational',
    source: {
      organization: 'National Cancer Institute (NCI)',
      title: 'Risk Factors for Brain and Spinal Cord Tumors',
      url: 'https://www.cancer.gov/types/brain/patient/adult-brain-treatment-pdq',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-saf-07', 'art-sym-01'],
  },
  {
    id: 'art-saf-07',
    slug: 'nguon-tham-khao-y-khoa-va-quy-tac-an-toan-cua-neuroscan-ai',
    category: 'sources_safety',
    title: 'Tiêu chuẩn nguồn tham khảo y khoa và Quy tắc An toàn AI Y tế tại NeuroScan AI',
    summary:
      'Công bố minh bạch các nguyên tắc kiểm duyệt nội dung, bảo mật dữ liệu hình ảnh MRI và ranh giới trách nhiệm giữa công cụ hỗ trợ AI với bác sĩ lâm sàng.',
    readingTimeMinutes: 5,
    sections: [
      {
        heading: '1. Quy tắc 4 Không của Trợ lý AI và Mô hình Phân loại',
        body: 'Hệ thống NeuroScan AI tuân thủ nghiêm ngặt khung đạo đức AI trong y tế:',
        bulletPoints: [
          'Không tự khẳng định chẩn đoán xác định hoặc kết luận lành tính / ác tính từ một nhãn dự đoán.',
          'Không tự ý kê đơn thuốc, điều chỉnh liều thuốc hay thay thế chỉ định của bác sĩ.',
          'Không tạo bản đồ nhiệt (Grad-CAM) giả lập hoặc ngụy tạo số liệu độ chính xác lâm sàng.',
          'Không tiếp tục hội thoại tư vấn thông thường khi phát hiện dấu hiệu cấp cứu thần kinh — ưu tiên hướng dẫn liên hệ cấp cứu 115 ngay.',
        ],
      },
      {
        heading: '2. Tiêu chuẩn xác minh nguồn tài liệu',
        body: 'Mọi bản ghi kiến thức hiển thị chính thức đều phải gắn kèm tên tổ chức phát hành (WHO, NCI, NHS, Bộ Y tế), đường dẫn URL gốc, ngày kiểm tra gần nhất và trạng thái kiểm duyệt rõ ràng.',
      },
    ],
    clinicalTakeaway:
      'An toàn người bệnh và tính minh bạch học thuật là ưu tiên cao nhất trong thiết kế NeuroScan AI.',
    keywords: ['quy tắc an toàn', 'nguồn tham khảo', 'who', 'nci', 'nhs', 'bảo mật'],
    urgency: 'informational',
    source: {
      organization: 'World Health Organization (WHO)',
      title: 'WHO Guidance on Artificial Intelligence for Health',
      url: 'https://www.who.int/publications/i/item/9789240029200',
      lastVerified: '2026-10-21',
      reviewStatus: 'verified',
    },
    reviewStatus: 'verified',
    relatedArticleIds: ['art-mri-03', 'art-tum-02'],
  },
  {
    id: 'art-pending-08',
    slug: 'ban-thao-nghien-cuu-radiomics-chua-kiem-duyet',
    category: 'mri_ai_explanation',
    title: '[Bản thảo chờ duyệt] Tổng quan hướng nghiên cứu Radiomics và phân vùng 3D BraTS',
    summary:
      'Tài liệu nội bộ tóm tắt hướng mở rộng tương lai sang phân vùng 3D U-Net/Swin UNETR. Nội dung đang ở trạng thái chờ hội đồng chuyên môn rà soát.',
    readingTimeMinutes: 4,
    sections: [
      {
        heading: '1. Trạng thái bản thảo chưa xuất bản chính thức',
        body: 'Bài viết này minh họa cơ chế quản lý trạng thái kiểm duyệt (review_status = pending) theo Tài liệu đặc tả 3. Nội dung chưa được thẩm định y khoa sẽ không hiển thị trong danh sách bài viết đã xuất bản mặc định.',
      },
    ],
    clinicalTakeaway:
      'Chỉ những tài liệu có trạng thái Đã xác minh (verified) mới được xuất bản làm tài liệu tra cứu chuẩn.',
    keywords: ['radiomics', '3d segmentation', 'brats', 'bản thảo'],
    urgency: 'informational',
    source: {
      organization: 'Nhóm Nghiên cứu Nội bộ NeuroScan AI (Bản thảo)',
      title: 'Đề xuất hướng mở rộng Phân vùng 3D & Radiomics',
      url: 'https://www.cancer.gov/types/brain',
      lastVerified: '2026-10-21',
      reviewStatus: 'pending',
    },
    reviewStatus: 'pending',
    relatedArticleIds: ['art-mri-03'],
  },
];

export const INITIAL_CHAT_SESSIONS: ChatSessionRecord[] = [
  {
    id: 'chat-sess-101',
    ownerUserId: 'usr-demo-patient-01',
    title: 'Tìm hiểu nhãn Glioma & chuẩn bị khám',
    createdAt: '2026-10-20T09:30:00.000Z',
    updatedAt: '2026-10-20T09:32:00.000Z',
    linkedAnalysisId: 'ana-demo-1001',
    linkedAnalysisSessionCode: 'NS-2026-1001',
    linkedAnalysisLabel: 'Glioma',
    messages: [
      {
        id: 'msg-1',
        sessionId: 'chat-sess-101',
        sender: 'user',
        content: 'U não Glioma là gì?',
        createdAt: '2026-10-20T09:30:10.000Z',
      },
      {
        id: 'msg-2',
        sessionId: 'chat-sess-101',
        sender: 'assistant',
        content: VERIFIED_FAQ_RECORDS[0].answer,
        createdAt: '2026-10-20T09:30:14.000Z',
        urgency: VERIFIED_FAQ_RECORDS[0].urgency,
        sources: [VERIFIED_FAQ_RECORDS[0].source],
        linkedAnalysisId: 'ana-demo-1001',
        linkedAnalysisLabel: 'Glioma',
      },
    ],
  },
  {
    id: 'chat-sess-102',
    ownerUserId: 'usr-demo-patient-01',
    title: 'Ý nghĩa chụp MRI não',
    createdAt: '2026-10-18T16:10:00.000Z',
    updatedAt: '2026-10-18T16:11:00.000Z',
    messages: [
      {
        id: 'msg-3',
        sessionId: 'chat-sess-102',
        sender: 'user',
        content: 'MRI não được sử dụng để làm gì?',
        createdAt: '2026-10-18T16:10:15.000Z',
      },
      {
        id: 'msg-4',
        sessionId: 'chat-sess-102',
        sender: 'assistant',
        content: VERIFIED_FAQ_RECORDS[1].answer,
        createdAt: '2026-10-18T16:10:20.000Z',
        urgency: VERIFIED_FAQ_RECORDS[1].urgency,
        sources: [VERIFIED_FAQ_RECORDS[1].source],
      },
    ],
  },
];
