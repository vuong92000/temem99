# 🎬 VideoAI Studio

**Ứng dụng tạo video bằng AI chạy hoàn toàn trong trình duyệt** — nhập một chủ đề, AI viết kịch bản, dựng hình, đọc lời bình, ghép nhạc nền và xuất video tải về máy. Không cần cài đặt, không cần API key, không có server backend phức tạp.

## ✨ Tính năng

| Tính năng | Chi tiết |
|---|---|
| ✍️ **AI Director / Google Vids-style** | Chọn Storyboard, Thuyết trình, Sản phẩm, Social reel hoặc Prompt Lab → AI viết storyboard có thể xem trước/chỉnh sửa trước khi dựng. |
| 🖼 **Hình ảnh AI từng cảnh** | Mỗi cảnh có Prompt Lab (image prompt + negative prompt), ảnh AI model Flux, thư viện 9 ảnh, ảnh procedural hoặc ảnh riêng. |
| 🎥 **Prompt chuyển động** | AI tạo prompt camera cho từng cảnh; renderer có slow zoom, pan trái/phải, push-in, parallax và static. |
| 🔊 **Giọng đọc AI chân thật** | 6 giọng AI online + tone tự nhiên/tài liệu/năng lượng/chuyên nghiệp/gần gũi và tốc độ đọc. Fallback: Web Speech API hoặc **thu âm giọng của chính bạn**. |
| 🎵 **Nhạc nền tự sinh** | Nhạc ambient (đệm hợp âm + reverb) sinh bằng Web Audio — không cần file nhạc, trộn thẳng vào video xuất ra. |
| 🎥 **Hiệu ứng điện ảnh** | Ken Burns (zoom/pan chậm), 3 kiểu chuyển cảnh, phụ đề tự chia câu động, màn mở đầu/kết thúc, watermark. |
| 📐 **3 tỉ lệ khung hình** | 16:9 (YouTube) · 9:16 (TikTok/Reels) · 1:1 (bài đăng). |
| ⬇ **Xuất video** | Ghi canvas + âm thanh đã trộn sẵn bằng MediaRecorder → file **WebM** (MP4 trên Safari). |
| 💾 **Tự lưu dự án** | Lưu vào localStorage, lần sau vào có nút khôi phục. |

## 🚀 Chạy ứng dụng

> 📖 **Hướng dẫn chi tiết từng bước (cài đặt, sử dụng, xử lý sự cố): xem [HUONG-DAN-CHAY.md](HUONG-DAN-CHAY.md)**
> 🌐 **Chạy trực tuyến trên GitHub (Pages / Codespaces): xem [HUONG-DAN-GITHUB.md](HUONG-DAN-GITHUB.md)** — bản demo: https://vuong92000.github.io/temem99/

```bash
node server.js        # hoặc: npm start
```

Mở `http://localhost:3000`. Yêu cầu Node ≥ 16, **không cần `npm install`** (server chỉ dùng module builtin).

## 🧩 Nguồn mở & kiến trúc tham khảo

Đã khảo sát Timeline Studio, OpenCut-AI, VideoSOS và Automated Video Generator để lấy ý tưởng cho timeline, scene workflow, voice pipeline và image/video adapters. Bản này chỉ tích hợp lại bằng code riêng, không copy mã nguồn hoặc model weights; xem chi tiết tại [OPEN-SOURCE-INTEGRATION.md](OPEN-SOURCE-INTEGRATION.md).

## 🧠 Kiến trúc

```
server.js            Máy chủ tĩnh zero-dependency (Node http)
public/
  index.html         Giao diện (AI Director → Storyboard Studio)
  css/style.css      Theme tối, font Be Vietnam Pro
  css/ai-director.css Mode AI, Prompt Lab, storyboard preview, nguồn mở
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
