# 📖 Hướng dẫn chạy & sử dụng VideoAI Studio

> **VideoAI Studio** — ứng dụng tạo video bằng AI chạy hoàn toàn trong trình duyệt: nhập một chủ đề → AI viết kịch bản → dựng hình từng cảnh → đọc lời bình → ghép nhạc nền → xuất video tải về máy. **Không cần API key, không cần cài thư viện.**

---

## 1. Yêu cầu hệ thống

| Thành phần | Yêu cầu | Ghi chú |
|---|---|---|
| **Node.js** | ≥ 18 | [tải tại nodejs.org](https://nodejs.org) — kiểm tra bằng `node -v`; cần cho proxy TTS local |
| **Trình duyệt** | Chrome / Edge / Safari bản mới | Cần hỗ trợ Canvas, Web Audio, MediaRecorder (đều có sẵn) |
| **Internet** | Không bắt buộc | Có mạng: dùng AI online (kịch bản, ảnh, giọng đọc). Mất mạng: app **tự chuyển sang chế độ dự phòng offline** |

> 💡 **Không cần `npm install`** — server chỉ dùng module builtin của Node, không có dependency nào.

---

## 2. Chạy ứng dụng (3 bước)

```bash
# 1. Vào thư mục dự án
cd temem99

# 2. Khởi động server
node server.js          # hoặc: npm start

# 3. Mở trình duyệt
#    → http://localhost:3000
```

Thấy dòng này là thành công:

```
✨ VideoAI Studio đang chạy tại:  http://localhost:3000
```

### Đổi cổng (nếu 3000 bị chiếm)

```bash
PORT=8080 node server.js     # Linux/macOS
set PORT=8080 && node server.js   # Windows (CMD)
```

### Dừng server

Nhấn `Ctrl + C` trong terminal đang chạy server.

---

## 3. Sử dụng ứng dụng — từng bước

### Bước 1️⃣ — Tạo video mới (màn hình đầu)

**AI Script Wizard (tạo kịch bản từ tiêu đề):** nhập một tiêu đề ngắn như `Chuyện mẹ chồng nàng dâu`, chọn số cảnh (mặc định 8), rồi bấm **✨ Tạo kịch bản**. Wizard sẽ sinh lời bình tiếng Việt và prompt video tiếng Anh cho từng cảnh, kèm mã nhân vật `CHART 1`, `CHART 2` để dùng cùng ảnh tham chiếu. Kiểm tra danh sách cảnh rồi bấm **📥 Nạp Prompt vào hàng đợi sản xuất**, sau đó bấm **🚀 Tạo video**.

1. **Nhập chủ đề** vào ô lớn, ví dụ: *"Lịch sử vé số Vietlott"*, *"5 mẹo học tiếng Nhật hiệu quả"*, hoặc bấm một chip gợi ý có sẵn.
2. Chỉnh các thiết lập:

   | Thiết lập | Ý nghĩa |
   |---|---|
   | **Số cảnh** (3–8) | Bao nhiêu đoạn trong video (không tính màn mở/kết) |
   | **Tỉ lệ khung hình** | 16:9 (YouTube) · 9:16 (TikTok/Reels) · 1:1 (bài đăng) |
   | **Phong cách ảnh** | Điện ảnh, hoạt hình, mực nước… (ảnh AI sẽ theo phong cách này) |
   | **Giọng đọc** | 6 giọng AI tiếng Việt online; nếu offline → dùng giọng trình duyệt |
   | **Chuyển cảnh** | 3 kiểu: fade / trượt / zoom |
   | **Các công tắc** | Màn mở đầu · Màn kết thúc · Nhạc nền · Logo góc video |

3. Bấm **🚀 Tạo video** và chờ — AI sẽ lần lượt: viết kịch bản → tạo ảnh từng cảnh → ghi giọng đọc. Có thanh tiến độ hiển thị từng bước.

> 🔌 **Mất mạng / dịch vụ AI bị giới hạn?** App tự động chuyển sang dự phòng: kịch bản chia câu thông minh, ảnh từ thư viện có sẵn + ảnh trừu tượng sinh bằng thuật toán, giọng đọc bằng Web Speech API của trình duyệt. Video vẫn tạo được bình thường.

### Bước 2️⃣ — Chỉnh sửa trong Studio

Sau khi tạo xong, bạn vào màn **Studio**:

- **Danh sách cảnh bên trái**: bấm để nhảy tới cảnh, bấm **＋ Thêm** để thêm cảnh trống, xóa cảnh không cần.
- **Sửa nội dung**: đổi lời bình, mô tả hình ảnh → ảnh/giọng đọc được tạo lại theo.
- **Đổi ảnh một cảnh**: chọn ảnh AI khác, ảnh trừu tượng, hoặc **tải ảnh riêng của bạn** lên.
- **Thu âm giọng của chính bạn** cho từng cảnh (không cần AI).
- **Ô xem trước giữa**: phát/từng (`Space`), tua bằng cách nhấp lên timeline.
- **Thanh trên**: đổi tên video, đổi giọng đọc toàn bộ (🔊↻), bật/tắt nhạc nền.

Mọi thay đổi được **tự lưu vào localStorage** — quay lại tab sau vẫn khôi phục được (banner "Khôi phục" hiện ở màn đầu).

### Bước 3️⃣ — Xuất video

1. Bấm **⬇ Xuất video** → hộp thoại hiện tổng quan: độ phân giải, thời lượng, số cảnh, lời bình, nhạc nền.
2. Bấm xác nhận → app ghi canvas + âm thanh đã trộn (lời bình + nhạc nền) bằng MediaRecorder.
3. Chờ ghi xong (chạy **theo thời gian thực** — video 1 phút thì chờ ~1 phút) → file **WebM** tự tải về.

> ⚠️ Trong lúc xuất, **giữ tab mở và hiển thị** (đừng chuyển tab/thu nhỏ) để trình duyệt không tiết kiệm tài nguyên và làm hỏng bản ghi.

---

## 4. Thư viện giọng đọc miễn phí (tuỳ chọn)

Ứng dụng vẫn có giọng trình duyệt không cần cài đặt. Nếu muốn giọng tiếng Việt/local chất lượng tốt hơn, có thể dùng các adapter **VietTTS**, **Kokoro/Kokoro-ONNX** hoặc **Piper** qua server proxy `/api/tts`.

Cấu hình endpoint OpenAI-compatible của thư viện bạn đã cài rồi khởi động lại server:

```bash
# Ví dụ VietTTS chạy tại cổng 8298
export VIETTTS_URL="http://127.0.0.1:8298/v1/audio/speech"
# Hoặc chọn một endpoint khác:
# export KOKORO_TTS_URL="http://127.0.0.1:7860/v1/audio/speech"
# export PIPER_TTS_URL="http://127.0.0.1:5000/v1/audio/speech"
npm start
```

Sau đó chọn `🇻🇳 VietTTS`, `🟣 Kokoro` hoặc `🪶 Piper` trong ô **Giọng đọc lời bình** và bấm `🔊↻`. Các dự án/weights có license riêng; kiểm tra license model và voice trước khi phát hành thương mại. VietTTS source/API được tham khảo từ [dangvansam/viet-tts](https://github.com/dangvansam/viet-tts), Kokoro ONNX từ [thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx).

Kiểm thử proxy mà không cần cài model TTS: `npm run test:tts` (mock endpoint success/error và endpoint chưa cấu hình).

## 5. Tạo clip bằng Google Veo 3.1 Lite (tuỳ chọn)

Ở màn hình tạo mới, bấm **🎬 Tạo kịch bản & video bằng Veo 3.1 Lite (Low priority)** để AI Director dựng kịch bản rồi mở workflow Veo cho cảnh đầu tiên. Trong Studio, chọn một cảnh rồi bấm **🎬 Veo** để tạo clip riêng cho cảnh đó. Bạn có thể nhập Gemini API key, prompt chuyển động, ảnh tham chiếu, tỉ lệ, thời lượng và độ phân giải. Clip MP4 tạo xong sẽ được gắn vào cảnh và có nút tải về.

Nếu muốn chạy server-side bằng đoạn helper Python tương ứng với SDK Google:

```bash
python -m pip install -r requirements-veo.txt
# Linux/macOS
export GEMINI_API_KEY="AIza..."
# Windows PowerShell: $env:GEMINI_API_KEY="AIza..."

python scripts/veo3_lite_generate.py \
  --prompt "A wide cinematic shot of a futuristic neon city at night with flying cars. Audio: low synth hum and distant rain sounds." \
  --output veo3_lite_output.mp4
```

Veo là dịch vụ có quota/chi phí riêng. Không đưa API key vào Git, HTML hoặc tin nhắn công khai.

## 6. Thêm nguồn tạo video Agnes AI (tuỳ chọn)

VideoAI Studio có thể dùng [Agnes Video Generator](https://github.com/lcy362/agnes-video-generator) làm nguồn tạo clip thay cho Google Veo. Agnes là pipeline mã nguồn mở/self-hosted có text-to-video, nhiều cảnh, narration, subtitles, keyframes và digital anchor.

Khởi động Agnes theo hướng dẫn của repository đó, thường tại cổng `8765`, sau đó cấu hình proxy của VideoAI Studio:

```bash
export AGNES_URL="http://127.0.0.1:8765"
# Nếu service Agnes yêu cầu header API key từ proxy:
# export AGNES_API_KEY="..."
npm start
```

Trong Studio, mở nút **🎬 Veo**, chọn **Nguồn tạo video → Agnes AI · self-hosted**, rồi bấm tạo video. Ứng dụng gọi `POST /api/tasks/simple`, theo dõi `GET /api/tasks/{task_id}` và tải clip từ `GET /api/video/{task_id}` qua server proxy `/api/agnes`; trình duyệt không gọi service local trực tiếp. Kiểm tra adapter bằng `npm run test:agnes`.

> Agnes dùng API key/model do service Agnes quản lý. Không commit `AGNES_API_KEY` vào Git. License hiện được repository công bố là MIT, nhưng vẫn cần kiểm tra license của model/dịch vụ upstream trước khi phát hành thương mại.

## 7. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| `Error: listen EADDRINUSE :::3000` | Cổng 3000 đang bị chiếm → chạy `PORT=8080 node server.js` hoặc tắt tiến trình cũ. |
| Chip trạng thái hiện "Offline" | Mất mạng hoặc dịch vụ AI đang giới hạn tốc độ → app vẫn dùng được nhờ chế độ dự phòng; thử lại sau. |
| Ảnh AI chậm / trùng nhau | Dịch vụ ảnh miễn phí đang tải cao — bấm tạo lại ảnh, hoặc dùng ảnh thư viện / tải ảnh riêng. |
| Không nghe được giọng đọc | Bấm vào trang một lần (trình duyệt yêu cầu tương tác trước khi phát âm thanh); kiểm tra âm lượng hệ thống. |
| Video xuất ra không có tiếng | Trình duyệt quá cũ — dùng Chrome/Edge bản mới. WebM không mở được trên máy? Mở bằng Chrome hoặc chuyển sang MP4 (CloudConvert, ffmpeg: `ffmpeg -i video.webm video.mp4`). |
| Muốn làm lại từ đầu | Ở Studio bấm **↩ Sửa thiết lập & kịch bản**, hoặc xóa dự án lưu trong localStorage. |

---

## 8. Kiểm tra tự động (tuỳ chọn)

Repo kèm kịch bản smoke-test mô phỏng cả luồng online lẫn offline:

```bash
node scripts/smoke-test.mjs
```

Kết quả mong đợi: `24 pass, 0 fail, 0 lỗi runtime`.

---

## 9. Cấu trúc thư mục

```
temem99/
├── server.js            Máy chủ tĩnh zero-dependency (Node builtin)
├── package.json         scripts: start / dev
├── scripts/
│   ├── smoke-test.mjs   Kiểm thử tự động (online + offline)
│   ├── tts-proxy-test.mjs Kiểm thử proxy TTS local
│   ├── agnes-proxy-test.mjs Kiểm thử proxy Agnes
│   └── veo3_lite_generate.py  Helper Python tạo clip Veo server-side
├── requirements-veo.txt  Dependency tuỳ chọn cho helper Google Veo
└── public/
    ├── index.html       Giao diện 2 màn: Tạo mới → Studio
    ├── css/style.css    Theme tối, font Be Vietnam Pro
    ├── css/script-wizard.css Glow Pulse cho AI Script Wizard
    ├── js/
    │   ├── main.js      Bộ điều phối: state, luồng tạo video, UI
    │   ├── ai.js        Gọi Pollinations.ai + AI Script Wizard + fallback offline
    │   ├── art.js       Nhận diện chủ đề, ảnh thủ tục, thư viện ảnh
    │   ├── audio.js     AudioContext, Web Speech, nhạc nền Web Audio
    │   ├── renderer.js  Timeline + vẽ từng khung hình (Ken Burns, phụ đề…)
    │   ├── exporter.js  Trộn âm offline + MediaRecorder xuất video
    │   ├── veo.js       Adapter Gemini REST API / Google Veo
    │   ├── agnes.js     Adapter Agnes qua /api/agnes
    │   ├── local-tts.js Adapter VietTTS/Kokoro/Piper qua /api/tts
    │   └── util.js      Tiện ích (PRNG, toast, timeout…)
    └── library/         9 ảnh nền AI dự phòng (chạy offline vẫn có ảnh)
```

---

## 10. Câu hỏi thường gặp

**❓ Có cần API key hay trả phí không?**
Không. Dịch vụ AI online dùng Pollinations.ai (miễn phí, không cần key) và luôn có phương án dự phòng offline.

**❓ Video xuất ra định dạng gì? Đăng TikTok/YouTube được không?**
WebM (MP4 trên Safari). Đăng thẳng lên YouTube/TikTok được; muốn MP4 chuẩn thì chuyển đổi bằng ffmpeg: `ffmpeg -i video.webm -c:v libx264 -c:a aac video.mp4`.

**❓ Dữ liệu có bị gửi lên server nào không?**
Không có backend lưu project. Mặc định server chỉ phục vụ file tĩnh; khi chọn Google Veo, TTS local hoặc Agnes, dữ liệu sẽ được gửi tới đúng provider đó qua proxy bạn cấu hình.

**❓ Chạy trên điện thoại được không?**
Mở được và xem trước được, nhưng nên dùng máy tính để trải nghiệm đầy đủ (thu âm, xuất video nặng).
