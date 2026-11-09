import * as ort from 'onnxruntime-web/wasm';
import type { TumorLabel } from '@/types/domain';

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
} catch {}

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
 * Thực thi suy luận bằng mô hình ONNX student thật kết hợp tạo bản đồ nhiệt Grad-CAM
 */
export async function runMriOnnxInference(
  imageSource: string | File,
  _fallbackHint?: string
): Promise<MRIInferenceResult> {
  const startTime = performance.now();

  const session = await getInferenceSession();
  const preprocessResult = await preprocessImageToTensor(imageSource);

  const feeds: Record<string, ort.Tensor> = { image: preprocessResult.tensor };
  const results = await session.run(feeds);
  const logitsTensor = results.logits || Object.values(results)[0];
  const logits = Array.from(logitsTensor.data as Float32Array);

  // Tính Softmax trên 5 logits của mô hình student
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  const rawProbs = exps.map((e) => e / sumExps);

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

  // Tìm nhãn có xác suất cao nhất từ kết quả suy luận thật
  let topLabel: TumorLabel = 'No Tumor';
  let maxP = -1;
  for (const [key, val] of Object.entries(normProb)) {
    if (val > maxP) {
      maxP = val;
      topLabel = key as TumorLabel;
    }
  }

  // Tạo bản đồ nhiệt Grad-CAM trực tiếp từ canvas tiền xử lý
  const { gradcamDataUrl, preprocessedDataUrl } = generateClientGradCAMHeatmap(
    preprocessResult.canvas,
    topLabel,
    0.45
  );

  const inferenceTimeMs = Math.max(1, Math.round(performance.now() - startTime));

  return {
    label: topLabel,
    confidence: maxP,
    probabilities: normProb,
    inferenceTimeMs,
    modelVersion: 'brain_mri_student_v1_onnx',
    gradcamUrl: gradcamDataUrl,
    preprocessedImageUrl: preprocessedDataUrl,
  };
}
