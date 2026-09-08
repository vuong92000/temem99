# AI Director & nguồn tham khảo mã nguồn mở

Bản nâng cấp này thêm một workflow giống kiểu **Google Vids**: người dùng đưa một gợi ý, AI tạo storyboard có thể chỉnh sửa, mỗi cảnh có lời bình, prompt hình ảnh, prompt chuyển động và asset; sau đó preview/export ngay trong trình duyệt.

## Những gì đã tích hợp vào VideoAI Studio

- **AI Director modes:** Storyboard, Thuyết trình, Sản phẩm, Social reel, Prompt Lab và **Phim ngắn AI**.
- **Short-film pipeline:** tạo film bible (logline, thế giới, nhân vật), cấu trúc 3 hồi, shot type và thoại; giữ visual continuity trong prompt của từng cảnh.
- **Plan trước khi render:** nút `Viết kịch bản & tạo prompt` tạo đề cương để người dùng xem trước trước khi dựng ảnh/voice.
- **Prompt Lab:** mỗi scene có prompt hình ảnh, prompt chuyển động và negative prompt; có thể tạo lại bằng AI hoặc dùng fallback local.
- **Camera presets:** slow zoom, pan trái/phải, push-in, parallax và static; renderer canvas áp dụng preset khi preview/export.
- **Voice profile chân thật:** tone tự nhiên, tài liệu, năng lượng, chuyên nghiệp, gần gũi và tốc độ đọc; online audio được gửi kèm hướng dẫn tone/rate, offline dùng Web Speech.
- **Storyboard editor:** scene cards, đổi thứ tự, scene prompt fields, ảnh AI/thư viện/upload/procedural, nhạc, caption và export WebM.
- **Bảo toàn zero-dependency:** không copy mã nguồn của dự án bên ngoài, không thêm backend bắt buộc; dịch vụ online vẫn có fallback offline.

## Các dự án đã khảo sát

| Dự án | Ý tưởng tham khảo | Liên kết |
|---|---|---|
| Timeline Studio / `ai-video-editor` | Timeline local-first, captions, track/editor workflow | https://github.com/MartinDelophy/ai-video-editor |
| OpenCut-AI | AI editor, edit-by-text, voice workflow, template/editor ideas | https://github.com/Ekaanth/OpenCut-AI |
| VideoSOS | Image/video/voice model adapter và private browser workflow | https://github.com/timoncool/videosos |
| Automated Video Generator | Pipeline topic → script → voice → visuals → render | https://github.com/itsPremkumar/Automated-Video-Generator |

Các repository trên chỉ là **tài liệu tham khảo kiến trúc và tính năng** trong bản này. Không vendored code, model weights, logo hoặc asset của chúng vào repository `temem99`. Nếu sau này muốn đưa một thư viện cụ thể vào bundle, cần kiểm tra license của chính commit/version đó và thêm attribution tương ứng.

## Giới hạn hiện tại

- Voice AI online phụ thuộc endpoint Pollinations hiện có; muốn voice clone/local TTS kiểu Kokoro, Piper hoặc XTTS cần thêm backend/model runtime riêng.
- Prompt chuyển động hiện điều khiển Ken Burns/camera preset trong canvas; muốn image-to-video thật cần thêm provider/model video (ví dụ LTX/ComfyUI/VideoSOS) và job queue.
- Export hiện là WebM/MP4 tùy `MediaRecorder`; chưa phải pipeline FFmpeg/Remotion đầy đủ.
