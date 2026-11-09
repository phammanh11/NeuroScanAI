"""
=============================================================================
NEUROSCAN AI — HOÀN CHỈNH SCRIPT HUẤN LUYỆN MÔ HÌNH HỌC SINH (STUDENT TRAINING)
Tập dữ liệu: Brain Tumor MRI Dataset (7.200 ảnh: Training 5.600 + Testing 1.600, 4 lớp)
Chiến lược: Data Augmentation, AdamW, Cosine Annealing, Label Smoothing, Checkpoint Saving, ONNX Export
=============================================================================
"""

import os
import sys
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
import time
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

from model import get_student_model

# 4 lớp chuẩn hoá theo dữ liệu thực tế
CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]
CLASS_TO_IDX = {
    "glioma": 0,
    "meningioma": 1,
    "notumor": 2,
    "pituitary": 3,
}
# Ánh xạ nhãn 4 lớp sang 5 logits của student model
# Logits: 0: Glioma, 1: Meningioma, 2: No Tumor, 3: Pituitary, 4: Normal/No Tumor
TARGET_TO_5_LOGITS = {
    0: 0,  # Glioma
    1: 1,  # Meningioma
    2: 2,  # No Tumor -> logit 2
    3: 3,  # Pituitary
}


class BrainMriDataset(Dataset):
    """
    Dataset tải ảnh MRI não từ thư mục phân loại.
    Hỗ trợ đọc ảnh PNG, JPG, JPEG và áp dụng transform tiền xử lý.
    """

    def __init__(self, file_paths: List[str], labels: List[int], transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform

    def __len__(self) -> int:
        return len(self.file_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        path = self.file_paths[idx]
        label = self.labels[idx]

        try:
            im = Image.open(path).convert("RGB")
        except Exception:
            im = Image.new("RGB", (256, 256), color=(0, 0, 0))

        if self.transform is not None:
            tensor = self.transform(im)
        else:
            tensor = transforms.ToTensor()(im)

        target_logit_idx = TARGET_TO_5_LOGITS.get(label, 2)
        return tensor, torch.tensor(target_logit_idx, dtype=torch.long)


def scan_dataset_directory(data_dir: str) -> Tuple[List[str], List[int]]:
    """Quét đệ quy thư mục và gom danh sách tệp ảnh cùng nhãn."""
    file_paths = []
    labels = []
    valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}

    if not os.path.exists(data_dir):
        return file_paths, labels

    for item in os.listdir(data_dir):
        item_path = os.path.join(data_dir, item)
        if not os.path.isdir(item_path):
            continue

        normalized_folder = item.lower().replace(" ", "").replace("_", "")
        matched_class = None
        for cname in CLASS_NAMES:
            if cname in normalized_folder:
                matched_class = cname
                break

        if matched_class is None:
            continue

        class_idx = CLASS_TO_IDX[matched_class]

        for root, _, files in os.walk(item_path):
            for fname in files:
                ext = os.path.splitext(fname)[1].lower()
                if ext in valid_exts:
                    full_p = os.path.join(root, fname)
                    file_paths.append(full_p)
                    labels.append(class_idx)

    return file_paths, labels


def compute_metrics(confusion_mat: np.ndarray) -> Dict[str, float]:
    """Tính toán Accuracy, Precision, Recall và Macro F1 từ ma trận nhầm lẫn 4x4."""
    total = np.sum(confusion_mat)
    if total == 0:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "macro_f1": 0.0}

    accuracy = float(np.trace(confusion_mat) / total)

    precisions = []
    recalls = []
    f1s = []

    for i in range(4):
        tp = float(confusion_mat[i, i])
        fp = float(np.sum(confusion_mat[:, i]) - tp)
        fn = float(np.sum(confusion_mat[i, :]) - tp)

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        precisions.append(prec)
        recalls.append(rec)
        f1s.append(f1)

    macro_precision = float(np.mean(precisions))
    macro_recall = float(np.mean(recalls))
    macro_f1 = float(np.mean(f1s))

    return {
        "accuracy": accuracy,
        "precision": macro_precision,
        "recall": macro_recall,
        "macro_f1": macro_f1,
    }


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
    dry_run: bool = False,
) -> Tuple[float, float]:
    """Chạy 1 epoch huấn luyện, trả về (train_loss, train_accuracy)."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (images, targets) in enumerate(dataloader):
        if dry_run and batch_idx >= 2:
            break

        images = images.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()

        nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        preds = torch.argmax(outputs, dim=1)
        correct += torch.sum(preds == targets).item()
        total += images.size(0)

        if (batch_idx + 1) % 25 == 0 or (batch_idx + 1) == len(dataloader):
            current_acc = (correct / total) * 100.0 if total > 0 else 0.0
            print(
                f"   [Batch {batch_idx + 1:3d}/{len(dataloader)}] "
                f"Loss: {loss.item():.4f} | Acc hiện tại: {current_acc:.2f}%"
            )

    epoch_loss = total_loss / total if total > 0 else 0.0
    epoch_acc = correct / total if total > 0 else 0.0
    return epoch_loss, epoch_acc


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    dry_run: bool = False,
) -> Tuple[float, Dict[str, float], np.ndarray]:
    """Đánh giá mô hình trên tập validation/testing."""
    model.eval()
    total_loss = 0.0
    total = 0
    confusion_mat = np.zeros((4, 4), dtype=np.int32)

    with torch.no_grad():
        for batch_idx, (images, targets) in enumerate(dataloader):
            if dry_run and batch_idx >= 2:
                break

            images = images.to(device)
            targets = targets.to(device)

            outputs = model(images)
            loss = criterion(outputs, targets)

            total_loss += loss.item() * images.size(0)
            total += images.size(0)

            # Chuyển đổi 5 logits về 4 lớp
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            for b in range(probs.shape[0]):
                p_glioma = probs[b, 0]
                p_meningioma = probs[b, 1]
                p_pituitary = probs[b, 3]
                p_notumor = probs[b, 2] + probs[b, 4]

                scores = [p_glioma, p_meningioma, p_notumor, p_pituitary]
                pred_cls = int(np.argmax(scores))

                # True class trong 4 nhãn
                true_target = targets[b].item()
                if true_target == 0:
                    true_cls = 0
                elif true_target == 1:
                    true_cls = 1
                elif true_target == 3:
                    true_cls = 3
                else:
                    true_cls = 2

                confusion_mat[true_cls, pred_cls] += 1

    val_loss = total_loss / total if total > 0 else 0.0
    metrics = compute_metrics(confusion_mat)
    return val_loss, metrics, confusion_mat


def export_model_to_onnx(model: nn.Module, output_onnx_path: str, device: torch.device):
    """Xuất mô hình PyTorch sang file ONNX chuẩn hóa."""
    model.eval()
    dummy_input = torch.randn(1, 3, 256, 256, device=device)
    print(f"[*] Đang xuất mô hình ONNX ra file: {output_onnx_path}")

    try:
        torch.onnx.export(
            model,
            dummy_input,
            output_onnx_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["image"],
            output_names=["logits"],
            dynamic_axes={"image": {0: "batch_size"}, "logits": {0: "batch_size"}},
            dynamo=False,
        )
    except (TypeError, Exception):
        torch.onnx.export(
            model,
            dummy_input,
            output_onnx_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["image"],
            output_names=["logits"],
            dynamic_axes={"image": {0: "batch_size"}, "logits": {0: "batch_size"}},
        )
    print(f"[✓] Đã xuất ONNX thành công! Kích thước file: {os.path.getsize(output_onnx_path) / (1024*1024):.2f} MB")


def main():
    parser = argparse.ArgumentParser(description="NeuroScan AI — Huấn luyện mô hình Student MRI Brain Tumor")
    parser.add_argument("--data_dir", type=str, default=r"C:\Users\Admin\Downloads\archive", help="Thư mục gốc chứa dữ liệu")
    parser.add_argument("--epochs", type=int, default=15, help="Số epochs huấn luyện")
    parser.add_argument("--batch_size", type=int, default=32, help="Kích thước batch")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate ban đầu")
    parser.add_argument("--output", type=str, default="best_brain_mri_model.pth", help="Tên file lưu checkpoint")
    parser.add_argument("--export_onnx", type=str, default="brain_mri_student.onnx", help="Đường dẫn file ONNX xuất ra")
    parser.add_argument("--dry_run", action="store_true", help="Chạy thử nghiệm nhanh (smoke test 2 batches/epoch)")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("\n" + "=" * 65)
    print(" NEUROSCAN AI — QUY TRÌNH HUẤN LUYỆN MÔ HÌNH HỌC SINH TỰ ĐỘNG")
    print("=" * 65)
    print(f" • Thiết bị tính toán  : {device}")
    print(f" • Thư mục dữ liệu     : {args.data_dir}")
    print(f" • Số Epochs           : {args.epochs}")
    print(f" • Batch Size          : {args.batch_size}")
    print(f" • Learning Rate (LR)  : {args.lr}")
    print("=" * 65)

    # 1. Quét dữ liệu
    train_dir = os.path.join(args.data_dir, "Training")
    test_dir = os.path.join(args.data_dir, "Testing")

    if not os.path.exists(train_dir):
        train_dir = args.data_dir

    print(f"[*] Đang nạp tập huấn luyện từ: {train_dir}")
    train_paths, train_labels = scan_dataset_directory(train_dir)
    print(f"    Tổng số ảnh huấn luyện: {len(train_paths)}")

    if os.path.exists(test_dir):
        print(f"[*] Đang nạp tập kiểm định từ: {test_dir}")
        val_paths, val_labels = scan_dataset_directory(test_dir)
    else:
        # Nếu không có thư mục Testing riêng biệt, cắt 20% từ train
        print("[*] Không thấy thư mục Testing riêng biệt. Tự động chia 80% train / 20% validation...")
        split_idx = int(0.8 * len(train_paths))
        indices = np.random.permutation(len(train_paths))
        val_paths = [train_paths[i] for i in indices[split_idx:]]
        val_labels = [train_labels[i] for i in indices[split_idx:]]
        train_paths = [train_paths[i] for i in indices[:split_idx]]
        train_labels = [train_labels[i] for i in indices[:split_idx]]

    print(f"    Tổng số ảnh kiểm định: {len(val_paths)}")

    if len(train_paths) == 0:
        print(f"[!] Không tìm thấy ảnh nào trong thư mục {args.data_dir}. Vui lòng kiểm tra lại đường dẫn.")
        sys.exit(1)

    # 2. Định nghĩa Transforms (Đồng bộ với ImageNet)
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_dataset = BrainMriDataset(train_paths, train_labels, transform=train_transform)
    val_dataset = BrainMriDataset(val_paths, val_labels, transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)

    # 3. Khởi tạo mô hình
    print("\n[*] Đang khởi tạo mô hình học sinh MobileNetV2 (1280 -> 5 Logits)...")
    model = get_student_model(num_classes=5).to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_val_f1 = -1.0
    history = []

    print("\n" + "-" * 65)
    print(" BẮT ĐẦU VÒNG LẶP HUẤN LUYỆN (TRAINING LOOP)")
    print("-" * 65)

    start_time = time.time()

    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()
        current_lr = optimizer.param_groups[0]["lr"]
        print(f"\n[Epoch {epoch:2d}/{args.epochs}] (LR: {current_lr:.6f})")

        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device, dry_run=args.dry_run
        )
        val_loss, val_metrics, val_cm = validate(
            model, val_loader, criterion, device, dry_run=args.dry_run
        )
        scheduler.step()

        epoch_time = time.time() - epoch_start
        val_f1 = val_metrics["macro_f1"]
        val_acc = val_metrics["accuracy"]

        print(
            f" => Kết quả Epoch {epoch:2d} ({epoch_time:.1f}s): "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc*100:.2f}% | "
            f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc*100:.2f}% | "
            f"Val F1: {val_f1*100:.2f}%"
        )

        history.append({
            "epoch": epoch,
            "lr": current_lr,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 4),
            "val_f1": round(val_f1, 4),
        })

        # Lưu checkpoint tốt nhất
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_metrics": val_metrics,
                "confusion_matrix": val_cm.tolist(),
                "class_names": CLASS_NAMES,
            }, args.output)
            print(f" [★] Đã lưu mô hình tốt nhất với Val Macro F1: {val_f1*100:.2f}% tại: {args.output}")

    total_duration = time.time() - start_time
    print("\n" + "=" * 65)
    print(f" HUẤN LUYỆN HOÀN TẤT TRONG {total_duration/60:.2f} PHÚT!")
    print(f" Điểm Macro F1 tốt nhất đạt: {best_val_f1*100:.2f}%")
    print("=" * 65)

    # Lưu lịch sử huấn luyện
    history_file = os.path.splitext(args.output)[0] + "_history.json"
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
    print(f"[✓] Đã lưu lịch sử huấn luyện vào: {history_file}")

    # Xuất mô hình ONNX nếu được yêu cầu
    if args.export_onnx:
        if os.path.exists(args.output):
            print(f"[*] Nạp checkpoint tốt nhất để xuất ONNX: {args.output}")
            checkpoint = torch.load(args.output, map_location=device)
            model.load_state_dict(checkpoint["model_state_dict"])
        export_model_to_onnx(model, args.export_onnx, device)


if __name__ == "__main__":
    main()
