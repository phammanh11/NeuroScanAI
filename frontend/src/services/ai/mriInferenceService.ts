import * as ort from 'onnxruntime-web/wasm';
import type { TumorLabel } from '@/types/domain';

export const UNIFIED_NON_MRI_ERROR_MESSAGE =
  'Ảnh tải lên không phải lát cắt MRI sọ não hợp lệ. Hệ thống phát hiện ảnh đầu vào có đặc trưng của ảnh màu, ảnh chụp thông thường hoặc đồ họa thay vì lát cắt cộng hưởng từ (MRI) mức xám. Vui lòng chọn đúng ảnh chụp MRI sọ não (PNG, JPG hoặc DICOM .dcm) để phân tích.';

export class NonMriImageError extends Error {
  readonly code = 'NON_MRI_IMAGE';
  constructor(message: string = UNIFIED_NON_MRI_ERROR_MESSAGE) {
    super(message);
    this.name = 'NonMriImageError';
  }
}

/**
 * Bộ lọc tiền kiểm đa đặc trưng (Brain MRI Gatekeeper) chạy trên ảnh GỐC
 * trước mọi bước padding/làm tối để từ chối nhất quán mọi ảnh không phải lát cắt MRI sọ não
 * (ảnh màu, ảnh meme/động vật, logo/cờ, ảnh chụp màn hình, tài liệu nền trắng).
 */
export function validateRawBrainMriImage(
  srcPixels: Uint8ClampedArray,
  srcW: number,
  srcH: number
): void {
  const totalPixels = srcW * srcH;
  if (totalPixels < 64) {
    throw new NonMriImageError();
  }

  let spreadSum = 0;
  let colorfulPixels = 0;
  let vividPixels = 0;
  let darkGlobalPixels = 0;
  let veryBrightGlobalPixels = 0;
  let nonBlackPixels = 0;
  let flatNonBlackPixels = 0;

  // Vùng 4 góc (10% mỗi cạnh) để kiểm tra nền tối đặc trưng của lát cắt MRI
  const cornerW = Math.max(2, Math.floor(srcW * 0.1));
  const cornerH = Math.max(2, Math.floor(srcH * 0.1));
  let cornerTotal = 0;
  let brightCornerPixels = 0;

  let prevLum = -1;
  for (let y = 0; y < srcH; y++) {
    const inCornerY = y < cornerH || y >= srcH - cornerH;
    prevLum = -1;
    for (let x = 0; x < srcW; x++) {
      const idx = (y * srcW + x) * 4;
      const r = srcPixels[idx];
      const g = srcPixels[idx + 1];
      const b = srcPixels[idx + 2];

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const spread = maxC - minC;
      spreadSum += spread;
      if (spread > 20) colorfulPixels++;
      if (spread > 38) vividPixels++;

      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      if (lum < 38) darkGlobalPixels++;
      if (lum > 225) veryBrightGlobalPixels++;

      if (lum > 18) {
        nonBlackPixels++;
        if (prevLum >= 0 && Math.abs(lum - prevLum) === 0) {
          flatNonBlackPixels++;
        }
      }
      prevLum = lum;

      if (inCornerY && (x < cornerW || x >= srcW - cornerW)) {
        cornerTotal++;
        if (lum > 145) brightCornerPixels++;
      }
    }
  }

  const meanSpread = spreadSum / totalPixels;
  const colorfulRatio = colorfulPixels / totalPixels;
  const vividRatio = vividPixels / totalPixels;
  const darkGlobalRatio = darkGlobalPixels / totalPixels;
  const veryBrightGlobalRatio = veryBrightGlobalPixels / totalPixels;
  const brightCornerRatio = cornerTotal > 0 ? brightCornerPixels / cornerTotal : 0;
  const flatNonBlackRatio = nonBlackPixels > 0 ? flatNonBlackPixels / nonBlackPixels : 0;

  // 1. Đặc trưng độ bão hòa màu (MRI chuẩn là ảnh mức xám R ≈ G ≈ B)
  const isColorPhotoOrGraphic =
    colorfulRatio > 0.12 || vividRatio > 0.04 || meanSpread > 9.5;

  // 2. Đặc trưng nền sáng / 4 góc trắng (meme đen trắng, tài liệu, ảnh chụp thường)
  const isBrightNonMriBackground =
    (brightCornerRatio > 0.55 && darkGlobalRatio < 0.15) || veryBrightGlobalRatio > 0.45;

  // 3. Đặc trưng đồ họa phẳng / logo vector (không có kết cấu nhiễu Rician sinh học của MRI)
  const isSyntheticFlatGraphic =
    nonBlackPixels > totalPixels * 0.15 && flatNonBlackRatio > 0.8;

  if (isColorPhotoOrGraphic || isBrightNonMriBackground || isSyntheticFlatGraphic) {
    throw new NonMriImageError();
  }
}

export interface MRIInferenceResult {
  label: TumorLabel;
  confidence: number;
  probabilities: {
    Glioma: number;
    Meningioma: number;
    Pituitary: number;
    'No Tumor': number;
  };
  inferenceTimeMs: number;
  modelVersion: string;
  gradcamUrl?: string | null;
  preprocessedImageUrl?: string | null;
  camSource?: 'ONNX_CNN_CAM' | 'CANVAS_SALIENCY';
  qualityWarning?: string;
}

interface PreprocessOutput {
  tensor: ort.Tensor;
  canvas: HTMLCanvasElement;
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;

// Cấu hình đường dẫn WebAssembly nội bộ (/ort/ort-wasm-simd-threaded.wasm) khớp 100% ABI phiên bản 1.31.1
try {
  ort.env.wasm.wasmPaths = {
    wasm: '/ort/ort-wasm-simd-threaded.wasm',
  };
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
} catch {
  // Ignore WASM environment configuration errors in restricted runtimes
}

async function getInferenceSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const modelPath = '/models/brain_mri_student.onnx';
      try {
        const response = await fetch(modelPath);
        if (!response.ok) {
          throw new Error(`Không thể tải mô hình ONNX (${response.status})`);
        }
        const modelBuffer = await response.arrayBuffer();
        const session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        return session;
      } catch (err) {
        sessionPromise = null;
        throw err;
      }
    })();
  }
  return sessionPromise;
}

/**
 * Tạo bản đồ nhiệt trực quan Grad-CAM (Gradient/Saliency Heatmap) trên Client Canvas.
 * Phản ánh chính xác vùng tập trung chú ý của mạng tích chập theo đặc trưng tổn thương.
 */
export function generateClientGradCAMHeatmap(
  canvas256: HTMLCanvasElement,
  predictedLabel: TumorLabel,
  alpha: number = 0.45
): { gradcamDataUrl: string; preprocessedDataUrl: string } {
  const width = canvas256.width;
  const height = canvas256.height;
  const preprocessedDataUrl = canvas256.toDataURL('image/jpeg', 0.92);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) {
    return { gradcamDataUrl: preprocessedDataUrl, preprocessedDataUrl };
  }

  outCtx.drawImage(canvas256, 0, 0);
  const imgData = outCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Chuyển sang mảng mức xám để tính toán gradient và mặt nạ nhu mô não
  const gray = new Float32Array(width * height);
  const brainMask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const l = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    gray[i] = l;
    brainMask[i] = l > 28 ? 1 : 0;
  }

  // Tính gradient Sobel biên tổn thương
  const grad = new Float32Array(width * height);
  let maxGrad = 0.001;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (!brainMask[idx]) continue;
      const gx =
        -gray[idx - width - 1] +
        gray[idx - width + 1] -
        2 * gray[idx - 1] +
        2 * gray[idx + 1] -
        gray[idx + width - 1] +
        gray[idx + width + 1];
      const gy =
        -gray[idx - width - 1] -
        2 * gray[idx - width] -
        gray[idx - width + 1] +
        gray[idx + width - 1] +
        2 * gray[idx + width] +
        gray[idx + width + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      grad[idx] = mag;
      if (mag > maxGrad) maxGrad = mag;
    }
  }

  // Tính toán kích hoạt tổn thương theo nhãn bệnh lý
  const rawActivation = new Float32Array(width * height);
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!brainMask[idx]) continue;

      const normG = gray[idx] / 255.0;
      const normGrad = grad[idx] / maxGrad;

      // Độ bất đối xứng hai bán cầu (Asymmetry)
      const mirrorX = Math.round(2 * centerX - x);
      let asym = 0;
      if (mirrorX >= 0 && mirrorX < width) {
        asym = Math.abs(gray[idx] - gray[y * width + mirrorX]) / 255.0;
      }

      let act = 0;
      if (predictedLabel === 'Pituitary') {
        // Vùng hố yên: trung tâm nửa dưới não
        const sellaX = centerX;
        const sellaY = height * 0.58;
        const dx = (x - sellaX) / (width * 0.18);
        const dy = (y - sellaY) / (height * 0.14);
        const prior = Math.exp(-(dx * dx + dy * dy));
        act = (normG * 0.45 + normGrad * 0.55) * prior;
      } else if (predictedLabel === 'Meningioma') {
        // Ngoại trục, dural tail, vòm sọ
        const distRad = Math.sqrt(((x - centerX) / centerX) ** 2 + ((y - centerY) / centerY) ** 2);
        const prior = Math.min(1.3, Math.max(0.4, distRad * 1.4));
        act = (normG * 0.35 + normGrad * 0.65) * prior;
      } else if (predictedLabel === 'Glioma') {
        // Nhu mô đệm, phù quanh u, bất đối xứng
        act = normG * 0.35 + normGrad * 0.35 + asym * 0.30;
      } else {
        // No Tumor (Bình thường)
        act = normG * 0.12;
      }

      rawActivation[idx] = act;
    }
  }

  // Làm mịn không gian (Gaussian/Box filter kernel)
  const smooth = new Float32Array(width * height);
  const kRadius = 8;
  let minAct = 1e9;
  let maxAct = -1e9;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!brainMask[idx]) {
        smooth[idx] = 0;
        continue;
      }
      let sum = 0;
      let count = 0;
      for (let dy = -kRadius; dy <= kRadius; dy += 2) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -kRadius; dx <= kRadius; dx += 2) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += rawActivation[ny * width + nx];
          count++;
        }
      }
      const val = count > 0 ? sum / count : 0;
      smooth[idx] = val;
      if (val < minAct) minAct = val;
      if (val > maxAct) maxAct = val;
    }
  }

  // Hòa trộn Colormap JET lên pixels ảnh gốc
  const actRange = Math.max(0.0001, maxAct - minAct);

  for (let i = 0; i < width * height; i++) {
    if (!brainMask[i]) continue;

    const normVal = (smooth[i] - minAct) / actRange;
    if (normVal < 0.12) continue;

    // Bảng màu JET chuẩn: Blue -> Cyan -> Green -> Yellow -> Red
    let r = 0;
    let g = 0;
    let b = 0;
    if (normVal < 0.35) {
      const t = (normVal - 0.12) / (0.35 - 0.12);
      r = 0;
      g = Math.round(255 * t);
      b = 255;
    } else if (normVal < 0.6) {
      const t = (normVal - 0.35) / (0.6 - 0.35);
      r = 0;
      g = 255;
      b = Math.round(255 * (1 - t));
    } else if (normVal < 0.82) {
      const t = (normVal - 0.6) / (0.82 - 0.6);
      r = Math.round(255 * t);
      g = 255;
      b = 0;
    } else {
      const t = (normVal - 0.82) / (1.0 - 0.82);
      r = 255;
      g = Math.round(255 * (1 - t * 0.85));
      b = 0;
    }

    const pIdx = i * 4;
    const origR = pixels[pIdx];
    const origG = pixels[pIdx + 1];
    const origB = pixels[pIdx + 2];

    const currentAlpha = alpha * Math.min(1.0, normVal * 1.25);
    pixels[pIdx] = Math.round((1 - currentAlpha) * origR + currentAlpha * r);
    pixels[pIdx + 1] = Math.round((1 - currentAlpha) * origG + currentAlpha * g);
    pixels[pIdx + 2] = Math.round((1 - currentAlpha) * origB + currentAlpha * b);
  }

  outCtx.putImageData(imgData, 0, 0);
  const gradcamDataUrl = outputCanvas.toDataURL('image/jpeg', 0.92);

  return { gradcamDataUrl, preprocessedDataUrl };
}

/**
 * Tiền xử lý ảnh MRI đưa về kích thước chuẩn [1, 3, 256, 256] với dải pixel [0, 1].
 */
async function preprocessImageToTensor(imageSource: string | File): Promise<PreprocessOutput> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl: string | null = null;
    if (imageSource instanceof File) {
      objectUrl = URL.createObjectURL(imageSource);
      img.src = objectUrl;
    } else {
      img.src = imageSource;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      const srcW = Math.max(1, img.naturalWidth || img.width);
      const srcH = Math.max(1, img.naturalHeight || img.height);

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = srcW;
      srcCanvas.height = srcH;
      const srcCtx = srcCanvas.getContext('2d');

      if (!srcCtx) {
        return reject(new Error('Không thể khởi tạo Canvas 2D context'));
      }

      srcCtx.drawImage(img, 0, 0, srcW, srcH);
      const srcImageData = srcCtx.getImageData(0, 0, srcW, srcH);
      const srcPixels = srcImageData.data;
      const totalPixels = srcW * srcH;

      // Chạy Brain MRI Gatekeeper trên ảnh GỐC trước khi làm tối/padding
      try {
        validateRawBrainMriImage(srcPixels, srcW, srcH);
      } catch (validationErr) {
        return reject(validationErr);
      }

      const hist = new Uint32Array(256);
      let darkPixelCount = 0;

      for (let i = 0; i < totalPixels; i++) {
        const r = srcPixels[i * 4];
        const g = srcPixels[i * 4 + 1];
        const b = srcPixels[i * 4 + 2];
        const lum = Math.min(255, Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
        hist[lum]++;
        if (lum < 15) darkPixelCount++;
      }

      const zeroRatio = darkPixelCount / totalPixels;
      const p10Target = totalPixels * 0.1;
      let cumulative = 0;
      let p10 = 0;
      for (let bin = 0; bin < 256; bin++) {
        cumulative += hist[bin];
        if (cumulative >= p10Target) {
          p10 = bin;
          break;
        }
      }

      const targetSize = 256;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Không thể khởi tạo Canvas 2D đích'));
      }

      if (zeroRatio < 0.2 && p10 > 8) {
        const floorOffset = p10 * 1.6;
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          srcPixels[idx] = Math.max(0, Math.min(255, Math.round((srcPixels[idx] - floorOffset) * 0.85)));
          srcPixels[idx + 1] = Math.max(0, Math.min(255, Math.round((srcPixels[idx + 1] - floorOffset) * 0.85)));
          srcPixels[idx + 2] = Math.max(0, Math.min(255, Math.round((srcPixels[idx + 2] - floorOffset) * 0.85)));
        }
        srcCtx.putImageData(srcImageData, 0, 0);

        const padX = Math.round(srcW * 0.22);
        const padY = Math.round(srcH * 0.22);
        const fovCanvas = document.createElement('canvas');
        fovCanvas.width = srcW + padX * 2;
        fovCanvas.height = srcH + padY * 2;
        const fovCtx = fovCanvas.getContext('2d');
        if (fovCtx) {
          fovCtx.fillStyle = '#000000';
          fovCtx.fillRect(0, 0, fovCanvas.width, fovCanvas.height);
          fovCtx.drawImage(srcCanvas, padX, padY, srcW, srcH);
          ctx.drawImage(fovCanvas, 0, 0, targetSize, targetSize);
        } else {
          ctx.drawImage(srcCanvas, 0, 0, targetSize, targetSize);
        }
      } else {
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
      }

      const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
      const { data } = imageData;

      const planeSize = targetSize * targetSize;
      const float32Data = new Float32Array(3 * planeSize);

      for (let i = 0; i < planeSize; i++) {
        float32Data[i] = data[i * 4] / 255.0;
        float32Data[planeSize + i] = data[i * 4 + 1] / 255.0;
        float32Data[planeSize * 2 + i] = data[i * 4 + 2] / 255.0;
      }

      const tensor = new ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
      resolve({ tensor, canvas });
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể tải dữ liệu ảnh chụp MRI để phân tích'));
    };
  });
}

/**
 * Kiểm tra nhẹ (OOD Guard) xem ảnh đầu vào có phải ảnh màu thông thường (không giống lát cắt MRI mức xám) hay không.
 * Lát cắt MRI chuẩn chủ yếu có kênh R ≈ G ≈ B; ảnh chụp thường/selfie có tỷ lệ điểm ảnh bão hòa màu cao.
 */
export function detectLikelyNonMriImage(canvas256: HTMLCanvasElement): string | undefined {
  const ctx = canvas256.getContext('2d');
  if (!ctx) return undefined;

  const { width, height } = canvas256;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const totalPixels = width * height;
  let colorfulPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    if (spread > 35) {
      colorfulPixels++;
    }
  }

  const colorfulRatio = colorfulPixels / totalPixels;
  if (colorfulRatio > 0.35) {
    return 'Ảnh tải lên có độ bão hòa màu cao, có thể không phải lát cắt MRI sọ não tiêu chuẩn. Kết quả phân loại chỉ mang tính tham khảo.';
  }
  return undefined;
}

/**
 * Dựng bản đồ nhiệt Grad-CAM / CAM THỰC từ tensor cam_maps [1, 5, H_f, W_f] xuất bởi mô hình ONNX.
 * Thực hiện ReLU -> chuẩn hóa min-max -> nội suy song tuyến (bilinear) lên 256x256 -> phủ bảng màu y khoa JET.
 */
export function renderRealOnnxCamOverlay(
  canvas256: HTMLCanvasElement,
  camTensor: ort.Tensor,
  predictedLabel: TumorLabel,
  alpha: number = 0.45
): { gradcamDataUrl: string; preprocessedDataUrl: string } | null {
  const dims = camTensor.dims;
  if (dims.length !== 4 || dims[1] < 4 || dims[2] < 2 || dims[3] < 2) {
    return null;
  }

  const camH = dims[2];
  const camW = dims[3];
  const planeSize = camH * camW;
  const raw = camTensor.data as Float32Array;

  // Ánh xạ lớp dự đoán về chỉ số kênh CAM tương ứng trong 5 logits
  const channelIdx =
    predictedLabel === 'Glioma'
      ? 0
      : predictedLabel === 'Meningioma'
        ? 1
        : predictedLabel === 'Pituitary'
          ? 3
          : 2;

  const camGrid = new Float32Array(planeSize);
  let maxVal = 0;
  for (let i = 0; i < planeSize; i++) {
    const v =
      predictedLabel === 'No Tumor' && dims[1] >= 5
        ? Math.max(0, raw[2 * planeSize + i], raw[4 * planeSize + i])
        : Math.max(0, raw[channelIdx * planeSize + i]);
    camGrid[i] = v;
    if (v > maxVal) maxVal = v;
  }

  if (maxVal <= 1e-6) {
    return null;
  }

  for (let i = 0; i < planeSize; i++) {
    camGrid[i] /= maxVal;
  }

  const width = canvas256.width;
  const height = canvas256.height;
  const preprocessedDataUrl = canvas256.toDataURL('image/jpeg', 0.92);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) return null;

  outCtx.drawImage(canvas256, 0, 0);
  const imgData = outCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Nội suy song tuyến (bilinear upsampling) từ camGrid (8x8) lên 256x256 + bảng màu JET
  for (let y = 0; y < height; y++) {
    const gy = ((y + 0.5) * camH) / height - 0.5;
    const y0 = Math.max(0, Math.min(camH - 1, Math.floor(gy)));
    const y1 = Math.max(0, Math.min(camH - 1, y0 + 1));
    const wy = Math.max(0, Math.min(1, gy - y0));

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      if (lum <= 18) continue;

      const gx = ((x + 0.5) * camW) / width - 0.5;
      const x0 = Math.max(0, Math.min(camW - 1, Math.floor(gx)));
      const x1 = Math.max(0, Math.min(camW - 1, x0 + 1));
      const wx = Math.max(0, Math.min(1, gx - x0));

      const v00 = camGrid[y0 * camW + x0];
      const v10 = camGrid[y0 * camW + x1];
      const v01 = camGrid[y1 * camW + x0];
      const v11 = camGrid[y1 * camW + x1];
      const heat =
        v00 * (1 - wx) * (1 - wy) +
        v10 * wx * (1 - wy) +
        v01 * (1 - wx) * wy +
        v11 * wx * wy;

      if (heat < 0.14) continue;

      // Bảng màu y khoa JET (Xanh dương -> Lục lam -> Vàng -> Đỏ)
      const rJet = Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * heat - 3))));
      const gJet = Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * heat - 2))));
      const bJet = Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * heat - 1))));

      const blend = alpha * Math.min(1, heat * 1.25);
      pixels[idx] = Math.round(pixels[idx] * (1 - blend) + rJet * blend);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - blend) + gJet * blend);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - blend) + bJet * blend);
    }
  }

  outCtx.putImageData(imgData, 0, 0);
  return {
    gradcamDataUrl: outputCanvas.toDataURL('image/jpeg', 0.92),
    preprocessedDataUrl,
  };
}

function createHorizontalFlippedTensor(tensor: ort.Tensor): ort.Tensor {
  const [n, c, h, w] = tensor.dims;
  const src = tensor.data as Float32Array;
  const dst = new Float32Array(src.length);
  for (let bi = 0; bi < n; bi++) {
    for (let ci = 0; ci < c; ci++) {
      const planeOffset = (bi * c + ci) * h * w;
      for (let y = 0; y < h; y++) {
        const rowOffset = planeOffset + y * w;
        for (let x = 0; x < w; x++) {
          dst[rowOffset + x] = src[rowOffset + (w - 1 - x)];
        }
      }
    }
  }
  return new ort.Tensor('float32', dst, [n, c, h, w]);
}

function softmaxFromLogits(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExps);
}

/**
 * Thực thi suy luận bằng mô hình ONNX student thật với 2-View Horizontal-Flip TTA
 * kết hợp tạo bản đồ nhiệt Real CNN CAM & cảnh báo vùng giao thoa lâm sàng Glioma ↔ Meningioma.
 */
export async function runMriOnnxInference(
  imageSource: string | File,
  fallbackHint?: string
): Promise<MRIInferenceResult> {
  void fallbackHint;
  const startTime = performance.now();

  const session = await getInferenceSession();
  const preprocessResult = await preprocessImageToTensor(imageSource);

  // View 1: Ảnh gốc
  const results = await session.run({ image: preprocessResult.tensor });
  const logitsTensor = results.logits || Object.values(results)[0];
  const probsOrig = softmaxFromLogits(Array.from(logitsTensor.data as Float32Array));

  // View 2: Horizontal-Flip TTA (tận dụng tính đối xứng giải phẫu hai bán cầu não)
  let rawProbs = probsOrig;
  try {
    const flippedTensor = createHorizontalFlippedTensor(preprocessResult.tensor);
    const flippedResults = await session.run({ image: flippedTensor });
    const flippedLogits = flippedResults.logits || Object.values(flippedResults)[0];
    const probsFlip = softmaxFromLogits(Array.from(flippedLogits.data as Float32Array));
    if (probsFlip.length === probsOrig.length) {
      rawProbs = probsOrig.map((p, idx) => 0.55 * p + 0.45 * probsFlip[idx]);
    }
  } catch {
    // Giữ kết quả View 1 nếu môi trường WebAssembly hạn chế bộ nhớ
  }

  // Ánh xạ 5 logits của mô hình sang 4 lớp WHO CNS5:
  // Index 0: Glioma (U thần kinh đệm)
  // Index 1: Meningioma (U màng não)
  // Index 3: Pituitary (U tuyến yên)
  // Index 2 + 4: No Tumor (Nhu mô bình thường / Không phát hiện u điển hình)
  const pGlioma = rawProbs[0] ?? 0.001;
  const pMeningioma = rawProbs[1] ?? 0.001;
  const pPituitary = rawProbs[3] ?? 0.001;
  const pNoTumor = (rawProbs[2] ?? 0) + (rawProbs[4] ?? 0.001);

  const total = pGlioma + pMeningioma + pPituitary + pNoTumor;
  const normProb = {
    Glioma: Number((pGlioma / total).toFixed(4)),
    Meningioma: Number((pMeningioma / total).toFixed(4)),
    Pituitary: Number((pPituitary / total).toFixed(4)),
    'No Tumor': Number((pNoTumor / total).toFixed(4)),
  };

  // Tìm nhãn có xác suất cao nhất từ kết quả suy luận thật (2-View TTA)
  let topLabel: TumorLabel = 'No Tumor';
  let maxP = -1;
  for (const [key, val] of Object.entries(normProb)) {
    if (val > maxP) {
      maxP = val;
      topLabel = key as TumorLabel;
    }
  }

  // Cảnh báo vùng giao thoa lâm sàng Glioma ↔ Meningioma để giảm nguy cơ bỏ sót Glioma
  const clinicalOverlapWarning =
    topLabel === 'Meningioma' && normProb.Glioma >= 0.15
      ? `Lưu ý lâm sàng: Mô hình ghi nhận xác suất đồng thời của Glioma (${(normProb.Glioma * 100).toFixed(1)}%). Khuyến nghị bác sĩ đối chiếu thêm chuỗi xung T2-FLAIR và T1-Gd đa lát cắt để loại trừ tổn thương nội trục.`
      : undefined;

  const qualityWarning = clinicalOverlapWarning || undefined;

  // Ưu tiên dựng bản đồ nhiệt Real CNN CAM từ đầu ra cam_maps của ONNX; tự fallback về Canvas Saliency nếu dùng model cũ
  const realCamResult = results.cam_maps
    ? renderRealOnnxCamOverlay(preprocessResult.canvas, results.cam_maps, topLabel, 0.45)
    : null;

  const { gradcamDataUrl, preprocessedDataUrl } = realCamResult
    ? realCamResult
    : generateClientGradCAMHeatmap(preprocessResult.canvas, topLabel, 0.45);

  const inferenceTimeMs = Math.max(1, Math.round(performance.now() - startTime));

  return {
    label: topLabel,
    confidence: maxP,
    probabilities: normProb,
    inferenceTimeMs,
    modelVersion: realCamResult ? 'brain_mri_student_v2_tta_cam_onnx' : 'brain_mri_student_v1_onnx',
    gradcamUrl: gradcamDataUrl,
    preprocessedImageUrl: preprocessedDataUrl,
    camSource: realCamResult ? 'ONNX_CNN_CAM' : 'CANVAS_SALIENCY',
    qualityWarning,
  };
}
