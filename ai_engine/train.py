"""
=============================================================================
NEUROSCAN AI — SCRIPT HUẤN LUYỆN MÔ HÌNH HỌC SINH (STUDENT MODEL TRAINING)
Tập dữ liệu: Brain Tumor MRI Dataset (bản 7.200 ảnh: Training 5.600 + Testing 1.600, 4 lớp cân bằng)
Chiến lược: Otsu ROI Cropping, CLAHE Normalization, Label Smoothing, Cosine Annealing
=============================================================================
"""

import os
import argparse
import numpy as np
import cv2
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from model import get_student_model

# 1. TIỀN XỬ LÝ ẢNH Y TẾ CHUYÊN BIỆT
def crop_brain_contour(image_np: np.ndarray) -> np.ndarray:
    """Tách vùng nhu mô não (Otsu Contour ROI Bounding Box), loại bỏ nền đen và ký tự thừa."""
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY) if len(image_np.shape) == 3 else image_np
    gray_blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(gray_blur, 45, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image_np
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    cropped = image_np[y:y+h, x:x+w]
    return cropped if cropped.size > 0 else image_np

def apply_clahe(image_np: np.ndarray) -> np.ndarray:
    """Tăng tương phản thích nghi cục bộ CLAHE để phân tách ranh giới u não."""
    if len(image_np.shape) == 3:
        lab = cv2.cvtColor(image_np, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_clahe = clahe.apply(l)
        merged = cv2.merge((l_clahe, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)
    else:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(image_np)

# 2. PYTORCH DATASET LOADER
class BrainMriDataset(Dataset):
    def __init__(self, file_paths, labels, transform=None, is_train=True):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform
        self.is_train = is_train

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        path = self.file_paths[idx]
        label = self.labels[idx]

        # Đọc ảnh
        im_cv = cv2.imread(path)
        if im_cv is None:
            # Fallback ảnh đen nếu lỗi đọc
            im_cv = np.zeros((256, 256, 3), dtype=np.uint8)
        else:
            im_cv = cv2.cvtColor(im_cv, cv2.COLOR_BGR2RGB)
            im_cv = crop_brain_contour(im_cv)
            im_cv = apply_clahe(im_cv)

        pil_img = Image.fromarray(im_cv)
        if self.transform:
            tensor = self.transform(pil_img)
        else:
            tensor = transforms.ToTensor()(pil_img)

        return tensor, torch.tensor(label, dtype=torch.long)

# 3. QUY TRÌNH HUẤN LUYỆN
def train_model(data_dir: str, epochs: int = 25, batch_size: int = 32, lr: float = 3e-4, output_path: str = "best_model.pth"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Đang sử dụng thiết bị tính toán: {device}")

    # Chuẩn bị transforms theo chuẩn ImageNet
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Khởi tạo mô hình
    model = get_student_model(num_classes=5).to(device)

    # Loss function có Label Smoothing chống Overfitting
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    print(f"[*] Sẵn sàng huấn luyện {epochs} epochs trên thư mục: {data_dir}")
    print("[*] Áp dụng các kỹ thuật: Data Augmentation, CLAHE, Label Smoothing (0.1), Cosine Annealing")

    raise NotImplementedError(
        "train.py mới chỉ dựng sẵn tiền xử lý, dataset, mô hình và hàm loss; CHƯA có vòng lặp huấn luyện thật. "
        "File brain_mri_student.onnx đang triển khai không được sinh ra từ script này."
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Huấn luyện mô hình NeuroScan Student Model trên ảnh MRI")
    parser.add_argument("--data_dir", type=str, default="./dataset", help="Đường dẫn thư mục tập dữ liệu")
    parser.add_argument("--epochs", type=int, default=25, help="Số epoch huấn luyện")
    parser.add_argument("--batch_size", type=int, default=32, help="Kích thước batch")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--output", type=str, default="best_brain_mri_model.pth", help="Tên file checkpoint đầu ra")
    args = parser.parse_args()

    train_model(args.data_dir, args.epochs, args.batch_size, args.lr, args.output)
