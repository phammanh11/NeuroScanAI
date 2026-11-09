"""
=============================================================================
NEUROSCAN AI — PYTHON INFERENCE SCRIPT (CHẠY SUY LUẬN TRỰC TIẾP BẰNG PYTHON)
Cho phép kiểm thử suy luận mô hình trên dòng lệnh hoặc tích hợp dịch vụ độc lập
Cách dùng: python infer_python.py --image path/to/mri_image.jpg
=============================================================================
"""

import sys
import os
import argparse
import numpy as np
from PIL import Image

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import onnxruntime as ort
except ImportError:
    print("[!] Vui lòng cài đặt onnxruntime: pip install onnxruntime")
    sys.exit(1)

# Ánh xạ nhãn y khoa chuẩn WHO CNS5
TARGET_CLASSES = ["Glioma", "Meningioma", "Pituitary", "No Tumor"]

def softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)

def preprocess_image(image_path: str) -> np.ndarray:
    """Chuẩn hóa ảnh theo chuẩn ImageNet [1, 3, 256, 256]."""
    im = Image.open(image_path).convert("RGB")
    im = im.resize((256, 256))
    arr = np.array(im, dtype=np.float32) / 255.0
    
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    
    arr = (arr - mean) / std
    arr = arr.transpose(2, 0, 1)  # HWC -> CHW
    return np.expand_dims(arr, 0) # [1, 3, 256, 256]

def predict(image_path: str, model_path: str):
    if not os.path.exists(model_path):
        print(f"[!] Không tìm thấy file mô hình tại: {model_path}")
        return

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

    print("\n" + "="*55)
    print(" KẾT QUẢ PHÂN LOẠI U NÃO THAM KHẢO (NEUROSCAN AI)")
    print("="*55)
    print(f" Ảnh khảo sát   : {os.path.basename(image_path)}")
    print(f" Nhãn dự đoán   : {top_label.upper()} ({top_score*100:.2f}%)")
    print("-" * 55)
    print(" Phân bố xác suất 4 lớp:")
    for lbl, score in sorted_probs:
        bar = "█" * int(score * 30)
        print(f"  • {lbl:<12}: {score*100:6.2f}% | {bar}")
    print("="*55)
    print(" [Lưu ý Y tế]: Kết quả từ AI chỉ mang tính chất tham khảo,")
    print(" không thay thế chẩn đoán xác định của Bác sĩ chuyên khoa.\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chẩn đoán u não bằng mô hình AI ONNX qua Python")
    parser.add_argument("--image", type=str, required=True, help="Đường dẫn đến file ảnh MRI (PNG/JPG)")
    parser.add_argument("--model", type=str, default="../frontend/public/models/brain_mri_student.onnx", help="Đường dẫn file .onnx")
    args = parser.parse_args()

    predict(args.image, args.model)
