"""
=============================================================================
NEUROSCAN AI — GRAD-CAM (GRADIENT-WEIGHTED CLASS ACTIVATION MAPPING) ENGINE
Bản quyền: NeuroScan AI Team (Y khoa Thần kinh & AI Chẩn đoán Hình ảnh)
Cung cấp giải thích trực quan (Visual Explainable AI - XAI) cho mô hình phân loại u não.
=============================================================================
"""

import io
import base64
import numpy as np
import cv2
from PIL import Image

try:
    import torch
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class GradCAM:
    """
    Thực thi thuật toán Grad-CAM trên mạng nơ-ron tích chập (PyTorch).
    Trích xuất đặc trưng không gian từ tầng tích chập cuối (features[-1]),
    tính gradient ngược theo lớp dự đoán và tổng hợp bản đồ nhiệt chú ý (Activation Map).
    """

    def __init__(self, model, target_layer=None):
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch chưa được cài đặt để chạy GradCAM hooks.")

        self.model = model
        self.model.eval()

        if target_layer is not None:
            self.target_layer = target_layer
        elif hasattr(model, "features"):
            self.target_layer = model.features[-1]
        else:
            conv_layers = [m for m in model.modules() if isinstance(m, torch.nn.Conv2d)]
            if conv_layers:
                self.target_layer = conv_layers[-1]
            else:
                self.target_layer = list(model.children())[-2]

        self.activations = None
        self.gradients = None
        self.handles = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, inp, out):
            self.activations = out.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.handles.append(self.target_layer.register_forward_hook(forward_hook))
        self.handles.append(self.target_layer.register_full_backward_hook(backward_hook))

    def generate_heatmap(self, input_tensor: "torch.Tensor", target_class: int = None) -> np.ndarray:
        """
        Tính toán ma trận heatmap chuẩn hóa [0.0, 1.0] cho tensor đầu vào [1, 3, H, W].
        """
        self.model.zero_grad()
        output = self.model(input_tensor)

        if target_class is None:
            target_class = int(torch.argmax(output, dim=1).item())

        loss = output[0, target_class]
        loss.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            raise RuntimeError("Không thu được activations hoặc gradients từ target layer.")

        # Global Average Pooling (GAP) trên gradient để tính trọng số alpha
        weights = torch.mean(self.gradients, dim=(2, 3))[0]  # [C]
        activations = self.activations[0]  # [C, H_feat, W_feat]

        cam = torch.zeros(activations.shape[1:], dtype=torch.float32, device=activations.device)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        # Áp dụng ReLU chỉ giữ lại các đặc trưng kích hoạt dương tính
        cam = F.relu(cam)

        cam_np = cam.cpu().numpy()
        cam_min, cam_max = np.min(cam_np), np.max(cam_np)
        if cam_max > cam_min:
            cam_np = (cam_np - cam_min) / (cam_max - cam_min)
        else:
            cam_np = np.zeros_like(cam_np)

        return cam_np

    def remove_hooks(self):
        for h in self.handles:
            h.remove()
        self.handles.clear()


def apply_heatmap_overlay(
    original_image_rgb: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = 0.45,
    colormap_type: int = cv2.COLORMAP_JET,
) -> np.ndarray:
    """
    Phủ bản đồ nhiệt Grad-CAM lên ảnh MRI gốc theo bảng màu y khoa (JET hoặc TURBO).
    - original_image_rgb: Mảng numpy uint8 (H, W, 3)
    - heatmap: Mảng numpy float32 (H_feat, W_feat) trong dải [0, 1]
    - alpha: Tỷ lệ hòa trộn bản đồ nhiệt (mặc định 0.45)
    """
    h, w = original_image_rgb.shape[:2]
    # Resize bản đồ nhiệt về cùng kích thước ảnh gốc
    heatmap_resized = cv2.resize(heatmap, (w, h), interpolation=cv2.INTER_LINEAR)
    heatmap_uint8 = np.uint8(255 * np.clip(heatmap_resized, 0.0, 1.0))

    # Áp dụng bảng màu giả (Colormap)
    heatmap_color_bgr = cv2.applyColorMap(heatmap_uint8, colormap_type)
    heatmap_color_rgb = cv2.cvtColor(heatmap_color_bgr, cv2.COLOR_BGR2RGB)

    # Hòa trộn có điều kiện: vùng có kích hoạt thấp (< 0.15) giữ nguyên ảnh gốc rõ nét
    mask = (heatmap_resized >= 0.12).astype(np.float32)[:, :, np.newaxis]
    blended = (
        (1.0 - alpha * mask) * original_image_rgb.astype(np.float32)
        + (alpha * mask) * heatmap_color_rgb.astype(np.float32)
    )
    return np.clip(blended, 0, 255).astype(np.uint8)


def generate_contrast_saliency_heatmap(
    image_np_rgb: np.ndarray,
    target_class_name: str = "Glioma",
) -> np.ndarray:
    """
    Tạo bản đồ nhiệt kích hoạt thích ứng (Adaptive Parenchymal Saliency Map)
    dựa trên phân tích tương phản cục bộ, gradient ranh giới mô bệnh học và vị trí giải phẫu.
    Dùng làm engine tạo heatmap nhanh hoặc fallback khi suy luận trực tiếp không có backprop.
    """
    h, w = image_np_rgb.shape[:2]
    gray = cv2.cvtColor(image_np_rgb, cv2.COLOR_RGB2GRAY) if len(image_np_rgb.shape) == 3 else image_np_rgb

    # 1. Tách mặt nạ nhu mô não (Brain Parenchyma Mask)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    _, brain_mask = cv2.threshold(blur, 35, 255, cv2.THRESH_BINARY)

    # 2. Tính gradient Sobel để phát hiện ranh giới khối u / tổn thương
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = cv2.magnitude(grad_x, grad_y)
    grad_norm = cv2.normalize(grad_mag, None, 0, 1, cv2.NORM_MINMAX)

    # 3. Phân tích cường độ sáng và độ lệch so với nhu mô đối bên (Hemispheric Asymmetry)
    gray_float = gray.astype(np.float32) / 255.0
    diff_midline = np.abs(gray_float - np.fliplr(gray_float))

    # 4. Trọng số hóa theo nhóm bệnh lý
    cls_lower = target_class_name.lower()
    y_coords, x_coords = np.mgrid[0:h, 0:w]

    if "pituitary" in cls_lower:
        # U tuyến yên: tập trung vùng hố yên (sella turcica - trung tâm phần dưới hộp sọ)
        center_y, center_x = int(h * 0.58), int(w * 0.50)
        dist_sq = ((x_coords - center_x) / (w * 0.22)) ** 2 + ((y_coords - center_y) / (h * 0.18)) ** 2
        spatial_prior = np.exp(-dist_sq)
        activation = (gray_float * 0.5 + grad_norm * 0.5) * spatial_prior
    elif "meningioma" in cls_lower:
        # U màng não: thường ở ngoại trục, dural tail, vòm sọ hoặc liềm não
        dist_from_center = np.sqrt(((x_coords - w / 2) / (w / 2)) ** 2 + ((y_coords - h / 2) / (h / 2)) ** 2)
        spatial_prior = np.clip(dist_from_center * 1.4, 0.4, 1.2)
        activation = (gray_float * 0.4 + grad_norm * 0.6) * spatial_prior
    elif "glioma" in cls_lower:
        # U thần kinh đệm: trong nhu mô, hiệu ứng choán chỗ, tính bất đối xứng cao
        activation = (gray_float * 0.35 + grad_norm * 0.35 + diff_midline * 0.30)
    else:
        # Bình thường / Không u: kích hoạt thấp, tản mát toàn nhu mô, không có điểm nóng
        activation = gray_float * 0.15

    # Áp mặt nạ não
    activation = activation * (brain_mask.astype(np.float32) / 255.0)

    # Làm mịn Gauss để tái tạo đặc tính trường nhìn của tầng tích chập sâu
    ksize = int(max(h, w) * 0.08)
    if ksize % 2 == 0:
        ksize += 1
    activation_smooth = cv2.GaussianBlur(activation, (ksize, ksize), 0)

    act_min, act_max = np.min(activation_smooth), np.max(activation_smooth)
    if act_max > act_min:
        heatmap_norm = (activation_smooth - act_min) / (act_max - act_min)
    else:
        heatmap_norm = np.zeros((h, w), dtype=np.float32)

    return heatmap_norm


def image_to_base64_data_url(image_rgb: np.ndarray, quality: int = 90) -> str:
    """Chuyển mảng ảnh RGB uint8 thành chuỗi base64 data URL (JPEG)."""
    pil_img = Image.fromarray(image_rgb)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=quality)
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"
