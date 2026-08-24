#!/usr/bin/env python3
"""Chẩn đoán vì sao tiến trình tạo video bị treo (30%) hoặc failed.

Chạy trên chính máy đang chạy server:

    python3 scripts/chan_doan_mang.py

Script chỉ đọc, không sửa gì. Nó kiểm tra lần lượt:
  1. Cấu hình domain (.com hay .cn) — chọn sai là nguyên nhân treo phổ biến nhất
  2. Kết nối tới CẢ HAI domain, để biết nên chuyển sang cái nào
  3. API key đã cấu hình chưa
  4. Gọi thật một endpoint nhẹ để phân biệt: chặn mạng / key sai / hết quota

Không cần cài thêm gì ngoài thư viện chuẩn Python.
"""
from __future__ import annotations

import json
import os
import socket
import ssl
import sys
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(REPO, ".agnes_config", "config.json")
DOMAINS = {"com": "https://apihub.agnes-ai.com", "cn": "https://apihub.agnes-ai.cn"}

OK, BAD, WARN, INFO = "  [OK]", "  [LỖI]", "  [CẢNH BÁO]", "  [i]"


def muc(n: int, tieu_de: str) -> None:
    print(f"\n{'=' * 62}\n{n}. {tieu_de}\n{'=' * 62}")


def doc_config() -> dict:
    if not os.path.exists(CONFIG_PATH):
        return {}
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def thu_ket_noi(ten: str, root: str) -> str:
    """Trả về: 'ok' | 'chan' | 'dns' — phân biệt bị chặn với sai tên miền."""
    host = root.split("://", 1)[1]
    try:
        socket.getaddrinfo(host, 443)
    except socket.gaierror:
        print(f"{BAD} {ten}: không phân giải được tên miền (DNS hỏng hoặc mất mạng)")
        return "dns"

    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((host, 443), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host):
                print(f"{OK} {ten}: kết nối HTTPS thành công")
                return "ok"
    except (ssl.SSLError, OSError) as e:
        print(f"{BAD} {ten}: bắt tay TLS thất bại — {type(e).__name__}: {e}")
        return "chan"


def goi_thu_api(root: str, api_key: str) -> None:
    """Gọi endpoint /v1/models để phân biệt lỗi mạng / key / quota."""
    req = urllib.request.Request(f"{root}/v1/models")
    req.add_header("Authorization", f"Bearer {api_key}")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"{OK} Gọi API thành công (HTTP {resp.status}) — key hợp lệ, mạng thông")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:200]
        if e.code in (401, 403):
            print(f"{BAD} HTTP {e.code}: API key bị từ chối. Kiểm tra lại key.\n      {body}")
        elif e.code == 429:
            print(f"{WARN} HTTP 429: hết quota / bị giới hạn tốc độ. Đợi rồi thử lại,")
            print("      hoặc thêm key thứ 2 (AGNES_API_KEY_2) để tăng hạn mức.")
        else:
            print(f"{WARN} HTTP {e.code}: {body}")
    except urllib.error.URLError as e:
        print(f"{BAD} Không gọi được API — {e.reason}")


def main() -> int:
    print("CHẨN ĐOÁN KẾT NỐI AGNES VIDEO GENERATOR")

    cfg = doc_config()

    # ── 1. Domain ────────────────────────────────────────────────
    muc(1, "Cấu hình domain")
    domain = cfg.get("agnes_domain", "com")
    print(f"{INFO} Đang dùng: .{domain}  ({DOMAINS.get(domain, '?')})")
    print(f"{INFO} Đổi trong giao diện web, mục 'Agnes 域名配置' / cấu hình domain.")

    # ── 2. Kết nối ───────────────────────────────────────────────
    muc(2, "Kiểm tra kết nối tới cả hai domain")
    kq = {ten: thu_ket_noi(f".{ten}", root) for ten, root in DOMAINS.items()}

    dang_dung_hong = kq.get(domain) != "ok"
    con_lai = "cn" if domain == "com" else "com"
    if dang_dung_hong and kq.get(con_lai) == "ok":
        print(f"\n{WARN} >>> Domain .{domain} đang dùng bị chặn, nhưng .{con_lai} vào được.")
        print(f"      HÃY CHUYỂN SANG .{con_lai} trong giao diện — nhiều khả năng khắc phục được ngay.")
    elif all(v != "ok" for v in kq.values()):
        print(f"\n{BAD} >>> Cả hai domain đều không vào được.")
        print("      Mạng của bạn đang chặn Agnes (tường lửa, nhà mạng, hoặc mạng công ty).")
        print("      Thử: đổi sang 4G/5G, dùng VPN, hoặc mạng khác.")

    # ── 3. API key ───────────────────────────────────────────────
    muc(3, "API key")
    keys = cfg.get("api_keys") or ([cfg["api_key"]] if cfg.get("api_key") else [])
    env_key = os.environ.get("AGNES_API_KEY", "").strip()
    if env_key:
        keys.append(env_key)
        print(f"{INFO} Tìm thấy key trong biến môi trường AGNES_API_KEY")
    if not keys:
        print(f"{BAD} Chưa có key nào. Lấy miễn phí tại https://platform.agnes-ai.com")
        print("      Rồi nhập ở trang cấu hình, hoặc đặt AGNES_API_KEY trong .env")
        return 1
    for k in keys:
        canh = "" if k.startswith("sk-") else "  <-- không bắt đầu bằng 'sk-', có thể sai"
        print(f"{OK} {k[:6]}...{k[-4:]} (dài {len(k)}){canh}")

    # ── 4. Gọi thử API ───────────────────────────────────────────
    muc(4, "Gọi thử API")
    root_tot = next((DOMAINS[t] for t, v in kq.items() if v == "ok"), None)
    if not root_tot:
        print(f"{INFO} Bỏ qua — không domain nào kết nối được (xem mục 2).")
    else:
        goi_thu_api(root_tot, keys[0])

    # ── Kết luận ─────────────────────────────────────────────────
    muc(5, "Ý nghĩa các mốc tiến trình")
    print("""   0%  khởi tạo
  10%  đã gửi yêu cầu lên Agnes
  30%  ĐANG CHỜ Agnes render xong   <-- treo ở đây = không nhận được phản hồi
  90%  tải video về
 100%  hoàn tất

  Treo ở 30% gần như luôn là vấn đề mạng/quota, không phải lỗi kịch bản.
  Xem log lỗi chi tiết trong: .working_dir/error_logs/""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
