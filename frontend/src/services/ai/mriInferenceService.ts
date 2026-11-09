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
 * Tiền xử lý ảnh MRI đưa về kích thước chuẩn [1, 3, 256, 256] với dải pixel [0, 1].
 * Lưu ý: Mô hình brain_mri_student.onnx đã tích hợp sẵn lớp chuyển đổi Grayscale
 * (0.299R + 0.587G + 0.114B), Expand 3 kênh và chuẩn hóa ImageNet (Sub mean / Div std)
 * ngay bên trong các node đầu tiên của đồ thị ONNX.
 */
async function preprocessImageToTensor(imageSource: string | File): Promise<ort.Tensor> {
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

      // 1. Phân tích histogram nền ảnh gốc để hiệu chuẩn trường nhìn (FOV) và mức nền đen (Black-level floor)
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

      // 2. Nếu ảnh lát cắt bị cắt sát hộp sọ và nền đen bị nâng sáng xám (elevated dark floor),
      // thực hiện hiệu chuẩn nền đen T1 và tái tạo viền FOV chuẩn trước khi đưa về 256x256
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
        // Resize trực tiếp về 256x256 đồng nhất với transforms.Resize((256, 256)) khi huấn luyện PyTorch
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
      }

      const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
      const { data } = imageData;

      // 3. Chuyển đổi sang CHW float32 tensor trong dải [0, 1]
      const planeSize = targetSize * targetSize;
      const float32Data = new Float32Array(3 * planeSize);

      for (let i = 0; i < planeSize; i++) {
        float32Data[i] = data[i * 4] / 255.0;
        float32Data[planeSize + i] = data[i * 4 + 1] / 255.0;
        float32Data[planeSize * 2 + i] = data[i * 4 + 2] / 255.0;
      }

      const tensor = new ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
      resolve(tensor);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể tải dữ liệu ảnh chụp MRI để phân tích'));
    };
  });
}

/**
 * Thực thi suy luận bằng mô hình ONNX student thật (brain_mri_student.onnx - 15.3 MB)
 */
export async function runMriOnnxInference(
  imageSource: string | File,
  _fallbackHint?: string
): Promise<MRIInferenceResult> {
  const startTime = performance.now();

  const session = await getInferenceSession();
  const inputTensor = await preprocessImageToTensor(imageSource);

  const feeds: Record<string, ort.Tensor> = { image: inputTensor };
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

  const inferenceTimeMs = Math.max(1, Math.round(performance.now() - startTime));

  return {
    label: topLabel,
    confidence: maxP,
    probabilities: normProb,
    inferenceTimeMs,
    modelVersion: 'brain_mri_student_v1_onnx',
  };
}
