# 🎬 VideoAI Studio

**Ứng dụng tạo video bằng AI chạy hoàn toàn trong trình duyệt** — nhập một chủ đề, AI viết kịch bản, dựng hình, đọc lời bình, ghép nhạc nền và xuất video tải về máy. Không cần cài đặt, không cần API key, không có server backend phức tạp.

## ✨ Tính năng

| Tính năng | Chi tiết |
|---|---|
| ✍️ **AI viết kịch bản** | Nhập chủ đề → AI (Pollinations.ai, miễn phí) chia thành các cảnh có lời bình + mô tả hình ảnh. Offline thì tự chuyển sang chia kịch bản thông minh. |
| 🖼 **Hình ảnh AI từng cảnh** | Mỗi cảnh một ảnh AI (model Flux). Fallback: thư viện 9 ảnh AI có sẵn theo chủ đề + bộ sinh ảnh trừu tượng ngẫu nhiên (chạy offline). Tải ảnh riêng của bạn cũng được. |
| 🔊 **Giọng đọc AI** | 6 giọng AI online đọc lời bình tiếng Việt. Fallback: giọng đọc của trình duyệt (Web Speech API) hoặc **thu âm giọng của chính bạn** cho từng cảnh. |
| 🎵 **Nhạc nền tự sinh** | Nhạc ambient (đệm hợp âm + reverb) sinh bằng Web Audio — không cần file nhạc, trộn thẳng vào video xuất ra. |
| 🎥 **Hiệu ứng điện ảnh** | Ken Burns (zoom/pan chậm), 3 kiểu chuyển cảnh, phụ đề tự chia câu động, màn mở đầu/kết thúc, watermark. |
| 📐 **3 tỉ lệ khung hình** | 16:9 (YouTube) · 9:16 (TikTok/Reels) · 1:1 (bài đăng). |
| ⬇ **Xuất video** | Ghi canvas + âm thanh đã trộn sẵn bằng MediaRecorder → file **WebM** (MP4 trên Safari). |
| 💾 **Tự lưu dự án** | Lưu vào localStorage, lần sau vào có nút khôi phục. |

## 🚀 Chạy ứng dụng

> 📖 **Hướng dẫn chi tiết từng bước (cài đặt, sử dụng, xử lý sự cố): xem [HUONG-DAN-CHAY.md](HUONG-DAN-CHAY.md)**

```bash
node server.js        # hoặc: npm start
```

Mở `http://localhost:3000`. Yêu cầu Node ≥ 16, **không cần `npm install`** (server chỉ dùng module builtin).

## 🧠 Kiến trúc

```
server.js            Máy chủ tĩnh zero-dependency (Node http)
public/
  index.html         Giao diện (2 màn: Tạo mới → Studio)
  css/style.css      Theme tối, font Be Vietnam Pro
  js/
    main.js          Bộ điều phối: state, luồng tạo video, UI, phát/xem trước
    ai.js            Gọi Pollinations.ai (kịch bản / ảnh / giọng đọc) + fallback
    art.js           Nhận diện chủ đề, ảnh thủ tục (procedural art), thư viện ảnh
    audio.js         AudioContext, Web Speech API, nhạc nền Web Audio
    renderer.js      Timeline + vẽ từng khung hình (Ken Burns, phụ đề, chuyển cảnh)
    exporter.js      Trộn âm offline (OfflineAudioContext) + MediaRecorder
    util.js          Tiện ích (PRNG, toast, timeout…)
  library/           9 ảnh nền AI tạo sẵn (dự phòng offline)
```

**Nguyên tắc thiết kế:** mọi tính năng AI đều chạy phía trình duyệt người dùng và đều có phương án dự phòng offline, nên app vẫn dùng được khi mất mạng hoặc dịch vụ ngoài bị giới hạn tốc độ.

## ⚠️ Lưu ý

- Dịch vụ AI online dùng **Pollinations.ai** (miễn phí, không cần key) — có giới hạn tốc độ; khi vượt giới hạn app tự chuyển sang fallback.
- Video xuất ra là **WebM** (mở bằng Chrome/Edge, đăng thẳng lên YouTube/TikTok được). Cần MP4 thì dùng công cụ chuyển đổi (vd. CloudConvert, ffmpeg).
- Quá trình xuất chạy **theo thời gian thực** — giữ tab mở và hiển thị cho đến khi xong.
- Giọng đọc trình duyệt chỉ phát khi xem trước, **không ghi được** vào file xuất ra — muốn có giọng trong video hãy dùng giọng AI online hoặc nút 🎫 thu âm.

## 🗺 Ý tưởng phát triển tiếp

- [ ] Nhập đoạn văn dài → tự tóm tắt bằng AI
- [ ] Thêm nhạc nền từ file tải lên
- [ ] Xuất MP4 (ffmpeg.wasm)
- [ ] Drag & drop sắp xếp lại cảnh
- [ ] Nhiều preset kiểu chữ/phụ đề
