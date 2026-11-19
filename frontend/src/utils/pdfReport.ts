/**
 * ============================================================================
 * NEUROSCAN AI — CLINICAL A4 PDF REPORT GENERATOR (PRINT-TO-PDF)
 * ============================================================================
 * Tạo phiếu kết quả phân tích MRI sọ não định dạng A4 y khoa sạch sẽ qua
 * hidden iframe (không bị chặn popup) để lưu thành tệp PDF hoặc in trực tiếp.
 * ============================================================================
 */

import {
  DOCTOR_REVIEW_STATUS_META,
  PERMANENT_MEDICAL_DISCLAIMER,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { formatDateTimeVN, formatPercent } from '@/utils/formatters';
import type { MRIAnalysisRecord, TumorLabel } from '@/types/domain';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportClinicalPdfReport(record: MRIAnalysisRecord): void {
  const labelMeta = TUMOR_LABEL_METADATA[record.predictedLabel];
  const reviewStatusMeta = DOCTOR_REVIEW_STATUS_META[record.reviewStatus];
  const labelsOrder: TumorLabel[] = ['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'];

  const probRowsHtml = record.probabilities
    ? labelsOrder
        .map((cls) => {
          const val = record.probabilities?.[cls] ?? 0;
          const pct = (val * 100).toFixed(1);
          const isTop = cls === record.predictedLabel;
          return `
            <tr>
              <td style="font-weight:${isTop ? '700' : '500'};color:${isTop ? '#0f766e' : '#1e293b'};">${escapeHtml(cls)}</td>
              <td>
                <div style="background:#e2e8f0;height:8px;border-radius:999px;overflow:hidden;">
                  <div style="background:${isTop ? '#0d9488' : '#64748b'};width:${pct}%;height:100%;"></div>
                </div>
              </td>
              <td style="text-align:right;font-family:monospace;font-weight:${isTop ? '700' : '400'};">${pct}%</td>
            </tr>
          `;
        })
        .join('')
    : `<tr><td colspan="3" style="color:#64748b;">Không có dữ liệu phân bố xác suất.</td></tr>`;

  const doctorReviewHtml = record.doctorReview
    ? `
      <div class="section">
        <h3>3. Nhận xét chuyên môn của Bác sĩ (Tách biệt với kết quả AI)</h3>
        <table class="meta-table">
          <tr><td><strong>Bác sĩ thẩm định:</strong></td><td>${escapeHtml(record.doctorReview.doctorName)} (${escapeHtml(record.doctorReview.doctorSpecialty)})</td></tr>
          <tr><td><strong>Nhãn xác nhận lâm sàng:</strong></td><td><strong>${escapeHtml(record.doctorReview.confirmedLabel || record.predictedLabel)}</strong></td></tr>
          <tr><td><strong>Ghi chú lâm sàng:</strong></td><td>${escapeHtml(record.doctorReview.clinicalNoteForPatient || 'Không có ghi chú.')}</td></tr>
          <tr><td><strong>Hướng theo dõi khuyến nghị:</strong></td><td>${escapeHtml(record.doctorReview.recommendedNextStep || 'Thăm khám trực tiếp bác sĩ chuyên khoa.')}</td></tr>
        </table>
      </div>
    `
    : `
      <div class="section">
        <h3>3. Trạng thái thẩm định Bác sĩ</h3>
        <p style="margin:0;font-size:12px;color:#475569;">Trạng thái hiện tại: <strong>${escapeHtml(reviewStatusMeta.label)}</strong>. Chưa có kết luận chuyên môn từ Bác sĩ.</p>
      </div>
    `;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phieu_Ket_Qua_MRI_${escapeHtml(record.sessionCode)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12.5px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 14px; }
    .brand { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .brand span { color: #0d9488; }
    .sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; font-size: 11px; font-weight: 700; }
    .section { margin-bottom: 14px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; page-break-inside: avoid; }
    h3 { margin: 0 0 8px 0; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
    .meta-table, .prob-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .meta-table td { padding: 4px 6px; vertical-align: top; }
    .meta-table td:first-child { width: 32%; color: #475569; }
    .prob-table td { padding: 6px; border-bottom: 1px solid #f1f5f9; }
    .prob-table td:first-child { width: 26%; }
    .prob-table td:last-child { width: 16%; }
    .img-grid { display: grid; grid-template-columns: ${record.gradcamUrl ? '1fr 1fr' : '1fr'}; gap: 12px; }
    .img-box { background: #020617; border-radius: 8px; padding: 8px; text-align: center; }
    .img-box img { max-width: 100%; max-height: 210px; object-fit: contain; border-radius: 4px; }
    .img-caption { color: #cbd5e1; font-size: 10.5px; margin-top: 6px; }
    .highlight { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .disclaimer { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #78350f; }
    .footer { margin-top: 12px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">NeuroScan <span>AI</span></div>
      <div class="sub">Phiếu Kết quả Phân tích Hình ảnh học MRI Sọ não (Hỗ trợ 4 lớp WHO CNS5)</div>
    </div>
    <div style="text-align:right;">
      <div class="badge">MÃ PHIÊN: ${escapeHtml(record.sessionCode)}</div>
      <div class="sub" style="margin-top:4px;">Ngày xuất: ${escapeHtml(formatDateTimeVN(new Date().toISOString()))}</div>
    </div>
  </div>

  <div class="section">
    <h3>1. Thông tin Phiên chụp & Hình ảnh</h3>
    <table class="meta-table">
      <tr><td><strong>Chủ phiên / Hồ sơ:</strong></td><td>${escapeHtml(record.ownerDisplayCode)}</td></tr>
      <tr><td><strong>Tên tệp đã ẩn danh:</strong></td><td style="font-family:monospace;">${escapeHtml(record.sanitizedFileName)} (${record.imageDimensions.width} × ${record.imageDimensions.height} px)</td></tr>
      <tr><td><strong>Thời gian phân tích:</strong></td><td>${escapeHtml(formatDateTimeVN(record.createdAt))}</td></tr>
      <tr><td><strong>Mô hình AI & Độ trễ:</strong></td><td style="font-family:monospace;">${escapeHtml(record.modelMetadata.modelVersion)} • ${record.modelMetadata.inferenceTimeMs ?? 0} ms</td></tr>
    </table>
    <div class="img-grid" style="margin-top:10px;">
      <div class="img-box">
        <img src="${escapeHtml(record.imageUrl)}" alt="Ảnh MRI gốc" />
        <div class="img-caption">Ảnh lát cắt MRI gốc</div>
      </div>
      ${
        record.gradcamUrl
          ? `<div class="img-box">
              <img src="${escapeHtml(record.gradcamUrl)}" alt="Bản đồ nhiệt Grad-CAM" />
              <div class="img-caption">Bản đồ kích hoạt vùng chú ý (Grad-CAM / CNN CAM)</div>
            </div>`
          : ''
      }
    </div>
  </div>

  <div class="section">
    <h3>2. Kết quả Phân loại Tham khảo từ Mô hình AI</h3>
    <div class="highlight">
      <div>
        <div style="font-size:11px;color:#0f766e;font-weight:700;">NHÃN DỰ ĐOÁN CAO NHẤT</div>
        <div style="font-size:16px;font-weight:800;color:#0f172a;">${escapeHtml(labelMeta.vietnameseTitle)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#475569;">Confidence Score (Softmax)</div>
        <div style="font-size:18px;font-weight:800;color:#0d9488;font-family:monospace;">${formatPercent(record.confidenceScore)}</div>
      </div>
    </div>
    <table class="prob-table">${probRowsHtml}</table>
  </div>

  ${doctorReviewHtml}

  <div class="disclaimer">
    <strong>CẢNH BÁO AN TOÀN Y KHOA:</strong> ${escapeHtml(PERMANENT_MEDICAL_DISCLAIMER)}
  </div>

  <div class="footer">
    <span>NeuroScan AI — Nền tảng hỗ trợ đọc hiểu hình ảnh học MRI sọ não</span>
    <span>Tài liệu chỉ phục vụ tham khảo, không thay thế chẩn đoán lâm sàng.</span>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }
  };

  window.setTimeout(triggerPrint, 350);
}
