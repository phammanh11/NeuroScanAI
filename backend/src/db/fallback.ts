// Fallback Store: Cung cấp bộ giả lập in-memory cho D1, R2, KV và Vectorize
// Giúp môi trường phát triển cục bộ và fallback Edge không bao giờ bị gián đoạn (500)

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
  rag_chunks: any[];
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
    {
      id: 4,
      email: 'tranthimai75@gmail.com',
      full_name: 'Trần Thị Mai',
      password_hash: 'e81255e4bf51a7e937d94cf212b77fcb2933be7be12269c2df36e053d2bb0c49',
      password_salt: 'neuro_salt_2026',
      role: 'patient',
      created_at: '2026-09-20 09:00:00',
    },
    {
      id: 5,
      email: 'hoangvanduc92@gmail.com',
      full_name: 'Hoàng Văn Đức',
      password_hash: 'e81255e4bf51a7e937d94cf212b77fcb2933be7be12269c2df36e053d2bb0c49',
      password_salt: 'neuro_salt_2026',
      role: 'patient',
      created_at: '2026-10-02 10:15:00',
    },
    {
      id: 6,
      email: 'lethuhang99@gmail.com',
      full_name: 'Lê Thu Hằng',
      password_hash: 'e81255e4bf51a7e937d94cf212b77fcb2933be7be12269c2df36e053d2bb0c49',
      password_salt: 'neuro_salt_2026',
      role: 'patient',
      created_at: '2026-10-10 14:20:00',
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
      gender: 'Nam',
      address: 'Quận 3, TP. Hồ Chí Minh',
      medical_history: 'Tăng huyết áp nhẹ kiểm soát tốt. Đau đầu âm ỉ vùng đỉnh - chẩm phải 3 tuần, nhìn mờ thoáng qua.',
      emergency_contact: '0908 111 222',
      created_at: '2026-09-15 08:30:00',
    },
    {
      user_id: 4,
      date_of_birth: '1975-11-20',
      phone: '0987 654 321',
      gender: 'Nữ',
      address: 'Quận Hải Châu, Đà Nẵng',
      medical_history: 'Tăng huyết áp 5 năm. Chóng mặt khi thay đổi tư thế, đau đầu vùng chẩm - nền sọ.',
      emergency_contact: '0905 222 333',
      created_at: '2026-09-20 09:00:00',
    },
    {
      user_id: 5,
      date_of_birth: '1992-03-08',
      phone: '0933 445 566',
      gender: 'Nam',
      address: 'Quận Cầu Giấy, Hà Nội',
      medical_history: 'Giảm thị lực hai bên thái dương tiến triển 2 tháng, rối loạn giấc ngủ, mệt mỏi.',
      emergency_contact: '0913 444 555',
      created_at: '2026-10-02 10:15:00',
    },
    {
      user_id: 6,
      date_of_birth: '1999-08-19',
      phone: '0977 889 900',
      gender: 'Nữ',
      address: 'Quận Ninh Kiều, Cần Thơ',
      medical_history: 'Khám sức khỏe tổng quát định kỳ, đôi khi căng thẳng đau đầu nhẹ do làm việc máy tính.',
      emergency_contact: '0989 666 777',
      created_at: '2026-10-10 14:20:00',
    },
  ],
  mri_scans: [
    {
      id: 1,
      patient_id: 2,
      r2_key: 'sample_scans/sample_glioma_axial.jpg',
      file_name: 'sample_glioma_axial.jpg',
      file_size: 22122,
      mime_type: 'image/jpeg',
      slice_type: 'Axial (Trục ngang)',
      sequence_type: 'T1-Gd (Contrast)',
      uploaded_at: '2026-10-28 09:15:00',
    },
    {
      id: 2,
      patient_id: 4,
      r2_key: 'sample_scans/sample_meningioma_axial.jpg',
      file_name: 'sample_meningioma_axial.jpg',
      file_size: 41726,
      mime_type: 'image/jpeg',
      slice_type: 'Axial (Trục ngang)',
      sequence_type: 'T1-Gd (Contrast)',
      uploaded_at: '2026-11-01 14:30:00',
    },
    {
      id: 3,
      patient_id: 5,
      r2_key: 'sample_scans/sample_pituitary_coronal.jpg',
      file_name: 'sample_pituitary_coronal.jpg',
      file_size: 38936,
      mime_type: 'image/jpeg',
      slice_type: 'Coronal (Đứng ngang)',
      sequence_type: 'T1-Gd (Contrast)',
      uploaded_at: '2026-11-04 11:20:00',
    },
    {
      id: 4,
      patient_id: 2,
      r2_key: 'sample_scans/sample_notumor_axial.jpg',
      file_name: 'sample_notumor_axial.jpg',
      file_size: 8456,
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
      confidence: 0.934,
      probabilities: JSON.stringify({ Glioma: 0.934, Meningioma: 0.041, Pituitary: 0.015, 'No Tumor': 0.010 }),
      model_version: 'brain_mri_student_v1_onnx',
      inference_time_ms: 45,
      created_at: '2026-10-28 09:15:05',
    },
    {
      id: 2,
      scan_id: 2,
      label: 'Meningioma',
      confidence: 0.918,
      probabilities: JSON.stringify({ Glioma: 0.032, Meningioma: 0.918, Pituitary: 0.035, 'No Tumor': 0.015 }),
      model_version: 'brain_mri_student_v1_onnx',
      inference_time_ms: 42,
      created_at: '2026-11-01 14:30:04',
    },
    {
      id: 3,
      scan_id: 3,
      label: 'Pituitary',
      confidence: 0.905,
      probabilities: JSON.stringify({ Glioma: 0.024, Meningioma: 0.048, Pituitary: 0.905, 'No Tumor': 0.023 }),
      model_version: 'brain_mri_student_v1_onnx',
      inference_time_ms: 39,
      created_at: '2026-11-04 11:20:03',
    },
    {
      id: 4,
      scan_id: 4,
      label: 'No Tumor',
      confidence: 0.968,
      probabilities: JSON.stringify({ Glioma: 0.008, Meningioma: 0.012, Pituitary: 0.012, 'No Tumor': 0.968 }),
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
      note: 'Vùng tổn thương nội trục ngấm thuốc dạng vòng vùng đỉnh - chẩm phải kèm hoại tử trung tâm và phù não vận mạch xung quanh, đồng thuận với dự đoán Glioma của AI.',
      ai_assessment: 'CONCORDANT',
      recommended_step: 'Chụp bổ sung cộng hưởng từ phổ (MRS), tưới máu (Perfusion MRI) và hội chẩn Ngoại Thần kinh.',
      created_at: '2026-10-28 11:20:00',
    },
  ],
  chat_sessions: [
    {
      id: 1,
      user_id: 2,
      title: 'Tư vấn kết quả MRI & Phân loại WHO CNS5',
      linked_prediction_id: 1,
      created_at: '2026-10-28 09:20:00',
    },
  ],
  chat_messages: [
    {
      id: 1,
      session_id: 1,
      sender: 'user',
      content: 'Phân biệt u thần kinh đệm (Glioma) và u màng não (Meningioma) trên phim MRI như thế nào?',
      is_emergency: 0,
      created_at: '2026-10-28 09:20:05',
    },
    {
      id: 2,
      session_id: 1,
      sender: 'bot',
      content:
        '🧠 **PHÂN BIỆT GLIOMA (U THẦN KINH ĐỆM) VÀ MENINGIOMA (U MÀNG NÃO) TRÊN MRI:**\n\n' +
        '• **U thần kinh đệm (Glioma — Nội trục / Intra-axial):** Khởi phát từ các tế bào thần kinh đệm nằm sâu bên trong nhu mô não. Trên chuỗi xung T1-Gd, Glioma bậc cao thường **ngấm thuốc dạng vòng không đều (ring-enhancing)** bao quanh vùng hoại tử trung tâm và kèm phù não vận mạch lan tỏa trên FLAIR.\n\n' +
        '• **U màng não (Meningioma — Ngoài trục / Extra-axial):** Xuất phát từ lớp màng nhện bao quanh não (80–85% lành tính WHO độ 1). Trên chuỗi xung T1-Gd, khối u có ranh giới rất rõ, đáy bám rộng vào màng cứng, **ngấm thuốc mạnh đồng nhất** và thường có **dấu hiệu đuôi màng cứng (Dural Tail Sign)**.',
      is_emergency: 0,
      created_at: '2026-10-28 09:20:10',
    },
  ],
  faq_documents: [
    {
      id: 1,
      title: 'Phân loại U tế bào thần kinh đệm (Glioma) theo WHO CNS5 (2021)',
      content:
        'U tế bào thần kinh đệm (Glioma) bắt nguồn từ các tế bào nâng đỡ (glial cells) trong nhu mô não (nội trục). Theo phân loại WHO CNS5 (2021), Glioma được phân tầng từ Độ 1 đến Độ 4, kết hợp hình thái mô học và dấu ấn sinh học phân tử (IDH1/2, 1p/19q, MGMT). Glioblastoma (Độ 4) là dạng ác tính tiến triển nhanh, điển hình với hình ảnh ngấm thuốc dạng vòng không đều bao quanh vùng hoại tử trung tâm trên xung T1-Gd và phù não vận mạch rộng trên xung T2-FLAIR.',
      source: 'WHO CNS5 (2021) Classification of Tumors of the Central Nervous System',
      category: 'tumor_classification',
    },
    {
      id: 2,
      title: 'U màng não (Meningioma) và dấu hiệu Đuôi màng cứng (Dural Tail Sign)',
      content:
        'U màng não (Meningioma) là khối u ngoài trục (extra-axial) phát triển từ tế bào màng nhện bao bọc não và tủy sống. Đa số (80-85%) là u lành tính (WHO Độ 1). Trên phim MRI T1-Gd có tiêm thuốc đối quang từ, Meningioma điển hình có bờ đều rõ nét, đáy bám rộng vào màng cứng, ngấm thuốc mạnh đồng nhất và tạo dấu hiệu kinh điển "Đuôi màng cứng" (Dural Tail Sign).',
      source: 'National Cancer Institute (NCI) & Radiopaedia Guidelines',
      category: 'tumor_classification',
    },
    {
      id: 3,
      title: 'U tuyến yên (Pituitary Adenoma) và biểu hiện Nội tiết - Thị giác',
      content:
        'U tuyến yên (Pituitary Adenoma) là khối u nguyên phát tại thùy trước tuyến yên trong hố yên (Sella Turcica). U được chia thành Microadenoma (<10mm) và Macroadenoma (>=10mm). Khi phát triển vượt lên bể trên yên (Suprasellar), khối u chèn ép giao thoa thị giác (Optic Chiasm) gây triệu chứng bán manh thái dương hai mắt và rối loạn hormone nội tiết (Prolactin, GH, ACTH). MRI lát cắt mỏng Coronal và Sagittal T1-Gd qua vùng hố yên là tiêu chuẩn vàng chẩn đoán.',
      source: 'Endocrine Society & NHS Clinical Guidelines',
      category: 'tumor_classification',
    },
    {
      id: 4,
      title: 'Ý nghĩa nhãn No Tumor (Không phát hiện u điển hình) và Giới hạn của AI',
      content:
        'Nhãn No Tumor thể hiện lát cắt MRI 2D hiện tại có cấu trúc nhu mô não đối xứng hai bán cầu, đường giữa cân đối, hệ thống não thất thông thoáng và không ghi nhận khối choán chỗ mang đặc trưng của Glioma, Meningioma hay Pituitary. Tuy nhiên, kết quả AI trên 1 lát cắt đơn lẻ không thay thế việc bác sĩ khảo sát toàn bộ bộ chụp DICOM đa mặt phẳng hoặc loại trừ bệnh lý mạch máu não, viêm não.',
      source: 'American College of Radiology (ACR) Appropriateness Criteria',
      category: 'tumor_classification',
    },
    {
      id: 5,
      title: 'Giải thích các chuỗi xung cộng hưởng từ sọ não (T1W, T2W, FLAIR, T1-Gd, DWI)',
      content:
        'Chụp cộng hưởng từ MRI sọ não kết hợp nhiều chuỗi xung vật lý:\n• T1W: Dịch não tủy (CSF) màu đen tối, chất trắng sáng hơn chất xám, tối ưu đánh giá giải phẫu.\n• T2W: Dịch não tủy và vùng phù nề sáng trắng rõ rệt.\n• FLAIR: Xóa tín hiệu dịch não tủy tự do (CSF màu đen), giữ lại dịch phù bệnh lý, cực nhạy để phát hiện phù não quanh u.\n• T1-Gd (Contrast): Tiêm thuốc đối quang từ Gadolinium, làm sáng rõ các khối u có phá vỡ hàng rào máu - não hoặc tăng sinh mạch.\n• DWI/ADC: Đánh giá khuếch tán phân tử nước, phân biệt áp-xe não với u hoại tử và phát hiện nhồi máu não cấp.',
      source: 'American College of Radiology (ACR) Brain MRI Protocol',
      category: 'mri_ai_explanation',
    },
    {
      id: 6,
      title: 'CẢNH BÁO CẤP CỨU THẦN KINH: Các dấu hiệu cờ đỏ (Red Flags) cần gọi 115',
      content:
        'Nếu người bệnh có bất kỳ dấu hiệu cờ đỏ (Red Flags) nào sau đây, phải GỌI NGAY 115 hoặc đến Khoa Cấp cứu gần nhất:\n1. Đau đầu dữ dội khởi phát đột ngột như sét đánh hoặc đau đầu tăng dần kèm nôn vọt buổi sáng.\n2. Co giật mới khởi phát ở người trưởng thành.\n3. Yếu liệt nửa người, méo miệng, tê bì tay chân hoặc nói đớ, nói khó cấp tính.\n4. Suy giảm ý thức, ngủ gà, lú lẫn, hôn mê hoặc mất thị lực / nhìn đôi đột ngột.',
      source: 'Bộ Y tế Việt Nam & WHO — Phác đồ Cấp cứu Thần kinh',
      category: 'symptoms',
    },
  ],
  rag_chunks: [],
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
          if (sql.includes('count(*) as count') || sql.includes('count(*) as cnt')) {
            let count = 0;
            if (sql.includes('from mri_scans')) count = memoryStore.mri_scans.length;
            else if (sql.includes('from predictions')) count = memoryStore.predictions.length;
            else if (sql.includes('from doctor_reviews')) count = memoryStore.doctor_reviews.length;
            else if (sql.includes('from patients')) count = memoryStore.patients.length;
            else if (sql.includes('from faq_documents')) count = memoryStore.faq_documents.length;
            else if (sql.includes('from rag_chunks')) count = memoryStore.rag_chunks.length;
            else count = memoryStore.users.length;
            return { results: [{ count, cnt: count }] as unknown as T[], success: true, meta: {} as any };
          }

          // 1. SELECT rag_chunks
          if (sql.includes('from rag_chunks')) {
            return { results: memoryStore.rag_chunks as unknown as T[], success: true, meta: {} as any };
          }

          // 2. SELECT users
          if (sql.includes('from users')) {
            let res = [...memoryStore.users];
            if (sql.includes('where email = ?')) {
              const email = String(boundParams[0]).toLowerCase();
              res = res.filter((u) => u.email.toLowerCase() === email);
            } else if (sql.includes('where id = ?')) {
              res = res.filter((u) => u.id === Number(boundParams[0]));
            }
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

          // 3. SELECT predictions
          if (sql.includes('from predictions')) {
            if (sql.includes('group by label')) {
              const counts: Record<string, number> = {};
              for (const p of memoryStore.predictions) {
                counts[p.label] = (counts[p.label] || 0) + 1;
              }
              const dist = Object.entries(counts).map(([label, count]) => ({ label, count }));
              return { results: dist as unknown as T[], success: true, meta: {} as any };
            }

            let res = [...memoryStore.predictions];
            if (sql.includes('where p.id = ?') || sql.includes('where id = ?')) {
              res = res.filter(
                (p) => p.id === Number(boundParams[0]) || p.scan_id === Number(boundParams[1] ?? boundParams[0])
              );
            } else if (sql.includes('where p.scan_id = ?') || sql.includes('where scan_id = ?')) {
              res = res.filter((p) => p.scan_id === Number(boundParams[0]));
            }

            const joined = res.map((pred) => {
              const scan = memoryStore.mri_scans.find((s) => s.id === pred.scan_id) || memoryStore.mri_scans[0];
              const patUser = memoryStore.users.find((u) => u.id === scan?.patient_id);
              const patProfile = memoryStore.patients.find((pt) => pt.user_id === scan?.patient_id);
              const review = memoryStore.doctor_reviews.find((r) => r.prediction_id === pred.id);
              const doctorUser = review ? memoryStore.users.find((u) => u.id === review.doctor_id) : null;
              return {
                ...pred,
                r2_key: scan?.r2_key,
                file_name: scan?.file_name,
                file_size: scan?.file_size,
                slice_type: scan?.slice_type,
                sequence_type: scan?.sequence_type,
                uploaded_at: scan?.uploaded_at,
                patient_id: scan?.patient_id || 2,
                patient_name: patUser?.full_name || 'Nguyễn Minh An',
                patient_phone: patProfile?.phone || '0912 345 678',
                review_id: review?.id || null,
                confirmed_label: review?.confirmed_label || null,
                doctor_note: review?.note || null,
                ai_assessment: review?.ai_assessment || null,
                recommended_step: review?.recommended_step || null,
                reviewed_at: review?.created_at || null,
                doctor_name: doctorUser?.full_name || 'BS.CKII Trần Quốc Bảo',
                scan: scan || null,
                review: review ? { ...review, doctor_name: doctorUser?.full_name || 'BS.CKII Trần Quốc Bảo' } : null,
              };
            });
            joined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { results: joined as unknown as T[], success: true, meta: {} as any };
          }

          // 4. SELECT mri_scans
          if (sql.includes('from mri_scans')) {
            let res = [...memoryStore.mri_scans];
            if (sql.includes('where r2_key = ?')) {
              res = res.filter((s) => s.r2_key === boundParams[0]);
            } else if (sql.includes('where id = ?')) {
              res = res.filter((s) => s.id === Number(boundParams[0]));
            } else if (sql.includes('where s.patient_id = ?') || sql.includes('where patient_id = ?')) {
              res = res.filter((s) => s.patient_id === Number(boundParams[0]));
            }
            const enriched = res.map((s) => {
              const pred = memoryStore.predictions.find((p) => p.scan_id === s.id);
              return {
                ...s,
                scan_id: s.id,
                prediction_id: pred?.id,
                label: pred?.label,
                confidence: pred?.confidence,
                probabilities: pred?.probabilities,
                created_at: pred?.created_at || s.uploaded_at,
              };
            });
            enriched.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
            return { results: enriched as unknown as T[], success: true, meta: {} as any };
          }

          // 5. SELECT doctor_reviews
          if (sql.includes('from doctor_reviews')) {
            let res = [...memoryStore.doctor_reviews];
            if (sql.includes('where r.prediction_id = ?') || sql.includes('where prediction_id = ?')) {
              res = res.filter((r) => r.prediction_id === Number(boundParams[0]));
            }
            const enriched = res.map((r) => {
              const doc = memoryStore.users.find((u) => u.id === r.doctor_id);
              const pred = memoryStore.predictions.find((p) => p.id === r.prediction_id);
              return {
                ...r,
                doctor_name: doc?.full_name || 'BS.CKII Trần Quốc Bảo',
                ai_label: pred?.label || 'Glioma',
                confidence: pred?.confidence || 0.9,
              };
            });
            return { results: enriched as unknown as T[], success: true, meta: {} as any };
          }

          // 6. SELECT chat_sessions
          if (sql.includes('from chat_sessions')) {
            let res = [...memoryStore.chat_sessions];
            if (sql.includes('where user_id = ?')) {
              res = res.filter((s) => s.user_id === Number(boundParams[0]));
            } else if (sql.includes('where id = ?')) {
              res = res.filter((s) => s.id === Number(boundParams[0]));
            }
            res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { results: res as unknown as T[], success: true, meta: {} as any };
          }

          // 7. SELECT chat_messages
          if (sql.includes('from chat_messages')) {
            let res = [...memoryStore.chat_messages];
            if (sql.includes('where session_id = ?')) {
              res = res.filter((m) => m.session_id === Number(boundParams[0]));
            }
            res.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return { results: res as unknown as T[], success: true, meta: {} as any };
          }

          // 8. SELECT faq_documents
          if (sql.includes('from faq_documents')) {
            return { results: memoryStore.faq_documents as unknown as T[], success: true, meta: {} as any };
          }

          // 9. SELECT patients
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

          // CREATE TABLE / ALTER TABLE / CREATE INDEX
          if (sql.startsWith('create ') || sql.startsWith('alter ')) {
            return { success: true, meta: {} as any };
          }

          // INSERT OR REPLACE INTO rag_chunks
          if (sql.includes('into rag_chunks')) {
            const item = {
              id: boundParams[0],
              doc_id: boundParams[1],
              category: boundParams[2],
              title: boundParams[3],
              content: boundParams[4],
              source: boundParams[5] || 'NeuroScan Knowledge Base',
              embedding_json: boundParams[6] || boundParams[5],
              updated_at: new Date().toISOString(),
            };
            const existingIdx = memoryStore.rag_chunks.findIndex((c) => c.id === item.id);
            if (existingIdx >= 0) {
              memoryStore.rag_chunks[existingIdx] = item;
            } else {
              memoryStore.rag_chunks.push(item);
            }
            return { success: true, meta: {} as any };
          }

          // INSERT INTO users
          if (sql.includes('into users')) {
            const hasExplicitId = sql.includes('(id,');
            const id = hasExplicitId ? Number(boundParams[0]) : memoryStore.users.length + 1;
            const email = String(hasExplicitId ? boundParams[1] : boundParams[0]);
            if (!memoryStore.users.some((u) => u.email.toLowerCase() === email.toLowerCase() || u.id === id)) {
              memoryStore.users.push({
                id,
                email,
                password_hash: hasExplicitId ? boundParams[2] : boundParams[1],
                password_salt: hasExplicitId ? boundParams[3] : boundParams[2],
                role: hasExplicitId ? boundParams[4] : boundParams[3],
                full_name: hasExplicitId ? boundParams[5] : boundParams[4],
                created_at: new Date().toISOString(),
              });
            }
            return { success: true, meta: { last_row_id: id } as any };
          }

          // INSERT INTO patients
          if (sql.includes('into patients')) {
            const userId = Number(boundParams[0]);
            if (!memoryStore.patients.some((p) => p.user_id === userId)) {
              memoryStore.patients.push({
                user_id: userId,
                date_of_birth: boundParams[1] || '1985-01-01',
                phone: boundParams[2] || '',
                gender: boundParams[3] || 'Nam',
                address: boundParams[4] || '',
                medical_history: boundParams[5] || '',
                emergency_contact: boundParams[6] || '',
                created_at: new Date().toISOString(),
              });
            }
            return { success: true, meta: {} as any };
          }

          // INSERT INTO doctors
          if (sql.includes('into doctors')) {
            const userId = Number(boundParams[0]);
            if (!memoryStore.doctors.some((d) => d.user_id === userId)) {
              memoryStore.doctors.push({
                user_id: userId,
                specialty: boundParams[1] || 'Chẩn đoán hình ảnh Thần kinh',
                license_no: boundParams[2] || 'CCHN-2026',
                organization: boundParams[3] || 'Bệnh viện',
                phone: boundParams[4] || '',
                created_at: new Date().toISOString(),
              });
            }
            return { success: true, meta: {} as any };
          }

          // INSERT INTO mri_scans
          if (sql.includes('into mri_scans')) {
            const hasExplicitId = sql.includes('(id,');
            const id = hasExplicitId ? Number(boundParams[0]) : memoryStore.mri_scans.length + 1;
            if (!memoryStore.mri_scans.some((s) => s.id === id)) {
              const offset = hasExplicitId ? 1 : 0;
              memoryStore.mri_scans.push({
                id,
                patient_id: Number(boundParams[offset]),
                r2_key: boundParams[offset + 1],
                file_name: boundParams[offset + 2] || 'mri.jpg',
                file_size: Number(boundParams[offset + 3]) || 25000,
                mime_type: boundParams[offset + 4] || 'image/jpeg',
                slice_type: boundParams[offset + 5] || 'Axial (Trục ngang)',
                sequence_type: boundParams[offset + 6] || 'T1-Gd (Contrast)',
                uploaded_at: new Date().toISOString(),
              });
            }
            return { success: true, meta: { last_row_id: id } as any };
          }

          // INSERT INTO predictions
          if (sql.includes('into predictions')) {
            const hasExplicitId = sql.includes('(id,');
            const id = hasExplicitId ? Number(boundParams[0]) : memoryStore.predictions.length + 1;
            if (!memoryStore.predictions.some((p) => p.id === id)) {
              const offset = hasExplicitId ? 1 : 0;
              memoryStore.predictions.push({
                id,
                scan_id: Number(boundParams[offset]),
                label: boundParams[offset + 1],
                confidence: Number(boundParams[offset + 2]),
                probabilities:
                  typeof boundParams[offset + 3] === 'string'
                    ? boundParams[offset + 3]
                    : JSON.stringify(boundParams[offset + 3]),
                model_version: boundParams[offset + 4] || 'brain_mri_student_v1_onnx',
                inference_time_ms: Number(boundParams[offset + 5]) || 40,
                created_at: new Date().toISOString(),
              });
            }
            return { success: true, meta: { last_row_id: id } as any };
          }

          // INSERT INTO doctor_reviews
          if (sql.includes('into doctor_reviews')) {
            const hasExplicitId = sql.includes('(id,');
            const id = hasExplicitId ? Number(boundParams[0]) : memoryStore.doctor_reviews.length + 1;
            const offset = hasExplicitId ? 1 : 0;
            const rev = {
              id,
              prediction_id: Number(boundParams[offset]),
              doctor_id: Number(boundParams[offset + 1]),
              confirmed_label: boundParams[offset + 2],
              note: boundParams[offset + 3] || '',
              ai_assessment: boundParams[offset + 4] || 'CONCORDANT',
              recommended_step: boundParams[offset + 5] || '',
              created_at: new Date().toISOString(),
            };
            const existingIdx = memoryStore.doctor_reviews.findIndex((r) => r.prediction_id === rev.prediction_id);
            if (existingIdx >= 0) {
              memoryStore.doctor_reviews[existingIdx] = rev;
            } else {
              memoryStore.doctor_reviews.push(rev);
            }
            return { success: true, meta: { last_row_id: rev.id } as any };
          }

          // INSERT INTO chat_sessions
          if (sql.includes('into chat_sessions')) {
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
          if (sql.includes('into chat_messages')) {
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
          if (sql.includes('into faq_documents')) {
            const hasExplicitId = sql.includes('(id,');
            const id = hasExplicitId ? Number(boundParams[0]) : memoryStore.faq_documents.length + 1;
            const offset = hasExplicitId ? 1 : 0;
            if (!memoryStore.faq_documents.some((d) => d.id === id)) {
              memoryStore.faq_documents.push({
                id,
                title: boundParams[offset],
                content: boundParams[offset + 1],
                source: boundParams[offset + 2],
                category: boundParams[offset + 3] || 'tumor_classification',
                created_at: new Date().toISOString(),
              });
            }
            return { success: true, meta: { last_row_id: id } as any };
          }

          // DELETE FROM chat_messages
          if (sql.includes('delete from chat_messages')) {
            const sessionId = Number(boundParams[0]);
            memoryStore.chat_messages = memoryStore.chat_messages.filter((m) => m.session_id !== sessionId);
            return { success: true, meta: {} as any };
          }

          // DELETE FROM chat_sessions
          if (sql.includes('delete from chat_sessions')) {
            const sessionId = Number(boundParams[0]);
            memoryStore.chat_sessions = memoryStore.chat_sessions.filter((s) => s.id !== sessionId);
            return { success: true, meta: {} as any };
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
    async query(_vector: number[], _options?: { topK?: number }) {
      return {
        matches: [],
      };
    },
    async upsert(records: any[]) {
      return { count: records.length };
    },
    async insert(records: any[]) {
      return { count: records.length };
    },
  };
}
