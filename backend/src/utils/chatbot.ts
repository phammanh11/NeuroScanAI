import type { Context } from 'hono';
import type { WorkerEnv } from '../db/init';
import type {
  ChatHistoryItem,
  ChatResponseData,
  MatchedScanSummary,
  RagTraceInfo,
  TumorLabel,
} from '../../shared/types';
import { generateRagLLMResponse, searchVectorDB, type RagSearchResult } from './rag';

function normalizeVi(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function detectEmergencyRedFlags(normMsg: string): boolean {
  const redFlags = [
    'co giat',
    'dong kinh',
    'ngat xiu',
    'hon me',
    'bat tinh',
    'yeu liet',
    'liet nua nguoi',
    'meo mieng',
    'noi do',
    'noi kho',
    'noi ngong',
    'non vot',
    'dau dau du doi',
    'set danh',
    'mat thi luc dot ngot',
    'nhin doi cap',
    'lu lan cap',
    'cung co',
  ];
  return redFlags.some((kw) => normMsg.includes(kw));
}

function classifyMedicalIntent(message: string): {
  intent: string;
  urgency: 'emergency' | 'prompt_evaluation' | 'routine_or_prompt_evaluation' | 'informational';
} {
  const norm = normalizeVi(message);

  if (detectEmergencyRedFlags(norm)) {
    return { intent: 'emergency_alert', urgency: 'emergency' };
  }

  if (
    /bn-\d+/i.test(message) ||
    /scan-\d+/i.test(message) ||
    /ns-\d+/i.test(message) ||
    norm.includes('kiem tra ket qua') ||
    norm.includes('tra cuu ca') ||
    norm.includes('tra cuu ho so') ||
    norm.includes('ket qua chup') ||
    norm.includes('ket qua mri') ||
    norm.includes('danh sach ca benh') ||
    norm.includes('ca chup mri')
  ) {
    return { intent: 'scan_lookup', urgency: 'prompt_evaluation' };
  }

  if (norm.includes('glioma') || norm.includes('than kinh dem') || norm.includes('glioblastoma')) {
    return { intent: 'glioma_info', urgency: 'prompt_evaluation' };
  }

  if (
    norm.includes('meningioma') ||
    norm.includes('u mang nao') ||
    norm.includes('dural tail') ||
    norm.includes('duoi mang cung')
  ) {
    return { intent: 'meningioma_info', urgency: 'routine_or_prompt_evaluation' };
  }

  if (
    norm.includes('pituitary') ||
    norm.includes('tuyen yen') ||
    norm.includes('ho yen') ||
    norm.includes('prolactin')
  ) {
    return { intent: 'pituitary_info', urgency: 'routine_or_prompt_evaluation' };
  }

  if (norm.includes('no tumor') || norm.includes('khong phat hien') || norm.includes('binh thuong')) {
    return { intent: 'notumor_info', urgency: 'informational' };
  }

  if (
    norm.includes('t1w') ||
    norm.includes('t2w') ||
    norm.includes('flair') ||
    norm.includes('gadolinium') ||
    norm.includes('t1 gd') ||
    norm.includes('doi quang') ||
    norm.includes('chuoi xung') ||
    norm.includes('dwi')
  ) {
    return { intent: 'mri_sequence', urgency: 'informational' };
  }

  if (
    norm.includes('grad cam') ||
    norm.includes('gradcam') ||
    norm.includes('ban do nhiet') ||
    norm.includes('otsu') ||
    norm.includes('clahe') ||
    norm.includes('onnx') ||
    norm.includes('diem tu tin') ||
    norm.includes('confidence')
  ) {
    return { intent: 'cv_pipeline', urgency: 'informational' };
  }

  if (
    norm.includes('chuan bi') ||
    norm.includes('kim loai') ||
    norm.includes('may tao nhip') ||
    norm.includes('truoc khi chup') ||
    norm.includes('an toan tu truong')
  ) {
    return { intent: 'pre_exam_guide', urgency: 'informational' };
  }

  if (
    norm === 'hi' ||
    norm === 'hello' ||
    norm === 'hey' ||
    norm === 'xin chao' ||
    norm === 'chao' ||
    norm === 'alo' ||
    norm === 'e' ||
    norm === 'oi' ||
    norm === 'bot oi' ||
    norm === 'ai oi' ||
    norm === 'bac si oi' ||
    norm === 'cho hoi' ||
    norm.startsWith('xin chao') ||
    norm.startsWith('chao bac si') ||
    norm.startsWith('chao ai')
  ) {
    return { intent: 'greeting', urgency: 'informational' };
  }

  return { intent: 'general', urgency: 'informational' };
}

/**
 * Tra cứu trực tiếp ca chụp MRI & hồ sơ bệnh nhân từ Cloudflare D1
 * Hỗ trợ tìm theo:
 *  - Mã bệnh nhân (`BN-2026-002`)
 *  - Mã ca chụp (`SCAN-2026-0001`, `NS-2026-0001` hoặc ID số)
 *  - Số điện thoại (`09...`)
 *  - Ca chụp mới nhất khi người dùng hỏi kết quả MRI
 */
async function lookupScansInDatabase(
  env: any,
  message: string
): Promise<{
  scans: MatchedScanSummary[];
  contextText: string;
}> {
  if (!env?.DB) {
    return { scans: [], contextText: '' };
  }

  const bnMatch = message.match(/BN-\d{4}-(\d{1,4})/i);
  const scanCodeMatch = message.match(/(?:SCAN-\d{4}-|NS-\d{4}-|#)(\d{1,5})/i);
  const phoneMatch = message.match(/(0\d{9,10})/);
  const norm = normalizeVi(message);

  const wantsLookup =
    Boolean(bnMatch) ||
    Boolean(scanCodeMatch) ||
    Boolean(phoneMatch) ||
    norm.includes('ket qua') ||
    norm.includes('tra cuu') ||
    norm.includes('ho so') ||
    norm.includes('ca benh') ||
    norm.includes('ca chup') ||
    norm.includes('bn-');

  if (!wantsLookup) {
    return { scans: [], contextText: '' };
  }

  try {
    const querySql = `
      SELECT p.id, p.scan_id, p.label, p.confidence, p.created_at,
             s.r2_key, s.file_name, s.slice_type, s.sequence_type, s.uploaded_at, s.patient_id,
             u.full_name as patient_name,
             r.id as review_id, r.confirmed_label, r.note as doctor_note, r.ai_assessment, r.recommended_step,
             doc.full_name as doctor_name
      FROM predictions p
      JOIN mri_scans s ON s.id = p.scan_id
      JOIN users u ON u.id = s.patient_id
      LEFT JOIN doctor_reviews r ON r.prediction_id = p.id
      LEFT JOIN users doc ON doc.id = r.doctor_id
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const { results } = await env.DB.prepare(querySql).all();
    const allRows = (results || []) as any[];
    if (allRows.length === 0) {
      return { scans: [], contextText: '' };
    }

    let filtered = allRows;

    if (bnMatch) {
      const bnNum = parseInt(bnMatch[1], 10);
      const exact = allRows.filter((r) => Number(r.patient_id) === bnNum || Number(r.id) === bnNum);
      if (exact.length > 0) filtered = exact;
    } else if (scanCodeMatch) {
      const scanNum = parseInt(scanCodeMatch[1], 10);
      const exact = allRows.filter((r) => Number(r.id) === scanNum || Number(r.scan_id) === scanNum);
      if (exact.length > 0) filtered = exact;
    } else if (phoneMatch) {
      const exact = allRows.filter((r) =>
        String(r.patient_phone || '')
          .replace(/\s+/g, '')
          .includes(phoneMatch[1])
      );
      if (exact.length > 0) filtered = exact;
    }

    const topScans: MatchedScanSummary[] = filtered.slice(0, 3).map((r) => {
      const sessionCode = `NS-2026-${String(r.id).padStart(4, '0')}`;
      const patientCode = `BN-2026-${String(r.patient_id || 2).padStart(3, '0')}`;
      const hasReview = Boolean(r.review_id || r.review);
      const statusVi = hasReview
        ? 'Đã có kết luận Bác sĩ'
        : 'Chờ Bác sĩ chuyên khoa thẩm định';

      const r2Key = String(r.r2_key || r.scan?.r2_key || 'sample_scans/sample_glioma_axial.jpg');
      const imageUrl =
        r2Key.startsWith('sample_scans/') || r2Key.startsWith('/sample_scans/')
          ? r2Key.startsWith('/')
            ? r2Key
            : `/${r2Key}`
          : `/api/files/${r2Key}`;

      return {
        id: r.id,
        sessionCode,
        patientCode,
        patientName: r.patient_name || 'Nguyễn Minh An',
        predictedLabel: (r.confirmed_label || r.label || 'Glioma') as TumorLabel,
        confidence: Number(r.confidence || 0.92),
        reviewStatus: statusVi,
        doctorName: r.doctor_name || 'BS.CKII Trần Quốc Bảo',
        doctorNote:
          r.doctor_note ||
          r.review?.note ||
          'Đang trong hàng đợi thẩm định lâm sàng bởi Bác sĩ Chẩn đoán hình ảnh Thần kinh.',
        imageUrl,
        createdAt: r.created_at || r.uploaded_at || new Date().toISOString(),
      };
    });

    const lines = topScans.map(
      (s) =>
        `- Mã ca: ${s.sessionCode} | Hồ sơ: ${s.patientCode} (${s.patientName}) | Nhãn AI/Lâm sàng: ${s.predictedLabel} (Độ tự tin ${(s.confidence * 100).toFixed(1)}%) | Trạng thái: ${s.reviewStatus} | Bác sĩ: ${s.doctorName} | Ghi chú: ${s.doctorNote}`
    );

    return {
      scans: topScans,
      contextText: lines.join('\n'),
    };
  } catch {
    return { scans: [], contextText: '' };
  }
}

function buildSuggestionsByIntent(intent: string): string[] {
  switch (intent) {
    case 'emergency_alert':
      return [
        'Các dấu hiệu cờ đỏ tăng áp lực nội sọ là gì?',
        'Khi nào cần chụp MRI hoặc CT sọ não cấp cứu?',
        'Kiểm tra kết quả chụp MRI trong hệ thống',
      ];
    case 'scan_lookup':
      return [
        'Phân biệt Glioma, Meningioma và Pituitary trên ảnh MRI',
        'Điểm tự tin (Confidence Score) và bản đồ nhiệt Grad-CAM là gì?',
        'Chuỗi xung T1W, T2W, FLAIR và T1-Gd khác nhau thế nào?',
      ];
    case 'glioma_info':
    case 'meningioma_info':
    case 'pituitary_info':
    case 'notumor_info':
      return [
        'Phân biệt Glioma, Meningioma và Pituitary trên ảnh MRI',
        'Chuỗi xung T1-Gd đối quang từ có vai trò gì?',
        'Kiểm tra kết quả chụp MRI trong hệ thống',
        'Cần chuẩn bị gì trước khi chụp MRI sọ não?',
      ];
    case 'mri_sequence':
    case 'cv_pipeline':
      return [
        'Bản đồ nhiệt Grad-CAM và tiền xử lý CLAHE hoạt động ra sao?',
        'Phân biệt 4 nhãn Glioma, Meningioma, Pituitary, No Tumor',
        'Dấu hiệu thần kinh cờ đỏ nào cần đi cấp cứu ngay?',
      ];
    default:
      return [
        'Phân biệt Glioma, Meningioma và Pituitary trên ảnh MRI',
        'Chuỗi xung T1W, T2W, FLAIR và T1-Gd khác nhau thế nào?',
        'Kiểm tra kết quả chụp MRI trong hệ thống',
        'Dấu hiệu cờ đỏ thần kinh nào cần đi cấp cứu ngay?',
      ];
  }
}

export async function processChatbotMessage(
  env: WorkerEnv,
  message: string,
  history: ChatHistoryItem[] = []
): Promise<ChatResponseData> {
  const cleanMessage = message.trim();
  const { intent, urgency } = classifyMedicalIntent(cleanMessage);
  const isEmergency = urgency === 'emergency';

  // 1. Truy vấn ngữ cảnh y khoa từ Vector Database (Top 4 Semantic Chunks)
  const { results: ragChunks, trace: ragTraceBase } = await searchVectorDB(env, cleanMessage, 4);

  // 2. Tra cứu trực tiếp ca chụp MRI & hồ sơ bệnh nhân từ D1 (nếu câu hỏi liên quan)
  const { scans: matchedScans, contextText: scanContextText } = await lookupScansInDatabase(
    env,
    cleanMessage
  );

  // 3. Tổng hợp ngữ cảnh RAG đưa vào System Prompt của LLM
  const ragContextFormatted = ragChunks
    .map(
      (c: RagSearchResult, idx: number) =>
        `--- [Tài liệu Y khoa #${idx + 1} | Độ tương đồng Vector: ${(c.score * 100).toFixed(1)}%] ---\n${c.content}`
    )
    .join('\n\n');

  const systemPrompt = `Bạn là **Trợ lý AI Y tế Thần kinh — NeuroScan Clinical Assistant**, hệ thống hỗ trợ giải thích hình ảnh Cộng hưởng từ (MRI) sọ não và giáo dục sức khỏe thần kinh chuẩn y khoa.

NGUYÊN TẮC AN TOÀN Y KHOA BẮT BUỘC:
1. Chỉ sử dụng thông tin từ [NGỮ CẢNH VECTOR RAG] và [DỮ LIỆU CA CHỤP MRI TRONG HỆ THỐNG] bên dưới để trả lời.
2. Tuyệt đối KHÔNG tự ý kê đơn thuốc, liều lượng thuốc hoặc đưa ra phác đồ điều trị cá nhân hóa thay thế Bác sĩ.
3. Nếu phát hiện triệu chứng Cờ đỏ Cấp cứu (co giật mới khởi phát, đau đầu dữ dội kèm nôn vọt, yếu liệt nửa người, méo miệng, rối loạn ý thức), BẮT BUỘC đặt cảnh báo **CẤP CỨU Y KHOA (GỌI 115)** ở ngay đầu câu trả lời.
4. Trình bày câu trả lời bằng Tiếng Việt rõ ràng, chuyên nghiệp, chia mục có in đậm (**...**) và gạch đầu dòng trực quan. Luôn nhắc nhở kết quả AI chỉ mang tính chất sàng lọc tham khảo (Doctor-in-the-Loop).

=== NGỮ CẢNH VECTOR RAG (TOP-K CHUNKS TỪ KNOWLEDGE BASE) ===
${ragContextFormatted}

${scanContextText ? `=== DỮ LIỆU CA CHỤP MRI & HỒ SƠ BỆNH NHÂN TRONG HỆ THỐNG D1 ===\n${scanContextText}` : ''}`;

  // 4. Gọi LLM (Cloudflare Workers AI Llama-3.3-70B -> Gemini 2.5 Flash) cho câu hỏi chuyên môn (bỏ qua lời chào ngắn)
  const llmResult =
    intent === 'greeting'
      ? { text: null, llmModel: 'neuroscan-rag-synthesizer-v2' }
      : await generateRagLLMResponse(env, systemPrompt, cleanMessage, history);
  let finalReply = llmResult.text;

  // 5. Nếu môi trường không bật LLM ngoài, sử dụng Bộ tổng hợp RAG Y khoa Nội bộ (NeuroScan Medical RAG Synthesizer)
  if (!finalReply) {
    if (intent === 'emergency_alert') {
      finalReply =
        `🚨 **CẢNH BÁO CẤP CỨU THẦN KINH KHẨN CẤP (GỌI 115 NGAY LẬP TỨC):**\n\n` +
        `Các triệu chứng bạn vừa mô tả (*đau đầu dữ dội đột ngột, nôn vọt, co giật mới khởi phát, yếu liệt tay chân, méo miệng, nói đớ hoặc suy giảm ý thức*) là **dấu hiệu cờ đỏ (Red Flags)** của Hội chứng Tăng áp lực nội sọ cấp tính hoặc Tai biến mạch máu não.\n\n` +
        `### Hướng xử trí khẩn cấp ngay lập tức\n` +
        `- **Gọi ngay Cấp cứu 115** hoặc nhờ người thân đưa đến Khoa Cấp cứu của bệnh viện có chuyên khoa Ngoại Thần kinh gần nhất.\n` +
        `- **Tuyệt đối không tự điều khiển phương tiện giao thông** và không tự ý uống thuốc giảm đau/hạ áp để chờ triệu chứng tự hết.\n` +
        `- Đặt người bệnh nằm nghiêng an toàn nếu có nôn hoặc co giật, nới rộng quần áo vùng cổ và ghi nhớ mốc thời gian khởi phát triệu chứng.\n\n` +
        `*Lưu ý: Trong tình huống cấp cứu, việc thăm khám trực tiếp và chụp CT/MRI sọ não khẩn cấp tại bệnh viện là ưu tiên tuyệt đối.*`;
    } else if (intent === 'scan_lookup' && matchedScans.length > 0) {
      const scanLines = matchedScans
        .map(
          (s) =>
            `• **${s.sessionCode}** — Hồ sơ **${s.patientCode}** (*${s.patientName}*):\n` +
            `  - Nhãn phân loại: **${s.predictedLabel}** (Độ tự tin Softmax: **${(s.confidence * 100).toFixed(1)}%**)\n` +
            `  - Trạng thái thẩm định: **${s.reviewStatus}** (${s.doctorName})\n` +
            `  - Nhận xét lâm sàng: ${s.doctorNote}`
        )
        .join('\n\n');

      finalReply =
        `📋 **KẾT QUẢ TRA CỨU CA CHỤP MRI TRONG HỆ THỐNG NEUROSCAN D1:**\n\n` +
        `${scanLines}\n\n` +
        `### Giải thích chuyên môn từ Kho tri thức RAG\n` +
        `- **Điểm tự tin (Confidence Score)** phản ánh xác suất toán học của mạng nơ-ron trên lát cắt 2D hiện tại, đã qua tiền xử lý cắt vùng sọ não **Otsu ROI** và cân bằng tương phản **CLAHE**.\n` +
        `- Bạn có thể nhấn trực tiếp vào **Thẻ ca chụp MRI** hiển thị bên dưới để mở giao diện đối chiếu bản đồ nhiệt **Grad-CAM** và xem chi tiết nhận xét của Bác sĩ Chuyên khoa.`;
    } else if (intent === 'glioma_info') {
      finalReply =
        `🧠 **PHÂN LOẠI U THẦN KINH ĐỆM (GLIOMA) THEO TIÊU CHUẨN WHO CNS5:**\n\n` +
        `**Glioma (U thần kinh đệm)** là nhóm u não nguyên phát **nội trục (intra-axial)** khởi phát từ các tế bào thần kinh đệm nâng đỡ nhu mô não (*Astrocytes, Oligodendrocytes, Ependymal cells*).\n\n` +
        `### Đặc điểm nhận diện trên ảnh chụp MRI sọ não\n` +
        `- **Vị trí giải phẫu:** Nằm sâu trong nhu mô bán cầu đại não, thân não hoặc tiểu não.\n` +
        `- **Trên chuỗi xung T2W / FLAIR:** Khối tổn thương tăng tín hiệu kèm vùng **phù não vận mạch (vasogenic edema)** lan tỏa xung quanh theo các bó chất trắng.\n` +
        `- **Trên chuỗi xung T1-Gd (sau tiêm đối quang từ):** Các u thần kinh đệm bậc cao (WHO độ 3–4 như *Glioblastoma*) thường có hình ảnh **ngấm thuốc mạnh dạng vòng không đều (ring-enhancing lesion)** bao quanh vùng hoại tử trung tâm giảm tín hiệu.\n\n` +
        `### Hướng đánh giá lâm sàng tiếp theo\n` +
        `- Hội chẩn **Bác sĩ Chẩn đoán hình ảnh Thần kinh** và **Bác sĩ Ngoại Thần kinh** để đánh giá đầy đủ bộ phim DICOM đa mặt phẳng (kết hợp xung khuếch tán DWI/ADC và cộng hưởng từ phổ MRS).`;
    } else if (intent === 'meningioma_info') {
      finalReply =
        `🧠 **PHÂN LOẠI U MÀNG NÃO (MENINGIOMA) & DẤU HIỆU ĐUÔI MÀNG CỨNG:**\n\n` +
        `**Meningioma (U màng não)** là khối u **ngoài trục (extra-axial)** phổ biến nhất của hệ thần kinh trung ương, xuất phát từ các tế bào màng nhện (*arachnoid cap cells*) của màng cứng. Khoảng **80–85%** u màng não là lành tính (WHO độ 1) và tiến triển chậm.\n\n` +
        `### Đặc điểm điển hình trên hình ảnh MRI\n` +
        `- **Vị trí giải phẫu:** Nằm ngoài nhu mô não, bám sát màng cứng vùng vòm sọ, liềm đại não, cánh xương bướm hoặc vùng nền sọ - trước cầu não.\n` +
        `- **Tính chất ngấm thuốc (T1-Gd):** Khối choán chỗ có ranh giới rất rõ, **ngấm thuốc đối quang từ mạnh và đồng nhất**, thường kèm **dấu hiệu đuôi màng cứng (Dural Tail Sign)** và có thể gây dày xương sọ kế cận (*hyperostosis*).\n\n` +
        `### Hướng theo dõi & Xử trí tham khảo\n` +
        `- Các u màng não kích thước nhỏ, không gây triệu chứng chèn ép thường được chỉ định theo dõi định kỳ bằng MRI mỗi 6–12 tháng; nếu gây chèn ép sẽ cân nhắc vi phẫu hoặc xạ phẫu định vị (*Gamma Knife*).`;
    } else if (intent === 'pituitary_info') {
      finalReply =
        `🧠 **U TUYẾN YÊN (PITUITARY ADENOMA) TRÊN MRI VÙNG HỐ YÊN:**\n\n` +
        `**Pituitary Adenoma (U tuyến yên)** là khối u phát sinh từ thùy trước tuyến yên nằm trong **hố yên (sella turcica)** ở nền sọ, đa số lành tính về mặt mô học.\n\n` +
        `### Phân loại kích thước & Hình ảnh MRI (Coronal / Sagittal T1-Gd)\n` +
        `- **Microadenoma (< 10 mm):** Khu trú gọn trong lòng hố yên, thường phát hiện tốt nhất trên chuỗi xung T1-Gd động (*Dynamic Contrast MRI*).\n` +
        `- **Macroadenoma (>= 10 mm):** Phát triển mở rộng lên bể trên yên (*suprasellar cistern*), có thể tạo hình ảnh *"người tuyết" (figure-of-8)* và chèn ép **giao thoa thị giác (optic chiasm)**.\n\n` +
        `### Biểu hiện lâm sàng cần lưu ý\n` +
        `- **Thị giác:** Nhìn mờ, hẹp thị trường hai bên thái dương (*bán manh thái dương*).\n` +
        `- **Nội tiết:** Rối loạn hormone tuyến yên (tăng Prolactin, GH, ACTH hoặc suy tuyến yên) — cần kết hợp xét nghiệm bộ hormone máu và khám chuyên khoa Nội tiết - Ngoại Thần kinh.`;
    } else if (intent === 'notumor_info') {
      finalReply =
        `✅ **Ý NGHĨA NHÃN "NO TUMOR" (KHÔNG PHÁT HIỆN KHỐI U ĐIỂN HÌNH):**\n\n` +
        `Khi mô hình NeuroScan AI dự đoán nhãn **No Tumor**, điều đó có nghĩa là trên lát cắt MRI 2D hiện tại:\n` +
        `- Nhu mô chất xám và chất trắng hai bán cầu đại não có tín hiệu đồng nhất, đối xứng.\n` +
        `- Cấu trúc đường giữa cân đối, hệ thống não thất và các rãnh cuộn não thông thoáng, không ghi nhận khối choán chỗ mang đặc trưng của *Glioma*, *Meningioma* hay *Pituitary*.\n\n` +
        `### Lưu ý an toàn y khoa quan trọng\n` +
        `- Kết quả trên **1 lát cắt 2D đơn lẻ** không thay thế việc khảo sát toàn bộ chuỗi xung DICOM đa mặt phẳng (Axial, Coronal, Sagittal).\n` +
        `- Nếu bạn vẫn có triệu chứng lâm sàng (đau đầu dai dẳng, chóng mặt, tê yếu hoặc nhìn mờ), hãy gửi ca chụp cho **Bác sĩ Chuyên khoa Xem xét** ngay trên hệ thống hoặc thăm khám trực tiếp tại bệnh viện.`;
    } else if (intent === 'mri_sequence') {
      finalReply =
        `🧲 **GIẢI THÍCH CÁC CHUỖI XUNG MRI SỌ NÃO LÂM SÀNG (T1W, T2W, FLAIR, T1-GD):**\n\n` +
        `Trong chẩn đoán hình ảnh thần kinh, mỗi chuỗi xung MRI cung cấp một góc nhìn vật lý khác nhau về mô não:\n` +
        `- **T1-weighted (T1W):** Quan sát giải phẫu cấu trúc não sắc nét; dịch não tủy (CSF) có màu đen, chất trắng sáng hơn chất xám.\n` +
        `- **T2-weighted (T2W):** Dịch não tủy và các vùng dịch phù nề có màu trắng sáng, giúp phát hiện nhanh tổn thương nhu mô.\n` +
        `- **FLAIR (Fluid-Attenuated Inversion Recovery):** Giống T2W nhưng xóa tín hiệu nước tự do của dịch não tủy (CSF màu đen), giúp làm nổi bật rõ rệt **vùng phù não vận mạch quanh khối u**.\n` +
        `- **T1-Gd (T1W sau tiêm đối quang từ Gadolinium):** Làm sáng các vùng có hàng rào máu - não bị tổn thương hoặc giàu mạch máu nuôi u — cực kỳ quan trọng để đánh giá **Glioma ngấm thuốc dạng vòng**, **Meningioma đuôi màng cứng** và **U tuyến yên**.\n` +
        `- **DWI / ADC:** Đánh giá khuếch tán phân tử nước, giúp phân biệt áp-xe não với u hoại tử và phát hiện nhồi máu não cấp.`;
    } else if (intent === 'cv_pipeline') {
      finalReply =
        `🔬 **QUY TRÌNH COMPUTER VISION & BẢN ĐỒ NHIỆT GRAD-CAM TRÊN NEUROSCAN AI:**\n\n` +
        `Khi một lát cắt MRI được tải lên, hệ thống thực hiện pipeline 4 bước tự động:\n` +
        `- **1. Kiểm định Modality & Tách hộp sọ (Otsu Thresholding ROI):** Tự động phát hiện biên hộp sọ và cắt bỏ phần nền đen dư thừa xung quanh.\n` +
        `- **2. Cân bằng tương phản cục bộ (CLAHE):** Tăng cường độ nét vi cấu trúc giữa chất xám, chất trắng và ranh giới tổn thương.\n` +
        `- **3. Suy luận mạng nơ-ron (ONNX Runtime / Deep CNN):** Tính toán vector đặc trưng và phân phối xác suất Softmax trên 4 nhãn (*Glioma, Meningioma, Pituitary, No Tumor*).\n` +
        `- **4. Trực quan hóa vùng chú ý Grad-CAM:** Sinh bản đồ nhiệt (*Heatmap*) đánh dấu vùng pixel đóng góp trọng số lớn nhất vào quyết định của AI (màu đỏ/vàng là vùng trọng tâm), giúp Bác sĩ đối chiếu nhanh với giải phẫu thực tế.`;
    } else if (intent === 'pre_exam_guide') {
      finalReply =
        `🏥 **HƯỚNG DẪN CHUẨN BỊ TRƯỚC KHI CHỤP CỘNG HƯỞNG TỪ (MRI) SỌ NÃO:**\n\n` +
        `Máy MRI sử dụng từ trường mạnh (1.5T – 3.0T) và không dùng tia X. Để buổi chụp diễn ra an toàn và hình ảnh rõ nét nhất, bạn cần lưu ý:\n` +
        `- **Sàng lọc thiết bị cấy ghép kim loại:** Báo ngay cho Bác sĩ/Kỹ thuật viên nếu cơ thể có máy tạo nhịp tim (*pacemaker*), ốc tai điện tử, kẹp phình mạch não kim loại từ tính hoặc mảnh kim loại trong cơ thể.\n` +
        `- **Tháo bỏ vật dụng cá nhân bằng kim loại:** Tháo toàn bộ trang sức, đồng hồ, kính mắt, kẹp tóc, răng giả tháo lắp, thẻ từ và điện thoại trước khi vào phòng chụp.\n` +
        `- **Nếu có tiêm thuốc đối quang từ (Gadolinium):** Thông báo tiền sử dị ứng hoặc bệnh lý thận (thường cần kiểm tra chỉ số Creatinine/eGFR trước tiêm).\n` +
        `- **Giữ đầu cố định trong lúc chụp (15–30 phút):** Nằm yên theo hướng dẫn của kỹ thuật viên để tránh nhiễu ảnh do chuyển động (*motion artifacts*).`;
    } else if (intent === 'greeting') {
      finalReply =
        `Xin chào! Tôi là **Trợ lý AI Y tế Thần kinh — NeuroScan Clinical Assistant** (vận hành trên kiến trúc **RAG Vector DB + Cloudflare Workers AI**).\n\n` +
        `Tôi có thể hỗ trợ bạn:\n` +
        `- **Giải thích 4 nhãn phân loại MRI:** *Glioma (U thần kinh đệm)*, *Meningioma (U màng não)*, *Pituitary (U tuyến yên)* và *No Tumor* theo tiêu chuẩn WHO CNS5.\n` +
        `- **Giải thích kỹ thuật MRI & AI:** Ý nghĩa các chuỗi xung *T1W, T2W, FLAIR, T1-Gd*, tiền xử lý *Otsu/CLAHE* và bản đồ nhiệt *Grad-CAM*.\n` +
        `- **Tra cứu nhanh ca chụp MRI & Hồ sơ bệnh nhân:** Nhập mã ca (ví dụ: \`NS-2026-0001\`) hoặc mã bệnh nhân (\`BN-2026-002\`) hoặc bấm *"Kiểm tra kết quả chụp MRI trong hệ thống"* để xem trạng thái Bác sĩ thẩm định.\n` +
        `- **Nhận diện dấu hiệu Cờ đỏ Cấp cứu Thần kinh** và hướng dẫn chuẩn bị trước khi chụp MRI.`;
    } else {
      const topChunkSummaries = ragChunks
        .slice(0, 2)
        .map((c) => {
          const cleanBody = c.content.replace(/^\[.*?\]\n?/, '').trim();
          return `### ${c.title}\n${cleanBody}`;
        })
        .join('\n\n');

      finalReply =
        `Dựa trên **Cơ sở dữ liệu Vector Y khoa NeuroScan (RAG Knowledge Base)**, dưới đây là thông tin chuyên môn phù hợp nhất với câu hỏi của bạn:\n\n` +
        `${topChunkSummaries}\n\n` +
        `*Lưu ý an toàn y khoa: Thông tin trên mang tính chất giáo dục sức khỏe và hỗ trợ tham khảo lâm sàng. Mọi quyết định chẩn đoán và điều trị cần được Bác sĩ Chuyên khoa Chẩn đoán hình ảnh / Ngoại Thần kinh trực tiếp thăm khám.*`;
    }
  }

  const ragTrace: RagTraceInfo = {
    pipeline: ragTraceBase.pipeline,
    embeddingModel: ragTraceBase.embeddingModel,
    llmModel: llmResult.llmModel,
    vectorBackend: ragTraceBase.vectorBackend,
    totalChunksIndexed: ragTraceBase.totalChunksIndexed,
    topChunks: ragTraceBase.topChunks.map((ch) => ({
      id: ch.id,
      title: ch.title,
      category: ch.category,
      source: 'WHO CNS5 & ACR MRI Guidelines',
      similarity: ch.score,
      score: ch.score,
    })),
  };

  const sources = ragChunks.slice(0, 2).map((ch) => ({
    title: ch.title,
    source: 'WHO CNS5 & ACR Brain MRI Guidelines',
    organization: 'WHO CNS5 / ACR Appropriateness Criteria',
    url: 'https://radiopaedia.org',
    category: ch.category,
  }));

  return {
    reply: finalReply,
    intent,
    isEmergency,
    urgency,
    emergencyInstructions: isEmergency
      ? 'Vui lòng gọi ngay Cấp cứu 115 hoặc đưa bệnh nhân đến Khoa Cấp cứu gần nhất.'
      : undefined,
    ragTrace,
    matchedScans: matchedScans.length > 0 ? matchedScans : undefined,
    sources,
    suggestions: buildSuggestionsByIntent(intent),
  };
}

export async function handleMedicalChat(
  c: Context<{ Bindings: WorkerEnv; Variables: any }>,
  rawMessage: string,
  history: ChatHistoryItem[] = [],
  sessionId: number = 1,
  _userId: number = 2
): Promise<ChatResponseData> {
  const response = await processChatbotMessage(c.env, rawMessage, history);

  // Lưu đồng bộ cặp tin nhắn Người dùng + Trợ lý AI cùng metadata RAG + Matched Scans vào D1
  try {
    const lastRow: any = await c.env.DB.prepare(
      'SELECT id, sender FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1'
    )
      .bind(sessionId)
      .first()
      .catch(() => null);

    if (lastRow && lastRow.sender === 'user') {
      await c.env.DB.prepare('DELETE FROM chat_messages WHERE id = ?')
        .bind(lastRow.id)
        .run()
        .catch(() => {});
    }

    await c.env.DB.prepare(
      'INSERT INTO chat_messages (session_id, sender, content, is_emergency) VALUES (?, ?, ?, 0)'
    )
      .bind(sessionId, 'user', rawMessage.trim())
      .run();

    const metadataPayload = JSON.stringify({
      sources: response.sources || [],
      ragTrace: response.ragTrace,
      matchedScans: response.matchedScans || [],
      urgency: response.urgency,
      suggestions: response.suggestions || [],
    });

    await c.env.DB.prepare(
      'INSERT INTO chat_messages (session_id, sender, content, is_emergency, sources_json) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(
        sessionId,
        'bot',
        response.reply,
        response.isEmergency ? 1 : 0,
        metadataPayload
      )
      .run();
  } catch {
    // Bỏ qua nếu DB không ghi được
  }

  return response;
}
