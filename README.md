# 📸 PhotoAI Studio

**Studio chỉnh sửa ảnh bằng AI chạy trong trình duyệt** — ảnh thẻ thông minh, ánh sáng studio AI, phục hồi ảnh cũ chuyên nghiệp. Chạy online bằng API key **Gemini** (miễn phí) hoặc **GPT Image** của chính bạn. Không cần cài đặt, không có backend phức tạp.

## ✨ Tính năng

| Menu | Chi tiết |
|---|---|
| 🪪 **Ảnh thẻ AI** | Thay trang phục AI (9+ mẫu nam/nữ), phông nền AI (trắng, xanh thẻ, xám, văn phòng…), kiểu tóc AI — **giữ nguyên 100% khuôn mặt**. Cắt khung 3×4 / 4×6 / 1×1, xuất **tấm in 300 DPI** khổ 10×15 đem ra tiệm. |
| 💡 **Ánh sáng AI** | **10 kiểu sáng studio** (Rembrandt, Butterfly, Loop, Split, Golden Hour, Softbox, Cinematic, Neon, Low-key, High-key) + tự mô tả ánh sáng + nút **🤖 AI gợi ý** kiểu sáng hợp mặt nhất. |
| 🕰️ **Phục hồi ảnh cũ** | Lên màu, xóa xước/ố/rách, tăng chi tiết mặt, vẽ lại tóc, vẽ lại nền, khử nhiễu, 3 mức độ — **giữ danh tính khuôn mặt**. Kèm công cụ offline: tăng nét, cân trắng, phóng 2×. |
| 🤖 **2 engine AI** | ✨ **Gemini** (2.5 Flash / 3 Pro / 3.1 Flash) và 🤖 **GPT Image** (1 / 1.5) — đổi engine + model ngay trên thanh công cụ. |
| 🖼️ **Trình xem chuyên nghiệp** | Kéo-thả / dán ảnh (Ctrl+V), thanh **so sánh Trước–Sau**, zoom, chỉnh màu nhanh, nút 🔁 lấy kết quả chỉnh tiếp nhiều bước, lịch sử 12 ảnh. |
| 🔒 **Riêng tư** | Ảnh & API key chỉ nằm trong trình duyệt của bạn, gọi thẳng tới Google/OpenAI, không qua máy chủ trung gian. |

## 🚀 Chạy ứng dụng

> 📖 **Hướng dẫn chi tiết:** [HUONG-DAN-CHAY.md](HUONG-DAN-CHAY.md)
> 🔑 **Cách lấy API key (có ảnh minh họa từng bước):** [HUONG-DAN-API-KEY.md](HUONG-DAN-API-KEY.md)
> 🌐 **Chạy trực tuyến trên GitHub:** [HUONG-DAN-GITHUB.md](HUONG-DAN-GITHUB.md) — demo: https://vuong92000.github.io/temem99/

```bash
node server.js        # hoặc: npm start
```

Mở `http://localhost:3000`. Yêu cầu Node ≥ 16, **không cần `npm install`** (server chỉ dùng module builtin).

## 🧠 Kiến trúc

```
server.js            Máy chủ tĩnh zero-dependency (Node http)
public/
  index.html         Giao diện PhotoAI Studio
  css/studio.css     Theme dark studio, responsive
  js/
    presets.js       10 preset ánh sáng, trang phục, phông nền + trình dựng prompt
    api.js           Client Gemini (generateContent) & OpenAI (images/edits)
    image.js         Canvas 2D: cắt, lọc, nét, cân trắng, upscale, tấm in
    app.js           Điều phối UI, so sánh Trước/Sau, lịch sử, cài đặt
  video-studio/      Bản VideoAI Studio cũ (vẫn chạy tại /video-studio/)
```

**Nguyên tắc thiết kế:** mọi lời gọi AI chạy phía trình duyệt bằng key của người dùng; các công cụ offline (cắt, nét, cân trắng, phóng 2×, tấm in) luôn dùng được kể cả không có key.

## ⚠️ Lưu ý

- API key lưu ở **localStorage trình duyệt** — không dùng trên máy tính lạ dùng chung.
- Gen ảnh GPT quality **Cao** có thể mất 1–3 phút; Gemini thường 10–40 giây.
- Ảnh AI đôi khi cần chạy 2–3 lần mới ưng — dùng nút 🔁 để chỉnh tiếp từng bước.

## 🗺 Ý tưởng phát triển tiếp

- [ ] Xóa vật thể bằng cách khoanh vùng (mask + inpainting)
- [ ] Thay nền bằng ảnh tải lên (ghép 2 ảnh)
- [ ] Xuất hàng loạt (batch) nhiều ảnh cùng preset
- [ ] Gói PWA cài đặt như app desktop
