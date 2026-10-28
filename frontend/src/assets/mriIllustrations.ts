import type { TumorLabel } from '@/types/domain';

function encodeSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

/**
 * Tạo hình minh họa lát cắt MRI não tổng hợp (Synthetic MRI Illustration)
 * Tuyệt đối không sử dụng ảnh bệnh nhân thật, phục vụ minh họa học thuật cho 4 nhãn.
 */
export const SYNTHETIC_MRI_SLICES: Record<TumorLabel, string> = {
  Glioma: encodeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#141c2b"/>
          <stop offset="100%" stop-color="#05080f"/>
        </radialGradient>
        <radialGradient id="parenchyma" cx="50%" cy="48%" r="42%">
          <stop offset="0%" stop-color="#5d6b7e"/>
          <stop offset="68%" stop-color="#3e4b5c"/>
          <stop offset="95%" stop-color="#222b38"/>
          <stop offset="100%" stop-color="#0e141d"/>
        </radialGradient>
        <radialGradient id="gliomaLesion" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.95"/>
          <stop offset="40%" stop-color="#cbd5e1" stop-opacity="0.82"/>
          <stop offset="75%" stop-color="#64748b" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#334155" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg)"/>
      <!-- Grid lines -->
      <g stroke="#1e293b" stroke-width="1" opacity="0.55">
        <line x1="256" y1="20" x2="256" y2="492" stroke-dasharray="4 4"/>
        <line x1="20" y1="256" x2="492" y2="256" stroke-dasharray="4 4"/>
      </g>
      <!-- Outer skull contour -->
      <ellipse cx="256" cy="258" rx="176" ry="206" fill="none" stroke="#94a3b8" stroke-width="6" opacity="0.65"/>
      <ellipse cx="256" cy="258" rx="166" ry="196" fill="url(#parenchyma)"/>
      <!-- Midline falx -->
      <line x1="256" y1="64" x2="256" y2="450" stroke="#0f172a" stroke-width="3" opacity="0.8"/>
      <!-- Ventricles (slightly shifted right due to left hemisphere mass effect) -->
      <path d="M238 205 C224 220, 226 265, 242 285 C248 265, 247 228, 238 205 Z" fill="#090d16"/>
      <path d="M270 200 C292 218, 290 270, 268 290 C262 268, 263 224, 270 200 Z" fill="#090d16"/>
      <!-- Cortical sulci lines -->
      <g stroke="#1e293b" stroke-width="2.2" fill="none" opacity="0.65">
        <path d="M120 180 Q155 190 175 170"/>
        <path d="M105 250 Q145 245 170 265"/>
        <path d="M130 335 Q165 320 190 340"/>
        <path d="M390 180 Q355 190 335 170"/>
        <path d="M405 250 Q365 245 340 265"/>
        <path d="M380 335 Q345 320 320 340"/>
      </g>
      <!-- Intra-axial Glioma illustration in left parietal-frontal lobe -->
      <ellipse cx="182" cy="215" rx="52" ry="44" fill="url(#gliomaLesion)"/>
      <ellipse cx="180" cy="214" rx="22" ry="18" fill="#1e293b" opacity="0.55"/>
      <circle cx="182" cy="215" r="46" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.85"/>
      <!-- Annotation overlay -->
      <g font-family="monospace" font-size="11" fill="#94a3b8">
        <text x="18" y="28">SYNTHETIC DEMO • AXIAL T1ce SIM</text>
        <text x="18" y="46" fill="#38bdf8">FIXTURE: GLIOMA-01 (MINH HỌA)</text>
        <text x="18" y="490">KHÔNG PHẢI ẢNH BỆNH NHÂN THẬT</text>
        <text x="410" y="490">512x512 px</text>
      </g>
    </svg>
  `),

  Meningioma: encodeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="bgM" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#141c2b"/>
          <stop offset="100%" stop-color="#05080f"/>
        </radialGradient>
        <radialGradient id="parenchymaM" cx="50%" cy="48%" r="42%">
          <stop offset="0%" stop-color="#5a687a"/>
          <stop offset="70%" stop-color="#3a4759"/>
          <stop offset="96%" stop-color="#202937"/>
          <stop offset="100%" stop-color="#0e141d"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bgM)"/>
      <g stroke="#1e293b" stroke-width="1" opacity="0.55">
        <line x1="256" y1="20" x2="256" y2="492" stroke-dasharray="4 4"/>
        <line x1="20" y1="256" x2="492" y2="256" stroke-dasharray="4 4"/>
      </g>
      <ellipse cx="256" cy="258" rx="176" ry="206" fill="none" stroke="#94a3b8" stroke-width="6" opacity="0.65"/>
      <ellipse cx="256" cy="258" rx="166" ry="196" fill="url(#parenchymaM)"/>
      <line x1="256" y1="64" x2="256" y2="450" stroke="#0f172a" stroke-width="3" opacity="0.8"/>
      <!-- Symmetric ventricles -->
      <path d="M232 202 C214 220, 216 268, 236 288 C244 266, 242 224, 232 202 Z" fill="#090d16"/>
      <path d="M280 202 C298 220, 296 268, 276 288 C268 266, 270 224, 280 202 Z" fill="#090d16"/>
      <!-- Extra-axial Meningioma attached to right dural convexity -->
      <path d="M398 175 C355 178, 342 225, 392 252 C412 228, 412 195, 398 175 Z" fill="#e2e8f0" opacity="0.92"/>
      <path d="M398 175 C355 178, 342 225, 392 252" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="5 3"/>
      <g font-family="monospace" font-size="11" fill="#94a3b8">
        <text x="18" y="28">SYNTHETIC DEMO • EXTRA-AXIAL DURAL SIM</text>
        <text x="18" y="46" fill="#38bdf8">FIXTURE: MENINGIOMA-02 (MINH HỌA)</text>
        <text x="18" y="490">KHÔNG PHẢI ẢNH BỆNH NHÂN THẬT</text>
        <text x="410" y="490">512x512 px</text>
      </g>
    </svg>
  `),

  Pituitary: encodeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="bgP" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#141c2b"/>
          <stop offset="100%" stop-color="#05080f"/>
        </radialGradient>
        <radialGradient id="parenchymaP" cx="50%" cy="45%" r="42%">
          <stop offset="0%" stop-color="#5c6a7d"/>
          <stop offset="72%" stop-color="#3b4859"/>
          <stop offset="100%" stop-color="#18202c"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bgP)"/>
      <g stroke="#1e293b" stroke-width="1" opacity="0.55">
        <line x1="256" y1="20" x2="256" y2="492" stroke-dasharray="4 4"/>
        <line x1="20" y1="256" x2="492" y2="256" stroke-dasharray="4 4"/>
      </g>
      <!-- Coronal/Sellar stylized contour -->
      <ellipse cx="256" cy="242" rx="172" ry="168" fill="none" stroke="#94a3b8" stroke-width="6" opacity="0.65"/>
      <ellipse cx="256" cy="242" rx="162" ry="158" fill="url(#parenchymaP)"/>
      <line x1="256" y1="84" x2="256" y2="265" stroke="#0f172a" stroke-width="3" opacity="0.8"/>
      <!-- Ventricles -->
      <ellipse cx="235" cy="215" rx="14" ry="26" fill="#090d16"/>
      <ellipse cx="277" cy="215" rx="14" ry="26" fill="#090d16"/>
      <!-- Sellar / Pituitary region focal mass -->
      <ellipse cx="256" cy="296" rx="28" ry="24" fill="#f1f5f9" opacity="0.92"/>
      <circle cx="256" cy="296" r="34" fill="none" stroke="#818cf8" stroke-width="2" stroke-dasharray="4 4"/>
      <g font-family="monospace" font-size="11" fill="#94a3b8">
        <text x="18" y="28">SYNTHETIC DEMO • CORONAL SELLAR SIM</text>
        <text x="18" y="46" fill="#818cf8">FIXTURE: PITUITARY-03 (MINH HỌA)</text>
        <text x="18" y="490">KHÔNG PHẢI ẢNH BỆNH NHÂN THẬT</text>
        <text x="410" y="490">512x512 px</text>
      </g>
    </svg>
  `),

  'No Tumor': encodeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <radialGradient id="bgN" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#141c2b"/>
          <stop offset="100%" stop-color="#05080f"/>
        </radialGradient>
        <radialGradient id="parenchymaN" cx="50%" cy="48%" r="42%">
          <stop offset="0%" stop-color="#5b697c"/>
          <stop offset="70%" stop-color="#3c495a"/>
          <stop offset="96%" stop-color="#202836"/>
          <stop offset="100%" stop-color="#0e141d"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bgN)"/>
      <g stroke="#1e293b" stroke-width="1" opacity="0.55">
        <line x1="256" y1="20" x2="256" y2="492" stroke-dasharray="4 4"/>
        <line x1="20" y1="256" x2="492" y2="256" stroke-dasharray="4 4"/>
      </g>
      <ellipse cx="256" cy="258" rx="176" ry="206" fill="none" stroke="#94a3b8" stroke-width="6" opacity="0.65"/>
      <ellipse cx="256" cy="258" rx="166" ry="196" fill="url(#parenchymaN)"/>
      <line x1="256" y1="64" x2="256" y2="450" stroke="#0f172a" stroke-width="3" opacity="0.8"/>
      <!-- Symmetric ventricles -->
      <path d="M232 200 C212 220, 214 270, 236 290 C244 268, 242 224, 232 200 Z" fill="#090d16"/>
      <path d="M280 200 C300 220, 298 270, 276 290 C268 268, 270 224, 280 200 Z" fill="#090d16"/>
      <!-- Balanced cortical sulci -->
      <g stroke="#1e293b" stroke-width="2.2" fill="none" opacity="0.65">
        <path d="M120 180 Q155 190 175 170"/>
        <path d="M105 250 Q145 245 170 265"/>
        <path d="M130 335 Q165 320 190 340"/>
        <path d="M390 180 Q355 190 335 170"/>
        <path d="M405 250 Q365 245 340 265"/>
        <path d="M380 335 Q345 320 320 340"/>
      </g>
      <g font-family="monospace" font-size="11" fill="#94a3b8">
        <text x="18" y="28">SYNTHETIC DEMO • AXIAL BASELINE SIM</text>
        <text x="18" y="46" fill="#34d399">FIXTURE: NO-TUMOR-04 (MINH HỌA)</text>
        <text x="18" y="490">KHÔNG PHẢI ẢNH BỆNH NHÂN THẬT</text>
        <text x="410" y="490">512x512 px</text>
      </g>
    </svg>
  `),
};

/**
 * Minh họa ảnh sau bước tiền xử lý Brain Contour ROI Cropping + CLAHE
 * Chỉ gắn cho mẫu demo đã có cấu hình trả về preprocessedImageUrl để kiểm thử tab So sánh Original / Preprocessed.
 */
export const SYNTHETIC_PREPROCESSED_ROI_GLIOMA = encodeSvgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <radialGradient id="claheParenchyma" cx="50%" cy="48%" r="48%">
        <stop offset="0%" stop-color="#7c8ea6"/>
        <stop offset="68%" stop-color="#4b5c73"/>
        <stop offset="96%" stop-color="#263244"/>
        <stop offset="100%" stop-color="#0b1018"/>
      </radialGradient>
      <radialGradient id="claheLesion" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
        <stop offset="45%" stop-color="#e2e8f0" stop-opacity="0.88"/>
        <stop offset="80%" stop-color="#94a3b8" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#334155" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="#090d16"/>
    <!-- Tight bounding box showing Otsu Brain Contour ROI Cropping -->
    <rect x="44" y="26" width="424" height="460" fill="none" stroke="#14b8a6" stroke-width="2" stroke-dasharray="6 4"/>
    <ellipse cx="256" cy="256" rx="206" ry="224" fill="url(#claheParenchyma)"/>
    <line x1="256" y1="36" x2="256" y2="476" stroke="#090d16" stroke-width="3.5"/>
    <path d="M236 196 C220 215, 222 268, 240 292 C248 268, 246 222, 236 196 Z" fill="#06090f"/>
    <path d="M274 190 C298 212, 296 274, 272 296 C264 270, 266 218, 274 190 Z" fill="#06090f"/>
    <ellipse cx="168" cy="206" rx="62" ry="52" fill="url(#claheLesion)"/>
    <ellipse cx="166" cy="205" rx="26" ry="21" fill="#0f172a" opacity="0.65"/>
    <g font-family="monospace" font-size="11" fill="#5eead4">
      <text x="54" y="46">ROI CROPPED + CLAHE + Z-SCORE (DEMO OUTPUT)</text>
      <text x="54" y="476">BRAIN CONTOUR BBOX: [44, 26, 468, 486]</text>
    </g>
  </svg>
`);
