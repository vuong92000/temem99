# Hướng dẫn chi tiết — từ số không đến video hoàn chỉnh

Dành cho người chưa từng dùng dòng lệnh. Làm lần lượt từ Bước 1.

> **Đọc trước khi bắt đầu:** bản xem trước (preview) trong sandbox **không tạo được video**
> vì môi trường đó chặn kết nối tới máy chủ AI. Nó chỉ để xem giao diện. Muốn ra video thật,
> bắt buộc làm theo hướng dẫn này **trên máy tính của bạn**.

---

## Mục lục

- [Bước 1 — Lấy API key miễn phí](#bước-1--lấy-api-key-miễn-phí)
- [Bước 2 — Cài đặt và chạy](#bước-2--cài-đặt-và-chạy)
- [Bước 3 — Nhập API key](#bước-3--nhập-api-key)
- [Bước 4 — Đổi domain sang .com](#bước-4--đổi-domain-sang-com-quan-trọng-với-người-dùng-vn)
- [Bước 5 — Tạo video đầu tiên](#bước-5--tạo-video-đầu-tiên-thử-nghiệm)
- [Bước 6 — Tạo trọn tập phim](#bước-6--tạo-trọn-tập-phim-an--mây--tro)
- [Bảng tra cứu lỗi](#bảng-tra-cứu-lỗi)
- [Mẹo tiết kiệm thời gian và quota](#mẹo-tiết-kiệm-thời-gian-và-quota)

---

## Bước 1 — Lấy API key miễn phí

1. Vào https://platform.agnes-ai.com
2. Đăng ký tài khoản (miễn phí)
3. Vào mục API Key, bấm tạo key mới
4. Copy chuỗi bắt đầu bằng `sk-...` và lưu tạm vào Notepad

Key này miễn phí, không cần thẻ tín dụng. Hạn mức khoảng **1 video/phút** cho mỗi key.

> **Bảo mật:** key giống như mật khẩu. Đừng đăng lên mạng, đừng commit vào Git.
> Dự án đã tự động chặn file `.env` khỏi Git để bạn không lỡ tay.

---

## Bước 2 — Cài đặt và chạy

Chọn **một** trong ba cách. Nếu chỉ muốn dùng nhanh, chọn Cách A.

### Cách A — Một lệnh duy nhất (dễ nhất)

Cần cài sẵn **Node.js 18+** (https://nodejs.org) và **Python 3.10+** (https://python.org).

Mở Terminal (macOS) hoặc PowerShell (Windows), gõ:

```bash
npx free-short-video
```

Lần đầu sẽ mất vài phút để tải thư viện. Xong thì trình duyệt tự mở
`http://localhost:8765`.

Cách này **không cần cài ffmpeg** — gói tự kèm sẵn.

### Cách B — Docker (không cần Python lẫn Node)

Cần cài **Docker Desktop** (https://docker.com).

```bash
git clone https://github.com/vuong92000/temem99.git
cd temem99
AGNES_API_KEY=sk-dán-key-của-bạn ./docker-run.sh
```

Video tạo ra nằm trong thư mục `./agnes_data/working/`.

### Cách C — Từ mã nguồn (bắt buộc nếu muốn dùng kịch bản tập 01/02)

Cần **Python 3.10+**.

**macOS / Linux:**

```bash
git clone https://github.com/vuong92000/temem99.git
cd temem99
git checkout arena/01a03361-temem99

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python server.py
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/vuong92000/temem99.git
cd temem99
git checkout arena/01a03361-temem99

python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python server.py
```

Rồi tự mở trình duyệt vào `http://localhost:8765`.

> **Lưu ý dòng `git checkout`:** nhánh `arena/01a03361-temem99` là nơi chứa kịch bản
> tập 01/02, script chạy tự động và bản sửa lỗi treo 30%. Nhánh `main` không có.

---

## Bước 3 — Nhập API key

Sau khi mở `http://localhost:8765`:

1. Góc trên bên phải có nút chọn ngôn ngữ — **chọn 🇻🇳 Tiếng Việt** cho dễ đọc
2. Tìm khu vực cấu hình API Key ở đầu trang
3. Dán key `sk-...` vào, bấm Lưu

Key được lưu vào `.agnes_config/config.json` trên máy bạn, lần sau mở không phải nhập lại.

**Cách khác** — nếu thích dùng file, tạo file `.env` trong thư mục dự án:

```
AGNES_API_KEY=sk-dán-key-của-bạn
```

Rồi khởi động lại server.

**Muốn tạo nhanh hơn?** Đăng ký thêm 2–3 key rồi nhập hết vào. App tự xoay vòng giữa các key,
nhân hạn mức lên tương ứng — rất đáng làm khi tạo cả tập 6 cảnh.

---

## Bước 4 — Đổi domain sang .com (quan trọng với người dùng VN)

Dự án có hai máy chủ: `.com` (quốc tế) và `.cn` (Trung Quốc đại lục).

Mặc định khi dùng giao diện tiếng Trung là `.cn` — **từ Việt Nam thường chậm hoặc không vào được**.

Trên giao diện, tìm mục cấu hình domain (nằm giữa "chọn model" và "thư mục làm việc"),
**chọn `.com`** rồi lưu. Không cần khởi động lại.

Muốn kiểm tra trước máy bạn vào được cái nào:

```bash
.venv/bin/python scripts/chan_doan_mang.py
```

Lệnh này thử cả hai domain, kiểm tra key, rồi nói thẳng nên chọn gì.

---

## Bước 5 — Tạo video đầu tiên (thử nghiệm)

Trước khi làm cả tập 6 cảnh, hãy thử **một cảnh 5 giây** để chắc mọi thứ thông suốt.

1. Trên giao diện chọn chế độ **Simple / Video đơn giản**
2. Nhập một câu mô tả bất kỳ, ví dụ: `a golden dog sitting on a wooden bridge at sunrise`
3. Thời lượng: **5 giây**
4. Bấm tạo

Theo dõi thanh tiến trình:

| Mốc | Nghĩa |
|---|---|
| 0% | khởi tạo |
| 10% | đã gửi yêu cầu lên Agnes |
| 30% → 90% | **đang render** (số nhảy dần theo tiến độ thật) |
| 90% | tải video về |
| 100% | xong |

Một clip 5 giây thường mất **2–5 phút**. Nếu thanh tiến trình nhích đều, mọi thứ đang ổn.

Nếu hiện chữ `网络异常，重试中 1/10` kèm lý do — xem [bảng tra cứu lỗi](#bảng-tra-cứu-lỗi).

---

## Bước 6 — Tạo trọn tập phim (An – Mây – Tro)

Chỉ áp dụng nếu bạn cài theo **Cách C**.

### Vì sao dùng script thay vì bấm trên giao diện

Chế độ **Creative** trên giao diện chỉ nhận *một ý tưởng* rồi **tự viết lại kịch bản** —
6 prompt bạn soạn công phu sẽ bị mô hình thay bằng prompt của nó, mất kiểm soát góc máy,
bố cục và chi tiết nhân vật.

Script gửi **nguyên văn** từng prompt, nên giữ đúng ý bạn.

### Chạy

Mở **cửa sổ dòng lệnh thứ hai** (giữ nguyên cửa sổ đang chạy server):

```bash
cd temem99

# 1. Xem trước prompt — không gọi API, không tốn quota
.venv/bin/python episodes/run_episode.py episodes/ep01_dawn_cliffside.json --dry-run

# 2. Tạo thật tập 01 — 6 cảnh, tự ghép thành output/episode_01.mp4
.venv/bin/python episodes/run_episode.py episodes/ep01_dawn_cliffside.json

# 3. Tạo tập 02
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json
```

Mỗi tập 6 cảnh × 5 giây = **30 giây**, mất khoảng **15–30 phút** tùy tốc độ máy chủ
và hạn mức key.

### Làm lại một cảnh chưa ưng

Các cảnh đã xong được lưu lại, không phải làm lại từ đầu:

```bash
# chỉ làm lại cảnh 3 và 5
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json --clips 3,5

# ghép lại từ các cảnh đã có
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json --concat-only
```

### Sửa lời thoại trong kịch bản

Mở file `episodes/ep01_dawn_cliffside.json` bằng Notepad hoặc VS Code. Mỗi cảnh có dạng:

```json
{
  "n": 3,
  "title": "Tro vươn vai bên cửa sổ",
  "duration": 5,
  "prompt": "Tro, a smoky gray cat with one white front paw, ..."
}
```

Sửa phần `prompt` rồi chạy lại đúng cảnh đó bằng `--clips 3`.

**Ba quy tắc để nhân vật không bị "trôi" hình dạng:**

1. Giữ nguyên từng chữ phần mô tả An / Mây / Tro trong `world_bible`
2. Mỗi tập dùng `seed` khác nhau, cách xa nhau
3. Cảnh cuối tập trước và cảnh đầu tập sau phải tả cùng bố cục, cùng đạo cụ

Chi tiết trong `episodes/README.md`.

---

## Bảng tra cứu lỗi

Bản sửa mới đã dịch lỗi kỹ thuật sang tiếng người. Tra theo chữ hiện trên màn hình:

| Màn hình hiện | Nguyên nhân | Cách xử lý |
|---|---|---|
| `无法建立 HTTPS 连接` | Mạng bị chặn | Đổi domain `.com`↔`.cn`; thử 4G; tắt VPN công ty |
| `无法连接服务器` | Không tới được máy chủ | Kiểm tra mạng; chạy `scripts/chan_doan_mang.py` |
| `连接超时` | Mạng quá chậm | Đợi rồi thử lại; đổi mạng |
| `API Key 被拒绝` | Key sai hoặc hết hạn | Kiểm tra lại key, tạo key mới |
| `触发限流或配额用尽` | Hết lượt miễn phí | Đợi vài phút; thêm key thứ 2, thứ 3 |
| Treo ở 10% | Không gửi được yêu cầu | Lỗi mạng ngay từ đầu — như trên |
| Treo ở 30% **không đổi số** | Bản cũ chưa có bản sửa | `git checkout arena/01a03361-temem99` rồi khởi động lại |

**Xem nhật ký lỗi chi tiết:** thư mục `.working_dir/error_logs/`, mỗi lỗi một file JSON.

**Lệnh chẩn đoán tổng quát** — chạy đầu tiên khi gặp bất kỳ vấn đề gì:

```bash
.venv/bin/python scripts/chan_doan_mang.py
```

### Vài lỗi thường gặp khác

**`Port 8765 is already in use`** — server cũ còn chạy:

```bash
# macOS / Linux
lsof -ti:8765 | xargs kill

# Windows
netstat -ano | findstr :8765
taskkill /PID <số_PID> /F
```

**`python: command not found`** — chưa cài Python, hoặc trên macOS phải gõ `python3`.

**Giọng đọc tiếng Việt không hiện** — danh sách giọng tải từ Microsoft Edge TTS,
cần mạng thông. Nếu chỉ thấy 4 giọng tiếng Trung là máy đang chặn `speech.platform.bing.com`.

**Thời lượng bị báo lỗi** — chỉ nhận **5, 10, 15, 18, 20** giây. Lưu ý 18 và 20 giây
thực tế bị cắt còn khoảng 17 giây do giới hạn của API.

---

## Mẹo tiết kiệm thời gian và quota

1. **Luôn `--dry-run` trước.** Xem prompt đã đúng chưa, không tốn lượt gọi nào.
2. **Thử 1 cảnh 5 giây trước khi làm cả tập.** Sai sót phát hiện sớm đỡ mất 30 phút.
3. **Thêm nhiều key.** Mỗi key ~1 video/phút; 3 key nhanh gấp 3.
4. **Đừng đóng cửa sổ server** khi script đang chạy — tiến trình sẽ đứt.
5. **Tiến độ được lưu lại.** Máy sập giữa chừng vẫn chạy tiếp được bằng `--concat-only`
   hoặc `--clips` cho những cảnh còn thiếu.
6. **Tạo video dọc 9:16** (768×1152) là mặc định — hợp TikTok, Reels, Shorts.

---

## Cần giúp thêm

- Cách chạy rút gọn: `CHAY_TREN_MAY_CUA_BAN.md`
- Về kịch bản và cách tạo tập mới: `episodes/README.md`
- Tài liệu gốc của dự án: `README.md`, `README_ZH.md`

Khi gặp lỗi, hãy chụp màn hình dòng thông báo lỗi — nó đã ghi rõ nguyên nhân.
