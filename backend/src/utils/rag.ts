import type { WorkerEnv } from '../db/init';
import type { ChatHistoryItem, RagChunk } from '../../shared/types';

export const DEFAULT_CF_EMBEDDING_MODEL = '@cf/baai/bge-m3';
export const DEFAULT_CF_LLM_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RagSearchResult {
  embeddingModel: string;
  vectorBackend: string;
  totalChunksIndexed: number;
  topChunks: RagChunk[];
}

export async function searchVectorDB(
  env: WorkerEnv,
  query: string,
  topK = 3
): Promise<RagSearchResult> {
  const embeddingModel = env.CF_EMBEDDING_MODEL || DEFAULT_CF_EMBEDDING_MODEL;

  // 1. Lấy danh sách chunks từ D1 database
  const { results: allChunks } = await env.DB.prepare(
    'SELECT chunk_id, title, category, content, source, embedding_json FROM rag_chunks'
  ).all<RagChunk>();

  const totalChunks = allChunks?.length || 0;
  if (totalChunks === 0) {
    return {
      embeddingModel,
      vectorBackend: 'none',
      totalChunksIndexed: 0,
      topChunks: [],
    };
  }

  // 2. Thử nhúng query bằng Cloudflare Workers AI (@cf/baai/bge-m3)
  let queryVector: number[] | null = null;
  if (env.AI && typeof env.AI.run === 'function') {
    try {
      const embedRes = await env.AI.run(embeddingModel, {
        text: [query],
      });
      if (embedRes && Array.isArray(embedRes.data) && embedRes.data[0]) {
        queryVector = embedRes.data[0];
      }
    } catch (err) {
      console.warn('[RAG Embedding Warning]:', (err as Error)?.message);
    }
  }

  // 3. Nếu có Cloudflare Vectorize và query vector thành công -> truy vấn Vectorize
  if (queryVector && env.VECTORIZE && typeof env.VECTORIZE.query === 'function') {
    try {
      const vecMatches = await env.VECTORIZE.query(queryVector, { topK });
      if (vecMatches?.matches && vecMatches.matches.length > 0) {
        const matchedChunks: RagChunk[] = [];
        for (const match of vecMatches.matches) {
          const found = allChunks.find((c) => c.chunk_id === match.id);
          if (found) {
            matchedChunks.push({ ...found, similarity: match.score });
          }
        }
        if (matchedChunks.length > 0) {
          return {
            embeddingModel,
            vectorBackend: 'Cloudflare Vectorize (Index: neuroscan-vector-index)',
            totalChunksIndexed: totalChunks,
            topChunks: matchedChunks,
          };
        }
      }
    } catch (err) {
      console.warn('[Vectorize Query Warning]:', (err as Error)?.message);
    }
  }

  // 4. Fallback tính độ tương đồng từ vựng & cosine similarity với D1
  const scoredChunks = allChunks.map((chunk) => {
    let score = 0;
    if (queryVector && chunk.embedding_json) {
      try {
        const storedVector = JSON.parse(chunk.embedding_json);
        score = cosineSimilarity(queryVector, storedVector);
      } catch {}
    } else {
      // Từ khóa đối chiếu từ vựng nếu chưa có vector số thực
      const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const text = `${chunk.title} ${chunk.content} ${chunk.category}`.toLowerCase();
      let matchCount = 0;
      for (const w of qWords) {
        if (text.includes(w)) matchCount++;
      }
      score = qWords.length > 0 ? matchCount / qWords.length : 0;
    }
    return { ...chunk, similarity: score };
  });

  scoredChunks.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  return {
    embeddingModel,
    vectorBackend: queryVector ? 'Cloudflare D1 In-Database Vector Search' : 'Lexical & Semantic Matcher',
    totalChunksIndexed: totalChunks,
    topChunks: scoredChunks.slice(0, topK),
  };
}

export async function generateRagLLMResponse(
  env: WorkerEnv,
  userMessage: string,
  contextChunks: RagChunk[],
  history: ChatHistoryItem[] = []
): Promise<{ reply: string | null; llmModelUsed: string }> {
  const cfLlmModel = env.CF_LLM_MODEL || DEFAULT_CF_LLM_MODEL;

  const contextText = contextChunks
    .map(
      (c, idx) =>
        `[Nguồn ${idx + 1}: ${c.title} (${c.source})]\n${c.content}`
    )
    .join('\n\n');

  const systemPrompt = `Bạn là Trợ lý AI Y tế Chuyên khoa Thần kinh (NeuroScan AI Medical Assistant).
Nhiệm vụ của bạn là giải thích kiến thức y khoa về hình ảnh cộng hưởng từ (MRI) não, phân loại u não (Glioma, Meningioma, Pituitary Adenoma), ý nghĩa các chuỗi xung (T1, T2, FLAIR, T1-Gd) theo chuẩn phân loại WHO CNS5 (2021) và hướng dẫn sơ bộ cho bệnh nhân/bác sĩ.

QUY TẮC Y TẾ BẮT BUỘC:
1. Luôn giữ thái độ chuẩn mực, khoa học, khách quan và thận trọng.
2. Nêu rõ: "Thông tin do Trợ lý AI cung cấp chỉ mang tính chất tham khảo học thuật và định hướng y tế, không thay thế chẩn đoán xác định của Bác sĩ chuyên khoa thần kinh".
3. Nếu phát hiện triệu chứng cấp cứu nghiêm trọng (đau đầu sét đánh, co giật, méo miệng/yếu liệt FAST, mất ý thức), lập tức khuyến cáo gọi cấp cứu 115 hoặc đến bệnh viện khẩn cấp.
4. Trả lời bằng tiếng Việt rõ ràng, dùng gạch đầu dòng ngắn gọn, nêu tên nguồn tài liệu (WHO, NCI, NHS) khi phù hợp.

DỮ LIỆU TRI THỨC Y KHOA ĐÃ XÁC THỰC TỪ VECTOR DATABASE:
${contextText}`;

  // 1. Ưu tiên 1: Cloudflare Workers AI LLM
  if (env.AI && typeof env.AI.run === 'function') {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const res = await env.AI.run(cfLlmModel, {
        messages,
        max_tokens: 1024,
        temperature: 0.2,
      });

      const responseText =
        typeof res === 'string'
          ? res
          : res?.response || res?.choices?.[0]?.message?.content;

      if (responseText && responseText.trim().length > 10) {
        return {
          reply: responseText.trim(),
          llmModelUsed: cfLlmModel,
        };
      }
    } catch (err) {
      console.warn('[Workers AI Warning]:', (err as Error)?.message);
    }
  }

  // 2. Ưu tiên 2: Google Gemini Flash API (nếu có cấu hình GEMINI_API_KEY)
  const geminiKey = env.GEMINI_API_KEY;
  if (geminiKey && typeof geminiKey === 'string' && geminiKey.trim().length > 10) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...history.slice(-4).map((h) => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }],
              })),
              { role: 'user', parts: [{ text: userMessage }] },
            ],
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiJson = (await geminiRes.json()) as any;
        const aiText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText && aiText.trim().length > 10) {
          return {
            reply: aiText.trim(),
            llmModelUsed: 'gemini-2.5-flash',
          };
        }
      }
    } catch (err) {
      console.warn('[Gemini API Warning]:', (err as Error)?.message);
    }
  }

  // 3. Fallback: Trích xuất & tổng hợp thông tin y khoa chính xác từ contextChunks
  if (contextChunks.length > 0) {
    const mainChunk = contextChunks[0];
    const secondary = contextChunks.slice(1, 3);
    const extraInfo = secondary.length > 0 ? `\n\n📌 **Kiến thức liên quan bổ trợ:**\n${secondary.map(s => `• **${s.title}**: ${s.content.slice(0, 180)}...`).join('\n')}` : '';

    return {
      reply: `🩺 **Thông tin y khoa đối chiếu từ cơ sở dữ liệu chuyên ngành (${mainChunk.source}):**\n\n${mainChunk.content}${extraInfo}\n\n*Lưu ý: Mọi kết luận chẩn đoán u não và hướng điều trị cần được bác sĩ chuyên khoa chẩn đoán hình ảnh và ngoại thần kinh chỉ định dựa trên phim chụp thực tế.*`,
      llmModelUsed: 'Internal Clinical Knowledge Synthesizer (RAG Grounded)',
    };
  }

  return {
    reply: null,
    llmModelUsed: 'none',
  };
}
