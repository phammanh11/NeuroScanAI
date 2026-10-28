import React, { useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FileImage,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { SYNTHETIC_MRI_SLICES } from '@/assets/mriIllustrations';
import { formatBytes, sanitizeMedicalFileName } from '@/utils/formatters';
import type { TumorLabel } from '@/types/domain';

interface MRIUploaderProps {
  selectedFile: File | null;
  previewUrl: string | null;
  validationError: string | null;
  disabled?: boolean;
  anonymizationScope?: string;
  onSelectFile: (file: File, previewUrl: string) => void;
  onValidationError: (msg: string | null) => void;
  onClearFile: () => void;
  onUseSyntheticSample: (label: TumorLabel) => void;
  onValidationStateChange?: (isValidating: boolean) => void;
}

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const MAX_IMAGE_SIDE_PX = 8192;
const MAX_IMAGE_PIXELS = 25_000_000;

export const MRIUploader: React.FC<MRIUploaderProps> = ({
  selectedFile,
  previewUrl,
  validationError,
  disabled = false,
  anonymizationScope = 'session',
  onSelectFile,
  onValidationError,
  onClearFile,
  onUseSyntheticSample,
  onValidationStateChange,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const validationRequestRef = useRef(0);
  const [isValidatingFile, setIsValidatingFile] = useState(false);

  const setValidationState = (next: boolean) => {
    setIsValidatingFile(next);
    onValidationStateChange?.(next);
  };

  const invalidatePendingValidation = () => {
    validationRequestRef.current += 1;
    setValidationState(false);
  };

  useEffect(
    () => () => {
      validationRequestRef.current += 1;
    },
    [],
  );

  const validateAndProcessFile = async (file: File) => {
    // Không giữ lại file cũ trong khi kiểm tra file mới. Nếu file mới không hợp lệ,
    // giao diện phải phản ánh đúng rằng hiện tại chưa có file có thể phân tích.
    if (selectedFile || previewUrl) {
      onClearFile();
    }
    const requestId = ++validationRequestRef.current;
    setValidationState(true);
    onValidationError(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'dcm' || ext === 'dicom') {
      onValidationError(
        'Định dạng DICOM (.dcm) yêu cầu bộ đọc chuyên dụng (DICOM Parser) và dịch vụ PACS Backend. Trong phiên bản hiện tại, vui lòng sử dụng ảnh lát cắt PNG, JPG hoặc JPEG.',
      );
      if (requestId === validationRequestRef.current) setValidationState(false);
      return;
    }

    const hasAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
    const hasAllowedMimeType = !file.type || ALLOWED_MIME_TYPES.includes(file.type);
    if (!hasAllowedExtension || !hasAllowedMimeType) {
      onValidationError(
        'Định dạng file không hợp lệ. Tên file và kiểu nội dung phải là PNG, JPG hoặc JPEG.',
      );
      if (requestId === validationRequestRef.current) setValidationState(false);
      return;
    }

    if (file.size === 0) {
      onValidationError('File tải lên bị rỗng (0 byte). Vui lòng chọn một file ảnh hợp lệ.');
      if (requestId === validationRequestRef.current) setValidationState(false);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      onValidationError(
        `Dung lượng file (${formatBytes(file.size)}) vượt quá giới hạn cho phép là 15 MB.`,
      );
      if (requestId === validationRequestRef.current) setValidationState(false);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const dimensions = await getImageDimensions(objectUrl);
      if (requestId !== validationRequestRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error('Ảnh không có kích thước hợp lệ.');
      }
      if (
        dimensions.width > MAX_IMAGE_SIDE_PX ||
        dimensions.height > MAX_IMAGE_SIDE_PX ||
        dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
      ) {
        URL.revokeObjectURL(objectUrl);
        onValidationError(
          `Độ phân giải ${dimensions.width} × ${dimensions.height}px quá lớn. Giới hạn là 8.192px mỗi chiều và 25 megapixel.`,
        );
        return;
      }
      onSelectFile(file, objectUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      if (requestId !== validationRequestRef.current) return;
      onValidationError(
        'Không thể đọc nội dung ảnh. Vui lòng chọn một file PNG, JPG hoặc JPEG hợp lệ.',
      );
    } finally {
      if (requestId === validationRequestRef.current) setValidationState(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isValidatingFile) return;
    const file = e.target.files?.[0];
    if (file) {
      void validateAndProcessFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (disabled || isValidatingFile) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void validateAndProcessFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Privacy Warning Banner */}
      <div className="p-3.5 rounded-2xl border border-teal-500/25 bg-teal-50/70 dark:bg-teal-950/25 flex items-start gap-2.5 text-xs text-teal-950 dark:text-teal-200">
        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Khuyến cáo Bảo mật Dữ liệu Sức khỏe:</strong> Không tải lên ảnh MRI có chứa họ
          tên thật, số căn cước, mã hồ sơ bệnh án hoặc thông tin định danh cá nhân (PII/PHI) trên
          viền ảnh nếu chưa được ẩn danh. Trong chế độ Demo, ảnh chỉ xử lý cục bộ trong phiên trình
          duyệt và không gửi ra máy chủ bên ngoài.
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
          isDraggingOver
            ? 'border-teal-500 bg-teal-500/10'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-500/60'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          disabled={disabled || isValidatingFile}
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Chọn file ảnh MRI"
        />

        {!selectedFile ? (
          <div className="space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                Kéo và thả ảnh lát cắt MRI vào đây, hoặc{' '}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isValidatingFile}
                  className="text-teal-600 dark:text-teal-400 underline underline-offset-4 hover:text-teal-700 font-bold"
                >
                  chọn file từ thiết bị
                </button>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hỗ trợ: PNG, JPG, JPEG (Tối đa 15 MB). Định dạng DICOM (.dcm) yêu cầu DICOM Parser
                và PACS Backend riêng.
              </p>
            </div>

            {/* Quick Synthetic Sample Buttons for instant demo */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Hoặc nạp nhanh lát cắt MRI tổng hợp (Synthetic Demo) để kiểm thử ngay:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'] as TumorLabel[]).map(
                  (sampleLabel) => (
                    <button
                      key={sampleLabel}
                      type="button"
                      disabled={isValidatingFile}
                      onClick={() => {
                        invalidatePendingValidation();
                        onUseSyntheticSample(sampleLabel);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-teal-500/15 text-slate-700 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-teal-500/20 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      Ảnh mẫu: {sampleLabel}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="MRI thu nhỏ"
                    onError={() => onValidationError('Không thể hiển thị ảnh xem trước. Vui lòng chọn lại file ảnh.')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileImage className="w-6 h-6 text-teal-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {sanitizeMedicalFileName(selectedFile.name, anonymizationScope)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dung lượng: {formatBytes(selectedFile.size)} • Tên hiển thị đã tự động ẩn danh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isValidatingFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thay ảnh
              </button>
              <button
                type="button"
                disabled={isValidatingFile}
                onClick={() => {
                  invalidatePendingValidation();
                  onClearFile();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <X className="w-3.5 h-3.5" />
                Xóa ảnh
              </button>
            </div>
          </div>
        )}
      </div>

      {isValidatingFile && (
        <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300" role="status">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang kiểm tra nội dung và độ phân giải ảnh...</span>
        </div>
      )}

      {/* Validation error message */}
      {validationError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

export function createSyntheticDemoFile(label: TumorLabel): {
  file: File;
  previewUrl: string;
} {
  const svgDataUrl = SYNTHETIC_MRI_SLICES[label];
  const svgContent = decodeURIComponent(svgDataUrl.replace('data:image/svg+xml;utf8,', ''));
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const safeLabel = label.toLowerCase().replace(/\s+/g, '_');
  const file = new File([blob], `synthetic_demo_${safeLabel}.svg`, {
    type: 'image/svg+xml',
  });
  return { file, previewUrl: svgDataUrl };
}

export function getImageDimensions(
  sourceUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Không thể đọc ảnh.'));
    image.src = sourceUrl;
  });
}

