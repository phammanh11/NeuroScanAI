"""
NeuroScan AI — 1-Click GPU Retraining Script (Google Colab / Kaggle T4 / P100)
Mục tiêu: Kéo Recall lớp Glioma từ 86.75% lên >95% bằng Weighted Focal Loss + CLAHE
và xuất trực tiếp file brain_mri_student.onnx dual-output (['logits', 'cam_maps']).

Cách chạy trên Google Colab (chọn Runtime -> Change runtime type -> T4 GPU):
  !git clone https://github.com/<your-repo>/neuroscan.git
  %cd neuroscan/ai_engine
  !pip install -q torch torchvision timm onnx onnxruntime scikit-learn opencv-python
  !python colab_retrain_glioma.py --data_dir /content/brain_tumor_mri_dataset
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run_step(cmd: list[str]) -> None:
    print(f"\n>>> Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, check=False)
    if res.returncode != 0:
        sys.exit(res.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(description="1-Click GPU Retraining pipeline for NeuroScan AI (Glioma Boost)")
    parser.add_argument("--data_dir", type=str, required=True, help="Thư mục chứa Training/ và Testing/ MRI")
    parser.add_argument("--epochs", type=int, default=20, help="Số epoch huấn luyện (khuyến nghị 20 trên T4 GPU)")
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--glioma_weight", type=float, default=1.5)
    parser.add_argument("--focal_gamma", type=float, default=1.0)
    parser.add_argument(
        "--output_onnx",
        type=str,
        default="../frontend/public/models/brain_mri_student.onnx",
        help="Đường dẫn xuất file ONNX dual-output",
    )
    args = parser.parse_args()

    here = Path(__file__).resolve().parent
    ckpt_dir = here / "checkpoints_glioma_boost"
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    best_ckpt = ckpt_dir / "best_student.pt"

    # 1. Huấn luyện Student với Glioma-weighted Focal Loss + CLAHE
    run_step(
        [
            sys.executable,
            str(here / "train.py"),
            "--data_dir",
            args.data_dir,
            "--epochs",
            str(args.epochs),
            "--batch_size",
            str(args.batch_size),
            "--glioma_weight",
            str(args.glioma_weight),
            "--focal_gamma",
            str(args.focal_gamma),
            "--use_clahe",
            "--output_dir",
            str(ckpt_dir),
        ]
    )

    # 2. Xuất file ONNX dual-output ['logits', 'cam_maps']
    run_step(
        [
            sys.executable,
            str(here / "export_onnx.py"),
            "--checkpoint",
            str(best_ckpt),
            "--output",
            args.output_onnx,
            "--include_cam",
        ]
    )

    # 3. Đánh giá lại Confusion Matrix & Recall lớp Glioma
    run_step(
        [
            sys.executable,
            str(here / "evaluate.py"),
            "--data_dir",
            args.data_dir,
            "--onnx_path",
            args.output_onnx,
        ]
    )

    print(f"\n✅ Hoàn tất! Copy file {args.output_onnx} về frontend/public/models/brain_mri_student.onnx và deploy.")


if __name__ == "__main__":
    main()
