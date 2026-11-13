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

function isNeuroScanScope(norm: string): boolean {
  const scopeTerms = [
    // U não & 4 nhóm tổn thương
    'glioma', 'meningioma', 'pituitary', 'no tumor', 'u nao', 'khoi u', 'ung thu nao',
    'than kinh dem', 'u mang nao', 'tuyen yen', 'ho yen', 'dural tail', 'duoi mang cung',
    'glioblastoma', 'prolactin', 'astrocytoma', 'oligodendroglioma', 'adenoma',
    // Chuỗi xung MRI & Kỹ thuật hình ảnh
    'mri', 'cong huong tu', 'chup nao', 'so nao', 'chuoi xung', 't1w', 't2w', 'flair',
    't1 gd', 't1-gd', 't1+c', 'gadolinium', 'doi quang tu', 'dwi', 'adc', 'mrs', 'dicom',
    'lat cat', 'nhu mo', 'chat trang', 'chat xam', 'nao that', 'vo nao', 'duong giua',
    'phu nao', 'phu van mach', 'vasogenic edema',
    // An toàn & Quy trình chụp
    'kim loai', 'may tao nhip', 'pacemaker', 'an toan tu truong', 'chuan bi chup', 'chong chi dinh',
    // Cờ đỏ & Triệu chứng thần kinh
    'co giat', 'dong kinh', 'ngat xiu', 'hon me', 'bat tinh', 'yeu liet', 'liet nua nguoi',
    'meo mieng', 'noi do', 'noi kho', 'noi ngong', 'non vot', 'dau dau', 'set danh', 'thi luc',
    'nhin doi', 'ban manh', 'tang ap luc noi so', 'icp', 'giao thoa thi giac',
    // Hệ thống & AI NeuroScan
    'neuroscan', 'ai', 'mo hinh', 'onnx', 'grad cam', 'gradcam', 'otsu', 'clahe',
    'tu tin', 'confidence', 'softmax', 'phan loai', 'sang loc', 'ca chup', 'ca benh',
    'ho so', 'bac si', 'benh nhan', 'tham dinh', 'bn-', 'ns-', 'scan-', 'tra cuu',
    'ket qua', 'who cns5', 'acr', 'tro ly', 'khao sat'
  ];

  return scopeTerms.some((term) => norm.includes(term));
}

function classifyMedicalIntent(message: string): {
  intent: string;
  urgency: 'emergency' | 'prompt_evaluation' | 'routine_or_prompt_evaluation' | 'informational';
} {
  const norm = normalizeVi(message);

  if (detectEmergencyRedFlags(norm)) {
    return { intent: 'emergency_alert', urgency: 'emergency' };
  }

  // Chặn và từ chối các câu hỏi về số điện thoại / danh bạ liên hệ cá nhân (không có trong DB)
  if (
    norm.includes('so dien thoai') ||
    norm.includes('sdt') ||
    norm.includes('dien thoai') ||
    norm.includes('phone') ||
    norm.includes('hotline') ||
    norm.includes('lien he qua so') ||
    /(?:^|\D)0\d{9,10}(?:\D|$)/.test(message)
  ) {
    return { intent: 'unsupported_contact_query', urgency: 'informational' };
  }

  // Nhận diện câu hỏi so sánh hoặc phân biệt giữa các khối u não
  const tumorCount = [
    norm.includes('glioma') || norm.includes('than kinh dem'),
    norm.includes('meningioma') || norm.includes('u mang nao'),
    norm.includes('pituitary') || norm.includes('tuyen yen'),
    norm.includes('no tumor') || norm.includes('khong co u') || norm.includes('binh thuong'),
  ].filter(Boolean).length;

  const isComparisonQuery =
    norm.includes('phan biet') ||
    norm.includes('khac nhau') ||
    norm.includes('khac gi') ||
    norm.includes('so sanh') ||
    tumorCount >= 2;

  if (isComparisonQuery) {
    return { intent: 'tumor_comparison', urgency: 'informational' };
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
    norm.startsWith('chao ai') ||
    norm.includes('ban la ai') ||
    norm.includes('gioi thieu')
  ) {
    return { intent: 'greeting', urgency: 'informational' };
  }

  // Từ chối các câu hỏi ngoài phạm vi hệ thống NeuroScan AI và không có trong cơ sở dữ liệu
  if (!isNeuroScanScope(norm)) {
    return { intent: 'out_of_scope', urgency: 'informational' };
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
  message: string,
  userId?: number,
  userRole?: string
): Promise<{
  scans: MatchedScanSummary[];
  contextText: string;
}> {
  if (!env?.DB) {
    return { scans: [], contextText: '' };
  }

  const bnMatch = message.match(/BN-\d{4}-(\d{1,4})/i);
  const scanCodeMatch = message.match(/(?:SCAN-\d{4}-|NS-\d{4}-|#)(\d{1,5})/i);
  const norm = normalizeVi(message);

  const wantsLookup =
    Boolean(bnMatch) ||
    Boolean(scanCodeMatch) ||
    norm.includes('kiem tra ket qua') ||
    norm.includes('tra cuu ca') ||
    norm.includes('tra cuu ho so') ||
    norm.includes('ket qua chup') ||
    norm.includes('ket qua mri') ||
    norm.includes('danh sach ca benh') ||
    norm.includes('ca chup mri') ||
    norm.includes('bn-') ||
    norm.includes('ns-');

  if (!wantsLookup) {
    return { scans: [], contextText: '' };
  }

  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    // RBAC: Nếu người dùng là bệnh nhân, chỉ cho phép tra cứu ca chụp của chính mình
    if (userRole === 'patient' && userId) {
      whereClauses.push('s.patient_id = ?');
      params.push(userId);
    }

    if (bnMatch) {
      const bnNum = parseInt(bnMatch[1], 10);
      whereClauses.push('(s.patient_id = ? OR p.id = ?)');
      params.push(bnNum, bnNum);
    } else if (scanCodeMatch) {
      const scanNum = parseInt(scanCodeMatch[1], 10);
      whereClauses.push('(p.id = ? OR p.scan_id = ?)');
      params.push(scanNum, scanNum);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
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
      ${whereStr}
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const stmt = env.DB.prepare(querySql);
    const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    const allRows = (results || []) as any[];
    if (allRows.length === 0) {
      return { scans: [], contextText: '' };
    }

    const topScans: MatchedScanSummary[] = allRows.slice(0, 3).map((r) => {
      const sessionCode = `NS-2026-${String(r.id).padStart(4, '0')}`;
      const patientCode = `BN-2026-${String(r.patient_id || 2).padStart(3, '0')}`;
      const hasReview = Boolean(r.review_id || r.review);
      const statusVi = hasReview
        ? 'Đã có kết luận Bác sĩ'
        : 'Chờ Bác sĩ chuyên khoa thẩm định';

      const r2Key = String(r.r2_key || r.scan?.r2_key || '');
      const imageUrl =
        r2Key.startsWith('sample_scans/') || r2Key.startsWith('/sample_scans/')
          ? r2Key.startsWith('/')
            ? r2Key
            : `/${r2Key}`
          : r2Key
          ? `/api/files/${r2Key}`
          : '/sample_scans/sample_glioma_axial.jpg';

      return {
        id: r.id,
        sessionCode,
        patientCode,
        patientName: r.patient_name || 'Bệnh nhân',
        predictedLabel: (r.confirmed_label || r.label || 'Chưa phân loại') as TumorLabel,
        confidence: Number(r.confidence || 0),
        reviewStatus: statusVi,
        doctorName: r.doctor_name || (hasReview ? 'Bác sĩ Thẩm định' : 'Chưa phân công'),
        doctorNote:
          r.doctor_note ||
          r.review?.note ||
          'Chưa có ghi chú lâm sàng từ Bác sĩ.',
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
    case 'out_of_scope':
    case 'unsupported_contact_query':
      return [
        'Phân biệt 4 nhóm Glioma, Meningioma, Pituitary, No Tumor',
        'Các chuỗi xung T1W, T2W, FLAIR và T1-Gd có ý nghĩa gì?',
        'Dấu hiệu cờ đỏ thần kinh nào cần gọi cấp cứu 115 ngay?',
        'Kiểm tra kết quả chụp MRI trong hệ thống',
      ];
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
    case 'tumor_comparison':
      return [
        'Dấu hiệu đuôi màng cứng (Dural Tail) của Meningioma là gì?',
        'Tại sao Glioma thường có phù não rộng trên xung FLAIR?',
        'U tuyến yên Microadenoma và Macroadenoma khác nhau thế nào?',
        'Chuỗi xung T1-Gd có vai trò gì trong phân loại 4 nhãn?',
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
  history: ChatHistoryItem[] = [],
  userId?: number,
  userRole?: string
): Promise<ChatResponseData> {
  const cleanMessage = message.trim();
  const { intent, urgency } = classifyMedicalIntent(cleanMessage);
  const isEmergency = urgency === 'emergency';

  // 1. Truy vấn ngữ cảnh y khoa từ Vector Database (Top 4 Semantic Chunks)
  const { results: ragChunks, trace: ragTraceBase } = await searchVectorDB(env, cleanMessage, 4);

  // 2. Tra cứu trực tiếp ca chụp MRI & hồ sơ bệnh nhân từ D1 (nếu câu hỏi liên quan)
  const { scans: matchedScans, contextText: scanContextText } = await lookupScansInDatabase(
    env,
    cleanMessage,
    userId,
    userRole
  );

  // 3. Tổng hợp ngữ cảnh RAG đưa vào System Prompt của LLM
  const ragContextFormatted = ragChunks
    .map(
      (c: RagSearchResult, idx: number) =>
        `--- [Tài liệu Y khoa #${idx + 1} | Độ tương đồng Vector: ${(c.score * 100).toFixed(1)}%] ---\n${c.content}`
    )
    .join('\n\n');

  const systemPrompt = `Bạn là **Trợ lý AI Y tế Thần kinh — NeuroScan Clinical Assistant**, hệ thống hỗ trợ giải thích hình ảnh Cộng hưởng từ (MRI) sọ não và giáo dục sức khỏe thần kinh chuẩn y khoa.

QUY TẮC AN TOÀN VÀ PHẠM VI HỆ THỐNG BẮT BUỘC (STRICT SCOPE & ANTI-HALLUCINATION):
1. CHỈ TRẢ LỜI TRONG PHẠM VI HỆ THỐNG: Bạn chỉ được trả lời các nội dung liên quan trực tiếp đến hệ thống NeuroScan AI: 4 nhóm u não (Glioma, Meningioma, Pituitary, No Tumor), các chuỗi xung MRI thần kinh (T1W, T2W, FLAIR, T1-Gd, DWI), an toàn chụp MRI, dấu hiệu cờ đỏ cấp cứu thần kinh, và dữ liệu ca chụp trong hệ thống.
2. TUYỆT ĐỐI KHÔNG TRẢ LỜI CÂU HỎI NGOÀI PHẠM VI: Không trả lời câu hỏi ngoài web, đời sống, thời tiết, giải trí, lập trình, xã hội, mua bán, hoặc các bệnh lý ngoài chuyên khoa thần kinh/u não. Nếu gặp câu hỏi ngoài phạm vi, từ chối lịch sự và hướng dẫn người dùng đặt câu hỏi đúng chuyên môn.
3. TUYỆT ĐỐI KHÔNG BỊA ĐẶT THÔNG TIN: Không tự ý bịa số điện thoại, không bịa tên bệnh nhân, không bịa mã ca chụp hoặc kết quả xét nghiệm không có trong [NGỮ CẢNH VECTOR RAG] và [DỮ LIỆU CA CHỤP MRI]. Nếu dữ liệu tra cứu không tồn tại, phải thông báo rõ ràng là không tìm thấy trong cơ sở dữ liệu.
4. TUYỆT ĐỐI KHÔNG kê đơn thuốc, liều lượng thuốc hoặc đưa ra phác đồ điều trị cá nhân hóa thay thế Bác sĩ.
5. Nếu phát hiện triệu chứng Cờ đỏ Cấp cứu (co giật mới khởi phát, đau đầu dữ dội kèm nôn vọt, yếu liệt nửa người, méo miệng, rối loạn ý thức), BẮT BUỘC đặt cảnh báo **CẤP CỨU Y KHOA (GỌI 115)** ở ngay đầu câu trả lời.
6. Trình bày bằng Tiếng Việt rõ ràng, chuyên nghiệp, có in đậm (**...**) và gạch đầu dòng trực quan.

=== NGỮ CẢNH VECTOR RAG (TOP-K CHUNKS TỪ KNOWLEDGE BASE) ===
${ragContextFormatted}

${scanContextText ? `=== DỮ LIỆU CA CHỤP MRI & HỒ SƠ BỆNH NHÂN TRONG HỆ THỐNG D1 ===\n${scanContextText}` : ''}`;

  // 4. Gọi LLM cho câu hỏi chuyên môn (chỉ gọi khi câu hỏi trong phạm vi và không bị từ chối)
  const shouldCallLLM =
    intent !== 'greeting' &&
    intent !== 'out_of_scope' &&
    intent !== 'unsupported_contact_query' &&
    !(intent === 'scan_lookup' && matchedScans.length === 0);

  const llmResult = shouldCallLLM
    ? await generateRagLLMResponse(env, systemPrompt, cleanMessage, history)
    : { text: null, llmModel: 'neuroscan-rag-synthesizer-v2' };
  let finalReply = llmResult.text;

  // 5. Nếu môi trường không bật LLM ngoài hoặc câu hỏi thuộc nhóm guardrail, sử dụng Bộ tổng hợp RAG chuẩn
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
    } else if (intent === 'unsupported_contact_query') {
      finalReply =
        `📞 **THÔNG BÁO VỀ TRA CỨU LIÊN HỆ & THÔNG TIN HỆ THỐNG:**\n\n` +
        `Cơ sở dữ liệu NeuroScan AI **không lưu trữ và không hỗ trợ tra cứu qua số điện thoại** nhằm bảo mật thông tin cá nhân và dữ liệu y tế của bệnh nhân.\n\n` +
        `### Hướng dẫn tra cứu hợp lệ trong hệ thống:\n` +
        `- **Mã hồ sơ bệnh nhân:** định dạng \`BN-2026-xxx\` (ví dụ: \`BN-2026-001\`, \`BN-2026-002\`).\n` +
        `- **Mã ca chụp MRI:** định dạng \`NS-2026-xxxx\` hoặc \`SCAN-2026-xxxx\` (ví dụ: \`NS-2026-0001\`).\n` +
        `- Bạn có thể theo dõi tiến độ thẩm định hồ sơ trực tiếp tại trang **Xem ca chụp** hoặc **Lịch sử chụp** trên hệ thống web.`;
    } else if (intent === 'out_of_scope') {
      finalReply =
        `Xin lỗi, tôi là **Trợ lý AI chuyên trách của hệ thống NeuroScan AI**.\n\n` +
        `Tôi **chỉ hỗ trợ các câu hỏi trong phạm vi cơ sở dữ liệu y khoa thần kinh và hệ thống NeuroScan AI**, bao gồm:\n` +
        `- **4 nhóm phân loại u não trên MRI:** *Glioma (U thần kinh đệm)*, *Meningioma (U màng não)*, *Pituitary (U tuyến yên)* và *No Tumor* theo chuẩn WHO CNS5.\n` +
        `- **Giải thích chuỗi xung MRI thần kinh:** *T1W, T2W, FLAIR, T1-Gd, DWI/ADC*.\n` +
        `- **An toàn và chuẩn bị chụp MRI:** Sàng lọc kim loại, máy tạo nhịp tim, thuốc đối quang từ.\n` +
        `- **Dấu hiệu cờ đỏ cấp cứu thần kinh:** Hội chứng tăng áp lực nội sọ cấp, co giật, yếu liệt.\n` +
        `- **Tra cứu ca chụp MRI trong hệ thống:** Theo mã ca chụp (\`NS-2026-xxxx\`) hoặc mã bệnh nhân (\`BN-2026-xxx\`).\n\n` +
        `*Để đảm bảo an toàn y khoa và tính chuẩn xác, hệ thống từ chối các câu hỏi nằm ngoài phạm vi chuyên môn hoặc không có dữ liệu trong hệ thống.*`;
    } else if (intent === 'scan_lookup') {
      if (matchedScans.length > 0) {
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
          `- **Điểm tự tin (Confidence Score)** phản ánh xác suất Softmax của mạng nơ-ron trên lát cắt 2D hiện tại; đây không phải xác suất chẩn đoán và chưa được hiệu chuẩn lâm sàng.\n` +
          `- Bạn có thể nhấn vào **Thẻ ca chụp MRI** hiển thị bên dưới để mở giao diện chi tiết và xem nhận xét của Bác sĩ Chuyên khoa.`;
      } else {
        finalReply =
          `📋 **KẾT QUẢ TRA CỨU HỆ THỐNG NEUROSCAN D1:**\n\n` +
          `⚠️ **Không tìm thấy ca chụp hoặc hồ sơ bệnh nhân** tương ứng trong cơ sở dữ liệu.\n\n` +
          `### Gợi ý kiểm tra:\n` +
          `- Vui lòng kiểm tra lại định dạng mã ca chụp (ví dụ: \`NS-2026-0001\`) hoặc mã bệnh nhân (ví dụ: \`BN-2026-001\`).\n` +
          `- Hệ thống NeuroScan chỉ tra cứu các ca chụp và hồ sơ đã được lưu trữ trong cơ sở dữ liệu D1 của hệ thống, không hỗ trợ tra cứu qua số điện thoại hoặc thông tin ngoài hệ thống.`;
      }
    } else if (intent === 'tumor_comparison') {
      finalReply =
        `🔬 **SO SÁNH & PHÂN BIỆT 4 NHÃN MRI SỌ NÃO (WHO CNS5 & NEUROSCAN AI):**\n\n` +
        `Trong chẩn đoán hình ảnh thần kinh, việc phân biệt chính xác giữa các nhóm tổn thương dựa trên vị trí giải phẫu, đặc điểm ngấm thuốc và ảnh hưởng lên nhu mô xung quanh:\n\n` +
        `### 1. Phân biệt theo Vị trí Giải phẫu & Nguồn gốc\n` +
        `- **Glioma (U thần kinh đệm):** Khối u **nội trục (intra-axial)**, phát sinh từ tế bào nâng đỡ nhu mô não (tế bào hình sao, tế bào ít nhánh). Ranh giới thường không rõ do xâm lấn mô não xung quanh.\n` +
        `- **Meningioma (U màng não):** Khối u **ngoài trục (extra-axial)**, phát sinh từ tế bào màng nhện bám vào màng cứng (vòm sọ, liềm não, nền sọ). Khối u đội và đè đẩy nhu mô não từ bên ngoài vào.\n` +
        `- **Pituitary (U tuyến yên):** Khu trú hoặc phát triển từ **hố yên (sella turcica)** ở nền sọ, mở rộng lên bể trên yên theo hình số 8 ("người tuyết") và chèn ép giao thoa thị giác.\n` +
        `- **No Tumor (Bình thường):** Nhu mô đối xứng hai bán cầu, không có khối choán chỗ, hệ thống não thất và rãnh cuộn não thông thoáng bình thường.\n\n` +
        `### 2. Đặc điểm kinh điển trên chuỗi xung T1-Gd (sau tiêm đối quang từ)\n` +
        `- **Glioma:** U bậc cao (Glioblastoma) ngấm thuốc **dạng vòng không đều (ring enhancement)** bao quanh trung tâm hoại tử; u bậc thấp ngấm thuốc kém hoặc không ngấm.\n` +
        `- **Meningioma:** Ngấm thuốc **cực mạnh và đồng nhất**, kèm dấu hiệu kinh điển **Đuôi màng cứng (Dural Tail Sign)** và dày xương sọ lân cận.\n` +
        `- **Pituitary Adenoma:** Ngấm thuốc chậm hơn nhu mô tuyến yên lành trên T1-Gd động; macroadenoma ngấm thuốc đồng nhất hoặc không đồng nhất nếu có thoái hóa nang.\n\n` +
        `### 3. Phù não vận mạch (Vasogenic Edema trên FLAIR / T2W)\n` +
        `- **Glioma:** Phù não rất rộng hình ngón tay đeo găng theo các bó chất trắng.\n` +
        `- **Meningioma:** Phù não phụ thuộc kích thước và chèn ép tĩnh mạch màng cứng (nhiều ca ít phù nếu u nhỏ).\n` +
        `- **Pituitary:** Thường không có phù nhu mô não ngoại trừ macroadenoma cực lớn chèn ép sàn não thất ba.\n\n` +
        `*Lưu ý: Mọi phân loại trên ảnh 2D từ AI là gợi ý sàng lọc; chẩn đoán xác định cần sự thẩm định của Bác sĩ Chuyên khoa trên trọn bộ chuỗi xung DICOM đa mặt phẳng.*`;
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
        `- Kết quả trên **1 lát cắt 2D đơn lẻ** chỉ mang tính chất sàng lọc tham khảo, không thay thế việc khảo sát toàn bộ chuỗi xung DICOM đa mặt phẳng (Axial, Coronal, Sagittal).\n` +
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
        `**QUY TRÌNH XỬ LÝ ẢNH MRI TRÊN NEUROSCAN AI:**\n\n` +
        `Khi một lát cắt MRI được tải lên, hệ thống thực hiện các bước sau:\n` +
        `- **1. Kiểm tra ảnh đầu vào:** Xác thực định dạng PNG/JPG/JPEG và dung lượng tệp.\n` +
        `- **2. Tiền xử lý:** Đưa ảnh về kích thước 256×256 (có hiệu chỉnh nhẹ cho ảnh nền sáng).\n` +
        `- **3. Suy luận mạng nơ-ron (ONNX Runtime):** Tính phân phối xác suất Softmax trên 4 nhãn (*Glioma, Meningioma, Pituitary, No Tumor*).\n` +
        `- **Chưa triển khai:** Bản đồ nhiệt Grad-CAM, cắt vùng sọ Otsu và cân bằng tương phản CLAHE hiện mới là định hướng nghiên cứu, chưa chạy trong hệ thống này.`;
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
      source: (ch as any).source || 'WHO CNS5 & ACR MRI Guidelines',
      similarity: ch.score,
      score: ch.score,
    })),
  };

  const sources =
    intent === 'out_of_scope' ||
    intent === 'unsupported_contact_query' ||
    intent === 'greeting' ||
    (intent === 'scan_lookup' && matchedScans.length === 0)
      ? []
      : ragChunks.slice(0, 3).map((ch) => ({
          title: ch.title,
          source: ch.source || 'WHO CNS5 & ACR Brain MRI Guidelines',
          organization:
            ch.source?.includes('WHO')
              ? 'World Health Organization (WHO CNS5)'
              : ch.source?.includes('ACR')
              ? 'American College of Radiology (ACR)'
              : ch.source?.includes('NCI')
              ? 'National Cancer Institute (NCI)'
              : ch.source?.includes('Endocrine')
              ? 'The Endocrine Society'
              : ch.source?.includes('Bộ Y tế')
              ? 'Bộ Y tế Việt Nam'
              : 'WHO CNS5 / ACR Appropriateness Criteria',
          url: ch.url || 'https://radiopaedia.org',
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
  userId: number = 2,
  userRole?: string
): Promise<ChatResponseData> {
  const response = await processChatbotMessage(c.env, rawMessage, history, userId, userRole);

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
