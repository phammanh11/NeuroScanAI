import torch
import torch.nn as nn
from torchvision import models

class BrainMriStudentModel(nn.Module):
    """
    Kiến trúc mô hình học sinh (Student Model) phân loại U não từ ảnh MRI.
    Backbone: MobileNetV2 / EfficientNet-B0 (1280 latent features).
    Output: 5 logits (Lớp 0: Glioma, Lớp 1: Meningioma, Lớp 2: No Tumor, Lớp 3: Pituitary, Lớp 4: Negative/Normal).
    """
    def __init__(self, num_classes: int = 5, pretrained: bool = True):
        super().__init__()
        # Sử dụng MobileNetV2 làm backbone nhẹ, tối ưu suy luận WebAssembly
        weights = models.MobileNet_V2_Weights.DEFAULT if pretrained else None
        base_model = models.mobilenet_v2(weights=weights)
        
        # Trích xuất toàn bộ các tầng convolution trích xuất đặc trưng
        self.features = base_model.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        
        # Classifier Head (1280 -> num_classes)
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(1280, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.pool(x)
        x = torch.flatten(x, 1)
        logits = self.classifier(x)
        return logits

def get_student_model(num_classes: int = 5) -> nn.Module:
    return BrainMriStudentModel(num_classes=num_classes)
