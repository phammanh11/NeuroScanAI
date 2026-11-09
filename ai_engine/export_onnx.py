"""
=============================================================================
NEUROSCAN AI — XUẤT MÔ HÌNH TỪ PYTORCH SANG ONNX CHO TRÌNH DUYỆT WEB
Chuyển đổi trọng số best_brain_mri_model.pth sang file brain_mri_student.onnx
Input tensor:  image  [batch_size, 3, 256, 256] (float32)
Output tensor: logits [batch_size, 5] (float32)
=============================================================================
"""

import os
import argparse
import torch
from model import get_student_model

def export_to_onnx(checkpoint_path: str, output_onnx_path: str):
    device = torch.device("cpu")
    print(f"[*] Đang nạp checkpoint mô hình: {checkpoint_path}")
    
    model = get_student_model(num_classes=5)
    if os.path.exists(checkpoint_path):
        state_dict = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(state_dict)
        print("[✓] Đã nạp thành công weights từ checkpoint.")
    else:
        print(f"[!] Không tìm thấy file {checkpoint_path}, sử dụng mô hình khởi tạo mặc định.")

    model.eval()
    model.to(device)

    # Tạo dummy input giả lập ảnh MRI 256x256
    dummy_input = torch.randn(1, 3, 256, 256, dtype=torch.float32, device=device)

    print(f"[*] Đang thực hiện export sang định dạng ONNX tại: {output_onnx_path}")
    torch.onnx.export(
        model,
        dummy_input,
        output_onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={
            "image": {0: "batch_size"},
            "logits": {0: "batch_size"}
        }
    )
    print(f"[✓] Xuất mô hình ONNX thành công: {output_onnx_path}")
    print("[*] Bạn có thể sao chép file này vào thư mục: frontend/public/models/brain_mri_student.onnx")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export PyTorch model sang ONNX Runtime Web")
    parser.add_argument("--checkpoint", type=str, default="best_brain_mri_model.pth", help="Đường dẫn file .pth")
    parser.add_argument("--output", type=str, default="brain_mri_student.onnx", help="Đường dẫn file .onnx")
    args = parser.parse_args()

    export_to_onnx(args.checkpoint, args.output)
