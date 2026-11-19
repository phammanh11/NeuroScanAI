/**
 * ============================================================================
 * NEUROSCAN AI — CLIENT-SIDE DICOM (.dcm) PART 10 PARSER (ZERO DEPENDENCIES)
 * ============================================================================
 * Đọc trực tiếp tệp ảnh y khoa DICOM (Explicit / Implicit VR Little Endian,
 * 8-bit hoặc 16-bit grayscale) ngay trên trình duyệt, áp dụng Windowing
 * (WindowCenter / WindowWidth + RescaleSlope / RescaleIntercept) và chuyển
 * sang tệp PNG chuẩn để đưa vào pipeline suy luận ONNX hiện tại.
 * ============================================================================
 */

export interface DicomMetadata {
  rows: number;
  cols: number;
  bitsAllocated: number;
  modality: string;
  seriesDescription: string;
  windowCenter?: number;
  windowWidth?: number;
}

export interface ParsedDicomResult {
  pngFile: File;
  previewUrl: string;
  width: number;
  height: number;
  metadata: DicomMetadata;
}

const EXPLICIT_LONG_VRS = new Set(['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT']);

function readAscii(view: DataView, offset: number, length: number): string {
  let out = '';
  const end = Math.min(view.byteLength, offset + length);
  for (let i = offset; i < end; i++) {
    const ch = view.getUint8(i);
    if (ch === 0) break;
    out += String.fromCharCode(ch);
  }
  return out.trim();
}

function parseFirstFloat(raw: string): number | undefined {
  const first = raw.split('\\')[0]?.trim();
  if (!first) return undefined;
  const val = Number(first);
  return Number.isFinite(val) ? val : undefined;
}

function isLikelyVr(c1: number, c2: number): boolean {
  return c1 >= 65 && c1 <= 90 && c2 >= 65 && c2 <= 90;
}

export async function parseDicomFileToPng(file: File): Promise<ParsedDicomResult> {
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 132) {
    throw new Error('Tệp DICOM quá nhỏ hoặc bị hỏng (nhỏ hơn 132 byte).');
  }

  const view = new DataView(buffer);
  const magic = readAscii(view, 128, 4);
  let offset = magic === 'DICM' ? 132 : 0;

  let rows = 0;
  let cols = 0;
  let bitsAllocated = 16;
  let pixelRepresentation = 0; // 0 = unsigned, 1 = signed
  let samplesPerPixel = 1;
  let photometric = 'MONOCHROME2';
  let windowCenter: number | undefined;
  let windowWidth: number | undefined;
  let rescaleIntercept = 0;
  let rescaleSlope = 1;
  let modality = 'MR';
  let seriesDescription = '';
  let transferSyntax = '';
  let pixelDataOffset = -1;
  let pixelDataLength = 0;

  // Quét các phần tử thẻ DICOM cho tới khi gặp Pixel Data (7FE0,0010)
  while (offset + 8 <= view.byteLength) {
    const group = view.getUint16(offset, true);
    const element = view.getUint16(offset + 2, true);
    offset += 4;

    // Bỏ qua Sequence delimiter nếu gặp
    if (group === 0xfffe) {
      if (offset + 4 > view.byteLength) break;
      const itemLen = view.getUint32(offset, true);
      offset += 4;
      if (itemLen !== 0xffffffff && element === 0xe000) {
        offset += itemLen;
      }
      continue;
    }

    const b0 = view.getUint8(offset);
    const b1 = view.getUint8(offset + 1);
    const hasExplicitVr =
      group === 0x0002 ||
      (transferSyntax !== '1.2.840.10008.1.2' && isLikelyVr(b0, b1));

    let vr = '';
    let valueLength = 0;

    if (hasExplicitVr) {
      vr = String.fromCharCode(b0, b1);
      offset += 2;
      if (EXPLICIT_LONG_VRS.has(vr)) {
        offset += 2; // 2 reserved bytes
        if (offset + 4 > view.byteLength) break;
        valueLength = view.getUint32(offset, true);
        offset += 4;
      } else {
        if (offset + 2 > view.byteLength) break;
        valueLength = view.getUint16(offset, true);
        offset += 2;
      }
    } else {
      if (offset + 4 > view.byteLength) break;
      valueLength = view.getUint32(offset, true);
      offset += 4;
    }

    // Nếu là Pixel Data (7FE0,0010)
    if (group === 0x7fe0 && element === 0x0010) {
      if (valueLength === 0xffffffff) {
        throw new Error(
          'Tệp DICOM sử dụng dữ liệu ảnh nén (JPEG/JPEG2000 Encapsulated). Trình duyệt hiện hỗ trợ trực tiếp DICOM không nén (Explicit/Implicit Little Endian) hoặc ảnh PNG/JPG.',
        );
      }
      pixelDataOffset = offset;
      pixelDataLength = valueLength;
      break;
    }

    // Bỏ qua sequence không xác định độ dài
    if (valueLength === 0xffffffff) {
      continue;
    }

    const valueEnd = offset + valueLength;
    if (valueEnd > view.byteLength) break;

    if (group === 0x0002 && element === 0x0010) {
      transferSyntax = readAscii(view, offset, valueLength);
    } else if (group === 0x0008 && element === 0x0060) {
      modality = readAscii(view, offset, valueLength) || 'MR';
    } else if (group === 0x0008 && element === 0x103e) {
      seriesDescription = readAscii(view, offset, valueLength);
    } else if (group === 0x0028 && element === 0x0002 && valueLength >= 2) {
      samplesPerPixel = view.getUint16(offset, true);
    } else if (group === 0x0028 && element === 0x0004) {
      photometric = readAscii(view, offset, valueLength).toUpperCase();
    } else if (group === 0x0028 && element === 0x0010 && valueLength >= 2) {
      rows = view.getUint16(offset, true);
    } else if (group === 0x0028 && element === 0x0011 && valueLength >= 2) {
      cols = view.getUint16(offset, true);
    } else if (group === 0x0028 && element === 0x0100 && valueLength >= 2) {
      bitsAllocated = view.getUint16(offset, true);
    } else if (group === 0x0028 && element === 0x0103 && valueLength >= 2) {
      pixelRepresentation = view.getUint16(offset, true);
    } else if (group === 0x0028 && element === 0x1050) {
      windowCenter = parseFirstFloat(readAscii(view, offset, valueLength));
    } else if (group === 0x0028 && element === 0x1051) {
      windowWidth = parseFirstFloat(readAscii(view, offset, valueLength));
    } else if (group === 0x0028 && element === 0x1052) {
      rescaleIntercept = parseFirstFloat(readAscii(view, offset, valueLength)) ?? 0;
    } else if (group === 0x0028 && element === 0x1053) {
      rescaleSlope = parseFirstFloat(readAscii(view, offset, valueLength)) ?? 1;
    }

    offset = valueEnd;
  }

  if (pixelDataOffset < 0 || rows <= 0 || cols <= 0) {
    throw new Error(
      'Không thể đọc ma trận điểm ảnh từ tệp DICOM này. Vui lòng kiểm tra tệp DICOM không nén hợp lệ hoặc xuất sang PNG/JPG.',
    );
  }

  const numPixels = rows * cols;
  const bytesPerSample = bitsAllocated === 8 ? 1 : 2;
  const expectedBytes = numPixels * samplesPerPixel * bytesPerSample;
  if (pixelDataOffset + expectedBytes > view.byteLength || pixelDataLength < expectedBytes) {
    throw new Error('Dữ liệu điểm ảnh trong tệp DICOM không đầy đủ hoặc bị nén.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ dựng Canvas cho ảnh DICOM.');
  }

  const imgData = ctx.createImageData(cols, rows);
  const rgba = imgData.data;

  if (samplesPerPixel === 3 && bitsAllocated === 8) {
    for (let i = 0; i < numPixels; i++) {
      const src = pixelDataOffset + i * 3;
      const dst = i * 4;
      rgba[dst] = view.getUint8(src);
      rgba[dst + 1] = view.getUint8(src + 1);
      rgba[dst + 2] = view.getUint8(src + 2);
      rgba[dst + 3] = 255;
    }
  } else {
    // Đọc giá trị mức xám & áp dụng rescale slope/intercept
    const grayValues = new Float32Array(numPixels);
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < numPixels; i++) {
      const raw =
        bitsAllocated === 8
          ? view.getUint8(pixelDataOffset + i)
          : pixelRepresentation === 1
            ? view.getInt16(pixelDataOffset + i * 2, true)
            : view.getUint16(pixelDataOffset + i * 2, true);
      const val = raw * rescaleSlope + rescaleIntercept;
      grayValues[i] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    const low =
      windowCenter !== undefined && windowWidth !== undefined && windowWidth > 1
        ? windowCenter - windowWidth / 2
        : minVal;
    const high =
      windowCenter !== undefined && windowWidth !== undefined && windowWidth > 1
        ? windowCenter + windowWidth / 2
        : maxVal;
    const span = Math.max(1e-5, high - low);
    const invert = photometric === 'MONOCHROME1';

    for (let i = 0; i < numPixels; i++) {
      let norm = (grayValues[i] - low) / span;
      if (norm < 0) norm = 0;
      if (norm > 1) norm = 1;
      if (invert) norm = 1 - norm;
      const byteVal = Math.round(norm * 255);
      const dst = i * 4;
      rgba[dst] = byteVal;
      rgba[dst + 1] = byteVal;
      rgba[dst + 2] = byteVal;
      rgba[dst + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không thể chuyển lát cắt DICOM sang PNG.'));
    }, 'image/png');
  });

  const baseName = file.name.replace(/\.(dcm|dicom)$/i, '');
  const pngFile = new File([pngBlob], `${baseName}.png`, { type: 'image/png' });
  const previewUrl = URL.createObjectURL(pngFile);

  return {
    pngFile,
    previewUrl,
    width: cols,
    height: rows,
    metadata: {
      rows,
      cols,
      bitsAllocated,
      modality,
      seriesDescription,
      windowCenter,
      windowWidth,
    },
  };
}
