#!/usr/bin/env python3
"""Tạo một clip Google Veo 3.1 Lite từ prompt.

Cài đặt:
    python -m pip install -r requirements-veo.txt
    export GEMINI_API_KEY="AIza..."

Chạy:
    python scripts/veo3_lite_generate.py \
      --prompt "A wide cinematic shot of a futuristic neon city at night with flying cars" \
      --output veo3_lite_output.mp4

API key chỉ đọc từ biến môi trường, không đặt trực tiếp trong source code.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

DEFAULT_PROMPT = (
    "A wide cinematic shot of a futuristic neon city at night with flying cars. "
    "Audio: low synth hum and distant rain sounds."
)
DEFAULT_NEGATIVE = "camera shake, blurry, distorted audio"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a video with Google Veo 3.1 Lite.")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Veo video prompt")
    parser.add_argument("--negative-prompt", default=DEFAULT_NEGATIVE, help="Things to avoid")
    parser.add_argument("--output", default="veo3_lite_output.mp4", help="Output MP4 path")
    parser.add_argument("--model", default="veo-3.1-lite-generate-preview", help="Veo model id")
    parser.add_argument("--aspect-ratio", choices=("16:9", "9:16"), default="16:9")
    parser.add_argument("--resolution", choices=("720p", "1080p", "4k"), default="720p")
    parser.add_argument("--duration", type=int, choices=(4, 6, 8), default=6, dest="duration_seconds")
    parser.add_argument("--poll-seconds", type=int, default=10, help="Polling interval")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not os.environ.get("GEMINI_API_KEY"):
        print("Chưa có GEMINI_API_KEY. Hãy export key rồi chạy lại.", file=sys.stderr)
        return 2

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:  # pragma: no cover - optional dependency
        print(
            "Thiếu google-genai. Chạy: python -m pip install -r requirements-veo.txt",
            file=sys.stderr,
        )
        return 2

    output = Path(args.output).expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)

    client = genai.Client()
    operation = client.models.generate_videos(
        model=args.model,
        prompt=args.prompt,
        config=types.GenerateVideosConfig(
            aspect_ratio=args.aspect_ratio,
            resolution=args.resolution,
            duration_seconds=args.duration_seconds,
            negative_prompt=args.negative_prompt,
        ),
    )

    print(f"Đã gửi yêu cầu tới {args.model}. Đang chờ hàng chờ xử lý…")
    while not operation.done:
        time.sleep(max(1, args.poll_seconds))
        operation = client.operations.get(operation)

    # SDK có thể trả lỗi trong operation thay vì ném ngay ở request đầu tiên.
    if getattr(operation, "error", None):
        print(f"Google Veo lỗi: {operation.error}", file=sys.stderr)
        return 1

    result_video = operation.result.generated_videos[0]
    client.files.download(file=result_video.video)
    result_video.video.save(str(output))
    print(f"Tạo video thành công! File đã lưu tại {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
