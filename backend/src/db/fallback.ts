// Fallback Store: Cung cấp bộ giả lập in-memory cho D1, R2, KV và Vectorize
// Giúp môi trường phát triển cục bộ và fallback Edge không bao giờ bị sập (500)

import type { User, MriScan, Prediction, DoctorReview, ChatSession, ChatMessage, FaqDocument } from '../../shared/types';
import { hashPassword } from '../utils/crypto';

export interface MemoryStore {
  users: any[];
  patients: any[];
  doctors: any[];
  mri_scans: any[];
  predictions: any[];
  doctor_reviews: any[];
  chat_sessions: any[];
  chat_messages: any[];
  faq_documents: any[];
  kv: Map<string, { value: string; expiresAt?: number }>;
  r2_objects: Map<string, { data: Uint8Array; contentType: string; metadata?: any }>;
}

export const memoryStore: MemoryStore = {
  users: [
    {
      id: 1,
      email: 'demo.doctor@neuroscan.vn',
      full_name: 'BS.CKII Trần Quốc Bảo',
      password_hash: '888a7c2e0b57e79c6d3bc0a03bb3c383e20606995079a4087e59670eb82088b3',
      password_salt: 'neuro_salt_2026',
      role: 'doctor',
      created_at: '2026-08-01 08:00:00',
    },
    {
      id: 2,
      email: 'demo.user@neuroscan.vn',
      full_name: 'Nguyễn Minh An',
      password_hash: 'e81255e4bf51a7e937d94cf212b77fcb2933be7be12269c2df36e053d2bb0c49',
      password_salt: 'neuro_salt_2026',
      role: 'patient',
      created_at: '2026-09-15 08:30:00',
    },
    {
      id: 3,
      email: 'admin@neuroscan.vn',
      full_name: 'Quản trị viên Hệ thống',
      password_hash: 'fbcf02fe1ba1dc718797926b4843b0d2a84e62a3ea4279b32938cf7873a46698',
      password_salt: 'neuro_salt_2026',
      role: 'admin',
      created_at: '2026-01-01 00:00:00',
    },
  ],
  doctors: [
    {
      user_id: 1,
      specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
      license_no: 'CCHN-2026-NEURO-8841',
      organization: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
      phone: '0909 000 222',
      created_at: '2026-08-01 08:00:00',
    },
  ],
  patients: [
    {
      user_id: 2,
      date_of_birth: '1981-05-12',
      phone: '0912 345 678',
      created_at: '2026-09-15 08:30:00',
    },
  ],
  mri_scans: [
    {
      id: 1,
      patient_id: 2,
      r2_key: 'sample_scans/sample_glioma_axial.jpg',
      file_name: 'sample_glioma_axial.jpg',
      file_size: 154200,
      mime_type: 'image/jpeg',
      slice_type: 'Axial (Trục ngang)',
      sequence_type: 'T1-Gd (Contrast)',
      uploaded_at: '2026-10-28 09:15:00',
    },
    {
      id: 2,
      patient_id: 2,
      r2_key: 'sample_scans/sample_notumor_axial.jpg',
      file_name: 'sample_notumor_axial.jpg',
      file_size: 148900,
      mime_type: 'image/jpeg',
      slice_type: 'Axial (Trục ngang)',
      sequence_type: 'T1-Gd (Contrast)',
      uploaded_at: '2026-11-01 14:30:00',
    },
    {
      id: 3,
      patient_id: 2,
      r2_key: 'sample_scans/sample_notumor_slice2.jpg',
      file_name: 'sample_notumor_slice2.jpg',
      file_size: 142100,
      mime_type: 'image/jpeg',
      slice_type: 'Axial (Trục ngang)',
      sequence_type: 'T2-FLAIR',
      uploaded_at: '2026-11-05 10:00:00',
    },
  ],
  predictions: [
    {
      id: 1,
      scan_id: 1,
      label: 'Glioma',
      confidence: 0.892,
      probabilities: JSON.stringify({ Glioma: 0.892, Meningioma: 0.054, Pituitary: 0.021, 'No Tumor': 0.033 }),
      model_version: 'brain_mri_student_v1_onnx',
      inference_time_ms: 45,
      created_at: '2026-10-28 09:15:05',
    },
    {
      id: 2,
      scan_id: 2,
      label: 'Meningioma',
      confidence: 0.865,
      probabilities: JSON.stringify({ Glioma: 0.048, Meningioma: 0.865, Pituitary: 0.032, 'No Tumor': 0.055 }),
      model_version: 'brain_mri_student_v1_onnx',
      inference_time_ms: 42,
      created_at: '2026-11-01 14:30:04',
    },
    {
      id: 3,
      scan_id: 3,
      label: 'No Tumor',
      confidence: 0.941,
      probabilities: JSON.stringify({ Glioma: 0.012, Meningioma: 0.018, Pituitary: 0.029, 'No Tumor': 0.941 }),
      model_version: 'brain_mri_student_v1_onnx',
      inference_time_ms: 38,
      created_at: '2026-11-05 10:00:03',
    },
  ],
  doctor_reviews: [
    {
      id: 1,
      prediction_id: 1,
      doctor_id: 1,
      confirmed_label: 'Glioma',
      note: 'Vùng tổn thương ngấm thuốc dạng viền thùy trán - thái dương trái phù hợp hình ảnh Glioma bậc cao. Khuyến nghị chụp thêm MRI phổ (MRS) và hội chẩn ngoại thần kinh.',
      ai_assessment: 'CONCORDANT',
      recommended_step: 'Chụp MRI phổ (MRS) và sinh thiết vi phẫu',
      created_at: '2026-10-28 11:20:00',
    },
  ],
  chat_sessions: [
    {
      id: 1,
      user_id: 2,
      title: 'Hỏi về kết quả MRI Glioma',
      linked_prediction_id: 1,
      created_at: '2026-10-28 09:20:00',
    },
  ],
  chat_messages: [
    {
      id: 1,
      session_id: 1,
      sender: 'user',
      content: 'U tế bào thần kinh đệm (Glioma) có nguy hiểm không bác sĩ?',
      is_emergency: 0,
      created_at: '2026-10-28 09:20:05',
    },
    {
      id: 2,
      session_id: 1,
      sender: 'bot',
      content: 'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ trong não bộ. Mức độ nguy hiểm phụ thuộc vào độ ác tính theo WHO CNS5 (Độ 1 đến Độ 4). Bệnh nhân cần được bác sĩ chuyên khoa thần kinh thăm khám trực tiếp để lên phác đồ điều trị phù hợp.',
      is_emergency: 0,
      created_at: '2026-10-28 09:20:10',
    },
  ],
  faq_documents: [
    {
      id: 1,
      title: 'Phân loại U tế bào thần kinh đệm (Glioma) theo WHO 2021',
      content: 'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ (glial cells) trong não bộ. Theo phân loại WHO CNS5 (2021), Glioma được phân tầng từ Độ 1 đến Độ 4, kết hợp hình thái mô học và dấu ấn phân tử như đột biến gen IDH và mất đoạn 1p/19q. Glioblastoma (Độ 4) là dạng tiến triển nhanh nhất, thường có vùng hoại tử trung tâm và bắt thuốc viền dày không đều trên phim T1-Gd.',
      source: 'WHO CNS5 (2021) Classification of Tumors of the Central Nervous System',
      category: 'tumor_types',
    },
    {
      id: 2,
      title: 'U màng não (Meningioma) và đặc điểm hình ảnh MRI',
      content: 'U màng não (Meningioma) phát triển từ màng nhện bao bọc não và tủy sống. Đa số (>80%) là u lành tính (WHO Grade 1). Trên phim MRI, Meningioma điển hình có bờ đều rõ nét, đáy rộng bám sát màng cứng và tạo dấu hiệu kinh điển "Đuôi màng cứng" (Dural Tail Sign) ngấm thuốc tương phản mạnh trên chuỗi xung T1-Gd. Xung T2-FLAIR thường hiển thị dải dịch phù não quanh u.',
      source: 'National Cancer Institute (NCI) Meningioma Guidelines',
      category: 'tumor_types',
    },
    {
      id: 3,
      title: 'U tuyến yên (Pituitary Adenoma) và ảnh hưởng thị lực',
      content: 'U tuyến yên (Pituitary Adenoma) là khối u nguyên phát tại thùy trước tuyến yên trong hố yên (Sella Turcica). U phân loại thành Microadenoma (<10mm) hoặc Macroadenoma (>=10mm). Khi phát triển vượt hố yên, khối u chèn ép giao thoa thị giác (Optic Chiasm) gây triệu chứng kinh điển là bán manh thái dương hai mắt. MRI sọ não lát cắt mỏng Sagittal và Coronal qua hố yên là tiêu chuẩn vàng chẩn đoán.',
      source: 'NHS Foundation Trust & Endocrine Society Clinical Guidelines',
      category: 'tumor_types',
    },
    {
      id: 4,
      title: 'Ảnh MRI không phát hiện u (No Tumor / Normal Brain)',
      content: 'Trường hợp No Tumor (không có khối u não) thể hiện các cấu trúc giải phẫu nhu mô não bình thường: hệ thống não thất cân đối, không có hiệu ứng khối chèn ép, rãnh cuộn não rõ nét, không có tổn thương ngấm thuốc đối quang từ bất thường trên xung T1-Gd và không có vùng phù não tăng tín hiệu trên xung FLAIR.',
      source: 'American College of Radiology (ACR) Appropriateness Criteria',
      category: 'tumor_types',
    },
    {
      id: 5,
      title: 'Giải thích các chuỗi xung cộng hưởng từ não (T1, T2, FLAIR, T1-Gd)',
      content: 'Chụp cộng hưởng từ MRI sọ não kết hợp nhiều chuỗi xung vật lý:\n• T1W: Dịch não tủy màu tối, chất trắng sáng hơn chất xám. Tối ưu đánh giá giải phẫu vỏ não.\n• T2W: Nước và dịch não tủy sáng trắng rõ rệt. Giúp phát hiện dịch tích tụ, tổn thương mô.\n• FLAIR: Triệt tín hiệu dịch tự do, giữ lại dịch phù do tổn thương bệnh lý, nhạy nhất nhận diện phù quanh u.\n• T1-Gd: Tiêm thuốc đối quang từ Gadolinium, làm sáng rõ các vùng mạch máu tăng sinh bất thường quanh khối u.',
      source: 'American College of Radiology (ACR)',
      category: 'mri_sequences',
    },
    {
      id: 6,
      title: 'CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ cần gọi 115',
      content: '⚠️ NGUY HIỂM TÍNH MẠNG — CẦN CẤP CỨU Y TẾ NGAY LẬP TỨC:\nNếu bản thân hoặc người xung quanh có bất kỳ dấu hiệu "cờ đỏ" sau đây, phải GỌI NGAY 115 hoặc đến khoa Cấp cứu bệnh viện gần nhất:\n1. Đau đầu sét đánh (Thunderclap Headache): Đau đầu dữ dội đột ngột đạt đỉnh cực đại trong vài giây.\n2. Co giật hoặc co giật tái diễn lần đầu xuất hiện ở người trưởng thành.\n3. Dấu hiệu đột quỵ FAST: Méo miệng, tê yếu hoặc liệt một bên tay/chân, nói khó, ngọng.\n4. Mất ý thức đột ngột, lú lẫn cấp tính, hôn mê.\n5. Sốt cao kèm cứng cổ, đau đầu dữ dội và sợ ánh sáng.',
      source: 'Bộ Y tế Việt Nam & WHO — Phác đồ Cấp cứu Thần kinh',
      category: 'emergency',
    },
  ],
  kv: new Map(),
  r2_objects: new Map(),
};

export function createFallbackD1(): D1Database {
  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const cleanSql = query.trim().replace(/\s+/g, ' ');

      return {
        bind(...args: any[]) {
          boundParams = args;
          return this;
        },

        async first<T = any>(colName?: string): Promise<T | null> {
          const res = (await this.all()) as any;
          if (!res.results || res.results.length === 0) return null;
          const row = res.results[0] as any;
          if (colName && typeof row === 'object') {
            return row[colName] ?? null;
          }
          return row as T;
        },

        async all<T = any>(): Promise<D1Result<T>> {
          const sql = cleanSql.toLowerCase();

          // 0. SELECT COUNT(*)
          if (sql.includes('select count(*) as count') || sql.includes('count(*) as count')) {
            let count = 0;
            if (sql.includes('from mri_scans')) count = memoryStore.mri_scans.length;
            else if (sql.includes('from predictions')) count = memoryStore.predictions.length;
            else if (sql.includes('from doctor_reviews')) count = memoryStore.doctor_reviews.length;
            else if (sql.includes('from patients')) count = memoryStore.patients.length;
            else if (sql.includes('from faq_documents')) count = memoryStore.faq_documents.length;
            else count = memoryStore.users.length;
            return { results: [{ count }] as unknown as T[], success: true, meta: {} as any };
          }

          // 1. SELECT users
          if (sql.includes('from users')) {
            let res = [...memoryStore.users];
            if (sql.includes('where email = ?')) {
              const email = String(boundParams[0]).toLowerCase();
              res = res.filter((u) => u.email.toLowerCase() === email);
            } else if (sql.includes('where id = ?')) {
              res = res.filter((u) => u.id === Number(boundParams[0]));
            }
            // Join with doctors / patients if requested
            const enriched = res.map((u) => {
              const doc = memoryStore.doctors.find((d) => d.user_id === u.id);
              const pat = memoryStore.patients.find((p) => p.user_id === u.id);
              return {
                ...u,
                specialty: doc?.specialty,
                license_no: doc?.license_no,
                organization: doc?.organization,
                phone: doc?.phone || pat?.phone,
                date_of_birth: pat?.date_of_birth,
              };
            });
            return { results: enriched as unknown as T[], success: true, meta: {} as any };
          }

          // 2. SELECT predictions
          if (sql.includes('from predictions')) {
            let res = [...memoryStore.predictions];
            if (sql.includes('where id = ?')) {
              res = res.filter((p) => p.id === Number(boundParams[0]));
            } else if (sql.includes('where scan_id = ?')) {
              res = res.filter((p) => p.scan_id === Number(boundParams[0]));
            }
            const joined = res.map((pred) => {
              const scan = memoryStore.mri_scans.find((s) => s.id === pred.scan_id);
              const review = memoryStore.doctor_reviews.find((r) => r.prediction_id === pred.id);
              const doctorUser = review ? memoryStore.users.find((u) => u.id === review.doctor_id) : null;
              return {
                ...pred,
                scan: scan || null,
                review: review ? { ...review, doctor_name: doctorUser?.full_name || 'BS.CKII Trần Quốc Bảo' } : null,
              };
            });
            joined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { results: joined as unknown as T[], success: true, meta: {} as any };
          }

          // 3. SELECT mri_scans
          if (sql.includes('from mri_scans')) {
            let res = [...memoryStore.mri_scans];
            if (sql.includes('where id = ?')) {
              res = res.filter((s) => s.id === Number(boundParams[0]));
            } else if (sql.includes('where patient_id = ?')) {
              res = res.filter((s) => s.patient_id === Number(boundParams[0]));
            }
            res.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
            return { results: res as unknown as T[], success: true, meta: {} as any };
          }

          // 4. SELECT doctor_reviews
          if (sql.includes('from doctor_reviews')) {
            let res = [...memoryStore.doctor_reviews];
            if (sql.includes('where prediction_id = ?')) {
              res = res.filter((r) => r.prediction_id === Number(boundParams[0]));
            }
            return { results: res as unknown as T[], success: true, meta: {} as any };
          }

          // 5. SELECT chat_sessions
          if (sql.includes('from chat_sessions')) {
            let res = [...memoryStore.chat_sessions];
            if (sql.includes('where user_id = ?')) {
              res = res.filter((s) => s.user_id === Number(boundParams[0]));
            }
            res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { results: res as unknown as T[], success: true, meta: {} as any };
          }

          // 6. SELECT chat_messages
          if (sql.includes('from chat_messages')) {
            let res = [...memoryStore.chat_messages];
            if (sql.includes('where session_id = ?')) {
              res = res.filter((m) => m.session_id === Number(boundParams[0]));
            }
            res.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return { results: res as unknown as T[], success: true, meta: {} as any };
          }

          // 7. SELECT faq_documents / rag_chunks
          if (sql.includes('from faq_documents') || sql.includes('from rag_chunks')) {
            return { results: memoryStore.faq_documents as unknown as T[], success: true, meta: {} as any };
          }

          // 8. SELECT patients
          if (sql.includes('from patients')) {
            let res = [...memoryStore.patients];
            if (sql.includes('where p.user_id = ?') || sql.includes('where user_id = ?')) {
              res = res.filter((p) => p.user_id === Number(boundParams[0]));
            }
            const enriched = res.map((p) => {
              const u = memoryStore.users.find((user) => user.id === p.user_id);
              const scans = memoryStore.mri_scans.filter((s) => s.patient_id === p.user_id);
              return {
                ...p,
                id: p.user_id,
                full_name: u?.full_name || 'Bệnh nhân',
                email: u?.email || 'patient@neuroscan.vn',
                scan_count: scans.length,
              };
            });
            return { results: enriched as unknown as T[], success: true, meta: {} as any };
          }

          return { results: [] as unknown as T[], success: true, meta: {} as any };
        },

        async run(): Promise<D1Response> {
          const sql = cleanSql.toLowerCase();

          // INSERT INTO users
          if (sql.includes('insert into users') || sql.includes('insert or ignore into users')) {
            const newUser = {
              id: boundParams[0] && typeof boundParams[0] === 'number' ? boundParams[0] : memoryStore.users.length + 1,
              email: boundParams[1] || boundParams[0],
              full_name: boundParams[4] || boundParams[3] || 'Người dùng mới',
              password_hash: boundParams[2] || boundParams[1],
              password_salt: boundParams[3] || boundParams[2] || 'salt',
              role: boundParams[5] || boundParams[4] || 'patient',
              created_at: new Date().toISOString(),
            };
            memoryStore.users.push(newUser);
            return { success: true, meta: {} as any };
          }

          // INSERT INTO patients
          if (sql.includes('insert into patients') || sql.includes('insert or ignore into patients')) {
            memoryStore.patients.push({
              user_id: Number(boundParams[0]),
              date_of_birth: boundParams[1] || '1980-01-01',
              phone: boundParams[2] || '',
              created_at: new Date().toISOString(),
            });
            return { success: true, meta: {} as any };
          }

          // INSERT INTO doctors
          if (sql.includes('insert into doctors') || sql.includes('insert or ignore into doctors')) {
            memoryStore.doctors.push({
              user_id: Number(boundParams[0]),
              specialty: boundParams[1] || 'Chẩn đoán hình ảnh Thần kinh',
              license_no: boundParams[2] || 'CCHN-2026',
              organization: boundParams[3] || 'Bệnh viện',
              phone: boundParams[4] || '',
              created_at: new Date().toISOString(),
            });
            return { success: true, meta: {} as any };
          }

          // INSERT INTO mri_scans
          if (sql.includes('insert into mri_scans')) {
            const scan = {
              id: memoryStore.mri_scans.length + 1,
              patient_id: Number(boundParams[0]),
              r2_key: boundParams[1],
              file_name: boundParams[2] || 'mri.png',
              file_size: Number(boundParams[3]) || 100000,
              mime_type: boundParams[4] || 'image/png',
              slice_type: boundParams[5] || 'Axial (Trục ngang)',
              sequence_type: boundParams[6] || 'T1-Gd (Contrast)',
              uploaded_at: new Date().toISOString(),
            };
            memoryStore.mri_scans.push(scan);
            return { success: true, meta: { last_row_id: scan.id } as any };
          }

          // INSERT INTO predictions
          if (sql.includes('insert into predictions')) {
            const pred = {
              id: memoryStore.predictions.length + 1,
              scan_id: Number(boundParams[0]),
              label: boundParams[1],
              confidence: Number(boundParams[2]),
              probabilities: typeof boundParams[3] === 'string' ? boundParams[3] : JSON.stringify(boundParams[3]),
              model_version: boundParams[4] || 'brain_mri_student_v1_onnx',
              inference_time_ms: Number(boundParams[5]) || 40,
              created_at: new Date().toISOString(),
            };
            memoryStore.predictions.push(pred);
            return { success: true, meta: { last_row_id: pred.id } as any };
          }

          // INSERT INTO doctor_reviews
          if (sql.includes('insert into doctor_reviews')) {
            const rev = {
              id: memoryStore.doctor_reviews.length + 1,
              prediction_id: Number(boundParams[0]),
              doctor_id: Number(boundParams[1]),
              confirmed_label: boundParams[2],
              note: boundParams[3] || '',
              ai_assessment: boundParams[4] || 'CONCORDANT',
              recommended_step: boundParams[5] || '',
              created_at: new Date().toISOString(),
            };
            memoryStore.doctor_reviews.push(rev);
            return { success: true, meta: { last_row_id: rev.id } as any };
          }

          // INSERT INTO chat_sessions
          if (sql.includes('insert into chat_sessions')) {
            const sess = {
              id: memoryStore.chat_sessions.length + 1,
              user_id: Number(boundParams[0]),
              title: boundParams[1] || 'Hội thoại Y tế',
              linked_prediction_id: boundParams[2] ? Number(boundParams[2]) : null,
              created_at: new Date().toISOString(),
            };
            memoryStore.chat_sessions.push(sess);
            return { success: true, meta: { last_row_id: sess.id } as any };
          }

          // INSERT INTO chat_messages
          if (sql.includes('insert into chat_messages')) {
            const msg = {
              id: memoryStore.chat_messages.length + 1,
              session_id: Number(boundParams[0]),
              sender: boundParams[1],
              content: boundParams[2],
              is_emergency: Number(boundParams[3]) || 0,
              sources_json: boundParams[4] || null,
              created_at: new Date().toISOString(),
            };
            memoryStore.chat_messages.push(msg);
            return { success: true, meta: { last_row_id: msg.id } as any };
          }

          // INSERT INTO faq_documents
          if (sql.includes('insert into faq_documents')) {
            const doc = {
              id: memoryStore.faq_documents.length + 1,
              title: boundParams[0],
              content: boundParams[1],
              source: boundParams[2],
              category: boundParams[3] || 'tumor_types',
              created_at: new Date().toISOString(),
            };
            memoryStore.faq_documents.push(doc);
            return { success: true, meta: { last_row_id: doc.id } as any };
          }

          // DELETE FROM predictions
          if (sql.includes('delete from predictions')) {
            const targetId = Number(boundParams[0]);
            const idx = memoryStore.predictions.findIndex((p) => p.id === targetId);
            if (idx >= 0) memoryStore.predictions.splice(idx, 1);
            return { success: true, meta: {} as any };
          }

          // DELETE FROM doctor_reviews
          if (sql.includes('delete from doctor_reviews')) {
            const predId = Number(boundParams[0]);
            const idx = memoryStore.doctor_reviews.findIndex((r) => r.prediction_id === predId);
            if (idx >= 0) memoryStore.doctor_reviews.splice(idx, 1);
            return { success: true, meta: {} as any };
          }

          // DELETE FROM patients
          if (sql.includes('delete from patients')) {
            const userId = Number(boundParams[0]);
            const idx = memoryStore.patients.findIndex((p) => p.user_id === userId);
            if (idx >= 0) memoryStore.patients.splice(idx, 1);
            return { success: true, meta: {} as any };
          }

          // UPDATE patients
          if (sql.includes('update patients')) {
            const userId = Number(boundParams[boundParams.length - 1]);
            const patient = memoryStore.patients.find((p) => p.user_id === userId);
            if (patient) {
              if (boundParams[0]) patient.phone = boundParams[0];
              if (boundParams[1]) patient.date_of_birth = boundParams[1];
              if (boundParams[2]) (patient as any).gender = boundParams[2];
              if (boundParams[3]) (patient as any).address = boundParams[3];
              if (boundParams[4]) (patient as any).medical_history = boundParams[4];
              if (boundParams[5]) (patient as any).emergency_contact = boundParams[5];
            }
            return { success: true, meta: {} as any };
          }

          // UPDATE users
          if (sql.includes('update users')) {
            const userId = Number(boundParams[1]);
            const user = memoryStore.users.find((u) => u.id === userId);
            if (user && boundParams[0]) user.full_name = boundParams[0];
            return { success: true, meta: {} as any };
          }

          return { success: true, meta: {} as any };
        },

        raw() {
          return Promise.resolve([]);
        },
      } as any;
    },

    async batch(statements: any[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },

    async dump() {
      return new ArrayBuffer(0);
    },

    async exec(_sql: string) {
      return { count: 0, duration: 0 };
    },
  } as D1Database;
}

export function createFallbackR2(): R2Bucket {
  return {
    async put(key: string, value: any, options?: any) {
      let dataBytes: Uint8Array;
      if (value instanceof Uint8Array) {
        dataBytes = value;
      } else if (value instanceof ArrayBuffer) {
        dataBytes = new Uint8Array(value);
      } else if (typeof value?.arrayBuffer === 'function') {
        const ab = await value.arrayBuffer();
        dataBytes = new Uint8Array(ab);
      } else if (typeof value === 'string') {
        dataBytes = new TextEncoder().encode(value);
      } else {
        dataBytes = new Uint8Array();
      }

      const contentType = options?.httpMetadata?.contentType || 'application/octet-stream';
      memoryStore.r2_objects.set(key, { data: dataBytes, contentType, metadata: options?.customMetadata });
      return {
        key,
        size: dataBytes.byteLength,
        httpMetadata: { contentType },
      } as any;
    },

    async get(key: string) {
      const obj = memoryStore.r2_objects.get(key);
      if (!obj) return null;

      return {
        key,
        size: obj.data.byteLength,
        httpMetadata: { contentType: obj.contentType },
        customMetadata: obj.metadata,
        async arrayBuffer() {
          return obj.data.buffer;
        },
        async text() {
          return new TextDecoder().decode(obj.data);
        },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(obj.data);
            controller.close();
          },
        }),
      } as any;
    },

    async delete(key: string) {
      memoryStore.r2_objects.delete(key);
      return;
    },
  } as any;
}

export function createFallbackKV(): any {
  return {
    async get(key: string) {
      const item = memoryStore.kv.get(key);
      if (!item) return null;
      if (item.expiresAt && Date.now() > item.expiresAt) {
        memoryStore.kv.delete(key);
        return null;
      }
      return item.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
      memoryStore.kv.set(key, { value, expiresAt });
    },
    async delete(key: string) {
      memoryStore.kv.delete(key);
    },
  };
}

export function createFallbackVectorize(): any {
  return {
    async query(vector: number[], options?: { topK?: number }) {
      return {
        matches: memoryStore.faq_documents.map((c, i) => ({
          id: String(c.id),
          score: 0.95 - i * 0.05,
          metadata: { title: c.title, category: c.category, source: c.source },
        })),
      };
    },
    async insert(records: any[]) {
      return { count: records.length };
    },
  };
}
