# Chạy trên máy của bạn

## Vì sao phải chuyển sang máy riêng

Bản xem trước (preview) trong sandbox **không thể tạo video**, và đây không phải lỗi có thể sửa
bằng cách chỉnh code hay kịch bản.

Sandbox chặn kết nối ra ngoài, chỉ chừa vài địa chỉ phục vụ cài đặt thư viện:

| Địa chỉ | Kết quả trong sandbox |
|---|---|
| github.com, pypi.org | ✅ vào được |
| apihub.agnes-ai.**com** | ❌ bị chặn |
| apihub.agnes-ai.**cn** | ❌ bị chặn |
| speech.platform.bing.com (giọng đọc) | ❌ bị chặn |

Mọi thứ khác đã sẵn sàng: mã nguồn, giao diện, kịch bản tập 01 và 02, script chạy tự động.
Chỉ thiếu đúng một thứ — đường mạng tới máy chủ AI. Preview vẫn dùng tốt để **xem giao diện**,
nhưng bấm tạo video thì luôn thất bại.

---

## Cách 1 — Một lệnh duy nhất (khuyên dùng)

Cần: **Node.js 18+** và **Python 3.10+**. Không cần cài ffmpeg.

```bash
npx free-short-video
```

Lệnh này tự tạo môi trường ảo, cài thư viện, kèm sẵn ffmpeg, rồi mở trình duyệt ở
http://localhost:8765

Kèm luôn API key:

```bash
AGNES_API_KEY=sk-xxxxx npx free-short-video
```

## Cách 2 — Docker

Cần: **Docker**. Không cần Python lẫn Node.

```bash
git clone https://github.com/vuong92000/temem99.git
cd temem99
AGNES_API_KEY=sk-xxxxx ./docker-run.sh
```

Video tạo ra nằm ở `./agnes_data/working/`.

## Cách 3 — Chạy từ mã nguồn (nếu muốn dùng kịch bản tập 01/02)

Cần: **Python 3.10+**.

```bash
git clone https://github.com/vuong92000/temem99.git
cd temem99
git checkout arena/01a03361-temem99      # nhánh chứa kịch bản + bản sửa tiến trình

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

cp .env.example .env                      # mở ra điền AGNES_API_KEY
.venv/bin/python server.py
```

Mở http://localhost:8765

---

## Lấy API key miễn phí

Đăng ký tại https://platform.agnes-ai.com rồi lấy key (dạng `sk-...`).

Nhập key bằng **một trong ba cách**: điền vào trang cấu hình trên giao diện web, đặt trong
file `.env`, hoặc truyền qua biến môi trường `AGNES_API_KEY`.

---

## Kiểm tra trước khi chạy

Chạy lệnh này để biết máy bạn có vào được Agnes không:

```bash
python3 scripts/chan_doan_mang.py
```

Nó thử cả hai tên miền `.com` và `.cn`, kiểm tra key, rồi nói thẳng nên làm gì.

**Người dùng ở Việt Nam lưu ý:** mặc định của bản này đang là `.cn` (dành cho Trung Quốc đại lục).
Nếu chậm hoặc không vào được, hãy **đổi sang `.com`** trong giao diện web — mục cấu hình domain,
nằm giữa "chọn model" và "thư mục làm việc".

---

## Tạo video theo kịch bản đã soạn

Sau khi server chạy được, mở cửa sổ dòng lệnh thứ hai:

```bash
# xem trước prompt, không tốn lượt gọi API
.venv/bin/python episodes/run_episode.py episodes/ep01_dawn_cliffside.json --dry-run

# tạo thật: 6 clip, ghép thành output/episode_01.mp4
.venv/bin/python episodes/run_episode.py episodes/ep01_dawn_cliffside.json
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json
```

Nếu một cảnh chưa ưng, làm lại riêng cảnh đó — các cảnh đã xong vẫn giữ nguyên:

```bash
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json --clips 3,5
```

Xem thêm `episodes/README.md`.

---

## Ý nghĩa thanh tiến trình

| Mốc | Đang làm gì |
|---|---|
| 0% | khởi tạo |
| 10% | gửi yêu cầu lên Agnes |
| 30% → 90% | **chờ Agnes render** (chạy theo tiến độ thật của máy chủ) |
| 90% | tải video về |
| 100% | xong |

Trước đây đoạn 30%→90% bị đứng im vì thiếu báo tiến trình; nhánh này đã sửa. Giờ nếu mạng
trục trặc, màn hình sẽ hiện `网络异常，重试中 1/10` kèm nguyên nhân, thay vì treo câm lặng.
Nhật ký lỗi chi tiết nằm trong `.working_dir/error_logs/`.
