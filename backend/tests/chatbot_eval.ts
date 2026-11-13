/**
 * ============================================================================
 * NEUROSCAN AI — CLINICAL CHATBOT AUTOMATED EVALUATION SUITE
 * ============================================================================
 * Bộ kiểm thử tự động đánh giá chất lượng câu trả lời của Trợ lý AI Y tế Thần kinh:
 *   - Intent Classification Accuracy
 *   - Clinical Urgency & Safety Flags (Cờ đỏ cấp cứu)
 *   - Keyword & Fact Verification (WHO CNS5, ACR, chuỗi xung)
 *   - Source Citation & Evidence Quality
 * ============================================================================
 */

import { processChatbotMessage } from '../src/utils/chatbot';
import { createFallbackD1, createFallbackVectorize, createFallbackR2, createFallbackKV } from '../src/db/fallback';
import type { WorkerEnv } from '../src/db/init';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  id: string;
  category: string;
  question: string;
  expected_intent: string;
  expected_urgency: string;
  required_keywords: string[];
  must_not_contain: string[];
  description: string;
}

async function runChatbotEvaluation() {
  console.log('='.repeat(70));
  console.log('🤖 BẮT ĐẦU ĐÁNH GIÁ CHẤT LƯỢNG CHATBOT NEUROSCAN RAG');
  console.log('='.repeat(70));

  const testSuitePath = path.join(__dirname, 'chatbot_test_suite.json');
  const rawData = fs.readFileSync(testSuitePath, 'utf-8');
  const testCases: TestCase[] = JSON.parse(rawData);

  // Tạo mock environment cho worker
  const mockEnv: WorkerEnv = {
    DB: createFallbackD1() as any,
    BUCKET: createFallbackR2() as any,
    SESSION_KV: createFallbackKV() as any,
    VECTORIZE: createFallbackVectorize() as any,
    AI_GATEWAY_ID: 'neuroscan-gateway',
  };

  let passedCount = 0;
  let emergencyPassed = 0;
  let totalEmergency = 0;

  for (const tc of testCases) {
    process.stdout.write(`[TEST] ${tc.id} (${tc.category}): "${tc.question.slice(0, 40)}..." `);

    const startTime = Date.now();
    const result = await processChatbotMessage(mockEnv, tc.question, []);
    const duration = Date.now() - startTime;

    const intentPass = result.intent === tc.expected_intent;
    const urgencyPass = result.urgency === tc.expected_urgency;

    if (tc.expected_urgency === 'emergency') {
      totalEmergency++;
      if (result.isEmergency && urgencyPass) emergencyPassed++;
    }

    const replyLower = result.reply.toLowerCase();
    const missingKeywords = tc.required_keywords.filter(
      (kw) => !replyLower.includes(kw.toLowerCase())
    );
    const keywordsPass = missingKeywords.length === 0;

    const invalidContent = tc.must_not_contain.filter(
      (kw) => replyLower.includes(kw.toLowerCase())
    );
    const safetyPass = invalidContent.length === 0;

    const sourcesPass = Array.isArray(result.sources) && result.sources.length > 0;

    const isSuccess = intentPass && urgencyPass && keywordsPass && safetyPass;

    if (isSuccess) {
      passedCount++;
      console.log(`✅ ĐẠT (${duration}ms) [Intent: ${result.intent}]`);
    } else {
      console.log(`❌ THẤT BẠI (${duration}ms)`);
      if (!intentPass) console.log(`   - Sai Intent: mong đợi "${tc.expected_intent}", thực tế "${result.intent}"`);
      if (!urgencyPass) console.log(`   - Sai Urgency: mong đợi "${tc.expected_urgency}", thực tế "${result.urgency}"`);
      if (!keywordsPass) console.log(`   - Thiếu từ khóa bắt buộc: ${missingKeywords.join(', ')}`);
      if (!safetyPass) console.log(`   - Chứa từ ngữ vi phạm an toàn: ${invalidContent.join(', ')}`);
      if (!sourcesPass) console.log(`   - Cảnh báo: Thiếu nguồn trích dẫn RAG`);
    }
  }

  const accuracy = ((passedCount / testCases.length) * 100).toFixed(1);
  const emergencyAccuracy = totalEmergency > 0 ? ((emergencyPassed / totalEmergency) * 100).toFixed(1) : '100.0';

  console.log('\n' + '='.repeat(70));
  console.log('📊 KẾT QUẢ TỔNG HỢP KIỂM THỬ:');
  console.log(`- Tổng số ca kiểm thử: ${testCases.length}`);
  console.log(`- Số ca Đạt: ${passedCount}/${testCases.length} (${accuracy}%)`);
  console.log(`- Độ chính xác phát hiện Cờ đỏ Cấp cứu (Safety Score): ${emergencyAccuracy}%`);
  console.log('='.repeat(70));

  if (passedCount === testCases.length) {
    console.log('🎉 TẤT CẢ CÁC CA KIỂM THỬ ĐÃ VƯỢT QUA XUẤT SẮC!');
  } else {
    console.log(`⚠️ Có ${testCases.length - passedCount} ca kiểm thử cần điều chỉnh.`);
  }
}

runChatbotEvaluation().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
