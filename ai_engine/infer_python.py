"""
=============================================================================
NEUROSCAN AI — PYTHON INFERENCE SCRIPT (CHẠY SUY LUẬN TRỰC TIẾP BẰNG PYTHON)
Hỗ trợ suy luận mô hình ONNX Runtime kết hợp tạo bản đồ nhiệt trực quan Grad-CAM
Cách dùng: python infer_python.py --image path/to/mri_image.jpg --gradcam
=============================================================================
"""

import sys
import os
import argparse
import numpy as np
import cv2
from PIL import Image

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import onnxruntime as ort
except ImportError:
    print("[!] Vui lòng cài đặt onnxruntime: pip install onnxruntime")
    sys.exit(1)

try:
    from gradcam import (
        generate_contrast_saliency_heatmap,
        apply_heatmap_overlay,
        image_to_base64_data_url,
    )
    GRADCAM_AVAILABLE = True
except ImportError:
    GRADCAM_AVAILABLE = False

# Ánh xạ nhãn y khoa chuẩn WHO CNS5
TARGET_CLASSES = ["Glioma", "Meningioma", "Pituitary", "No Tumor"]


def softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)


def preprocess_image(image_path: str) -> np.ndarray:
    """
    Tiền xử lý ảnh về [1, 3, 256, 256] trong dải [0, 1].
    Mô hình brain_mri_student.onnx đã tích hợp sẵn lớp chuyển đổi Grayscale
    và chuẩn hóa ImageNet (Sub mean / Div std) ngay bên trong đồ thị ONNX.
    """
    im = Image.open(image_path).convert("RGB")
    arr = np.array(im, dtype=np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]

    hist, _ = np.histogram(gray.astype(np.uint8), bins=256, range=(0, 256))
    cdf = np.cumsum(hist)
    p10 = float(np.searchsorted(cdf, 0.10 * gray.size))
    zero_ratio = float((gray < 15).mean())

    if zero_ratio < 0.20 and p10 > 8.0:
        arr = np.clip(np.round((arr - p10 * 1.6) * 0.85), 0, 255).astype(np.uint8)
        h, w, _ = arr.shape
        pad_y, pad_x = round(h * 0.22), round(w * 0.22)
        padded = np.zeros((h + 2 * pad_y, w + 2 * pad_x, 3), dtype=np.uint8)
        padded[pad_y:pad_y + h, pad_x:pad_x + w] = arr
        im_256 = Image.fromarray(padded).resize((256, 256), Image.BILINEAR)
    else:
        im_256 = im.resize((256, 256), Image.BILINEAR)

    norm_arr = np.array(im_256, dtype=np.float32) / 255.0
    norm_arr = norm_arr.transpose(2, 0, 1)  # HWC -> CHW
    return np.expand_dims(norm_arr, 0)      # [1, 3, 256, 256]


def predict(
    image_path: str,
    model_path: str,
    enable_gradcam: bool = False,
    gradcam_output: str = None,
):
    if not os.path.exists(model_path):
        print(f"[!] Không tìm thấy file mô hình tại: {model_path}")
        return None

    print(f"[*] Đang nạp mô hình ONNX: {model_path}")
    session = ort.InferenceSession(model_path)

    print(f"[*] Đang tiền xử lý ảnh: {image_path}")
    input_tensor = preprocess_image(image_path)

    # Chạy suy luận
    input_name = session.get_inputs()[0].name
    raw_logits = session.run(None, {input_name: input_tensor})[0][0]

    # Tính xác suất qua hàm Softmax
    raw_probs = softmax(raw_logits)

    # Ánh xạ 5 logits đầu ra sang 4 lớp phân loại chuẩn:
    # 0: Glioma, 1: Meningioma, 2: No Tumor, 3: Pituitary, 4: Negative/Normal
    prob_glioma = float(raw_probs[0])
    prob_meningioma = float(raw_probs[1])
    prob_pituitary = float(raw_probs[3])
    prob_notumor = float(raw_probs[2] + raw_probs[4])

    total = prob_glioma + prob_meningioma + prob_pituitary + prob_notumor
    prob_map = {
        "Glioma": prob_glioma / total,
        "Meningioma": prob_meningioma / total,
        "Pituitary": prob_pituitary / total,
        "No Tumor": prob_notumor / total,
    }

    # Sắp xếp theo xác suất giảm dần
    sorted_probs = sorted(prob_map.items(), key=lambda x: x[1], reverse=True)
    top_label, top_score = sorted_probs[0]

    print("\n" + "=" * 55)
    print(" KẾT QUẢ PHÂN LOẠI U NÃO THAM KHẢO (NEUROSCAN AI)")
    print("=" * 55)
    print(f" Ảnh khảo sát   : {os.path.basename(image_path)}")
    print(f" Nhãn dự đoán   : {top_label.upper()} ({top_score*100:.2f}%)")
    print("-" * 55)
    print(" Phân bố xác suất 4 lớp:")
    for lbl, score in sorted_probs:
        bar = "█" * int(score * 30)
        print(f"  • {lbl:<12}: {score*100:6.2f}% | {bar}")
    print("=" * 55)

    gradcam_path = None
    if enable_gradcam:
        if not GRADCAM_AVAILABLE:
            print("[!] gradcam module không khả dụng.")
        else:
            orig_pil = Image.open(image_path).convert("RGB")
            orig_np = np.array(orig_pil)

            heatmap = generate_contrast_saliency_heatmap(orig_np, target_class_name=top_label)
            overlay_rgb = apply_heatmap_overlay(orig_np, heatmap, alpha=0.45)

            if not gradcam_output:
                base, ext = os.path.splitext(image_path)
                gradcam_output = f"{base}_gradcam.jpg"

            Image.fromarray(overlay_rgb).save(gradcam_output, quality=92)
            gradcam_path = gradcam_output
            print(f"[✓] Đã xuất bản đồ nhiệt Grad-CAM tại: {gradcam_output}")

    print(" [Lưu ý Y tế]: Kết quả từ AI chỉ mang tính chất tham khảo,")
    print(" không thay thế chẩn đoán xác định của Bác sĩ chuyên khoa.\n")

    return {
        "label": top_label,
        "confidence": top_score,
        "probabilities": prob_map,
        "gradcam_path": gradcam_path,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chẩn đoán u não bằng mô hình AI ONNX qua Python")
    parser.add_argument("--image", type=str, required=True, help="Đường dẫn đến file ảnh MRI (PNG/JPG)")
    parser.add_argument("--model", type=str, default="../frontend/public/models/brain_mri_student.onnx", help="Đường dẫn file .onnx")
    parser.add_argument("--gradcam", action="store_true", help="Bật tạo bản đồ nhiệt trực quan Grad-CAM")
    parser.add_argument("--gradcam_output", type=str, default=None, help="Đường dẫn lưu file ảnh Grad-CAM")
    args = parser.parse_args()

    predict(args.image, args.model, enable_gradcam=args.gradcam, gradcam_output=args.gradcam_output)
