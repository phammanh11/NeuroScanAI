"""
=============================================================================
NEUROSCAN AI — NÂNG CẤP FILE ONNX HIỆN CÓ ĐỂ XUẤT REAL CNN CAM (GRAD-CAM)
=============================================================================
Thêm trực tiếp nhánh 1x1 Conv (trọng số từ tầng classifier Gemm cuối cùng)
trên feature map không gian ngay trước GlobalAveragePool.
  - Đầu ra cũ giữ nguyên 100%: logits   [batch, 5]
  - Đầu ra mới bổ sung       : cam_maps [batch, 5, H_f, W_f] (thường 8x8)
  - Sai số logits so với bản gốc: ~0.0 (không làm thay đổi bất kỳ trọng số nào)
=============================================================================
"""

import argparse
import os
import shutil
import numpy as np
import onnx
from onnx import helper, numpy_helper, TensorProto
import onnxruntime as ort


def upgrade_onnx_with_cam(input_path: str, output_path: str) -> None:
    model = onnx.load(input_path)
    graph = model.graph

    existing_outputs = {o.name for o in graph.output}
    if "cam_maps" in existing_outputs:
        print(f"[i] Mô hình {input_path} đã có sẵn đầu ra 'cam_maps'. Bỏ qua.")
        return

    # 1. Tìm node GlobalAveragePool và node Gemm classifier cuối cùng
    gap_node = None
    gemm_node = None
    for node in graph.node:
        if node.op_type == "GlobalAveragePool":
            gap_node = node
        if node.op_type == "Gemm":
            gemm_node = node

    if gap_node is None or gemm_node is None:
        raise RuntimeError("Không tìm thấy cấu trúc GlobalAveragePool -> Gemm trong mô hình ONNX.")

    feature_tensor_name = gap_node.input[0]
    weight_name = gemm_node.input[1]

    # 2. Lấy ma trận trọng số classifier [num_classes, C]
    weight_init = next((init for init in graph.initializer if init.name == weight_name), None)
    if weight_init is None:
        raise RuntimeError(f"Không tìm thấy initializer trọng số '{weight_name}'.")

    weight_np = numpy_helper.to_array(weight_init)
    trans_b = 0
    for attr in gemm_node.attribute:
        if attr.name == "transB":
            trans_b = attr.i

    if trans_b == 0:
        # Gemm: Y = A * B => B có shape [C, num_classes], cần chuyển vị về [num_classes, C]
        weight_np = weight_np.T

    num_classes, num_channels = weight_np.shape
    cam_weight_np = weight_np.astype(np.float32).reshape(num_classes, num_channels, 1, 1)

    cam_weight_name = "neuroscan_cam_conv_weight"
    cam_weight_tensor = numpy_helper.from_array(cam_weight_np, name=cam_weight_name)
    graph.initializer.append(cam_weight_tensor)

    # 3. Thêm node Conv 1x1 tính CAM trực tiếp: [batch, C, H_f, W_f] -> [batch, num_classes, H_f, W_f]
    cam_conv_node = helper.make_node(
        "Conv",
        inputs=[feature_tensor_name, cam_weight_name],
        outputs=["cam_maps"],
        name="/neuroscan_cam/Conv1x1",
        kernel_shape=[1, 1],
        strides=[1, 1],
        pads=[0, 0, 0, 0],
    )
    graph.node.append(cam_conv_node)

    # 4. Đăng ký output cam_maps với dynamic spatial dims để chạy an toàn trên mọi kích thước
    cam_output = helper.make_tensor_value_info(
        "cam_maps",
        TensorProto.FLOAT,
        ["batch", int(num_classes), None, None],
    )
    graph.output.append(cam_output)

    # 5. Kiểm tra hợp lệ đồ thị ONNX
    onnx.checker.check_model(model)

    # 6. Lưu tạm và đối chiếu sai số logits so với bản gốc
    tmp_path = output_path + ".tmp"
    onnx.save(model, tmp_path)

    orig_sess = ort.InferenceSession(input_path, providers=["CPUExecutionProvider"])
    new_sess = ort.InferenceSession(tmp_path, providers=["CPUExecutionProvider"])

    dummy = np.random.RandomState(42).randn(1, 3, 256, 256).astype(np.float32)
    input_name = orig_sess.get_inputs()[0].name
    orig_logits = orig_sess.run(["logits"], {input_name: dummy})[0]
    new_logits, cam_maps = new_sess.run(["logits", "cam_maps"], {input_name: dummy})

    max_diff = float(np.max(np.abs(orig_logits - new_logits)))
    if max_diff > 1e-5:
        os.remove(tmp_path)
        raise RuntimeError(f"Sai số logits vượt ngưỡng cho phép: {max_diff}")

    shutil.move(tmp_path, output_path)
    print(f"[✓] Nâng cấp ONNX CAM thành công: {output_path}")
    print(f"    • Classifier shape : [{num_classes}, {num_channels}]")
    print(f"    • Feature map node : {feature_tensor_name}")
    print(f"    • Output cam_maps  : {list(cam_maps.shape)}")
    print(f"    • Max logits diff  : {max_diff:.8f} (khớp tuyệt đối)")
    print(f"    • Kích thước file  : {os.path.getsize(output_path) / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nâng cấp mô hình ONNX bổ sung đầu ra Real CNN CAM")
    parser.add_argument(
        "--input",
        default="../frontend/public/models/brain_mri_student.onnx",
        help="Đường dẫn file .onnx gốc",
    )
    parser.add_argument(
        "--output",
        default="../frontend/public/models/brain_mri_student.onnx",
        help="Đường dẫn file .onnx sau nâng cấp",
    )
    args = parser.parse_args()
    upgrade_onnx_with_cam(args.input, args.output)
