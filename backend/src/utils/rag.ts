/**
 * ============================================================================
 * NEUROSCAN AI — RAG (RETRIEVAL-AUGMENTED GENERATION) & VECTOR DB ENGINE
 * ============================================================================
 * Kiến trúc Pipeline chuẩn cho Trợ lý Y tế Thần kinh & Chẩn đoán Hình ảnh MRI:
 *   1. Knowledge Ingestion & Semantic Chunking:
 *      Chia nhỏ tài liệu y khoa chuẩn (WHO CNS5, ACR Appropriateness Criteria,
 *      Chuỗi xung MRI sọ não, Computer Vision Pipeline, Hướng dẫn chuẩn bị chụp
 *      & Dấu hiệu Cờ đỏ Cấp cứu Thần kinh) + dữ liệu FAQ từ D1 thành các semantic chunks.
 *   2. Vector Embedding (1024-dim):
 *      Sử dụng mô hình `@cf/baai/bge-m3` trên Cloudflare Workers AI (hoặc
 *      Deterministic Vietnamese Medical Semantic Vector Hash khi chạy local/offline).
 *   3. Vector Database Storage & Hybrid Retrieval:
 *      Lưu trữ vector vào Cloudflare Vectorize (`env.VECTORIZE`) + bảng `rag_chunks`
 *      trong Cloudflare D1. Truy vấn Top-K bằng Cosine Similarity kết hợp
 *      Lexical Keyword Boost cho thuật ngữ y khoa Tiếng Việt & Quốc tế.
 *   4. Augmented Generation (LLM):
 *      Đưa ngữ cảnh y khoa Top-K vào `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
 *      (Cloudflare Workers AI) hoặc Gemini 2.5 Flash để sinh câu trả lời chuẩn xác.
 * ============================================================================
 */

export interface RagChunkRecord {
  id: string;
  doc_id: string;
  category: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RagSearchResult extends RagChunkRecord {
  score: number;
}

export interface RagTraceInfo {
  pipeline: string;
  embeddingModel: string;
  llmModel: string;
  vectorBackend: string;
  totalChunksIndexed: number;
  topChunks: Array<{
    id: string;
    title: string;
    category: string;
    score: number;
  }>;
}

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const WORKERS_LLM_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Kho tri thức y khoa chuẩn hóa của NeuroScan AI (Static Medical Knowledge Base)
 * Sẵn sàng được chia chunk và nhúng thành Vector Embeddings.
 */
export const STATIC_KNOWLEDGE_DOCUMENTS: Array<{
  doc_id: string;
  category: string;
  title: string;
  content: string;
}> = [
  {
    doc_id: 'doc-who-glioma',
    category: 'tumor_classification',
    title: 'Phân loại U thần kinh đệm (Glioma) theo tiêu chuẩn WHO CNS5',
    content: `U thần kinh đệm (Glioma) là nhóm u não nguyên phát nội trục (intra-axial) khởi phát từ các tế bào thần kinh đệm nâng đỡ nhu mô não (tế bào hình sao Astrocytes, tế bào ít nhánh Oligodendrocytes hoặc tế bào nội tủy Ependymal cells).
Theo phân loại WHO CNS5 (2021), Glioma được chia thành u thần kinh đệm bậc thấp (WHO độ 1-2, tiến triển chậm) và bậc cao (WHO độ 3-4, ác tính như Glioblastoma IDH-wildtype).
Đặc điểm trên ảnh chụp MRI sọ não:
- Vị trí: Nằm sâu trong nhu mô bán cầu đại não, thân não hoặc tiểu não (nội trục).
- Tín hiệu T1W / T2W / FLAIR: Thường giảm tín hiệu trên T1W và tăng tín hiệu lan tỏa trên T2W/FLAIR kèm phù não vận mạch (vasogenic edema) hình ngón tay đeo găng xung quanh.
- Sau tiêm đối quang từ (T1-Gd): Glioma bậc cao thường ngấm thuốc mạnh dạng vòng không đều (ring-enhancing lesion) bao quanh vùng hoại tử trung tâm giảm tín hiệu.
Hướng xử trí tham khảo: Cần hội chẩn Bác sĩ Chẩn đoán hình ảnh Thần kinh và Bác sĩ Ngoại Thần kinh, có thể chỉ định cộng hưởng từ phổ (MRS), tưới máu (Perfusion MRI) hoặc sinh thiết/phẫu thuật kết hợp xét nghiệm sinh học phân tử (IDH1/2, 1p/19q, MGMT).`,
  },
  {
    doc_id: 'doc-who-meningioma',
    category: 'tumor_classification',
    title: 'Phân loại U màng não (Meningioma) & Dấu hiệu Đuôi màng cứng (Dural Tail)',
    content: `U màng não (Meningioma) là khối u ngoài trục (extra-axial) phổ biến nhất của hệ thần kinh trung ương, xuất phát từ các tế bào màng nhện (arachnoid cap cells) của màng cứng bao quanh não và tủy sống.
Khoảng 80-85% u màng não là lành tính (WHO độ 1), tiến triển rất chậm qua nhiều năm; khoảng 15% là không điển hình (WHO độ 2) và 1-3% là ác tính (WHO độ 3).
Đặc điểm nhận diện điển hình trên ảnh MRI:
- Vị trí: Ngoài trục, thường gặp ở vòm sọ (convexity), liềm đại não (falx cerebri), cánh xương bướm, rãnh khứu giác hoặc góc cầu - tiểu não, nền sọ.
- Đặc trưng hình ảnh: Khối choán chỗ có ranh giới rất rõ, đáy bám rộng vào màng cứng, đẩy lệch nhu mô não lân cận.
- Chuỗi xung T1-Gd (sau tiêm thuốc đối quang từ): Khối u ngấm thuốc rất mạnh và đồng nhất, thường kèm dấu hiệu "đuôi màng cứng" (dural tail sign — phần màng cứng lân cận dày lên và ngấm thuốc). Có thể kèm phản ứng dày xương sọ kế cận (hyperostosis).
Hướng xử trí tham khảo: Với u màng não nhỏ không triệu chứng, có thể theo dõi định kỳ bằng MRI mỗi 6-12 tháng. Nếu khối u gây hiệu ứng choán chỗ hoặc triệu chứng thần kinh khu trú, phương pháp điều trị chính là phẫu thuật vi phẫu hoặc xạ phẫu định vị (Gamma Knife / CyberKnife).`,
  },
  {
    doc_id: 'doc-who-pituitary',
    category: 'tumor_classification',
    title: 'U tuyến yên (Pituitary Adenoma) & Biểu hiện Nội tiết - Thị giác',
    content: `U tuyến yên (Pituitary Adenoma / Pituitary Neuroendocrine Tumor - PitNET) là khối u phát sinh từ thùy trước tuyến yên nằm trong hố yên (sella turcica) ở nền sọ. Đa số u tuyến yên là lành tính.
Phân loại theo kích thước trên MRI:
- Microadenoma (U tuyến yên kích thước nhỏ): Đường kính < 10 mm, khu trú gọn trong lòng hố yên.
- Macroadenoma (U tuyến yên kích thước lớn): Đường kính >= 10 mm, thường phát triển vượt lên bể trên yên (suprasellar cistern), có hình ảnh "người tuyết" (snowman / figure-of-8 configuration) trên lát cắt đứng ngang (Coronal) và có thể chèn ép giao thoa thị giác (optic chiasm) hoặc xâm lấn xoang hang (cavernous sinus).
Triệu chứng lâm sàng gợi ý:
- Chèn ép giao thoa thị giác: Giảm thị lực, bán manh hai bên thái dương (bitemporal hemianopsia — hẹp thị trường hai bên).
- Rối loạn nội tiết: Tăng tiết Prolactin (vô kinh, tiết sữa bất thường, giảm sinh lý), tăng GH (bệnh to đầu chi), tăng ACTH (hội chứng Cushing) hoặc suy tuyến yên.
Hướng xử trí tham khảo: Cần chụp MRI vùng hố yên mỏng (Dynamic Pituitary MRI mặt phẳng Coronal & Sagittal T1-Gd), xét nghiệm bộ hormone tuyến yên máu và khám chuyên khoa Nội tiết - Ngoại Thần kinh.`,
  },
  {
    doc_id: 'doc-who-notumor',
    category: 'tumor_classification',
    title: 'Ý nghĩa nhãn No Tumor (Không phát hiện khối u điển hình) & Giới hạn của AI',
    content: `Nhãn "No Tumor" (Không phát hiện khối u điển hình) trong hệ thống NeuroScan AI cho biết trên lát cắt 2D hiện tại, mô hình Computer Vision không ghi nhận vùng bất thường mang đặc trưng của 3 nhóm u não mục tiêu (Glioma, Meningioma, Pituitary).
Trên hình ảnh MRI sọ não bình thường:
- Nhu mô chất xám vỏ não và chất trắng dưới vỏ phân biệt rõ, tín hiệu đồng nhất.
- Đường giữa (midline structures) cân đối, không bị đẩy lệch.
- Hệ thống não thất bên, não thất ba, não thất tư và các bể não nền sọ thông thoáng, kích thước bình thường.
LƯU Ý AN TOÀN Y KHOA QUAN TRỌNG:
- Điểm tự tin (Confidence Score) của mô hình AI phản ánh xác suất toán học Softmax trên 1 lát cắt 2D đơn lẻ, KHÔNG phải kết luận loại trừ hoàn toàn bệnh lý trên toàn bộ bộ chụp DICOM đa mặt phẳng.
- Mô hình phân loại 4 nhãn không thay thế đánh giá các bệnh lý thần kinh khác như: đột quỵ nhồi máu/xuất huyết não cấp, dị dạng mạch máu não (AVM, phình mạch), viêm não - màng não, hay thoái hóa myelin (MS).
- Nếu người bệnh vẫn có triệu chứng đau đầu kéo dài, chóng mặt, tê yếu tay chân hoặc nhìn mờ, bắt buộc phải mang toàn bộ đĩa/phim chụp MRI đến Bác sĩ Chẩn đoán hình ảnh hoặc Nội/Ngoại Thần kinh để thăm khám trực tiếp.`,
  },
  {
    doc_id: 'doc-mri-sequences',
    category: 'mri_ai_explanation',
    title: 'Giải thích các chuỗi xung MRI sọ não: T1W, T2W, FLAIR, T1-Gd, DWI và MRS',
    content: `Một bộ chụp Cộng hưởng từ (MRI) sọ não lâm sàng tiêu chuẩn bao gồm nhiều chuỗi xung và mặt phẳng cắt (Axial - ngang, Coronal - đứng ngang, Sagittal - đứng dọc):
1. T1-weighted (T1W): Đánh giá giải phẫu cấu trúc não rất tốt. Dịch não tủy (CSF) có màu đen (giảm tín hiệu), chất trắng sáng hơn chất xám.
2. T2-weighted (T2W): Dịch não tủy và các vùng phù não, dịch ngoại bào có màu trắng sáng (tăng tín hiệu). Giúp phát hiện nhanh vùng tổn thương nhu mô.
3. FLAIR (Fluid-Attenuated Inversion Recovery): Tương tự T2W nhưng xóa tín hiệu nước tự do của dịch não tủy (CSF trở thành màu đen), giúp làm nổi bật rõ rệt các vùng phù não quanh u (peritumoral edema) hoặc tổn thương sát thành não thất và vỏ não.
4. T1W sau tiêm thuốc đối quang từ Gadolinium (T1-Gd / T1+C): Thuốc đối quang từ đi qua những nơi hàng rào máu - não (Blood-Brain Barrier) bị phá vỡ hoặc vùng giàu mạch máu, làm khối u sáng rực lên trên phim. Đây là chuỗi xung quan trọng nhất để phân định ranh giới u, hoại tử trung tâm và dấu hiệu đuôi màng cứng.
5. DWI / ADC (Diffusion-Weighted Imaging): Đánh giá mức độ khuếch tán phân tử nước, giúp phân biệt áp-xe não với u hoại tử, đánh giá mật độ tế bào u (cellularity) và phát hiện nhồi máu não tối cấp.`,
  },
  {
    doc_id: 'doc-cv-pipeline',
    category: 'mri_ai_explanation',
    title: 'Quy trình Computer Vision, Tiền xử lý Otsu ROI, CLAHE, ONNX và Bản đồ nhiệt Grad-CAM',
    content: `Hệ thống NeuroScan AI ứng dụng quy trình Thị giác máy tính (Computer Vision) và Học sâu (Deep Learning) đa tầng để hỗ trợ sàng lọc ảnh MRI sọ não:
1. Kiểm tra tính hợp lệ của ảnh (Modality Gatekeeper): Phân tích phổ màu HSV/RGB, độ tương phản và hình thái sọ não để loại trừ ảnh không phải MRI (như ảnh chụp phong cảnh, chân dung, tài liệu màu).
2. Cắt vùng quan tâm tự động (Otsu Thresholding & Bounding Box Crop): Tách nền đen ngoài hộp sọ bằng ngưỡng Otsu, xác định đường viền lớn nhất của hộp sọ và cắt gọn vùng não bộ (ROI), loại bỏ nhiễu viền.
3. Cân bằng sáng cục bộ thích nghi (CLAHE - Contrast Limited Adaptive Histogram Equalization): Tăng cường độ tương phản vi cấu trúc giữa chất xám, chất trắng và vùng ranh giới tổn thương mà không làm khuếch đại nhiễu nền.
4. Suy luận mô hình Deep Learning (ONNX Runtime / ResNet-50 & EfficientNet): Chuẩn hóa kích thước ảnh đầu vào (224x224), tính toán vector đặc trưng và xuất phân phối xác suất Softmax trên 4 nhãn: Glioma, Meningioma, Pituitary, No Tumor.
5. Giải thích mô hình bằng Grad-CAM (Gradient-weighted Class Activation Mapping): Trích xuất bản đồ nhiệt (Heatmap) từ tầng tích chập cuối cùng để trực quan hóa vùng pixel mà mô hình tập trung chú ý khi đưa ra dự đoán, hỗ trợ Bác sĩ đối chiếu lâm sàng.`,
  },
  {
    doc_id: 'doc-emergency-redflags',
    category: 'symptoms',
    title: 'Dấu hiệu Cờ đỏ Cấp cứu Thần kinh (Red Flags) & Hội chứng Tăng áp lực nội sọ',
    content: `Hội chứng tăng áp lực nội sọ (Increased Intracranial Pressure - ICP) và các biến chứng chèn ép thần kinh cấp tính là tình trạng CẤP CỨU Y KHOA cần được xử trí ngay lập tức tại bệnh viện.
Các dấu hiệu Cờ đỏ (Red Flags) bắt buộc phải gọi Cấp cứu 115 hoặc đến Khoa Cấp cứu ngay:
- Đau đầu dữ dội khởi phát đột ngột như sét đánh ("thunderclap headache") hoặc đau đầu tăng dần kèm nôn vọt (đặc biệt vào buổi sáng sớm).
- Co giật (seizures) mới khởi phát ở người lớn trước đây chưa từng có tiền sử động kinh.
- Yếu liệt nửa người, tê bì tay chân, méo miệng, nói đớ, nói khó hoặc thất ngôn khởi phát cấp tính.
- Rối loạn ý thức: Ngủ gà, lú lẫn, gọi hỏi đáp ứng chậm hoặc hôn mê.
- Giảm thị lực đột ngột, nhìn đôi (song thị), đồng tử hai bên không đều (giãn đồng tử một bên).
- Sốt cao kèm cứng gáy, sợ ánh sáng.
Khi xuất hiện bất kỳ dấu hiệu nào trên đây, người bệnh TUYỆT ĐỐI KHÔNG tự lái xe và không chờ đợi tư vấn trực tuyến mà cần được đưa đến cơ sở cấp cứu thần kinh gần nhất.`,
  },
  {
    doc_id: 'doc-mri-preparation',
    category: 'faq_visit_guide',
    title: 'Hướng dẫn chuẩn bị trước khi chụp Cộng hưởng từ (MRI) sọ não & An toàn từ trường',
    content: `Máy chụp Cộng hưởng từ (MRI) sử dụng từ trường rất mạnh (1.5 Tesla hoặc 3.0 Tesla) và sóng vô tuyến, hoàn toàn không dùng tia X. Để đảm bảo an toàn tuyệt đối và chất lượng ảnh sắc nét, người bệnh cần lưu ý:
1. Sàng lọc vật liệu kim loại & Thiết bị cấy ghép (Chống chỉ định quan trọng):
   - Phải thông báo ngay cho Bác sĩ và Kỹ thuật viên nếu trong cơ thể có: máy tạo nhịp tim (pacemaker), máy khử rung tim cấy ghép (ICD), ốc tai điện tử, kẹp phình mạch não bằng kim loại từ tính, mảnh đạn/mảnh kim loại trong hốc mắt, hoặc van tim nhân tạo thế hệ cũ.
   - Các vật dụng kim loại bên ngoài như: điện thoại, đồng hồ, thẻ từ, chìa khóa, kẹp tóc, trang sức, kính mắt, răng giả tháo lắp phải được tháo bỏ hoàn toàn trước khi vào phòng máy.
2. Chuẩn bị khi có chỉ định tiêm thuốc đối quang từ (Gadolinium):
   - Cần thông báo tiền sử dị ứng thuốc, bệnh suy thận mạn tính (thường cần xét nghiệm chỉ số chức năng thận Creatinine / eGFR trước tiêm) hoặc đang mang thai / cho con bú.
3. Trong quá trình chụp (15 - 30 phút):
   - Máy sẽ phát ra tiếng kêu nhịp nhàng khá lớn (bệnh viện sẽ trang bị nút tai hoặc tai nghe chống ồn).
   - Người bệnh cần nằm thật yên, giữ đầu cố định để tránh nhiễu ảnh do chuyển động (motion artifacts).`,
  },
  {
    doc_id: 'doc-doctor-review-workflow',
    category: 'sources_safety',
    title: 'Quy trình Bác sĩ Chuyên khoa Xem xét (Doctor-in-the-Loop) & Hồ sơ Bệnh nhân trên NeuroScan',
    content: `NeuroScan AI vận hành theo mô hình "Doctor-in-the-Loop" (Bác sĩ giữ vai trò quyết định trung tâm) nhằm đảm bảo an toàn y khoa cao nhất:
1. Tải ảnh & Sàng lọc AI ban đầu: Bệnh nhân hoặc Bác sĩ tải lát cắt MRI lên hệ thống. Mô hình Computer Vision thực hiện tiền xử lý ROI/CLAHE, tạo bản đồ vùng chú ý Grad-CAM và tính phân phối điểm tự tin trên 4 nhãn.
2. Gửi yêu cầu Bác sĩ Chuyên khoa Xem xét: Bệnh nhân có thể đính kèm ghi chú triệu chứng lâm sàng và gửi ca chụp vào Hàng đợi Xem xét của Bác sĩ Chẩn đoán hình ảnh Thần kinh.
3. Bác sĩ Thẩm định & Kết luận (Clinical Review):
   - Bác sĩ kiểm tra chất lượng ảnh gốc, đối chiếu vùng nhiệt Grad-CAM và đánh giá mức độ đồng thuận với AI (Đồng thuận - Concordant, Đồng thuận một phần - Partial Concordance, Không đồng thuận - Discordant, hoặc Ảnh chưa đủ tiêu chuẩn).
   - Bác sĩ xác nhận nhãn lâm sàng, ghi nhận xét chuyên môn dành cho bệnh nhân và khuyến nghị bước tiếp theo (ví dụ: chụp bổ sung chuỗi xung T1-Gd, hội chẩn Ngoại Thần kinh, hoặc theo dõi định kỳ).
4. Tra cứu trực tiếp qua Trợ lý AI: Người dùng và Bác sĩ có thể nhập mã phiên chụp (ví dụ: SCAN-..., NS-...) hoặc mã bệnh nhân (ví dụ: BN-2026-001) ngay trong khung chat để tra cứu nhanh trạng thái thẩm định và kết quả MRI.`,
  },
];

/**
 * Chia văn bản dài thành các đoạn nhỏ (Semantic Chunks) có chồng lấp (Overlap)
 * giúp giữ trọn ngữ cảnh câu khi tạo Vector Embedding.
 */
export function splitTextIntoSemanticChunks(
  text: string,
  maxChars = 560,
  overlapChars = 90
): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n' + para).trim().length <= maxChars) {
      current = current ? `${current}\n${para}` : para;
    } else {
      if (current) {
        chunks.push(current.trim());
        const tail = current.slice(Math.max(0, current.length - overlapChars)).trim();
        current = tail ? `${tail}\n${para}` : para;
      } else {
        chunks.push(para.slice(0, maxChars).trim());
        current = para.slice(Math.max(0, maxChars - overlapChars)).trim();
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Xây dựng toàn bộ danh sách Knowledge Chunks từ:
 *   1. Tài liệu y khoa chuẩn (STATIC_KNOWLEDGE_DOCUMENTS)
 *   2. Cơ sở dữ liệu câu hỏi thường gặp y khoa (`faq_documents` trong D1)
 */
export async function buildKnowledgeChunks(env: any): Promise<RagChunkRecord[]> {
  const allChunks: RagChunkRecord[] = [];

  for (const doc of STATIC_KNOWLEDGE_DOCUMENTS) {
    const pieces = splitTextIntoSemanticChunks(doc.content, 580, 80);
    pieces.forEach((piece, idx) => {
      allChunks.push({
        id: `${doc.doc_id}-c${idx + 1}`,
        doc_id: doc.doc_id,
        category: doc.category,
        title: doc.title,
        content: `[${doc.title}]\n${piece}`,
      });
    });
  }

  if (env?.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, title, category, content, source FROM faq_documents ORDER BY id ASC'
      ).all();
      if (Array.isArray(results) && results.length > 0) {
        for (const row of results as any[]) {
          const title = row.title || row.question || 'Tài liệu Y khoa NeuroScan';
          const content = row.content || row.answer || '';
          if (!content) continue;
          allChunks.push({
            id: `faq-db-${row.id}`,
            doc_id: `faq-${row.id}`,
            category: row.category || 'tumor_classification',
            title,
            content: `[${title} (${row.source || 'WHO CNS5 / ACR'})]\n${content}`,
          });
        }
      }
    } catch {
      // Bỏ qua nếu bảng faq_documents chưa sẵn sàng
    }
  }

  return allChunks;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt để tính toán đặc trưng ngữ nghĩa
 */
function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Từ điển nhóm đồng nghĩa & khái niệm y khoa thần kinh (Semantic Concept Anchors)
 * Giúp hệ thống Vector Embedding hiểu rõ ngữ cảnh y học Tiếng Việt & Quốc tế.
 */
const VIETNAMESE_MEDICAL_FEATURE_GROUPS: string[][] = [
  ['glioma', 'u than kinh dem', 'te bao hinh sao', 'astrocytoma', 'glioblastoma', 'gbm', 'noi truc', 'intra axial', 'ngam thuoc dang vong', 'hoai tu trung tam'],
  ['meningioma', 'u mang nao', 'ngoai truc', 'extra axial', 'duoi mang cung', 'dural tail', 'mang nhen', 'vom so', 'nen so'],
  ['pituitary', 'u tuyen yen', 'ho yen', 'sella', 'suprasellar', 'giao thoa thi giac', 'ban manh', 'noi tiet', 'prolactin', 'macroadenoma', 'microadenoma'],
  ['no tumor', 'binh thuong', 'khong phat hien u', 'khong co khoi u', 'nhu mo nao', 'nao that can doi', 'am tinh'],
  ['mri', 'cong huong tu', 'chuoi xung', 't1w', 't2w', 'flair', 'gadolinium', 't1 gd', 'doi quang tu', 'dwi', 'adc', 'dicom', 'lat cat', 'axial', 'coronal', 'sagittal'],
  ['grad cam', 'gradcam', 'ban do nhiet', 'heatmap', 'otsu', 'clahe', 'onnx', 'resnet', 'computer vision', 'tien xu ly', 'confidence', 'diem tu tin', 'softmax'],
  ['dau dau', 'co giat', 'non vot', 'yeu liet', 'te bi', 'nhin mo', 'song thi', 'tang ap luc noi so', 'cap cuu', 'co do', 'red flags', '115', 'dot quy'],
  ['chuan bi chup', 'kim loai', 'may tao nhip tim', 'pacemaker', 'suy than', 'di ung', 'tieng on', 'an toan tu truong'],
  ['bac si', 'xem xet', 'tham dinh', 'doctor review', 'hoi chan', 'ngoai than kinh', 'chan doan hinh anh', 'benh nhan', 'ho so', 'ket qua', 'ma ca', 'bn 2026', 'scan'],
];

/**
 * Thuật toán tạo Vector Embedding 1024 chiều dự phòng (Deterministic Semantic Feature Hash)
 * Dùng khi môi trường dev local không có kết nối tới Cloudflare Workers AI binding (`env.AI`),
 * vẫn đảm bảo lưu trữ và tính Cosine Similarity chuẩn xác trên không gian 1024 chiều.
 */
export function computeFallbackEmbedding(text: string, dimensions = 1024): number[] {
  const vec = new Float32Array(dimensions);
  const norm = normalizeVietnamese(text);
  const tokens = norm.split(' ').filter(Boolean);

  // 1. Kích hoạt các chiều ngữ nghĩa theo nhóm khái niệm y khoa (Semantic Concept Dimensions 0..127)
  VIETNAMESE_MEDICAL_FEATURE_GROUPS.forEach((group, groupIdx) => {
    for (const phrase of group) {
      if (norm.includes(phrase)) {
        const baseDim = (groupIdx * 12) % 128;
        for (let k = 0; k < 8; k++) {
          vec[baseDim + k] += 2.6;
        }
      }
    }
  });

  // 2. N-gram (Unigram + Bigram) Feature Hashing trên các chiều 128..1023
  for (let i = 0; i < tokens.length; i++) {
    const unigram = tokens[i];
    const bigram = i < tokens.length - 1 ? `${tokens[i]}_${tokens[i + 1]}` : null;

    for (const gram of [unigram, bigram]) {
      if (!gram) continue;
      let h1 = 2166136261;
      let h2 = 16777619;
      for (let c = 0; c < gram.length; c++) {
        const code = gram.charCodeAt(c);
        h1 ^= code;
        h1 = Math.imul(h1, 16777619);
        h2 ^= code * 31;
        h2 = Math.imul(h2, 2166136261);
      }
      const idx1 = 128 + (Math.abs(h1) % (dimensions - 128));
      const idx2 = 128 + (Math.abs(h2) % (dimensions - 128));
      const weight = gram.includes('_') ? 1.5 : 1.0;
      vec[idx1] += weight;
      vec[idx2] += weight * 0.7;
    }
  }

  // 3. Chuẩn hóa L2 (Unit Vector Normalization) để tính Cosine Similarity chính xác
  let normSq = 0;
  for (let i = 0; i < dimensions; i++) {
    normSq += vec[i] * vec[i];
  }
  const mag = Math.sqrt(normSq) || 1;
  const out = new Array<number>(dimensions);
  for (let i = 0; i < dimensions; i++) {
    out[i] = Number((vec[i] / mag).toFixed(6));
  }
  return out;
}

/**
 * Tạo Vector Embeddings cho một danh sách văn bản.
 * Ưu tiên gọi Cloudflare Workers AI (`@cf/baai/bge-m3`), tự động fallback về
 * Semantic Vector 1024-dim nếu môi trường dev không bật binding AI.
 */
export async function generateEmbeddings(
  env: any,
  texts: string[]
): Promise<{ vectors: number[][]; modelName: string }> {
  if (env?.AI && typeof env.AI.run === 'function') {
    try {
      const response = await env.AI.run(EMBEDDING_MODEL, { text: texts });
      if (response?.data && Array.isArray(response.data) && response.data.length === texts.length) {
        return {
          vectors: response.data,
          modelName: EMBEDDING_MODEL,
        };
      }
    } catch {
      // Fallback xuống thuật toán tạo vector cục bộ khi chạy local offline
    }
  }

  return {
    vectors: texts.map((t) => computeFallbackEmbedding(t, 1024)),
    modelName: `${EMBEDDING_MODEL} (Hybrid Semantic Vector 1024d)`,
  };
}

/**
 * Tính độ tương đồng Cosine (Cosine Similarity) giữa 2 vector cùng số chiều
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Tính điểm cộng từ khóa (Lexical Keyword Overlap Boost) kết hợp với Vector Similarity (Hybrid RAG)
 */
function computeLexicalBoost(query: string, chunk: RagChunkRecord): number {
  const qNorm = normalizeVietnamese(query);
  const cNorm = normalizeVietnamese(`${chunk.title} ${chunk.content}`);
  const qTokens = qNorm.split(' ').filter((w) => w.length >= 2);
  if (qTokens.length === 0) return 0;

  let matched = 0;
  for (const token of qTokens) {
    if (cNorm.includes(token)) matched++;
  }
  return (matched / qTokens.length) * 0.25;
}

/**
 * Khởi tạo bảng `rag_chunks` trong D1 và đánh chỉ mục (Index) toàn bộ kho tri thức y khoa
 * vào Cloudflare Vectorize + D1 Vector Store.
 */
export async function indexKnowledgeBaseToVectorDB(
  env: any,
  forceReindex = false
): Promise<{ indexedCount: number; embeddingModel: string; vectorBackend: string }> {
  if (env?.DB) {
    try {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS rag_chunks (
          id TEXT PRIMARY KEY,
          doc_id TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding_json TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ).run();

      if (!forceReindex) {
        const existing = await env.DB.prepare('SELECT COUNT(*) as count FROM rag_chunks').first();
        if (existing && Number((existing as any).count) >= 12) {
          return {
            indexedCount: Number((existing as any).count),
            embeddingModel: EMBEDDING_MODEL,
            vectorBackend: env?.VECTORIZE
              ? 'Cloudflare Vectorize + D1 Hybrid Store'
              : 'Cloudflare D1 Vector Store (1024-dim)',
          };
        }
      }
    } catch {
      // Bỏ qua nếu DB ở chế độ mock/fallback
    }
  }

  const chunks = await buildKnowledgeChunks(env);
  const textsToEmbed = chunks.map((c) => `${c.title}\n${c.content}`);
  const { vectors, modelName } = await generateEmbeddings(env, textsToEmbed);

  // 1. Lưu vào bảng `rag_chunks` trong D1
  if (env?.DB) {
    try {
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const vecJson = JSON.stringify(vectors[i]);
        await env.DB.prepare(
          `INSERT OR REPLACE INTO rag_chunks (id, doc_id, category, title, content, embedding_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
          .bind(c.id, c.doc_id, c.category, c.title, c.content, vecJson)
          .run();
      }
    } catch {
      // Bỏ qua nếu DB chỉ đọc
    }
  }

  // 2. Upsert vào Cloudflare Vectorize Index (`env.VECTORIZE`) nếu được cấu hình
  let vectorizeSuccess = false;
  if (env?.VECTORIZE && typeof env.VECTORIZE.upsert === 'function') {
    try {
      const vectorRecords = chunks.map((c, idx) => ({
        id: c.id,
        values: vectors[idx],
        metadata: {
          doc_id: c.doc_id,
          category: c.category,
          title: c.title,
          content: c.content,
        },
      }));
      await env.VECTORIZE.upsert(vectorRecords);
      vectorizeSuccess = true;
    } catch {
      vectorizeSuccess = false;
    }
  }

  return {
    indexedCount: chunks.length,
    embeddingModel: modelName,
    vectorBackend: vectorizeSuccess
      ? 'Cloudflare Vectorize Index (neuroscan-rag-index)'
      : 'Cloudflare D1 Vector Store (rag_chunks 1024-dim)',
  };
}

/**
 * Truy vấn Top-K đoạn tri thức y khoa liên quan nhất từ Vector DB (Vectorize / D1 `rag_chunks`)
 * sử dụng Hybrid Search: Cosine Similarity + Lexical Keyword Boost.
 */
export async function searchVectorDB(
  env: any,
  query: string,
  topK = 4
): Promise<{
  results: RagSearchResult[];
  trace: Omit<RagTraceInfo, 'llmModel'>;
}> {
  const indexInfo = await indexKnowledgeBaseToVectorDB(env, false);
  const { vectors: queryVectors, modelName: embeddingModel } = await generateEmbeddings(env, [query]);
  const queryVector = queryVectors[0];

  // 1. Thử truy vấn trực tiếp từ Cloudflare Vectorize (`env.VECTORIZE`)
  if (env?.VECTORIZE && typeof env.VECTORIZE.query === 'function') {
    try {
      const vecMatches = await env.VECTORIZE.query(queryVector, {
        topK,
        returnMetadata: 'all',
      });

      if (vecMatches?.matches && vecMatches.matches.length > 0) {
        const mapped: RagSearchResult[] = vecMatches.matches
          .filter((m: any) => m.metadata?.content || m.metadata?.title)
          .map((m: any) => {
            const chunk: RagChunkRecord = {
              id: String(m.id),
              doc_id: String(m.metadata?.doc_id || m.id),
              category: String(m.metadata?.category || 'general'),
              title: String(m.metadata?.title || 'Tài liệu Y khoa NeuroScan'),
              content: String(m.metadata?.content || m.metadata?.answer || ''),
            };
            const boost = computeLexicalBoost(query, chunk);
            return {
              ...chunk,
              score: Number(Math.min(0.99, (m.score || 0.72) + boost).toFixed(4)),
            };
          })
          .sort((a: RagSearchResult, b: RagSearchResult) => b.score - a.score);

        if (mapped.length > 0) {
          return {
            results: mapped.slice(0, topK),
            trace: {
              pipeline: 'Hybrid RAG (Vectorize Cosine + Medical Lexical Boost)',
              embeddingModel,
              vectorBackend: 'Cloudflare Vectorize (neuroscan-rag-index)',
              totalChunksIndexed: indexInfo.indexedCount,
              topChunks: mapped.slice(0, topK).map((r) => ({
                id: r.id,
                title: r.title,
                category: r.category,
                score: r.score,
              })),
            },
          };
        }
      }
    } catch {
      // Tự động chuyển sang D1 Vector Store bên dưới
    }
  }

  // 2. Truy vấn Vector Similarity trên bảng `rag_chunks` trong Cloudflare D1
  let candidateChunks: Array<RagChunkRecord & { embedding?: number[] }> = [];

  if (env?.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, doc_id, category, title, content, embedding_json FROM rag_chunks'
      ).all();

      if (Array.isArray(results) && results.length > 0) {
        candidateChunks = results.map((r: any) => {
          let parsedVec: number[] | undefined;
          try {
            parsedVec = JSON.parse(r.embedding_json);
          } catch {
            parsedVec = undefined;
          }
          return {
            id: r.id,
            doc_id: r.doc_id,
            category: r.category,
            title: r.title,
            content: r.content,
            embedding: parsedVec,
          };
        });
      }
    } catch {
      candidateChunks = [];
    }
  }

  // Nếu DB chưa có dữ liệu, tính trực tiếp trên bộ nhớ từ `buildKnowledgeChunks`
  if (candidateChunks.length === 0) {
    const rawChunks = await buildKnowledgeChunks(env);
    candidateChunks = rawChunks.map((c) => ({
      ...c,
      embedding: computeFallbackEmbedding(`${c.title}\n${c.content}`, 1024),
    }));
  }

  const scored: RagSearchResult[] = candidateChunks.map((chunk) => {
    const chunkVec =
      chunk.embedding && chunk.embedding.length === queryVector.length
        ? chunk.embedding
        : computeFallbackEmbedding(`${chunk.title}\n${chunk.content}`, queryVector.length);

    const cosSim = cosineSimilarity(queryVector, chunkVec);
    const lexBoost = computeLexicalBoost(query, chunk);
    const finalScore = Number(Math.min(0.99, Math.max(0.15, cosSim * 0.8 + lexBoost)).toFixed(4));

    return {
      id: chunk.id,
      doc_id: chunk.doc_id,
      category: chunk.category,
      title: chunk.title,
      content: chunk.content,
      score: finalScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, topK);

  return {
    results: topResults,
    trace: {
      pipeline: 'Hybrid RAG (Cosine Similarity + Medical Lexical Rerank)',
      embeddingModel,
      vectorBackend: indexInfo.vectorBackend,
      totalChunksIndexed: candidateChunks.length,
      topChunks: topResults.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        score: r.score,
      })),
    },
  };
}

/**
 * Gọi mô hình ngôn ngữ lớn (LLM) để tổng hợp câu trả lời y khoa từ ngữ cảnh RAG:
 *   - Ưu tiên 1: Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)
 *   - Ưu tiên 2: Google Gemini 2.5 Flash (`env.GEMINI_API_KEY`)
 *   - Ưu tiên 3: Trả về `null` để `chatbot.ts` kích hoạt bộ tổng hợp RAG nội bộ thông minh
 */
export async function generateRagLLMResponse(
  env: any,
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<{ text: string | null; llmModel: string }> {
  // 1. Thử gọi Cloudflare Workers AI (Llama 3.3 70B Instruct)
  if (env?.AI && typeof env.AI.run === 'function') {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map((h) => ({
          role: h.role === 'assistant' || h.role === 'model' ? 'assistant' : 'user',
          content: h.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const aiRes = await env.AI.run(WORKERS_LLM_MODEL, {
        messages,
        max_tokens: 900,
        temperature: 0.25,
      });

      const responseText = aiRes?.response?.trim();
      if (responseText && responseText.length > 20) {
        return {
          text: responseText,
          llmModel: WORKERS_LLM_MODEL,
        };
      }
    } catch {
      // Chuyển sang Gemini API hoặc RAG Synthesizer
    }
  }

  // 2. Thử gọi Google Gemini 2.5 Flash nếu có GEMINI_API_KEY hợp lệ
  const geminiKey = env?.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'MOCK_KEY' && geminiKey.length > 15) {
    try {
      const contents = [
        ...history.slice(-6).map((h) => ({
          role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 900,
            },
          }),
        }
      );

      if (res.ok) {
        const data: any = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return {
            text,
            llmModel: 'gemini-2.5-flash',
          };
        }
      }
    } catch {
      // Chuyển xuống RAG Synthesizer nội bộ
    }
  }

  return {
    text: null,
    llmModel: 'neuroscan-rag-synthesizer-v2',
  };
}
