import type { Context } from 'hono';
import type { WorkerEnv } from '../db/init';
import type { ChatHistoryItem, ChatResponseData, RagTraceInfo, Patient, MriScan } from '../../shared/types';
import { searchVectorDB, generateRagLLMResponse } from './rag';

const EMERGENCY_KEYWORDS_REGEX =
  /(đau đầu dữ dội|đau như búa bổ|đau như sét đánh|sét đánh|nổ trong đầu|co giật|lên cơn co giật|méo miệng|yếu liệt|liệt nửa người|nói ngọng đột ngột|mất thị lực đột ngột|hôn mê|bất tỉnh|sốt cao cứng cổ)/i;

export async function handleMedicalChat(
  c: Context<{ Bindings: WorkerEnv; Variables: any }>,
  rawMessage: string,
  history: ChatHistoryItem[] = [],
  sessionId = 'default-session'
): Promise<ChatResponseData> {
  const message = rawMessage.trim();

  // 1. KIỂM TRA DẤU HIỆU CẤP CỨU THẦN KINH (RED FLAGS)
  if (EMERGENCY_KEYWORDS_REGEX.test(message)) {
    const emergencyReply = `🚨 **CẢNH BÁO CẤP CỨU THẦN KINH KHẨN CẤP (GỌI 115 NGAY LẬP TỨC)**

Các triệu chứng bạn vừa mô tả *(đau đầu dữ dội đột ngột, co giật, yếu liệt một bên, méo miệng hoặc thay đổi tri giác cấp tính)* là những **"dấu hiệu cờ đỏ" (Red Flags)** của bệnh lý ngoại thần kinh hoặc tai biến mạch máu não đe dọa tính mạng!

**HÀNH ĐỘNG CẦN THỰC HIỆN NGAY:**
1. 📞 **Gọi ngay Cấp cứu 115** hoặc đưa bệnh nhân đến **Khoa Cấp cứu của bệnh viện gần nhất** có chuyên khoa Phẫu thuật Thần kinh.
2. 🛏️ Đặt bệnh nhân nằm nghiêng an toàn nếu có nguy cơ nôn hoặc co giật, nới lỏng cổ áo, không cho ăn uống bất cứ thứ gì.
3. ⏱️ Ghi nhớ mốc thời gian khởi phát triệu chứng chính xác để thông báo cho bác sĩ cấp cứu.
4. ❌ Tuyệt đối **không tự ý uống thuốc giảm đau mạnh hoặc thuốc hạ áp** khi chưa có chỉ định của bác sĩ chuyên khoa!`;

    // Lưu vào bảng chat_messages
    try {
      await c.env.DB.prepare(
        'INSERT INTO chat_messages (session_id, role, content, is_emergency) VALUES (?, ?, ?, ?)'
      ).bind(sessionId, 'assistant', emergencyReply, 1).run();
    } catch {}

    return {
      reply: emergencyReply,
      intent: 'emergency_alert',
      isEmergency: true,
      emergencyInstructions: 'Vui lòng bấm gọi 115 hoặc di chuyển đến bệnh viện có chuyên khoa thần kinh ngay lập tức.',
      suggestions: [
        '📞 Hướng dẫn xử trí khi người thân co giật',
        '🏥 Danh sách bệnh viện ngoại thần kinh tuyến đầu',
        '📋 Các thông tin cần chuẩn bị khi nhập viện cấp cứu',
      ],
    };
  }

  // 2. KIỂM TRA TRA CỨU HỒ SƠ BỆNH ÁN (MRN) HOẶC MÃ PHIM CHỤP (SCAN CODE)
  const mrnMatch = message.toUpperCase().match(/NS-BN-[0-9]{4}-[0-9]{3}/);
  const scanMatch = message.toUpperCase().match(/SCAN-[0-9]{4}-[0-9]{3}/);

  if (mrnMatch || scanMatch) {
    if (mrnMatch) {
      const mrn = mrnMatch[0];
      const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE mrn = ?')
        .bind(mrn)
        .first<Patient>();

      if (patient) {
        const { results: scans } = await c.env.DB.prepare(
          'SELECT * FROM mri_scans WHERE patient_id = ? ORDER BY created_at DESC'
        )
          .bind(patient.id)
          .all<MriScan>();

        const scansList = scans && scans.length > 0
          ? scans.map((s) => `• Mã phim: **${s.scan_code}** | Xung: *${s.sequence_type}* | Lát cắt: *${s.slice_type}* | Trạng thái: **${s.status}**`).join('\n')
          : '• Chưa có bản ghi phim chụp MRI trên hệ thống.';

        return {
          reply: `📋 **Thông tin Hồ sơ Bệnh nhân [${patient.mrn}]:**\n\n• **Họ tên**: ${patient.full_name}\n• **Tuổi / Giới tính**: ${patient.age} tuổi (${patient.gender})\n• **Tiền sử & Bệnh cảnh**: ${patient.clinical_history || 'Không ghi nhận'}\n• **Triệu chứng lâm sàng**: ${patient.symptoms || 'Không ghi nhận'}\n• **Trạng thái theo dõi**: ${patient.status}\n\n**Danh sách Phim chụp MRI liên kết:**\n${scansList}`,
          intent: 'patient_lookup',
          isEmergency: false,
          suggestions: [
            `Phân tích ca chụp gần nhất của ${patient.full_name}`,
            'Giải thích ý nghĩa chuỗi xung T1-Gd và T2-FLAIR',
            'Quy trình chẩn đoán u não theo WHO CNS5',
          ],
        };
      }
    }
  }

  // 3. THỰC THI PIPELINE RAG Y KHOA: CHUNKING -> EMBEDDING (@cf/baai/bge-m3) -> VECTOR DB -> LLM
  const ragResult = await searchVectorDB(c.env, message, 3);

  const ragTrace: RagTraceInfo = {
    pipeline: 'chunking -> word_embedding (@cf/baai/bge-m3) -> vector_db -> llm',
    embeddingModel: ragResult.embeddingModel,
    llmModel: c.env.CF_LLM_MODEL || 'Cloudflare Workers AI Llama-3.3-70B / Gemini Flash',
    vectorBackend: ragResult.vectorBackend,
    totalChunksIndexed: ragResult.totalChunksIndexed,
    topChunks: ragResult.topChunks.map((ch) => ({
      chunk_id: ch.chunk_id,
      title: ch.title,
      category: ch.category,
      source: ch.source,
      similarity: ch.similarity ? Number(ch.similarity.toFixed(4)) : undefined,
    })),
  };

  const { reply: aiReply, llmModelUsed } = await generateRagLLMResponse(
    c.env,
    message,
    ragResult.topChunks,
    history
  );

  ragTrace.llmModel = llmModelUsed;

  const finalReply =
    aiReply ||
    `Xin chào! Mình là **Trợ lý AI Y tế Chuyên khoa Thần kinh (NeuroScan AI)**.\n\nMình có thể hỗ trợ bạn:\n• 🧠 **Giải thích kiến thức phân loại u não** theo phân loại WHO CNS5 2021 (Glioma, Meningioma, Pituitary Adenoma).\n• 🔬 **Phân biệt ý nghĩa các chuỗi xung MRI** sọ não (T1W, T2W, FLAIR, T1-Gd).\n• 📋 **Tra cứu tiến độ hồ sơ bệnh án** theo mã bệnh nhân (e.g. \`NS-BN-2026-001\`).\n• ⚠️ **Nhận diện các dấu hiệu cờ đỏ cấp cứu thần kinh** cần can thiệp y tế tức thì.\n\nBạn cần tra cứu hoặc tìm hiểu thông tin y khoa nào hôm nay ạ?`;

  // Lưu lịch sử hội thoại vào D1
  try {
    await c.env.DB.prepare(
      'INSERT INTO chat_messages (session_id, role, content, is_emergency, rag_trace_json) VALUES (?, ?, ?, 0, ?)'
    )
      .bind(sessionId, 'assistant', finalReply, JSON.stringify(ragTrace))
      .run();
  } catch {}

  const sources = ragResult.topChunks.map((ch) => ({
    title: ch.title,
    source: ch.source,
    category: ch.category,
  }));

  return {
    reply: finalReply,
    intent: 'medical_info',
    isEmergency: false,
    ragTrace,
    sources: sources.length > 0 ? sources : undefined,
    suggestions: [
      'Phân biệt u tế bào thần kinh đệm (Glioma) và u màng não (Meningioma)',
      'Tại sao cần tiêm thuốc đối quang từ T1-Gd khi chụp MRI u não?',
      'U tuyến yên có ảnh hưởng đến thị lực như thế nào?',
      'Tra cứu hồ sơ bệnh nhân NS-BN-2026-001',
    ],
  };
}
