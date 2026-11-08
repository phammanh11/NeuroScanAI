// Fallback Store: Cung cấp bộ giả lập in-memory cho D1, R2 và Vectorize
// Giúp môi trường phát triển cục bộ và fallback Edge không bao giờ bị sập (500)

import type { User, Patient, MriScan, RagChunk } from '../../shared/types';
import { hashPassword } from '../utils/crypto';

export interface MemoryStore {
  users: User[];
  sessions: any[];
  patients: Patient[];
  mri_scans: MriScan[];
  rag_chunks: RagChunk[];
  chat_messages: any[];
  r2_objects: Map<string, { data: Uint8Array; contentType: string; metadata?: any }>;
}

export const memoryStore: MemoryStore = {
  users: [],
  sessions: [],
  patients: [
    {
      id: 1,
      mrn: 'NS-BN-2026-001',
      full_name: 'Lê Văn Hoàng',
      age: 48,
      gender: 'Nam',
      phone: '0912 345 678',
      email: 'hoang.le@email.vn',
      address: 'Quận 5, TP. Hồ Chí Minh',
      clinical_history: 'Tiền sử tăng huyết áp nhẹ, không có bệnh nền mạn tính khác.',
      symptoms: 'Đau đầu âm ỉ vùng thái dương trái kéo dài 3 tuần, tăng khi thức dậy.',
      status: 'Đang theo dõi',
      last_scan_date: '2026-10-28 09:15:00',
      created_at: '2026-10-28 09:15:00',
      updated_at: '2026-10-28 09:15:00',
    },
    {
      id: 2,
      mrn: 'NS-BN-2026-002',
      full_name: 'Nguyễn Thị Mai',
      age: 54,
      gender: 'Nữ',
      phone: '0983 221 456',
      email: 'mai.nguyen@email.vn',
      address: 'Ba Đình, Hà Nội',
      clinical_history: 'Mãn kinh 3 năm, có triệu chứng giảm thị lực góc ngoài mắt phải.',
      symptoms: 'Nhìn mờ bán manh thái dương hai mắt nhẹ, mệt mỏi buổi sáng.',
      status: 'Chờ phân tích',
      last_scan_date: '2026-11-01 14:30:00',
      created_at: '2026-11-01 14:30:00',
      updated_at: '2026-11-01 14:30:00',
    },
    {
      id: 3,
      mrn: 'NS-BN-2026-003',
      full_name: 'Phạm Đức Huy',
      age: 39,
      gender: 'Nam',
      phone: '0908 776 543',
      email: 'huy.pham@email.vn',
      address: 'Hải Châu, Đà Nẵng',
      clinical_history: 'Theo dõi sức khỏe thần kinh định kỳ hàng năm.',
      symptoms: 'Không ghi nhận triệu chứng thần kinh khu trú, sức khỏe ổn định.',
      status: 'Đã chẩn đoán',
      last_scan_date: '2026-11-05 10:00:00',
      created_at: '2026-11-05 10:00:00',
      updated_at: '2026-11-05 10:00:00',
    },
  ],
  mri_scans: [
    {
      id: 1,
      scan_code: 'SCAN-2026-001',
      patient_id: 1,
      patient_name: 'Lê Văn Hoàng',
      file_name: 'patient_hoang_t1gd_axial.png',
      file_key: 'scans/demo_hoang_t1gd_axial.png',
      file_url: '/api/v1/files/scans/demo_hoang_t1gd_axial.png',
      file_size: 245890,
      mime_type: 'image/png',
      slice_type: 'Axial (Trục ngang)',
      sequence_type: 'T1-Gd (Contrast)',
      status: 'PENDING_MODEL',
      findings_summary:
        'Ảnh chụp MRI đã được tải lên và lưu trữ an toàn trên Cloudflare R2. Tình trạng phân loại AI đang tạm chờ nạp trọng số mô hình sau huấn luyện.',
      doctor_notes: '',
      doctor_approved: 0,
      created_at: '2026-10-28 09:20:00',
      updated_at: '2026-10-28 09:20:00',
    },
    {
      id: 2,
      scan_code: 'SCAN-2026-002',
      patient_id: 2,
      patient_name: 'Nguyễn Thị Mai',
      file_name: 'patient_mai_flair_sagittal.png',
      file_key: 'scans/demo_mai_flair_sagittal.png',
      file_url: '/api/v1/files/scans/demo_mai_flair_sagittal.png',
      file_size: 312450,
      mime_type: 'image/png',
      slice_type: 'Sagittal (Mặt cắt dọc)',
      sequence_type: 'T2-FLAIR',
      status: 'PENDING_MODEL',
      findings_summary:
        'Ảnh chụp MRI đã được tải lên và lưu trữ an toàn trên Cloudflare R2. Tình trạng phân loại AI đang tạm chờ nạp trọng số mô hình sau huấn luyện.',
      doctor_notes: '',
      doctor_approved: 0,
      created_at: '2026-11-01 14:35:00',
      updated_at: '2026-11-01 14:35:00',
    },
  ],
  rag_chunks: [
    {
      chunk_id: 'kb-glioma-classification',
      title: 'Phân loại U tế bào thần kinh đệm (Glioma) theo WHO 2021',
      category: 'tumor_types',
      source: 'WHO CNS5 (2021)',
      content:
        'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào đệm (glial cells) trong não. Phân loại WHO CNS5 (2021) phân tầng từ Độ 1 đến Độ 4 (Grade 1 - 4), kết hợp hình thái mô học và đột biến gen IDH, mất đoạn 1p/19q. Glioblastoma (GBM - Độ 4) là dạng tiến triển nhanh nhất, thường xuất hiện vùng hoại tử trung tâm và bắt thuốc viền dày không đều trên phim MRI T1-Gd tiêm đối quang từ.',
    },
    {
      chunk_id: 'kb-meningioma-classification',
      title: 'U màng não (Meningioma) và đặc điểm chẩn đoán hình ảnh MRI',
      category: 'tumor_types',
      source: 'National Cancer Institute (NCI)',
      content:
        'U màng não (Meningioma) phát triển từ lớp màng nhện bao bọc não và tủy sống. Đa số (>80%) là u lành tính (WHO Grade 1). Trên phim chụp MRI, Meningioma điển hình có bờ đều rõ nét, đáy rộng bám sát màng cứng và tạo dấu hiệu kinh điển "Đuôi màng cứng" (Dural Tail Sign) ngấm thuốc tương phản mạnh trên chuỗi xung T1-Gd. Xung T2-FLAIR thường hiển thị dải dịch phù não bao quanh u.',
    },
    {
      chunk_id: 'kb-pituitary-adenoma',
      title: 'U tuyến yên (Pituitary Adenoma) và ảnh hưởng thị giác',
      category: 'tumor_types',
      source: 'NHS Foundation Trust',
      content:
        'U tuyến yên (Pituitary Adenoma) là khối u nguyên phát tại thùy trước tuyến yên trong hố yên (Sella Turcica). Khi u phát triển lớn (Macroadenoma >= 10mm), khối u thường chèn ép giao thoa thị giác (Optic Chiasm) gây triệu chứng bán manh thái dương hai mắt. MRI sọ não lát cắt mỏng Sagittal và Coronal qua hố yên là tiêu chuẩn vàng chẩn đoán.',
    },
    {
      chunk_id: 'kb-mri-sequences-explained',
      title: 'Giải thích các chuỗi xung cộng hưởng từ não (T1, T2, FLAIR, T1-Gd)',
      category: 'mri_sequences',
      source: 'ACR Appropriateness Criteria',
      content:
        'Chụp cộng hưởng từ MRI sọ não kết hợp nhiều chuỗi xung: T1W tối ưu giải phẫu não; T2W nước và dịch não tủy sáng trắng rõ rệt giúp phát hiện tổn thương mô; FLAIR triệt tín hiệu dịch tự do, là chuỗi xung nhạy nhất nhận diện phù não quanh khối u; T1-Gd tiêm đối quang từ Gadolinium giúp làm sáng các vùng mạch máu tăng sinh bất thường hoặc phá vỡ hàng rào máu não.',
    },
    {
      chunk_id: 'kb-emergency-redflags-115',
      title: 'CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ cần gọi 115 ngay',
      category: 'emergency',
      source: 'Bộ Y tế & WHO',
      content:
        '⚠️ NGUY HIỂM TÍNH MẠNG — CẦN CẤP CỨU Y TẾ NGAY LẬP TỨC: Nếu có các dấu hiệu: Đau đầu dữ dội đột ngột như sét đánh; Co giật lần đầu; Yếu liệt một bên mặt/tay/chân (FAST); Mất ý thức đột ngột; Sốt cao cứng cổ kèm đau đầu dữ dội -> GỌI NGAY 115 hoặc đến cấp cứu gần nhất!',
    },
  ],
  chat_messages: [],
  r2_objects: new Map(),
};

// Khởi tạo tài khoản Test ban đầu trong bộ nhớ fallback
(async () => {
  const { hash, salt } = await hashPassword('Doctor@123');
  memoryStore.users.push({
    id: 1,
    email: 'demo.doctor@neuroscan.vn',
    full_name: 'BS.CKII Trần Quốc Bảo',
    role: 'DOCTOR',
    specialty: 'Chẩn đoán hình ảnh Thần kinh (Neuroradiology)',
    organization: 'Khoa Chẩn đoán Hình ảnh & Ngoại Thần kinh',
    license_code: 'DEMO-CCHN-2026-8841',
    phone: '0909 000 222',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...( { password_hash: hash, password_salt: salt } as any ),
  });
})();

export function createFallbackD1(): any {
  return {
    prepare(sql: string) {
      let params: any[] = [];
      return {
        bind(...args: any[]) {
          params = args;
          return this;
        },
        async first<T = any>(col?: string): Promise<T | null> {
          const res = await this.all();
          if (!res.results || res.results.length === 0) return null;
          return col ? (res.results[0] as any)[col] : (res.results[0] as T);
        },
        async all<T = any>(): Promise<{ results: T[] }> {
          const s = sql.trim().toLowerCase();

          // 1. SELECT users
          if (s.includes('from users')) {
            if (s.includes('email = ?') && params[0]) {
              const u = memoryStore.users.find((x) => x.email.toLowerCase() === String(params[0]).toLowerCase());
              return { results: u ? [u as any] : [] };
            }
            if (s.includes('id = ?') && params[0]) {
              const u = memoryStore.users.find((x) => x.id === Number(params[0]));
              return { results: u ? [u as any] : [] };
            }
            return { results: memoryStore.users as any };
          }

          // 2. SELECT sessions
          if (s.includes('from sessions')) {
            if (s.includes('token_hash = ?') && params[0]) {
              const sess = memoryStore.sessions.find((x) => x.token_hash === String(params[0]));
              return { results: sess ? [sess] : [] };
            }
            return { results: memoryStore.sessions as any };
          }

          // 3. SELECT patients
          if (s.includes('from patients')) {
            if (s.includes('id = ?') && params[0]) {
              const p = memoryStore.patients.find((x) => x.id === Number(params[0]));
              return { results: p ? [p as any] : [] };
            }
            if (s.includes('mrn = ?') && params[0]) {
              const p = memoryStore.patients.find((x) => x.mrn === String(params[0]));
              return { results: p ? [p as any] : [] };
            }
            return { results: [...memoryStore.patients] as any };
          }

          // 4. SELECT mri_scans
          if (s.includes('from mri_scans')) {
            if (s.includes('id = ?') && params[0]) {
              const sc = memoryStore.mri_scans.find((x) => x.id === Number(params[0]));
              return { results: sc ? [sc as any] : [] };
            }
            if (s.includes('scan_code = ?') && params[0]) {
              const sc = memoryStore.mri_scans.find((x) => x.scan_code === String(params[0]));
              return { results: sc ? [sc as any] : [] };
            }
            if (s.includes('patient_id = ?') && params[0]) {
              const list = memoryStore.mri_scans.filter((x) => x.patient_id === Number(params[0]));
              return { results: list as any };
            }
            return { results: [...memoryStore.mri_scans] as any };
          }

          // 5. SELECT rag_chunks
          if (s.includes('from rag_chunks')) {
            if (s.includes('chunk_id = ?') && params[0]) {
              const c = memoryStore.rag_chunks.find((x) => x.chunk_id === String(params[0]));
              return { results: c ? [c as any] : [] };
            }
            return { results: [...memoryStore.rag_chunks] as any };
          }

          // 6. SELECT chat_messages
          if (s.includes('from chat_messages')) {
            if (s.includes('session_id = ?') && params[0]) {
              const list = memoryStore.chat_messages.filter((x) => x.session_id === String(params[0]));
              return { results: list as any };
            }
            return { results: [...memoryStore.chat_messages] as any };
          }

          return { results: [] };
        },
        async run(): Promise<{ success: boolean; meta: any }> {
          const s = sql.trim().toLowerCase();

          // INSERT INTO sessions
          if (s.includes('insert into sessions')) {
            memoryStore.sessions.push({
              id: memoryStore.sessions.length + 1,
              token_hash: params[0],
              user_id: params[1],
              csrf_token: params[2],
              ip_address: params[3],
              user_agent: params[4],
              expires_at: params[5],
              created_at: new Date().toISOString(),
            });
            return { success: true, meta: { last_row_id: memoryStore.sessions.length } };
          }

          // DELETE FROM sessions
          if (s.includes('delete from sessions')) {
            if (s.includes('token_hash = ?')) {
              memoryStore.sessions = memoryStore.sessions.filter((x) => x.token_hash !== String(params[0]));
            }
            return { success: true, meta: {} };
          }

          // INSERT INTO mri_scans
          if (s.includes('insert into mri_scans')) {
            const newScan: MriScan = {
              id: memoryStore.mri_scans.length + 1,
              scan_code: params[0] || `SCAN-${Date.now()}`,
              patient_id: params[1] || undefined,
              patient_name: params[2] || 'Bệnh nhân',
              file_name: params[3] || 'scan.png',
              file_key: params[4] || '',
              file_url: params[5] || '',
              file_size: params[6] || 0,
              mime_type: params[7] || 'image/png',
              slice_type: params[8] || 'Axial (Trục ngang)',
              sequence_type: params[9] || 'T1-Gd (Contrast)',
              status: params[10] || 'PENDING_MODEL',
              findings_summary: params[11] || 'Đang chờ nạp trọng số mô hình AI sau khi hoàn tất huấn luyện.',
              doctor_notes: '',
              doctor_approved: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            memoryStore.mri_scans.unshift(newScan);
            return { success: true, meta: { last_row_id: newScan.id } };
          }

          // INSERT INTO chat_messages
          if (s.includes('insert into chat_messages')) {
            memoryStore.chat_messages.push({
              id: memoryStore.chat_messages.length + 1,
              session_id: params[0],
              user_id: params[1],
              role: params[2],
              content: params[3],
              is_emergency: params[4] || 0,
              rag_trace_json: params[5] || null,
              created_at: new Date().toISOString(),
            });
            return { success: true, meta: {} };
          }

          return { success: true, meta: {} };
        },
      };
    },
    async batch(stmts: any[]) {
      const results = [];
      for (const st of stmts) {
        results.push(await st.run());
      }
      return results;
    },
  };
}

export function createFallbackR2(): any {
  return {
    async put(key: string, value: any, options?: { httpMetadata?: { contentType?: string }; customMetadata?: any }) {
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
      };
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
      };
    },

    async delete(key: string) {
      memoryStore.r2_objects.delete(key);
      return;
    },
  };
}

export function createFallbackVectorize(): any {
  return {
    async query(vector: number[], options?: { topK?: number }) {
      return {
        matches: memoryStore.rag_chunks.map((c, i) => ({
          id: c.chunk_id,
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

