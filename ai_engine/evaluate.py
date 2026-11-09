"""
NEUROSCAN AI — ĐÁNH GIÁ MÔ HÌNH ONNX TRÊN TẬP KIỂM THỬ ĐỘC LẬP (TESTING SET)
Cách dùng:
    python evaluate.py --data_dir "C:/Users/Admin/Downloads/archive/Testing" --output eval_report.json
Cấu trúc thư mục: <data_dir>/{glioma,meningioma,notumor,pituitary}/*.jpg
Dùng đúng pipeline tiền xử lý và ánh xạ nhãn của infer_python.py.
"""

import os
import sys
import json
import argparse
import numpy as np
import onnxruntime as ort

from infer_python import preprocess_image, softmax, TARGET_CLASSES

FOLDER_TO_LABEL = {
    "glioma": "Glioma",
    "meningioma": "Meningioma",
    "pituitary": "Pituitary",
    "notumor": "No Tumor",
}
IMAGE_EXT = (".jpg", ".jpeg", ".png")


def predict_label(session, input_name: str, image_path: str) -> str:
    tensor = preprocess_image(image_path)
    logits = session.run(None, {input_name: tensor})[0][0]
    p = softmax(logits)
    scores = {
        "Glioma": float(p[0]),
        "Meningioma": float(p[1]),
        "Pituitary": float(p[3]),
        "No Tumor": float(p[2] + p[4]),
    }
    return max(scores.items(), key=lambda kv: kv[1])[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True)
    parser.add_argument("--model", default="../frontend/public/models/brain_mri_student.onnx")
    parser.add_argument("--output", default="eval_report.json")
    args = parser.parse_args()

    session = ort.InferenceSession(args.model)
    input_name = session.get_inputs()[0].name

    idx = {c: i for i, c in enumerate(TARGET_CLASSES)}
    n = len(TARGET_CLASSES)
    cm = np.zeros((n, n), dtype=int)

    for folder, label in FOLDER_TO_LABEL.items():
        d = os.path.join(args.data_dir, folder)
        files = [f for f in sorted(os.listdir(d)) if f.lower().endswith(IMAGE_EXT)]
        for k, f in enumerate(files, 1):
            pred = predict_label(session, input_name, os.path.join(d, f))
            cm[idx[label], idx[pred]] += 1
            if k % 100 == 0:
                print(f"[{label}] {k}/{len(files)}", flush=True)

    total = int(cm.sum())
    correct = int(np.trace(cm))
    per_class = []
    for c in TARGET_CLASSES:
        i = idx[c]
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        per_class.append({
            "label": c,
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1": round(float(f1), 4),
            "support": int(cm[i, :].sum()),
        })

    report = {
        "dataset": os.path.abspath(args.data_dir),
        "totalSamples": total,
        "correctSamples": correct,
        "accuracy": round(correct / total, 4),
        "macroPrecision": round(float(np.mean([r["precision"] for r in per_class])), 4),
        "macroRecall": round(float(np.mean([r["recall"] for r in per_class])), 4),
        "macroF1": round(float(np.mean([r["f1"] for r in per_class])), 4),
        "labels": TARGET_CLASSES,
        "confusionMatrix": cm.tolist(),
        "perClass": per_class,
    }
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    main()
